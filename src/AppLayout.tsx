import { useState } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { Layout, Menu, Tooltip, Button, Drawer, Dropdown } from 'antd';
import ProfilFotoModal from './components/ProfilFotoModal';
import {
  FileTextOutlined, DatabaseOutlined, LogoutOutlined, MenuOutlined,
  MoonOutlined, SunOutlined, TeamOutlined, BankOutlined, SwapOutlined,
  CheckOutlined,
} from '@ant-design/icons';
import { useKullanici } from './context/useKullanici';
import { useFirma } from './context/useFirma';
import { useTheme } from './context/useTheme';
import { formatAdSoyad, formatUnvan } from './utils/formatters';
import { useColors } from './hooks/useColors';
import { useIsMobile } from './hooks/useIsMobile';
import { buttonClassNames } from './styles/buttonStyles';
import { SyncStatusBar } from './components/SyncStatusBar';

const { Header, Content } = Layout;

const HEADER_H     = 56;
const HEADER_PAD_X = 24;
const SECTION_GAP  = 32;
const USER_INNER_GAP = 12;

// Header logosu (152x40, 3.8:1 oran) icin firma-bazli scale override.
// db.json'daki global logoScale degerleri kare LogoContainer icin tunelendi;
// genis header kutusunda ELMOS (1.50:1) ve MESA (1.63:1) yeterince
// dolduramiyordu — MEBA (2.95:1) gibi gozlenir kapsama icin override.
const HEADER_LOGO_SCALE: Record<string, number> = {
  meba: 1.0,
  elmos: 2.0,
  mesa: 1.85,
};

export default function AppLayout() {
  const navigate   = useNavigate();
  const location   = useLocation();
  const { aktifKullanici, cikisYap } = useKullanici();
  const { aktifFirma, firmalar, setAktifFirma } = useFirma();
  const { isDark, temaToggle } = useTheme();
  const C          = useColors();
  const isMobile   = useIsMobile(768);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [profilFotoModalOpen, setProfilFotoModalOpen] = useState(false);

  const seciliMenu =
    location.pathname.startsWith('/veri') ? 'veri'
    : location.pathname.startsWith('/personel') ? 'personel'
    : location.pathname.startsWith('/firma-profili') ? 'firma-profili'
    : 'teklifler';
  const rol = aktifKullanici?.rol;
  const isAdminLike = rol === 'super_admin' || rol === 'firma_admin' || rol === 'admin';
  const isYonetici = isAdminLike;
  // Firma degistirme yetkisi: sadece tum-firmalara erisen roller (super_admin, admin).
  // firma_admin tek firmaya bagli oldugu icin gormez.
  const tumFirmalaraErisir = rol === 'super_admin' || rol === 'admin';

  function navigate_(path: string) {
    setDrawerOpen(false);
    navigate(path);
  }

  function firmaDegistir(yeniFirmaId: string) {
    if (yeniFirmaId === aktifFirma?.id) return;
    setAktifFirma(yeniFirmaId);
    // Sayfa state'leri (teklif listesi, cariler, urunler vs.) yeni firmaId ile
    // tekrar fetch edilmeli — en temiz yol full reload. Az sayida admin var,
    // gun icinde 1-2 kere yapilir, kabul edilebilir tradeoff.
    setTimeout(() => window.location.reload(), 50);
  }

  const menuItems = [
    {
      key: 'teklifler',
      icon: <FileTextOutlined />,
      label: 'Teklif Yönetimi',
      onClick: () => navigate_('/teklifler'),
    },
    ...(isAdminLike ? [
      {
        key: 'veri',
        icon: <DatabaseOutlined />,
        label: 'Veri Yönetimi',
        onClick: () => navigate_('/veri'),
      },
      {
        key: 'personel',
        icon: <TeamOutlined />,
        label: 'Personel',
        onClick: () => navigate_('/personel'),
      },
      {
        key: 'firma-profili',
        icon: <BankOutlined />,
        label: 'Firma Profili',
        onClick: () => navigate_('/firma-profili'),
      },
    ] : []),
  ];

  return (
    <Layout style={{ minHeight: '100vh', background: C.bgBody, backgroundAttachment: 'fixed' }}>
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
          width: '100%',
          boxSizing: 'border-box',
          position: 'sticky',
          top: 0,
          zIndex: 200,
        }}
      >
        {/* ── LOGO + FIRMA SWITCHER ── */}
        {(() => {
          // Header'a ozgu scale: per-firma override map'inden veya legacy logoScale
          const headerScale = aktifFirma
            ? (HEADER_LOGO_SCALE[aktifFirma.id] ?? aktifFirma.logoScale ?? 1)
            : 1;
          const logoBlock = (
            <>
              <div style={{
                height: HEADER_H - 8,
                width: 160,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: '#fff',
                borderRadius: 10,
                padding: '4px 10px',
                boxSizing: 'border-box',
                overflow: 'hidden',
              }}>
                <img
                  src={aktifFirma?.logoPath || '/logo-meba.png'}
                  alt={aktifFirma?.kisaAd || 'Logo'}
                  draggable={false}
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'contain',
                    display: 'block',
                    imageRendering: 'auto',
                    WebkitBackfaceVisibility: 'hidden',
                    backfaceVisibility: 'hidden',
                    transform: `scale(${headerScale}) translateZ(0)`,
                    transformOrigin: 'center',
                  }}
                />
              </div>
              {aktifFirma && !isMobile && (
                <div style={{
                  marginLeft: 12, fontSize: 10, color: 'rgba(170,190,220,0.55)',
                  letterSpacing: 1.2, textTransform: 'uppercase' as const,
                  fontWeight: 500, display: 'flex', alignItems: 'center', gap: 6,
                }}>
                  <span>{aktifFirma.kisaAd}</span>
                  {tumFirmalaraErisir && firmalar.length > 1 && (
                    <SwapOutlined style={{ fontSize: 11, color: 'rgba(170,190,220,0.65)' }} />
                  )}
                </div>
              )}
            </>
          );

          const baseStyle = {
            flexShrink: 0,
            cursor: 'pointer',
            userSelect: 'none' as const,
            display: 'flex',
            alignItems: 'center',
            paddingLeft: isMobile ? 4 : 10,
            paddingRight: isMobile ? 4 : 10,
          };

          // Yöneticiler (super_admin + admin) icin: logo bloku Dropdown ile sarilir.
          // Default firmalari profil atamasi ile gelir; istedikleri an switcher
          // ile diger firmalara gecebilirler.
          if (tumFirmalaraErisir && firmalar.length > 1) {
            const sortedFirmalar = ['meba', 'elmos', 'mesa']
              .map((id) => firmalar.find((f) => f.id === id))
              .filter((f): f is NonNullable<typeof f> => Boolean(f));
            return (
              <Dropdown
                trigger={['click']}
                menu={{
                  onClick: ({ key }) => firmaDegistir(String(key)),
                  items: sortedFirmalar.map((f) => ({
                    key: f.id,
                    label: (
                      <div style={{
                        display: 'flex', alignItems: 'center', gap: 10,
                        minWidth: 180,
                      }}>
                        <div style={{
                          width: 28, height: 28, borderRadius: 6,
                          background: '#fff', padding: 2,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          flexShrink: 0,
                        }}>
                          <img
                            src={f.logoPath}
                            alt={f.kisaAd}
                            style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                          />
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{
                            fontSize: 13, fontWeight: 600,
                            color: f.id === aktifFirma?.id ? f.renkVurgu : undefined,
                          }}>
                            {f.kisaAd}
                          </div>
                          <div style={{ fontSize: 10, color: 'rgba(120,140,170,0.85)' }}>
                            {f.ad}
                          </div>
                        </div>
                        {f.id === aktifFirma?.id && (
                          <CheckOutlined style={{ color: f.renkVurgu, fontSize: 12 }} />
                        )}
                      </div>
                    ),
                  })),
                }}
                placement="bottomLeft"
              >
                <div style={baseStyle} title="Firma değiştir">
                  {logoBlock}
                </div>
              </Dropdown>
            );
          }

          // Diger roller: logoya tikla → /teklifler (eski davranis)
          return (
            <div onClick={() => navigate('/teklifler')} style={baseStyle}>
              {logoBlock}
            </div>
          );
        })()}

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

        {/* ── SYNC STATUS BAR (sadece desktop, header sağında) ── */}
        {!isMobile && <SyncStatusBar />}

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
        {aktifKullanici && !isMobile && (
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
            {/* Avatar — VESIKALIK 3:4, tiklanabilir → profil foto guncelleme modal'i */}
            <Tooltip title="Profil fotoğrafını güncelle" placement="bottom">
              <button
                type="button"
                onClick={() => setProfilFotoModalOpen(true)}
                aria-label="Profil fotoğrafını güncelle"
                style={{
                  padding: 0, margin: 0,
                  background: 'transparent', border: 'none',
                  cursor: 'pointer', flexShrink: 0,
                  borderRadius: 6, lineHeight: 0,
                  transition: 'transform 0.15s ease, box-shadow 0.18s ease',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'scale(1.05)';
                  e.currentTarget.style.boxShadow = `0 0 0 2px ${isYonetici ? 'rgba(251,191,36,0.32)' : 'rgba(59,130,246,0.32)'}`;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'scale(1)';
                  e.currentTarget.style.boxShadow = 'none';
                }}
              >
                {aktifKullanici.profilFotoUrl ? (
                  <img
                    src={aktifKullanici.profilFotoUrl}
                    alt={formatAdSoyad(aktifKullanici.adSoyad)}
                    style={{
                      width: 27, height: 36, borderRadius: 6,
                      objectFit: 'cover', objectPosition: 'center top',
                      border: `1px solid ${isYonetici ? 'rgba(251,191,36,0.45)' : 'rgba(59,130,246,0.45)'}`,
                      display: 'block',
                    }}
                  />
                ) : (
                  <div style={{
                    width: 27, height: 36, borderRadius: 6,
                    background: isYonetici ? 'rgba(251,191,36,0.18)' : 'rgba(59,130,246,0.20)',
                    border: `1px solid ${isYonetici ? 'rgba(251,191,36,0.45)' : 'rgba(59,130,246,0.45)'}`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 11, fontWeight: 700,
                    color: isYonetici ? '#fbbf24' : '#93c5fd',
                    fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Text", "SF Pro Display", "Helvetica Neue", "Inter", "Arial", sans-serif',
                    letterSpacing: 0.5,
                  }}>
                    {aktifKullanici.initials}
                  </div>
                )}
              </button>
            </Tooltip>

            {/* İsim — sadece desktop */}
            <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 2, lineHeight: 1.15, maxWidth: 220 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: '#e2e8f0', wordBreak: 'break-word' }}>
                {formatAdSoyad(aktifKullanici.adSoyad)}
              </div>
              <div style={{
                fontSize: 10,
                color: isYonetici ? 'rgba(251,191,36,0.75)' : 'rgba(148,163,184,0.85)',
                letterSpacing: 0.3, wordBreak: 'break-word',
              }}>
                {formatUnvan(aktifKullanici.unvan)}
              </div>
            </div>

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
            style={{ color: 'rgba(255,255,255,0.85)', fontSize: 18, marginLeft: 2 }}
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
        size={240}
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
              {formatAdSoyad(aktifKullanici.adSoyad)}
            </div>
            <div style={{ fontSize: 11, color: C.textSecondary, fontWeight: 400, marginBottom: 14 }}>
              {formatUnvan(aktifKullanici.unvan)}
            </div>

            {/* Firma degistirici (sadece super_admin / admin) */}
            {tumFirmalaraErisir && firmalar.length > 1 && (
              <div style={{ marginBottom: 12 }}>
                <div style={{
                  fontSize: 10, color: C.textSecondary, letterSpacing: 1,
                  textTransform: 'uppercase', marginBottom: 6, fontWeight: 600,
                }}>
                  Aktif Firma
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {['meba', 'elmos', 'mesa']
                    .map((id) => firmalar.find((f) => f.id === id))
                    .filter((f): f is NonNullable<typeof f> => Boolean(f))
                    .map((f) => {
                      const aktif = f.id === aktifFirma?.id;
                      return (
                        <button
                          key={f.id}
                          onClick={() => {
                            setDrawerOpen(false);
                            firmaDegistir(f.id);
                          }}
                          style={{
                            display: 'flex', alignItems: 'center', gap: 8,
                            padding: '8px 10px', borderRadius: 8,
                            border: `1px solid ${aktif ? f.renkVurgu : C.borderSubtle}`,
                            background: aktif ? `${f.renkVurgu}14` : 'transparent',
                            color: aktif ? f.renkVurgu : C.textPrimary,
                            cursor: 'pointer', fontSize: 12, fontWeight: 600,
                            letterSpacing: 0.3, textAlign: 'left',
                          }}
                        >
                          <div style={{
                            width: 22, height: 22, borderRadius: 4,
                            background: '#fff', padding: 1,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            flexShrink: 0,
                          }}>
                            <img src={f.logoPath} alt="" style={{
                              width: '100%', height: '100%', objectFit: 'contain',
                            }} />
                          </div>
                          <span style={{ flex: 1 }}>{f.kisaAd}</span>
                          {aktif && <CheckOutlined style={{ fontSize: 11 }} />}
                        </button>
                      );
                    })}
                </div>
              </div>
            )}

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

      <Content style={{ background: 'transparent' }}>
        <Outlet />
      </Content>

      {/* Profil fotosu guncelleme modal'i (header avatar tiklanmasi ile acilir) */}
      <ProfilFotoModal
        open={profilFotoModalOpen}
        onClose={() => setProfilFotoModalOpen(false)}
      />
    </Layout>
  );
}
