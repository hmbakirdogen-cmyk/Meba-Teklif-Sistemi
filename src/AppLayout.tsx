import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { Layout, Menu, Tooltip, Button } from 'antd';
import { FileTextOutlined, DatabaseOutlined, LogoutOutlined } from '@ant-design/icons';
import { useKullanici } from './context/useKullanici';

const { Header, Content } = Layout;

// ── Header tasarım sabitleri ──────────────────────────────────────────────────
const HEADER_H        = 56;   // navbar yüksekliği — logo height:100% bu değere snap olur
const HEADER_PAD_X    = 24;   // yatay padding (uniform)
const SECTION_GAP     = 32;   // logo / menu / user-area arası mesafe
const USER_INNER_GAP  = 12;   // user area iç element gap (avatar, text, button)

export default function AppLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const { aktifKullanici, cikisYap } = useKullanici();

  const seciliMenu = location.pathname.startsWith('/veri') ? 'veri' : 'teklifler';
  const isYonetici = aktifKullanici?.rol === 'admin';

  return (
    <Layout style={{ minHeight: '100vh', background: '#f5f6fa' }}>
      <Header
        style={{
          // ── Optik grid: tüm doğrudan çocuklar dikey merkezde ──
          display: 'flex',
          alignItems: 'center',
          gap: SECTION_GAP,
          // Vertical padding YOK → logo height:100% navbar'ın tam yüksekliğine snap olur
          paddingLeft: HEADER_PAD_X,
          paddingRight: HEADER_PAD_X,
          paddingTop: 0,
          paddingBottom: 0,
          height: HEADER_H,
          // Logo veya başka bir element navbar dışına taşmasın
          overflow: 'hidden',
          lineHeight: 'normal',
          background: '#0f1f45',
          borderBottom: '1px solid #1e3060',
        }}
      >
        {/* ── LOGO ─────────────────────────────────────────────────────────────
             Yapı: dış wrapper (padding) + iç clip wrapper (overflow:hidden) + img.
             Dış wrapper: yatay padding ile sağ/sol boşluğu dikey boşlukla dengeler;
               flex hücresi olarak çalışır, komşu elemanlar yalnızca padding miktarı
               kadar (yaklaşık 10px her yanda) kayar — menü flex:1 ile absorbe eder.
             İç wrapper: overflow:hidden PNG'nin beyaz kenarlıklarını kırpar;
               boyutları sabit kalır → logo görünümü hiç değişmez.
             Img: scale + transformOrigin tamamen korunur. */}
        <div
          onClick={() => navigate('/teklifler')}
          style={{
            flexShrink: 0,
            cursor: 'pointer',
            userSelect: 'none',
            display: 'flex',
            alignItems: 'center',
            // Yatay padding — dikey "breathing room" (~9–10 px) ile görsel denge
            paddingLeft: 10,
            paddingRight: 10,
          }}
        >
          {/* Kırpma katmanı — overflow:hidden yalnızca bu div'e uygulanır;
              böylece padding alanı temiz navbar rengi (#0f1f45) gösterir */}
          <div
            style={{
              height: HEADER_H,
              overflow: 'hidden',
              display: 'flex',
              alignItems: 'center',
            }}
          >
            <img
              src="/logo-meba.png"
              alt="MEBA Mekanik"
              draggable={false}
              style={{
                height: HEADER_H,
                width: 'auto',
                display: 'block',
                imageRendering: 'auto',
                transform: 'scale(1.17)',
                transformOrigin: '42% 0%',
              }}
            />
          </div>
        </div>

        {/* ── NAVIGATION ── */}
        <Menu
          theme="dark"
          mode="horizontal"
          selectedKeys={[seciliMenu]}
          className="header-nav-menu"
          style={{
            flex: 1,
            minWidth: 0,
            borderBottom: 'none',
            background: 'transparent',
          }}
          items={[
            {
              key: 'teklifler',
              icon: <FileTextOutlined />,
              label: 'Teklif Yönetimi',
              onClick: () => navigate('/teklifler'),
            },
            {
              key: 'veri',
              icon: <DatabaseOutlined />,
              label: 'Veri Yönetimi',
              onClick: () => navigate('/veri'),
            },
          ]}
        />

        {/* ── USER AREA — avatar + isim/ünvan + çıkış, hepsi dikey merkezde ── */}
        {aktifKullanici && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: USER_INNER_GAP,
              paddingLeft: 16,
              borderLeft: '1px solid rgba(255,255,255,0.08)',
              flexShrink: 0,
              height: '60%',
            }}
          >
            {/* Avatar */}
            <div
              style={{
                width: 32,
                height: 32,
                borderRadius: '50%',
                background: isYonetici ? 'rgba(251,191,36,0.18)' : 'rgba(59,130,246,0.20)',
                border: `1px solid ${isYonetici ? 'rgba(251,191,36,0.45)' : 'rgba(59,130,246,0.45)'}`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 11,
                fontWeight: 700,
                color: isYonetici ? '#fbbf24' : '#93c5fd',
                flexShrink: 0,
                fontFamily: '"Arial", sans-serif',
                letterSpacing: 0.5,
              }}
            >
              {aktifKullanici.initials}
            </div>

            {/* İsim + ünvan bloğu — flex column center, gap 2 */}
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                gap: 2,
                lineHeight: 1.15,
              }}
            >
              <div
                style={{
                  fontSize: 12,
                  fontWeight: 600,
                  color: '#e2e8f0',
                  whiteSpace: 'nowrap',
                }}
              >
                {aktifKullanici.adSoyad}
              </div>
              <div
                style={{
                  fontSize: 10,
                  color: isYonetici ? 'rgba(251,191,36,0.75)' : 'rgba(148,163,184,0.85)',
                  whiteSpace: 'nowrap',
                  letterSpacing: 0.3,
                }}
              >
                {aktifKullanici.unvan}
              </div>
            </div>

            {/* Çıkış butonu */}
            <Tooltip title="Çıkış Yap">
              <Button
                type="text"
                icon={<LogoutOutlined />}
                onClick={cikisYap}
                size="small"
                style={{
                  color: 'rgba(148,163,184,0.8)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              />
            </Tooltip>
          </div>
        )}
      </Header>
      <Content style={{ background: '#f5f6fa' }}>
        <Outlet />
      </Content>
    </Layout>
  );
}
