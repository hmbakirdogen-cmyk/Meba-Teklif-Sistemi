import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { Layout, Menu, Tooltip, Button } from 'antd';
import { FileTextOutlined, DatabaseOutlined, LogoutOutlined } from '@ant-design/icons';
import { useKullanici } from './context/KullaniciContext';

const { Header, Content } = Layout;

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
          display: 'flex',
          alignItems: 'center',
          padding: '0 32px',
          gap: 0,
          background: '#0f1f45',
          borderBottom: '1px solid #1e3060',
          height: 52,
          lineHeight: '52px',
        }}
      >
        {/* Logo */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            marginRight: 40,
            cursor: 'pointer',
            userSelect: 'none',
            lineHeight: 0,
          }}
          onClick={() => navigate('/teklifler')}
        >
          <img
            src="/logo-meba.png"
            alt="MEBA Mekanik"
            style={{
              maxHeight: 40,
              width: 'auto',
              height: 'auto',
              display: 'block',
              verticalAlign: 'middle',
              imageRendering: '-webkit-optimize-contrast',
            }}
          />
        </div>

        {/* Navigation */}
        <Menu
          theme="dark"
          mode="horizontal"
          selectedKeys={[seciliMenu]}
          style={{
            flex: 1,
            borderBottom: 'none',
            background: 'transparent',
            lineHeight: '52px',
          }}
          items={[
            {
              key: 'teklifler',
              icon: <FileTextOutlined style={{ fontSize: 13 }} />,
              label: 'Teklif Yönetimi',
              onClick: () => navigate('/teklifler'),
            },
            {
              key: 'veri',
              icon: <DatabaseOutlined style={{ fontSize: 13 }} />,
              label: 'Veri Yönetimi',
              onClick: () => navigate('/veri'),
            },
          ]}
        />

        {/* Active User Area */}
        {aktifKullanici && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              paddingLeft: 16,
              borderLeft: '1px solid rgba(255,255,255,0.07)',
            }}
          >
            <div
              style={{
                width: 30,
                height: 30,
                borderRadius: '50%',
                background: isYonetici ? 'rgba(251,191,36,0.18)' : 'rgba(59,130,246,0.2)',
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
            <div style={{ lineHeight: 1 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: '#e2e8f0', whiteSpace: 'nowrap' }}>
                {aktifKullanici.adSoyad}
              </div>
              <div style={{ fontSize: 10, color: isYonetici ? 'rgba(251,191,36,0.7)' : 'rgba(100,116,139,0.8)', whiteSpace: 'nowrap', letterSpacing: 0.3 }}>
                {aktifKullanici.unvan}
              </div>
            </div>
            <Tooltip title="Çıkış Yap">
              <Button
                type="text"
                icon={<LogoutOutlined />}
                onClick={cikisYap}
                size="small"
                style={{ color: 'rgba(100,116,139,0.7)', marginLeft: 4 }}
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
