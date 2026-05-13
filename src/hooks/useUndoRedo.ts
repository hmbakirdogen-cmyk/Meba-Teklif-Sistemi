/**
 * useUndoRedo.ts
 * ─────────────────────────────────────────────────────────────────
 * Stack-tabanlı undo/redo yönetimi.
 *
 * - Snapshot tipi useBelgeState'ten tüketilir (Snapshot type'ı orada export edilir).
 * - past / future iki ayrı stack; her push future'ı temizler (yeni branch).
 * - max 50 entry; üst sınır aşıldığında en eski past atılır.
 * - push/undo/redo: state setter'ları stabil (useCallback deps boş).
 *
 * push BOUNDARY çağrılır:
 *  - Edit commit (CellEditPopup Enter/Tab/blur close)
 *  - Popup alan (cari/ayar) onOpenChange(false) → değer değiştiyse
 *  - Satır aksiyonu (ekle/sil/araya ekle/set dönüştür) ÖNCE
 *
 * push edit-yazım sırasında ÇAĞRILMAZ; browser native undo Antd input içinde çalışır.
 */

import { useCallback, useState } from 'react';
import type { Cari, ParaBirimi, TeklifSatiri } from '../types';

export interface Snapshot {
  satirlar: TeklifSatiri[];
  cari: Cari | null;
  contactName: string;
  contactTitle: 'BEY' | 'HANIM' | 'YETKILI';
  paraBirimi: ParaBirimi;
  kdvOrani: number;
  iskontoOrani: number;
  odemeVadesi: string;
  gecerlilikSuresi: string;
  dovizKuru: string;
  notlar: string;
  notlarGosterilsin: boolean;
  tarih: string;
  ilgiliKisiId?: string;
  ilgiliKisiAdSoyad?: string;
  satirBazliParaBirimi: boolean;
  satirBazliIskonto: boolean;
  firmaId: string;
}

const MAX_SIZE = 50;

/**
 * İki snapshot'ı shallow karşılaştır. satirlar array'i referans eşitliğine güvenir
 * (immutable update pattern gereği yeni satir → yeni array ref).
 */
export function snapshotChanged(a: Snapshot | null, b: Snapshot | null): boolean {
  if (!a || !b) return a !== b;
  return (
    a.satirlar !== b.satirlar ||
    a.cari !== b.cari ||
    a.contactName !== b.contactName ||
    a.contactTitle !== b.contactTitle ||
    a.paraBirimi !== b.paraBirimi ||
    a.kdvOrani !== b.kdvOrani ||
    a.iskontoOrani !== b.iskontoOrani ||
    a.odemeVadesi !== b.odemeVadesi ||
    a.gecerlilikSuresi !== b.gecerlilikSuresi ||
    a.dovizKuru !== b.dovizKuru ||
    a.notlar !== b.notlar ||
    a.notlarGosterilsin !== b.notlarGosterilsin ||
    a.tarih !== b.tarih ||
    a.ilgiliKisiId !== b.ilgiliKisiId ||
    a.ilgiliKisiAdSoyad !== b.ilgiliKisiAdSoyad ||
    a.satirBazliParaBirimi !== b.satirBazliParaBirimi ||
    a.satirBazliIskonto !== b.satirBazliIskonto ||
    a.firmaId !== b.firmaId
  );
}

export interface UndoRedoApi {
  push: (snapshot: Snapshot) => void;
  /** Önceki snapshot'ı döndürür; mevcut state'i future'a iter. null → past boş. */
  undo: (current: Snapshot) => Snapshot | null;
  /** Sonraki snapshot'ı döndürür; mevcut state'i past'a iter. null → future boş. */
  redo: (current: Snapshot) => Snapshot | null;
  canUndo: boolean;
  canRedo: boolean;
  /** past + future'ı sıfırla (örnek: yeni teklif yükleme). */
  reset: () => void;
}

export function useUndoRedo(): UndoRedoApi {
  const [past, setPast] = useState<Snapshot[]>([]);
  const [future, setFuture] = useState<Snapshot[]>([]);

  const push = useCallback((snapshot: Snapshot) => {
    setPast((prev) => {
      const next = prev.length >= MAX_SIZE ? prev.slice(1) : prev;
      return [...next, snapshot];
    });
    setFuture([]);
  }, []);

  const undo = useCallback((current: Snapshot): Snapshot | null => {
    let popped: Snapshot | null = null;
    setPast((prev) => {
      if (prev.length === 0) return prev;
      popped = prev[prev.length - 1];
      return prev.slice(0, -1);
    });
    if (popped !== null) {
      setFuture((prev) => [...prev, current]);
    }
    return popped;
  }, []);

  const redo = useCallback((current: Snapshot): Snapshot | null => {
    let popped: Snapshot | null = null;
    setFuture((prev) => {
      if (prev.length === 0) return prev;
      popped = prev[prev.length - 1];
      return prev.slice(0, -1);
    });
    if (popped !== null) {
      setPast((prev) => {
        const next = prev.length >= MAX_SIZE ? prev.slice(1) : prev;
        return [...next, current];
      });
    }
    return popped;
  }, []);

  const reset = useCallback(() => {
    setPast([]);
    setFuture([]);
  }, []);

  return {
    push,
    undo,
    redo,
    canUndo: past.length > 0,
    canRedo: future.length > 0,
    reset,
  };
}
