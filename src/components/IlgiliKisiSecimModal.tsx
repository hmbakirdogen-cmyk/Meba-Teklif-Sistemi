import { useEffect, useMemo, useState } from 'react';
import { Modal, Select, Avatar, Spin, Button } from 'antd';
import { UserOutlined } from '@ant-design/icons';
import { api } from '../services/apiClient';
import { formatAdSoyad, formatUnvan } from '../utils/formatters';

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
  const [personel, setPersonel] = useState<PersonelOpt[]>([]);
  const [yukleniyor, setYukleniyor] = useState(false);
  const [seciliId, setSeciliId] = useState<string | undefined>(mevcutId);

  useEffect(() => {
    if (!open) return;
    setSeciliId(mevcutId);
  }, [open, mevcutId]);

  useEffect(() => {
    if (!open || !teklifFirmaId) return;
    let aktif = true;
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
      destroyOnClose
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
        />
      </div>
    </Modal>
  );
}
