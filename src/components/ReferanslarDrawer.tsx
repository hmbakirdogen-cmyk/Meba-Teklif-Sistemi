/**
 * ReferanslarDrawer.tsx
 * Bir ürün satırına ait geçmiş teklif kayıtlarını sağdan açılan
 * premium panelde gösterir. İstatistik / grafik yok — sadece hızlı
 * ticari referans: tarih, cari, fiyat, teklif no, personel.
 *
 * Veri kaynağı: teklifService.tumTeklifleriGetir(...) — visibility
 * filter sunucu tarafında uygulanır. Filtre yalnızca urunKod üzerinden
 * (kod yoksa drawer açılmaz).
 */
import React, { useMemo } from 'react';
import { Drawer, Empty } from 'antd';
import { CloseOutlined, ArrowRightOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { teklifService } from '../services/teklifService';
import { useKullanici } from '../context/useKullanici';
import { useColors } from '../hooks/useColors';
import { useIsMobile } from '../hooks/useIsMobile';
import { formatDate, formatCariAdi, formatDisplayNumber } from '../utils/formatters';
import type { Teklif, TeklifSatiri } from '../types';

interface Props {
  open: boolean;
  onClose: () => void;
  urunKod: string;
  aciklama?: string;
  marka?: string;
  /** Şu anki teklifin id'si — sonuçlardan hariç tutulur. */
  aktifTeklifId?: string;
  /** Şu anki cari id'si — eşleşen geçmiş satırları hafif vurgular. */
  aktifCariId?: string;
}

interface SatirRef {
  satir: TeklifSatiri;
  teklif: Teklif;
}

const MAX_GORUNUR = 200;

function norm(s: string): string {
  return s.toLocaleLowerCase('tr-TR').trim();
}

export default function ReferanslarDrawer({
  open, onClose, urunKod, aciklama, marka,
  aktifTeklifId, aktifCariId,
}: Props) {
  const navigate = useNavigate();
  const { aktifKullanici } = useKullanici();
  const C = useColors();
  const isMobile = useIsMobile(768);

  // Drawer kapalıyken hesaplama yapma — büyük dataset'te lazy davran.
  const sonuclar = useMemo<SatirRef[]>(() => {
    if (!open || !aktifKullanici) return [];
    const kod = norm(urunKod || '');
    if (!kod) return [];
    const teklifler = teklifService.tumTeklifleriGetir({
      id: aktifKullanici.id,
      rol: aktifKullanici.rol,
    });
    const out: SatirRef[] = [];
    for (const t of teklifler) {
      if (t.id === aktifTeklifId) continue;
      if (!Array.isArray(t.satirlar)) continue;
      for (const s of t.satirlar) {
        if (norm(s.urunKod || '') !== kod) continue;
        out.push({ satir: s, teklif: t });
      }
    }
    out.sort((a, b) => {
      const ta = a.teklif.tarih || a.teklif.olusturmaTarihi || '';
      const tb = b.teklif.tarih || b.teklif.olusturmaTarihi || '';
      const cmp = tb.localeCompare(ta);
      if (cmp !== 0) return cmp;
      const ua = a.teklif.guncellemeTarihi || '';
      const ub = b.teklif.guncellemeTarihi || '';
      return ub.localeCompare(ua);
    });
    return out;
  }, [open, aktifKullanici, aktifTeklifId, urunKod]);

  const gorunurSonuclar = sonuclar.slice(0, MAX_GORUNUR);
  const ayniCariSayisi = aktifCariId
    ? sonuclar.filter((r) => r.teklif.cari?.id === aktifCariId).length
    : 0;

  const teklifeAc = (id: string) => {
    onClose();
    navigate('/teklif/' + id);
  };

  return (
    <Drawer
      open={open}
      onClose={onClose}
      placement="right"
      width={isMobile ? '100%' : 560}
      closable={false}
      destroyOnHidden
      maskClosable
      keyboard
      // Editör portalları (SatirAksiyonlariPanel: 1060, CellEditPopup: 2000) ve
      // SatirIskontoRozeti (1055) drawer'ın altında kalsın diye z-index'i bunların
      // hepsinin üstüne çek. Antd default ~1000 → kasıtlı yükseltme.
      zIndex={2100}
      styles={{
        mask:    { zIndex: 2099 },
        wrapper: { zIndex: 2100, boxShadow: '-12px 0 36px rgba(15, 30, 60, 0.18)' },
        body:    { padding: 0, background: C.bgSurface },
        header:  { display: 'none' },
      }}
    >
      <div className="referanslar-header">
        <div className="referanslar-header-row">
          <span className="referanslar-header-tag">Referanslar</span>
          <button
            type="button"
            className="referanslar-close"
            onClick={onClose}
            aria-label="Paneli kapat"
          >
            <CloseOutlined />
          </button>
        </div>
        <div className="referanslar-header-kod">{urunKod || '—'}</div>
        {(marka || aciklama) && (
          <div className="referanslar-header-meta">
            {marka && <span className="referanslar-header-marka">{marka}</span>}
            {aciklama && <span className="referanslar-header-aciklama">{aciklama}</span>}
          </div>
        )}
        <div className="referanslar-header-summary">
          {sonuclar.length === 0 ? (
            <span>Geçmiş kayıt yok</span>
          ) : (
            <>
              <span>
                <strong>{sonuclar.length}</strong> geçmiş kayıt
              </span>
              {aktifCariId && ayniCariSayisi > 0 && (
                <span className="referanslar-header-summary-tag">
                  <strong>{ayniCariSayisi}</strong> aynı cariden
                </span>
              )}
            </>
          )}
        </div>
      </div>

      <div className="referanslar-liste">
        {sonuclar.length === 0 ? (
          <div className="referanslar-empty">
            <Empty
              image={Empty.PRESENTED_IMAGE_SIMPLE}
              description={
                <span style={{ color: C.textSecondary, fontSize: 13 }}>
                  Bu ürünün başka teklifte kaydı bulunmuyor.
                </span>
              }
            />
          </div>
        ) : (
          gorunurSonuclar.map(({ satir, teklif }) => (
            <ReferansSatiri
              key={`${teklif.id}__${satir.id}`}
              satir={satir}
              teklif={teklif}
              vurgula={Boolean(aktifCariId) && teklif.cari?.id === aktifCariId}
              onTeklifAc={() => teklifeAc(teklif.id)}
            />
          ))
        )}
        {sonuclar.length > MAX_GORUNUR && (
          <div className="referanslar-more">
            İlk {MAX_GORUNUR} kayıt gösteriliyor — toplam {sonuclar.length}.
          </div>
        )}
      </div>
    </Drawer>
  );
}

interface SatirProps {
  satir: TeklifSatiri;
  teklif: Teklif;
  vurgula: boolean;
  onTeklifAc: () => void;
}

const ReferansSatiri = React.memo(function ReferansSatiri({
  satir, teklif, vurgula, onTeklifAc,
}: SatirProps) {
  const fiyat = Number(satir.birimFiyat || 0);
  const fiyatPb = satir.paraBirimi || teklif.paraBirimi;
  const fiyatStr = fiyat > 0
    ? `${formatDisplayNumber(fiyat, 2, 2)} ${fiyatPb || ''}`.trim()
    : '—';
  return (
    <div className={`referanslar-satir${vurgula ? ' is-vurgu' : ''}`}>
      <div className="referanslar-satir-meta">
        <div className="referanslar-satir-tarih">
          {formatDate(teklif.tarih)}
        </div>
        <div className="referanslar-satir-personel">
          {teklif.hazirlayanAdSoyad || '—'}
        </div>
      </div>
      <div className="referanslar-satir-cari" title={teklif.cari?.firmaAdi}>
        {formatCariAdi(teklif.cari?.firmaAdi || '—')}
      </div>
      <div className="referanslar-satir-fiyat">{fiyatStr}</div>
      <button
        type="button"
        onClick={onTeklifAc}
        className="referanslar-satir-teklifno"
        title={`${teklif.teklifNo} teklifini aç`}
      >
        <span>{teklif.teklifNo}</span>
        <ArrowRightOutlined />
      </button>
    </div>
  );
});
