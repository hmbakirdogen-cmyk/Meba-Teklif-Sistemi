import { useState, useEffect, useMemo, Component } from 'react'
import type { ReactNode, ErrorInfo } from 'react'
import { App as AntdApp, ConfigProvider, Spin } from 'antd'
import AppRouter from './AppRouter'
import { buttonClassNames } from './styles/buttonStyles'
import { initDataStore } from './services/dataStore'
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

/* ── Dev İmzası ──────────────────────────────────────────── */
/* Sağ-alt köşede sade, kart/arkaplansız, küçük tek satır metin.
 *   - 8px font + sade navy ton → A4 ile yan yana geldiğinde bile görsel
 *     olarak rahatsız etmez; köşede nazik bir attribution rozeti.
 *   - z-index 1 + pointer-events:none → mouse'u engellemez, panel/dialog
 *     daima üstte kalır.
 *   - data-html2canvas-ignore → PDF/yazdırma'da görünmez.
 */
function DevSignature() {
  return (
    <div
      data-html2canvas-ignore="true"
      style={{
        position: 'fixed',
        bottom: 8,
        right: 14,
        zIndex: 1,
        fontSize: 8,
        letterSpacing: 0.28,
        fontFamily: '"Inter", "SF Pro Display", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
        fontWeight: 500,
        color: '#1E3A5F',
        opacity: 0.72,
        pointerEvents: 'none',
        userSelect: 'none',
        whiteSpace: 'nowrap',
        textShadow:
          '0 0 1px rgba(255, 255, 255, 0.72), 0 0.5px 1.5px rgba(255, 255, 255, 0.55)',
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
  const antdTheme = useMemo(() => getAntdTokens(isDark), [isDark]);

  // Kullanıcı id/rol değişince store'u re-init et — visibility filter uygulu
  // ilk veri çekimi için. (Login/logout/kullanıcı değişimi tetikler.)
  const userId = aktifKullanici?.id;
  const userRol = aktifKullanici?.rol;
  const oturumAnahtari = `${userId ?? ''}:${userRol ?? ''}`;
  const hazir = hazirSessionKey === oturumAnahtari;

  useEffect(() => {
    let aktif = true;
    const kullanici = userId && userRol ? { id: userId, rol: userRol } : undefined;
    initDataStore(kullanici)
      .then(() => {
        if (!aktif) return;
        setHataMsg(null);
        setHazirSessionKey(oturumAnahtari);
      })
      .catch((err: unknown) => {
        if (!aktif) return;
        console.error('[App] Veri sunucusuna bağlanılamadı:', err);
        setHataMsg(
          'Veri sunucusuna bağlanılamadı.\n' +
          'Lütfen "baslat.bat" ile uygulamayı başlatın ve sayfayı yenileyin.'
        );
      });
    return () => {
      aktif = false;
    };
  }, [userId, userRol, oturumAnahtari]);

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
            {import.meta.env.DEV ? <DevSignature /> : null}
          </ErrorBoundary>
        )}
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
