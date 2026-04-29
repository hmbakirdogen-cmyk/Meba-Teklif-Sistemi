/**
 * syncEngine.ts — Offline-first sync motoru.
 *
 * Sorumluluklar:
 *   - pullOnce(): server'dan delta çek (since=lastPullServerTime), defense-in-depth
 *     visibility filter uygula, dataStore cache'ini güncelle, snapshot kaydet.
 *   - pushOnce(): meba_sync_queue'daki değişiklikleri batch push et; conflict
 *     gelen kayıtları meba_conflicts'e taşı.
 *   - enqueue(): network fail olursa queue'ya ekle; sonradan pushOnce ile akıt.
 *   - subscribe(): UI bar dinlesin (state changes).
 *   - resolveConflict(): admin için 'server' / 'client' / 'manual' seçim.
 *
 * localStorage anahtarları:
 *   - meba_sync_queue        → QueueItem[]
 *   - meba_last_pull_server_time → ISO string (son pull'da server'ın döndüğü serverTime)
 *   - meba_last_pull_at      → ISO string (cihazın saati, görüntü için)
 *   - meba_last_push_at      → ISO string
 *   - meba_device_id         → string (apiClient.ts ile paylaşılan)
 *   - meba_conflicts         → SyncConflict[]
 *   - meba_last_snapshot     → InitData (offline restore için)
 */

import { api } from './apiClient';
import type { SyncConflict, SyncPushPayload, InitData } from './apiClient';
import { dataStore } from './dataStore';
import type { Teklif } from '../types';

// ── Types ─────────────────────────────────────────────────────────────────────

export type SyncCollection = 'teklifler' | 'cariler' | 'urunler' | 'urunSetleri';
export type SyncOp = 'upsert' | 'delete';

export interface QueueItem {
  collection: SyncCollection;
  op: SyncOp;
  id: string;
  payload: unknown;     // Teklif | Cari | Urun | UrunSeti (delete için sadece id)
  enqueuedAt: string;
}

export type SyncPhase =
  | 'idle'        // boş, beklemede
  | 'connecting'  // ilk health probe
  | 'online'      // bağlı, kuyruk boş
  | 'syncing'     // pull veya push devam ediyor
  | 'offline'     // server erişilmiyor
  | 'conflict';   // çözülmemiş çakışma var

export interface SyncState {
  phase: SyncPhase;
  queueLength: number;
  conflictCount: number;
  lastPullAt: string | null;
  lastPushAt: string | null;
  lastError: string | null;
}

type Listener = (state: SyncState) => void;

// ── Storage helpers ───────────────────────────────────────────────────────────

const KEYS = {
  queue:           'meba_sync_queue',
  lastPullServer:  'meba_last_pull_server_time',
  lastPullAt:      'meba_last_pull_at',
  lastPushAt:      'meba_last_push_at',
  conflicts:       'meba_conflicts',
  snapshot:        'meba_last_snapshot',
  deviceId:        'meba_device_id',
} as const;

function readJSON<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback;
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function writeJSON(key: string, value: unknown): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // localStorage dolu olabilir; sessizce geç (queue kayıp olabilir ama
    // kullanıcı oturumu çökertilmemeli).
  }
}

// ── State ─────────────────────────────────────────────────────────────────────

let currentState: SyncState = {
  phase: 'idle',
  queueLength: 0,
  conflictCount: 0,
  lastPullAt: null,
  lastPushAt: null,
  lastError: null,
};

const listeners = new Set<Listener>();

function notify(): void {
  for (const fn of listeners) {
    try { fn(currentState); } catch { /* listener hataları izole */ }
  }
}

function setPhase(phase: SyncPhase, error: string | null = null): void {
  currentState = {
    ...currentState,
    phase,
    queueLength: getQueue().length,
    conflictCount: getConflicts().length,
    lastError: error,
  };
  notify();
}

// ── Queue ─────────────────────────────────────────────────────────────────────

function getQueue(): QueueItem[] {
  return readJSON<QueueItem[]>(KEYS.queue, []);
}

function setQueue(q: QueueItem[]): void {
  writeJSON(KEYS.queue, q);
}

export function enqueue(item: Omit<QueueItem, 'enqueuedAt'>): void {
  const q = getQueue();
  // Aynı id+collection+op için duplicate ekleme (en son hal kalır)
  const filtered = q.filter((x) => !(x.id === item.id && x.collection === item.collection));
  filtered.push({ ...item, enqueuedAt: new Date().toISOString() });
  setQueue(filtered);
  setPhase(currentState.phase === 'offline' ? 'offline' : 'idle');
}

export function clearQueueItem(collection: SyncCollection, id: string): void {
  const q = getQueue().filter((x) => !(x.collection === collection && x.id === id));
  setQueue(q);
}

export function getQueueLength(): number {
  return getQueue().length;
}

export function isInQueue(collection: SyncCollection, id: string): boolean {
  return getQueue().some((x) => x.collection === collection && x.id === id);
}

// ── Conflicts ─────────────────────────────────────────────────────────────────

export function getConflicts(): SyncConflict[] {
  return readJSON<SyncConflict[]>(KEYS.conflicts, []);
}

function setConflicts(c: SyncConflict[]): void {
  writeJSON(KEYS.conflicts, c);
}

export function resolveConflict(
  collection: SyncCollection,
  id: string,
  choice: 'server' | 'client' | 'manual',
  mergedPayload?: unknown,
): void {
  const all = getConflicts();
  const conflict = all.find((c) => c.collection === collection && c.id === id);
  if (!conflict) return;

  if (choice === 'server') {
    // Mevcut'u kabul → cache zaten güncel olacak (sonraki pull'da gelir).
    // Queue'dan ilgili kayıt çıkar.
    clearQueueItem(collection, id);
  } else if (choice === 'client') {
    // Force-push: client kaydı server'a tekrar gönder, version bump et.
    const localPayload = readJSON<Record<string, unknown>>(`meba_conflict_local_${id}`, {} as Record<string, unknown>);
    if (localPayload && Object.keys(localPayload).length > 0) {
      // Client'ın version'ını server'ın +1'ine set et (override için)
      const existing = conflict.existing as { version?: number };
      const forceItem = {
        ...localPayload,
        version: (existing?.version ?? 0) + 1,
      };
      enqueue({ collection, op: 'upsert', id, payload: forceItem });
    }
  } else if (choice === 'manual' && mergedPayload) {
    enqueue({ collection, op: 'upsert', id, payload: mergedPayload });
  }

  // Conflict listesinden çıkar
  setConflicts(all.filter((c) => !(c.collection === collection && c.id === id)));
  setPhase(getConflicts().length > 0 ? 'conflict' : 'idle');
}

// ── Snapshot ──────────────────────────────────────────────────────────────────

export function saveSnapshot(data: InitData): void {
  writeJSON(KEYS.snapshot, data);
}

export function loadSnapshot(): InitData | null {
  return readJSON<InitData | null>(KEYS.snapshot, null);
}

// ── Visibility filter (defense-in-depth) ──────────────────────────────────────

function applyVisibilityFilter(
  teklifler: Teklif[],
  kullanici?: { id: string; rol: string },
): Teklif[] {
  if (!kullanici || kullanici.rol === 'admin') return teklifler;
  return teklifler.filter((t) => {
    const vis = t.visibility || 'team';
    return vis === 'team' || t.hazirlayanKullaniciId === kullanici.id;
  });
}

// ── Pull / Push ───────────────────────────────────────────────────────────────

let activeOperation: Promise<void> | null = null;

export async function pullOnce(kullanici?: { id: string; rol: string }): Promise<void> {
  if (activeOperation) return activeOperation;

  activeOperation = (async () => {
    setPhase('syncing');
    try {
      const since = localStorage.getItem(KEYS.lastPullServer) || '';
      const result = await api.sync.pull(since, kullanici);

      // Defense-in-depth: server kötü davransa bile filtrele
      const safeTeklifler = applyVisibilityFilter(result.teklifler, kullanici);

      // Cache güncelleme — soft-deleted (deletedAt'lı) kayıtları kapsayan tüm
      // delta UI için filtrelenmiş haldedir.
      const filterLive = <T extends { deletedAt?: string }>(arr: T[]): T[] =>
        arr.filter((r) => !r.deletedAt);

      // Mevcut cache + delta merge
      const currentTeklifler = dataStore.getTeklifler();
      const merged = mergeById(currentTeklifler, safeTeklifler);
      dataStore.setTeklifler(filterLive(merged));

      // Cariler / Ürünler / Setler için benzer merge
      const merged2 = mergeById(dataStore.getCariler(), result.cariler);
      const merged3 = mergeById(dataStore.getUrunler(), result.urunler);
      const merged4 = mergeById(dataStore.getUrunSetleri(), result.urunSetleri);
      dataStore.setCariler(filterLive(merged2));
      dataStore.setUrunler(filterLive(merged3));
      dataStore.setUrunSetleri(filterLive(merged4));

      // Snapshot güncelle (offline restore için)
      saveSnapshot({
        teklifler:   filterLive(merged),
        cariler:     filterLive(merged2),
        urunler:     filterLive(merged3),
        urunSetleri: filterLive(merged4),
        referans:    dataStore.getReferans(),
        sayac:       dataStore.getSayac(),
      });

      localStorage.setItem(KEYS.lastPullServer, result.serverTime);
      localStorage.setItem(KEYS.lastPullAt, new Date().toISOString());
      currentState = { ...currentState, lastPullAt: new Date().toISOString() };

      setPhase(getConflicts().length > 0 ? 'conflict' : 'online');
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setPhase('offline', msg);
    } finally {
      activeOperation = null;
    }
  })();

  return activeOperation;
}

export async function pushOnce(): Promise<void> {
  if (activeOperation) return activeOperation;

  const queue = getQueue();
  if (queue.length === 0) return;

  activeOperation = (async () => {
    setPhase('syncing');
    try {
      // Queue'yu collection bazında topla
      const payload: SyncPushPayload = {};
      for (const item of queue) {
        if (item.op === 'delete') {
          // Soft-delete olarak push (deletedAt set et)
          const tombstone = { id: item.id, deletedAt: new Date().toISOString() };
          (payload[item.collection] as unknown[] | undefined) ??= [];
          (payload[item.collection] as unknown[]).push(tombstone);
        } else {
          (payload[item.collection] as unknown[] | undefined) ??= [];
          (payload[item.collection] as unknown[]).push(item.payload);
        }
      }

      const result = await api.sync.push(payload);

      // Accepted olanlar queue'dan çıkar
      const acceptedKeys = new Set(result.accepted.map((a) => `${a.collection}:${a.id}`));
      const remainingQueue = queue.filter((q) => !acceptedKeys.has(`${q.collection}:${q.id}`));
      setQueue(remainingQueue);

      // Conflict olanları kaydet
      if (result.conflicts.length > 0) {
        const existing = getConflicts();
        const newConflicts = result.conflicts.filter(
          (c) => !existing.some((e) => e.collection === c.collection && e.id === c.id),
        );

        // Conflict olan local payload'ları sakla (resolveConflict 'client' seçerse kullanılır)
        for (const c of result.conflicts) {
          const queueItem = queue.find((q) => q.collection === c.collection && q.id === c.id);
          if (queueItem) {
            writeJSON(`meba_conflict_local_${c.id}`, queueItem.payload);
          }
        }

        setConflicts([...existing, ...newConflicts]);
      }

      localStorage.setItem(KEYS.lastPushAt, new Date().toISOString());
      currentState = { ...currentState, lastPushAt: new Date().toISOString() };

      setPhase(getConflicts().length > 0 ? 'conflict' : 'online');
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setPhase('offline', msg);
    } finally {
      activeOperation = null;
    }
  })();

  return activeOperation;
}

export async function syncNow(kullanici?: { id: string; rol: string }): Promise<void> {
  await pushOnce();
  await pullOnce(kullanici);
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function mergeById<T extends { id: string; version?: number }>(
  existing: T[],
  delta: T[],
): T[] {
  const map = new Map(existing.map((r) => [r.id, r]));
  for (const item of delta) {
    const cur = map.get(item.id);
    if (!cur || ((item.version ?? 0) >= (cur.version ?? 0))) {
      map.set(item.id, item);
    }
  }
  return Array.from(map.values());
}

// ── Public API ────────────────────────────────────────────────────────────────

export function subscribe(fn: Listener): () => void {
  listeners.add(fn);
  fn(currentState); // Mount anında mevcut state'i ver
  return () => listeners.delete(fn);
}

export function getState(): SyncState {
  return currentState;
}

export function setOnlineState(online: boolean): void {
  if (online && currentState.phase === 'offline') {
    setPhase('idle');
  } else if (!online && currentState.phase !== 'offline') {
    setPhase('offline');
  }
}

// Initial state'i hesapla (mount'ta)
currentState = {
  ...currentState,
  queueLength: getQueue().length,
  conflictCount: getConflicts().length,
  lastPullAt: localStorage.getItem(KEYS.lastPullAt),
  lastPushAt: localStorage.getItem(KEYS.lastPushAt),
};

export const syncEngine = {
  pullOnce,
  pushOnce,
  syncNow,
  enqueue,
  subscribe,
  getState,
  resolveConflict,
  getConflicts,
  getQueue,
  isInQueue,
  saveSnapshot,
  loadSnapshot,
  setOnlineState,
};
