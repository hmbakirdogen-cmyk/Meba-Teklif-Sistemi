/**
 * tipAnimasyonlar.tsx
 * ─────────────────────────────────────────────────────────────────
 * TipSpotlight icin gercekci, hedef-USTUNDE oynayan animasyon
 * componentleri. Her biri spotlight rect'i (viewport koordinati)
 * alir, absolute pozisyonla cursor + drag + autofill efekti cizer.
 *
 * Tum animasyonlar CSS keyframes — orchestration JS YOK, sade GPU.
 * Loop suresi ~5-6s. Her bilesen kendi keyframe'lerini icerir
 * (TipSpotlight component'i loop'u key prop ile resetler).
 *
 * Tasarim notlari:
 *  • Cursor SVG'leri ozenli — Mac-style ok, 24px goz seviyesi.
 *  • Drag/grip gesture: cursor scale 0.8 + ripple
 *  • Real-feel: hedefin gercek koordinatlarinda calisir, mock degil
 *  • Komik balon (chip): hedefe yakin, ok ile isaret eder
 */

interface AnimasyonProps {
  rect: { x: number; y: number; width: number; height: number };
}

/** Mac-style cursor SVG — 22px tall, koyu siyah + beyaz outline. */
const MacCursor = () => (
  <svg width="22" height="28" viewBox="0 0 22 28" style={{ filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.25))' }}>
    <path
      d="M 3 2 L 3 22 L 9 18 L 12.5 26 L 16 24.5 L 12.5 16.5 L 19 16 Z"
      fill="#0f172a" stroke="#fff" strokeWidth="1.3" strokeLinejoin="round"
    />
  </svg>
);

/** Drag-resize cursor (yukari-asagi ok) — yatay cizgi uzerine geldiginde. */
const ResizeCursor = () => (
  <svg width="20" height="32" viewBox="0 0 20 32" style={{ filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.30))' }}>
    <path
      d="M 10 2 L 5 8 L 8 8 L 8 24 L 5 24 L 10 30 L 15 24 L 12 24 L 12 8 L 15 8 Z"
      fill="#0f172a" stroke="#fff" strokeWidth="1.3" strokeLinejoin="round"
    />
  </svg>
);

/**
 * ROW RESIZE — Mavi cizgi tutup asagi cek
 * Cursor (resize) alttan girer, hedefin alt kenarinda mavi cizgiye gelir,
 * tutar (scale ile), asagi 60px ceker, satir GORSEL OLARAK uzar
 * (phantom outline). Release + reset.
 */
export const RowResizeAnimasyonu = ({ rect }: AnimasyonProps) => {
  const cizgiY = rect.y + rect.height; // satirin alt kenari = mavi cizgi
  const cursorStartX = rect.x + rect.width * 0.18;
  const cizgiGenisligi = Math.min(rect.width * 0.45, 240);
  return (
    <>
      {/* Mavi resize cizgisi (drag yapilacak hat) — gercek RowResizerLayer'i taklit */}
      <div
        style={{
          position: 'absolute',
          left: rect.x + 8,
          top: cizgiY - 2,
          width: cizgiGenisligi,
          height: 4,
          borderRadius: 2,
          background: 'linear-gradient(90deg, transparent 0%, #5b8def 12%, #5b8def 88%, transparent 100%)',
          boxShadow: '0 0 12px rgba(91, 141, 239, 0.85)',
          animation: 'meba-rr-cizgi 5s ease-in-out infinite',
          pointerEvents: 'none',
        }}
      />

      {/* Phantom — satirin uzayan asagi kismi (kesikli mavi outline) */}
      <div
        style={{
          position: 'absolute',
          left: rect.x,
          top: rect.y + rect.height,
          width: rect.width,
          height: 0,
          border: '2px dashed rgba(91, 141, 239, 0.7)',
          borderTop: 'none',
          borderRadius: '0 0 6px 6px',
          background: 'linear-gradient(180deg, rgba(91,141,239,0.10), rgba(91,141,239,0.02))',
          animation: 'meba-rr-phantom 5s ease-in-out infinite',
          pointerEvents: 'none',
        }}
      />

      {/* Olcum etiketi — "+ 60px" benzeri rakam, drag boyunca canlanir */}
      <div
        style={{
          position: 'absolute',
          left: rect.x + cizgiGenisligi + 14,
          top: cizgiY - 14,
          padding: '4px 10px',
          background: '#0f172a',
          color: '#fff',
          fontSize: 12, fontWeight: 700,
          borderRadius: 6,
          fontFamily: 'monospace',
          boxShadow: '0 4px 12px rgba(0,0,0,0.30)',
          animation: 'meba-rr-olcum 5s ease-in-out infinite',
          pointerEvents: 'none',
        }}
      >
        + 64 px
      </div>

      {/* Cursor — resize ok */}
      <div
        style={{
          position: 'absolute',
          left: cursorStartX,
          top: cizgiY - 16,
          animation: 'meba-rr-cursor 5s ease-in-out infinite',
          transformOrigin: 'top center',
          pointerEvents: 'none',
        }}
      >
        <ResizeCursor />
      </div>

      <style>{`
        /* Cizgi belirme + hafif parlama pulse (kullaniciya "ben hazirim" der) */
        @keyframes meba-rr-cizgi {
          0%, 10%   { opacity: 0; transform: scaleX(0.4); transform-origin: left center;
                      filter: drop-shadow(0 0 6px rgba(91,141,239,0.4)); }
          18%, 22%  { opacity: 1; transform: scaleX(1); transform-origin: left center;
                      filter: drop-shadow(0 0 14px rgba(91,141,239,0.95)); }
          26%, 92%  { opacity: 1; transform: scaleX(1); transform-origin: left center;
                      filter: drop-shadow(0 0 8px rgba(91,141,239,0.7)); }
          98%, 100% { opacity: 0; transform: scaleX(0.4); transform-origin: left center;
                      filter: drop-shadow(0 0 4px rgba(91,141,239,0.3)); }
        }
        /* Cursor: alttan girer → cizgiye yapisir (scale 0.78 = grab) → asagi
           cekilir spring-feel ile (overshoot 72 → settle 64) → release scale 1 */
        @keyframes meba-rr-cursor {
          0%, 6%    { opacity: 0; transform: translateY(40px) scale(1);
                      filter: drop-shadow(0 4px 8px rgba(0,0,0,0.20)); }
          12%, 20%  { opacity: 1; transform: translateY(0) scale(1);
                      filter: drop-shadow(0 4px 8px rgba(0,0,0,0.25)); }
          26%, 30%  { opacity: 1; transform: translateY(0) scale(0.78);
                      filter: drop-shadow(0 2px 4px rgba(0,0,0,0.40)); }
          40%       { opacity: 1; transform: translateY(24px) scale(0.78);
                      filter: drop-shadow(0 6px 10px rgba(0,0,0,0.35)); }
          52%       { opacity: 1; transform: translateY(56px) scale(0.78);
                      filter: drop-shadow(0 8px 12px rgba(0,0,0,0.40)); }
          58%       { opacity: 1; transform: translateY(72px) scale(0.78);
                      filter: drop-shadow(0 10px 14px rgba(0,0,0,0.45)); }
          66%, 72%  { opacity: 1; transform: translateY(64px) scale(0.78);
                      filter: drop-shadow(0 8px 12px rgba(0,0,0,0.42)); }
          78%, 84%  { opacity: 1; transform: translateY(64px) scale(1);
                      filter: drop-shadow(0 4px 8px rgba(0,0,0,0.22)); }
          92%, 100% { opacity: 0; transform: translateY(64px) scale(1);
                      filter: drop-shadow(0 4px 8px rgba(0,0,0,0.15)); }
        }
        /* Phantom: kesikli mavi outline, drag ile birlikte uzar + overshoot */
        @keyframes meba-rr-phantom {
          0%, 26%   { height: 0; opacity: 0; }
          34%       { height: 24px; opacity: 0.55; }
          46%       { height: 52px; opacity: 0.80; }
          58%       { height: 72px; opacity: 0.95; }
          66%, 72%  { height: 64px; opacity: 0.90; }
          78%       { height: 64px; opacity: 0.85; border-style: solid; }
          82%, 92%  { height: 64px; opacity: 0.75; border-style: solid; }
          98%, 100% { height: 0; opacity: 0; }
        }
        /* Olcum etiketi: drag esnasinda gorunur, drag boyunca degeri "buyur" gibi */
        @keyframes meba-rr-olcum {
          0%, 30%   { opacity: 0; transform: scale(0.6) translateY(8px); }
          38%, 44%  { opacity: 1; transform: scale(1.12) translateY(0); }
          50%, 78%  { opacity: 1; transform: scale(1) translateY(0); }
          88%, 100% { opacity: 0; transform: scale(0.6) translateY(8px); }
        }
      `}</style>
    </>
  );
};

/**
 * ROW INSERT — Iki satir ARASINA + butonu cikar, tikla, yeni satir akar
 * Hedef: iki satir arasindaki gap zone'u. Cursor yukaridan iner,
 * + butonu poppar, click animasyonu, yeni satir asagi kayarak gelir.
 */
export const RowInsertAnimasyonu = ({ rect }: AnimasyonProps) => {
  const ortaX = rect.x + rect.width / 2;
  const ortaY = rect.y + rect.height / 2;
  return (
    <>
      {/* + butonu (gercek satir-araya-ekle-btn'yi taklit) */}
      <div
        style={{
          position: 'absolute',
          left: ortaX,
          top: ortaY,
          transform: 'translate(-50%, -50%)',
          padding: '6px 16px',
          background: 'rgba(37, 99, 235, 0.95)',
          color: '#fff',
          fontSize: 13, fontWeight: 700,
          borderRadius: 16,
          display: 'flex', alignItems: 'center', gap: 6,
          boxShadow: '0 6px 18px rgba(37, 99, 235, 0.45)',
          animation: 'meba-ri-plus 5s ease-in-out infinite',
          pointerEvents: 'none',
        }}
      >
        <svg width="14" height="14" viewBox="0 0 14 14">
          <circle cx="7" cy="7" r="6" fill="#fff" />
          <line x1="3.5" y1="7" x2="10.5" y2="7" stroke="#2563eb" strokeWidth="1.8" strokeLinecap="round" />
          <line x1="7" y1="3.5" x2="7" y2="10.5" stroke="#2563eb" strokeWidth="1.8" strokeLinecap="round" />
        </svg>
        Araya ekle
      </div>

      {/* Ripple — click anindaki dalga */}
      <div
        style={{
          position: 'absolute',
          left: ortaX, top: ortaY,
          width: 0, height: 0,
          borderRadius: '50%',
          border: '2px solid rgba(37, 99, 235, 0.6)',
          transform: 'translate(-50%, -50%)',
          animation: 'meba-ri-ripple 5s ease-out infinite',
          pointerEvents: 'none',
        }}
      />

      {/* Yeni satir indicator — alttan kayar gelir */}
      <div
        style={{
          position: 'absolute',
          left: rect.x,
          top: rect.y + rect.height + 8,
          width: rect.width,
          height: 36,
          background: 'linear-gradient(180deg, rgba(16, 185, 129, 0.12), rgba(16, 185, 129, 0.04))',
          border: '1.5px dashed #10b981',
          borderRadius: 6,
          display: 'flex', alignItems: 'center',
          paddingLeft: 14,
          fontSize: 13, fontWeight: 700,
          color: '#047857',
          animation: 'meba-ri-yeni-satir 5s ease-in-out infinite',
          pointerEvents: 'none',
        }}
      >
        <span style={{ marginRight: 8 }}>✚</span> Yeni satır eklendi
      </div>

      {/* Cursor — yukaridan iner, + butonuna tiklar */}
      <div
        style={{
          position: 'absolute',
          left: ortaX + 22,
          top: ortaY - 50,
          animation: 'meba-ri-cursor 5s ease-in-out infinite',
          pointerEvents: 'none',
        }}
      >
        <MacCursor />
      </div>

      <style>{`
        @keyframes meba-ri-cursor {
          0%, 8%    { opacity: 0; transform: translate(40px, -30px) scale(1); }
          14%, 22%  { opacity: 1; transform: translate(0, 0) scale(1); }
          30%, 36%  { opacity: 1; transform: translate(0, 0) scale(0.78); }
          44%, 78%  { opacity: 1; transform: translate(0, 0) scale(1); }
          88%, 100% { opacity: 0; transform: translate(20px, 20px) scale(1); }
        }
        @keyframes meba-ri-plus {
          0%, 14%   { opacity: 0; transform: translate(-50%, -50%) scale(0.4); }
          22%, 32%  { opacity: 1; transform: translate(-50%, -50%) scale(1); }
          36%, 38%  { opacity: 1; transform: translate(-50%, -50%) scale(1.18); }
          44%, 78%  { opacity: 1; transform: translate(-50%, -50%) scale(1); }
          88%, 100% { opacity: 0; transform: translate(-50%, -50%) scale(0.4); }
        }
        @keyframes meba-ri-ripple {
          0%, 32%   { opacity: 0; width: 0; height: 0; }
          36%       { opacity: 0.8; width: 12px; height: 12px; border-width: 2.5px; }
          50%       { opacity: 0; width: 110px; height: 110px; border-width: 1px; }
          100%      { opacity: 0; width: 110px; height: 110px; }
        }
        @keyframes meba-ri-yeni-satir {
          0%, 40%   { opacity: 0; transform: translateY(-16px); }
          50%, 84%  { opacity: 1; transform: translateY(0); }
          92%, 100% { opacity: 0; transform: translateY(-8px); }
        }
      `}</style>
    </>
  );
};

/**
 * URUN KODU AUTOFILL — Yaz → dropdown → tikla → 3 hucre otomatik dolar
 * Hedef: Urun Kodu hucresi. Cursor cell'e tiklar, typed text belirir,
 * dropdown asagi acilir, cursor sec, marka/aciklama/fiyat sari highlight
 * ile dolar.
 */
export const UrunKoduAutofillAnimasyonu = ({ rect }: AnimasyonProps) => {
  // Gercek Marka ve Aciklama hucrelerinin rect'lerini DOM'dan al — sahte
  // overlay kutulari KENDI hucrelerinin uzerinde belirsin. rect.x'e gore
  // sabit ofset hesaplamak kirilgan ve yanlistir.
  const tr = (typeof document !== 'undefined'
    ? document.querySelector<HTMLElement>('td[data-cell-field="urunKod"]')
    : null)?.closest('tr') ?? null;
  // Iki PaginatedBelgeInlineEditor olabilir (offscreen + live); aria-hidden
  // ata'sini atlayarak gerceğini al
  let liveTr: HTMLElement | null = null;
  if (typeof document !== 'undefined') {
    for (const el of document.querySelectorAll<HTMLElement>('td[data-cell-field="urunKod"]')) {
      if (el.closest('[aria-hidden="true"]')) continue;
      liveTr = el.closest('tr');
      break;
    }
  }
  const markaEl = liveTr?.querySelector<HTMLElement>('td[data-cell-field="marka"]') ?? null;
  const aciklamaEl = liveTr?.querySelector<HTMLElement>('td[data-cell-field="aciklama"]') ?? null;
  const markaRect = markaEl?.getBoundingClientRect();
  const aciklamaRect = aciklamaEl?.getBoundingClientRect();
  void tr;

  return (
    <>
      {/* (1) Urun Kodu hucresi — yaziliyor */}
      <div
        style={{
          position: 'absolute',
          left: rect.x + 6,
          top: rect.y + rect.height / 2 - 9,
          height: 18,
          display: 'flex', alignItems: 'center',
          fontFamily: 'monospace', fontSize: 14, fontWeight: 700,
          color: '#0f172a',
          background: 'transparent',
          overflow: 'hidden', whiteSpace: 'nowrap',
          maxWidth: rect.width - 12,
          pointerEvents: 'none',
        }}
      >
        <span style={{
          display: 'inline-block', overflow: 'hidden',
          animation: 'meba-uk-yazi 5s ease-in-out infinite',
        }}>AS1201F-M5</span>
        <span style={{
          display: 'inline-block', width: 2, height: 14, background: '#0f172a', marginLeft: 2,
          animation: 'meba-uk-caret 0.6s steps(2, start) infinite',
        }} />
      </div>

      {/* (2) Urun Kodu hucresi — sari autofill (kod sectikten sonra) */}
      <div
        style={{
          position: 'absolute',
          left: rect.x, top: rect.y,
          width: rect.width, height: rect.height,
          background: '#fef3c7',
          border: '1.5px solid #f59e0b',
          borderRadius: 4,
          display: 'flex', alignItems: 'center', justifyContent: 'flex-start',
          paddingLeft: 6,
          fontFamily: 'monospace', fontSize: 13, fontWeight: 700, color: '#92400e',
          animation: 'meba-uk-fill-kod 5s ease-in-out infinite',
          pointerEvents: 'none',
        }}
      >
        AS1201F-M5
      </div>

      {/* (3) Marka hucresi — gercek hucrenin uzerinde sari autofill */}
      {markaRect && (
        <div
          style={{
            position: 'absolute',
            left: markaRect.left, top: markaRect.top,
            width: markaRect.width, height: markaRect.height,
            background: '#fef3c7',
            border: '1.5px solid #f59e0b',
            borderRadius: 4,
            display: 'flex', alignItems: 'center', justifyContent: 'flex-start',
            paddingLeft: 6,
            fontSize: 13, fontWeight: 700, color: '#92400e',
            animation: 'meba-uk-fill-marka 5s ease-in-out infinite',
            pointerEvents: 'none',
          }}
        >
          SMC
        </div>
      )}

      {/* (4) Aciklama hucresi — gercek hucrenin uzerinde sari autofill */}
      {aciklamaRect && (
        <div
          style={{
            position: 'absolute',
            left: aciklamaRect.left, top: aciklamaRect.top,
            width: aciklamaRect.width, height: aciklamaRect.height,
            background: '#fef3c7',
            border: '1.5px solid #f59e0b',
            borderRadius: 4,
            display: 'flex', alignItems: 'center', justifyContent: 'flex-start',
            paddingLeft: 6,
            fontSize: 13, fontWeight: 500, color: '#92400e',
            whiteSpace: 'nowrap', overflow: 'hidden',
            animation: 'meba-uk-fill-aciklama 5s ease-in-out infinite',
            pointerEvents: 'none',
          }}
        >
          Hava filtresi 1/4 NPT G&apos;li
        </div>
      )}

      {/* Dropdown — Urun Kodu hucresinin altinda acilir, kod sectirir */}
      <div
        style={{
          position: 'absolute',
          left: rect.x,
          top: rect.y + rect.height + 4,
          width: Math.max(rect.width, 280),
          background: '#fff',
          border: '1.5px solid #5b8def',
          borderRadius: 10,
          boxShadow: '0 12px 32px rgba(15, 23, 42, 0.18)',
          overflow: 'hidden',
          animation: 'meba-uk-dropdown 5s ease-in-out infinite',
          pointerEvents: 'none',
        }}
      >
        <div style={{ background: '#dbeafe', padding: '8px 12px', fontFamily: 'monospace', fontSize: 13, fontWeight: 800, color: '#1e3a8a' }}>
          SMC AS1201F-M5
        </div>
        <div style={{ padding: '6px 12px', fontFamily: 'monospace', fontSize: 12, color: '#475569', borderTop: '1px solid #e2e8f0' }}>
          SMC AS2001F-M5
        </div>
        <div style={{ padding: '6px 12px', fontFamily: 'monospace', fontSize: 12, color: '#475569', borderTop: '1px solid #e2e8f0' }}>
          SMC AS3001F-M5
        </div>
      </div>

      {/* Cursor — Urun Kodu hucresine gelir, dropdown'da seceriz */}
      <div
        style={{
          position: 'absolute',
          left: rect.x + rect.width / 2,
          top: rect.y + rect.height / 2,
          animation: 'meba-uk-cursor 5s ease-in-out infinite',
          pointerEvents: 'none',
        }}
      >
        <MacCursor />
      </div>

      <style>{`
        @keyframes meba-uk-yazi {
          0%, 6%    { width: 0; }
          18%, 36%  { width: 100%; }
          90%, 100% { width: 0; }
        }
        @keyframes meba-uk-caret {
          0%, 100%  { opacity: 1; }
          50%       { opacity: 0; }
        }
        @keyframes meba-uk-dropdown {
          0%, 22%   { opacity: 0; transform: translateY(-8px) scale(0.96); transform-origin: top center; }
          30%, 56%  { opacity: 1; transform: translateY(0) scale(1); transform-origin: top center; }
          62%, 100% { opacity: 0; transform: translateY(-8px) scale(0.96); transform-origin: top center; }
        }
        @keyframes meba-uk-cursor {
          0%, 4%    { opacity: 0; transform: translate(60px, 40px) scale(1); }
          10%, 18%  { opacity: 1; transform: translate(0, 0) scale(1); }
          24%, 28%  { opacity: 1; transform: translate(0, 0) scale(0.82); }
          36%, 50%  { opacity: 1; transform: translate(-10px, 56px) scale(1); }
          54%, 58%  { opacity: 1; transform: translate(-10px, 56px) scale(0.82); }
          70%, 92%  { opacity: 1; transform: translate(0, 0) scale(1); }
          98%, 100% { opacity: 0; transform: translate(20px, 20px) scale(1); }
        }
        @keyframes meba-uk-fill-kod {
          0%, 58%   { opacity: 0; }
          62%, 92%  { opacity: 1; }
          98%, 100% { opacity: 0; }
        }
        @keyframes meba-uk-fill-marka {
          0%, 64%   { opacity: 0; transform: scale(0.94); transform-origin: center; }
          70%, 74%  { opacity: 1; transform: scale(1.06); }
          80%, 92%  { opacity: 1; transform: scale(1); }
          98%, 100% { opacity: 0; transform: scale(0.94); }
        }
        @keyframes meba-uk-fill-aciklama {
          0%, 70%   { opacity: 0; transform: scale(0.94); transform-origin: center; }
          76%, 80%  { opacity: 1; transform: scale(1.05); }
          86%, 92%  { opacity: 1; transform: scale(1); }
          98%, 100% { opacity: 0; transform: scale(0.94); }
        }
      `}</style>
    </>
  );
};

/**
 * ACIKLAMA → DB SYNC — Hucredeki yazi degisir, modal sorar, "Guncelle" tikla
 * Hedef: Aciklama hucresi. Cursor cell'e tiklar, yazi fade ile yeni icerige
 * doner, alta modal poppar, cursor "Guncelle" butonuna gider.
 */
export const AciklamaSenkroAnimasyonu = ({ rect }: AnimasyonProps) => {
  const modalTop = rect.y + rect.height + 18;
  return (
    <>
      {/* Yazi degisimi — eski ve yeni overlay */}
      <div
        style={{
          position: 'absolute',
          left: rect.x + 8, top: rect.y + 4,
          width: rect.width - 16, height: rect.height - 8,
          display: 'flex', alignItems: 'center',
          fontSize: 15, fontWeight: 600,
          background: '#fff',
          paddingLeft: 4,
          pointerEvents: 'none',
        }}
      >
        <span style={{
          position: 'absolute', color: '#0f172a',
          animation: 'meba-as-eski 5s ease-in-out infinite',
        }}>Hava filtresi</span>
        <span style={{
          position: 'absolute', color: '#92400e', fontWeight: 700,
          background: 'linear-gradient(transparent 70%, #fef3c7 70%)',
          animation: 'meba-as-yeni 5s ease-in-out infinite',
        }}>Hava filtresi 1/4 NPT G'li</span>
      </div>

      {/* Modal — alta acilir */}
      <div
        style={{
          position: 'absolute',
          left: rect.x + rect.width / 2 - 200,
          top: modalTop,
          width: 400,
          background: '#fff',
          borderRadius: 12,
          boxShadow: '0 18px 48px rgba(15, 23, 42, 0.25)',
          border: '1px solid #e2e8f0',
          overflow: 'hidden',
          animation: 'meba-as-modal 5s cubic-bezier(0.16, 1, 0.3, 1) infinite',
          pointerEvents: 'none',
        }}
      >
        <div style={{ background: '#f8fafc', padding: '14px 18px', borderBottom: '1px solid #e2e8f0' }}>
          <div style={{ fontSize: 16, fontWeight: 800, color: '#0f172a' }}>Açıklama Veritabanına Yazılsın mı?</div>
        </div>
        <div style={{ padding: '16px 18px' }}>
          <div style={{ fontSize: 14, color: '#475569', marginBottom: 4 }}>
            Aynı ürün bir dahaki sefer seçildiğinde <b>yeni açıklama</b> otomatik gelsin.
          </div>
          <div style={{ fontSize: 13, color: '#94a3b8' }}>
            Sadece bu teklif için kalmak istersen "Şimdilik" de.
          </div>
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, padding: '12px 18px 16px 18px' }}>
          <div style={{
            padding: '8px 16px', fontSize: 13, fontWeight: 600, color: '#475569',
            border: '1px solid #cbd5e1', borderRadius: 8, background: '#fff',
          }}>
            Şimdilik
          </div>
          <div style={{
            padding: '8px 18px', fontSize: 13, fontWeight: 800, color: '#fff',
            background: 'linear-gradient(135deg, #5b8def, #4f7ee0)', borderRadius: 8,
            boxShadow: '0 4px 12px rgba(91, 141, 239, 0.4)',
            animation: 'meba-as-guncelle-vurgu 5s ease-in-out infinite',
          }}>
            Güncelle
          </div>
        </div>
      </div>

      {/* Cursor — cell, sonra Guncelle butonu */}
      <div
        style={{
          position: 'absolute',
          left: rect.x + rect.width / 2,
          top: rect.y + rect.height / 2,
          animation: 'meba-as-cursor 5s ease-in-out infinite',
          pointerEvents: 'none',
        }}
      >
        <MacCursor />
      </div>

      <style>{`
        @keyframes meba-as-eski {
          0%, 14%   { opacity: 1; }
          22%, 95%  { opacity: 0; }
          100%      { opacity: 1; }
        }
        @keyframes meba-as-yeni {
          0%, 18%   { opacity: 0; }
          26%, 95%  { opacity: 1; }
          100%      { opacity: 0; }
        }
        @keyframes meba-as-modal {
          0%, 30%   { opacity: 0; transform: translateY(12px) scale(0.92); transform-origin: top center; }
          40%, 88%  { opacity: 1; transform: translateY(0) scale(1); transform-origin: top center; }
          96%, 100% { opacity: 0; transform: translateY(8px) scale(0.94); }
        }
        @keyframes meba-as-cursor {
          0%, 4%    { opacity: 0; transform: translate(40px, 30px) scale(1); }
          10%, 16%  { opacity: 1; transform: translate(0, 0) scale(1); }
          22%, 26%  { opacity: 1; transform: translate(0, 0) scale(0.82); }
          34%, 56%  { opacity: 1; transform: translate(0, 0) scale(1); }
          64%, 70%  { opacity: 1; transform: translate(${30}px, ${100}px) scale(1); }
          74%, 78%  { opacity: 1; transform: translate(${30}px, ${100}px) scale(0.78); }
          84%, 92%  { opacity: 1; transform: translate(${30}px, ${100}px) scale(1); }
          98%, 100% { opacity: 0; transform: translate(${50}px, ${120}px) scale(1); }
        }
        @keyframes meba-as-guncelle-vurgu {
          0%, 64%   { box-shadow: 0 4px 12px rgba(91, 141, 239, 0.4); }
          70%, 76%  { box-shadow: 0 0 0 4px rgba(91, 141, 239, 0.35), 0 6px 18px rgba(91, 141, 239, 0.6); }
          84%, 100% { box-shadow: 0 4px 12px rgba(91, 141, 239, 0.4); }
        }
      `}</style>
    </>
  );
};

/**
 * URUN KODU DEGISIMI
 * Mevcut dolu satirda kodu degistirince ne olur?
 *  - Marka: HER ZAMAN yeni urunun markasiyla degisir (sari highlight)
 *  - Aciklama: DB'de kanonik varsa onunla degisir (sari highlight), yoksa korunur
 *  - Birim Fiyat: BOSSA dolar, doluysa KORUNUR (yesil "korundu" rozeti)
 *  - Birim: BOSSA dolar, doluysa KORUNUR
 * Hedef: td[data-cell-field="urunKod"] (autofill ile ayni). Gercek Marka ve
 * Aciklama hucrelerinin DOM rect'lerini bulup uzerlerinde gosterimi yapariz.
 */
export const UrunKoduDegisimAnimasyonu = ({ rect }: AnimasyonProps) => {
  // Gercek Marka, Aciklama, Birim Fiyat hucrelerinin rect'lerini DOM'dan al
  let liveTr: HTMLElement | null = null;
  if (typeof document !== 'undefined') {
    for (const el of document.querySelectorAll<HTMLElement>('td[data-cell-field="urunKod"]')) {
      if (el.closest('[aria-hidden="true"]')) continue;
      liveTr = el.closest('tr');
      break;
    }
  }
  const markaEl = liveTr?.querySelector<HTMLElement>('td[data-cell-field="marka"]') ?? null;
  const aciklamaEl = liveTr?.querySelector<HTMLElement>('td[data-cell-field="aciklama"]') ?? null;
  const fiyatEl = liveTr?.querySelector<HTMLElement>('td[data-cell-field="birimFiyat"]') ?? null;
  const markaRect = markaEl?.getBoundingClientRect();
  const aciklamaRect = aciklamaEl?.getBoundingClientRect();
  const fiyatRect = fiyatEl?.getBoundingClientRect();

  return (
    <>
      {/* (1) Urun Kodu hucresi — eski kod silinir, yeni kod yazilir */}
      <div
        style={{
          position: 'absolute',
          left: rect.x, top: rect.y,
          width: rect.width, height: rect.height,
          background: '#fff',
          border: '1.5px solid #5b8def',
          borderRadius: 4,
          display: 'flex', alignItems: 'center', paddingLeft: 6,
          fontFamily: 'monospace', fontSize: 13, fontWeight: 700, color: '#0f172a',
          overflow: 'hidden', whiteSpace: 'nowrap',
          animation: 'meba-uk-kod-cerceve 6s ease-in-out infinite',
          pointerEvents: 'none',
        }}
      >
        <span style={{
          position: 'absolute', left: 6, top: '50%', transform: 'translateY(-50%)',
          animation: 'meba-uk-kod-eski 6s ease-in-out infinite',
        }}>AS1201F-M5</span>
        <span style={{
          position: 'absolute', left: 6, top: '50%', transform: 'translateY(-50%)',
          color: '#92400e',
          animation: 'meba-uk-kod-yeni 6s ease-in-out infinite',
        }}>WL12-3P2431</span>
      </div>

      {/* (2) Marka — HER ZAMAN degisir (sari, "yeniden yazildi" vurgusu) */}
      {markaRect && (
        <div
          style={{
            position: 'absolute',
            left: markaRect.left, top: markaRect.top,
            width: markaRect.width, height: markaRect.height,
            background: '#fef3c7',
            border: '1.5px solid #f59e0b',
            borderRadius: 4,
            display: 'flex', alignItems: 'center', paddingLeft: 6,
            fontSize: 13, fontWeight: 700, color: '#92400e',
            animation: 'meba-uk-marka-degis 6s ease-in-out infinite',
            pointerEvents: 'none',
          }}
        >
          SICK
          <span style={{
            position: 'absolute', top: -8, right: -6,
            fontSize: 9, fontWeight: 800, color: '#fff',
            background: '#f59e0b', padding: '1px 6px', borderRadius: 999,
            boxShadow: '0 2px 6px rgba(245,158,11,0.4)',
            animation: 'meba-uk-degisti-rozet 6s ease-in-out infinite',
          }}>DEĞİŞTİ</span>
        </div>
      )}

      {/* (3) Aciklama — DB'de varsa degisir (sari) */}
      {aciklamaRect && (
        <div
          style={{
            position: 'absolute',
            left: aciklamaRect.left, top: aciklamaRect.top,
            width: aciklamaRect.width, height: aciklamaRect.height,
            background: '#fef3c7',
            border: '1.5px solid #f59e0b',
            borderRadius: 4,
            display: 'flex', alignItems: 'center', paddingLeft: 6,
            fontSize: 13, fontWeight: 500, color: '#92400e',
            whiteSpace: 'nowrap', overflow: 'hidden',
            animation: 'meba-uk-aciklama-degis 6s ease-in-out infinite',
            pointerEvents: 'none',
          }}
        >
          Optik sensör (M12 konnektörlü)
        </div>
      )}

      {/* (4) Birim Fiyat — KORUNUR (yesil "korundu" rozeti) */}
      {fiyatRect && (
        <div
          style={{
            position: 'absolute',
            left: fiyatRect.left, top: fiyatRect.top,
            width: fiyatRect.width, height: fiyatRect.height,
            background: '#ecfdf5',
            border: '1.5px solid #10b981',
            borderRadius: 4,
            display: 'flex', alignItems: 'center', paddingLeft: 6,
            fontFamily: 'monospace', fontSize: 13, fontWeight: 700, color: '#065f46',
            animation: 'meba-uk-fiyat-korunur 6s ease-in-out infinite',
            pointerEvents: 'none',
          }}
        >
          125,00 €
          <span style={{
            position: 'absolute', top: -8, right: -6,
            fontSize: 9, fontWeight: 800, color: '#fff',
            background: '#10b981', padding: '1px 6px', borderRadius: 999,
            boxShadow: '0 2px 6px rgba(16,185,129,0.4)',
            animation: 'meba-uk-korundu-rozet 6s ease-in-out infinite',
            whiteSpace: 'nowrap',
          }}>KORUNDU</span>
        </div>
      )}

      {/* Cursor — Urun Kodu hucresine tiklar */}
      <div
        style={{
          position: 'absolute',
          left: rect.x + rect.width / 2,
          top: rect.y + rect.height / 2,
          animation: 'meba-uk-deg-cursor 6s ease-in-out infinite',
          pointerEvents: 'none',
        }}
      >
        <MacCursor />
      </div>

      <style>{`
        @keyframes meba-uk-kod-cerceve {
          0%, 6%    { border-color: #cbd5e1; }
          14%, 80%  { border-color: #5b8def; box-shadow: 0 0 0 3px rgba(91,141,239,0.18); }
          88%, 100% { border-color: #cbd5e1; box-shadow: none; }
        }
        @keyframes meba-uk-kod-eski {
          0%, 14%   { opacity: 1; }
          22%, 100% { opacity: 0; }
        }
        @keyframes meba-uk-kod-yeni {
          0%, 22%   { opacity: 0; clip-path: inset(0 100% 0 0); }
          30%, 38%  { opacity: 1; clip-path: inset(0 0 0 0); }
          88%, 100% { opacity: 0; clip-path: inset(0 0 0 0); }
        }
        @keyframes meba-uk-deg-cursor {
          0%, 4%    { opacity: 0; transform: translate(60px, 30px) scale(1); }
          10%, 14%  { opacity: 1; transform: translate(0, 0) scale(1); }
          18%, 22%  { opacity: 1; transform: translate(0, 0) scale(0.82); }
          30%, 86%  { opacity: 1; transform: translate(0, 0) scale(1); }
          94%, 100% { opacity: 0; transform: translate(20px, 20px) scale(1); }
        }
        @keyframes meba-uk-marka-degis {
          0%, 38%   { opacity: 0; transform: scale(0.92); transform-origin: center; }
          46%, 50%  { opacity: 1; transform: scale(1.08); }
          58%, 90%  { opacity: 1; transform: scale(1); }
          96%, 100% { opacity: 0; transform: scale(0.92); }
        }
        @keyframes meba-uk-aciklama-degis {
          0%, 44%   { opacity: 0; transform: scale(0.92); }
          52%, 56%  { opacity: 1; transform: scale(1.06); }
          64%, 90%  { opacity: 1; transform: scale(1); }
          96%, 100% { opacity: 0; transform: scale(0.92); }
        }
        @keyframes meba-uk-fiyat-korunur {
          0%, 50%   { opacity: 0; }
          60%, 90%  { opacity: 1; }
          96%, 100% { opacity: 0; }
        }
        @keyframes meba-uk-degisti-rozet {
          0%, 44%   { opacity: 0; transform: scale(0); }
          50%, 52%  { opacity: 1; transform: scale(1.2); }
          58%, 90%  { opacity: 1; transform: scale(1); }
          96%, 100% { opacity: 0; transform: scale(0); }
        }
        @keyframes meba-uk-korundu-rozet {
          0%, 56%   { opacity: 0; transform: scale(0); }
          62%, 64%  { opacity: 1; transform: scale(1.2); }
          70%, 90%  { opacity: 1; transform: scale(1); }
          96%, 100% { opacity: 0; transform: scale(0); }
        }
      `}</style>
    </>
  );
};

/**
 * PARA BIRIMI — KARISIK SECIMI
 * Hedef: Para Birimi karti (data-alan="ayar-paraBirimi").
 * Sahne:
 *  1. Cursor karta yaklasir, tiklar → dropdown acilir
 *  2. Dropdown listesi: ₺ TL / € EUR / $ USD / Karısık (₺·€·$)
 *  3. Cursor "Karısık" satirina kayar, tiklar
 *  4. Kart degeri "Karısık" olur
 *  5. Kartin altinda 3 mini satir belirir, her biri farkli para birimi:
 *     125 € | 145 $ | 8.500 ₺
 *     Her satir yanindaki badge sirayla parlar — "her satir kendi PB'sini tasir"
 */
export const ParaBirimiKarisikAnimasyonu = ({ rect }: AnimasyonProps) => {
  const cellCenterX = rect.x + rect.width / 2;
  const cellCenterY = rect.y + rect.height / 2;
  // Dropdown kartin ALTINA acilir
  const dropTop = rect.y + rect.height + 6;
  const dropLeft = rect.x;
  const dropWidth = Math.max(rect.width, 200);

  // Mini satir gosterimi: kartin ALTINDA, dropdown'dan sonra
  // Eger ekranin altina yer yoksa USTE alabiliriz; ama tipik kart 5cm yuksekliginde,
  // alt bos genelde vardir. Basitlik icin alta koyalim.
  const satirTop = dropTop + 168 + 12; // dropdown yüksekliği ~168, gap 12
  const satirLeft = dropLeft;

  return (
    <>
      {/* (1) Dropdown — kartin altinda acilir */}
      <div
        style={{
          position: 'absolute',
          left: dropLeft, top: dropTop,
          width: dropWidth,
          background: '#fff',
          border: '1.5px solid #5b8def',
          borderRadius: 10,
          boxShadow: '0 14px 36px rgba(15, 23, 42, 0.20)',
          overflow: 'hidden',
          animation: 'meba-pb-dropdown 6s ease-in-out infinite',
          pointerEvents: 'none',
        }}
      >
        {[
          { sembol: '₺', kod: 'TRY', etiket: 'TL', vurgu: false },
          { sembol: '€', kod: 'EUR', etiket: 'Euro', vurgu: false },
          { sembol: '$', kod: 'USD', etiket: 'Dolar', vurgu: false },
        ].map((item, idx) => (
          <div
            key={item.kod}
            style={{
              padding: '10px 14px',
              display: 'flex', alignItems: 'center', gap: 12,
              borderBottom: '1px solid #f1f5f9',
              fontSize: 13, fontWeight: 600, color: '#475569',
            }}
          >
            <span style={{
              fontSize: 18, fontWeight: 800,
              color: idx === 0 ? '#475569' : idx === 1 ? '#5b8def' : '#10b981',
              minWidth: 18, textAlign: 'center',
            }}>{item.sembol}</span>
            <span style={{ flex: 1 }}>{item.etiket}</span>
            <span style={{ fontFamily: 'monospace', fontSize: 11, color: '#94a3b8' }}>{item.kod}</span>
          </div>
        ))}
        {/* Karisik secenegi — son sira, vurgulu (animasyonla highlight) */}
        <div
          style={{
            padding: '12px 14px',
            display: 'flex', alignItems: 'center', gap: 10,
            background: '#dbeafe',
            fontSize: 14, fontWeight: 800, color: '#1e3a8a',
            animation: 'meba-pb-karisik-vurgu 6s ease-in-out infinite',
          }}
        >
          <span style={{ display: 'flex', gap: 4, fontSize: 16 }}>
            <span style={{ color: '#475569' }}>₺</span>
            <span style={{ color: '#5b8def' }}>·</span>
            <span style={{ color: '#5b8def' }}>€</span>
            <span style={{ color: '#5b8def' }}>·</span>
            <span style={{ color: '#10b981' }}>$</span>
          </span>
          <span style={{ flex: 1 }}>Karışık</span>
          <span style={{ fontSize: 11, color: '#1e3a8a', opacity: 0.75 }}>Satır bazlı</span>
        </div>
      </div>

      {/* (2) Cursor — kart → dropdown → "Karisik" satirina kayar */}
      <div
        style={{
          position: 'absolute',
          left: cellCenterX, top: cellCenterY,
          animation: 'meba-pb-cursor 6s ease-in-out infinite',
          pointerEvents: 'none',
        }}
      >
        <MacCursor />
      </div>

      {/* (3) Sonuc — 3 mini satir, her biri farkli para birimi */}
      <div
        style={{
          position: 'absolute',
          left: satirLeft, top: satirTop,
          width: dropWidth,
          animation: 'meba-pb-sonuc 6s ease-in-out infinite',
          pointerEvents: 'none',
        }}
      >
        {[
          { no: '01', tutar: '125,00', sembol: '€', renk: '#5b8def', delay: 0 },
          { no: '02', tutar: '145,00', sembol: '$', renk: '#10b981', delay: 1 },
          { no: '03', tutar: '8.500,00', sembol: '₺', renk: '#64748b', delay: 2 },
        ].map((s) => (
          <div
            key={s.no}
            style={{
              display: 'flex', alignItems: 'center',
              padding: '6px 10px', marginBottom: 4,
              background: '#fff',
              border: `1.5px solid ${s.renk}`,
              borderRadius: 6,
              fontSize: 12,
              boxShadow: `0 2px 8px ${s.renk}30`,
              animation: `meba-pb-satir-${s.delay} 6s ease-in-out infinite`,
            }}
          >
            <span style={{ fontWeight: 700, color: '#1e293b', marginRight: 10 }}>{s.no}</span>
            <span style={{ flex: 1, color: '#475569', fontFamily: 'monospace' }}>{s.tutar}</span>
            <span style={{
              padding: '2px 8px', borderRadius: 4,
              background: s.renk, color: '#fff',
              fontSize: 13, fontWeight: 800,
              minWidth: 22, textAlign: 'center',
            }}>{s.sembol}</span>
          </div>
        ))}
      </div>

      <style>{`
        @keyframes meba-pb-dropdown {
          0%, 18%   { opacity: 0; transform: translateY(-8px) scale(0.94); transform-origin: top center; }
          25%, 75%  { opacity: 1; transform: translateY(0) scale(1); transform-origin: top center; }
          82%, 100% { opacity: 0; transform: translateY(-8px) scale(0.94); transform-origin: top center; }
        }
        @keyframes meba-pb-karisik-vurgu {
          0%, 38%   { background: #dbeafe; box-shadow: none; }
          44%, 54%  { background: #bfdbfe; box-shadow: inset 0 0 0 2px #5b8def, 0 0 20px rgba(91,141,239,0.4); }
          62%, 75%  { background: #dbeafe; box-shadow: none; }
          100%      { background: #dbeafe; }
        }
        @keyframes meba-pb-cursor {
          0%, 4%    { opacity: 0; transform: translate(60px, 30px) scale(1); }
          10%, 18%  { opacity: 1; transform: translate(0, 0) scale(1); }
          24%, 28%  { opacity: 1; transform: translate(0, 0) scale(0.82); }
          36%, 46%  { opacity: 1; transform: translate(-10px, 140px) scale(1); }
          50%, 54%  { opacity: 1; transform: translate(-10px, 140px) scale(0.82); }
          62%, 78%  { opacity: 1; transform: translate(-10px, 140px) scale(1); }
          88%, 100% { opacity: 0; transform: translate(20px, 160px) scale(1); }
        }
        @keyframes meba-pb-sonuc {
          0%, 60%   { opacity: 0; transform: translateY(-8px); }
          68%, 92%  { opacity: 1; transform: translateY(0); }
          98%, 100% { opacity: 0; transform: translateY(-8px); }
        }
        /* 3 satir sirayla "parlar" — kendi para birimi rozeti hafif scale + glow */
        @keyframes meba-pb-satir-0 {
          0%, 62%   { transform: scale(0.94); opacity: 0; }
          68%, 72%  { transform: scale(1.04); opacity: 1; box-shadow: 0 4px 16px rgba(91,141,239,0.50); }
          78%, 92%  { transform: scale(1); opacity: 1; }
          98%, 100% { transform: scale(0.94); opacity: 0; }
        }
        @keyframes meba-pb-satir-1 {
          0%, 66%   { transform: scale(0.94); opacity: 0; }
          72%, 76%  { transform: scale(1.04); opacity: 1; box-shadow: 0 4px 16px rgba(16,185,129,0.50); }
          82%, 92%  { transform: scale(1); opacity: 1; }
          98%, 100% { transform: scale(0.94); opacity: 0; }
        }
        @keyframes meba-pb-satir-2 {
          0%, 70%   { transform: scale(0.94); opacity: 0; }
          76%, 80%  { transform: scale(1.04); opacity: 1; box-shadow: 0 4px 16px rgba(100,116,139,0.45); }
          86%, 92%  { transform: scale(1); opacity: 1; }
          98%, 100% { transform: scale(0.94); opacity: 0; }
        }
      `}</style>
    </>
  );
};

/**
 * BIRIM FIYAT + ISKONTO POPUP
 * Hedef: Birim Fiyat hucresi (td[data-cell-field="birimFiyat"]).
 * Sahne:
 *  1. Cursor hucreye tiklar
 *  2. Popup acilir hedefin ALTINDA — uc bolum:
 *     - Birim Fiyat alani: "125,00 €"
 *     - Liste fiyati bandi: "Liste fiyati: 145,00 €" (kucuk hint chip)
 *     - Iskonto % alani: solgun "%" placeholder
 *  3. Cursor Iskonto alanina kayar
 *  4. Iskonto alani CANLANIR (opacity dim → bold + sari highlight) + deger yazilir "10"
 *  5. Yesil "uygula" tick — satira yansidi vurgusu
 */
export const BirimFiyatPopupAnimasyonu = ({ rect }: AnimasyonProps) => {
  const cellCenterX = rect.x + rect.width / 2;
  const cellCenterY = rect.y + rect.height / 2;
  const popupTop = rect.y + rect.height + 8;
  // Popup hedefin saginda ise viewport disina cikabilir — hedefe gore SOL hizali,
  // viewport sinirinda clamping yap.
  const popupGenis = 260;
  const popupSol = Math.min(rect.x, window.innerWidth - popupGenis - 16);

  return (
    <>
      {/* Popup karti */}
      <div
        style={{
          position: 'absolute',
          left: popupSol, top: popupTop,
          width: popupGenis,
          background: '#fff',
          border: '1px solid #cbd5e1',
          borderRadius: 12,
          boxShadow: '0 18px 48px rgba(15, 23, 42, 0.22)',
          padding: 14,
          animation: 'meba-bf-popup 6s ease-in-out infinite',
          pointerEvents: 'none',
        }}
      >
        {/* Birim Fiyat alani */}
        <div style={{ marginBottom: 10 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#64748b', marginBottom: 4, letterSpacing: '0.04em', textTransform: 'uppercase' }}>
            Birim Fiyat
          </div>
          <div style={{
            border: '1.5px solid #cbd5e1', borderRadius: 8, padding: '8px 12px',
            fontFamily: 'monospace', fontSize: 16, fontWeight: 700, color: '#0f172a',
            background: '#f8fafc',
          }}>
            125,00 €
          </div>
        </div>

        {/* Liste fiyati bandi — ipucu chip */}
        <div style={{
          padding: '6px 10px', marginBottom: 12,
          background: '#dbeafe', borderRadius: 6,
          fontSize: 11, color: '#1e3a8a', display: 'flex', alignItems: 'center', gap: 6,
        }}>
          <span style={{ fontWeight: 800 }}>Liste:</span>
          <span style={{ fontFamily: 'monospace', fontWeight: 700 }}>145,00 €</span>
          <span style={{ marginLeft: 'auto', fontSize: 10, opacity: 0.75 }}>Uygula</span>
        </div>

        {/* Iskonto alani — solgun → canli gecisi */}
        <div>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#64748b', marginBottom: 4, letterSpacing: '0.04em', textTransform: 'uppercase' }}>
            Bu Satırın İskontosu
          </div>
          <div
            style={{
              position: 'relative',
              border: '1.5px solid #cbd5e1', borderRadius: 8, padding: '8px 12px',
              fontFamily: 'monospace', fontSize: 16, fontWeight: 700,
              animation: 'meba-bf-iskonto-kutu 6s ease-in-out infinite',
            }}
          >
            <span style={{
              position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)',
              animation: 'meba-bf-iskonto-deger 6s ease-in-out infinite',
            }}>10</span>
            <span style={{
              position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
              color: '#94a3b8', fontWeight: 600,
              animation: 'meba-bf-iskonto-percent 6s ease-in-out infinite',
            }}>%</span>
            <span style={{ visibility: 'hidden' }}>10</span>
          </div>
          <div style={{
            marginTop: 6, fontSize: 11, color: '#64748b', fontStyle: 'italic',
            animation: 'meba-bf-iskonto-ipucu 6s ease-in-out infinite',
          }}>
            Bu satıra özel — diğer satırlara dokunulmaz
          </div>
        </div>

        {/* Yesil "uygula" tick */}
        <div
          style={{
            position: 'absolute', top: -10, right: -10,
            width: 32, height: 32,
            background: '#10b981', borderRadius: '50%',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: '#fff', fontSize: 18, fontWeight: 800,
            boxShadow: '0 4px 14px rgba(16, 185, 129, 0.45)',
            animation: 'meba-bf-onay 6s ease-in-out infinite',
          }}
        >
          ✓
        </div>
      </div>

      {/* Cursor — hucre → Iskonto alanina kayar */}
      <div
        style={{
          position: 'absolute',
          left: cellCenterX, top: cellCenterY,
          animation: 'meba-bf-cursor 6s ease-in-out infinite',
          pointerEvents: 'none',
        }}
      >
        <MacCursor />
      </div>

      <style>{`
        @keyframes meba-bf-popup {
          0%, 12%   { opacity: 0; transform: translateY(-8px) scale(0.94); transform-origin: top center; }
          22%, 82%  { opacity: 1; transform: translateY(0) scale(1); transform-origin: top center; }
          90%, 100% { opacity: 0; transform: translateY(-8px) scale(0.94); transform-origin: top center; }
        }
        @keyframes meba-bf-cursor {
          0%, 4%    { opacity: 0; transform: translate(60px, 30px) scale(1); }
          10%, 18%  { opacity: 1; transform: translate(0, 0) scale(1); }
          24%, 28%  { opacity: 1; transform: translate(0, 0) scale(0.82); }
          /* iskonto alanina iner (popup'in alt 3/4'u — ~140px asagi, ~10px sola) */
          40%, 46%  { opacity: 1; transform: translate(-${rect.width / 2 - 60}px, ${rect.height + 160}px) scale(1); }
          50%, 54%  { opacity: 1; transform: translate(-${rect.width / 2 - 60}px, ${rect.height + 160}px) scale(0.82); }
          62%, 84%  { opacity: 1; transform: translate(-${rect.width / 2 - 60}px, ${rect.height + 160}px) scale(1); }
          92%, 100% { opacity: 0; transform: translate(-${rect.width / 2 - 40}px, ${rect.height + 180}px) scale(1); }
        }
        /* Iskonto kutusu: solgun → canli (sari highlight) */
        @keyframes meba-bf-iskonto-kutu {
          0%, 40%   { border-color: #cbd5e1; background: #fff; box-shadow: none; }
          50%, 78%  { border-color: #f59e0b; background: #fef3c7;
                      box-shadow: 0 0 0 3px rgba(245,158,11,0.18); }
          90%, 100% { border-color: #cbd5e1; background: #fff; box-shadow: none; }
        }
        @keyframes meba-bf-iskonto-deger {
          0%, 50%   { opacity: 0; color: #92400e; }
          58%, 80%  { opacity: 1; color: #92400e; }
          90%, 100% { opacity: 0; color: #92400e; }
        }
        @keyframes meba-bf-iskonto-percent {
          0%, 42%   { opacity: 0.4; color: #94a3b8; }
          50%, 80%  { opacity: 1; color: #92400e; }
          90%, 100% { opacity: 0.4; color: #94a3b8; }
        }
        @keyframes meba-bf-iskonto-ipucu {
          0%, 46%   { opacity: 0; }
          54%, 82%  { opacity: 1; }
          92%, 100% { opacity: 0; }
        }
        @keyframes meba-bf-onay {
          0%, 70%   { opacity: 0; transform: scale(0); }
          76%, 80%  { opacity: 1; transform: scale(1.25); }
          84%, 90%  { opacity: 1; transform: scale(1); }
          100%      { opacity: 0; transform: scale(0); }
        }
      `}</style>
    </>
  );
};

/**
 * TARIH DEGISIMI
 * Hedef: tr[data-tip-target="tarih"] — Teklif basligindaki tarih satiri.
 * Sahne: cursor tarih hucresine tiklar → mini takvim popover acilir →
 * bir tarih (28) highlight + cursor tiklamasi → hucre yeni tarihi alir.
 */
export const TarihDegisimAnimasyonu = ({ rect }: AnimasyonProps) => {
  const cellCenterX = rect.x + rect.width / 2;
  const cellCenterY = rect.y + rect.height / 2;
  const popTop = rect.y + rect.height + 8;
  const popLeft = Math.min(rect.x, window.innerWidth - 220 - 16);

  return (
    <>
      {/* Mini takvim popover */}
      <div
        style={{
          position: 'absolute',
          left: popLeft, top: popTop,
          width: 220,
          background: '#fff',
          border: '1px solid #cbd5e1',
          borderRadius: 10,
          boxShadow: '0 16px 40px rgba(15,23,42,0.20)',
          padding: 12,
          animation: 'meba-td-pop 6s ease-in-out infinite',
          pointerEvents: 'none',
        }}
      >
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          marginBottom: 8, fontSize: 12, fontWeight: 800, color: '#1e293b',
        }}>
          <span>‹</span><span>Mayıs 2026</span><span>›</span>
        </div>
        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 2,
          fontSize: 10, color: '#94a3b8', textAlign: 'center', marginBottom: 4,
        }}>
          {['Pt','Sa','Ça','Pe','Cu','Ct','Pz'].map((g) => <span key={g}>{g}</span>)}
        </div>
        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 2,
          fontSize: 11, color: '#475569', textAlign: 'center', fontVariantNumeric: 'tabular-nums',
        }}>
          {[
            '',  '',  '',  '',  '1', '2', '3',
            '4', '5', '6', '7', '8', '9','10',
           '11','12','13','14','15','16','17',
           '18','19','20','21','22','23','24',
           '25','26','27','28','29','30','31',
          ].map((g, i) => {
            const sec = g === '28';
            return (
              <span
                key={i}
                style={{
                  padding: '4px 0', borderRadius: 4,
                  background: sec ? '#5b8def' : 'transparent',
                  color: sec ? '#fff' : '#475569',
                  fontWeight: sec ? 800 : 500,
                  animation: sec ? 'meba-td-sec 6s ease-in-out infinite' : undefined,
                }}
              >{g}</span>
            );
          })}
        </div>
      </div>

      {/* Hucre yeni degeri */}
      <div
        style={{
          position: 'absolute',
          left: rect.x + 70, top: rect.y + 2,
          padding: '2px 8px', background: '#fef3c7',
          border: '1.5px solid #f59e0b', borderRadius: 4,
          fontSize: 11, fontWeight: 700, color: '#92400e',
          animation: 'meba-td-yeni 6s ease-in-out infinite',
          pointerEvents: 'none',
        }}
      >
        28.05.2026
      </div>

      {/* Cursor — hucre → takvim → 28 */}
      <div
        style={{
          position: 'absolute',
          left: cellCenterX, top: cellCenterY,
          animation: 'meba-td-cursor 6s ease-in-out infinite',
          pointerEvents: 'none',
        }}
      >
        <MacCursor />
      </div>

      <style>{`
        @keyframes meba-td-pop {
          0%, 14%   { opacity: 0; transform: translateY(-8px) scale(0.94); transform-origin: top center; }
          22%, 82%  { opacity: 1; transform: translateY(0) scale(1); }
          90%, 100% { opacity: 0; transform: translateY(-8px) scale(0.94); }
        }
        @keyframes meba-td-sec {
          0%, 50%   { background: #5b8def; transform: scale(1); }
          56%, 60%  { background: #1d4ed8; transform: scale(1.25); box-shadow: 0 0 12px rgba(91,141,239,0.6); }
          70%, 100% { background: #5b8def; transform: scale(1); }
        }
        @keyframes meba-td-yeni {
          0%, 60%   { opacity: 0; transform: scale(0.9); }
          68%, 90%  { opacity: 1; transform: scale(1); }
          96%, 100% { opacity: 0; transform: scale(0.9); }
        }
        @keyframes meba-td-cursor {
          0%, 4%    { opacity: 0; transform: translate(60px, 30px); }
          10%, 18%  { opacity: 1; transform: translate(0, 0); }
          22%, 26%  { opacity: 1; transform: translate(0, 0) scale(0.82); }
          /* 28 hucresi takvim 5. satir, 4. sutun — sag-asagi yaklasik 100px asagi, 30px saga */
          40%, 50%  { opacity: 1; transform: translate(20px, 110px); }
          54%, 58%  { opacity: 1; transform: translate(20px, 110px) scale(0.82); }
          66%, 88%  { opacity: 1; transform: translate(0, 0); }
          96%, 100% { opacity: 0; transform: translate(20px, 20px); }
        }
      `}</style>
    </>
  );
};

/**
 * KILIT — Yesil/Kirmizi
 * Hedef: button[data-tip-target="kilit"] — kontrol panelinde kilit butonu.
 * Sahne: kilit kirmizi → yesile dondurulur → "yapilabilir" listesi solda belirir
 * → tekrar kirmiziya doner → "yapilamaz" listesi sagda belirir.
 */
export const KilitDurumAnimasyonu = ({ rect }: AnimasyonProps) => {
  const cellCenterX = rect.x + rect.width / 2;
  const cellCenterY = rect.y + rect.height / 2;
  // Kilit kontrol panelinin SOLUNDA — listeler kartin DISINA dogru cizilir
  const listSagDan = window.innerWidth - rect.x + 16; // sol tarafa offset
  const listGenis = 220;

  return (
    <>
      {/* Yesil "yapilabilir" listesi — kilit acikken */}
      <div
        style={{
          position: 'absolute',
          right: listSagDan, top: cellCenterY - 90,
          width: listGenis,
          background: '#ecfdf5', border: '2px solid #10b981', borderRadius: 10,
          padding: '10px 12px',
          boxShadow: '0 8px 24px rgba(16,185,129,0.18)',
          animation: 'meba-kl-yesil 6s ease-in-out infinite',
          pointerEvents: 'none',
        }}
      >
        <div style={{ fontSize: 11, fontWeight: 800, color: '#065f46', marginBottom: 6, letterSpacing: '0.04em', textTransform: 'uppercase' }}>
          ✓ Düzenleme açık
        </div>
        {[
          'Satır ekleme · silme',
          'Hücreye yazma',
          'İskonto girme',
          'Para birimi değişimi',
        ].map((t, i) => (
          <div key={i} style={{
            fontSize: 12, fontWeight: 500, color: '#064e3b', padding: '3px 0',
            display: 'flex', alignItems: 'center', gap: 6,
          }}>
            <span style={{ color: '#10b981', fontWeight: 800 }}>✓</span>
            <span>{t}</span>
          </div>
        ))}
      </div>

      {/* Kirmizi "yapilamaz" listesi — kilit kapaliyken */}
      <div
        style={{
          position: 'absolute',
          right: listSagDan, top: cellCenterY - 90,
          width: listGenis,
          background: '#fef2f2', border: '2px solid #ef4444', borderRadius: 10,
          padding: '10px 12px',
          boxShadow: '0 8px 24px rgba(239,68,68,0.18)',
          animation: 'meba-kl-kirmizi 6s ease-in-out infinite',
          pointerEvents: 'none',
        }}
      >
        <div style={{ fontSize: 11, fontWeight: 800, color: '#7f1d1d', marginBottom: 6, letterSpacing: '0.04em', textTransform: 'uppercase' }}>
          ✗ Kilitli (salt-okunur)
        </div>
        {[
          'Satır eklenemez',
          'Hücreler değiştirilemez',
          'İskonto girilemez',
          'Yazdırma + PDF + Mail aktif',
        ].map((t, i) => (
          <div key={i} style={{
            fontSize: 12, fontWeight: 500, color: '#7f1d1d', padding: '3px 0',
            display: 'flex', alignItems: 'center', gap: 6,
          }}>
            <span style={{ color: i === 3 ? '#10b981' : '#ef4444', fontWeight: 800 }}>{i === 3 ? '✓' : '✗'}</span>
            <span>{t}</span>
          </div>
        ))}
      </div>

      {/* Cursor — kilit butonuna tiklar */}
      <div
        style={{
          position: 'absolute',
          left: cellCenterX, top: cellCenterY,
          animation: 'meba-kl-cursor 6s ease-in-out infinite',
          pointerEvents: 'none',
        }}
      >
        <MacCursor />
      </div>

      <style>{`
        /* Once YESIL (yapilabilir) → sonra KIRMIZI (yapilamaz) */
        @keyframes meba-kl-yesil {
          0%, 10%   { opacity: 0; transform: translateY(-8px); }
          18%, 46%  { opacity: 1; transform: translateY(0); }
          54%, 100% { opacity: 0; transform: translateY(-8px); }
        }
        @keyframes meba-kl-kirmizi {
          0%, 52%   { opacity: 0; transform: translateY(-8px); }
          60%, 90%  { opacity: 1; transform: translateY(0); }
          96%, 100% { opacity: 0; transform: translateY(-8px); }
        }
        @keyframes meba-kl-cursor {
          0%, 4%    { opacity: 0; transform: translate(60px, 30px); }
          10%, 18%  { opacity: 1; transform: translate(0, 0); }
          22%, 26%  { opacity: 1; transform: translate(0, 0) scale(0.82); }
          32%, 50%  { opacity: 1; transform: translate(0, 0); }
          54%, 58%  { opacity: 1; transform: translate(0, 0) scale(0.82); }
          64%, 92%  { opacity: 1; transform: translate(0, 0); }
          98%, 100% { opacity: 0; transform: translate(20px, 20px); }
        }
      `}</style>
    </>
  );
};

/**
 * REFERANS VERILER
 * Hedef: span[data-tip-target="referanslar"] — satirda gecmis ikonu.
 * Sahne: cursor ikona tiklar → sag taraftan drawer kayar → icinde 3 gecmis
 * teklif satiri (fiyatlar + cariler) gorulur.
 */
export const ReferansVerilerAnimasyonu = ({ rect }: AnimasyonProps) => {
  const cellCenterX = rect.x + rect.width / 2;
  const cellCenterY = rect.y + rect.height / 2;
  // Drawer ekranin sagindan acilir — mini gosterim yapacagiz
  const drawerGenis = 280;
  const drawerSol = window.innerWidth - drawerGenis - 16;

  return (
    <>
      {/* Drawer mini gosterim */}
      <div
        style={{
          position: 'absolute',
          left: drawerSol, top: 80,
          width: drawerGenis,
          maxHeight: 360,
          background: '#fff',
          border: '1px solid #cbd5e1',
          borderRadius: 12,
          boxShadow: '0 20px 50px rgba(15,23,42,0.25)',
          overflow: 'hidden',
          animation: 'meba-rv-drawer 6s ease-in-out infinite',
          pointerEvents: 'none',
        }}
      >
        <div style={{ background: '#1e3a5f', color: '#fff', padding: '10px 14px', fontSize: 13, fontWeight: 800 }}>
          Geçmiş Referanslar · AS1201F-M5
        </div>
        {[
          { tarih: '12.04.2026', cari: 'KAYSERİ MAKİNA',  miktar: '2 ad', fiyat: '125,00 €' },
          { tarih: '08.02.2026', cari: 'OZAN MÜHENDİSLİK', miktar: '5 ad', fiyat: '128,00 €' },
          { tarih: '21.11.2025', cari: 'ATES OTOMASYON',  miktar: '1 ad', fiyat: '132,00 €' },
        ].map((s, i) => (
          <div key={i} style={{
            padding: '10px 14px', borderTop: '1px solid #f1f5f9',
            display: 'flex', alignItems: 'center', gap: 8,
            fontSize: 12,
            animation: `meba-rv-satir-${i} 6s ease-in-out infinite`,
          }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 700, color: '#1e293b' }}>{s.cari}</div>
              <div style={{ fontSize: 11, color: '#94a3b8' }}>{s.tarih} · {s.miktar}</div>
            </div>
            <div style={{ fontFamily: 'monospace', fontWeight: 800, color: '#1e3a5f' }}>{s.fiyat}</div>
          </div>
        ))}
      </div>

      {/* Cursor — ikona tiklar */}
      <div
        style={{
          position: 'absolute',
          left: cellCenterX, top: cellCenterY,
          animation: 'meba-rv-cursor 6s ease-in-out infinite',
          pointerEvents: 'none',
        }}
      >
        <MacCursor />
      </div>

      <style>{`
        @keyframes meba-rv-drawer {
          0%, 14%   { opacity: 0; transform: translateX(60px); }
          24%, 88%  { opacity: 1; transform: translateX(0); }
          96%, 100% { opacity: 0; transform: translateX(60px); }
        }
        @keyframes meba-rv-satir-0 {
          0%, 30%   { opacity: 0; transform: translateX(40px); }
          38%, 88%  { opacity: 1; transform: translateX(0); }
          96%, 100% { opacity: 0; transform: translateX(40px); }
        }
        @keyframes meba-rv-satir-1 {
          0%, 36%   { opacity: 0; transform: translateX(40px); }
          44%, 88%  { opacity: 1; transform: translateX(0); }
          96%, 100% { opacity: 0; transform: translateX(40px); }
        }
        @keyframes meba-rv-satir-2 {
          0%, 42%   { opacity: 0; transform: translateX(40px); }
          50%, 88%  { opacity: 1; transform: translateX(0); }
          96%, 100% { opacity: 0; transform: translateX(40px); }
        }
        @keyframes meba-rv-cursor {
          0%, 4%    { opacity: 0; transform: translate(40px, 30px); }
          10%, 16%  { opacity: 1; transform: translate(0, 0); }
          20%, 24%  { opacity: 1; transform: translate(0, 0) scale(0.78); }
          32%, 88%  { opacity: 1; transform: translate(0, 0); }
          96%, 100% { opacity: 0; transform: translate(20px, 20px); }
        }
      `}</style>
    </>
  );
};

/**
 * DURUM BUTONU
 * Hedef: button[data-tip-target="durum"] — toolbar'da pill seklindeki durum
 * butonu (Taslak/Hazir/Gonderildi/Onaylandi/Iptal).
 * Sahne:
 *  1. Cursor pill'e tiklar → dropdown acilir, 5 secenek
 *  2. Her secenek kucuk renk noktasi + etiket + ne anlama geldigi
 *  3. Cursor "Gönderildi" uzerine kayar, secer → pill rengi gri → mavi olur
 */
export const DurumButonAnimasyonu = ({ rect }: AnimasyonProps) => {
  const cellCenterX = rect.x + rect.width / 2;
  const cellCenterY = rect.y + rect.height / 2;
  const popTop = rect.y + rect.height + 6;
  const popGenis = 320;
  const popLeft = Math.min(rect.x, window.innerWidth - popGenis - 16);

  const durumlar = [
    { etiket: 'Taslak',     renk: '#94a3b8', aciklama: 'Henuz baslama / icerik degisiyor' },
    { etiket: 'Hazır',      renk: '#3b82f6', aciklama: 'Gondermeye hazir, son kontrol' },
    { etiket: 'Gönderildi', renk: '#0ea5e9', aciklama: 'Musteriye mailden cikti, beklemede' },
    { etiket: 'Onaylandı',  renk: '#10b981', aciklama: 'Musteri onayladi, satis acildi' },
    { etiket: 'İptal',      renk: '#ef4444', aciklama: 'Satilmadi / kapatildi' },
  ];

  return (
    <>
      {/* Dropdown — pill'in altinda */}
      <div
        style={{
          position: 'absolute',
          left: popLeft, top: popTop,
          width: popGenis,
          background: '#fff',
          border: '1px solid #cbd5e1',
          borderRadius: 10,
          boxShadow: '0 16px 40px rgba(15,23,42,0.20)',
          overflow: 'hidden',
          animation: 'meba-dr-pop 6s ease-in-out infinite',
          pointerEvents: 'none',
        }}
      >
        {durumlar.map((d, i) => {
          const sec = i === 2; // "Gonderildi" highlight olacak
          return (
            <div
              key={d.etiket}
              style={{
                padding: '10px 14px',
                display: 'flex', alignItems: 'flex-start', gap: 10,
                borderBottom: i < durumlar.length - 1 ? '1px solid #f1f5f9' : 'none',
                background: sec ? '#dbeafe' : '#fff',
                animation: sec ? 'meba-dr-secili 6s ease-in-out infinite' : undefined,
              }}
            >
              <span style={{
                width: 10, height: 10, borderRadius: '50%',
                background: d.renk, marginTop: 5, flexShrink: 0,
                boxShadow: `0 0 0 2px ${d.renk}25`,
              }} />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 800, color: '#0f172a' }}>{d.etiket}</div>
                <div style={{ fontSize: 11, color: '#64748b', marginTop: 1 }}>{d.aciklama}</div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Pill renk degisimi vurgu — orijinal pill'in uzerinde */}
      <div
        style={{
          position: 'absolute',
          left: rect.x, top: rect.y,
          width: rect.width, height: rect.height,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 11.5, fontWeight: 700, color: '#075985',
          background: '#e0f2fe', border: '1.5px solid #0ea5e9',
          borderRadius: 999,
          animation: 'meba-dr-pill-yeni 6s ease-in-out infinite',
          pointerEvents: 'none',
        }}
      >
        <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#0ea5e9', marginRight: 5 }} />
        Gönderildi
      </div>

      {/* Cursor — pill → "Gonderildi" satiri */}
      <div
        style={{
          position: 'absolute',
          left: cellCenterX, top: cellCenterY,
          animation: 'meba-dr-cursor 6s ease-in-out infinite',
          pointerEvents: 'none',
        }}
      >
        <MacCursor />
      </div>

      <style>{`
        @keyframes meba-dr-pop {
          0%, 14%   { opacity: 0; transform: translateY(-8px) scale(0.96); transform-origin: top center; }
          22%, 78%  { opacity: 1; transform: translateY(0) scale(1); }
          86%, 100% { opacity: 0; transform: translateY(-8px) scale(0.96); }
        }
        @keyframes meba-dr-secili {
          0%, 40%   { background: #dbeafe; }
          48%, 56%  { background: #bfdbfe; box-shadow: inset 0 0 0 2px #0ea5e9; }
          64%, 78%  { background: #dbeafe; }
          100%      { background: #dbeafe; }
        }
        @keyframes meba-dr-pill-yeni {
          0%, 64%   { opacity: 0; transform: scale(0.95); }
          70%, 88%  { opacity: 1; transform: scale(1.06); }
          92%, 96%  { opacity: 1; transform: scale(1); }
          100%      { opacity: 0; transform: scale(0.95); }
        }
        @keyframes meba-dr-cursor {
          0%, 4%    { opacity: 0; transform: translate(50px, 30px); }
          10%, 16%  { opacity: 1; transform: translate(0, 0); }
          20%, 24%  { opacity: 1; transform: translate(0, 0) scale(0.82); }
          /* "Gonderildi" satiri 3. sira → ~120px asagi, 10px sola */
          40%, 50%  { opacity: 1; transform: translate(-5px, 130px); }
          54%, 58%  { opacity: 1; transform: translate(-5px, 130px) scale(0.82); }
          66%, 88%  { opacity: 1; transform: translate(0, 0); }
          96%, 100% { opacity: 0; transform: translate(20px, 20px); }
        }
      `}</style>
    </>
  );
};

/**
 * BUTTON HOVER — Sadece hedef butonu vurgular + cursor ozenle yaklasir.
 * Notlar butonu gibi noktasal hedefler icin generic animasyon.
 */
export const ButonHoverAnimasyonu = ({ rect }: AnimasyonProps) => {
  return (
    <>
      {/* Cursor — saga-yukaridan butona iner */}
      <div
        style={{
          position: 'absolute',
          left: rect.x + rect.width / 2,
          top: rect.y + rect.height / 2,
          animation: 'meba-bh-cursor 4.5s ease-in-out infinite',
          pointerEvents: 'none',
        }}
      >
        <MacCursor />
      </div>

      {/* Click ripple */}
      <div
        style={{
          position: 'absolute',
          left: rect.x + rect.width / 2,
          top: rect.y + rect.height / 2,
          width: 0, height: 0,
          borderRadius: '50%',
          border: '2px solid rgba(91, 141, 239, 0.6)',
          transform: 'translate(-50%, -50%)',
          animation: 'meba-bh-ripple 4.5s ease-out infinite',
          pointerEvents: 'none',
        }}
      />

      <style>{`
        @keyframes meba-bh-cursor {
          0%, 6%    { opacity: 0; transform: translate(60px, -40px) scale(1); }
          14%, 36%  { opacity: 1; transform: translate(0, 0) scale(1); }
          44%, 50%  { opacity: 1; transform: translate(0, 0) scale(0.78); }
          58%, 88%  { opacity: 1; transform: translate(0, 0) scale(1); }
          96%, 100% { opacity: 0; transform: translate(20px, 20px) scale(1); }
        }
        @keyframes meba-bh-ripple {
          0%, 46%   { opacity: 0; width: 0; height: 0; }
          50%       { opacity: 0.7; width: 24px; height: 24px; border-width: 2.5px; }
          70%       { opacity: 0; width: 140px; height: 140px; border-width: 1px; }
          100%      { opacity: 0; width: 140px; height: 140px; }
        }
      `}</style>
    </>
  );
};
