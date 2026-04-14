import { useState, useEffect, Component } from 'react'
import { useMemo } from 'react'
import type { ReactNode, ErrorInfo } from 'react'
import { ConfigProvider, Spin } from 'antd'
import AppRouter from './AppRouter'
import { buttonClassNames } from './styles/buttonStyles'
import { initDataStore } from './services/dataStore'
import { ThemeProvider } from './context/ThemeContext'
import { useTheme } from './context/useTheme'
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
function DevSignature() {
  const [hovered, setHovered] = useState(false)
  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        position: 'fixed',
        bottom: 14,
        right: 20,
        zIndex: 9999,
        fontSize: 10.5,
        letterSpacing: 0.6,
        color: '#BEBEBE',
        opacity: hovered ? 0.80 : 0.45,
        fontFamily: '"Segoe UI", "Inter", "Arial", sans-serif',
        fontWeight: 400,
        userSelect: 'none',
        whiteSpace: 'nowrap',
        cursor: 'default',
        transition: 'opacity 0.4s ease',
        textShadow: '0 1px 3px rgba(0,0,0,0.50)',
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
  const [hazir, setHazir] = useState(false);
  const [hataMsg, setHataMsg] = useState<string | null>(null);
  const antdTheme = useMemo(() => getAntdTokens(isDark), [isDark]);

  useEffect(() => {
    initDataStore()
      .then(() => setHazir(true))
      .catch((err: unknown) => {
        console.error('[App] Veri sunucusuna bağlanılamadı:', err);
        setHataMsg(
          'Veri sunucusuna bağlanılamadı.\n' +
          'Lütfen "baslat.bat" ile uygulamayı başlatın ve sayfayı yenileyin.'
        );
      });
  }, []);

  return (
    <ConfigProvider
      theme={antdTheme}
    >
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
