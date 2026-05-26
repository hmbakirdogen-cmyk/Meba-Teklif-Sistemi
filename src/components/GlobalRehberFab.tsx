// ── GlobalRehberFab ──────────────────────────────────────────────────
// NE: Programın her sayfasında sag-alt köşede görünen sabit 🎓 Rehberler
//     butonu (FAB). Tıklandığında o anki sayfanın RehberContext'e register
//     ettiği rehberi başlatır; sayfa register etmemişse "yakında" diyaloğu.
//
// NEDEN: Mehmet Bey 2026-05-26 direktifi — "rehberler butonu her sayfada
//        mevcut olsun". Önceki tasarımda buton useSayfaRehberi hook'unun
//        içinde render ediliyordu → sadece hook çağrılan sayfada (TeklifEditor)
//        görünüyordu. Global FAB tek noktadan render → her sayfa otomatik
//        kapsama girer.
//
// NASIL: 1) AppLayout'un alt katmanına (Outlet'in dışında) yerleştirilir,
//           hangi route olursa olsun görünür.
//        2) useRehberCtx ile aktif rehberi okur.
//        3) Tıklanınca: aktif varsa baslat(), yoksa Antd info message.
//        4) Aktif tip görünürken (TipSpotlight açıkken) buton GİZLENİR
//           (overlay altında kalmaması için ctx.aktif.bos kontrolü değil,
//           pencerede TipSpotlight'ın kendi başlığı olduğundan FAB
//           gereksiz; basit `display: none` veya zIndex altında).

import { App } from 'antd';
import { useRehberCtx } from '../context/useRehber';

export default function GlobalRehberFab() {
  const ctx = useRehberCtx();
  const { message } = App.useApp();

  const handleClick = () => {
    const aktif = ctx?.aktif;
    if (!aktif) {
      message.info('Bu sayfa için rehber henüz hazır değil — yakında eklenecek.');
      return;
    }
    if (aktif.bos) {
      message.info(`${aktif.sayfaAdi} için rehber henüz hazır değil — yakında eklenecek.`);
      return;
    }
    aktif.baslat();
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      aria-label="Rehberleri sırayla göster"
      title="Rehberleri sırayla göster"
      className="no-print"
      style={{
        position: 'fixed',
        bottom: 24,
        right: 80,
        zIndex: 50,
        background: 'rgba(15, 23, 42, 0.85)',
        color: '#fff',
        padding: '8px 14px',
        borderRadius: 999,
        border: '1px solid rgba(91, 141, 239, 0.4)',
        fontSize: 12,
        fontWeight: 700,
        cursor: 'pointer',
        boxShadow: '0 6px 16px rgba(15, 23, 42, 0.25)',
        display: 'flex',
        alignItems: 'center',
        gap: 6,
        opacity: 0.7,
        transition: 'opacity 200ms ease, transform 200ms ease',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.opacity = '1';
        e.currentTarget.style.transform = 'translateY(-2px)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.opacity = '0.7';
        e.currentTarget.style.transform = 'translateY(0)';
      }}
    >
      🎓 Rehberler
    </button>
  );
}
