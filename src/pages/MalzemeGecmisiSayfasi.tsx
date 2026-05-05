/**
 * MalzemeGecmisiSayfasi.tsx — Tüm personele açık malzeme geçmişi araması.
 *
 * Tüm tekliflerin satırları flatMap ile düzleştirilir, ürün kodu/açıklama/
 * ürün adı ve marka üzerinden arama yapılır. Sonuç tablosu, satır tıklayınca
 * ilgili teklife yönlendirir.
 *
 * Veri kaynağı: teklifService.tumTeklifleriGetir(aktifKullanici)
 *   - Visibility filter zaten içeride uygulanıyor (engineer/sales kendi +
 *     team teklifleri; yönetici hepsi).
 *
 * Performans: ~350 teklif × ~10 satır = ~3500 satır anlık arama, debounce
 * 300ms. Büyük datasets için useMemo ile cache + state input ayrı.
 */

import { useEffect, useMemo, useState, type CSSProperties } from 'react';
import { Input, Button, Spin } from 'antd';
import { SearchOutlined, DownloadOutlined } from '@ant-design/icons';
import * as XLSX from 'xlsx';
import { useNavigate } from 'react-router-dom';
import { teklifService } from '../services/teklifService';
import { useKullanici } from '../context/useKullanici';
import { useTheme } from '../context/useTheme';
import { useColors } from '../hooks/useColors';
import { useIsMobile } from '../hooks/useIsMobile';
import { formatDate, formatCariAdi, formatDisplayNumber } from '../utils/formatters';
import type { Teklif, TeklifSatiri, TeklifDurum } from '../types';

// ── Durum etiketleri (TeklifListesi ile birebir aynı) ──────────────────────
const DURUM_CFG: Record<TeklifDurum, { label: string; color: string; bg: string; border: string }> = {
  taslak:     { label: 'Taslak',     color: '#64748b', bg: '#f1f5f9', border: '#cbd5e1' },
  hazir:      { label: 'Hazır',      color: '#2563eb', bg: '#eff6ff', border: '#bfdbfe' },
  gonderildi: { label: 'Gönderildi', color: '#d97706', bg: '#fffbeb', border: '#fde68a' },
  onaylandi:  { label: 'Onaylandı',  color: '#059669', bg: '#ecfdf5', border: '#a7f3d0' },
  reddedildi: { label: 'Reddedildi', color: '#b91c1c', bg: '#fef2f2', border: '#fecaca' },
  iptal:      { label: 'İptal',      color: '#475569', bg: '#f1f5f9', border: '#cbd5e1' },
};

const DURUM_CFG_DARK: Record<TeklifDurum, { label: string; color: string; bg: string; border: string }> = {
  taslak:     { label: 'Taslak',     color: '#94a3b8', bg: 'rgba(148,163,184,0.10)', border: 'rgba(148,163,184,0.22)' },
  hazir:      { label: 'Hazır',      color: '#60a5fa', bg: 'rgba(96,165,250,0.10)',  border: 'rgba(96,165,250,0.22)'  },
  gonderildi: { label: 'Gönderildi', color: '#fbbf24', bg: 'rgba(251,191,36,0.10)',  border: 'rgba(251,191,36,0.22)'  },
  onaylandi:  { label: 'Onaylandı',  color: '#34d399', bg: 'rgba(52,211,153,0.10)',  border: 'rgba(52,211,153,0.22)'  },
  reddedildi: { label: 'Reddedildi', color: '#f87171', bg: 'rgba(248,113,113,0.10)', border: 'rgba(248,113,113,0.22)' },
  iptal:      { label: 'İptal',      color: '#94a3b8', bg: 'rgba(148,163,184,0.10)', border: 'rgba(148,163,184,0.22)' },
};

interface SatirSonuc {
  satir: TeklifSatiri;
  teklif: Teklif;
}

function norm(s: string): string {
  return s.toLocaleLowerCase('tr-TR').trim();
}

export default function MalzemeGecmisiSayfasi() {
  const navigate = useNavigate();
  const { aktifKullanici } = useKullanici();
  const { isDark } = useTheme();
  const C = useColors();
  const isMobile = useIsMobile(768);

  const [urunInput, setUrunInput] = useState('');
  const [markaInput, setMarkaInput] = useState('');
  const [urunQ, setUrunQ] = useState('');
  const [markaQ, setMarkaQ] = useState('');
  const [yukleniyor, setYukleniyor] = useState(false);
  const [hoverRowId, setHoverRowId] = useState<string | null>(null);

  // ── Debounce: 300ms ──
  useEffect(() => {
    const t = window.setTimeout(() => setUrunQ(urunInput), 300);
    return () => window.clearTimeout(t);
  }, [urunInput]);

  useEffect(() => {
    const t = window.setTimeout(() => setMarkaQ(markaInput), 300);
    return () => window.clearTimeout(t);
  }, [markaInput]);

  // ── Tüm satırları flatMap ile aç (cache: useMemo) ──
  const tumSatirlar = useMemo<SatirSonuc[]>(() => {
    if (!aktifKullanici) return [];
    setYukleniyor(true);
    const teklifler = teklifService.tumTeklifleriGetir({
      id: aktifKullanici.id,
      rol: aktifKullanici.rol,
    });
    const out: SatirSonuc[] = [];
    for (const t of teklifler) {
      if (!Array.isArray(t.satirlar)) continue;
      for (const s of t.satirlar) {
        out.push({ satir: s, teklif: t });
      }
    }
    setYukleniyor(false);
    return out;
  }, [aktifKullanici]);

  // ── Filter: aramadan boşsa boş sonuç döner (UI'a "ara" bilgisi koyar) ──
  const sonuclar = useMemo<SatirSonuc[]>(() => {
    const u = norm(urunQ);
    const m = norm(markaQ);
    if (!u && !m) return [];
    return tumSatirlar.filter(({ satir }) => {
      if (m) {
        const sm = norm(String(satir.marka || ''));
        if (!sm.includes(m)) return false;
      }
      if (u) {
        const kod = norm(String(satir.urunKod || ''));
        const ad = norm(String(satir.urunAdi || ''));
        const acik = norm(String(satir.aciklama || ''));
        if (!kod.includes(u) && !ad.includes(u) && !acik.includes(u)) return false;
      }
      return true;
    }).sort((a, b) => {
      // En yeniden eskiye (tarih → guncellemeTarihi tie-break)
      const ta = a.teklif.tarih || a.teklif.olusturmaTarihi || '';
      const tb = b.teklif.tarih || b.teklif.olusturmaTarihi || '';
      const cmp = tb.localeCompare(ta);
      if (cmp !== 0) return cmp;
      const ua = a.teklif.guncellemeTarihi || '';
      const ub = b.teklif.guncellemeTarihi || '';
      return ub.localeCompare(ua);
    });
  }, [tumSatirlar, urunQ, markaQ]);

  function onAraEnter() {
    setUrunQ(urunInput);
    setMarkaQ(markaInput);
  }

  // ── Excel export — mevcut filtrelenmiş sonuç listesini xlsx olarak indir ──
  function excelExport() {
    if (sonuclar.length === 0) return;

    const data = sonuclar.map(({ satir, teklif }) => ({
      'Tarih': teklif.tarih ? formatDate(teklif.tarih) : '',
      'Teklif No': teklif.teklifNo || '',
      'Cari Firma': formatCariAdi(teklif.cari?.firmaAdi || ''),
      'Ürün Kodu': satir.urunKod || '',
      'Marka': satir.marka || '',
      'Açıklama': satir.aciklama || satir.urunAdi || '',
      'Miktar': Number(satir.miktar || 0),
      'Birim': satir.birim || '',
      'Birim Fiyat': Number(satir.birimFiyat || 0),
      'Para Birimi': satir.paraBirimi || '',
      'Durum': DURUM_CFG[teklif.durum]?.label || teklif.durum || '',
      'Hazırlayan': teklif.hazirlayanAdSoyad || '',
    }));

    const ws = XLSX.utils.json_to_sheet(data);

    // Sütun genişlikleri (içerik uzunluğuna göre yaklaşık)
    const headers = Object.keys(data[0]);
    ws['!cols'] = headers.map((h) => {
      const maxLen = data.reduce((max, row) => {
        const v = row[h as keyof typeof row];
        const s = typeof v === 'number' ? v.toFixed(2) : String(v || '');
        return Math.max(max, s.length);
      }, h.length);
      return { wch: Math.min(60, Math.max(8, maxLen + 2)) };
    });

    // Header satırı bold
    const range = XLSX.utils.decode_range(ws['!ref'] || 'A1');
    for (let c = range.s.c; c <= range.e.c; c++) {
      const addr = XLSX.utils.encode_cell({ r: 0, c });
      const cell = ws[addr];
      if (cell) {
        cell.s = { font: { bold: true } };
      }
    }

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Malzeme Geçmişi');

    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    const fileName = `Malzeme_Gecmisi_${yyyy}-${mm}-${dd}.xlsx`;

    XLSX.writeFile(wb, fileName);
  }

  function durumBadge(durum: TeklifDurum) {
    const cfg = isDark ? DURUM_CFG_DARK[durum] : DURUM_CFG[durum];
    return (
      <span style={{
        display: 'inline-block',
        padding: '2px 8px',
        background: cfg.bg,
        color: cfg.color,
        border: `1px solid ${cfg.border}`,
        borderRadius: 4,
        fontSize: 11,
        fontWeight: 600,
        whiteSpace: 'nowrap',
      }}>
        {cfg.label}
      </span>
    );
  }

  const aramaYapildi = !!(urunQ.trim() || markaQ.trim());

  // ── Tablo stilleri ──
  const cellStyle: CSSProperties = {
    padding: '8px 10px',
    fontSize: 12,
    color: C.textPrimary,
    borderBottom: `1px solid ${C.borderSubtle}`,
    verticalAlign: 'middle',
  };
  const headerCellStyle: CSSProperties = {
    padding: '10px',
    fontSize: 11,
    fontWeight: 700,
    color: C.textSecondary,
    background: C.bgElevated,
    borderBottom: `2px solid ${C.borderSubtle}`,
    textAlign: 'left',
    letterSpacing: '0.02em',
    textTransform: 'uppercase',
    whiteSpace: 'nowrap',
    position: 'sticky',
    top: 0,
    zIndex: 1,
  };

  return (
    <div style={{ padding: isMobile ? '12px 10px' : '20px 32px', maxWidth: 1400, margin: '0 auto' }}>
      <div style={{ marginBottom: 18 }}>
        <h1 style={{
          fontSize: isMobile ? 22 : 26,
          fontWeight: 700,
          color: 'var(--text-primary, inherit)',
          letterSpacing: '-0.02em',
          marginBottom: 4,
        }}>
          Malzeme Geçmişi
        </h1>
        <div style={{ fontSize: 13, color: C.textFaint }}>
          Geçmiş tekliflerde ürün kodu, açıklama veya markaya göre arama.
        </div>
      </div>

      {/* Arama satırı */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr auto',
        gap: 10,
        marginBottom: 18,
      }}>
        <Input
          allowClear
          size="large"
          prefix={<SearchOutlined style={{ color: C.textFaint }} />}
          placeholder="Ürün kodu veya açıklama..."
          value={urunInput}
          onChange={(e) => setUrunInput(e.target.value)}
          onPressEnter={onAraEnter}
          style={{ borderRadius: 8 }}
        />
        <Input
          allowClear
          size="large"
          placeholder="Marka (örn. SMC, DANFOSS)"
          value={markaInput}
          onChange={(e) => setMarkaInput(e.target.value)}
          onPressEnter={onAraEnter}
          style={{ borderRadius: 8 }}
        />
        <Button type="primary" size="large" icon={<SearchOutlined />} onClick={onAraEnter} style={{ minWidth: isMobile ? '100%' : 110 }}>
          Ara
        </Button>
      </div>

      {/* Durum satırı + Excel export */}
      <div style={{
        marginBottom: 12,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 12,
        flexWrap: 'wrap',
      }}>
        <div style={{
          fontSize: 13,
          color: aramaYapildi ? C.textPrimary : C.textFaint,
          fontWeight: aramaYapildi ? 600 : 400,
        }}>
          {yukleniyor ? (
            <span><Spin size="small" /> &nbsp;Yükleniyor...</span>
          ) : !aramaYapildi ? (
            'Aramaya başlamak için ürün kodu, açıklama veya marka yazın.'
          ) : sonuclar.length === 0 ? (
            'Sonuç bulunamadı.'
          ) : (
            `${sonuclar.length.toLocaleString('tr-TR')} sonuç bulundu`
          )}
        </div>
        {sonuclar.length > 0 && (
          <Button icon={<DownloadOutlined />} onClick={excelExport}>
            Excel'e Aktar
          </Button>
        )}
      </div>

      {/* Sonuç tablosu */}
      {aramaYapildi && sonuclar.length > 0 && (
        <div style={{
          background: C.bgSurface,
          borderRadius: 8,
          border: `1px solid ${C.borderSubtle}`,
          overflow: 'auto',
          maxHeight: 'calc(100vh - 280px)',
        }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: isMobile ? 700 : 0 }}>
            <thead>
              <tr>
                <th style={headerCellStyle}>Tarih</th>
                <th style={headerCellStyle}>Teklif No</th>
                <th style={headerCellStyle}>Cari</th>
                <th style={headerCellStyle}>Ürün Kodu</th>
                <th style={headerCellStyle}>Marka</th>
                <th style={headerCellStyle}>Açıklama</th>
                <th style={{ ...headerCellStyle, textAlign: 'right' }}>Miktar</th>
                <th style={headerCellStyle}>Birim</th>
                <th style={{ ...headerCellStyle, textAlign: 'right' }}>Birim Fiyat</th>
                <th style={headerCellStyle}>Durum</th>
                <th style={headerCellStyle}>Hazırlayan</th>
              </tr>
            </thead>
            <tbody>
              {sonuclar.slice(0, 1000).map(({ satir, teklif }) => {
                const rowKey = `${teklif.id}__${satir.id}`;
                const hovered = hoverRowId === rowKey;
                return (
                  <tr
                    key={rowKey}
                    onClick={() => navigate('/teklif/' + teklif.id)}
                    onMouseEnter={() => setHoverRowId(rowKey)}
                    onMouseLeave={() => setHoverRowId(null)}
                    style={{
                      cursor: 'pointer',
                      background: hovered
                        ? (isDark ? 'rgba(255,255,255,0.04)' : 'rgba(15,30,60,0.04)')
                        : 'transparent',
                      transition: 'background 0.12s',
                    }}
                  >
                    <td style={{ ...cellStyle, fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap', color: C.textSecondary }}>
                      {formatDate(teklif.tarih)}
                    </td>
                    <td style={{ ...cellStyle, fontWeight: 600, fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}>
                      {teklif.teklifNo}
                    </td>
                    <td style={{ ...cellStyle, maxWidth: 240, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {formatCariAdi(teklif.cari?.firmaAdi || '')}
                    </td>
                    <td style={{ ...cellStyle, fontFamily: 'ui-monospace, "SF Mono", monospace', fontWeight: 600, whiteSpace: 'nowrap' }}>
                      {satir.urunKod || '—'}
                    </td>
                    <td style={{ ...cellStyle, color: C.textSecondary, whiteSpace: 'nowrap' }}>
                      {satir.marka || '—'}
                    </td>
                    <td style={{ ...cellStyle, maxWidth: 320, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {satir.aciklama || satir.urunAdi || '—'}
                    </td>
                    <td style={{ ...cellStyle, textAlign: 'right', fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}>
                      {Number(satir.miktar || 0).toLocaleString('tr-TR')}
                    </td>
                    <td style={{ ...cellStyle, color: C.textSecondary, whiteSpace: 'nowrap' }}>
                      {satir.birim || '—'}
                    </td>
                    <td style={{ ...cellStyle, textAlign: 'right', fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}>
                      {Number(satir.birimFiyat || 0) > 0
                        ? `${formatDisplayNumber(Number(satir.birimFiyat), 2, 2)} ${satir.paraBirimi || ''}`.trim()
                        : '—'}
                    </td>
                    <td style={cellStyle}>
                      {durumBadge(teklif.durum)}
                    </td>
                    <td style={{ ...cellStyle, color: C.textSecondary, whiteSpace: 'nowrap' }}>
                      {teklif.hazirlayanAdSoyad || '—'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {sonuclar.length > 1000 && (
            <div style={{ padding: 12, textAlign: 'center', fontSize: 12, color: C.textFaint, borderTop: `1px solid ${C.borderSubtle}` }}>
              İlk 1000 sonuç gösteriliyor. Aramayı daraltmak için marka veya kod ekleyin.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
