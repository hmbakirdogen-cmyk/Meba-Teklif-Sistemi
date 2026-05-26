import { BrowserRouter, Routes, Route, Navigate, useParams } from 'react-router-dom';
import { lazy, Suspense, useEffect, type ReactNode } from 'react';
import { Spin, Modal } from 'antd';
import { WarningOutlined, MailOutlined } from '@ant-design/icons';
import AppLayout from './AppLayout';
import GirisEkrani from './pages/GirisEkrani';
import { useKullanici } from './context/useKullanici';
import IlkGirisModal from './components/IlkGirisModal';
import { ilkGirisGerekli } from './utils/ilkGiris';
import { isYonetici } from './utils/yetkiUtils';
import { useNavigate } from 'react-router-dom';

// Lazy-loaded pages — ağır sayfalar başlangıçta yüklenmez
const TeklifListesi = lazy(() => import('./pages/TeklifListesi'));
const TeklifEditor = lazy(() => import('./pages/TeklifEditor'));
const VeriYonetimiSayfasi = lazy(() => import('./pages/VeriYonetimiSayfasi'));
const PersonelSayfasi = lazy(() => import('./pages/PersonelSayfasi'));
const FirmaProfilSayfasi = lazy(() => import('./pages/FirmaProfilSayfasi'));
const AnalizSayfasi = lazy(() => import('./pages/AnalizSayfasi'));
const TeklifPrintSayfasi = lazy(() => import('./pages/TeklifPrintSayfasi'));
const ReferansVerilerSayfasi = lazy(() => import('./pages/ReferansVerilerSayfasi'));
const EpostaAyarlariSayfasi = lazy(() => import('./pages/EpostaAyarlariSayfasi'));
const MalzemeHareketleriSayfasi = lazy(() => import('./pages/MalzemeHareketleriSayfasi'));
const TatilTebrikSayfasi = lazy(() => import('./pages/TatilTebrikSayfasi'));

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
  if (!isYonetici(aktifKullanici?.rol)) return <Navigate to="/teklifler" replace />;
  return <>{children}</>;
}

function SmtpUyarisi() {
  const { aktifKullanici } = useKullanici();
  const navigate = useNavigate();

  useEffect(() => {
    if (!aktifKullanici) return;
    const smtpTamam = aktifKullanici.smtpUser && aktifKullanici.smtpPasswordSet;
    if (smtpTamam) return;
    const storageKey = `smtp_uyari_${aktifKullanici.id}`;
    if (sessionStorage.getItem(storageKey)) return;
    sessionStorage.setItem(storageKey, '1');

    // Kurumsal hitabet (Mehmet Bey direktifi 2026-05-26): kibar, resmi
    // ve kişiselleştirilmiş ton. Önceki şakacı/emoji'li metin (Plan agent
    // raporu Faz 14) tamamen değiştirildi.
    Modal.warning({
      title: (
        <span style={{ fontSize: 16 }}>
          <WarningOutlined style={{ color: '#faad14', marginRight: 8 }} />
          E-posta ayarlarınız henüz tamamlanmadı
        </span>
      ),
      content: (
        <div style={{ lineHeight: 1.7 }}>
          <p>
            Sayın <strong>{aktifKullanici.adSoyad}</strong>, sistem üzerinden müşterilerinize
            teklif gönderebilmeniz için e-posta hesabınızın tanımlı olması gerekmektedir.
          </p>
          <p style={{ color: '#8c8c8c', fontSize: 13 }}>
            Profil → E-posta Ayarları bölümünden hesabınızı yaklaşık iki dakikada
            tanımlayabilirsiniz. Bu uyarı yeniden gösterilmeyecektir.
          </p>
        </div>
      ),
      okText: (
        <span>
          <MailOutlined style={{ marginRight: 6 }} />
          Şimdi tanımla
        </span>
      ),
      cancelText: 'Daha sonra',
      okCancel: true,
      centered: true,
      maskClosable: true,
      onOk: () => navigate('/profil/eposta'),
    });
  }, [aktifKullanici?.id]);

  return null;
}

function RouterIcerigi() {
  const { aktifKullanici, yukleniyor } = useKullanici();

  // Print route — Puppeteer için layout/login kontrolü atlanır.
  // Server-side render için public; teklif API auth'u session token ile
  // (server endpoint Puppeteer'a token inject eder).
  if (typeof window !== 'undefined' && /^\/teklif\/[^/]+\/print$/.test(window.location.pathname)) {
    return (
      <Routes>
        <Route path="/teklif/:id/print" element={
          <Suspense fallback={<PageFallback />}><TeklifPrintSayfasi /></Suspense>
        } />
      </Routes>
    );
  }

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
      <SmtpUyarisi />
      <Routes>
        <Route path="/" element={<Navigate to="/teklifler" replace />} />
        <Route element={<AppLayout />}>
          <Route path="/teklifler" element={<Suspense fallback={<PageFallback />}><TeklifListesi /></Suspense>} />
          <Route path="/malzeme-hareketleri" element={<Suspense fallback={<PageFallback />}><MalzemeHareketleriSayfasi /></Suspense>} />
          <Route path="/tatil-tebrik" element={<Suspense fallback={<PageFallback />}><TatilTebrikSayfasi /></Suspense>} />
          <Route path="/referans-veriler" element={<Suspense fallback={<PageFallback />}><ReferansVerilerSayfasi /></Suspense>} />
          <Route path="/profil/eposta" element={<Suspense fallback={<PageFallback />}><EpostaAyarlariSayfasi /></Suspense>} />
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
          <Route path="/analiz" element={
            <YoneticiOnly>
              <Suspense fallback={<PageFallback />}><AnalizSayfasi /></Suspense>
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
