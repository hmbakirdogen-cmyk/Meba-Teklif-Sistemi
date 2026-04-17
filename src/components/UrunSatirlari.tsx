import { useEffect, useMemo, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import { App, Button, Input, Select, Table, Tooltip } from 'antd';
import { DeleteOutlined, PlusOutlined } from '@ant-design/icons';
import type { TeklifSatiri, Urun } from '../types';
import { hesaplamaMotoru } from '../services/hesaplamaMotoru';
import { urunService } from '../services/urunService';
import { referansVeriService, VARSAYILAN_MARKA } from '../services/referansVeriService';
import {
  cleanProductDescription,
  stripParantez,
  parseLocaleNumber,
  formatDisplayNumber,
  formatEditableNumber,
} from '../utils/formatters';
import { buttonClassNames } from '../styles/buttonStyles';
import { useColors } from '../hooks/useColors';
import { useIsMobile } from '../hooks/useIsMobile';

/** Metni tek satıra düşürür: \n, \r\n, <br>, <br/> ve benzeri tüm ayırıcıları keser. */
function tekSatir(text: string): string {
  if (!text) return '';
  return text
    .replace(/<br\s*\/?>/gi, '\n')  // HTML satır sonları → \n
    .split(/\r?\n/)[0]              // ilk satırı al
    ?.trim() ?? '';
}

// ── NumericInput ──────────────────────────────────────────────────────────────
interface NumericInputProps {
  value: number;
  onChange: (val: number) => void;
  precision?: number;
  displayMinDec?: number;
  min?: number;
  max?: number;
  placeholder?: string;
  textAlign?: 'left' | 'right' | 'center';
  style?: CSSProperties;
  onEnter?: () => void;
  registerRef?: (el: HTMLInputElement | null) => void;
}

function NumericInput({
  value,
  onChange,
  precision = 2,
  displayMinDec = 0,
  min = 0,
  max,
  placeholder = '0',
  textAlign = 'right',
  style,
  onEnter,
  registerRef,
}: NumericInputProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState('');
  const ref = useRef<HTMLInputElement>(null);

  const shown = editing
    ? draft
    : value !== 0
    ? formatDisplayNumber(value, displayMinDec, precision)
    : '';

  return (
    <input
      ref={(el) => {
        (ref as { current: HTMLInputElement | null }).current = el;
        registerRef?.(el);
      }}
      type="text"
      inputMode="decimal"
      value={shown}
      placeholder={placeholder}
      onChange={(e) => {
        setDraft(e.target.value.replace(/[^\d,.-]/g, ''));
      }}
      onKeyDown={(e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          ref.current?.blur();
          requestAnimationFrame(() => onEnter?.());
        }
      }}
      onFocus={(e) => {
        e.currentTarget.style.borderColor = 'var(--input-focus, #2563eb)';
        e.currentTarget.style.boxShadow = '0 0 0 3px rgba(37,99,235,0.10)';
        const start = value !== 0 ? formatEditableNumber(value, precision) : '';
        setDraft(start);
        setEditing(true);
        requestAnimationFrame(() => ref.current?.select());
      }}
      onBlur={(e) => {
        e.currentTarget.style.borderColor = 'var(--input-border)';
        e.currentTarget.style.boxShadow = 'none';
        setEditing(false);
        const raw = draft.trim();
        let n = raw === '' ? 0 : parseLocaleNumber(raw);
        if (isNaN(n)) n = 0;
        n = Math.max(min, n);
        if (max !== undefined) n = Math.min(max, n);
        const factor = 10 ** precision;
        n = Math.round(n * factor) / factor;
        setDraft('');
        onChange(n);
      }}
      onMouseEnter={(e) => {
        if (document.activeElement !== e.currentTarget)
          e.currentTarget.style.borderColor = '#3b82f6';
      }}
      onMouseLeave={(e) => {
        if (document.activeElement !== e.currentTarget)
          e.currentTarget.style.borderColor = 'var(--input-border)';
      }}
      style={{
        width: '100%',
        height: 30,
        lineHeight: '28px',
        fontSize: 12,
        padding: '0 9px',
        textAlign,
        border: '1px solid var(--input-border)',
        borderRadius: 8,
        outline: 'none',
        boxSizing: 'border-box',
        background: 'var(--bg-elevated)',
        color: 'var(--text-primary)',
        fontFamily: 'inherit',
        fontVariantNumeric: 'tabular-nums',
        transition: 'border-color 0.15s, box-shadow 0.15s',
        ...style,
      }}
    />
  );
}
// ── End NumericInput ──────────────────────────────────────────────────────────


const SEMBOL: Record<string, string> = { TRY: '₺', EUR: '€', USD: '$', GBP: '£', CHF: '₣' };

// ── Tablo başlık yardımcıları ─────────────────────────────────────────────────
const th = (label: string, align: 'left' | 'right' | 'center' = 'left') => (
  <span style={{
    display: 'block',
    textAlign: align,
    color: 'inherit',
    fontWeight: 600,
    fontSize: 11,
    letterSpacing: 0.2,
    whiteSpace: 'nowrap',
    overflow: 'hidden',
  }}>
    {label}
  </span>
);

interface UrunSatirlariProps {
  satirlar: TeklifSatiri[];
  paraBirimi: string;
  satirBazliParaBirimi: boolean;
  onSatirBazliParaBirimiChange: (aktif: boolean) => void;
  onChange: (satirlar: TeklifSatiri[]) => void;
}

export default function UrunSatirlari({
  satirlar,
  paraBirimi,
  satirBazliParaBirimi,
  onSatirBazliParaBirimiChange,
  onChange,
}: UrunSatirlariProps) {
  const { message } = App.useApp();
  const C = useColors();
  const isMobile = useIsMobile(900);
  const sembol = SEMBOL[paraBirimi] ?? paraBirimi;
  const PARA_BIRIMI_ETIKETI: Record<string, string> = { TRY: 'TL', EUR: 'EUR', USD: 'USD' };
  const [urunler, setUrunler] = useState<Urun[]>(() => urunService.tumUrunleriGetir());
  const [urunKodArama, setUrunKodArama] = useState<{ satirId: string; deger: string } | null>(null);
  const [markalar] = useState<string[]>(() => referansVeriService.markalar.tumunuGetir());
  const [birimler] = useState<string[]>(() => referansVeriService.birimler.tumunuGetir());
  const [teslimSecenekleri] = useState<string[]>(() => referansVeriService.teslimSecenekleri.tumunuGetir());
  const [bireyselIskontoAktif, setBireyselIskontoAktif] = useState(
    () => satirlar.some((s) => s.indirimOrani > 0),
  );

  // ── Enter navigasyon ref'leri ──────────────────────────────────
  type SatirField = 'miktar' | 'birimFiyat' | 'teslimTarihi';
  const inputRefs = useRef<Map<string, HTMLInputElement>>(new Map());
  const selectRefs = useRef<Map<string, { focus: () => void }>>(new Map());
  const pendingFocusId = useRef<string | null>(null);

  useEffect(() => {
    if (pendingFocusId.current) {
      const id = pendingFocusId.current;
      pendingFocusId.current = null;
      requestAnimationFrame(() => selectRefs.current.get(id)?.focus());
    }
  }, [satirlar]);

  const kategoriler = useMemo(() => {
    const map = new Map<string, Urun[]>();
    urunler.forEach((u) => {
      const kat = u.kategori || 'Diğer';
      if (!map.has(kat)) map.set(kat, []);
      map.get(kat)!.push(u);
    });
    return map;
  }, [urunler]);

  function yeniSatirOlustur(): TeklifSatiri {
    return {
      id: hesaplamaMotoru.satirIdUret(),
      marka: VARSAYILAN_MARKA,   // sabit liste varsayılanı (SMC)
      urunKod: '',
      urunAdi: '',
      aciklama: '',
      paraBirimi: hesaplamaMotoru.varsayilanSatirParaBirimi(paraBirimi),
      miktar: 1,
      birim: birimler[0] ?? 'Adet',
      birimFiyat: 0,
      indirimOrani: 0,
      teslimTarihi: '2-3 Gün',
      satirToplami: 0,
    };
  }

  function satirEkle() {
    onChange([...satirlar, yeniSatirOlustur()]);
  }

  function yeniUrunKodKaydet(satirId: string, kod: string) {
    const temiz = kod.trim();
    if (!temiz) return;
    const mevcut = urunler.find((u) => u.urunKod.toLowerCase() === temiz.toLowerCase());
    if (mevcut) {
      urunSec(satirId, mevcut.urunKod);
      setUrunKodArama(null);
      return;
    }
    const yeniUrun: Urun = {
      id: urunService.urunIdUret(),
      urunKod: temiz,
      urunAdi: '',
      aciklama: '',
      kategori: 'Diğer',
      birim: birimler[0] ?? 'Adet',
      varsayilanFiyat: 0,
    };
    urunService.urunKaydet(yeniUrun);
    setUrunler((prev) => [...prev, yeniUrun]);
    setUrunKodArama(null);
    // Satırı güncelle: sadece urunKod setle, urunAdi/aciklama boş kalır
    onChange(
      satirlar.map((s) => {
        if (s.id !== satirId) return s;
        const g = { ...s, urunKod: temiz, urunAdi: '', aciklama: '' };
        return { ...g, satirToplami: hesaplamaMotoru.satirToplamHesapla(g) };
      }),
    );
    message.success(`"${temiz}" ürün listesine eklendi.`, 2);
  }

  function satirSil(id: string) {
    onChange(satirlar.filter((s) => s.id !== id));
  }

  function urunSec(satirId: string, urunKod: string) {
    const urun = urunler.find((u) => u.urunKod === urunKod);
    // Ürün değişince yerel taslak ve manuel kayıt temizlenir
    onChange(
      satirlar.map((s) => {
        if (s.id !== satirId) return s;
        const g: TeklifSatiri = {
          ...s,
          urunKod,
          marka: urun?.marka || s.marka || VARSAYILAN_MARKA,
          urunAdi: urun ? cleanProductDescription(urun.urunAdi) : '',
          aciklama: urun ? tekSatir(cleanProductDescription(urun.aciklama)) : '',
          manuelAltAciklama: undefined,
          birim: urun?.birim ?? s.birim,
          birimFiyat: urun?.varsayilanFiyat ?? s.birimFiyat,
        };
        return { ...g, satirToplami: hesaplamaMotoru.satirToplamHesapla(g) };
      }),
    );
  }

  function guncelle(id: string, alan: keyof TeklifSatiri, deger: unknown) {
    onChange(
      satirlar.map((s) => {
        if (s.id !== id) return s;
        const g = { ...s, [alan]: deger };
        return { ...g, satirToplami: hesaplamaMotoru.satirToplamHesapla(g) };
      }),
    );
  }

  function handleEnter(satirId: string, field: SatirField) {
    const fields: SatirField[] = ['miktar', 'birimFiyat', 'teslimTarihi'];
    const idx = fields.indexOf(field);
    if (idx < fields.length - 1) {
      requestAnimationFrame(() =>
        inputRefs.current.get(`${satirId}:${fields[idx + 1]}`)?.focus()
      );
    } else {
      const rowIdx = satirlar.findIndex((s) => s.id === satirId);
      if (rowIdx < satirlar.length - 1) {
        requestAnimationFrame(() =>
          selectRefs.current.get(satirlar[rowIdx + 1].id)?.focus()
        );
      } else {
        const ns = yeniSatirOlustur();
        pendingFocusId.current = ns.id;
        onChange([...satirlar, ns]);
      }
    }
  }

  const ortakSelectStili: CSSProperties = {
    width: '100%',
    minHeight: 30,
  };

  const columns = [
    // ── No ───────────────────────────────────────────────────────
    {
      title: th('No', 'center'),
      key: 'no',
      width: 36,
      align: 'center' as const,
      render: (_: unknown, __: TeklifSatiri, i: number) => (
        <span style={{
          fontSize: 11,
          color: C.textFaint,
          fontVariantNumeric: 'tabular-nums',
          fontWeight: 500,
        }}>
          {String(i + 1).padStart(2, '0')}
        </span>
      ),
    },
    // ── Marka — dropdown seçim, Birimler ile aynı mantık ────────
    {
      title: th('Marka'),
      key: 'marka',
      width: 84,
      render: (_: unknown, satir: TeklifSatiri) => (
        <Select
          size="small"
          value={satir.marka || VARSAYILAN_MARKA}
          onChange={(v: string) => guncelle(satir.id, 'marka', v)}
          options={markalar.map((m) => ({ value: m, label: m }))}
          style={ortakSelectStili}
          popupMatchSelectWidth={false}
        />
      ),
    },
    // ── Ürün Kodu — genişletildi, bilinmeyen kod → inline kaydet butonu ──
    {
      title: th('Ürün Kodu'),
      key: 'urunKod',
      width: 172,
      render: (_: unknown, satir: TeklifSatiri) => {
        const aramaVal = urunKodArama?.satirId === satir.id ? urunKodArama.deger.trim() : '';
        const kaydetGoster =
          aramaVal !== '' &&
          !urunler.some((u) => u.urunKod.toLowerCase() === aramaVal.toLowerCase());

        return (
          <Select
            ref={(el) => {
              if (el) selectRefs.current.set(satir.id, el as unknown as { focus: () => void });
              else selectRefs.current.delete(satir.id);
            }}
            showSearch
            size="small"
            style={ortakSelectStili}
            value={satir.urunKod || undefined}
            placeholder="Kod seçin..."
            optionLabelProp="label"
            onChange={(v: string) => {
              setUrunKodArama(null);
              urunSec(satir.id, v);
            }}
            onSearch={(val) => setUrunKodArama({ satirId: satir.id, deger: val })}
            filterOption={(input, option) => {
              const optVal = (option as { value?: string } | null)?.value;
              const u = urunler.find((x) => x.urunKod === optVal);
              if (!u) return false;
              const q = input.toLowerCase();
              return (
                u.urunKod.toLowerCase().includes(q) ||
                u.urunAdi.toLowerCase().includes(q) ||
                (u.kategori || '').toLowerCase().includes(q)
              );
            }}
            popupMatchSelectWidth={false}
            popupStyle={{ minWidth: 340 }}
            popupRender={(menu) => (
              <>
                {menu}
                {kaydetGoster && (
                  <div style={{ padding: '5px 8px', borderTop: '1px solid #f0f0f0' }}>
                    <Button
                      size="small"
                      type="dashed"
                      icon={<PlusOutlined />}
                      block
                      className={buttonClassNames.secondarySmall}
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => yeniUrunKodKaydet(satir.id, aramaVal)}
                      style={{ color: '#0f1f45', borderColor: '#d1d9e6' }}
                    >
                      "{aramaVal}" — yeni ürün kodu olarak kaydet
                    </Button>
                  </div>
                )}
              </>
            )}
            labelRender={({ value }) => <span>{String(value ?? '')}</span>}
            options={Array.from(kategoriler.entries()).map(([kat, liste]) => ({
              label: (
                <span style={{
                  fontSize: 10,
                  fontWeight: 700,
                  color: '#0f1f45',
                  letterSpacing: 0.8,
                  textTransform: 'uppercase',
                }}>
                  {kat}
                </span>
              ),
              options: liste.map((u) => ({
                value: u.urunKod,
                label: (
                  <>
                    <span style={{ fontWeight: 600, color: '#0f1f45', fontSize: 12 }}>{u.urunKod}</span>
                    <span style={{ color: '#6b7280', marginLeft: 8, fontSize: 11 }}>
                      {(() => { const s = stripParantez(u.urunAdi); return s.length > 32 ? s.slice(0, 32) + '…' : s; })()}
                    </span>
                  </>
                ),
              })),
            }))}
          />
        );
      },
    },
    // ── Açıklama — tek satır, doğrudan satir.aciklama'ya yazar ──
    {
      title: th('Açıklama'),
      key: 'aciklama',
      render: (_: unknown, satir: TeklifSatiri) => (
        <Input
          size="small"
          value={tekSatir(satir.aciklama ?? '')}
          placeholder="Açıklama ekle…"
          onChange={(e) =>
            guncelle(satir.id, 'aciklama', tekSatir(e.target.value))
          }
          style={{
            fontSize: 11,
            height: 30,
            paddingInline: 10,
            color: C.textSecondary,
            borderColor: C.border,
            background: C.bgSurface,
            borderRadius: 8,
            transition: 'border-color 0.15s, box-shadow 0.15s',
          }}
        />
      ),
    },
    // ── Miktar / Birim ───────────────────────────────────────────
    {
      title: th('Miktar / Birim', 'center'),
      key: 'miktar',
      width: 134,
      render: (_: unknown, satir: TeklifSatiri) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <NumericInput
            value={satir.miktar}
            onChange={(v) => guncelle(satir.id, 'miktar', v)}
            precision={4}
            displayMinDec={0}
            min={0}
            placeholder="0"
            textAlign="center"
            style={{ width: 56, flexShrink: 0 }}
            onEnter={() => handleEnter(satir.id, 'miktar')}
            registerRef={(el) => {
              if (el) inputRefs.current.set(`${satir.id}:miktar`, el);
              else inputRefs.current.delete(`${satir.id}:miktar`);
            }}
          />
          <Select
            size="small"
            value={satir.birim || birimler[0] || 'Adet'}
            onChange={(v: string) => guncelle(satir.id, 'birim', v)}
            options={birimler.map((b) => ({ value: b, label: b }))}
            style={{ ...ortakSelectStili, flex: 1, minWidth: 0 }}
            popupMatchSelectWidth={false}
          />
        </div>
      ),
    },
    // ── Birim Fiyat ──────────────────────────────────────────────
    ...(satirBazliParaBirimi ? [{
      title: th('Para Birimi', 'center'),
      key: 'paraBirimi',
      width: 110,
      align: 'center' as const,
      render: (_: unknown, satir: TeklifSatiri) => (
        <Select
          size="small"
          value={hesaplamaMotoru.satirParaBirimiGetir(satir, paraBirimi)}
          onChange={(v: 'TRY' | 'EUR' | 'USD') => guncelle(satir.id, 'paraBirimi', v)}
          options={hesaplamaMotoru.SATIR_PARA_BIRIMLERI.map((pb) => ({
            value: pb,
            label: PARA_BIRIMI_ETIKETI[pb],
          }))}
          style={ortakSelectStili}
          popupMatchSelectWidth={false}
        />
      ),
    }] : []),
    {
      title: th(satirBazliParaBirimi ? 'Birim Fiyat' : `Birim Fiyat (${sembol})`, 'right'),
      key: 'birimFiyat',
      width: 104,
      align: 'right' as const,
      render: (_: unknown, satir: TeklifSatiri) => {
        const satirPb = hesaplamaMotoru.satirParaBirimiGetir(satir, paraBirimi);
        return (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 6 }}>
            <NumericInput
              value={satir.birimFiyat}
              onChange={(v) => guncelle(satir.id, 'birimFiyat', v)}
              precision={2}
              displayMinDec={2}
              min={0}
              placeholder="0,00"
              textAlign="right"
              onEnter={() => handleEnter(satir.id, 'birimFiyat')}
              registerRef={(el) => {
                if (el) inputRefs.current.set(`${satir.id}:birimFiyat`, el);
                else inputRefs.current.delete(`${satir.id}:birimFiyat`);
              }}
            />
            {satirBazliParaBirimi && (
              <span style={{ minWidth: 24, fontSize: 10.5, fontWeight: 700, color: C.textFaint, textAlign: 'right' }}>
                {PARA_BIRIMI_ETIKETI[satirPb]}
              </span>
            )}
          </div>
        );
      },
    },
    // ── Bireysel İskonto % — yalnızca iç kullanım, müşteriye gösterilmez ──
    ...(bireyselIskontoAktif ? [{
      title: (
        <Tooltip title="Müşteriye gösterilmez — sadece iç hesaplama" placement="top">
          <span style={{
            display: 'block',
            textAlign: 'center' as const,
            fontSize: 10,
            fontWeight: 600,
            letterSpacing: 0.2,
            color: '#92400e',
            borderRadius: 3,
            cursor: 'default',
          }}>
            İsk. %
            <span style={{
              display: 'block',
              fontSize: 8.5,
              fontWeight: 500,
              color: '#b45309',
              letterSpacing: 0.1,
              marginTop: 1,
            }}>
              iç kullanım
            </span>
          </span>
        </Tooltip>
      ),
      key: 'indirimOrani',
      width: 72,
      align: 'center' as const,
      onHeaderCell: () => ({
        style: {
          background: '#fffbeb',
          borderLeft: '1px dashed #f59e0b',
          borderRight: '1px dashed #f59e0b',
        },
      }),
      onCell: () => ({
        style: {
          background: '#fffdf5',
          borderLeft: '1px dashed #fde68a',
          borderRight: '1px dashed #fde68a',
        },
      }),
      render: (_: unknown, satir: TeklifSatiri) => (
        <NumericInput
          value={satir.indirimOrani}
          onChange={(v) => guncelle(satir.id, 'indirimOrani', v)}
          precision={2}
          displayMinDec={0}
          min={0}
          max={100}
          placeholder="—"
          textAlign="center"
          style={{
            background: 'transparent',
            borderColor: satir.indirimOrani > 0 ? '#f59e0b' : '#fde68a',
            color: satir.indirimOrani > 0 ? '#92400e' : '#b45309',
          }}
        />
      ),
    }] : []),
    // ── Toplam ───────────────────────────────────────────────────
    {
      title: th(satirBazliParaBirimi ? 'Toplam' : `Toplam (${sembol})`, 'right'),
      key: 'satirToplami',
      width: 104,
      align: 'right' as const,
      render: (_: unknown, satir: TeklifSatiri) => {
        const satirPb = hesaplamaMotoru.satirParaBirimiGetir(satir, paraBirimi);
        return (
          <span style={{
            fontWeight: 600,
            fontSize: 12,
            display: 'block',
            textAlign: 'right',
            color: C.textPrimary,
            fontVariantNumeric: 'tabular-nums',
            letterSpacing: 0.1,
            whiteSpace: 'nowrap',
          }}>
            {satir.satirToplami.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
            {satirBazliParaBirimi && ` ${PARA_BIRIMI_ETIKETI[satirPb]}`}
          </span>
        );
      },
    },
    // ── Teslim Tarihi ────────────────────────────────────────────
    {
      title: th('Teslim', 'center'),
      key: 'teslimTarihi',
      width: 98,
      align: 'center' as const,
      render: (_: unknown, satir: TeklifSatiri) => (
        <Select
          size="small"
          value={satir.teslimTarihi || teslimSecenekleri[0] || '2-3 Gün'}
          onChange={(v: string) => guncelle(satir.id, 'teslimTarihi', v)}
          options={teslimSecenekleri.map((t) => ({ value: t, label: t }))}
          style={ortakSelectStili}
          popupMatchSelectWidth={false}
        />
      ),
    },
    // ── Sil ──────────────────────────────────────────────────────
    {
      title: '',
      key: 'sil',
      width: 36,
      render: (_: unknown, satir: TeklifSatiri) => (
        <Tooltip title="Satırı sil">
          <Button
            type="text"
            danger
            size="small"
            icon={<DeleteOutlined />}
            className={buttonClassNames.smallActionDanger}
            onClick={() => satirSil(satir.id)}
            style={{ opacity: 0.6 }}
          />
        </Tooltip>
      ),
    },
  ];

  const herhangiIndirimVar = satirlar.some((s) => s.indirimOrani > 0);
  const satirParaBirimiAciklama = satirBazliParaBirimi
    ? 'Her satır için farklı para birimi seçebilirsiniz'
    : '';
  const tabloYuzeyiStili: CSSProperties = {
    border: `1px solid ${C.totalsBorder}`,
    borderRadius: 16,
    background: `linear-gradient(180deg, ${C.bgSurface} 0%, ${C.bgElevated} 100%)`,
    boxShadow: C.shadowCard,
    overflow: 'hidden',
  };
  const ortakKontrolButonStili: CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    height: 30,
    minHeight: 30,
    padding: '0 12px',
    fontSize: 11,
    fontWeight: 600,
    borderRadius: 7,
    letterSpacing: 0.2,
    transition: 'border-color 0.15s, background 0.15s, color 0.15s, box-shadow 0.15s',
    fontFamily: 'inherit',
    whiteSpace: 'nowrap',
  };

  return (
    <div className="urun-tablo" style={{ width: '100%' }}>

      {/* ── Üst aksiyon çubuğu ──────────────────────────────── */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'flex-end',
          marginBottom: 14,
          flexWrap: 'wrap',
          gap: 12,
          alignItems: isMobile ? 'stretch' : 'flex-start',
        }}
      >
        <Tooltip
          title="Satır bazlı iç fiyat hesaplama aracı — iskonto müşteriye gösterilmez, PDF'e yansımaz"
          placement="topRight"
        >
        <button
          type="button"
          onClick={() => setBireyselIskontoAktif((v) => !v)}
          style={{
            ...ortakKontrolButonStili,
            minWidth: isMobile ? '100%' : 172,
            border: bireyselIskontoAktif
              ? '1px dashed #f59e0b'
              : herhangiIndirimVar
              ? '1px dashed #f59e0b'
              : `1px solid ${C.borderInput}`,
            background: bireyselIskontoAktif ? '#fffbeb' : C.bgSurface,
            color: bireyselIskontoAktif
              ? '#92400e'
              : herhangiIndirimVar
              ? '#b45309'
              : C.textSecondary,
            cursor: 'pointer',
            boxShadow: bireyselIskontoAktif ? '0 4px 12px rgba(245,158,11,0.12)' : '0 1px 2px rgba(15,31,69,0.04)',
          }}
        >
          <span style={{ fontSize: 12, fontWeight: 700 }}>%</span>
          İç İskonto Hesabı
          {!bireyselIskontoAktif && herhangiIndirimVar && (
            <span style={{
              display: 'inline-block',
              width: 6,
              height: 6,
              borderRadius: '50%',
              background: '#f59e0b',
              marginLeft: 2,
            }} />
          )}
        </button>
        </Tooltip>
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 5,
            minWidth: 0,
            flex: isMobile ? '1 1 100%' : '0 1 320px',
          }}
        >
          <button
            type="button"
            onClick={() => onSatirBazliParaBirimiChange(!satirBazliParaBirimi)}
            aria-pressed={satirBazliParaBirimi}
            style={{
              ...ortakKontrolButonStili,
              justifyContent: 'flex-start',
              border: satirBazliParaBirimi ? '1px solid #1e3668' : `1px solid ${C.borderInput}`,
              background: satirBazliParaBirimi
                ? 'linear-gradient(135deg, rgba(15,31,69,0.08) 0%, rgba(30,54,104,0.12) 100%)'
                : C.bgSurface,
              color: satirBazliParaBirimi ? '#0f1f45' : C.textSecondary,
              cursor: 'pointer',
              boxShadow: satirBazliParaBirimi ? '0 6px 14px rgba(15,31,69,0.10)' : '0 1px 2px rgba(15,31,69,0.04)',
              width: '100%',
              maxWidth: '100%',
            }}
          >
            <span
              style={{
                width: 30,
                height: 16,
                borderRadius: 999,
                background: satirBazliParaBirimi ? '#1e3668' : '#cfd7e3',
                position: 'relative',
                flexShrink: 0,
              }}
            >
              <span
                style={{
                  position: 'absolute',
                  top: 2,
                  left: satirBazliParaBirimi ? 16 : 2,
                  width: 12,
                  height: 12,
                  borderRadius: '50%',
                  background: '#fff',
                  boxShadow: '0 1px 3px rgba(15,23,42,0.18)',
                  transition: 'left 0.18s ease',
                }}
              />
            </span>
            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>
              Satır Bazlı Para Birimi Kullan
            </span>
          </button>
          {satirBazliParaBirimi && (
            <div style={{ fontSize: 11, color: C.textFaint, lineHeight: 1.45, maxWidth: 320, wordBreak: 'break-word', paddingLeft: isMobile ? 2 : 4 }}>
              {satirParaBirimiAciklama}
            </div>
          )}
        </div>
      </div>

      <div style={tabloYuzeyiStili}>
        <Table
          dataSource={satirlar}
          columns={columns}
          rowKey="id"
          pagination={false}
          size="small"
          scroll={{ x: satirBazliParaBirimi ? (bireyselIskontoAktif ? 1150 : 1070) : (bireyselIskontoAktif ? 1020 : 960) }}
          style={{ marginBottom: 0 }}
          onRow={() => ({})}
        />
        <div
          style={{
            padding: isMobile ? '12px' : '14px 16px 16px',
            borderTop: `1px solid ${C.border}`,
            background: 'linear-gradient(180deg, rgba(15,31,69,0.02) 0%, rgba(15,31,69,0.04) 100%)',
          }}
        >
          <Button
            type="dashed"
            block
            icon={<PlusOutlined />}
            className={buttonClassNames.secondary}
            onClick={satirEkle}
            style={{
              borderColor: C.borderInput,
              color: C.textSecondary,
              height: 38,
              letterSpacing: 0.1,
              borderRadius: 10,
              background: C.bgSurface,
            }}
          >
            Kalem Ekle
          </Button>
        </div>
      </div>
    </div>
  );
}
