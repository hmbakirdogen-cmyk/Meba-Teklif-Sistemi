// ── TatilTebrikSayfasi.tsx ───────────────────────────────────────────
// NE: Tüm yaklaşan tatil/bayram için kişiye özel tebrik mesajı kampanya
//     merkezi. Tatil seç → ton seç → cari listesinden WhatsApp tek tık
//     gönder. Per-tatil localStorage tracking ile "gönderildi" işaretle.
//
// NEDEN: Mehmet Bey 2026-05-26 direktifi — "Tüm tatil günleri ve
//        bayramlar için KİŞİYE ÖZEL (isme ithafen) tebrik mesajları
//        olsun". Kurban (28 Mayıs) 2 gün sonra → mevcut Bayram Tebrik
//        sayfası (Komuta Portal'da) tek bayrama özel; bu sayfa
//        GENELLEŞTİRİLMİŞ — tatilTakvimi.ts'deki tüm tatilleri kapsar.
//
// NASIL: 1) yaklasanTatiller(90) ile önümüzdeki 3 ay listesi
//        2) Hero'da en yakın tatil + "X gün kaldı" sayacı
//        3) Tatil chip listesinden seçim
//        4) Ton chip (resmi/samimi/kısa/saygili/cosaklu) — tatilin
//           mevcutTonlar() listesinden filtrelenir
//        5) Cari arama + telefonlu filtre
//        6) Her cari için tebrikMesajiUret() ile kişiye özel mesaj
//           üretilir, wa.me deep link ile WhatsApp açılır
//        7) Tıklama anında localStorage'a "gönderildi" işaretlenir
//           (per-tatil key); UI yeşil "Gönderildi" rozetine geçer
//        8) Geri al butonu ile gönderim kaydı silinir

import { useEffect, useMemo, useState } from 'react';
import { App, Card, Empty, Input, Segmented, Tag } from 'antd';
import { SearchOutlined } from '@ant-design/icons';
import { Icon } from '@iconify/react';
import { Link } from 'react-router-dom';
import { cariService } from '../services/musteriService';
import { useKullanici } from '../context/useKullanici';
import { useColors } from '../hooks/useColors';
import type { Cari } from '../types';
import { formatCariAdi, formatAdSoyad } from '../utils/formatters';
import {
  yaklasanTatiller,
  gunFarki,
  type Tatil,
} from '../utils/tatilTakvimi';
import {
  tebrikMesajiUret,
  mevcutTonlar,
  bayHitap,
  type MesajTonu,
} from '../utils/tatilTebrikMesaj';

const TON_AD: Record<MesajTonu, string> = {
  resmi: 'Resmi',
  samimi: 'Samimi',
  kisa: 'Kısa',
  saygili: 'Saygılı',
  cosaklu: 'Coşkulu',
};

function waLink(telefon: string, mesaj: string): string {
  const t = telefon.replace(/[^\d]/g, '');
  const tn = t.startsWith('90') ? t : t.startsWith('0') ? `9${t}` : `90${t}`;
  return `https://wa.me/${tn}?text=${encodeURIComponent(mesaj)}`;
}

function useGonderildi(tatilKod: string) {
  const lsKey = `meba_tatil_gonderildi_${tatilKod}`;
  const [gonderildi, setGonderildi] = useState<Record<string, string>>({});
  useEffect(() => {
    try {
      const raw = localStorage.getItem(lsKey);
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setGonderildi(raw ? JSON.parse(raw) : {});
    } catch {
      setGonderildi({});
    }
  }, [lsKey]);
  const isaretle = (cariId: string) => {
    setGonderildi((prev) => {
      const yeni = { ...prev, [cariId]: new Date().toISOString() };
      try { localStorage.setItem(lsKey, JSON.stringify(yeni)); } catch { /* sessiz */ }
      return yeni;
    });
  };
  const kaldir = (cariId: string) => {
    setGonderildi((prev) => {
      const yeni = { ...prev };
      delete yeni[cariId];
      try { localStorage.setItem(lsKey, JSON.stringify(yeni)); } catch { /* sessiz */ }
      return yeni;
    });
  };
  return { gonderildi, isaretle, kaldir };
}

export default function TatilTebrikSayfasi() {
  const { aktifKullanici } = useKullanici();
  const C = useColors();
  const { message } = App.useApp();

  // Cari listesi (sadece müşteri olan + telefonu/eposta olan)
  const [cariler, setCariler] = useState<Cari[]>([]);
  useEffect(() => {
    try {
      const tum = cariService.tumCarileriGetir();
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setCariler(tum);
    } catch (e) {
      console.error('[TatilTebrik] cari yükleme hatası:', e);
      message.error('Cari listesi yüklenemedi.');
    }
  }, [message]);

  // Yaklaşan tatiller (önümüzdeki 90 gün)
  const tatiller = useMemo(() => yaklasanTatiller(90), []);
  const [seciliKod, setSeciliKod] = useState<string>(() => tatiller[0]?.kod ?? '');
  const seciliTatil: Tatil | null = useMemo(
    () => tatiller.find((t) => t.kod === seciliKod) ?? tatiller[0] ?? null,
    [tatiller, seciliKod],
  );

  // Ton seçimi — seçili tatilin mevcutTonları
  const tonlar = useMemo(
    () => (seciliTatil ? mevcutTonlar(seciliTatil.kod) : []),
    [seciliTatil],
  );
  const [secilenTon, setSecilenTon] = useState<MesajTonu>('resmi');
  useEffect(() => {
    // Tatil değiştiğinde önerilen ton'a düş — set-state-in-effect kuralı:
    // koşullu setState, kaskad render değil; eski kuralı sustur.
    if (seciliTatil && !tonlar.includes(secilenTon)) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setSecilenTon((seciliTatil.onerilenTon as MesajTonu) ?? tonlar[0] ?? 'kisa');
    }
  }, [seciliTatil, tonlar, secilenTon]);

  // Cari arama + filtreleme
  const [arama, setArama] = useState('');
  const [sadeceTelefonlu, setSadeceTelefonlu] = useState(true);
  const filtreli = useMemo(() => {
    return cariler.filter((c) => {
      if (sadeceTelefonlu && !c.telefon) return false;
      if (arama) {
        const q = arama.toLocaleLowerCase('tr-TR');
        if (
          !c.firmaAdi.toLocaleLowerCase('tr-TR').includes(q) &&
          !(c.yetkiliKisi ?? '').toLocaleLowerCase('tr-TR').includes(q)
        ) return false;
      }
      return true;
    }).slice(0, 200);
  }, [cariler, sadeceTelefonlu, arama]);

  const { gonderildi, isaretle, kaldir } = useGonderildi(seciliKod);
  const tamamlanan = filtreli.filter((c) => gonderildi[c.id]).length;

  if (tatiller.length === 0 || !seciliTatil) {
    return (
      <div style={{ padding: 32 }}>
        <Empty description="Önümüzdeki 90 gün içinde tatil yok" />
      </div>
    );
  }

  const fark = gunFarki(seciliTatil.tarih);
  const benimAdSoyad = aktifKullanici ? formatAdSoyad(aktifKullanici.adSoyad) : 'MEBA';

  return (
    <div style={{ padding: 16, maxWidth: 1200, margin: '0 auto' }}>
      {/* Breadcrumb */}
      <div style={{ fontSize: 11, color: C.textFaint, marginBottom: 12, letterSpacing: '0.04em', textTransform: 'uppercase' }}>
        <Link to="/teklifler" style={{ color: C.textFaint, textDecoration: 'none' }}>Teklifler</Link>
        {' › '}
        <span>Tatil Tebrik Kampanyası</span>
      </div>

      {/* Hero — seçili tatil */}
      <Card
        style={{
          marginBottom: 16,
          background: `linear-gradient(135deg, rgba(168,85,247,0.10), rgba(168,85,247,0.02))`,
          border: '1px solid rgba(168,85,247,0.22)',
        }}
        styles={{ body: { padding: 24 } }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 18, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 56, lineHeight: 1, flexShrink: 0 }}>{seciliTatil.emoji}</span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <h1 style={{ fontSize: 22, fontWeight: 800, margin: 0, color: C.textPrimary, letterSpacing: '-0.01em' }}>
              {seciliTatil.ad}
            </h1>
            <p style={{ fontSize: 13, color: C.textSecondary, margin: '4px 0 0' }}>
              {fark === 0
                ? 'Bugün — gönderilmemiş cariler aşağıda.'
                : fark > 0
                ? `${fark} gün kaldı · ${filtreli.length} cariye kişiselleştirilmiş mesaj hazır.`
                : `${-fark} gün önce — geçti.`}
            </p>
            <div style={{ marginTop: 8, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              <Tag color={seciliTatil.kategori === 'dini-bayram' ? 'green' : seciliTatil.kategori === 'kandil' ? 'purple' : 'blue'}>
                {seciliTatil.kategori === 'dini-bayram' ? 'Dini Bayram' : seciliTatil.kategori === 'kandil' ? 'Kandil' : seciliTatil.kategori === 'resmi' ? 'Resmi Tatil' : 'Özel Gün'}
              </Tag>
              {seciliTatil.isYerKapali && <Tag color="orange">İş Yeri Kapalı</Tag>}
              {seciliTatil.yarimGun && <Tag color="gold">Yarım Gün</Tag>}
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 36, fontWeight: 800, color: '#a855f7', lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>
              {fark === 0 ? 'BUGÜN' : fark > 0 ? fark : `${-fark}.G`}
            </div>
            <div style={{ fontSize: 10, color: C.textFaint, textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600, marginTop: 4 }}>
              {fark > 0 ? 'Gün Kaldı' : fark === 0 ? 'Aktif' : 'Geçti'}
            </div>
          </div>
        </div>
      </Card>

      {/* Yaklaşan tatiller chip listesi (en fazla 10) */}
      <div style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 10, fontWeight: 700, color: C.textFaint, marginBottom: 6, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
          Önümüzdeki 90 Gün
        </div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {tatiller.slice(0, 14).map((t) => {
            const aktif = t.kod === seciliKod && t.tarih === seciliTatil.tarih;
            return (
              <button
                key={`${t.kod}-${t.tarih}`}
                type="button"
                onClick={() => setSeciliKod(t.kod)}
                style={{
                  padding: '6px 12px',
                  borderRadius: 6,
                  border: `1px solid ${aktif ? '#a855f7' : C.borderSubtle}`,
                  background: aktif ? 'rgba(168,85,247,0.12)' : 'transparent',
                  color: aktif ? '#a855f7' : C.textSecondary,
                  cursor: 'pointer',
                  fontSize: 12,
                  fontWeight: aktif ? 700 : 500,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  transition: 'all 150ms',
                }}
              >
                <span>{t.emoji}</span>
                <span>{t.ad}</span>
                <span style={{ opacity: 0.65, fontSize: 10 }}>·</span>
                <span style={{ fontSize: 10, opacity: 0.75 }}>
                  {gunFarki(t.tarih) === 0 ? 'bugün' : `${gunFarki(t.tarih)}g`}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Ton seçici */}
      <Card style={{ marginBottom: 16 }} styles={{ body: { padding: 14 } }}>
        <div style={{ fontSize: 10, fontWeight: 700, color: C.textFaint, marginBottom: 8, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
          Mesaj Tonu
        </div>
        <Segmented
          value={secilenTon}
          onChange={(v) => setSecilenTon(v as MesajTonu)}
          options={tonlar.map((t) => ({ label: TON_AD[t], value: t }))}
        />
        <pre style={{
          marginTop: 14,
          padding: 14,
          background: C.bgSurface,
          borderRadius: 8,
          border: `1px solid ${C.borderSubtle}`,
          fontSize: 12,
          color: C.textPrimary,
          fontFamily: 'inherit',
          whiteSpace: 'pre-wrap',
          lineHeight: 1.55,
          margin: '14px 0 0',
        }}>
          {tebrikMesajiUret(seciliTatil.kod, secilenTon, {
            hitap: 'Ahmet Bey',
            firmaAdi: 'Örnek A.Ş.',
            benimAdSoyad,
            benimFirma: 'MEBA Mekanik',
          })}
        </pre>
      </Card>

      {/* Arama + filtre */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
        <Input
          prefix={<SearchOutlined />}
          placeholder="Firma veya yetkili ara..."
          value={arama}
          onChange={(e) => setArama(e.target.value)}
          allowClear
          style={{ flex: 1, minWidth: 200 }}
        />
        <label style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '0 12px', border: `1px solid ${C.borderSubtle}`, borderRadius: 6, cursor: 'pointer', fontSize: 12 }}>
          <input
            type="checkbox"
            checked={sadeceTelefonlu}
            onChange={(e) => setSadeceTelefonlu(e.target.checked)}
          />
          Sadece telefonu olan
        </label>
      </div>

      {/* İlerleme */}
      <div style={{ fontSize: 11, color: C.textFaint, marginBottom: 8 }}>
        {tamamlanan} / {filtreli.length} cariye gönderildi
      </div>

      {/* Cari listesi */}
      <Card styles={{ body: { padding: 0 } }}>
        {filtreli.length === 0 ? (
          <Empty description="Filtre eşleşmesi yok" style={{ padding: 32 }} />
        ) : (
          <ul style={{ margin: 0, padding: 0, listStyle: 'none' }}>
            {filtreli.map((c) => {
              const isGonderildi = !!gonderildi[c.id];
              const hitap = bayHitap(c.yetkiliKisi);
              const mesaj = tebrikMesajiUret(seciliTatil.kod, secilenTon, {
                hitap,
                firmaAdi: c.firmaAdi,
                benimAdSoyad,
                benimFirma: 'MEBA Mekanik',
              });
              const link = c.telefon ? waLink(c.telefon, mesaj) : null;
              return (
                <li
                  key={c.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                    padding: '12px 16px',
                    borderBottom: `1px solid ${C.borderSubtle}`,
                  }}
                >
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: C.textPrimary, marginBottom: 2 }}>
                      {formatCariAdi(c.firmaAdi)}
                    </div>
                    <div style={{ fontSize: 11, color: C.textFaint }}>
                      {c.yetkiliKisi || '—'} {c.telefon && <span style={{ opacity: 0.6 }}>· {c.telefon}</span>}
                    </div>
                  </div>
                  <div style={{ flexShrink: 0 }}>
                    {isGonderildi ? (
                      <button
                        type="button"
                        onClick={() => kaldir(c.id)}
                        style={{
                          padding: '6px 12px',
                          background: 'rgba(34,197,94,0.12)',
                          border: '1px solid rgba(34,197,94,0.35)',
                          color: '#16a34a',
                          borderRadius: 6,
                          fontSize: 11,
                          fontWeight: 700,
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 4,
                        }}
                      >
                        <Icon icon="solar:check-circle-bold" width={13} />
                        Gönderildi · geri al
                      </button>
                    ) : link ? (
                      <a
                        href={link}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={() => isaretle(c.id)}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 6,
                          padding: '6px 14px',
                          background: 'linear-gradient(135deg, #16a34a, #22c55e)',
                          color: '#fff',
                          borderRadius: 6,
                          fontSize: 11,
                          fontWeight: 700,
                          textDecoration: 'none',
                        }}
                      >
                        <Icon icon="ic:baseline-whatsapp" width={13} />
                        WhatsApp
                      </a>
                    ) : (
                      <span style={{ fontSize: 10, color: C.textFaint, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                        Telefon yok
                      </span>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </Card>

      {filtreli.length === 200 && (
        <div style={{ textAlign: 'center', fontSize: 11, color: C.textFaint, marginTop: 12 }}>
          İlk 200 cari gösteriliyor. Arama ile daraltabilirsiniz.
        </div>
      )}
    </div>
  );
}
