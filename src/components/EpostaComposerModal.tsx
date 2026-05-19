import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Modal, Input, Button, Switch, Tooltip, App as AntdApp, Spin, Alert } from 'antd';
import { Icon } from '@iconify/react';
import { api } from '../services/apiClient';
import { useColors } from '../hooks/useColors';

interface EkDosya {
  id: string;
  filename: string;
  sizeBytes: number;
  base64: string;
  silinemez?: boolean;
}

interface Props {
  open: boolean;
  onClose: () => void;
  teklifId: string;
  defaultTo: string;
  defaultSubject: string;
  defaultBody: string;
  pdfBlob: Blob | null;
  pdfFileName: string;
  /** Firma logo path — composer'da imza önizlemesinde gösterilir. */
  firmaLogoPath?: string;
  /** Firma kısa adı — logo alt-attr için. */
  firmaKisaAd?: string;
  onSent?: (info: { messageId?: string }) => void;
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX_TOTAL_ATTACHMENT_BYTES = 20 * 1024 * 1024;

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result !== 'string') {
        reject(new Error('Dosya okunamadı.'));
        return;
      }
      const comma = reader.result.indexOf(',');
      resolve(comma >= 0 ? reader.result.slice(comma + 1) : reader.result);
    };
    reader.onerror = () => reject(new Error('Dosya base64 formatına dönüştürülemedi.'));
    reader.readAsDataURL(blob);
  });
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function parseRecipients(input: string): { valid: string[]; invalid: string[] } {
  const parts = input.split(/[,;]/).map((s) => s.trim()).filter(Boolean);
  const valid: string[] = [];
  const invalid: string[] = [];
  for (const p of parts) {
    if (EMAIL_REGEX.test(p)) valid.push(p);
    else invalid.push(p);
  }
  return { valid, invalid };
}

export default function EpostaComposerModal({
  open,
  onClose,
  teklifId,
  defaultTo,
  defaultSubject,
  defaultBody,
  pdfBlob,
  pdfFileName,
  firmaLogoPath,
  firmaKisaAd,
  onSent,
}: Props) {
  const C = useColors();
  const { message } = AntdApp.useApp();
  const [to, setTo] = useState('');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [bccSelf, setBccSelf] = useState(true);
  const [ekler, setEkler] = useState<EkDosya[]>([]);
  const [gonderiliyor, setGonderiliyor] = useState(false);
  const [hata, setHata] = useState<string | null>(null);
  const [gondericiAdres, setGondericiAdres] = useState<string>('');
  const [smtpYok, setSmtpYok] = useState(false);
  const [smtpYukleniyor, setSmtpYukleniyor] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Modal her açıldığında defaults ile sıfırla + SMTP gönderici bilgisini çek.
  useEffect(() => {
    if (!open) return;
    setTo(defaultTo || '');
    setSubject(defaultSubject || '');
    setBody(defaultBody || '');
    setBccSelf(true);
    setHata(null);
    setEkler([]);
    setSmtpYukleniyor(true);
    (async () => {
      try {
        const data = await api.auth.smtpAyarlar();
        const adres = data.smtpFromAddress || data.smtpUser || '';
        setGondericiAdres(adres);
        setSmtpYok(!data.hasPassword || !data.smtpUser);
      } catch {
        setGondericiAdres('');
        setSmtpYok(true);
      } finally {
        setSmtpYukleniyor(false);
      }
    })();
  }, [open, defaultTo, defaultSubject, defaultBody]);

  // PDF blob hazırsa eklere koy (default attachment).
  useEffect(() => {
    if (!open || !pdfBlob) return;
    let aktif = true;
    (async () => {
      try {
        const base64 = await blobToBase64(pdfBlob);
        if (!aktif) return;
        setEkler((prev) => {
          // Önceden PDF eklenmiş mi kontrol et (re-render guard).
          if (prev.some((e) => e.filename === pdfFileName)) return prev;
          return [
            {
              id: 'pdf-teklif',
              filename: pdfFileName,
              sizeBytes: pdfBlob.size,
              base64,
              silinemez: true,
            },
            ...prev,
          ];
        });
      } catch (err) {
        console.warn('[EpostaComposerModal] PDF base64 hatası:', err);
      }
    })();
    return () => { aktif = false; };
  }, [open, pdfBlob, pdfFileName]);

  const toplamBoyut = useMemo(() => ekler.reduce((acc, e) => acc + e.sizeBytes, 0), [ekler]);
  const boyutAsildi = toplamBoyut > MAX_TOTAL_ATTACHMENT_BYTES;

  const ekDosyaEkle = useCallback(async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const yeniler: EkDosya[] = [];
    for (const f of Array.from(files)) {
      try {
        const base64 = await blobToBase64(f);
        yeniler.push({
          id: `${f.name}-${f.size}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          filename: f.name,
          sizeBytes: f.size,
          base64,
        });
      } catch (err) {
        message.warning(`"${f.name}" eklenemedi: ${err instanceof Error ? err.message : 'okunamadı'}`);
      }
    }
    if (yeniler.length > 0) {
      setEkler((prev) => [...prev, ...yeniler]);
    }
  }, [message]);

  const ekKaldir = useCallback((id: string) => {
    setEkler((prev) => prev.filter((e) => e.id !== id));
  }, []);

  const gonder = useCallback(async () => {
    setHata(null);
    const { valid: toList, invalid: toBad } = parseRecipients(to);
    if (toList.length === 0) {
      setHata('En az bir geçerli alıcı e-posta adresi girin.');
      return;
    }
    if (toBad.length > 0) {
      setHata(`Geçersiz alıcı: ${toBad.join(', ')}`);
      return;
    }
    if (!subject.trim()) {
      setHata('Konu boş olamaz.');
      return;
    }
    const pdfEk = ekler.find((e) => e.id === 'pdf-teklif');
    if (!pdfEk) {
      setHata('PDF eki hazır değil — lütfen modal\'ı kapatıp yeniden deneyin.');
      return;
    }
    if (boyutAsildi) {
      setHata(`Toplam ek boyutu ${formatBytes(MAX_TOTAL_ATTACHMENT_BYTES)} sınırını aşıyor.`);
      return;
    }

    setGonderiliyor(true);
    try {
      const extra = ekler.filter((e) => e.id !== 'pdf-teklif')
        .map((e) => ({ filename: e.filename, base64: e.base64 }));
      // Kullanıcı body'yi değiştirmediyse customText gönderme → backend default
      // HTML şablonunu (logo + yapılandırılmış imza ile) kullansın.
      const bodyDegisti = body.trim() !== (defaultBody || '').trim();
      const res = await api.eposta.gonder({
        teklifId,
        to: toList,
        bccSelf,
        subject: subject.trim(),
        customText: bodyDegisti ? body : undefined,
        pdfBase64: pdfEk.base64,
        extraAttachments: extra.length > 0 ? extra : undefined,
      });
      if (!res.ok) {
        setHata(res.error || 'E-posta gönderilemedi.');
        return;
      }
      message.success('E-posta gönderildi.');
      onSent?.({ messageId: res.messageId });
      onClose();
    } catch (err) {
      setHata(err instanceof Error ? err.message : 'Beklenmedik hata.');
    } finally {
      setGonderiliyor(false);
    }
  }, [to, subject, body, defaultBody, ekler, bccSelf, teklifId, boyutAsildi, message, onSent, onClose]);

  const onDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (gonderiliyor) return;
    void ekDosyaEkle(e.dataTransfer?.files ?? null);
  }, [ekDosyaEkle, gonderiliyor]);

  const onDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
  }, []);

  const rowStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    padding: '8px 0',
    borderBottom: `1px solid ${C.borderSubtle}`,
  };
  const labelStyle: React.CSSProperties = {
    minWidth: 72,
    fontSize: 12,
    fontWeight: 600,
    color: C.textSecondary,
    letterSpacing: 0.3,
    textTransform: 'uppercase' as const,
  };

  return (
    <Modal
      open={open}
      onCancel={gonderiliyor ? undefined : onClose}
      mask={{ closable: !gonderiliyor }}
      destroyOnHidden
      width={720}
      centered
      title={
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Icon icon="solar:letter-bold-duotone" width={22} height={22} />
          <span style={{ fontWeight: 700, fontSize: 16 }}>E-posta Gönder</span>
        </div>
      }
      footer={
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Switch checked={bccSelf} onChange={setBccSelf} size="small" />
            <span style={{ fontSize: 12, color: C.textSecondary }}>
              Bir kopyamı bana da gönder (BCC{gondericiAdres ? ` → ${gondericiAdres}` : ''})
            </span>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <Button onClick={onClose} disabled={gonderiliyor}>
              İptal
            </Button>
            <Button
              type="primary"
              onClick={gonder}
              loading={gonderiliyor}
              disabled={smtpYok || !pdfBlob}
              icon={<Icon icon="solar:plain-2-bold-duotone" width={16} height={16} />}
            >
              Gönder
            </Button>
          </div>
        </div>
      }
    >
      {smtpYukleniyor ? (
        <div style={{ padding: 32, textAlign: 'center' }}>
          <Spin />
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          {smtpYok && (
            <Alert
              type="warning"
              showIcon
              style={{ marginBottom: 12 }}
              message="E-posta hesabınız tanımlı değil"
              description={
                <span>
                  Gönderim yapabilmek için Profil → <b>E-posta Ayarları</b> üzerinden SMTP
                  bilgilerinizi (host, port, kullanıcı, şifre) tanımlayın.
                </span>
              }
            />
          )}

          {gondericiAdres && (
            <div style={rowStyle}>
              <span style={labelStyle}>Kimden</span>
              <span style={{ fontSize: 13, color: C.textPrimary }}>{gondericiAdres}</span>
            </div>
          )}

          <div style={rowStyle}>
            <span style={labelStyle}>Kime</span>
            <Input
              value={to}
              onChange={(e) => setTo(e.target.value)}
              placeholder="alici@firma.com  (birden fazla için virgül kullanın)"
              variant="borderless"
              disabled={gonderiliyor}
              style={{ flex: 1, fontSize: 13, paddingLeft: 0 }}
            />
          </div>

          <div style={rowStyle}>
            <span style={labelStyle}>Konu</span>
            <Input
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              variant="borderless"
              disabled={gonderiliyor}
              style={{ flex: 1, fontSize: 13, paddingLeft: 0, fontWeight: 600 }}
            />
          </div>

          <div
            style={{ ...rowStyle, alignItems: 'flex-start', flexWrap: 'wrap' }}
            onDrop={onDrop}
            onDragOver={onDragOver}
          >
            <span style={{ ...labelStyle, paddingTop: 6 }}>Ekler</span>
            <div style={{ flex: 1, display: 'flex', flexWrap: 'wrap', gap: 6, minHeight: 32, alignItems: 'center' }}>
              {ekler.map((e) => (
                <div
                  key={e.id}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                    padding: '4px 8px',
                    borderRadius: 6,
                    background: e.silinemez ? 'rgba(59,130,246,0.10)' : 'rgba(148,163,184,0.12)',
                    border: `1px solid ${e.silinemez ? 'rgba(59,130,246,0.30)' : C.borderSubtle}`,
                    fontSize: 12,
                    color: C.textPrimary,
                    maxWidth: 320,
                  }}
                >
                  <Icon icon="solar:document-bold-duotone" width={14} height={14} />
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 220 }}>
                    {e.filename}
                  </span>
                  <span style={{ color: C.textSecondary, fontSize: 11 }}>{formatBytes(e.sizeBytes)}</span>
                  {!e.silinemez && (
                    <Tooltip title="Eki kaldır">
                      <Button
                        type="text"
                        size="small"
                        onClick={() => ekKaldir(e.id)}
                        disabled={gonderiliyor}
                        icon={<Icon icon="solar:close-circle-bold-duotone" width={14} height={14} />}
                        style={{ padding: 0, width: 18, height: 18, minWidth: 0 }}
                      />
                    </Tooltip>
                  )}
                </div>
              ))}
              <Button
                type="text"
                size="small"
                icon={<Icon icon="solar:paperclip-bold-duotone" width={14} height={14} />}
                onClick={() => fileInputRef.current?.click()}
                disabled={gonderiliyor}
                style={{ fontSize: 12, color: C.textSecondary }}
              >
                Ek dosya
              </Button>
              <input
                ref={fileInputRef}
                type="file"
                multiple
                style={{ display: 'none' }}
                onChange={(e) => { void ekDosyaEkle(e.target.files); e.target.value = ''; }}
              />
            </div>
            {toplamBoyut > 0 && (
              <span style={{
                fontSize: 11,
                color: boyutAsildi ? '#ef4444' : C.textSecondary,
                marginLeft: 'auto',
              }}>
                Toplam: {formatBytes(toplamBoyut)}
              </span>
            )}
          </div>

          <div style={{ padding: '12px 0 0' }}>
            <Input.TextArea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              autoSize={{ minRows: 10, maxRows: 18 }}
              disabled={gonderiliyor}
              style={{ fontSize: 13, fontFamily: 'inherit', lineHeight: 1.6 }}
            />
          </div>

          {/* İmza önizlemesi — gönderilen mailin altına eklenecek logo bloğu.
              Sadece görsel; düzenlenemez. Mevcut firma logosu (teklif firmasının) */}
          {firmaLogoPath && (
            <div
              style={{
                marginTop: 12,
                paddingTop: 12,
                borderTop: `1px dashed ${C.borderSubtle}`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 12,
              }}
            >
              <span
                style={{
                  fontSize: 10,
                  color: C.textSecondary,
                  letterSpacing: 1,
                  textTransform: 'uppercase',
                  fontWeight: 600,
                }}
              >
                İmza Önizlemesi
              </span>
              <img
                src={firmaLogoPath}
                alt={firmaKisaAd || 'Firma logosu'}
                style={{ height: 56, width: 'auto', objectFit: 'contain', maxWidth: 220 }}
              />
            </div>
          )}

          {hata && (
            <Alert type="error" showIcon message={hata} style={{ marginTop: 12 }} />
          )}
        </div>
      )}
    </Modal>
  );
}
