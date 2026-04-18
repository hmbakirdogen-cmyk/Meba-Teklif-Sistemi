import { BrowserRouter, Routes, Route, Navigate, useParams } from 'react-router-dom';
import AppLayout from './AppLayout';
import TeklifListesi from './pages/TeklifListesi';
import TeklifEditor from './pages/TeklifEditor';
import VeriYonetimiSayfasi from './pages/VeriYonetimiSayfasi';
import GirisEkrani from './pages/GirisEkrani';
import { useKullanici } from './context/useKullanici';

// `key={id}` ile her id değişiminde TeklifEditor yeniden mount olur → state
// lazy initializer'ları yeni id ile çalışır.
function TeklifEditorWrapper() {
  const { id } = useParams<{ id: string }>();
  return <TeklifEditor key={id} />;
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
        <Route path="/teklif/yeni" element={<TeklifEditor />} />
        <Route path="/teklif/:id" element={<TeklifEditorWrapper />} />
        <Route path="/veri" element={<VeriYonetimiSayfasi />} />
      </Route>
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
