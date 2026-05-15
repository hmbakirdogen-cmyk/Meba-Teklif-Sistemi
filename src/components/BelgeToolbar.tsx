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

import { App, Button, Dropdown, Space, Tooltip, Spin } from 'antd';
import type { MenuProps } from 'antd';
import {
  ArrowLeftOutlined,
  PrinterOutlined,
  FilePdfOutlined,
  MailOutlined,
  UserOutlined,
  CaretDownOutlined,
  FolderOutlined,
} from '@ant-design/icons';
import { useColors } from '../hooks/useColors';
import { buttonClassNames } from '../styles/buttonStyles';
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
}: BelgeToolbarProps) {
  const C = useColors();
  const { modal } = App.useApp();
  const durumRenk = DURUM_RENK[durum];

  // Sonuclanmis durum (onaylandi/reddedildi/iptal) -> baska duruma gecisi
  // onaya bagla. Kazanmis bir teklifin yanlislikla taslaga dusurulmesi ya
  // da iptal edilmis bir kaydin tekrar 'gonderildi' yapilmasi gibi
  // mantiksiz gecisleri engeller.
  function durumDegistirGuvenli(yeniDurum: TeklifDurum) {
    const KAPALI: TeklifDurum[] = ['onaylandi', 'reddedildi', 'iptal'];
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
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: 10,
      padding: '10px 18px',
      borderBottom: `1px solid ${C.border}`,
      background: C.bgSurface,
      flexShrink: 0,
      height: 56,
      position: 'sticky',
      top: 0,
      zIndex: 100,
    }}>
      {/* Sol: Geri + Teklif bilgisi.
          Buton metinli + ikonlu — pratik, hedef alanı geniş. */}
      <Button
        type="default"
        icon={<ArrowLeftOutlined />}
        onClick={onGeriDon}
        style={{
          marginRight: 8,
          height: 34,
          padding: '0 14px',
          fontSize: 13,
          fontWeight: 500,
          borderRadius: 6,
        }}
      >
        Geri
      </Button>

      <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
        <span style={{
          fontSize: 14,
          fontWeight: 700,
          color: C.textPrimary,
          fontVariantNumeric: 'tabular-nums',
          whiteSpace: 'nowrap',
        }}>
          {teklifNoDurumu === 'yukleniyor' ? <Spin size="small" /> : teklifNo}
        </span>
        {cariAdi && (
          <span style={{
            fontSize: 12,
            color: C.textSecondary,
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
            <CaretDownOutlined style={{ fontSize: 9, opacity: 0.7, marginLeft: 1 }} />
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
            icon={<UserOutlined />}
            onClick={onIlgiliKisiAc}
            style={{
              position: 'relative',
              ...(ilgiliKisiAdSoyad ? { color: '#2563eb' } : {}),
            }}
          >
            {ilgiliKisiAdSoyad ? ilgiliKisiAdSoyad.split(' ')[0] : null}
          </Button>
        </Tooltip>
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
            onClick={() => onPanelAc('notlar')}
          />
        </Tooltip>

        <div style={{ width: 1, height: 20, background: C.border, margin: '0 4px' }} />

        <Tooltip title="Sayfayı yazıcıya gönder (durumu değiştirmez)" placement="bottom">
          <Button
            type="text"
            icon={<PrinterOutlined />}
            onClick={onYazdir}
            loading={uretiliyor}
          >
            Yazdır
          </Button>
        </Tooltip>
        {pdfKayitDestekli && (() => {
          // 3 durumlu rozet:
          //   ok          → yeşil "Klasöre: {ad}"
          //   izinKayip   → turuncu "Klasör erişimi yenilenmeli"
          //   klasorYok/  → gri "İndirme klasörüne"
          //   desteklenmiyor
          const durum: 'ok' | 'izinKayip' | 'klasorYok' | 'desteklenmiyor' =
            pdfKayitDurum ?? (pdfKayitKlasorAdi ? 'ok' : 'klasorYok');
          const style: { color: string; bg: string; border: string; label: string; tooltip: string } =
            durum === 'ok' ? {
              color: '#15803d',
              bg: '#ecfdf5',
              border: '#a7f3d0',
              label: `Klasöre: ${pdfKayitKlasorAdi ?? ''}`,
              tooltip: `PDF'ler "${pdfKayitKlasorAdi}" klasörüne kaydedilecek. Profilinizden değiştirebilirsiniz.`,
            }
            : durum === 'izinKayip' ? {
              color: '#b45309',
              bg: '#fffbeb',
              border: '#fde68a',
              label: 'Klasör izni yenilenmeli',
              tooltip: `"${pdfKayitKlasorAdi ?? ''}" klasörüne erişim için tarayıcı izni yenilenmeli. PDF üretirken size sorulacak.`,
            }
            : {
              color: C.textFaint,
              bg: C.bgSurface,
              border: C.border,
              label: 'İndirme klasörüne',
              tooltip: 'PDF kayıt konumu seçilmedi. PDF\'ler tarayıcının İndirilenler klasörüne kaydedilir. Profilinizden klasör seçebilirsiniz.',
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
                <FolderOutlined style={{ fontSize: 11 }} />
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
                ? `PDF üret + klasör izni iste (yenilemezsen İndirilenler\'e iner) → durumu 'Hazır'a çeker.`
                : `PDF üret + İndirilenler klasörüne kaydet → durumu 'Hazır'a çeker. (Profilden kalıcı klasör seçebilirsin)`
          }
          placement="bottom"
        >
          <Button
            icon={<FilePdfOutlined />}
            onClick={onPdfIndir}
            loading={uretiliyor}
            className={buttonClassNames.secondary}
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
            type="primary"
            icon={<MailOutlined />}
            onClick={onEMailGonder}
            loading={uretiliyor}
          >
            Gönder
          </Button>
        </Tooltip>
      </Space>
    </div>
  );
}
