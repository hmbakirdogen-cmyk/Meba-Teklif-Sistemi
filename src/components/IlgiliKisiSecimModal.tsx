import { useEffect, useMemo, useState } from 'react';
import { Modal, Select, Avatar, Spin, Button } from 'antd';
import { UserOutlined } from '@ant-design/icons';
import { api } from '../services/apiClient';
import { formatAdSoyad, formatUnvan } from '../utils/formatters';
import { useKullanici } from '../context/useKullanici';

// Notlar kullanim tavsiyesi: kullaniciyi alistirmak icin ilk N atamada
// modal'da gosterilir, sonra otomatik gizlenir (per-user counter).
const NOTLAR_TAVSIYE_MAX = 5;

interface PersonelOpt {
  id: string;
  adSoyad: string;
  unvan: string;
  profilFotoUrl: string | null;
  initials: string;
}

interface Props {
  open: boolean;
  onClose: () => void;
  teklifFirmaId?: string;
  mevcutId?: string;
  mevcutAdSoyad?: string;
  onSec: (id: string | null, adSoyad: string | null) => void;
}

/**
 * Toolbar'daki "İlgili Kişi" butonu açtığı modal.
 * Şirket içi atama — A4/PDF belgesine yansımaz, yalnız bildirim+filtre üretir.
 */
export default function IlgiliKisiSecimModal({
  open,
  onClose,
  teklifFirmaId,
  mevcutId,
  mevcutAdSoyad,
  onSec,
}: Props) {
  const { aktifKullanici } = useKullanici();
  const [personel, setPersonel] = useState<PersonelOpt[]>([]);
  const [yukleniyor, setYukleniyor] = useState(false);
  // mevcutId ilk mount'ta initial olarak alınır. Modal her açılışta parent'ta
  // key prop ile remount eder (TeklifEditor.tsx) — bu sayede setState-in-effect
  // anti-pattern'ine gerek yok, sync yine sağlanır.
  const [seciliId, setSeciliId] = useState<string | undefined>(mevcutId);

  // Notlar tavsiyesi gosterim sayisi (per-user). Modal her acildiginda mount
  // edilir (destroyOnHidden), counter mount'ta 1 kez bump edilir.
  const tavsiyeKey = `meba_ilgili_notlar_tavsiyesi_${aktifKullanici?.id || 'anon'}`;
  const tavsiyeSayisi = (() => {
    if (typeof window === 'undefined') return 0;
    const raw = window.localStorage.getItem(tavsiyeKey);
    return raw ? Number.parseInt(raw, 10) || 0 : 0;
  })();
  const [tavsiyeKapatildi, setTavsiyeKapatildi] = useState(false);
  const tavsiyeGoster = open && !tavsiyeKapatildi && tavsiyeSayisi < NOTLAR_TAVSIYE_MAX;
  useEffect(() => {
    if (!open) return;
    if (typeof window === 'undefined') return;
    if (tavsiyeSayisi >= NOTLAR_TAVSIYE_MAX) return;
    const yeni = tavsiyeSayisi + 1;
    window.localStorage.setItem(tavsiyeKey, String(yeni));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  useEffect(() => {
    if (!open || !teklifFirmaId) return;
    let aktif = true;
    // Async fetch başlangıcı — yükleme bayrağı external sync.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setYukleniyor(true);
    api.firmalar.personel(teklifFirmaId)
      .then((liste) => {
        if (!aktif) return;
        setPersonel(liste.map((p) => ({
          id: p.id,
          adSoyad: p.adSoyad,
          unvan: p.unvan,
          profilFotoUrl: p.profilFotoUrl,
          initials: p.initials,
        })));
      })
      .catch(() => { /* sessiz */ })
      .finally(() => { if (aktif) setYukleniyor(false); });
    return () => { aktif = false; };
  }, [open, teklifFirmaId]);

  const options = useMemo(
    () => personel.map((p) => ({
      value: p.id,
      label: (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {p.profilFotoUrl
            ? <Avatar src={p.profilFotoUrl} size={28} />
            : <Avatar size={28} icon={<UserOutlined />}>{p.initials}</Avatar>
          }
          <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0, lineHeight: 1.25 }}>
            <span style={{ fontSize: 13, fontWeight: 600 }}>{formatAdSoyad(p.adSoyad)}</span>
            {p.unvan && <span style={{ fontSize: 11, color: '#94a3b8' }}>{formatUnvan(p.unvan)}</span>}
          </div>
        </div>
      ),
      // optionFilterProp için arama metni — JSX label içinde arama yapmaz.
      searchText: `${p.adSoyad} ${p.unvan}`,
    })),
    [personel],
  );

  function handleKaydet() {
    if (!seciliId) {
      onSec(null, null);
      onClose();
      return;
    }
    const k = personel.find((p) => p.id === seciliId);
    onSec(seciliId, k ? k.adSoyad : null);
    onClose();
  }

  function handleKaldir() {
    onSec(null, null);
    onClose();
  }

  return (
    <Modal
      title="İlgili Kişi Ata"
      open={open}
      onCancel={onClose}
      okText="Kaydet"
      cancelText="Vazgeç"
      onOk={handleKaydet}
      width={460}
      // Viewport ortasına yerleş — uzun teklif belgesinde sayfa aşağı
      // scroll edilmiş olsa bile modal her zaman ekranın merkezinde açılır
      // (default top:100px ile alt kısımda kalıp Kaydet butonu görünmüyordu).
      centered
      // Antd 6: destroyOnClose deprecated → destroyOnHidden.
      destroyOnHidden
      footer={(_, { OkBtn, CancelBtn }) => (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            {mevcutAdSoyad && (
              <Button danger onClick={handleKaldir}>
                Kaldır
              </Button>
            )}
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <CancelBtn />
            <OkBtn />
          </div>
        </div>
      )}
    >
      <div style={{ paddingTop: 8 }}>
        <div style={{ fontSize: 12, color: '#64748b', marginBottom: 10 }}>
          Bu kişi teklifi takip edecek. Şirket içi atamadır — müşteriye giden A4/PDF belgesine yansımaz.
        </div>
        <Select
          showSearch
          allowClear
          autoFocus
          size="large"
          style={{ width: '100%' }}
          placeholder={yukleniyor ? 'Personel yükleniyor…' : 'Personel ara veya seç…'}
          loading={yukleniyor}
          notFoundContent={yukleniyor ? <Spin size="small" /> : 'Kayıt bulunamadı'}
          value={seciliId}
          onChange={(v) => setSeciliId(v || undefined)}
          options={options}
          optionLabelProp="label"
          filterOption={(input, opt) => {
            const txt = (opt as unknown as { searchText?: string })?.searchText || '';
            return txt.toLocaleLowerCase('tr-TR').includes(input.toLocaleLowerCase('tr-TR'));
          }}
          // Dropdown'u modal içeriğine bağla — Antd Modal'ın transform-centered
          // yapısı document.body'ye portal'lanan dropdown'ın pozisyonunu bozup
          // listeyi ekranın altına itiyordu. Trigger'ın parent'ı modal-body
          // olduğu için dropdown da modal içinde, input'un hemen altında açılır.
          getPopupContainer={(trigger) => (trigger.parentNode as HTMLElement) ?? document.body}
        />

        {/* Notlar kullanim tavsiyesi — soft mavi pastel, X ile kapanabilir,
            ilk N atamadan sonra otomatik gizlenir. Amac: kullaniciya teklif
            uzerinde sirket ici hafiza birakma aliskanligini kazandirmak. */}
        {tavsiyeGoster && (
          <div
            role="note"
            style={{
              marginTop: 16,
              padding: '10px 12px 10px 14px',
              background: 'linear-gradient(135deg, rgba(99,179,237,0.10) 0%, rgba(159,140,232,0.07) 100%)',
              border: '1px solid rgba(99,179,237,0.22)',
              borderLeft: '3px solid #5b8def',
              borderRadius: 8,
              fontSize: 12,
              lineHeight: 1.5,
              color: '#334155',
              position: 'relative',
            }}
          >
            <button
              type="button"
              onClick={() => setTavsiyeKapatildi(true)}
              aria-label="Tavsiyeyi kapat"
              title="Bu mesajı kapat"
              style={{
                position: 'absolute',
                top: 6,
                right: 8,
                background: 'transparent',
                border: 'none',
                color: '#94a3b8',
                cursor: 'pointer',
                padding: 2,
                fontSize: 12,
                lineHeight: 1,
              }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = '#475569'; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = '#94a3b8'; }}
            >
              ✕
            </button>
            <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
              <span style={{ fontSize: 14, lineHeight: 1, paddingTop: 1, flexShrink: 0 }}>📝</span>
              <div style={{ minWidth: 0, paddingRight: 16 }}>
                <div style={{ fontWeight: 600, color: '#1e293b', marginBottom: 4 }}>
                  Atamayla birlikte not düşmeyi unutma
                </div>
                <div style={{ marginBottom: 6 }}>
                  Bu teklif için sorumluluk değiştiğinde, kişisel takip notlarını üst bardaki
                  <b> 📋 Notlar </b>
                  butonunu kullanarak kaydetmeni öneririz. Müşteri ile yaşananları, telefon konuşmalarını ve sonraki adımları yazınca ekip içi devir hep akıcı olur.
                </div>
                <div style={{
                  background: 'rgba(255,255,255,0.55)',
                  border: '1px solid rgba(99,179,237,0.18)',
                  borderRadius: 6,
                  padding: '6px 10px',
                  marginTop: 6,
                }}>
                  <div style={{ fontSize: 10.5, fontWeight: 700, color: '#5b8def', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 4 }}>
                    Örnek Notlar
                  </div>
                  <ul style={{ margin: 0, paddingLeft: 16, color: '#475569', lineHeight: 1.55 }}>
                    <li>"Müşteri 25 Haziran'da konferanstan dönüyor, ondan sonra arayalım."</li>
                    <li>"Fiyat yüksek geldi, ihtiyaçlarına göre alternatif hazırla."</li>
                    <li>"Rakip Festo da teklif vermiş. Müşteri en geç Cuma karar verecek."</li>
                  </ul>
                </div>
                {tavsiyeSayisi < NOTLAR_TAVSIYE_MAX - 1 && (
                  <div style={{ marginTop: 6, fontSize: 10.5, color: '#94a3b8' }}>
                    ({NOTLAR_TAVSIYE_MAX - tavsiyeSayisi} gösterim sonra otomatik gizlenir)
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}
