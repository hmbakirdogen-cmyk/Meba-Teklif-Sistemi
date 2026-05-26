import { useState, useCallback } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { App, Layout, Menu, Tooltip, Button, Drawer, Dropdown, Badge, Popover } from 'antd';
import ProfilFotoModal from './components/ProfilFotoModal';
import ProfilDuzenleModal from './components/ProfilDuzenleModal';
import SelfServeSmtpModal from './components/SelfServeSmtpModal';
import GlobalRehberFab from './components/GlobalRehberFab';
import GlobalTipSpotlight from './components/GlobalTipSpotlight';
import GeriBildirimButonu from './components/GeriBildirimButonu';
import GeriBildirimDrawer from './components/GeriBildirimDrawer';
import BildirimPaneli from './components/BildirimPaneli';
import { bildirimService } from './services/bildirimService';
import { isSuperAdmin } from './utils/yetkiUtils';
import { useEffect } from 'react';
import { api } from './services/apiClient';
import { Icon } from '@iconify/react';
import { useKullanici } from './context/useKullanici';
import { useFirma } from './context/useFirma';
import { useTheme } from './context/useTheme';
import { formatAdSoyad, formatUnvan } from './utils/formatters';
import { isYonetici, tumFirmalaraErisir } from './utils/yetkiUtils';
import { useColors } from './hooks/useColors';
import { useIsMobile } from './hooks/useIsMobile';
import { usePWAInstall } from './hooks/usePWAInstall';
import { buttonClassNames } from './styles/buttonStyles';
import { getAdaptiveLogoPlacement } from './styles/logoStyles';
import { SyncStatusBar } from './components/SyncStatusBar';
import EditableFieldContextMenu from './components/EditableFieldContextMenu';

const { Header, Content } = Layout;

const HEADER_H     = 56;
const HEADER_PAD_X = 24;
const SECTION_GAP  = 32;
const USER_INNER_GAP = 12;
export default function AppLayout() {
  const navigate   = useNavigate();
  const location   = useLocation();
  const { modal }  = App.useApp();
  const { aktifKullanici, cikisYap, refreshKullanici } = useKullanici();
  const { aktifFirma, firmalar, setAktifFirma } = useFirma();
  const { isDark, temaToggle } = useTheme();
  const C          = useColors();
  const isMobile   = useIsMobile(768);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [profilFotoModalOpen, setProfilFotoModalOpen] = useState(false);
  const [profilDuzenleOpen, setProfilDuzenleOpen] = useState(false);
  // SMTP kurulum sihirbazı — banner'dan tetiklenir
  const [smtpSetupOpen, setSmtpSetupOpen] = useState(false);
  const [adminGbDrawerAcik, setAdminGbDrawerAcik] = useState(false);
  const [okunmamisGb, setOkunmamisGb] = useState(0);
  const [bildirimDrawerAcik, setBildirimDrawerAcik] = useState(false);
  const [okunmamisBildirim, setOkunmamisBildirim] = useState(0);
  const adminMi = isSuperAdmin(aktifKullanici?.rol);

  // Süper admin için okunmamış geri bildirim sayısı — periyodik refresh.
  useEffect(() => {
    if (!adminMi) return;
    let aktif = true;
    const yukle = async () => {
      try {
        const liste = await api.geriBildirimler.list();
        if (!aktif) return;
        setOkunmamisGb(liste.filter((g) => !g.okundu).length);
      } catch {
        /* sessiz */
      }
    };
    void yukle();
    const id = window.setInterval(yukle, 30000);
    return () => { aktif = false; window.clearInterval(id); };
  }, [adminMi, adminGbDrawerAcik]);

  // ── Ahmet ESMERAY ozel karsilamasi (firma switcher fix bildirimi) ──
  // Tek seferlik — adi gecen kullanici programi ilk kez actiginda otomatik
  // acilir. localStorage flag'i ile gosterildi/gosterilmedi takip edilir.
  // Espirili ton: bug duzeltildi mesaji + geri bildirim istegi.
  useEffect(() => {
    if (!aktifKullanici) return;
    const adKontrol = String(aktifKullanici.adSoyad || '').toLocaleLowerCase('tr-TR');
    const ahmetMi = adKontrol.includes('ahmet') && adKontrol.includes('esmeray');
    if (!ahmetMi) return;
    const flagKey = `meba_ahmet_firma_switcher_welcome_${aktifKullanici.id}`;
    if (typeof window === 'undefined') return;
    if (window.localStorage.getItem(flagKey) === '1') return;
    // Modal'i bir sonraki tick'te ac — login redirect race'inden kacin
    const timer = window.setTimeout(() => {
      modal.success({
        title: 'Hadi işin oldu Ahmet abi! 🎉',
        width: 520,
        centered: true,
        okText: '😊 Anladım, deneyeceğim',
        content: (
          <div style={{ fontSize: 14, lineHeight: 1.65, paddingTop: 8 }}>
            <p style={{ marginTop: 0, marginBottom: 12 }}>
              Senin uzun süredir canını sıkan o <b>"logoya bastım MEBA seçtim ama Elmos'a geri döndü"</b> bug'ını sonunda yakaladık 🐛
            </p>
            <div style={{
              background: 'linear-gradient(135deg, rgba(99,179,237,0.10) 0%, rgba(159,140,232,0.07) 100%)',
              border: '1px solid rgba(99,179,237,0.25)',
              borderLeft: '3px solid #5b8def',
              borderRadius: 8,
              padding: '10px 14px',
              marginBottom: 14,
            }}>
              <div style={{ fontWeight: 600, color: '#1e3a8a', marginBottom: 4 }}>
                ✓ Çözüldü — Frontend + Backend birlikte
              </div>
              <div style={{ color: '#475569', fontSize: 13 }}>
                Artık logo'ya tıkla, dropdown'dan <b>MEBA</b> veya <b>MESA</b> seç → orada kalır, geri dönmez.
              </div>
            </div>
            <p style={{ marginBottom: 10 }}>
              <b>Önemli:</b> Eğer hâlâ Elmos'a geri dönüyorsa programdan tamamen çık, 1 dakika bekle, tekrar aç (cache temizliği için).
            </p>
            <p style={{ marginBottom: 8, fontSize: 13.5 }}>
              <i>Just try it. Pls send me back if it's ok or not</i> — eğer hâlâ sıkıntı varsa Mehmet abiye söyle, hızlıca bakarız 🙌
            </p>
            <p style={{ marginBottom: 0, fontSize: 12, color: '#94a3b8', fontStyle: 'italic', textAlign: 'right' }}>
              — MEBA · MESA · ELMOS Teklif Sistemi
            </p>
          </div>
        ),
        onOk: () => {
          window.localStorage.setItem(flagKey, '1');
        },
      });
    }, 800);
    return () => window.clearTimeout(timer);
  }, [aktifKullanici, modal]);

  // Tum kullanicilar icin okunmamis bildirim sayisi (atama/teklif olaylari).
  useEffect(() => {
    if (!aktifKullanici) return;
    let aktif = true;
    const yukle = async () => {
      try {
        const liste = await bildirimService.bildirimlerGetir();
        if (!aktif) return;
        setOkunmamisBildirim(bildirimService.okunmamisSayisi(liste));
      } catch {
        /* sessiz */
      }
    };
    void yukle();
    const id = window.setInterval(yukle, 30000);
    return () => { aktif = false; window.clearInterval(id); };
  }, [aktifKullanici, bildirimDrawerAcik]);

  const seciliMenu =
    location.pathname.startsWith('/analiz') ? 'analiz'
    : location.pathname.startsWith('/veri') ? 'veri'
    : location.pathname.startsWith('/personel') ? 'personel'
    : location.pathname.startsWith('/firma-profili') ? 'firma-profili'
    : location.pathname.startsWith('/referans-veriler') ? 'referans-veriler'
    : 'teklifler';
  const rol = aktifKullanici?.rol;
  const isAdminLike = isYonetici(rol);
  // Firma değiştirme yetkisi: super_admin (tüm sistem) + firma_admin
  // (gosterilenFirmalar=3 firma → yönetim kurulu).
  const cokFirmaErisir = tumFirmalaraErisir(rol);

  // PWA — masaüstüne kurulum (sadece localhost veya HTTPS'de gözükür).
  const { canInstall, install, isInstalled } = usePWAInstall();

  // LAN HTTP üzerinden çalışan uzak istemcilerde tarayıcı `beforeinstallprompt`
  // event'ini fire etmez. Bu durumda yine de "Masaüstüne Ekle" butonu görünmeli;
  // tıklandığında manuel kurulum talimatlarını gösteren modal açılmalı.
  const isStandaloneApp = typeof window !== 'undefined'
    && window.matchMedia
    && window.matchMedia('(display-mode: standalone)').matches;
  const installButtonGorunsun = !isInstalled && !isStandaloneApp;

  const masaustuTalimatGoster = useCallback(() => {
    modal.info({
      title: 'Masaüstüne Ekle',
      width: 540,
      content: (
        <div style={{ lineHeight: 1.6, fontSize: 13 }}>
          <p style={{ marginTop: 0 }}>
            Bu sistemi masaüstü uygulaması gibi kullanmak için tarayıcınızdan
            kurulum yapabilirsiniz.
          </p>
          <p style={{ fontWeight: 600, marginBottom: 4 }}>Chrome / Edge (Windows):</p>
          <ol style={{ paddingLeft: 20, marginTop: 0 }}>
            <li>Sağ üstteki <b>⋮</b> menüsünü açın.</li>
            <li><b>Yayınla, kaydet ve paylaş</b> → <b>Sayfayı uygulama olarak yükle…</b> seçeneğine tıklayın.</li>
            <li>Açılan pencerede <b>Yükle</b>'yi onaylayın.</li>
            <li>Masaüstünüzde "Teklif" kısayolu oluşur; çift tıklayarak açabilirsiniz.</li>
          </ol>
          <p style={{ fontWeight: 600, marginBottom: 4 }}>Edge (alternatif):</p>
          <p style={{ marginTop: 0 }}>
            Adres çubuğunun sağındaki <b>monitör + indir</b> simgesine tıklayın → <b>Yükle</b>.
          </p>
          <p style={{ fontWeight: 600, marginBottom: 4 }}>Safari (iPhone / iPad):</p>
          <p style={{ marginTop: 0 }}>
            Paylaş simgesi → <b>Ana Ekrana Ekle</b>.
          </p>
          <p style={{ marginBottom: 0, color: C.textSecondary, fontSize: 12 }}>
            Not: Tarayıcınızda "Uygulama olarak yükle" seçeneği görünmüyorsa
            sayfayı sık kullanılanlara ekleyebilir veya işletim sistemi
            kısayolu oluşturabilirsiniz.
          </p>
        </div>
      ),
      okText: 'Tamam',
    });
  }, [modal, C.textSecondary]);

  const masaustuneEkleHandler = useCallback(() => {
    if (canInstall) {
      void install();
    } else {
      masaustuTalimatGoster();
    }
  }, [canInstall, install, masaustuTalimatGoster]);

  function navigate_(path: string) {
    setDrawerOpen(false);
    navigate(path);
  }

  function firmaDegistir(yeniFirmaId: string) {
    if (yeniFirmaId === aktifFirma?.id) return;
    setAktifFirma(yeniFirmaId);
    // Sayfa state'leri (teklif listesi, cariler, urunler vs.) yeni firmaId ile
    // tekrar fetch edilmeli — en temiz yol full reload. Sadece yöneticiler
    // (super_admin + firma_admin) bunu yapar, gun icinde 1-2 kere; kabul
    // edilebilir tradeoff.
    setTimeout(() => window.location.reload(), 50);
  }

  function cikisOnayla() {
    modal.confirm({
      title: 'Çıkış yapılsın mı?',
      content: 'Mevcut oturum sonlandırılacak.',
      okText: 'Çıkış Yap',
      cancelText: 'Vazgeç',
      okButtonProps: { danger: true },
      onOk: () => cikisYap(),
    });
  }

  const menuItems = [
    {
      key: 'teklifler',
      icon: <Icon icon="solar:bill-list-bold-duotone" width={17} height={17} />,
      label: 'Teklif Yönetimi',
      onClick: () => navigate_('/teklifler'),
    },
    {
      key: 'referans-veriler',
      icon: <Icon icon="solar:layers-minimalistic-bold-duotone" width={17} height={17} />,
      label: 'Referans Veriler',
      onClick: () => navigate_('/referans-veriler'),
    },
    ...(isAdminLike ? [
      {
        key: 'analiz',
        icon: <Icon icon="solar:diagram-up-bold-duotone" width={17} height={17} />,
        label: 'Analiz',
        onClick: () => navigate_('/analiz'),
      },
      {
        key: 'veri',
        icon: <Icon icon="solar:cloud-storage-bold-duotone" width={17} height={17} />,
        label: 'Veri Yönetimi',
        onClick: () => navigate_('/veri'),
      },
      {
        key: 'personel',
        icon: <Icon icon="solar:users-group-two-rounded-bold-duotone" width={17} height={17} />,
        label: 'Personel',
        onClick: () => navigate_('/personel'),
      },
      {
        key: 'firma-profili',
        icon: <Icon icon="solar:home-2-bold-duotone" width={17} height={17} />,
        label: 'Firma Profili',
        onClick: () => navigate_('/firma-profili'),
      },
    ] : []),
  ];

  return (
    <Layout style={{ minHeight: '100vh', background: C.bgBody, backgroundAttachment: 'fixed' }}>
      <Header
        className="premium-navbar"
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
          const activeLogoPath = aktifFirma?.logoPath || '/logo-meba.png';
          const activeLogoPlacement = getAdaptiveLogoPlacement({
            firmaId: aktifFirma?.id,
            logoPath: activeLogoPath,
            surface: 'navbar',
            objectPosition: 'center',
          });
          const logoBlock = (
            <>
              <div style={activeLogoPlacement.slotStyle}>
                <img
                  src={activeLogoPath}
                  alt={aktifFirma?.kisaAd || 'Logo'}
                  draggable={false}
                  style={activeLogoPlacement.imageStyle}
                />
              </div>
              {/* Logo yanı firma kısa adı — sadece tek-firmalı kullanıcılarda
                  görünür. Yöneticiler (cokFirmaErisir) zaten logoyu tıklayıp
                  firma değiştiriyor; logoda firma görseli var, yanına ekstra
                  ad yazmak tekrar oluyordu. */}
              {aktifFirma && !isMobile && !cokFirmaErisir && (
                <div style={{
                  marginLeft: activeLogoPlacement.labelGapPx, fontSize: 10, color: 'rgba(170,190,220,0.55)',
                  letterSpacing: 1.2, textTransform: 'uppercase' as const,
                  fontWeight: 500, display: 'flex', alignItems: 'center', gap: 6,
                }}>
                  <span>{aktifFirma.kisaAd}</span>
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

          // Yöneticiler (super_admin + firma_admin) icin: logo bloku Dropdown ile sarilir.
          // firma_admin (yönetim kurulu) gosterilenFirmalar ile 3 firmaya erişir;
          // istedikleri an switcher ile diger firmalara gecebilirler.
          if (cokFirmaErisir && firmalar.length > 1) {
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
                      (() => {
                        const switcherLogo = getAdaptiveLogoPlacement({
                          firmaId: f.id,
                          logoPath: f.logoPath,
                          surface: 'navbar-switcher',
                          objectPosition: 'left center',
                        });
                        return (
                          <div style={{
                            display: 'flex', alignItems: 'center', gap: 10,
                            minWidth: 180,
                          }}>
                            <div style={{
                              ...switcherLogo.slotStyle,
                              borderRadius: 6,
                              background: 'transparent',
                            }}>
                              <img
                                src={f.logoPath}
                                alt={f.kisaAd}
                                style={switcherLogo.imageStyle}
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
                              <Icon icon="solar:check-circle-bold-duotone" width={13} height={13} color={f.renkVurgu} />
                            )}
                          </div>
                        );
                      })()
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
            icon={isDark
              ? <Icon icon="solar:sun-bold-duotone" width={19} height={19} />
              : <Icon icon="solar:moon-bold-duotone" width={19} height={19} />}
            onClick={temaToggle}
            size="small"
            className={buttonClassNames.iconGhostSmall}
            style={{
              color: isDark ? 'rgba(253,224,120,0.80)' : 'rgba(148,163,184,0.80)',
              flexShrink: 0,
            }}
          />
        </Tooltip>

        {/* Tum kullanicilar: atama + admin cevap bildirimleri.
            Zil sadece okunmamış varsa görünür (sade premium navbar). */}
        {!isMobile && aktifKullanici && okunmamisBildirim > 0 && (
          <Popover
            content={
              <BildirimPaneli
                open={bildirimDrawerAcik}
                onClose={() => setBildirimDrawerAcik(false)}
                onListeDegisti={(liste) => setOkunmamisBildirim(bildirimService.okunmamisSayisi(liste))}
                onGeriBildirimAc={() => setAdminGbDrawerAcik(true)}
              />
            }
            trigger="click"
            placement="bottomRight"
            open={bildirimDrawerAcik}
            onOpenChange={setBildirimDrawerAcik}
            arrow={false}
            overlayClassName="bildirim-popover"
          >
            <Tooltip title="Bildirimler" placement="bottom" mouseEnterDelay={0.4}>
              <Badge count={okunmamisBildirim} size="small" offset={[-2, 4]}>
                <Button
                  type="text"
                  aria-label="Bildirimler"
                  icon={<Icon icon="solar:bell-bold-duotone" width={20} height={20} color="#ffffff" />}
                  style={{ background: 'transparent', border: 'none' }}
                  className="bildirim-zil"
                />
              </Badge>
            </Tooltip>
          </Popover>
        )}

        {/* Süper admin: okunmamış kullanıcı geri bildirim çanı.
            Yalnız okunmamış varsa görünür. (Tüm kullanıcı feedback'lerini
            yöneticiye gösteren ayrı kanal — bildirim çanından farklı.) */}
        {adminMi && !isMobile && okunmamisGb > 0 && (
          <Tooltip title="Yeni geri bildirimler" placement="bottom" mouseEnterDelay={0.4}>
            <Badge count={okunmamisGb} size="small" offset={[-2, 4]}>
              <Button
                type="text"
                aria-label="Geri Bildirimler"
                onClick={() => setAdminGbDrawerAcik(true)}
                icon={<Icon icon="solar:bell-bold-duotone" width={20} height={20} color="#fbbf24" />}
                style={{ background: 'transparent', border: 'none' }}
              />
            </Badge>
          </Tooltip>
        )}

        {/* ── USER AREA ── */}
        {aktifKullanici && !isMobile && (
          <div
            className="premium-navbar-user"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: USER_INNER_GAP,
              paddingLeft: 16,
              // borderLeft kaldırıldı — premium-navbar-user::before ile dikey
              // gradient ayırıcı CSS'ten gelir (üst ve alt fade'li).
              flexShrink: 0,
              height: '60%',
            }}
          >
            {/* Avatar — VESIKALIK 3:4, tiklanabilir → profil foto guncelleme modal'i */}
            <Tooltip title="Profil fotoğrafını güncelle" placement="bottom">
              <Button
                type="text"
                onClick={() => setProfilFotoModalOpen(true)}
                aria-label="Profil fotoğrafını güncelle"
                style={{
                  padding: 0, margin: 0,
                  background: 'transparent', border: 'none',
                  cursor: 'pointer', flexShrink: 0,
                  borderRadius: 6, lineHeight: 0,
                  transition: 'transform 0.15s ease, box-shadow 0.18s ease',
                  minWidth: 0,
                  height: 'auto',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'scale(1.05)';
                  e.currentTarget.style.boxShadow = `0 0 0 2px ${isAdminLike ? 'rgba(251,191,36,0.32)' : 'rgba(59,130,246,0.32)'}`;
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
                      border: `1px solid ${isAdminLike ? 'rgba(251,191,36,0.45)' : 'rgba(59,130,246,0.45)'}`,
                      display: 'block',
                    }}
                  />
                ) : (
                  <div style={{
                    width: 27, height: 36, borderRadius: 6,
                    background: isAdminLike ? 'rgba(251,191,36,0.18)' : 'rgba(59,130,246,0.20)',
                    border: `1px solid ${isAdminLike ? 'rgba(251,191,36,0.45)' : 'rgba(59,130,246,0.45)'}`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 11, fontWeight: 700,
                    color: isAdminLike ? '#fbbf24' : '#93c5fd',
                    fontFamily: 'var(--font-sans)',
                    letterSpacing: 0.5,
                  }}>
                    {aktifKullanici.initials}
                  </div>
                )}
              </Button>
            </Tooltip>

            {/* İsim — sadece desktop */}
            <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 2, lineHeight: 1.15, maxWidth: 220 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: '#e2e8f0', wordBreak: 'break-word' }}>
                {formatAdSoyad(aktifKullanici.adSoyad)}
              </div>
              <div style={{
                fontSize: 10,
                color: isAdminLike ? 'rgba(251,191,36,0.75)' : 'rgba(148,163,184,0.85)',
                letterSpacing: 0.3, wordBreak: 'break-word',
              }}>
                {formatUnvan(aktifKullanici.unvan)}
              </div>
            </div>

            {/* PWA — Masaüstüne Ekle (native prompt yoksa manuel talimatlı modal açılır).
                Sadece ikon → header bar'da yer kazancı; tooltip fonksiyonu açıklar. */}
            {installButtonGorunsun && (
              <Tooltip title="Masaüstüne Ekle — bu uygulamayı bilgisayara yükle">
                <Button
                  type="text"
                  data-tip-target="masaustune-ekle"
                  icon={<Icon icon="solar:download-minimalistic-bold-duotone" width={17} height={17} />}
                  onClick={masaustuneEkleHandler}
                  className={buttonClassNames.iconGhost}
                  style={{ color: 'rgba(207,225,255,0.9)', fontSize: 16, marginRight: 2 }}
                />
              </Tooltip>
            )}

            {/* Profilim — kendi profilini duzenle (her rol icin) */}
            <Tooltip title="Profilim">
              <Button
                type="text"
                data-tip-target="profilim"
                icon={<Icon icon="solar:user-circle-bold-duotone" width={17} height={17} />}
                onClick={() => setProfilDuzenleOpen(true)}
                size="small"
                className={buttonClassNames.iconGhostSmall}
                style={{ color: 'rgba(148,163,184,0.8)' }}
              />
            </Tooltip>

            {/* E-posta Ayarları — kendi SMTP credentials'larını yönet.
                SMTP kurulmamışsa kırmızı uyarı noktası + tooltip değişir;
                tıklayınca self-serve sihirbazı doğrudan açılır. */}
            <Tooltip title={aktifKullanici.smtpPasswordSet === false ? 'Mail ayarlarınız henüz yapılmamış — şimdi kurun' : 'E-posta Ayarları'}>
              <Button
                type="text"
                icon={
                  <span style={{ position: 'relative', display: 'inline-flex' }}>
                    <Icon icon="solar:letter-bold-duotone" width={17} height={17} />
                    {aktifKullanici.smtpPasswordSet === false && (
                      <span style={{
                        position: 'absolute',
                        top: -2, right: -2,
                        width: 7, height: 7, borderRadius: '50%',
                        background: '#ef4444',
                        boxShadow: '0 0 0 1.5px rgba(15,23,42,0.95)',
                      }} />
                    )}
                  </span>
                }
                onClick={() => {
                  if (aktifKullanici.smtpPasswordSet === false) {
                    setSmtpSetupOpen(true);
                  } else {
                    navigate('/profil/eposta');
                  }
                }}
                size="small"
                className={buttonClassNames.iconGhostSmall}
                style={{ color: aktifKullanici.smtpPasswordSet === false ? '#fca5a5' : 'rgba(148,163,184,0.8)' }}
              />
            </Tooltip>

            {/* Çıkış */}
            <Tooltip title="Çıkış Yap">
              <Button
                type="text"
                icon={<Icon icon="solar:logout-3-bold-duotone" width={17} height={17} />}
                onClick={cikisOnayla}
                size="small"
                className={buttonClassNames.iconGhostSmall}
                style={{ color: 'rgba(148,163,184,0.8)' }}
              />
            </Tooltip>
          </div>
        )}

        {/* ── HAMBURGER — sadece mobile ── */}
        {isMobile && (
          <>
            {installButtonGorunsun && (
              <Tooltip title="Masaüstüne yükle">
                <Button
                  type="text"
                  icon={<Icon icon="solar:download-minimalistic-bold-duotone" width={17} height={17} />}
                  onClick={masaustuneEkleHandler}
                  className={buttonClassNames.iconGhost}
                  style={{ color: 'rgba(207,225,255,0.9)', fontSize: 16, marginRight: 2 }}
                />
              </Tooltip>
            )}
            <Button
              type="text"
              icon={<Icon icon="solar:hamburger-menu-bold-duotone" width={20} height={20} />}
              onClick={() => setDrawerOpen(true)}
              className={buttonClassNames.iconGhost}
              style={{ color: 'rgba(255,255,255,0.85)', fontSize: 18, marginLeft: 2 }}
            />
          </>
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

            {/* Firma değiştirici (super_admin + firma_admin yönetim kurulu) */}
            {cokFirmaErisir && firmalar.length > 1 && (
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
                            ...getAdaptiveLogoPlacement({
                              firmaId: f.id,
                              logoPath: f.logoPath,
                              surface: 'navbar-switcher',
                              objectPosition: 'left center',
                            }).slotStyle,
                            borderRadius: 4,
                            background: 'transparent',
                          }}>
                            <img src={f.logoPath} alt="" style={
                              getAdaptiveLogoPlacement({
                                firmaId: f.id,
                                logoPath: f.logoPath,
                                surface: 'navbar-switcher',
                                objectPosition: 'left center',
                              }).imageStyle
                            } />
                          </div>
                          <span style={{ flex: 1 }}>{f.kisaAd}</span>
                          {aktif && <Icon icon="solar:check-circle-bold-duotone" width={13} height={13} />}
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
              icon={isDark
              ? <Icon icon="solar:sun-bold-duotone" width={19} height={19} />
              : <Icon icon="solar:moon-bold-duotone" width={19} height={19} />}
              onClick={temaToggle}
              className={buttonClassNames.secondarySmall}
              style={{ marginBottom: 8 }}
            >
              {isDark ? 'Aydınlık Mod' : 'Koyu Mod'}
            </Button>
            <Button
              block
              size="small"
              icon={<Icon icon="solar:user-circle-bold-duotone" width={16} height={16} />}
              onClick={() => { setDrawerOpen(false); setProfilDuzenleOpen(true); }}
              className={buttonClassNames.secondarySmall}
              style={{ marginBottom: 8 }}
            >
              Profilim
            </Button>
            <Button
              danger
              size="small"
              icon={<Icon icon="solar:logout-3-bold-duotone" width={16} height={16} />}
              onClick={() => { setDrawerOpen(false); cikisOnayla(); }}
              className={buttonClassNames.dangerSmall}
              block
            >
              Çıkış Yap
            </Button>
          </div>
        )}
      </Drawer>

      {/* SMTP kurulmamışken uyarı: header'daki "E-posta Ayarları" ikonu üzerinde
          kırmızı nokta gösterilir; tıklayınca self-serve sihirbazı açılır.
          Eski full-width Alert bar yer kaplıyordu → discreet badge tercih edildi. */}

      <Content style={{ background: 'transparent' }}>
        <Outlet />
      </Content>

      {/* Global 🎓 Rehberler FAB — her sayfada sag-altta görünür.
          NE: useSayfaRehberi hook'u çağrılan sayfa (RehberContext'e
              register etmiş) için aktif rehberi başlatır; pool'u olmayan
              sayfalarda "yakında" Antd info mesajı gösterir.
          NEDEN: Mehmet Bey 2026-05-26 direktifi — "rehberler butonu
                 her sayfada mevcut olsun". Önceki tasarımda buton
                 useSayfaRehberi içindeydi (sadece TeklifEditor'da).
          NASIL: AppLayout Outlet'inin DIŞINDA render edilir; ProfilFoto
                 modalleri seviyesinde, kontekst sayfa içeriği üstünde. */}
      <GlobalRehberFab />

      {/* GlobalTipSpotlight — aktif sayfanın rehberindeki TipSpotlight
          overlay'ini render eder. Aktif rehber/tip yoksa null. Sayfaların
          kendi return JSX'inde `{rehber.render()}` çağrısı GEREKMEZ —
          AppLayout tek noktadan render eder. */}
      <GlobalTipSpotlight />

      {/* Profil fotosu guncelleme modal'i (header avatar tiklanmasi ile acilir) */}
      <ProfilFotoModal
        open={profilFotoModalOpen}
        onClose={() => setProfilFotoModalOpen(false)}
      />

      {/* Profil duzenleme modal'i — her rol icin Profilim butonu */}
      <ProfilDuzenleModal
        open={profilDuzenleOpen}
        onClose={() => setProfilDuzenleOpen(false)}
      />

      {/* Self-serve mail kurulum sihirbazı — üstteki uyarı banner'ından
          tetiklenir. Tamamlandığında smtpPasswordSet=true olur ve banner
          otomatik kaybolur (refreshKullanici ile aktifKullanici güncellenir). */}
      <SelfServeSmtpModal
        open={smtpSetupOpen}
        onClose={() => setSmtpSetupOpen(false)}
        onCompleted={() => {
          setSmtpSetupOpen(false);
          void refreshKullanici();
        }}
      />

      {/* Geri Bildirim floating buton — tüm sayfalarda (TeklifEditor dâhil)
          aynı tasarım diliyle sağ-alt FAB. PDF ve A4 print alanına dahil değil
          (`.no-print` sahibi değil ama position:fixed + zIndex:900 ile sadece
          ekran katmanında; `@media print` PDF renderında DOM'a girmiyor çünkü
          PDF render kendi izole document'inde çalışıyor). */}
      <GeriBildirimButonu />

      {/* GeriBildirim drawer'ı — admin için tüm kullanıcı feedback yönetimi,
          normal kullanıcı için kendi geri bildirim geçmişi (admin cevap dâhil).
          Hem admin yellow zilden, hem de bildirim panelindeki cevap satırından
          tetiklenir. */}
      {aktifKullanici && (
        <GeriBildirimDrawer
          open={adminGbDrawerAcik}
          onClose={() => setAdminGbDrawerAcik(false)}
          initialSayfa={adminMi ? '(yönetim)' : 'Bildirim cevap'}
        />
      )}

      {/* EditableField sağ tık menüsü — singleton, portal body'ye render eder.
          App seviyesinde mount: tüm sayfalar (TeklifEditor, TeklifPrintSayfasi vb.)
          ortak menüyü kullanır. PDF'e yansımaz (.no-export + data-html2canvas-ignore). */}
      <EditableFieldContextMenu />
    </Layout>
  );
}
