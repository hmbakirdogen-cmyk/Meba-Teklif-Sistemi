import React, { useEffect, useMemo, useRef, useState } from 'react';
import { AutoComplete } from 'antd';
import type { Cari } from '../types';
import { formatCariAdi } from '../utils/formatters';
import { cariService } from '../services/musteriService';

interface InlineCariAutocompleteFieldProps {
  value: string;
  placeholder?: string;
  autoFocus?: boolean;
  className?: string;
  style?: React.CSSProperties;
  popupClassName?: string;
  popupMinWidth?: number;
  onChange: (value: string) => void;
  onCariSelect: (cari: Cari) => void;
}

function normalizeSearch(value: string) {
  return value.trim().toLocaleLowerCase('tr-TR');
}

export function InlineCariAutocompleteField({
  value,
  placeholder,
  autoFocus = false,
  className,
  style,
  popupClassName = 'belge-inline-cari-dropdown',
  popupMinWidth = 420,
  onChange,
  onCariSelect,
}: InlineCariAutocompleteFieldProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const [focused, setFocused] = useState(false);
  const [openAbove, setOpenAbove] = useState(false);
  const cariler = useMemo(() => cariService.tumCarileriGetir(), []);

  const filteredOptions = useMemo(() => {
    const query = normalizeSearch(value);
    const source = query
      ? cariler.filter((cari) => {
          const firmaAdi = normalizeSearch(cari.firmaAdi);
          const cariKod = normalizeSearch(cari.cariKod);
          return firmaAdi.includes(query) || cariKod.includes(query);
        })
      : cariler.slice(0, 24);

    source.sort((a, b) => a.firmaAdi.localeCompare(b.firmaAdi, 'tr'));

    return source.slice(0, 24).map((cari) => ({
      value: cari.id,
      label: (
        <div>
          <div style={{ fontWeight: 600, fontSize: 12, whiteSpace: 'normal' }}>
            {formatCariAdi(cari.firmaAdi)}
          </div>
          <div style={{ fontSize: 10, color: '#888', marginTop: 1 }}>
            {cari.cariKod}{cari.adres ? ` — ${cari.adres}` : ''}
          </div>
        </div>
      ),
      cari,
    }));
  }, [cariler, value]);

  useEffect(() => {
    if (!autoFocus) return;
    const timer = window.setTimeout(() => {
      const input = rootRef.current?.querySelector('input');
      input?.focus();
      input?.select();
    }, 40);
    return () => window.clearTimeout(timer);
  }, [autoFocus]);

  // Viewport pozisyonu — focused değiştiğinde dropdown'u yukarı/aşağı aç.
  // DOM ölçümünden derive ediliyor (rootRef.current.getBoundingClientRect),
  // bu external DOM sync'i — render scope'ta yapılamaz.
  useEffect(() => {
    if (!focused) return;
    const rect = rootRef.current?.getBoundingClientRect();
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setOpenAbove(rect ? rect.bottom > window.innerHeight * 0.65 : false);
  }, [focused]);

  return (
    <div ref={rootRef} className={className} style={style}>
      <AutoComplete
        size="small"
        variant="borderless"
        value={value}
        options={filteredOptions}
        open={focused && filteredOptions.length > 0}
        style={{ width: '100%', font: 'inherit', color: 'inherit' }}
        popupMatchSelectWidth={false}
        dropdownStyle={{ minWidth: popupMinWidth }}
        popupClassName={popupClassName}
        placement={openAbove ? 'topLeft' : 'bottomLeft'}
        placeholder={placeholder}
        defaultActiveFirstOption
        onFocus={() => setFocused(true)}
        onBlur={() => {
          window.setTimeout(() => setFocused(false), 120);
        }}
        onChange={(nextValue) => {
          setFocused(true);
          onChange(nextValue);
        }}
        onSelect={(_, option) => {
          const cari = option.cari as Cari | undefined;
          if (!cari) return;
          onChange(formatCariAdi(cari.firmaAdi));
          onCariSelect(cari);
          setFocused(false);
        }}
      />
    </div>
  );
}
