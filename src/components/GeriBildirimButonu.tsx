/**
 * GeriBildirimButonu
 * ─────────────────────────────────────────────────────────────────
 * Sağ alt köşede sabit floating buton. Tıklayınca GeriBildirimDrawer açar.
 * AppLayout'tan render edilir; TeklifEditor route'unda gizlenir
 * (KumandaPaneli içinde ayrı buton var).
 */
import { useState } from 'react';
import { Tooltip } from 'antd';
import { MessageOutlined } from '@ant-design/icons';
import { useLocation } from 'react-router-dom';
import GeriBildirimDrawer from './GeriBildirimDrawer';

interface Props {
  /** Sağdan offset (px). KumandaPaneli ile çakışmamak için TeklifEditor'da
   *  daha büyük bir değer geçilebilir. Varsayılan: 24. */
  offsetRight?: number;
  /** Bildirim butonunun gösterileceği özel sayfa adı (opsiyonel).
   *  Verilmezse pathname'den otomatik türetilir. */
  sayfaAdiOverride?: string;
}

function pathToSayfaAd(pathname: string): string {
  if (pathname.startsWith('/teklif/')) return 'TeklifEditor';
  if (pathname.startsWith('/teklifler')) return 'TeklifListesi';
  if (pathname.startsWith('/personel')) return 'PersonelSayfasi';
  if (pathname.startsWith('/veri-yonetimi')) return 'VeriYonetimiSayfasi';
  if (pathname.startsWith('/malzeme-gecmisi')) return 'MalzemeGecmisiSayfasi';
  if (pathname.startsWith('/firma')) return 'FirmaProfilSayfasi';
  if (pathname.startsWith('/analiz')) return 'AnalizSayfasi';
  if (pathname === '/' || pathname === '') return 'Anasayfa';
  return pathname.replace(/^\//, '') || 'bilinmeyen';
}

export default function GeriBildirimButonu({ offsetRight = 24, sayfaAdiOverride }: Props) {
  const [acik, setAcik] = useState(false);
  const { pathname } = useLocation();
  const sayfa = sayfaAdiOverride ?? pathToSayfaAd(pathname);

  return (
    <>
      <Tooltip title="Geri Bildirim Gönder" placement="left">
        <button
          type="button"
          aria-label="Geri Bildirim"
          onClick={() => setAcik(true)}
          className="geri-bildirim-fab"
          style={{
            position: 'fixed',
            bottom: 24,
            right: offsetRight,
            width: 44,
            height: 44,
            borderRadius: '50%',
            border: 'none',
            background: 'linear-gradient(180deg, var(--btn-primary-top) 0%, var(--btn-primary-bottom) 100%)',
            color: '#ffffff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            boxShadow: '0 6px 16px rgba(15, 31, 69, 0.30)',
            zIndex: 900,
            transition: 'transform 0.18s ease, box-shadow 0.18s ease',
          }}
        >
          <MessageOutlined style={{ fontSize: 18 }} />
        </button>
      </Tooltip>
      <GeriBildirimDrawer open={acik} onClose={() => setAcik(false)} initialSayfa={sayfa} />
    </>
  );
}
