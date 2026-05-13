/**
 * InlineSatirEditor.tsx
 * Kalem satırı hücre-bazlı inline düzenleme bileşenleri.
 * Tüm satır tek seferde edit moduna geçmez; sadece aktif hücre editöre döner.
 */
import React, { useMemo, useRef, useState, useLayoutEffect, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { App, Input, Tooltip } from 'antd';
import type { InputRef } from 'antd';
import { DeleteOutlined, HistoryOutlined, PercentageOutlined } from '@ant-design/icons';
import type { TeklifSatiri, ParaBirimi, Urun, UrunSeti } from '../types';
import { hesaplamaMotoru } from '../services/hesaplamaMotoru';
import { useAkilliReferans } from '../hooks/useAkilliReferans';
import { urunService } from '../services/urunService';
import { urunSetService } from '../services/urunSetService';
import {
  InlineTableNumberField,
  InlineTableSelectField,
} from './InlineTableFields';
import { UNIT_OPTIONS, ROW_SHELL, ROW_TEXT } from './InlineTableRowShared';
import { parseLocaleNumber, formatAciklama } from '../utils/formatters';
import { DOCUMENT_COLORS } from '../templates/teklifDocumentShared';
import type { SatirCellField } from './inlineSatirEditorShared';
import { POPUP } from '../styles/popupTokens';

const C = DOCUMENT_COLORS;

const ACIKLAMA_EDIT: React.CSSProperties = {
  display: 'block',
  width: '100%',
  minWidth: 0,
  // Edit moduna girince yazı rengi/boyutu/satır yüksekliği değişmesin →
  // tipografi tüm hücreden inherit edilir; sadece layout özellikleri
  // (display/width/whiteSpace/resize/padding/margin) override edilir.
  fontFamily: 'inherit',
  fontSize: 'inherit',
  fontWeight: 'inherit',
  color: 'inherit',
  lineHeight: 'inherit',
  letterSpacing: 'inherit',
  whiteSpace: 'normal',
  overflowWrap: 'anywhere',
  resize: 'none',
  padding: 0,
  margin: 0,
};

interface CellEditorProps {
  satir: TeklifSatiri;
  paraBirimi: ParaBirimi;
  autoFocus?: boolean;
  onGuncelle: (alan: keyof TeklifSatiri, deger: unknown) => void;
  onSetUygula?: (setId: string) => void;
  onEnterNext?: () => void;
}

export function SatirCellEditor({
  field,
  ...props
}: CellEditorProps & { field: SatirCellField }) {
  switch (field) {
    case 'marka':      return <MarkaEditor {...props} />;
    case 'urunKod':    return <UrunKodEditor {...props} />;
    case 'aciklama':   return <AciklamaEditor {...props} />;
    case 'miktar':     return <MiktarEditor {...props} />;
    case 'paraBirimi': return <ParaBirimiEditor {...props} />;
    case 'birimFiyat': return <BirimFiyatEditor {...props} />;
    case 'teslimat':   return <TeslimatEditor {...props} />;
  }
}

function MarkaEditor({ satir, autoFocus, onGuncelle, onEnterNext }: CellEditorProps) {
  const markalar = useAkilliReferans('markalar');
  return (
    <div onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); e.stopPropagation(); onEnterNext?.(); } }}>
      <InlineTableSelectField
        autoFocus={autoFocus}
        defaultOpen={autoFocus}
        style={ROW_TEXT.brand}
        value={satir.marka || undefined}
        onChange={(value) => {
          onGuncelle('marka', value);
          onEnterNext?.();
        }}
        options={markalar.map((m) => ({ value: m, label: m }))}
        placeholder="—"
        popupMatchSelectWidth={false}
        dropdownStyle={{ minWidth: 180 }}
      />
    </div>
  );
}

// Modül-seviyesinde son kullanılan ürün id listesi — component remount'larından
// bağımsız, max 8 entry. Yeni seçim başa eklenir, varsa öne taşınır.
const sonKullanilanlar: string[] = [];

function pushSonKullanilan(id: string) {
  const idx = sonKullanilanlar.indexOf(id);
  if (idx !== -1) sonKullanilanlar.splice(idx, 1);
  sonKullanilanlar.unshift(id);
  if (sonKullanilanlar.length > 8) sonKullanilanlar.length = 8;
}

function UrunKodEditor({ satir, autoFocus, onGuncelle, onSetUygula, onEnterNext }: CellEditorProps) {
  const { modal, message } = App.useApp();
  // urunler state — yeni ürün eklendiğinde suggestion panelinde hemen gözüksün.
  const [urunler, setUrunler] = useState(() => urunService.tumUrunleriGetir());
  const setler = useMemo(() => urunSetService.tumSetleriGetir(), []);
  const inputRef = useRef<InputRef>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  // Mount anındaki kod — onaylanmamış değişikliği tespit için baseline
  const initialKodRef = useRef(satir.urunKod);
  // Suggestion'dan seçimle gelen değer DB'de zaten var → confirm sorma
  const justSelectedRef = useRef(false);
  const didInitialSelectRef = useRef(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [highlightIdx, setHighlightIdx] = useState(0);
  const [anchorRect, setAnchorRect] = useState<{
    left: number;
    top: number;
    width: number;
    height: number;
    bottom: number;
  } | null>(null);

  const filtered = useMemo(() => {
    const q = (satir.urunKod ?? '').trim().toLowerCase();
    const urunOnerileri = (q
      ? urunler.filter((u) =>
          u.urunKod.toLowerCase().includes(q) ||
          (u.aciklama ?? '').toLowerCase().includes(q),
        )
      : urunler)
      .slice(0, 40)
      .map((u) => ({
        type: 'urun' as const,
        id: u.id,
        kod: u.urunKod,
        aciklama: u.aciklama,
        payload: u,
        recent: false,
      }))
      .sort((a, b) => a.kod.localeCompare(b.kod, 'tr'));

    const setOnerileri = (q
      ? setler.filter((s) =>
          s.setKod.toLowerCase().includes(q) ||
          (s.aciklama ?? '').toLowerCase().includes(q),
        )
      : setler)
      .slice(0, 20)
      .map((s) => ({
        type: 'set' as const,
        id: s.id,
        kod: s.setKod,
        aciklama: s.aciklama,
        payload: s,
        recent: false,
      }))
      .sort((a, b) => a.kod.localeCompare(b.kod, 'tr'));

    // Arama boşsa: son kullanılanları başa al, ardından geri kalan ürünler
    // (alfabetik). Set'ler ürünlerin altında kalır (mevcut sıralama korunur).
    if (!q && sonKullanilanlar.length > 0) {
      const recentItems: typeof urunOnerileri = [];
      const recentIds = new Set<string>();
      for (const id of sonKullanilanlar) {
        const item = urunOnerileri.find((u) => u.id === id);
        if (item) {
          recentItems.push({ ...item, recent: true });
          recentIds.add(id);
        }
      }
      const restUrun = urunOnerileri.filter((u) => !recentIds.has(u.id));
      return [...recentItems, ...restUrun, ...setOnerileri].slice(0, 50);
    }

    return [...setOnerileri, ...urunOnerileri].slice(0, 50);
  }, [setler, urunler, satir.urunKod]);

  // Suggestion paneli pozisyonu — input altinda, viewport icinde
  useLayoutEffect(() => {
    const updateAnchorRect = () => {
      const el = containerRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      setAnchorRect({
        left: rect.left,
        top: rect.top,
        width: rect.width,
        height: rect.height,
        bottom: rect.bottom,
      });
    };

    updateAnchorRect();

    const container = containerRef.current;
    const ro = new ResizeObserver(updateAnchorRect);
    if (container) ro.observe(container);

    window.addEventListener('scroll', updateAnchorRect, true);
    window.addEventListener('resize', updateAnchorRect);
    return () => {
      ro.disconnect();
      window.removeEventListener('scroll', updateAnchorRect, true);
      window.removeEventListener('resize', updateAnchorRect);
    };
  }, [satir.urunKod, filtered.length, showSuggestions]);

  useEffect(() => {
    if (!autoFocus) return;
    const timer = window.setTimeout(() => {
      const input = inputRef.current?.input;
      if (!input) return;
      input.focus();
      if (!didInitialSelectRef.current) {
        didInitialSelectRef.current = true;
        input.select();
      }
    }, 0);

    return () => window.clearTimeout(timer);
  }, [autoFocus]);

  // Dropdown disinda click → kapat
  useEffect(() => {
    if (!showSuggestions) return;
    const onDocClick = (e: MouseEvent) => {
      const target = e.target as Node;
      if (containerRef.current?.contains(target)) return;
      const panel = document.getElementById('urunkod-suggest-panel');
      if (panel?.contains(target)) return;
      setShowSuggestions(false);
    };
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, [showSuggestions]);

  const handleSelect = (item: {
    type: 'urun' | 'set';
    kod: string;
    payload: Urun | UrunSeti;
  }) => {
    justSelectedRef.current = true;
    onGuncelle('urunKod', item.kod);

    if (item.type === 'set') {
      const set = item.payload as UrunSeti;
      onGuncelle('aciklama', formatAciklama(set.aciklama ?? ''));
      onSetUygula?.(set.id);
      setShowSuggestions(false);
      onEnterNext?.();
      return;
    }

    onGuncelle('setId', undefined);
    const urun = item.payload as Urun;
    onGuncelle('aciklama', formatAciklama(urun.aciklama ?? ''));
    // Doldurma kuralı:
    //  • Marka → ürün kataloğundaki marka HER ZAMAN gelir (kullanıcı ürün
    //    seçince ona ait markayı görmek ister — değişen ürün, değişen marka).
    //    Kullanıcı isterse sonra elle değiştirir.
    //  • Fiyat & Birim → yalnızca BOŞ hücreleri doldur (kullanıcı önceden
    //    fiyat/birim girdiyse korunur).
    if (urun.marka) onGuncelle('marka', urun.marka);
    if (urun.varsayilanFiyat && !satir.birimFiyat) onGuncelle('birimFiyat', urun.varsayilanFiyat);
    if (urun.birim && !(satir.birim || '').trim()) onGuncelle('birim', urun.birim);
    pushSonKullanilan(urun.id);
    setShowSuggestions(false);
    onEnterNext?.();
  };

  const handleBlur = () => {
    console.log('[UrunKod handleBlur]', {
      yeniKod: satir.urunKod?.trim(),
      eskiKod: initialKodRef.current?.trim(),
      justSelected: justSelectedRef.current,
    });
    // setTimeout: panel item'a click olabilir; blur once tetiklenirse
    // suggestion seçimi kaybolur. Kucuk bir gecikme ile sectiyse handle.
    setTimeout(() => {
      if (justSelectedRef.current) {
        justSelectedRef.current = false;
        return;
      }
      const yeni = satir.urunKod?.trim();
      if (!yeni) return;
      if (yeni === initialKodRef.current?.trim()) return;
      const exists = urunler.some((u) => u.urunKod.toLowerCase() === yeni.toLowerCase());
      if (exists) return;
      modal.confirm({
        title: 'Yeni Ürün Olarak Kaydet',
        content: `"${yeni}" kodlu ürün veritabanında bulunamadı. Yeni ürün olarak kaydedilsin mi? Bir dahaki sefer otomatik gelecek.`,
        okText: 'Kaydet',
        cancelText: 'İptal',
        onOk: () => {
          const yeniUrun: Urun = {
            id: urunService.urunIdUret(),
            urunKod: yeni,
            urunAdi: yeni,
            aciklama: satir.aciklama ?? '',
            kategori: '',
            marka: satir.marka || '',
            birim: satir.birim || 'Adet',
            varsayilanFiyat: satir.birimFiyat || 0,
          };
          urunService.urunKaydet(yeniUrun);
          // Suggestion paneli güncel listesini hemen göstersin.
          setUrunler(urunService.tumUrunleriGetir());
          initialKodRef.current = yeni;
          message.success(`"${yeni}" yeni ürün olarak kaydedildi. Bundan sonra otomatik öneri olarak çıkacak.`);
        },
      });
    }, 150);
  };

  return (
    <div ref={containerRef} style={{ position: 'relative', width: '100%' }}>
      <Input
        ref={inputRef}
        autoFocus={autoFocus}
        className="inline-table-field"
        variant="borderless"
        size="small"
        autoCapitalize="characters"
        style={{
          ...ROW_TEXT.code,
          background: 'transparent',
          transform: 'translateZ(0)',
          backfaceVisibility: 'hidden',
          WebkitFontSmoothing: 'antialiased',
          textTransform: 'uppercase',
        }}
        value={satir.urunKod}
        onChange={(e) => {
          // Ürün kodu daima büyük harf — Türkçe locale ile (i→İ, ı→I)
          const upper = e.target.value.toLocaleUpperCase('tr-TR');
          onGuncelle('urunKod', upper);
          setShowSuggestions(true);
          setHighlightIdx(0);
        }}
        onFocus={(e) => {
          setShowSuggestions(true);
          if (didInitialSelectRef.current) return;
          didInitialSelectRef.current = true;
          (e.target as HTMLInputElement).select?.();
        }}
        onBlur={handleBlur}
        placeholder="Ürün kodu"
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            if (showSuggestions && filtered.length > 0 && filtered[highlightIdx]) {
              handleSelect(filtered[highlightIdx]);
            } else {
              setShowSuggestions(false);
              onEnterNext?.();
            }
            return;
          }
          if (!showSuggestions || filtered.length === 0) {
            return;
          }
          if (e.key === 'ArrowDown') {
            e.preventDefault();
            setHighlightIdx((i) => Math.min(i + 1, filtered.length - 1));
          } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setHighlightIdx((i) => Math.max(i - 1, 0));
          } else if (e.key === 'Escape') {
            setShowSuggestions(false);
          }
        }}
      />
      {showSuggestions && filtered.length > 0 && anchorRect &&
        createPortal(
          (() => {
            // Viewport-aware konum: alt boşluk yetersizse panel input'un üstüne açılır
            const panelMaxH = 320;
            const spaceBelow = window.innerHeight - anchorRect.bottom;
            const spaceAbove = anchorRect.top;
            const openAbove = spaceBelow < panelMaxH && spaceAbove > spaceBelow;
            const top = openAbove
              ? anchorRect.top - Math.min(panelMaxH, spaceAbove)
              : anchorRect.bottom + 2;
            // Son-kullanılan ile geri kalan arasındaki ayraç indeksi (recent biter biter)
            const lastRecentIdx = (() => {
              let idx = -1;
              for (let i = 0; i < filtered.length; i++) {
                if (filtered[i].recent) idx = i;
                else break;
              }
              return idx;
            })();
            return (
          <div
            id="urunkod-suggest-panel"
            className="urun-suggest-panel"
            style={{
              position: 'fixed',
              left: anchorRect.left,
              top,
              minWidth: Math.max(anchorRect.width, 360),
              maxWidth: 500,
              maxHeight: panelMaxH,
              overflowY: 'auto',
              borderRadius: POPUP.radius.base,
              zIndex: POPUP.zIndex.popup,
              fontSize: 12,
              animation: `cell-popup-fade-in ${POPUP.animation.fadeIn}`,
            }}
          >
            {filtered.map((u, i) => (
              <React.Fragment key={`${u.type}-${u.id}`}>
                <div
                  className={`urun-suggest-item${i === highlightIdx ? ' urun-suggest-item-active' : ''}`}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    handleSelect(u);
                  }}
                  onMouseEnter={() => setHighlightIdx(i)}
                  style={{
                    padding: '8px 12px',
                    cursor: 'pointer',
                    whiteSpace: 'normal',
                    overflow: 'hidden',
                  }}
                >
                  <div>
                    {u.type === 'set' && (
                      <span style={{ fontWeight: 700, color: '#7c3aed', marginRight: 6 }}>[SET]</span>
                    )}
                    <span className="urun-suggest-item-kod" style={{ fontWeight: 700, fontSize: 12 }}>{u.kod}</span>
                  </div>
                  {u.aciklama && (
                    <div className="urun-suggest-item-aciklama" style={{ fontWeight: 400, fontSize: 11, marginTop: 2 }}>
                      {u.aciklama}
                    </div>
                  )}
                </div>
                {i === lastRecentIdx && (
                  <div
                    aria-hidden
                    className="urun-suggest-divider"
                    style={{ margin: '4px 0' }}
                  />
                )}
              </React.Fragment>
            ))}
          </div>
            );
          })(),
          document.body,
        )}
    </div>
  );
}

function AciklamaEditor({ satir, autoFocus, onGuncelle, onEnterNext }: CellEditorProps) {
  const { modal, message } = App.useApp();
  // Mount anındaki açıklama — değişiklik tespit baseline
  const initialAciklamaRef = useRef(satir.aciklama);

  const handleBlur = () => {
    // Title Case normalize — kullanıcı yazdıklarını çıkışta tutarlı hale getirir.
    const ham = (satir.aciklama ?? '').trim();
    const normalize = ham ? formatAciklama(ham) : '';
    if (normalize !== ham) {
      onGuncelle('aciklama', normalize);
    }
    console.log('[Aciklama handleBlur]', {
      yeniAciklama: normalize,
      eskiAciklama: (initialAciklamaRef.current ?? '').trim(),
      urunKod: (satir.urunKod ?? '').trim(),
    });
    const yeniAciklama = normalize;
    const eski = (initialAciklamaRef.current ?? '').trim();
    if (yeniAciklama === eski) return; // değişiklik yok
    const kod = (satir.urunKod ?? '').trim();
    if (!kod) return; // ürün kodu yoksa sessizce çık

    const mevcut = urunService.tumUrunleriGetir()
      .find((u) => u.urunKod.toLowerCase() === kod.toLowerCase());
    // Açıklama editörü asla yeni ürün oluşturmaz — kod DB'de yoksa sessizce çık.
    if (!mevcut) return;
    if ((mevcut.aciklama ?? '').trim() === yeniAciklama) {
      initialAciklamaRef.current = yeniAciklama;
      return;
    }
    modal.confirm({
      title: 'Açıklama Güncellensin mi?',
      content: `"${kod}" ürününün açıklaması veritabanında güncellensin mi? Bir dahaki sefer bu ürün seçildiğinde yeni açıklama otomatik gelecek.`,
      okText: 'Güncelle',
      cancelText: 'Hayır',
      onOk: () => {
        urunService.urunKaydet({ ...mevcut, aciklama: yeniAciklama });
        initialAciklamaRef.current = yeniAciklama;
        message.success(`"${kod}" ürününün açıklaması güncellendi. Bir dahaki seçildiğinde yeni açıklama otomatik gelecek.`);
      },
    });
  };

  return (
    <Input
      autoFocus={autoFocus}
      className="inline-table-field description-editor"
      variant="borderless"
      size="small"
      style={ACIKLAMA_EDIT}
      value={satir.aciklama}
      onChange={(e) => onGuncelle('aciklama', e.target.value)}
      onBlur={handleBlur}
      placeholder="Açıklama"
      onFocus={(e) => (e.target as HTMLInputElement).select()}
      onKeyDown={(e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          onEnterNext?.();
        }
      }}
    />
  );
}

function MiktarEditor({ satir, autoFocus, onGuncelle, onEnterNext }: CellEditorProps) {
  return (
    <div className="miktar-edit-wrap" style={ROW_SHELL.quantityWrap}>
      <div className="miktar-edit-value-wrap" style={{ ...ROW_SHELL.quantityValueWrap, flex: '0 0 50%' }}>
        <InlineTableNumberField
          autoFocus={autoFocus}
          className="miktar-edit-input"
          style={ROW_SHELL.quantityInputStyle}
          value={satir.miktar}
          min={0}
          onChange={(value) => onGuncelle('miktar', value ?? 0)}
          formatter={(value) => (value != null ? String(value).replace('.', ',') : '')}
          parser={(value) => parseLocaleNumber(value ?? '')}
          onFocus={(e) => (e.target as HTMLInputElement).select?.()}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              onEnterNext?.();
            }
          }}
        />
      </div>
      <div className="miktar-edit-unit-wrap" style={{ ...ROW_SHELL.quantityUnitWrap, minWidth: 48, paddingLeft: 4 }}>
        <InlineTableSelectField
          className="miktar-edit-unit"
          value={satir.birim || 'Adet'}
          onChange={(value) => onGuncelle('birim', value)}
          options={UNIT_OPTIONS as unknown as { label: string; value: string }[]}
          style={ROW_TEXT.quantityUnit}
          popupMatchSelectWidth={false}
          dropdownStyle={{ minWidth: 140 }}
        />
      </div>
    </div>
  );
}

function ParaBirimiEditor({ satir, paraBirimi, autoFocus, onGuncelle, onEnterNext }: CellEditorProps) {
  const satirPb = hesaplamaMotoru.satirParaBirimiGetir(satir, paraBirimi);
  return (
    <div onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); e.stopPropagation(); onEnterNext?.(); } }}>
      <InlineTableSelectField
        autoFocus={autoFocus}
        defaultOpen={autoFocus}
        style={ROW_TEXT.currency}
        value={satirPb}
        onChange={(value) => {
          onGuncelle('paraBirimi', value);
          onEnterNext?.();
        }}
        options={[
          { value: 'TRY', label: 'TL' },
          { value: 'USD', label: 'USD' },
          { value: 'EUR', label: 'EUR' },
        ]}
        popupMatchSelectWidth={false}
        dropdownStyle={{ minWidth: 120 }}
      />
    </div>
  );
}

function BirimFiyatEditor({ satir, autoFocus, onGuncelle, onEnterNext }: CellEditorProps) {
  return (
    <InlineTableNumberField
      autoFocus={autoFocus}
      style={ROW_TEXT.price}
      value={satir.birimFiyat || undefined}
      min={0}
      step={0.01}
      onChange={(value) => onGuncelle('birimFiyat', value ?? 0)}
      formatter={(value) => (value != null ? String(value).replace('.', ',') : '')}
      parser={(value) => parseLocaleNumber(value ?? '')}
      placeholder="0,00"
      onFocus={(e) => (e.target as HTMLInputElement).select?.()}
      onKeyDown={(e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          onEnterNext?.();
        }
      }}
    />
  );
}

function TeslimatEditor({ satir, autoFocus, onGuncelle, onEnterNext }: CellEditorProps) {
  const teslimSecenekleri = useAkilliReferans('teslimSecenekleri');
  return (
    <div onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); e.stopPropagation(); onEnterNext?.(); } }}>
      <InlineTableSelectField
        autoFocus={autoFocus}
        defaultOpen={autoFocus}
        style={ROW_TEXT.delivery}
        value={satir.teslimTarihi || undefined}
        onChange={(value) => {
          onGuncelle('teslimTarihi', value);
          onEnterNext?.();
        }}
        options={teslimSecenekleri.map((t) => ({ value: t, label: t }))}
        placeholder="—"
        popupMatchSelectWidth={false}
        dropdownStyle={{ minWidth: 200 }}
      />
    </div>
  );
}

// Panel base style (portal ile document.body'ye basılır, fixed pozisyon
// JS hesabıyla viewport içinde clamp edilir). Satırın TR'sinin SAĞINDA
// dikey merkez hizada belirir; sayfa kenarına çıkıp kırpılmaz.
const portalPanelStyle: React.CSSProperties = {
  position: 'fixed',
  zIndex: 1060,
  display: 'flex',
  alignItems: 'center',
  gap: '2px',
  padding: '2px 3px',
  height: 22,
  borderRadius: '5px',
  whiteSpace: 'nowrap',
  backdropFilter: 'blur(10px)',
};

const actionBtnStyle: React.CSSProperties = {
  cursor: 'pointer',
  fontSize: '9.5px',
  fontWeight: 600,
  display: 'inline-flex',
  alignItems: 'center',
  gap: '3px',
  userSelect: 'none',
  padding: '3px 7px',
  borderRadius: '4px',
  transition: 'background 0.15s, opacity 0.15s',
  lineHeight: 1,
  border: 'none',
  background: 'transparent',
};

interface ActionPanelProps {
  satir: TeklifSatiri;
  satirBazliIskonto: boolean;
  onGuncelle: (alan: keyof TeklifSatiri, deger: unknown) => void;
  onSil: () => void;
  /** Ürün geçmişi panelini aç. urunKod boşsa tıklanamaz. */
  onReferanslar?: () => void;
  /** Panel ile etkileşim (mouse veya input focus). True iken parent
   *  satırı "aktif" sayar → panel kapanmaz (kullanıcı iskonto yazarken
   *  hover satırdan çıksa bile input ve panel ekranda kalır). */
  onInteract?: (active: boolean) => void;
}

export function SatirAksiyonlariPanel({
  satir,
  satirBazliIskonto,
  onGuncelle,
  onSil,
  onReferanslar,
  onInteract,
}: ActionPanelProps) {
  const anchorRef = useRef<HTMLSpanElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);

  // Anchor span'inden TR'yi bul, TR'nin viewport rect'ine göre panel'i
  // sağına yerleştir; viewport'a göre clamp et (kumanda paneli ~180px sağda).
  useLayoutEffect(() => {
    const update = () => {
      const anchor = anchorRef.current;
      if (!anchor) return;
      let tr: HTMLElement | null = anchor.parentElement;
      while (tr && tr.tagName !== 'TR') tr = tr.parentElement;
      if (!tr) return;
      const rect = tr.getBoundingClientRect();
      const panelW = panelRef.current?.offsetWidth ?? 80;
      const panelH = panelRef.current?.offsetHeight ?? 22;
      const KUMANDA_GAP = 200; // viewport sağındaki kumanda paneli için pay
      const minLeft = rect.right;          // satırın içine ASLA girme
      const maxLeft = window.innerWidth - panelW - KUMANDA_GAP;
      // maxLeft < minLeft olursa (küçük ekran) yine de satır dışında tut.
      const left = maxLeft >= minLeft ? minLeft : minLeft;
      // Y konumu: satırın yüksekliğini AŞMAYACAK şekilde clamp.
      const desiredTop = rect.top + rect.height / 2 - panelH / 2;
      const top = Math.max(rect.top, Math.min(desiredTop, rect.bottom - panelH));
      setPos({ top, left });
    };
    update();
    const ro = new ResizeObserver(update);
    const anchor = anchorRef.current;
    if (anchor) {
      let tr: HTMLElement | null = anchor.parentElement;
      while (tr && tr.tagName !== 'TR') tr = tr.parentElement;
      if (tr) ro.observe(tr);
    }
    window.addEventListener('scroll', update, true);
    window.addEventListener('resize', update);
    return () => {
      ro.disconnect();
      window.removeEventListener('scroll', update, true);
      window.removeEventListener('resize', update);
    };
  }, [satir.id]);

  // Panel ölçüldüğünde re-position (ilk render'da panelW=80 fallback)
  useEffect(() => {
    if (!panelRef.current || !pos) return;
    // Sadece boyut değişince tetiklenir — left zaten rect.right'a sabitli,
    // ekstra clamp gerekmez.
  }, [pos, satirBazliIskonto]);

  if (!pos) {
    return <span ref={anchorRef} style={{ display: 'none' }} aria-hidden="true" />;
  }

  return (
    <>
      <span ref={anchorRef} style={{ display: 'none' }} aria-hidden="true" />
      {createPortal(
        <div
          ref={panelRef}
          className="satir-aksiyonlari satir-aksiyon-panel no-export"
          data-html2canvas-ignore="true"
          onMouseDown={(e) => e.stopPropagation()}
          onClick={(e) => e.stopPropagation()}
          onMouseEnter={() => onInteract?.(true)}
          onMouseLeave={() => onInteract?.(false)}
          style={{
            ...portalPanelStyle,
            top: pos.top,
            left: pos.left,
          }}
        >
          {satirBazliIskonto && (
        <>
          <Tooltip title="Bu satıra özel iskonto oranı (%)" mouseEnterDelay={0.5}>
            <span style={{ ...actionBtnStyle, color: C.textMid }}>
              <PercentageOutlined style={{ fontSize: 9 }} />
              <InlineTableNumberField
                style={{ width: 26, fontSize: '9px', fontWeight: 700, textAlign: 'center', padding: 0 }}
                value={satir.indirimOrani}
                min={0}
                max={100}
                step={1}
                onChange={(value) => onGuncelle('indirimOrani', value ?? 0)}
                formatter={(value) => (value != null ? String(value).replace('.', ',') : '')}
                parser={(value) => parseLocaleNumber(value ?? '')}
                onFocus={(e) => {
                  (e.target as HTMLInputElement).select?.();
                  // Input odakta → panel kapanmasın (parent isPanelInteracting=true)
                  onInteract?.(true);
                }}
                onBlur={() => onInteract?.(false)}
                onMouseDown={(e) => e.stopPropagation()}
                onClick={(e) => e.stopPropagation()}
              />
            </span>
          </Tooltip>
          <span style={{ width: '0.75px', height: 14, background: C.borderSoft, flexShrink: 0 }} />
        </>
      )}
      {onReferanslar && (satir.urunKod || '').trim() !== '' && (
        <>
          <Tooltip title="Bu ürünün geçmiş tekliflerini gör" mouseEnterDelay={0.5}>
            <span
              onClick={(e) => {
                e.stopPropagation();
                onReferanslar();
              }}
              role="button"
              tabIndex={0}
              aria-label="Geçmiş referansları aç"
              style={{ ...actionBtnStyle, color: '#1E3A5F', opacity: 0.78, padding: '2px 5px' }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'rgba(30,58,95,0.10)';
                e.currentTarget.style.opacity = '1';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'transparent';
                e.currentTarget.style.opacity = '0.78';
              }}
            >
              <HistoryOutlined style={{ fontSize: 10 }} />
            </span>
          </Tooltip>
          <span style={{ width: '0.75px', height: 14, background: C.borderSoft, flexShrink: 0 }} />
        </>
      )}
      <Tooltip title="Bu satırı sil" mouseEnterDelay={0.5}>
        <span
          onClick={(e) => {
            e.stopPropagation();
            onSil();
          }}
          role="button"
          tabIndex={0}
          aria-label="Satırı sil"
          style={{ ...actionBtnStyle, color: '#b91c1c', opacity: 0.75, padding: '2px 5px' }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'rgba(185,28,28,0.08)';
            e.currentTarget.style.opacity = '1';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'transparent';
            e.currentTarget.style.opacity = '0.75';
          }}
        >
          <DeleteOutlined style={{ fontSize: 10 }} />
        </span>
      </Tooltip>
        </div>,
        document.body,
      )}
    </>
  );
}

interface IskontoRozetiProps {
  rowId: string;
  oran: number;
  /** Rozet üzerine mouse gelince çağrılır → parent satırı "panel etkileşimde"
   *  sayar → rozet+panel kapanmaz, kullanıcı iskonto input'una tıklayabilir.
   *  Çıkınca false döner. */
  onHover?: (active: boolean) => void;
  /** Tıklama: doğrudan iskonto input'una geçiş için tetik. Parent panel'i
   *  açar ve isPanelInteracting=true tutar. */
  onActivate?: () => void;
}

export function SatirIskontoRozeti({ rowId, oran, onHover, onActivate }: IskontoRozetiProps) {
  const anchorRef = useRef<HTMLSpanElement>(null);
  const badgeRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ top: number; left: number; height: number } | null>(null);

  useLayoutEffect(() => {
    const update = () => {
      const anchor = anchorRef.current;
      if (!anchor) return;
      let tr: HTMLElement | null = anchor.parentElement;
      while (tr && tr.tagName !== 'TR') tr = tr.parentElement;
      if (!tr) return;

      const rect = tr.getBoundingClientRect();
      const minLeft = rect.right + 2;  // satırın içine ASLA girme
      const left = minLeft;
      const top = rect.top;
      setPos({ top, left, height: rect.height });
    };

    update();
    const ro = new ResizeObserver(update);
    const anchor = anchorRef.current;
    if (anchor) {
      let tr: HTMLElement | null = anchor.parentElement;
      while (tr && tr.tagName !== 'TR') tr = tr.parentElement;
      if (tr) ro.observe(tr);
    }
    window.addEventListener('scroll', update, true);
    window.addEventListener('resize', update);
    return () => {
      ro.disconnect();
      window.removeEventListener('scroll', update, true);
      window.removeEventListener('resize', update);
    };
  }, [rowId, oran]);

  const oranText = Number.isInteger(oran) ? String(oran) : oran.toFixed(2).replace(/\.00$/, '');

  if (!pos) {
    return <span ref={anchorRef} style={{ display: 'none' }} aria-hidden="true" />;
  }

  return (
    <>
      <span ref={anchorRef} style={{ display: 'none' }} aria-hidden="true" />
      {createPortal(
        <div
          ref={badgeRef}
          className="no-export"
          data-html2canvas-ignore="true"
          onMouseEnter={() => onHover?.(true)}
          onMouseLeave={() => onHover?.(false)}
          onClick={(e) => {
            e.stopPropagation();
            onActivate?.();
          }}
          title="İskonto oranını düzenle"
          style={{
            position: 'fixed',
            top: pos.top,
            left: pos.left,
            height: pos.height,
            fontSize: '9px',
            fontWeight: 700,
            color: C.accent,
            background: 'rgba(37,99,235,0.10)',
            borderRadius: '4px',
            padding: '0 5px',
            lineHeight: `${pos.height}px`,
            letterSpacing: '0.02em',
            // Mouse rozeti yakalayabilsin → hover/click çalışır. Önceden 'none'
            // idi, satırdan rozete geçişte hover kayboluyordu.
            pointerEvents: 'auto',
            cursor: 'pointer',
            zIndex: 1055,
            whiteSpace: 'nowrap',
            display: 'flex',
            alignItems: 'center',
          }}
          role="button"
          tabIndex={0}
          aria-label={`İskonto %${oranText} — düzenlemek için tıklayın`}
        >
          -{oranText}%
        </div>,
        document.body,
      )}
    </>
  );
}
