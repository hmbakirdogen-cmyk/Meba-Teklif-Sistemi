import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import AppLayout from './AppLayout';
import TeklifListesi from './pages/TeklifListesi';
import YeniTeklif from './pages/YeniTeklif';
import TeklifOnizleme from './pages/TeklifOnizleme';
import VeriYonetimiSayfasi from './pages/VeriYonetimiSayfasi';
import GirisEkrani from './pages/GirisEkrani';
import { useKullanici } from './context/KullaniciContext';

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
        <Route path="/teklif/:id" element={<YeniTeklif duzenleme />} />
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
