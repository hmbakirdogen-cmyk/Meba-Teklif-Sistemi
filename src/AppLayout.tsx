import { useState } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { Layout, Menu, Tooltip, Button, Drawer } from 'antd';
import {
  FileTextOutlined, DatabaseOutlined, LogoutOutlined, MenuOutlined,
  MoonOutlined, SunOutlined,
} from '@ant-design/icons';
import { useKullanici } from './context/useKullanici';
import { useTheme } from './context/useTheme';
import { useColors } from './hooks/useColors';
import { useIsMobile } from './hooks/useIsMobile';
import { buttonClassNames } from './styles/buttonStyles';

const { Header, Content } = Layout;

const HEADER_H     = 56;
const HEADER_PAD_X = 24;
const SECTION_GAP  = 32;
const USER_INNER_GAP = 12;

export default function AppLayout() {
  const navigate   = useNavigate();
  const location   = useLocation();
  const { aktifKullanici, cikisYap } = useKullanici();
  const { isDark, temaToggle } = useTheme();
  const C          = useColors();
  const isMobile   = useIsMobile(768);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const seciliMenu = location.pathname.startsWith('/veri') ? 'veri' : 'teklifler';
  const isYonetici = aktifKullanici?.rol === 'admin';

  function navigate_(path: string) {
    setDrawerOpen(false);
    navigate(path);
  }

  const menuItems = [
    {
      key: 'teklifler',
      icon: <FileTextOutlined />,
      label: 'Teklif Yönetimi',
      onClick: () => navigate_('/teklifler'),
    },
    {
      key: 'veri',
      icon: <DatabaseOutlined />,
      label: 'Veri Yönetimi',
      onClick: () => navigate_('/veri'),
    },
  ];

  return (
    <Layout style={{ minHeight: '100vh', background: C.bgBody }}>
      <Header
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: isMobile ? 0 : SECTION_GAP,
          paddingLeft: isMobile ? 6 : HEADER_PAD_X,
          paddingRight: isMobile ? 6 : HEADER_PAD_X,
          paddingTop: 0,
          paddingBottom: 0,
          height: HEADER_H,
          overflow: 'hidden',
          lineHeight: 'normal',
          background: C.bgHeader,
          borderBottom: `1px solid ${C.bgHeaderBorder}`,
          fontSize: isMobile ? 18 : 16,
          minWidth: 0,
          width: '100vw',
          boxSizing: 'border-box',
        }}
      >
        {/* ── LOGO ── */}
        <div
          onClick={() => navigate('/teklifler')}
          style={{
            flexShrink: 0,
            cursor: 'pointer',
            userSelect: 'none',
            display: 'flex',
            alignItems: 'center',
            paddingLeft: isMobile ? 4 : 10,
            paddingRight: isMobile ? 4 : 10,
          }}
        >
          <div style={{
            height: HEADER_H - 14,
            display: 'flex',
            alignItems: 'center',
            background: '#fff',
            borderRadius: 10,
            padding: '0 8px',
            overflow: 'hidden',
          }}>
            <img
              src="/logo-meba.png"
              alt="MEBA Mekanik"
              draggable={false}
              style={{
                height: '100%',
                width: 'auto',
                display: 'block',
                imageRendering: 'auto',
                transform: 'scale(1.17)',
                transformOrigin: '42% 50%',
              }}
            />
          </div>
        </div>

        {/* ── DESKTOP NAV ── */}
        {!isMobile && (
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
            items={menuItems}
          />
        )}

        {/* ── SPACER (mobile) ── */}
        {isMobile && <div style={{ flex: 1 }} />}

        {/* ── TEMA TOGGLE ── */}
        <Tooltip title={isDark ? 'Aydınlık Mod' : 'Koyu Mod'} placement="bottomRight">
          <Button
            type="text"
            icon={isDark ? <SunOutlined /> : <MoonOutlined />}
            onClick={temaToggle}
            size="small"
            className={buttonClassNames.iconGhostSmall}
            style={{
              color: isDark ? 'rgba(253,224,120,0.80)' : 'rgba(148,163,184,0.80)',
              flexShrink: 0,
            }}
          />
        </Tooltip>

        {/* ── USER AREA ── */}
        {aktifKullanici && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: USER_INNER_GAP,
              paddingLeft: isMobile ? 8 : 16,
              borderLeft: isMobile ? 'none' : '1px solid rgba(255,255,255,0.08)',
              flexShrink: 0,
              height: '60%',
            }}
          >
            {/* Avatar */}
            <div
              style={{
                width: 32, height: 32, borderRadius: '50%',
                background: isYonetici ? 'rgba(251,191,36,0.18)' : 'rgba(59,130,246,0.20)',
                border: `1px solid ${isYonetici ? 'rgba(251,191,36,0.45)' : 'rgba(59,130,246,0.45)'}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 11, fontWeight: 700,
                color: isYonetici ? '#fbbf24' : '#93c5fd',
                flexShrink: 0,
                fontFamily: '"Arial", sans-serif',
                letterSpacing: 0.5,
              }}
            >
              {aktifKullanici.initials}
            </div>

            {/* İsim — sadece desktop */}
            {!isMobile && (
              <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 2, lineHeight: 1.15 }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: '#e2e8f0', whiteSpace: 'nowrap' }}>
                  {aktifKullanici.adSoyad}
                </div>
                <div style={{
                  fontSize: 10,
                  color: isYonetici ? 'rgba(251,191,36,0.75)' : 'rgba(148,163,184,0.85)',
                  whiteSpace: 'nowrap', letterSpacing: 0.3,
                }}>
                  {aktifKullanici.unvan}
                </div>
              </div>
            )}

            {/* Çıkış */}
            <Tooltip title="Çıkış Yap">
              <Button
                type="text"
                icon={<LogoutOutlined />}
                onClick={cikisYap}
                size="small"
                className={buttonClassNames.iconGhostSmall}
                style={{ color: 'rgba(148,163,184,0.8)' }}
              />
            </Tooltip>
          </div>
        )}

        {/* ── HAMBURGER — sadece mobile ── */}
        {isMobile && (
          <Button
            type="text"
            icon={<MenuOutlined />}
            onClick={() => setDrawerOpen(true)}
            className={buttonClassNames.iconGhost}
            style={{ color: 'rgba(255,255,255,0.85)', fontSize: 18, marginLeft: 4 }}
          />
        )}
      </Header>

      {/* ── MOBİLE DRAWER ── */}
      <Drawer
        title={
          <span style={{ color: C.textPrimary, fontWeight: 700, fontSize: 15 }}>Menü</span>
        }
        placement="right"
        onClose={() => setDrawerOpen(false)}
        open={drawerOpen}
        width={240}
        styles={{ body: { padding: 0 } }}
      >
        <Menu
          mode="inline"
          selectedKeys={[seciliMenu]}
          style={{ borderRight: 'none', fontSize: 14 }}
          items={menuItems}
        />
        {aktifKullanici && (
          <div style={{ padding: '16px 24px', borderTop: `1px solid ${C.borderSubtle}`, marginTop: 8 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: C.textPrimary, marginBottom: 2, letterSpacing: '-0.01em' }}>
              {aktifKullanici.adSoyad}
            </div>
            <div style={{ fontSize: 11, color: C.textSecondary, fontWeight: 400, marginBottom: 14 }}>
              {aktifKullanici.unvan}
            </div>
            {/* Drawer içi tema toggle */}
            <Button
              block
              size="small"
              icon={isDark ? <SunOutlined /> : <MoonOutlined />}
              onClick={temaToggle}
              className={buttonClassNames.secondarySmall}
              style={{ marginBottom: 8 }}
            >
              {isDark ? 'Aydınlık Mod' : 'Koyu Mod'}
            </Button>
            <Button
              danger
              size="small"
              icon={<LogoutOutlined />}
              onClick={() => { setDrawerOpen(false); cikisYap(); }}
              className={buttonClassNames.dangerSmall}
              block
            >
              Çıkış Yap
            </Button>
          </div>
        )}
      </Drawer>

      <Content style={{ background: C.bgBody }}>
        <Outlet />
      </Content>
    </Layout>
  );
}
