import { BrowserRouter, Routes, Route, Navigate, useParams } from 'react-router-dom';
import { lazy, Suspense, type ReactNode } from 'react';
import { Spin } from 'antd';
import AppLayout from './AppLayout';
import GirisEkrani from './pages/GirisEkrani';
import { useKullanici } from './context/useKullanici';
import IlkGirisModal from './components/IlkGirisModal';
import { ilkGirisGerekli } from './utils/ilkGiris';

// Lazy-loaded pages — ağır sayfalar başlangıçta yüklenmez
const TeklifListesi = lazy(() => import('./pages/TeklifListesi'));
const TeklifEditor = lazy(() => import('./pages/TeklifEditor'));
const VeriYonetimiSayfasi = lazy(() => import('./pages/VeriYonetimiSayfasi'));
const PersonelSayfasi = lazy(() => import('./pages/PersonelSayfasi'));
const FirmaProfilSayfasi = lazy(() => import('./pages/FirmaProfilSayfasi'));

function PageFallback() {
  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
      <Spin size="large" />
    </div>
  );
}

// `key={id}` ile her id değişiminde TeklifEditor yeniden mount olur → state
// lazy initializer'ları yeni id ile çalışır.
function TeklifEditorWrapper() {
  const { id } = useParams<{ id: string }>();
  return <TeklifEditor key={id} />;
}

/** Yönetici olmayan kullanıcılar /teklifler'e yönlendirilir. */
function YoneticiOnly({ children }: { children: ReactNode }) {
  const { aktifKullanici } = useKullanici();
  const rol = aktifKullanici?.rol;
  const isYonetici = rol === 'super_admin' || rol === 'admin' || rol === 'firma_admin';
  if (!isYonetici) return <Navigate to="/teklifler" replace />;
  return <>{children}</>;
}

function RouterIcerigi() {
  const { aktifKullanici, yukleniyor } = useKullanici();

  if (yukleniyor) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <Spin size="large" />
      </div>
    );
  }

  if (!aktifKullanici) {
    return <GirisEkrani />;
  }

  // İlk giriş: şifre değişmemiş veya foto eksikse modal göster
  const ilkGiris = ilkGirisGerekli(aktifKullanici);

  return (
    <>
      <Routes>
        <Route path="/" element={<Navigate to="/teklifler" replace />} />
        <Route element={<AppLayout />}>
          <Route path="/teklifler" element={<Suspense fallback={<PageFallback />}><TeklifListesi /></Suspense>} />
          <Route path="/teklif/yeni" element={<Suspense fallback={<PageFallback />}><TeklifEditor /></Suspense>} />
          <Route path="/teklif/:id" element={<Suspense fallback={<PageFallback />}><TeklifEditorWrapper /></Suspense>} />
          <Route path="/veri" element={
            <YoneticiOnly>
              <Suspense fallback={<PageFallback />}><VeriYonetimiSayfasi /></Suspense>
            </YoneticiOnly>
          } />
          <Route path="/personel" element={
            <YoneticiOnly>
              <Suspense fallback={<PageFallback />}><PersonelSayfasi /></Suspense>
            </YoneticiOnly>
          } />
          <Route path="/firma-profili" element={
            <YoneticiOnly>
              <Suspense fallback={<PageFallback />}><FirmaProfilSayfasi /></Suspense>
            </YoneticiOnly>
          } />
        </Route>
        <Route path="*" element={<Navigate to="/teklifler" replace />} />
      </Routes>
      {ilkGiris && <IlkGirisModal />}
    </>
  );
}

export default function AppRouter() {
  return (
    <BrowserRouter>
      <RouterIcerigi />
    </BrowserRouter>
  );
}
