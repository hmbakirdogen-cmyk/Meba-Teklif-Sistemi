import { useEffect, useMemo, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import { Button, Input, Select, Table, Tooltip, message } from 'antd';
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

const { Option, OptGroup } = Select;

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
        (ref as React.MutableRefObject<HTMLInputElement | null>).current = el;
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
        e.currentTarget.style.borderColor = '#2563eb';
        e.currentTarget.style.boxShadow = '0 0 0 3px rgba(37,99,235,0.10)';
        const start = value !== 0 ? formatEditableNumber(value, precision) : '';
        setDraft(start);
        setEditing(true);
        requestAnimationFrame(() => ref.current?.select());
      }}
      onBlur={(e) => {
        e.currentTarget.style.borderColor = '#d1d9e6';
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
          e.currentTarget.style.borderColor = '#d1d9e6';
      }}
      style={{
        width: '100%',
        height: 26,
        lineHeight: '24px',
        fontSize: 12,
        padding: '0 7px',
        textAlign,
        border: '1px solid #d1d9e6',
        borderRadius: 5,
        outline: 'none',
        boxSizing: 'border-box',
        background: '#ffffff',
        color: '#0f1f45',
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
  }}>
    {label}
  </span>
);

interface UrunSatirlariProps {
  satirlar: TeklifSatiri[];
  paraBirimi: string;
  onChange: (satirlar: TeklifSatiri[]) => void;
}

export default function UrunSatirlari({ satirlar, paraBirimi, onChange }: UrunSatirlariProps) {
  const sembol = SEMBOL[paraBirimi] ?? paraBirimi;
  const [urunler, setUrunler] = useState<Urun[]>(() => urunService.tumUrunleriGetir());
  const [urunKodArama, setUrunKodArama] = useState<{ satirId: string; deger: string } | null>(null);
  const [markalar] = useState<string[]>(() => referansVeriService.markalar.tumunuGetir());
  const [birimler] = useState<string[]>(() => referansVeriService.birimler.tumunuGetir());
  const [teslimSecenekleri] = useState<string[]>(() => referansVeriService.teslimSecenekleri.tumunuGetir());

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
          color: '#94a3b8',
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
          style={{ width: '100%' }}
          dropdownMatchSelectWidth={false}
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
            style={{ width: '100%' }}
            value={satir.urunKod || undefined}
            placeholder="Kod seçin..."
            optionLabelProp="label"
            onChange={(v: string) => {
              setUrunKodArama(null);
              urunSec(satir.id, v);
            }}
            onSearch={(val) => setUrunKodArama({ satirId: satir.id, deger: val })}
            filterOption={(input, option) => {
              const u = urunler.find((x) => x.urunKod === option?.value);
              if (!u) return false;
              const q = input.toLowerCase();
              return (
                u.urunKod.toLowerCase().includes(q) ||
                u.urunAdi.toLowerCase().includes(q) ||
                (u.kategori || '').toLowerCase().includes(q)
              );
            }}
            dropdownMatchSelectWidth={false}
            dropdownStyle={{ minWidth: 340 }}
            dropdownRender={(menu) => (
              <>
                {menu}
                {kaydetGoster && (
                  <div style={{ padding: '5px 8px', borderTop: '1px solid #f0f0f0' }}>
                    <Button
                      size="small"
                      type="dashed"
                      icon={<PlusOutlined />}
                      block
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => yeniUrunKodKaydet(satir.id, aramaVal)}
                      style={{ fontSize: 12, color: '#0f1f45', borderColor: '#d1d9e6' }}
                    >
                      "{aramaVal}" — yeni ürün kodu olarak kaydet
                    </Button>
                  </div>
                )}
              </>
            )}
          >
            {Array.from(kategoriler.entries()).map(([kat, liste]) => (
              <OptGroup
                key={kat}
                label={
                  <span style={{
                    fontSize: 10,
                    fontWeight: 700,
                    color: '#0f1f45',
                    letterSpacing: 0.8,
                    textTransform: 'uppercase',
                  }}>
                    {kat}
                  </span>
                }
              >
                {liste.map((u) => (
                  <Option key={u.id} value={u.urunKod} label={u.urunKod}>
                    <span style={{ fontWeight: 600, color: '#0f1f45', fontSize: 12 }}>{u.urunKod}</span>
                    <span style={{ color: '#6b7280', marginLeft: 8, fontSize: 11 }}>
                      {(() => { const s = stripParantez(u.urunAdi); return s.length > 32 ? s.slice(0, 32) + '…' : s; })()}
                    </span>
                  </Option>
                ))}
              </OptGroup>
            ))}
          </Select>
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
            height: 22,
            color: '#64748b',
            borderColor: '#e2e8f0',
            background: 'transparent',
            transition: 'border-color 0.15s',
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
            style={{ flex: 1, minWidth: 0 }}
            dropdownMatchSelectWidth={false}
          />
        </div>
      ),
    },
    // ── Birim Fiyat ──────────────────────────────────────────────
    {
      title: th(`Birim Fiyat (${sembol})`, 'right'),
      key: 'birimFiyat',
      width: 104,
      align: 'right' as const,
      render: (_: unknown, satir: TeklifSatiri) => (
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
      ),
    },
    // ── Toplam ───────────────────────────────────────────────────
    {
      title: th(`Toplam (${sembol})`, 'right'),
      key: 'satirToplami',
      width: 104,
      align: 'right' as const,
      render: (_: unknown, satir: TeklifSatiri) => (
        <span style={{
          fontWeight: 600,
          fontSize: 12,
          display: 'block',
          textAlign: 'right',
          color: '#0f1f45',
          fontVariantNumeric: 'tabular-nums',
          letterSpacing: 0.1,
        }}>
          {satir.satirToplami.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
        </span>
      ),
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
          style={{ width: '100%' }}
          dropdownMatchSelectWidth={false}
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
            onClick={() => satirSil(satir.id)}
            style={{ opacity: 0.6 }}
          />
        </Tooltip>
      ),
    },
  ];

  return (
    <div className="urun-tablo">
      <Table
        dataSource={satirlar}
        columns={columns}
        rowKey="id"
        pagination={false}
        size="small"
        scroll={{ x: 840 }}
        style={{ marginBottom: 10 }}
        onRow={(_, idx) => ({
          style: {
            background: (idx ?? 0) % 2 === 1 ? '#fafbff' : '#ffffff',
            transition: 'background 0.1s',
          },
        })}
      />
      <Button
        type="dashed"
        block
        icon={<PlusOutlined />}
        onClick={satirEkle}
        style={{
          borderRadius: 7,
          borderColor: '#d1d9e6',
          color: '#64748b',
          fontWeight: 500,
          height: 36,
          fontSize: 12,
          letterSpacing: 0.1,
        }}
      >
        Kalem Ekle
      </Button>
    </div>
  );
}
