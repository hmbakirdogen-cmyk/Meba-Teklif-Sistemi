/**
 * Malzeme Hareketleri Sayfası — ürün kodu sorgu paneli.
 *
 * Kullanım: Satış personeli yeni teklif hazırlarken bir ürün kodunun
 * geçmişine bakar. "Bu kodu daha önce kime kaç liraya satmışız?" sorusuna
 * cevap verir. Tüm teklifler (taslak/sonuçlanmış hepsi) tarand.
 *
 * Pipeline:
 *   1. Kullanıcı ürün kodu yazar / autocomplete'ten seçer
 *   2. tumTeklifleriGetir() → her teklifin satırlarında urunKod karşılaştırılır
 *   3. Eşleşen satırlardan rapor oluşturulur (özet kartlar + grafik + tablo)
 *
 * Grafik: Saf SVG line chart (yeni dep eklemiyoruz). X = tarih, Y = birim
 * fiyat. Her nokta = bir teklif kalemi. Tooltip ile detay.
 */

import { useEffect, useMemo, useState } from 'react';
import { AutoComplete, Card, Empty, Input, Table, Tag } from 'antd';
import { SearchOutlined } from '@ant-design/icons';
import { teklifService } from '../services/teklifService';
import { urunService } from '../services/urunService';
import { useKullanici } from '../context/useKullanici';
import { useColors } from '../hooks/useColors';
import { formatCariAdi, formatCurrency, formatDate } from '../utils/formatters';
import type { Teklif, TeklifDurum } from '../types';

interface Hareket {
  teklifId: string;
  teklifNo: string;
  tarih: string; // ISO
  cariId: string;
  cariAdi: string;
  miktar: number;
  birim: string;
  birimFiyat: number;
  paraBirimi: 'TRY' | 'EUR' | 'USD';
  satirToplami: number;
  durum: TeklifDurum;
  hazirlayan: string;
}

const DURUM_ETIKET: Record<TeklifDurum, string> = {
  taslak: 'Hazırlanıyor',
  hazir: 'Hazır',
  gonderildi: 'Gönderildi',
  onaylandi: 'Onaylandı',
  kismi_onaylandi: 'Kısmi Onay',
  siparis_alindi: 'Siparişe Döndü',
  reddedildi: 'Reddedildi',
  iptal: 'İptal',
};

const DURUM_RENK: Record<TeklifDurum, string> = {
  taslak: 'default',
  hazir: 'blue',
  gonderildi: 'gold',
  onaylandi: 'green',
  kismi_onaylandi: 'orange',
  siparis_alindi: 'green',
  reddedildi: 'red',
  iptal: 'default',
};

export default function MalzemeHareketleriSayfasi() {
  const { aktifKullanici } = useKullanici();
  const C = useColors();
  const [arananKod, setArananKod] = useState('');
  const [secilenKod, setSecilenKod] = useState('');
  const [teklifler, setTeklifler] = useState<Teklif[]>([]);
  const [yuklendi, setYuklendi] = useState(false);

  // İlk mount'ta tüm teklifleri server'dan tazele + cache'ten oku.
  useEffect(() => {
    let aktif = true;
    if (!aktifKullanici) return;
    const kul = { id: aktifKullanici.id, rol: aktifKullanici.rol };
    teklifService.tekliferiYenile(kul).finally(() => {
      if (!aktif) return;
      setTeklifler(teklifService.tumTeklifleriGetir(kul));
      setYuklendi(true);
    });
    return () => { aktif = false; };
  }, [aktifKullanici]);

  // Ürün kataloğundan autocomplete seçenekleri.
  const urunOptions = useMemo(() => {
    const urunler = urunService.tumUrunleriGetir();
    const q = arananKod.trim().toLocaleLowerCase('tr-TR');
    return urunler
      .filter((u) =>
        !q ||
        u.urunKod.toLocaleLowerCase('tr-TR').includes(q) ||
        (u.aciklama ?? '').toLocaleLowerCase('tr-TR').includes(q),
      )
      .slice(0, 30)
      .map((u) => ({
        value: u.urunKod,
        label: (
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
            <span style={{ fontWeight: 600 }}>{u.urunKod}</span>
            <span style={{ color: '#94a3b8', fontSize: 12, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 280 }}>
              {u.aciklama || '—'}
            </span>
          </div>
        ),
      }));
  }, [arananKod]);

  // Seçilen kod için tüm teklif satırlarını topla.
  const hareketler: Hareket[] = useMemo(() => {
    if (!secilenKod) return [];
    const kodLower = secilenKod.trim().toLocaleLowerCase('tr-TR');
    const sonuc: Hareket[] = [];
    for (const t of teklifler) {
      for (const s of (t.satirlar ?? [])) {
        if (!s.urunKod) continue;
        if (s.urunKod.toLocaleLowerCase('tr-TR') !== kodLower) continue;
        // Set alt kalemleri (setAltKalem=true) fiyat tutmaz, atla.
        if (s.setAltKalem) continue;
        sonuc.push({
          teklifId: t.id,
          teklifNo: t.teklifNo,
          tarih: t.tarih,
          cariId: t.cari.id,
          cariAdi: t.cari.firmaAdi,
          miktar: s.miktar,
          birim: s.birim || '',
          birimFiyat: s.birimFiyat,
          paraBirimi: (s.paraBirimi || t.paraBirimi) as 'TRY' | 'EUR' | 'USD',
          satirToplami: s.satirToplami,
          durum: t.durum,
          hazirlayan: t.hazirlayanAdSoyad || '',
        });
      }
    }
    sonuc.sort((a, b) => (a.tarih || '').localeCompare(b.tarih || ''));
    return sonuc;
  }, [secilenKod, teklifler]);

  // Özet metrikler — para birimi bazlı ortalama/min/max (karışık para birimleri ayrı).
  const ozet = useMemo(() => {
    if (hareketler.length === 0) return null;
    const grup: Record<string, { count: number; topFiyat: number; min: number; max: number; sonTarih: string }> = {};
    for (const h of hareketler) {
      const pb = h.paraBirimi;
      const g = grup[pb] || { count: 0, topFiyat: 0, min: Infinity, max: -Infinity, sonTarih: '' };
      g.count += 1;
      g.topFiyat += h.birimFiyat;
      if (h.birimFiyat < g.min) g.min = h.birimFiyat;
      if (h.birimFiyat > g.max) g.max = h.birimFiyat;
      if (h.tarih > g.sonTarih) g.sonTarih = h.tarih;
      grup[pb] = g;
    }
    return Object.entries(grup).map(([pb, g]) => ({
      pb: pb as 'TRY' | 'EUR' | 'USD',
      count: g.count,
      ortalama: g.topFiyat / g.count,
      min: g.min,
      max: g.max,
      sonTarih: g.sonTarih,
    }));
  }, [hareketler]);

  const aciklama = useMemo(() => {
    if (!secilenKod) return null;
    const urun = urunService.tumUrunleriGetir().find(
      (u) => u.urunKod.toLocaleLowerCase('tr-TR') === secilenKod.toLocaleLowerCase('tr-TR'),
    );
    return urun?.aciklama || hareketler[0]?.cariAdi ? hareketler[0]?.cariAdi : null;
  }, [secilenKod, hareketler]);

  function ara() {
    setSecilenKod(arananKod.trim());
  }

  return (
    <div style={{ padding: '20px 24px' }}>
      <h1 style={{ fontSize: 24, fontWeight: 700, color: C.textPrimary, marginBottom: 4 }}>
        Malzeme Hareketleri
      </h1>
      <div style={{ fontSize: 12, color: C.textSecondary, marginBottom: 20 }}>
        Bir ürün kodu yaz, geçmişte hangi müşterilere hangi fiyatlarla teklif verildiğini gör.
      </div>

      <Card style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <AutoComplete
            value={arananKod}
            onChange={(v) => setArananKod(v)}
            onSelect={(v) => { setArananKod(v); setSecilenKod(v); }}
            options={urunOptions}
            placeholder="Ürün kodu ara veya yaz…"
            style={{ flex: 1 }}
            allowClear
            popupMatchSelectWidth={false}
            dropdownStyle={{ minWidth: 420 }}
          >
            <Input
              size="large"
              prefix={<SearchOutlined />}
              onPressEnter={ara}
              autoFocus
            />
          </AutoComplete>
          <button
            type="button"
            onClick={ara}
            style={{
              height: 40,
              padding: '0 24px',
              fontSize: 14,
              fontWeight: 600,
              color: '#fff',
              background: '#0f1f45',
              border: 'none',
              borderRadius: 6,
              cursor: 'pointer',
            }}
          >
            Geçmişi Getir
          </button>
        </div>
      </Card>

      {!secilenKod && yuklendi && (
        <Empty
          description="Sorgu için bir ürün kodu girin."
          style={{ marginTop: 60 }}
        />
      )}

      {secilenKod && hareketler.length === 0 && yuklendi && (
        <Empty
          description={<span><b>{secilenKod}</b> kodu için hiç teklif kaydı bulunamadı.</span>}
          style={{ marginTop: 60 }}
        />
      )}

      {secilenKod && hareketler.length > 0 && (
        <>
          {/* Özet kart şeridi (para birimi bazlı) */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: `repeat(${ozet?.length ?? 1}, minmax(0, 1fr))`,
            gap: 12,
            marginBottom: 16,
          }}>
            {ozet?.map((o) => (
              <Card key={o.pb} size="small" styles={{ body: { padding: 14 } }}>
                <div style={{ fontSize: 11, fontWeight: 600, color: C.textFaint, letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: 8 }}>
                  {o.pb} · {o.count} kayıt
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                  <Metrik etiket="Ortalama" deger={formatCurrency(o.ortalama, o.pb)} vurgu C={C} />
                  <Metrik etiket="Son satış" deger={formatDate(o.sonTarih)} C={C} />
                  <Metrik etiket="En düşük" deger={formatCurrency(o.min, o.pb)} C={C} />
                  <Metrik etiket="En yüksek" deger={formatCurrency(o.max, o.pb)} C={C} />
                </div>
              </Card>
            ))}
          </div>

          {aciklama && (
            <div style={{
              fontSize: 12,
              color: C.textSecondary,
              marginBottom: 14,
              padding: '8px 12px',
              background: C.bgElevated,
              borderRadius: 6,
              border: `1px solid ${C.borderSubtle}`,
            }}>
              <b style={{ color: C.textPrimary }}>{secilenKod}</b>
              {aciklama && <span> · {aciklama}</span>}
            </div>
          )}

          {/* Grafik */}
          <Card title="Fiyat Trendi (Zaman Serisi)" style={{ marginBottom: 16 }} styles={{ body: { padding: 16 } }}>
            <FiyatGrafigi hareketler={hareketler} />
          </Card>

          {/* Detay tablo */}
          <Card title={`Detay (${hareketler.length} kayıt)`} styles={{ body: { padding: 0 } }}>
            <Table
              size="small"
              pagination={{ pageSize: 20, showSizeChanger: false }}
              rowKey={(r) => `${r.teklifId}-${r.teklifNo}-${r.tarih}-${r.birimFiyat}`}
              dataSource={[...hareketler].reverse()} // en yeni üstte
              columns={[
                {
                  title: 'Tarih',
                  dataIndex: 'tarih',
                  width: 110,
                  render: (v) => formatDate(v),
                  sorter: (a, b) => (a.tarih || '').localeCompare(b.tarih || ''),
                },
                {
                  title: 'Müşteri',
                  dataIndex: 'cariAdi',
                  render: (v) => formatCariAdi(v),
                  ellipsis: true,
                },
                {
                  title: 'Teklif No',
                  dataIndex: 'teklifNo',
                  width: 130,
                  ellipsis: true,
                },
                {
                  title: 'Miktar',
                  dataIndex: 'miktar',
                  width: 100,
                  align: 'right',
                  render: (v, r) => `${v} ${r.birim}`,
                  sorter: (a, b) => a.miktar - b.miktar,
                },
                {
                  title: 'Birim Fiyat',
                  dataIndex: 'birimFiyat',
                  width: 130,
                  align: 'right',
                  render: (v, r) => <b>{formatCurrency(v, r.paraBirimi)}</b>,
                  sorter: (a, b) => a.birimFiyat - b.birimFiyat,
                },
                {
                  title: 'Toplam',
                  dataIndex: 'satirToplami',
                  width: 130,
                  align: 'right',
                  render: (v, r) => formatCurrency(v, r.paraBirimi),
                },
                {
                  title: 'Durum',
                  dataIndex: 'durum',
                  width: 130,
                  render: (v) => <Tag color={DURUM_RENK[v as TeklifDurum]}>{DURUM_ETIKET[v as TeklifDurum]}</Tag>,
                  filters: (Object.keys(DURUM_ETIKET) as TeklifDurum[]).map((d) => ({
                    text: DURUM_ETIKET[d],
                    value: d,
                  })),
                  onFilter: (val, r) => r.durum === val,
                },
                {
                  title: 'Hazırlayan',
                  dataIndex: 'hazirlayan',
                  width: 140,
                  ellipsis: true,
                },
              ]}
            />
          </Card>
        </>
      )}
    </div>
  );
}

// ─── Yardımcı bileşenler ────────────────────────────────────────────

function Metrik({
  etiket, deger, vurgu, C,
}: {
  etiket: string;
  deger: string;
  vurgu?: boolean;
  C: ReturnType<typeof useColors>;
}) {
  return (
    <div>
      <div style={{ fontSize: 10, color: C.textFaint, letterSpacing: '0.04em', marginBottom: 2 }}>
        {etiket}
      </div>
      <div style={{
        fontSize: vurgu ? 16 : 13,
        fontWeight: vurgu ? 700 : 600,
        color: C.textPrimary,
        fontVariantNumeric: 'tabular-nums',
      }}>
        {deger}
      </div>
    </div>
  );
}

/**
 * Saf SVG zaman serisi grafiği. Çoklu para birimi varsa para birimi başına
 * ayrı renkli seri çizilir. X ekseni tarihler (linear), Y ekseni birim fiyat.
 * Her nokta hover edilebilir (tooltip ile cari + tarih + fiyat).
 */
function FiyatGrafigi({ hareketler }: { hareketler: Hareket[] }) {
  const W = 720;
  const H = 280;
  const PAD = { top: 16, right: 24, bottom: 36, left: 56 };
  const innerW = W - PAD.left - PAD.right;
  const innerH = H - PAD.top - PAD.bottom;
  const C = useColors();

  // Para birimine göre renk paleti.
  const renk: Record<string, string> = {
    TRY: '#0f1f45',
    EUR: '#0ea5e9',
    USD: '#10b981',
  };

  // Para birimi bazlı seri ayır.
  const seriler = useMemo(() => {
    const map: Record<string, Hareket[]> = {};
    for (const h of hareketler) {
      if (!map[h.paraBirimi]) map[h.paraBirimi] = [];
      map[h.paraBirimi].push(h);
    }
    return Object.entries(map);
  }, [hareketler]);

  // Skala — X: tarih (linear timestamp), Y: birim fiyat
  const allTimestamps = hareketler.map((h) => new Date(h.tarih).getTime()).filter((t) => Number.isFinite(t));
  const xMin = Math.min(...allTimestamps);
  const xMax = Math.max(...allTimestamps);
  const xRange = xMax === xMin ? 1 : xMax - xMin;

  // Her para birimi kendi Y skalasında olacak — overlap'leri görsel olarak ayrı
  // tutmak için birden fazla seri varsa kompleksleşir. Basitleştirme: TÜM
  // serileri tek Y skalasında çiz (kullanıcı zaten farklı renk + tooltip ile
  // ayırt eder). Karışık para birimi senaryosu nadir.
  const allPrices = hareketler.map((h) => h.birimFiyat).filter(Number.isFinite);
  const yMin = 0; // sıfırdan başla — fiyat ölçeği daha sezgisel
  const yMax = Math.max(...allPrices) * 1.1 || 1;

  const x = (ts: number) => PAD.left + ((ts - xMin) / xRange) * innerW;
  const y = (price: number) => PAD.top + innerH - ((price - yMin) / (yMax - yMin)) * innerH;

  // Y ekseni grid çizgileri — 5 seviye
  const yTicks = Array.from({ length: 5 }, (_, i) => yMin + ((yMax - yMin) / 4) * i);

  // X ekseni grid çizgileri — 4 seviye (tarih)
  const xTicks = Array.from({ length: 5 }, (_, i) => xMin + (xRange / 4) * i);

  // Hover state
  const [hover, setHover] = useState<Hareket | null>(null);

  if (hareketler.length === 0) return null;

  return (
    <div style={{ position: 'relative' }}>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        style={{ width: '100%', height: 'auto', display: 'block' }}
        onMouseLeave={() => setHover(null)}
      >
        {/* Y grid + label */}
        {yTicks.map((t, i) => (
          <g key={`y-${i}`}>
            <line
              x1={PAD.left} y1={y(t)} x2={W - PAD.right} y2={y(t)}
              stroke={C.borderSubtle} strokeWidth={0.6} strokeDasharray="3 3"
            />
            <text
              x={PAD.left - 8} y={y(t)}
              fontSize={10} textAnchor="end" dominantBaseline="middle"
              fill={C.textFaint}
            >
              {Math.round(t).toLocaleString('tr-TR')}
            </text>
          </g>
        ))}

        {/* X grid + label */}
        {xTicks.map((t, i) => (
          <g key={`x-${i}`}>
            <line
              x1={x(t)} y1={PAD.top} x2={x(t)} y2={H - PAD.bottom}
              stroke={C.borderSubtle} strokeWidth={0.6} strokeDasharray="3 3"
            />
            <text
              x={x(t)} y={H - PAD.bottom + 14}
              fontSize={10} textAnchor="middle"
              fill={C.textFaint}
            >
              {new Date(t).toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit', year: '2-digit' })}
            </text>
          </g>
        ))}

        {/* Eksenler */}
        <line x1={PAD.left} y1={H - PAD.bottom} x2={W - PAD.right} y2={H - PAD.bottom} stroke={C.border} strokeWidth={1} />
        <line x1={PAD.left} y1={PAD.top} x2={PAD.left} y2={H - PAD.bottom} stroke={C.border} strokeWidth={1} />

        {/* Seriler — her para birimi için çizgi + noktalar */}
        {seriler.map(([pb, items]) => {
          const sorted = [...items].sort((a, b) => (a.tarih || '').localeCompare(b.tarih || ''));
          const points = sorted
            .map((h) => {
              const ts = new Date(h.tarih).getTime();
              if (!Number.isFinite(ts)) return null;
              return { h, cx: x(ts), cy: y(h.birimFiyat) };
            })
            .filter((p): p is { h: Hareket; cx: number; cy: number } => p !== null);

          const pathD = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.cx} ${p.cy}`).join(' ');
          const col = renk[pb] || '#64748b';

          return (
            <g key={pb}>
              {/* Çizgi (sadece 2+ noktada anlamlı) */}
              {points.length >= 2 && (
                <path d={pathD} fill="none" stroke={col} strokeWidth={1.8} strokeLinejoin="round" />
              )}
              {/* Noktalar — interactive */}
              {points.map((p, i) => (
                <circle
                  key={`${pb}-${i}`}
                  cx={p.cx} cy={p.cy} r={hover === p.h ? 6 : 4}
                  fill={col}
                  stroke="#fff" strokeWidth={1.5}
                  style={{ cursor: 'pointer', transition: 'r 120ms ease' }}
                  onMouseEnter={() => setHover(p.h)}
                />
              ))}
            </g>
          );
        })}
      </svg>

      {/* Legend */}
      <div style={{ display: 'flex', gap: 14, marginTop: 8, justifyContent: 'center', fontSize: 11, color: C.textSecondary }}>
        {seriler.map(([pb, items]) => (
          <div key={pb} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ width: 10, height: 10, background: renk[pb], borderRadius: 2 }} />
            <span><b>{pb}</b> · {items.length} kayıt</span>
          </div>
        ))}
      </div>

      {/* Tooltip — sabit konum, sağ üst */}
      {hover && (
        <div style={{
          position: 'absolute',
          top: 8, right: 28,
          background: 'rgba(15,23,42,0.92)',
          color: '#fff',
          padding: '8px 12px',
          borderRadius: 6,
          fontSize: 11,
          lineHeight: 1.4,
          pointerEvents: 'none',
          boxShadow: '0 4px 12px rgba(0,0,0,0.18)',
          minWidth: 200,
        }}>
          <div style={{ fontWeight: 700, marginBottom: 4 }}>{formatCariAdi(hover.cariAdi)}</div>
          <div>{formatDate(hover.tarih)}</div>
          <div>
            <b>{formatCurrency(hover.birimFiyat, hover.paraBirimi)}</b>
            <span style={{ color: '#cbd5e1' }}> × {hover.miktar} {hover.birim}</span>
          </div>
          <div style={{ marginTop: 4, fontSize: 10, color: '#94a3b8' }}>
            Teklif: {hover.teklifNo} · {DURUM_ETIKET[hover.durum]}
          </div>
        </div>
      )}
    </div>
  );
}
