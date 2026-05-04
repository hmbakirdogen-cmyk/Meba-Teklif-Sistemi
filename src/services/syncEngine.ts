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
  /** localStorage kotasi dolduğunda true — UI turuncu uyari göstermeli.
   *  Bu durumda yeni kayitlar kaybolabilir; kullanici eski snapshot/queue'yu
   *  temizlemeli. */
  storageQuotaExceeded?: boolean;
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
    // Yazma başarılıysa flag'i temizle (kullanıcı eski snapshot'ı temizlemiş
    // olabilir → tekrar yazılabilir hâle gelmiştir).
    if (currentState.storageQuotaExceeded) {
      currentState = { ...currentState, storageQuotaExceeded: false };
      notify();
    }
  } catch (err) {
    // QuotaExceededError yakala — kullanıcıya görünür uyari ver.
    // Browser'lar farklı code/name kullanır: 22 (Chrome), 1014 (Firefox),
    // 'QuotaExceededError' (modern), 'NS_ERROR_DOM_QUOTA_REACHED' (Firefox eski).
    const e = err as DOMException;
    const isQuota =
      e?.name === 'QuotaExceededError' ||
      e?.name === 'NS_ERROR_DOM_QUOTA_REACHED' ||
      e?.code === 22 ||
      e?.code === 1014;
    if (isQuota && !currentState.storageQuotaExceeded) {
      currentState = { ...currentState, storageQuotaExceeded: true };
      notify();
      console.warn('[sync] localStorage kotasi doldu — yeni kayitlar kaydedilemiyor!');
    }
    // Sessizce geç — kullanıcı oturumu çökertilmemeli, sadece uyarı verilir.
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

// Module-level cache — setPhase her çağrısında localStorage parse etmemek için.
// queue/conflicts mutasyon noktaları (enqueue/setQueue/clearQueueItem,
// setConflicts/resolveConflict) cache'i günceller.
let _queueLengthCache = 0;
let _conflictCountCache = 0;

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
    queueLength: _queueLengthCache,
    conflictCount: _conflictCountCache,
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
  _queueLengthCache = q.length;
}

/**
 * Queue'ya yeni bir değişiklik ekler.
 *
 * KASIT: Aynı `id+collection` için son op kazanır (op tipine bakılmaz).
 * Senaryo: kullanıcı bir teklifi kaydeder (upsert) → 5sn sonra siler (delete).
 * Push edilmemişse ikinci enqueue ilkini ezer ve sadece delete kalır →
 * server soft-delete eder → tüm client'lar pull'da tombstone alır.
 * Bu DOĞRU ve istenen davranıştır: en son kullanıcı niyeti geçerli.
 *
 * Diğer yön (delete sonra upsert): pratikte olmaz çünkü delete sonrası
 * UI'dan kayıt görünmez; ama oluşursa son upsert kazanır → kayıt yeniden
 * canlanır.
 */
export function enqueue(item: Omit<QueueItem, 'enqueuedAt'>): void {
  const q = getQueue();
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
  _conflictCountCache = c.length;
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
    // Anahtar collection-prefix'li (geriye uyum: eski anahtar varsa migrate).
    const newKey = `meba_conflict_local_${collection}_${id}`;
    const oldKey = `meba_conflict_local_${id}`;
    let localPayload = readJSON<Record<string, unknown>>(newKey, {} as Record<string, unknown>);
    // Eski anahtar varsa yeni anahtara taşı, eskisini sil (one-shot migration)
    if (Object.keys(localPayload).length === 0) {
      const legacy = readJSON<Record<string, unknown>>(oldKey, {} as Record<string, unknown>);
      if (legacy && Object.keys(legacy).length > 0) {
        writeJSON(newKey, legacy);
        try { localStorage.removeItem(oldKey); } catch { /* ignore */ }
        localPayload = legacy;
      }
    }
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

      // Accepted olanlar queue'dan çıkar — RACE-SAFE.
      // ÖNEMLİ: queue snapshot'ı (yukarıda const queue) kullanıcı bu sürede
      // enqueue() çağırmışsa stale olur. Yeni eklenen kaydı silmemek için
      // GÜNCEL queue'yu yeniden okuyup sadece accepted olanları çıkarıyoruz.
      const acceptedKeys = new Set(result.accepted.map((a) => `${a.collection}:${a.id}`));
      const fresh = getQueue();
      const remainingQueue = fresh.filter((q) => !acceptedKeys.has(`${q.collection}:${q.id}`));
      setQueue(remainingQueue);

      // Conflict olanları kaydet
      if (result.conflicts.length > 0) {
        const existing = getConflicts();
        const newConflicts = result.conflicts.filter(
          (c) => !existing.some((e) => e.collection === c.collection && e.id === c.id),
        );

        // Conflict olan local payload'ları sakla (resolveConflict 'client' seçerse kullanılır).
        // Anahtar collection-prefix'li: aynı id'li iki farklı koleksiyon (cari + urun)
        // çakışırsa birbirinin payload'unu ezmesin.
        for (const c of result.conflicts) {
          const queueItem = queue.find((q) => q.collection === c.collection && q.id === c.id);
          if (queueItem) {
            writeJSON(`meba_conflict_local_${c.collection}_${c.id}`, queueItem.payload);
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

// Top-level syncNow guard: 60sn timer + 'online' event + 'visibilitychange'
// aynı anda tetiklenirse pushOnce/pullOnce'un kendi guard'ları zincirleme
// olarak serileştirir; ama o sürede syncNow promise'i 4-5 kere açılırdı.
// Burada tek aktif syncNow promise'i tutuyoruz + 2sn debounce ile sık
// tekrar tetiklemeleri yutuyoruz (kullanıcı manuel "Şimdi senkronize et"
// için force=true kullanabilir).
let activeSyncNow: Promise<void> | null = null;
let lastSyncNowTs = 0;
const SYNC_NOW_DEBOUNCE_MS = 2000;

export async function syncNow(
  kullanici?: { id: string; rol: string },
  opts: { force?: boolean } = {},
): Promise<void> {
  if (activeSyncNow) return activeSyncNow;
  if (!opts.force && Date.now() - lastSyncNowTs < SYNC_NOW_DEBOUNCE_MS) return;
  activeSyncNow = (async () => {
    try {
      await pushOnce();
      await pullOnce(kullanici);
    } finally {
      lastSyncNowTs = Date.now();
      activeSyncNow = null;
    }
  })();
  return activeSyncNow;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function mergeById<T extends { id: string; version?: number; lastSyncedAt?: string }>(
  existing: T[],
  delta: T[],
): T[] {
  const map = new Map(existing.map((r) => [r.id, r]));
  for (const item of delta) {
    const cur = map.get(item.id);
    if (!cur) {
      map.set(item.id, item);
      continue;
    }
    const iv = item.version ?? 0;
    const cv = cur.version ?? 0;
    // STRICT: yeni version > eski → kabul. Eski "=>" idi, eşitlikte
    // server snapshot'ı henüz push edilmemiş yerel kaydı eziyordu (veri kaybı).
    if (iv > cv) {
      map.set(item.id, item);
    } else if (iv === cv) {
      // Eşitlik tiebreak: server'ın yazdığı lastSyncedAt yeni ise kabul
      // (server-authoritative now() bumpRecord'ta). Yoksa localı koru.
      const it = Date.parse(item.lastSyncedAt ?? '');
      const ct = Date.parse(cur.lastSyncedAt ?? '');
      if (Number.isFinite(it) && Number.isFinite(ct) && it > ct) {
        map.set(item.id, item);
      }
    }
    // iv < cv: localı koru (server'da daha eski snapshot var)
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

// Initial state'i hesapla (mount'ta) — cache'leri de doldur ki setPhase
// sonradan tekrar parse etmek zorunda kalmasın.
_queueLengthCache = getQueue().length;
_conflictCountCache = getConflicts().length;
currentState = {
  ...currentState,
  queueLength: _queueLengthCache,
  conflictCount: _conflictCountCache,
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
