# MEBA Teklif Sistemi — repo rehberi (CLAUDE.md)

> Tüm projeler haritası: `..\PROJELER-HARITASI.md`.

## Kimlik
- **Proje:** Teklif hazırlama/gönderme sistemi. Mehmet Bey + arkadaşları kullanıyor → fiilen küçük SaaS pilot.
- **Yerel klasör:** `meba-teklif-sistemi` (eski: `Meba-Teklif-Sistemi`; hedef `C:\Users\Admin\Projeler\meba-teklif-sistemi`).
- **GitHub:** `hmbakirdogen-cmyk/meba-teklif-sistemi` (rename bekliyor)
- **Deploy:** 🔴 **CANLI** — Mehmet Bey kendi sunucusunda host ediyor. **DİKKATLİ OL.**

## ⚠️ CANLI sistem kuralları
- Değişiklik = canlı kullanıcıları etkiler. Push/deploy öncesi kapsamlı tarama; Mehmet Bey onayı.
- GitHub repo rename'i sonrası **sunucudaki git remote URL'sini Mehmet Bey günceller**.

## Bu repo NEDİR / NE DEĞİLDİR
- ✅ Teklif Sistemi (canlı). ❌ MEBA Komuta portalı değil · ❌ Grup Finans Paneli değil.

## KATİ kurallar (memory ile birebir)
- **SMTP "yönlendirici köprü" wizard** modeli (self-service rehberli; mavi bilgi kutusu + Gmail/Outlook kılavuz + "kayıtlı şifre" rozeti).
- **Personel App Password listesi GİZLİ** — sadece Mehmet Bey'de; personele onay/checkbox/bilgi YASAK; kullanıcı kendi şifresini bile görmez.
- **Outlook 2FA:** App Password için 2FA açılınca normal şifre SMTP'yi bozar → App Password/OAuth.
- **Şifre değişimi:** başarılı sonra clearRememberedPassword + delay + force logout.
- Hitabet daima "[Soyad] Bey".

## Not — bekleyen yarım iş (commit'lenmemiş)
- `src/pages/SifreDefteri.tsx` + `src/utils/sifreDefteri.ts` (untracked) — "Şifre Defteri" devam eden iş. Taşımayla korunur; Mehmet Bey hazır olunca commit eder.
- `db-backup/` `.gitignore`'da (prod veri kopyası).

---

## Claude Code — hızlı başlangıç

Detaylı kurulum ve deploy için: [README.md](README.md). Çalışma kuralları: [AGENTS.md](AGENTS.md). Klasör/launcher isimleri: [docs/duzen-haritasi.md](docs/duzen-haritasi.md).

### Stack
- **Frontend:** React 19 + Vite 8 (Rolldown) + Antd v6 + TypeScript 6 — `src/`
- **Backend:** Express 5 + Prisma 6 (Postgres) — `server/` (tsx watch ile çalışır, ayrı bir build yok)
- **Storage:** Cloudflare R2 (logo/foto) · **Email:** Resend + Nodemailer/IMAP
- **Auth:** scrypt + session token, header `X-Session-Token`
- **Multi-tenant:** 3 firma (meba/elmos/mesa), header `X-Firma-Id` + `canAccessFirma` izolasyonu

### Sık kullanılan komutlar
| İş | Komut |
|---|---|
| Dev (API+Vite paralel) | `npm run dev` |
| Sadece API | `npm run dev:server` |
| Tip kontrol (server) | `npm run typecheck:server` |
| Lint | `npm run lint` |
| Build | `npm run build` |
| Prisma migration (lokal) | `npm run db:migrate` |
| Prisma Studio | `npm run db:studio` |
| Tek tıkla başlat (Windows) | `npm run meba` |

> Test runner yok. Doğrulama: `npm run typecheck:server` + `npm run lint` + `npm run build`. Manuel akış için [docs/manual-test-rehberi.md](docs/manual-test-rehberi.md).

### Mimari giriş noktaları
- Express boot: [server/app/index.ts](server/app/index.ts)
- Route'lar: [server/routes/](server/routes/) (auth, teklifler, cariler, urunler, email, storage, …)
- Prisma şema: [server/prisma/schema.prisma](server/prisma/schema.prisma)
- Middleware: [server/middleware/](server/middleware/) — `requireAuth`, `requireFirmaScope`, `rewriteR2Urls`, `errorHandler`
- Frontend router: [src/AppRouter.tsx](src/AppRouter.tsx) · Layout: [src/AppLayout.tsx](src/AppLayout.tsx)
- Context (Kullanıcı/Firma/Rehber): [src/context/](src/context/) — **Context value'ları daima `useMemo` ile sar** (Faz 17/21 React #185 dersi, bkz. [HANDOFF-2026-05-26-CANLI-NAVBAR-FIX.md](HANDOFF-2026-05-26-CANLI-NAVBAR-FIX.md))
- Servisler: [src/services/](src/services/) — `pdfService`, `pdfKayitService`, API client

### Workspace'e özgü tuzaklar (bilinmesi şart)
- **Antd v6 + Vite v8 Rolldown + React 19**: cutting-edge stack, edge-case loop'lara açık. Yeni Context eklerken value'yu `useMemo`, callback'leri `useCallback` ile sabitle. Inline `array/object` prop'ları `Menu/Drawer`'a verme.
- **Antd `Menu` navigate sorunu**: bu stack'te `Menu onClick → navigate` güvenilir değil. Navbar'da HTML `<button>` bypass kullanılıyor — bozma.
- **PowerShell UTF-8 BOM tuzağı**: JSON dosyalarını `Set-Content -Encoding UTF8` ile yazma; BOM ekleyip `JSON.parse`'ı bozuyor. `[System.IO.File]::WriteAllText` + `UTF8Encoding($false)` kullan.
- **CANLI sistem**: `main` → Render auto-deploy. Push öncesi Mehmet Bey onayı, `npm run typecheck:server` + `npm run build` ile doğrula.
- **Untracked yarım iş** (yukarıda): `SifreDefteri.tsx` / `sifreDefteri.ts` — silme/taşıma yok.
- **.env**: `.env.example` repo'da YOK. Anahtarlar (`DATABASE_URL`, `RESEND_API_KEY`, `R2_*`) Mehmet Bey'de. README'deki listeye bak.

### Git akışı
- Tek branch: `main` (auto-deploy). Feature için `feature/...`.
- Commit öncesi `git status` → yarım `SifreDefteri` dosyalarını `git add` etme.
- `git push` Mehmet Bey onayı ile.

<!-- cloude-code-toolbox:mcp-skills-awareness-begin -->

### MCP & Skills awareness (Cloude Code ToolBox)

_Last synced: 2026-05-20T20:57:49.275Z._

- **Full report:** `.claude/cloude-code-toolbox-mcp-skills-awareness.md` in this workspace (auto-overwritten on each scan). Use it as ground truth for configured servers and skill folders.
- **MCP:** For **live tools** in Claude Code, enable the matching server via `/mcp`. Servers are configured in `~/.claude.json` (user) and `.mcp.json` (project).
- **When the user’s task matches a server** (e.g. Confluence work and a **Confluence** / **Atlassian** MCP is listed), **prefer that server id** and plan on tool use—not only file search.
- **Skills:** Folders below contain `SKILL.md`; attach or cite paths in chat when relevant.

#### Workspace MCP

- `c:\Users\user\Desktop\Meba-Teklif-Sistemi\.mcp.json` _(workspace: Meba-Teklif-Sistemi)_ — _file missing_

_No active workspace servers in mcp.json._

#### User MCP

- `C:\Users\user\.claude.json` — _no servers defined_

_No active user-scoped servers in mcp.json._

#### Project skills

_None found (or no workspace open)._

#### User skills

_None found._

<!-- cloude-code-toolbox:mcp-skills-awareness-end -->
