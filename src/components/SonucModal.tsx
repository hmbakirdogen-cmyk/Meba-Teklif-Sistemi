import { useState } from 'react';
import { Button, Input, Modal, Select } from 'antd';
import type { Teklif, TeklifDurum, KayipSebebi } from '../types';
import { formatCurrency } from '../utils/formatters';
import { hesaplamaMotoru } from '../services/hesaplamaMotoru';
import { KAYIP_SEBEBI_LABEL } from '../pages/teklifListesiShared';

export interface SonucModalProps {
  open: boolean;
  teklif: Teklif | null;
  onClose: () => void;
  onSave: (patch: Partial<Teklif>) => void;
}

// İki mod:
//  - 'sebep'    → durum=reddedildi|iptal: sebep + (red ise) rakip + not
//  - 'satir'    → durum=onaylandi|kismi_onaylandi: müşterinin onayladığı satırları seç;
//                  hepsi ✓ → 'onaylandi', hepsi ✗ → 'reddedildi', karma → 'kismi_onaylandi'.
// NOT: Initial state'ler doğrudan teklif prop'undan türetilir; parent
// <SonucModal key={teklif?.id} /> ile remount eder, setState-in-effect yok.
export default function SonucModal({ open, teklif, onClose, onSave }: SonucModalProps) {
  const mod: 'sebep' | 'satir' =
    teklif?.durum === 'reddedildi' || teklif?.durum === 'iptal' ? 'sebep' : 'satir';

  const [sebep, setSebep] = useState<KayipSebebi | undefined>(teklif?.kayipSebebi);
  const [rakip, setRakip] = useState(teklif?.rakipFirma ?? '');
  const [not, setNot] = useState(teklif?.sonucNotu ?? '');

  const [satirOnay, setSatirOnay] = useState<Record<string, boolean>>(() => {
    const init: Record<string, boolean> = {};
    for (const s of teklif?.satirlar ?? []) {
      init[s.id] = s.onayDurumu === 'reddedildi' ? false : true;
    }
    return init;
  });

  function toggleSatir(id: string) {
    setSatirOnay((prev) => ({ ...prev, [id]: !prev[id] }));
  }
  function tumunuSec(deger: boolean) {
    setSatirOnay((prev) => {
      const next: Record<string, boolean> = {};
      for (const k of Object.keys(prev)) next[k] = deger;
      return next;
    });
  }

  if (!teklif) return null;

  const satirlar = teklif.satirlar ?? [];
  const onayliSayi = satirlar.filter((s) => satirOnay[s.id]).length;
  const toplamSayi = satirlar.length;
  const hepsi = onayliSayi === toplamSayi && toplamSayi > 0;
  const hicbiri = onayliSayi === 0;

  function kaydet() {
    if (!teklif) return;
    if (mod === 'sebep') {
      const patch: Partial<Teklif> = {
        durum: teklif.durum,
        sonucTarihi: new Date().toISOString(),
        kayipSebebi: sebep,
        rakipFirma: teklif.durum === 'reddedildi' ? (rakip.trim() || undefined) : undefined,
        sonucNotu: not.trim() || undefined,
      };
      onSave(patch);
      return;
    }
    const yeniSatirlar = satirlar.map((s) => ({
      ...s,
      onayDurumu: satirOnay[s.id] ? ('onaylandi' as const) : ('reddedildi' as const),
    }));
    const yeniDurum: TeklifDurum = hepsi ? 'onaylandi' : hicbiri ? 'reddedildi' : 'kismi_onaylandi';

    // Toplamları yeniden hesapla — iptal satırlar `genelToplamHesapla`
    // içindeki `onayDurumu === 'reddedildi'` filtresiyle düşer. Patch'in
    // toplamları içermesi şart: aksi halde TeklifEditor / TeklifListesi
    // sonradan yazarken stale (full) toplamları üzerine yazıp analitik
    // ekranlarda yanlış değer kaydeder.
    const toplamlar = hesaplamaMotoru.genelToplamHesapla(
      yeniSatirlar,
      teklif.kdvOrani,
      teklif.iskontoOrani,
      teklif.paraBirimi,
    );

    const patch: Partial<Teklif> = {
      durum: yeniDurum,
      satirlar: yeniSatirlar,
      araToplam: toplamlar.araToplam,
      toplamIndirim: toplamlar.toplamIndirim,
      toplamVergi: toplamlar.kdvTutar,
      genelToplam: toplamlar.genelToplam,
      sonucTarihi: new Date().toISOString(),
      sonucNotu: not.trim() || undefined,
      kayipSebebi: yeniDurum === 'reddedildi' ? sebep : undefined,
    };
    onSave(patch);
  }

  const okDisabled =
    mod === 'sebep' ? !sebep : toplamSayi === 0;

  const baslik =
    mod === 'sebep'
      ? teklif.durum === 'iptal' ? 'İptal — Sebep' : 'Reddedildi — Sebep'
      : 'Müşteri Onayı — Kalemleri İşaretleyin';

  const okText =
    mod === 'sebep'
      ? 'Kaydet'
      : hepsi
        ? 'Tamamı Onaylandı'
        : hicbiri
          ? 'Reddedildi'
          : `Kısmi Onay (${onayliSayi}/${toplamSayi})`;

  return (
    <Modal
      open={open}
      onCancel={onClose}
      onOk={kaydet}
      okButtonProps={{ disabled: okDisabled }}
      title={baslik}
      okText={okText}
      cancelText="Vazgeç"
      width={mod === 'satir' ? 560 : 420}
      centered
      destroyOnHidden
    >
      {mod === 'sebep' && (
        <>
          <Select
            value={sebep}
            onChange={(v) => setSebep(v)}
            placeholder="Sebep seçin"
            style={{ width: '100%' }}
            status={!sebep ? 'warning' : undefined}
            options={(Object.keys(KAYIP_SEBEBI_LABEL) as KayipSebebi[]).map((k) => ({
              value: k, label: KAYIP_SEBEBI_LABEL[k],
            }))}
            getPopupContainer={(t) => (t.parentNode as HTMLElement) ?? document.body}
          />
          {teklif.durum === 'reddedildi' && (
            <Input
              placeholder="Rakip firma (opsiyonel)"
              value={rakip}
              onChange={(e) => setRakip(e.target.value)}
              maxLength={100}
              style={{ marginTop: 10 }}
            />
          )}
          <Input.TextArea
            value={not}
            onChange={(e) => setNot(e.target.value)}
            rows={3}
            placeholder="Not (opsiyonel)"
            maxLength={500}
            style={{ marginTop: 10 }}
          />
        </>
      )}

      {mod === 'satir' && (
        <>
          <div style={{
            fontSize: 12, color: '#64748b', marginBottom: 12,
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          }}>
            <span>Müşterinin onayladığı kalemler ✓ kalsın, reddedilenleri ✗ yapın.</span>
            <div style={{ display: 'flex', gap: 6 }}>
              <Button size="small" onClick={() => tumunuSec(true)}>Tümünü Onayla</Button>
              <Button size="small" onClick={() => tumunuSec(false)}>Tümünü Reddet</Button>
            </div>
          </div>

          <div style={{
            maxHeight: 360, overflowY: 'auto',
            border: '1px solid #e2e8f0', borderRadius: 8,
          }}>
            {satirlar.map((s, i) => {
              const onayli = !!satirOnay[s.id];
              return (
                <div
                  key={s.id}
                  onClick={() => toggleSatir(s.id)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    padding: '8px 12px',
                    borderBottom: i < satirlar.length - 1 ? '1px solid #f1f5f9' : 'none',
                    background: onayli ? '#ecfdf5' : '#fef2f2',
                    cursor: 'pointer',
                    transition: 'background 120ms ease',
                  }}
                >
                  <div style={{
                    width: 22, height: 22, borderRadius: '50%',
                    background: onayli ? '#059669' : '#dc2626',
                    color: '#fff', fontSize: 13, fontWeight: 700,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    flexShrink: 0,
                  }}>
                    {onayli ? '✓' : '✕'}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: '#0f172a' }}>
                      {s.urunKod || '—'}
                      {s.aciklama && (
                        <span style={{ fontWeight: 400, color: '#475569' }}> · {s.aciklama}</span>
                      )}
                    </div>
                    <div style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>
                      {s.miktar} {s.birim} × {formatCurrency(s.birimFiyat, s.paraBirimi || teklif.paraBirimi)} = {formatCurrency(s.satirToplami, s.paraBirimi || teklif.paraBirimi)}
                    </div>
                  </div>
                </div>
              );
            })}
            {satirlar.length === 0 && (
              <div style={{ padding: 16, fontSize: 12, color: '#94a3b8', textAlign: 'center' }}>
                Bu teklifte kalem yok.
              </div>
            )}
          </div>

          <Input.TextArea
            value={not}
            onChange={(e) => setNot(e.target.value)}
            rows={2}
            placeholder="Not (opsiyonel) — örn: 'Müşteri ileride 4-5 numaralı kalemler için tekrar değerlendirecek.'"
            maxLength={500}
            style={{ marginTop: 12 }}
          />
        </>
      )}
    </Modal>
  );
}
