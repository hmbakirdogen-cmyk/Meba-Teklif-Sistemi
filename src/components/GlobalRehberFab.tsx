import { App } from 'antd';
import { useRehberCtx } from '../context/useRehber';

export default function GlobalRehberFab() {
  const ctx = useRehberCtx();
  const { message } = App.useApp();

  const handleClick = () => {
    // Faz 28: context artık özet bilgiyi (hazir/bos/sayfaAdi) ve baslat()'ı
    // doğrudan sunuyor — eski `ctx.aktif` handle'ı kaldırıldı.
    if (!ctx || !ctx.hazir) {
      message.info('Bu sayfa için rehber henüz hazır değil - yakında eklenecek.');
      return;
    }
    if (ctx.bos) {
      message.info(`${ctx.sayfaAdi} için rehber henüz hazır değil - yakında eklenecek.`);
      return;
    }

    const basladi = ctx.baslat();
    if (!basladi) {
      message.info(`${ctx.sayfaAdi} için şu an gösterilebilecek rehber adımı bulunamadı. Gerekli paneli açıp tekrar deneyin.`);
    }
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
      {'🎓 Rehberler'}
    </button>
  );
}
