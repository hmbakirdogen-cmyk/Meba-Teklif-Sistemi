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
  popupMinWidth = 320,
  onChange,
  onCariSelect,
}: InlineCariAutocompleteFieldProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const [focused, setFocused] = useState(false);
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

    return source.slice(0, 24).map((cari) => ({
      value: cari.id,
      label: (
        <div
          style={{
            display: 'flex',
            alignItems: 'baseline',
            gap: 6,
            minWidth: 0,
            fontFamily: 'inherit',
            fontSize: 'inherit',
            lineHeight: 'inherit',
          }}
        >
          <span
            style={{
              minWidth: 0,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              font: 'inherit',
              letterSpacing: 'inherit',
            }}
          >
            {formatCariAdi(cari.firmaAdi)}
          </span>
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
