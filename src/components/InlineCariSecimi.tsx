import { useState } from 'react';
import type { Cari } from '../types';
import { formatCariAdi } from '../utils/formatters';
import { InlineCariAutocompleteField } from './InlineCariAutocompleteField';

export function InlineCariSecimi({ onSec }: { onSec: (cari: Cari) => void }) {
  const [searchText, setSearchText] = useState('');

  return (
    <InlineCariAutocompleteField
      autoFocus
      value={searchText}
      style={{ width: '100%', maxWidth: 340 }}
      placeholder="Firma adı veya cari kod ile arayın..."
      popupMinWidth={340}
      onChange={setSearchText}
      onCariSelect={(cari) => {
        setSearchText(formatCariAdi(cari.firmaAdi));
        onSec(cari);
      }}
    />
  );
}
