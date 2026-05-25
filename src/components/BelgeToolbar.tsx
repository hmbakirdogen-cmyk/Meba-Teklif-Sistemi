/**
 * BelgeToolbar.tsx
 * ─────────────────────────────────────────────────────────────────
 * Belge editörü üst araç çubuğu.
 * Geri | Teklif başlığı + Durum pill (clickable) | Aksiyonlar (Yazdır / PDF / Gönder).
 *
 * Durum pill: 5 durum (taslak/hazır/gönderildi/onaylandı/iptal). Otomatik geçişler
 * (PDF üretildi → hazır, e-posta gönderildi → gönderildi) editörde yapılır;
 * pill click → manuel override menüsü.
 */

import { App, Button, Dropdown, Popover, Space, Tooltip, Spin } from 'antd';
import type { MenuProps } from 'antd';
import { Icon } from '@iconify/react';
import type { TeklifDurum, TeklifStatus } from '../types';
import type { PanelModu } from '../hooks/useBelgeState';

interface BelgeToolbarProps {
  teklifNo: string;
  teklifNoDurumu: 'hazir' | 'yukleniyor' | 'hata';
  cariAdi?: string;
  durum: TeklifDurum;
  /** Otomatik kayıt durumu — durum'la birlikte "düzenlendi" göstergesi için
   *  kullanılır. Status taslak iken durum ileri bir aşamadaysa, içerik son
   *  kayıttan/gönderimden sonra değiştirilmiş demektir. */
  status?: TeklifStatus;
  uretiliyor: boolean;
  onGeriDon: () => void;
  onPdfIndir: () => void;
  onEMailGonder: () => void;
  onYazdir: () => void;
  onPanelAc: (mod: PanelModu) => void;
  onDurumDegistir: (d: TeklifDurum) => void;
  /** Atanmış ilgili kişinin adı — buton üzerinde küçük etiket olarak gösterilir. */
  ilgiliKisiAdSoyad?: string;
  /** Toolbar buton click → parent ilgili kişi seçim popover/modal'ını açar. */
  onIlgiliKisiAc: () => void;
  /** PDF kayıt konumu durumu — küçük "PDF Konumu: …" etiketi için. */
  pdfKayitKlasorAdi?: string | null;
  pdfKayitDestekli?: boolean;
  /** Klasör erişim durumu — rozet rengini ve mesajını belirler. */
  pdfKayitDurum?: 'ok' | 'izinKayip' | 'klasorYok' | 'desteklenmiyor';
  /** Notlar butonu uzerinde gosterilen coachmark popover'i acik mi?
   *  Yeni kullaniciya butonun varligini ve kullanim amacini tanitan
   *  bir balon — butona ok ile pointing. Parent (TeklifEditor) per-user
   *  counter ile yonetir; X kapama callback'i ile durdurulur. */
  notlarTavsiyeAcik?: boolean;
  onNotlarTavsiyeKapat?: () => void;
}

const DURUM_RENK: Record<TeklifDurum, { color: string; bg: string; border: string }> = {
  taslak:           { color: '#475569', bg: '#f1f5f9', border: '#cbd5e1' },
  hazir:            { color: '#1d4ed8', bg: '#eff6ff', border: '#bfdbfe' },
  gonderildi:       { color: '#b45309', bg: '#fffbeb', border: '#fde68a' },
  onaylandi:        { color: '#15803d', bg: '#ecfdf5', border: '#a7f3d0' },
  kismi_onaylandi:  { color: '#c2410c', bg: '#fff7ed', border: '#fed7aa' },
  siparis_alindi:   { color: '#047857', bg: '#d1fae5', border: '#6ee7b7' },
  reddedildi:       { color: '#b91c1c', bg: '#fef2f2', border: '#fecaca' },
  iptal:            { color: '#475569', bg: '#f1f5f9', border: '#cbd5e1' },
};

const DURUM_ETIKET: Record<TeklifDurum, string> = {
  taslak:           'Hazırlanıyor',
  hazir:            'Hazır',
  gonderildi:       'Gönderildi',
  onaylandi:        'Onaylandı',
  kismi_onaylandi:  'Kısmi Onay',
  siparis_alindi:   'Siparişe Döndü',
  reddedildi:       'Reddedildi',
  iptal:            'İptal',
};

const DURUM_ACIKLAMA: Record<TeklifDurum, string> = {
  taslak:           'Üzerinde çalışılıyor',
  hazir:            'PDF üretildi, gönderim için hazır',
  gonderildi:       'Müşteriye gönderildi, yanıt bekleniyor',
  onaylandi:        'Müşteri onayladı',
  kismi_onaylandi:  'Müşteri bazı kalemleri onayladı',
  siparis_alindi:   'Onay sonrası sipariş açıldı',
  reddedildi:       'Müşteri reddetti (rakip/fiyat/zaman)',
  iptal:            'Süreç sonlandırıldı',
};

export default function BelgeToolbar({
  teklifNo,
  teklifNoDurumu,
  cariAdi,
  durum,
  status,
  uretiliyor,
  onGeriDon,
  onPdfIndir,
  onEMailGonder,
  onYazdir,
  onPanelAc,
  onDurumDegistir,
  ilgiliKisiAdSoyad,
  onIlgiliKisiAc,
  pdfKayitKlasorAdi,
  pdfKayitDestekli,
  pdfKayitDurum,
  notlarTavsiyeAcik = false,
  onNotlarTavsiyeKapat,
}: BelgeToolbarProps) {
  const { modal } = App.useApp();
  const durumRenk = DURUM_RENK[durum];

  // Sonuclanmis durum (onaylandi/kismi_onaylandi/reddedildi/iptal) -> baska
  // duruma gecisi onaya bagla. Kazanmis bir teklifin yanlislikla taslaga
  // dusurulmesi ya da iptal edilmis bir kaydin tekrar 'gonderildi' yapilmasi
  // gibi mantiksiz gecisleri engeller.
  function durumDegistirGuvenli(yeniDurum: TeklifDurum) {
    const KAPALI: TeklifDurum[] = ['onaylandi', 'kismi_onaylandi', 'reddedildi', 'iptal'];
    if (KAPALI.includes(durum) && yeniDurum !== durum) {
      modal.confirm({
        title: 'Sonuçlanmış teklifin durumunu değiştir?',
        content: `Bu teklif "${DURUM_ETIKET[durum]}" olarak işaretliydi. Yeni durum: "${DURUM_ETIKET[yeniDurum]}". Devam etmek istiyor musunuz?`,
        okText: 'Evet, değiştir',
        cancelText: 'Vazgeç',
        onOk: () => onDurumDegistir(yeniDurum),
      });
      return;
    }
    onDurumDegistir(yeniDurum);
  }

  // 'siparis_alindi' durumu dropdown'dan kaldırıldı (UI seçeneği değil).
  // TeklifDurum tipi korunuyor → eski veriler hâlâ valid; sadece kullanıcı
  // bu durumu artık manuel seçemez. Analiz/raporlar geriye uyumlu.
  const durumMenuItems: MenuProps['items'] = (Object.keys(DURUM_ETIKET) as TeklifDurum[])
    .filter((d) => d !== 'siparis_alindi')
    .map((d) => ({
    key: d,
    label: (
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '2px 0', minWidth: 200 }}>
        <span style={{
          width: 8, height: 8, borderRadius: '50%',
          background: DURUM_RENK[d].color, flexShrink: 0,
        }} />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 1, minWidth: 0 }}>
          {/* Etiket kendi durum rengiyle — gorsel taninma kolaylasir */}
          <span style={{ fontSize: 12, fontWeight: durum === d ? 700 : 600, color: DURUM_RENK[d].color }}>
            {DURUM_ETIKET[d]}{durum === d ? '  ✓' : ''}
          </span>
          <span style={{ fontSize: 10.5, color: 'var(--text-secondary)', lineHeight: 1.3 }}>
            {DURUM_ACIKLAMA[d]}
          </span>
        </div>
      </div>
    ),
  }));

  return (
    <div
      className="premium-toolbar"
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        padding: '7px 18px',
        flexShrink: 0,
        height: 48,
        position: 'sticky',
        top: 0,
        zIndex: 100,
      }}
    >
      {/* Sol: Geri + Teklif bilgisi.
          type="text" + premium ghost — koyu cam üstünde aydınlık. */}
      <Button
        type="text"
        icon={<Icon icon="solar:arrow-left-bold-duotone" width={17} height={17} />}
        onClick={onGeriDon}
        className="premium-toolbar-back"
        style={{
          marginRight: 8,
          height: 34,
          padding: '0 14px',
          fontSize: 13,
          fontWeight: 500,
          borderRadius: 8,
        }}
      >
        Geri
      </Button>

      <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
        <span style={{
          fontSize: 14,
          fontWeight: 700,
          color: '#f5f7fa',
          fontVariantNumeric: 'tabular-nums',
          whiteSpace: 'nowrap',
          textShadow: '0 1px 1.5px rgba(0,0,0,0.55), 0 0 14px rgba(255,255,255,0.20)',
        }}>
          {teklifNoDurumu === 'yukleniyor' ? <Spin size="small" /> : teklifNo}
        </span>
        {cariAdi && (
          <span style={{
            fontSize: 12,
            color: 'rgba(229,236,247,0.70)',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            maxWidth: 200,
          }}>
            — {cariAdi}
          </span>
        )}
        <Dropdown
          menu={{
            items: durumMenuItems,
            onClick: ({ key }) => durumDegistirGuvenli(key as TeklifDurum),
            selectable: true,
            selectedKeys: [durum],
          }}
          trigger={['click']}
          placement="bottomLeft"
        >
          <button
            type="button"
            title="Tıkla → durum değiştir"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 5,
              padding: '3px 9px 3px 11px',
              borderRadius: 999,
              fontSize: 11.5,
              fontWeight: 600,
              letterSpacing: '0.01em',
              color: durumRenk.color,
              background: durumRenk.bg,
              border: `1px solid ${durumRenk.border}`,
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              lineHeight: 1.4,
              transition: 'background 0.12s, border-color 0.12s',
            }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.borderColor = durumRenk.color; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.borderColor = durumRenk.border; }}
          >
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: durumRenk.color, flexShrink: 0 }} />
            {DURUM_ETIKET[durum]}
            <Icon icon="solar:alt-arrow-down-bold" width={11} height={11} style={{ opacity: 0.7, marginLeft: 1 }} />
          </button>
        </Dropdown>

        {/* "Revize" göstergesi — durum ileri aşamadayken (hazır/gönderildi/
            sonuçlanmış) status taslak'a düşmüşse içerik kayıttan/gönderimden
            sonra değişmiş demektir. Sistem bunu otomatik revize olarak görür. */}
        {status === 'taslak' && durum !== 'taslak' && (
          <Tooltip
            title={
              durum === 'gonderildi'      ? 'Revize teklif — gönderildikten sonra üzerinde değişiklik yapıldı.' :
              durum === 'hazir'           ? 'Revize — PDF üretildikten sonra değişiklik yapıldı. PDF güncel değil.' :
              durum === 'onaylandi'       ? 'Revize — onaylanmış teklif sonradan değişti.' :
              durum === 'kismi_onaylandi' ? 'Revize — kısmi onay alınmış teklif sonradan değişti.' :
              durum === 'reddedildi'      ? 'Revize — reddedilmiş teklif sonradan değişti.' :
              durum === 'iptal'           ? 'Revize — iptal edilmiş teklif sonradan değişti.' :
              'Revize teklif — üzerinde değişiklik yapıldı.'
            }
            mouseEnterDelay={0.25}
            placement="bottom"
          >
            <span
              aria-label="Revize"
              style={{
                display: 'inline-flex', alignItems: 'center',
                padding: '2px 8px',
                borderRadius: 4,
                fontSize: 10.5,
                fontWeight: 600,
                color: '#7c3aed',
                background: 'rgba(124,58,237,0.10)',
                border: '1px solid rgba(124,58,237,0.32)',
                letterSpacing: '0.02em',
                whiteSpace: 'nowrap',
                cursor: 'help',
              }}
            >
              ⟳ Revize
            </span>
          </Tooltip>
        )}
      </div>

      <div style={{ flex: 1 }} />

      {/* Sağ: Aksiyonlar */}
      <Space size={6} wrap>
        <Tooltip title={ilgiliKisiAdSoyad ? `İlgili: ${ilgiliKisiAdSoyad}` : 'İlgili kişi ata (şirket içi)'}>
          <Button
            type="text"
            icon={<Icon icon="solar:user-plus-rounded-bold-duotone" width={17} height={17} />}
            onClick={onIlgiliKisiAc}
            style={{
              position: 'relative',
              ...(ilgiliKisiAdSoyad ? { color: '#2563eb' } : {}),
            }}
          >
            {ilgiliKisiAdSoyad ? ilgiliKisiAdSoyad.split(' ')[0] : null}
          </Button>
        </Tooltip>
        <Popover
          open={notlarTavsiyeAcik}
          placement="bottom"
          arrow
          overlayClassName="meba-notlar-tavsiye-popover"
          content={
            <div style={{ maxWidth: 320, fontSize: 12.5, lineHeight: 1.5, color: '#334155', position: 'relative', paddingRight: 16 }}>
              <button
                type="button"
                onClick={() => onNotlarTavsiyeKapat?.()}
                aria-label="Tavsiyeyi kapat"
                title="Kapat"
                style={{
                  position: 'absolute', top: -2, right: -4,
                  background: 'transparent', border: 'none',
                  color: '#94a3b8', cursor: 'pointer',
                  padding: 2, fontSize: 12, lineHeight: 1,
                }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = '#475569'; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = '#94a3b8'; }}
              >✕</button>
              <div style={{ fontWeight: 600, color: '#1e293b', marginBottom: 6, display: 'flex', alignItems: 'center', gap: 6 }}>
                <span>📝</span>
                <span>Notlar — Şirket İçi Hafıza</span>
              </div>
              {/* Animasyonlu notepad demo — kalem yaziyor, satirlar belirir */}
              <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 8 }}>
                <svg viewBox="0 0 140 70" width="140" height="70">
                  <style>{`
                    @keyframes meba-notepad-line-1 { 0%, 5% { width: 0; } 18%, 95% { width: 92px; } 100% { width: 0; } }
                    @keyframes meba-notepad-line-2 { 0%, 22% { width: 0; } 35%, 95% { width: 78px; } 100% { width: 0; } }
                    @keyframes meba-notepad-line-3 { 0%, 40% { width: 0; } 53%, 95% { width: 86px; } 100% { width: 0; } }
                    @keyframes meba-pencil-move {
                      0%, 5%   { transform: translate(15px, 15px); }
                      22%      { transform: translate(105px, 15px); }
                      23%, 25% { transform: translate(15px, 30px); }
                      38%      { transform: translate(91px, 30px); }
                      39%, 42% { transform: translate(15px, 45px); }
                      55%      { transform: translate(99px, 45px); }
                      75%, 100%{ transform: translate(99px, 45px); }
                    }
                  `}</style>
                  {/* Notepad arka plan */}
                  <rect x="8" y="6" width="124" height="58" rx="3" fill="#fffaf0" stroke="#fbbf24" strokeWidth="0.8" />
                  <line x1="8" y1="14" x2="132" y2="14" stroke="#fbbf24" strokeWidth="0.5" opacity="0.5" />
                  {/* Yazi cizgi placeholder'lari (faded gri) */}
                  <line x1="13" y1="22" x2="115" y2="22" stroke="#e2e8f0" strokeWidth="0.8" />
                  <line x1="13" y1="37" x2="115" y2="37" stroke="#e2e8f0" strokeWidth="0.8" />
                  <line x1="13" y1="52" x2="115" y2="52" stroke="#e2e8f0" strokeWidth="0.8" />
                  {/* Yazi cizgileri (mavi, sirayla beliren) */}
                  <foreignObject x="13" y="19" width="120" height="6">
                    <div style={{ width: 0, height: 2, background: '#5b8def', borderRadius: 1, animation: 'meba-notepad-line-1 5s ease-in-out infinite' }} />
                  </foreignObject>
                  <foreignObject x="13" y="34" width="120" height="6">
                    <div style={{ width: 0, height: 2, background: '#5b8def', borderRadius: 1, animation: 'meba-notepad-line-2 5s ease-in-out infinite' }} />
                  </foreignObject>
                  <foreignObject x="13" y="49" width="120" height="6">
                    <div style={{ width: 0, height: 2, background: '#5b8def', borderRadius: 1, animation: 'meba-notepad-line-3 5s ease-in-out infinite' }} />
                  </foreignObject>
                  {/* Kalem — animasyonla satirlari "yazar gibi" hareket eder */}
                  <g style={{ animation: 'meba-pencil-move 5s ease-in-out infinite' }}>
                    <g transform="translate(0, -6)">
                      <rect x="-1" y="0" width="2" height="9" fill="#475569" />
                      <polygon points="-1,9 1,9 0,12" fill="#1e293b" />
                      <rect x="-1" y="-3" width="2" height="3" fill="#fbbf24" />
                    </g>
                  </g>
                </svg>
              </div>
              <div style={{ color: '#475569' }}>
                Bu butonu kullanarak <b>kendiniz için</b> her tür notu kaydedebilirsiniz: müşteri görüşmeleri, telefon notları, fiyat tartışmaları, rakip bilgileri…
              </div>
              <div style={{ marginTop: 6, padding: '4px 8px', background: 'rgba(99,179,237,0.08)', borderRadius: 4, fontSize: 11.5, color: '#475569', borderLeft: '2px solid #5b8def' }}>
                <b>Asla müşteriye gitmez.</b> Sadece sizin iç akışınızdaki notlar.
              </div>
            </div>
          }
        >
          <Tooltip title="Notlar">
            <Button
              type="text"
              icon={
                <svg viewBox="0 0 20 20" width="1em" height="1em" fill="currentColor" aria-hidden="true">
                  <circle cx="5" cy="4" r="1.1" fill="none" stroke="currentColor" strokeWidth="1.1" opacity="0.55" />
                  <circle cx="5" cy="7" r="1.1" fill="none" stroke="currentColor" strokeWidth="1.1" opacity="0.55" />
                  <circle cx="5" cy="10" r="1.1" fill="none" stroke="currentColor" strokeWidth="1.1" opacity="0.55" />
                  <rect x="6.5" y="2" width="9" height="13" rx="1.2" fill="none" stroke="currentColor" strokeWidth="1.2" opacity="0.80" />
                  <line x1="8.5" y1="5.2" x2="13.5" y2="5.2" stroke="currentColor" strokeWidth="1" strokeLinecap="round" opacity="0.55" />
                  <line x1="8.5" y1="7.6" x2="13.5" y2="7.6" stroke="currentColor" strokeWidth="1" strokeLinecap="round" opacity="0.55" />
                  <line x1="8.5" y1="10" x2="11.5" y2="10" stroke="currentColor" strokeWidth="1" strokeLinecap="round" opacity="0.55" />
                  <g transform="rotate(-40 13 14)">
                    <rect x="12" y="11" width="2" height="5.5" rx="0.4" fill="currentColor" opacity="0.85" />
                    <polygon points="12,16.5 14,16.5 13,18.5" fill="currentColor" opacity="0.70" />
                  </g>
                </svg>
              }
              onClick={() => {
                onNotlarTavsiyeKapat?.(); // tıklayınca popover'i kapat
                onPanelAc('notlar');
              }}
            />
          </Tooltip>
        </Popover>

        <div style={{
          width: 1, height: 20, margin: '0 4px',
          background: 'linear-gradient(180deg, transparent, rgba(220,225,235,0.45) 25%, rgba(245,248,255,0.65) 75%, transparent)',
          boxShadow: '0 0 4px rgba(240,245,255,0.30)',
        }} />

        <Tooltip title="Sayfayı yazıcıya gönder (durumu değiştirmez)" placement="bottom">
          <Button
            type="text"
            icon={<Icon icon="solar:printer-bold-duotone" width={18} height={18} />}
            onClick={onYazdir}
            loading={uretiliyor}
          >
            Yazdır
          </Button>
        </Tooltip>
        {pdfKayitDestekli && (() => {
          // 2 durumlu rozet — sadece bilgi vermesi gereken durumlarda görünür:
          //   ok          → yeşil "Klasöre: {ad}" (klasör seçili, hazır)
          //   izinKayip   → turuncu "Klasör izni yenilenmeli" (uyarı)
          // klasorYok/desteklenmiyor durumda rozet RENDER EDİLMEZ — varsayılan
          // davranış (indirilenler klasörüne kayıt) zaten kullanıcının
          // bildiği yaygın akış; her zaman bilgilendirme yapmak gürültü.
          const durum: 'ok' | 'izinKayip' | 'klasorYok' | 'desteklenmiyor' =
            pdfKayitDurum ?? (pdfKayitKlasorAdi ? 'ok' : 'klasorYok');
          if (durum !== 'ok' && durum !== 'izinKayip') return null;
          const style = durum === 'ok' ? {
            color: '#15803d',
            bg: '#ecfdf5',
            border: '#a7f3d0',
            label: `Klasöre: ${pdfKayitKlasorAdi ?? ''}`,
            tooltip: `PDF'ler "${pdfKayitKlasorAdi}" klasörüne kaydedilecek. Profilinizden değiştirebilirsiniz.`,
          } : {
            color: '#b45309',
            bg: '#fffbeb',
            border: '#fde68a',
            label: 'Klasör izni yenilenmeli',
            tooltip: `"${pdfKayitKlasorAdi ?? ''}" klasörüne erişim için tarayıcı izni yenilenmeli. PDF üretirken size sorulacak.`,
          };
          return (
            <Tooltip title={style.tooltip} placement="bottom">
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 4,
                  padding: '2px 8px',
                  fontSize: 11,
                  fontWeight: 500,
                  color: style.color,
                  background: style.bg,
                  border: `1px solid ${style.border}`,
                  borderRadius: 999,
                  whiteSpace: 'nowrap',
                  cursor: 'help',
                  userSelect: 'none',
                  maxWidth: 220,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
              >
                <Icon icon="solar:folder-bold-duotone" width={13} height={13} />
                {style.label}
              </span>
            </Tooltip>
          );
        })()}
        <Tooltip
          title={
            pdfKayitDurum === 'ok'
              ? `PDF üret + "${pdfKayitKlasorAdi}" klasörüne kaydet → durumu 'Hazır'a çeker.`
              : pdfKayitDurum === 'izinKayip'
                ? `PDF üret + klasör izni iste (yenilemezsen İndirilenler'e iner) → durumu 'Hazır'a çeker.`
                : `PDF üret + İndirilenler klasörüne kaydet → durumu 'Hazır'a çeker. (Profilden kalıcı klasör seçebilirsin)`
          }
          placement="bottom"
        >
          <Button
            type="text"
            icon={<Icon icon="solar:file-text-bold-duotone" width={18} height={18} />}
            onClick={onPdfIndir}
            loading={uretiliyor}
            className="premium-toolbar-action"
          >
            PDF
          </Button>
        </Tooltip>
        <Tooltip
          title={
            pdfKayitDurum === 'ok'
              ? `PDF üret + "${pdfKayitKlasorAdi}" klasörüne arşivle + müşteriye e-posta aç → durumu 'Gönderildi'ye çeker.`
              : `PDF üret + müşteriye e-posta taslağı aç → durumu 'Gönderildi'ye çeker.`
          }
          placement="bottom"
        >
          <Button
            type="text"
            icon={<Icon icon="solar:letter-bold-duotone" width={18} height={18} />}
            onClick={onEMailGonder}
            loading={uretiliyor}
            className="premium-toolbar-action premium-toolbar-cta"
          >
            Gönder
          </Button>
        </Tooltip>
      </Space>
    </div>
  );
}
