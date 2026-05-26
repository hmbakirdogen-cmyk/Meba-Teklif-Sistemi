# HANDOFF — 2026-05-26 Canlı Navbar/#185 Fix Stabilize

> **Mehmet Bey için NET HATIRLATMA:**
> Bu dosya **27 Mayıs sabahı veya sonraki Claude oturumlarında** ilk okunacak.
> Diğer handoff dosyalarıyla karıştırmayın — bu **yalnızca 26 Mayıs canlı bug zinciri**ne aittir.

---

## TEK CÜMLE

Antd v6 + Vite v8 (Rolldown) + React 19 stack'inde **navbar sekmeleri tıklanmıyor + React #185 loop** vardı. 10 commit'lik Faz 17→26 zinciri ile çözüldü. Şu an canlı çalışıyor.

## DURUM (27 Mayıs sabahı için)

| Item | Durum |
|------|-------|
| Canlı URL | https://meba-teklif.onrender.com/ |
| Son commit | `31f666a` Faz 26 |
| Branch | `main` |
| Deploy | Auto (Render) |
| Navbar sekme tıklama | ✅ Çalışıyor |
| Sayfalar arası geçiş | ✅ Çalışıyor |
| React #185 | ✅ Atmıyor |
| 🎓 Rehber FAB | ✅ Çalışıyor (Faz 26 ile) |
| Firma değiştirici (logo dropdown) | ✅ Çalışıyor |

## NE OLDU — KRONOLOJİK

Bug: Mehmet Bey canlıda navbar sekmelerine tıklayamıyordu, React #185 atıyordu.

| Faz | Commit | Sorun | Çözüm |
|-----|--------|-------|-------|
| 17 | d792cf5 | KullaniciContext + RehberContext value yeni obj her render | useMemo |
| 17 | d792cf5 | TeklifListesi mid-file import → minify chunk error | Top-level import |
| 18 | 8a8febe | TipSpotlight overlay click trap riski + browser cache stale | pointerEvents:'none' + vBust v11 |
| 19 | 81b2149 | Defensive — navbar Menu onClick + CSS pointer-events | (sonradan ölü kod oldu, zararsız) |
| 20 | 7588d16 | bildirim useEffect deps whole obj | stable id |
| 21 | 8bfd8a5 | **FirmaContext value yeni obj — KAÇIRILAN halka** | useMemo |
| 22 | c2eb212 | Menu/Drawer inline arrays/objects | useMemo |
| 23 | 41306d4 | Antd Menu Vite v8/React 19'da navigate çalıştırmıyor | HTML button bypass |
| 23.1 | d33201b | Build hatası (useMemo import yok) + mobile Drawer Menu | Fix + Mobile drawer da bypass |
| 24+25 | 8b4fc51 | **useSayfaRehberi `[rehberCtx]` deps loop — GERÇEK #185** | Destructured stable refs |
| 26 | 31f666a | Faz 25 sonrası rehber FAB çalışmıyor | aktifTip deps eklendi |

## NEDEN BU KADAR UZUN SÜRDÜ

1. Stack cutting-edge: Antd v6 (Kasım 2025) + Vite v8 Rolldown beta + React 19. Hiçbiri yalnız sorun değil, üçü birden olunca edge case açığa çıktı.
2. Stack trace minified, `Dr → zr → ul → cl` Antd vendor bundle içinde React reconciler. Loop kaynağı app code'unda ama "vendor-antd" görünüyor.
3. Birden fazla bağımsız loop kaynağı (3 ayrı Context useMemo eksikliği + useSayfaRehberi rehberCtx deps + Antd Menu navigate sorunu). Tek seferde çözülemiyordu.
4. Production bundle direkt okuma (curl + cut) yapana kadar gerçek kök sebep teşhis edilemedi (Faz 22'de bundle okudum → useMergedState pattern teşhis ettim).

## TEMİZLENMEYİ BEKLEYEN ÖLÜ KOD (acil değil)

1. **[src/index.css:2722-2810](src/index.css#L2722-L2810)** — `.premium-navbar .header-nav-menu.ant-menu-horizontal > .ant-menu-item` rules. Faz 23 Antd Menu kaldırılınca match etmez oldu. Zararsız ama bundle'da yer.
2. **[src/index.css Faz 19 add]** — `.header-nav-menu pointer-events: auto !important` blok. Aynı sebep.
3. **AppLayout.tsx** `selectedKeysMemo` zaten silindi ✓. `drawerStylesMemo` mobile Drawer için hala kullanılıyor.

## ÖĞRENİLEN PATTERN (gelecek için)

1. **TÜM Context Provider value'ları useMemo'lu olmalı** — Kullanıcı/Firma/Rehber/Theme dört tanesi de
2. **useEffect deps WHOLE OBJECT değil PRİMİTİF veya DESTRUCTURED STABLE REF** — `[ctx]` yerine `[ctx.fn1, ctx.fn2]`
3. **Antd Menu Vite v8 + React 19'da edge case** — basit nav için HTML button bypass kabul edilebilir tradeoff
4. **Inline controlled prop'lar** (`selectedKeys={[x]}` / `styles={{...}}`) Antd useMergedState ile loop tetikleyebilir → useMemo
5. **Production bundle direkt okuma** (curl + cut) minified stack trace'i çözme yöntemi
6. **React 19 strict mode + concurrent rendering** dengesiz state'leri büyütür

## ŞIMDI BU NOKTAYA OTURUMA YENİ GELDIN

1. **Kontrol et:** https://meba-teklif.onrender.com/ → hard refresh → login → 6 sekme tıkla → 🎓 Rehber → her şey çalışıyor mu
2. **Eğer çalışıyor:** STABILIZED. Yeni iş'e geç (kullanıcı dağıtımı, MEBA Komuta Merkezi, vb.)
3. **Eğer çalışmıyor:** Aşağıdaki "DEBUG ROADMAP"

## DEBUG ROADMAP (eğer regression olursa)

```bash
# 1. Live deploy bundle hash'i kontrol et
curl -sL https://meba-teklif.onrender.com/index.html | grep -oE 'index-[A-Za-z0-9_-]+\.js'

# 2. Bundle değişmemişse Render dashboard'a bak (build error?)
# https://dashboard.render.com/ → meba-teklif → Events

# 3. Local build hatası kontrolü
cd "C:/Users/Admin/Desktop/PROJELER/Meba-Teklif-Sistemi" && npm run build 2>&1 | tail -10

# 4. Eğer #185 dönüyorsa production bundle direkt oku:
curl -sL "https://meba-teklif.onrender.com/assets/vendor-antd-XXXX.js" | cut -c COLUMN-COLUMN
# Loop kaynağı genelde `b(e,t)` = useMergedState çevresi

# 5. Context Provider value'larının useMemo'lu olduğunu DOĞRULA
grep -rn "Context\.Provider value=" src/
# Tümü `value={value}` (memoize edilmiş) olmalı
```

## İLİŞKİLİ MEMORY

- [project_stabilize_2026_05_26](C:\Users\Admin\.claude\projects\c--Users-Admin-meba-analysis\memory\project_stabilize_2026_05_26.md)
- [feedback_canli_oncesi_hata_tarama](C:\Users\Admin\.claude\projects\c--Users-Admin-meba-analysis\memory\feedback_canli_oncesi_hata_tarama.md)

## BEKLEYEN İŞLER (Mehmet Bey'in kuyruğu)

- Faz 12 TARTIŞMA (canlı stabilize sonrası)
- Faz 6b rehber içeriği — 7 sayfa rehber tip içerikleri tamamlanacak
- Faz 14d "siz" formu (girin → giriniz) ~30 yer
- MEBA Komuta Merkezi entegrasyon
