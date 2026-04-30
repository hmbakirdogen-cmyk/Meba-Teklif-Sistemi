import { useState, useEffect, useMemo, Component } from 'react'
import type { ReactNode, ErrorInfo } from 'react'
import { App as AntdApp, ConfigProvider, Spin } from 'antd'
import AppRouter from './AppRouter'
import SplashScreen from './components/SplashScreen'
import { buttonClassNames } from './styles/buttonStyles'
import { initDataStore } from './services/dataStore'
import { initNetworkConfig } from './services/networkConfig'
import { syncEngine } from './services/syncEngine'
import { ThemeProvider } from './context/ThemeContext'
import { useTheme } from './context/useTheme'
import { useKullanici } from './context/useKullanici'
import { getAntdTokens } from './design-system/antdTokens'

/* ── Error Boundary ──────────────────────────────────────── */
interface EBState { hata: Error | null }

class ErrorBoundary extends Component<{ children: ReactNode }, EBState> {
  state: EBState = { hata: null };

  static getDerivedStateFromError(err: Error): EBState {
    return { hata: err };
  }

  componentDidCatch(err: Error, info: ErrorInfo) {
    console.error('[ErrorBoundary]', err, info);
  }

  render() {
    const { hata } = this.state;
    if (hata) {
      return (
        <div style={{
          padding: 40, fontFamily: 'monospace', color: '#dc2626',
          background: '#fef2f2', minHeight: '100vh',
        }}>
          <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 12 }}>
            Uygulama Hatası
          </div>
          <pre style={{ whiteSpace: 'pre-wrap', fontSize: 13 }}>
            {hata.message}
            {'\n\n'}
            {hata.stack}
          </pre>
          <button
            onClick={() => this.setState({ hata: null })}
            className={buttonClassNames.secondary}
            style={{ marginTop: 20, cursor: 'pointer' }}
          >
            Yeniden Dene
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

/* ── Software İmzası ─────────────────────────────────────── */
/* Sağ-alt köşede sade, kart/arkaplansız, küçük tek satır metin.
 * Hem dev hem production'da görünür (kullanıcı her ekranda istedi).
 *   - 8px font + sade navy ton → A4 ile yan yana geldiğinde bile görsel
 *     olarak rahatsız etmez; köşede nazik bir attribution rozeti.
 *   - z-index 1 + pointer-events:none → mouse'u engellemez, panel/dialog
 *     daima üstte kalır.
 *   - data-html2canvas-ignore → PDF/yazdırma'da görünmez.
 */
function SoftwareSignature() {
  return (
    <div
      data-html2canvas-ignore="true"
      style={{
        position: 'fixed',
        bottom: 10,
        right: 16,
        zIndex: 1,
        fontSize: 8.8,
        letterSpacing: 0.32,
        fontFamily: '"Inter", "SF Pro Display", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
        fontWeight: 600,
        color: '#1E3A5F',
        opacity: 0.95,
        pointerEvents: 'none',
        userSelect: 'none',
        whiteSpace: 'nowrap',
        padding: '4px 10px',
        borderRadius: 6,
        background: 'rgba(255, 255, 255, 0.42)',
        backdropFilter: 'blur(6px)',
        WebkitBackdropFilter: 'blur(6px)',
        textShadow:
          '0 0 2px rgba(255, 255, 255, 0.95), 0 1px 2px rgba(255, 255, 255, 0.75)',
        boxShadow: '0 1px 3px rgba(15, 23, 42, 0.06)',
      }}
    >
      This software was developed by Mehmet Bakırdöğen
    </div>
  )
}

/* ── Yükleme / hata ekranı (temadan bağımsız) ────────────── */
function LoadingScreen() {
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      justifyContent: 'center', height: '100vh', gap: 16,
      background: 'var(--bg-body)',
    }}>
      <Spin size="large" />
      <span style={{ fontSize: 13, color: 'var(--text-secondary)', letterSpacing: 0.3 }}>
        Veriler yükleniyor...
      </span>
    </div>
  );
}

function ServerErrorScreen({ msg, onRetry }: { msg: string; onRetry: () => void }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      height: '100vh', background: 'var(--bg-body)',
    }}>
      <div style={{
        maxWidth: 440, padding: '36px 32px', background: 'var(--bg-surface)',
        borderRadius: 12, boxShadow: '0 4px 24px rgba(15,23,42,0.10)',
        textAlign: 'center', border: '1px solid var(--border)',
      }}>
        <div style={{ fontSize: 32, marginBottom: 16 }}>⚠</div>
        <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 10 }}>
          Sunucu Bağlantısı Kurulamadı
        </div>
        <pre style={{
          whiteSpace: 'pre-wrap', fontSize: 13, color: 'var(--text-secondary)',
          background: 'var(--bg-elevated)', borderRadius: 8, padding: '12px 14px',
          textAlign: 'left', marginBottom: 20,
        }}>
          {msg}
        </pre>
        <button onClick={onRetry} className={buttonClassNames.secondary} style={{ cursor: 'pointer' }}>
          Yenile
        </button>
      </div>
    </div>
  );
}

/* ── Tema-duyarlı ana uygulama (ThemeProvider içinde) ───── */
function ThemedApp() {
  const { isDark } = useTheme();
  const { aktifKullanici } = useKullanici();
  const [hazirSessionKey, setHazirSessionKey] = useState<string | null>(null);
  const [hataMsg, setHataMsg] = useState<string | null>(null);
  // Her sayfa yuklenmesinde splash bir kez oynar — login durumu fark etmez.
  const [splashAcik, setSplashAcik] = useState(true);
  const antdTheme = useMemo(() => getAntdTokens(isDark), [isDark]);

  // Kullanıcı id/rol/firmaId değişince store'u re-init et — visibility +
  // firma filtresi için ilk veri çekimi yenilensin. (Login/logout/firma
  // değişimi tetikler.)
  const userId = aktifKullanici?.id;
  const userRol = aktifKullanici?.rol;
  const firmaId = aktifKullanici?.firmaId || '';
  const oturumAnahtari = `${userId ?? ''}:${userRol ?? ''}:${firmaId}`;
  const hazir = hazirSessionKey === oturumAnahtari;

  useEffect(() => {
    let aktif = true;
    const kullanici = userId && userRol ? { id: userId, rol: userRol } : undefined;
    // initNetworkConfig önce çalışır → API_BASE'i resolve eder; sonra
    // initDataStore sunucudan veri çeker (offline ise localStorage snapshot'a düşer).
    initNetworkConfig()
      .then(() => initDataStore(kullanici))
      .then(() => {
        if (!aktif) return;
        setHataMsg(null);
        setHazirSessionKey(oturumAnahtari);
      })
      .catch((err: unknown) => {
        if (!aktif) return;
        console.error('[App] Veri sunucusuna bağlanılamadı (snapshot da yok):', err);
        setHataMsg(
          'Veri sunucusuna bağlanılamadı ve yerel yedek yok.\n' +
          'Lütfen ana bilgisayarın açık ve ağa bağlı olduğunu kontrol edin.'
        );
      });
    return () => {
      aktif = false;
    };
  }, [userId, userRol, oturumAnahtari]);

  // Otomatik senkronizasyon — kullanıcı login olduktan sonra her 5 dk'da bir
  // pull + push tetiklenir. Tab kapalıyken çalışmaz (setInterval).
  useEffect(() => {
    if (!hazir || !userId || !userRol) return;
    const kullanici = { id: userId, rol: userRol };
    const tick = () => { void syncEngine.syncNow(kullanici); };
    // İlk tetik 5 sn sonra (initial pull initDataStore zaten yaptı)
    const initialDelay = window.setTimeout(tick, 5_000);
    const id = window.setInterval(tick, 5 * 60 * 1000);
    return () => {
      window.clearTimeout(initialDelay);
      window.clearInterval(id);
    };
  }, [hazir, userId, userRol]);

  return (
    <ConfigProvider theme={antdTheme}>
      <AntdApp>
        {hataMsg ? (
          <ServerErrorScreen msg={hataMsg} onRetry={() => window.location.reload()} />
        ) : !hazir ? (
          <LoadingScreen />
        ) : (
          <ErrorBoundary>
            <AppRouter />
            <SoftwareSignature />
          </ErrorBoundary>
        )}
        {/* Splash en üstte — her açılışta oynar, atlanırsa veya biterse kapanır.
         *  zIndex 9000 → diğer her şeyin üzerinde. Position fixed → AppRouter
         *  zaten render olurken splash görünür, kullanıcı ilk önce splash'i görür. */}
        {splashAcik && <SplashScreen onDone={() => setSplashAcik(false)} />}
      </AntdApp>
    </ConfigProvider>
  );
}

/* ── Kök bileşen ─────────────────────────────────────────── */
export default function App() {
  return (
    <ThemeProvider>
      <ThemedApp />
    </ThemeProvider>
  );
}
