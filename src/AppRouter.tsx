import { BrowserRouter, Routes, Route, Navigate, useParams } from 'react-router-dom';
import AppLayout from './AppLayout';
import TeklifListesi from './pages/TeklifListesi';
import YeniTeklif from './pages/YeniTeklif';
import TeklifOnizleme from './pages/TeklifOnizleme';
import VeriYonetimiSayfasi from './pages/VeriYonetimiSayfasi';
import GirisEkrani from './pages/GirisEkrani';
import { useKullanici } from './context/KullaniciContext';

// `key={id}` ile her id değişiminde YeniTeklif yeniden mount olur → state
// lazy initializer'ları yeni id ile çalışır, useEffect'te setState hilesine
// gerek kalmaz.
function YeniTeklifEditor() {
  const { id } = useParams<{ id: string }>();
  return <YeniTeklif duzenleme key={id} />;
}

function RouterIcerigi() {
  const { aktifKullanici } = useKullanici();

  if (!aktifKullanici) {
    return <GirisEkrani />;
  }

  return (
    <Routes>
      <Route path="/" element={<Navigate to="/teklifler" replace />} />
      <Route element={<AppLayout />}>
        <Route path="/teklifler" element={<TeklifListesi />} />
        <Route path="/teklif/yeni" element={<YeniTeklif />} />
        <Route path="/teklif/:id" element={<YeniTeklifEditor />} />
        <Route path="/veri" element={<VeriYonetimiSayfasi />} />
      </Route>
      {/* Önizleme kendi tam ekranında — layout dışı */}
      <Route path="/teklif/:id/onizleme" element={<TeklifOnizleme />} />
      <Route path="*" element={<Navigate to="/teklifler" replace />} />
    </Routes>
  );
}

export default function AppRouter() {
  return (
    <BrowserRouter>
      <RouterIcerigi />
    </BrowserRouter>
  );
}
