# Meba Teklif Sistemi — Render Deploy

Grup şirketleri (MEBA · ELMOS · MESA) için multi-tenant teklif hazırlama ve yönetim sistemi. **Tek Render Web Service** üzerinde çalışır: Express + Prisma + Postgres + Cloudflare R2 + Resend.

## Mimari

```
Browser ── HTTPS ── Render Web Service (Node Express + tsx)
                         ├── /api/*  → REST routes
                         └── /*       → Vite dist (SPA)
                              ↓                    ↓
                  Render Postgres            Cloudflare R2
                  (Prisma ORM)              (logo, foto, yedek)
                              ↓
                     Resend (transactional email)
```

## Geliştirme

```bash
# 1. Bağımlılıklar
npm install

# 2. Lokal Postgres (Docker)
docker run -d --name meba-pg -p 5432:5432 -e POSTGRES_PASSWORD=dev postgres:16

# 3. .env oluştur (.env.example'dan kopyala)
cp .env.example .env
# DATABASE_URL'i lokal Docker'a yönelt:
# DATABASE_URL="postgresql://postgres:dev@localhost:5432/postgres"

# 4. Prisma migrate + generate
npm run db:migrate

# 5. (Opsiyonel) mevcut db.json verisini Postgres'e taşı
npm run migrate:data

# 6. Dev başlat (API + Vite paralel)
npm run dev
```

API → `http://localhost:3001`, frontend → `http://localhost:5173` (Vite proxy `/api`'yi backend'e yönlendirir).

## Render Deploy

1. Repo'yu Render'a bağla (`render.yaml` blueprint'i otomatik algılanır).
2. **Web Service** + **Postgres** beraber kurulur.
3. Manuel set edilecek env vars:
   - `RESEND_API_KEY`, `EMAIL_FROM` (Resend dashboard → API Keys + domain doğrulama)
   - `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_PUBLIC_URL` (Cloudflare R2 dashboard)
4. İlk deploy build sırasında `prisma migrate deploy` çalışır → şema kurulur.
   - **Önkoşul:** Lokal'de `npm run db:migrate -- --name init` ile migration dosyaları üretilmiş ve commit edilmiş olmalı. Lokal'de Postgres yoksa Docker ile geçici bir tane çalıştır.
5. **Mevcut `server/db.json` verisini taşımak için:** Lokal makinede çalıştır —
   - `.env`'de `DATABASE_URL`'i Render Postgres External URL'sine ayarla.
   - R2 env'lerini set et (görsel migrasyonu için).
   - `npm run migrate:data` çalıştır → 3 firma + ~25 kullanıcı + ~8400 cari + ~45k ürün + tüm teklif tek seferde Postgres'e iter.
   - Görseller (`public/profil-fotograflari/`, `public/cari-logolari/`, firma logoları) R2'ye yüklenir.

## Komutlar

| Komut | Açıklama |
|-------|----------|
| `npm run dev` | API (tsx watch) + Vite paralel |
| `npm run dev:server` | Yalnız API watch |
| `npm run build` | TypeScript + Vite build → `dist/` |
| `npm run start:prod` | Prisma migrate deploy + tsx server |
| `npm run db:migrate` | Lokal Prisma migration üret + uygula |
| `npm run db:deploy` | Migration'ları uygula (CI/prod) |
| `npm run db:studio` | Prisma Studio UI |
| `npm run migrate:data` | `server/db.json` → Postgres + R2 |
| `npm run typecheck:server` | Server TS type check |

## Önemli Klasörler

```
server/
  app/index.ts           # Express boot
  routes/                # 14 router
  lib/                   # prisma, auth, sessions, storage(R2), email(Resend), ...
  middleware/            # requireAuth, requireFirmaScope, errorHandler
  prisma/schema.prisma   # DB şeması
src/
  pages/                 # React sayfaları
  services/              # API client, pdfService, pdfKayitService
  context/               # Kullanici / Firma context
scripts/migrate/
  db-json-to-postgres.ts # Veri taşıma
```

## Notlar

- **Auth:** scrypt + session token (X-Session-Token header). Mevcut hash'ler migration sonrası çalışır.
- **PDF:** Tamamen client-side (html2canvas + jsPDF, scale=4 lossless).
- **E-posta:** Resend ile PDF eki. Hata fallback: tarayıcı mailto.
- **Storage:** R2 — profil fotoğrafları, cari logoları, firma logoları.
- **Multi-tenant:** 3 firma (meba/elmos/mesa); `X-Firma-Id` header'ı + `canAccessFirma` ile izolasyon.
- **PWA:** Render HTTPS sayesinde install prompt çalışır.

## Coklu Proje Baslatma (DevHub)

Iki farkli projeyi karistirmadan ayni duzenle acmak icin DevHub kullan.

Kurulum:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\windows\install-devhub.ps1
```

Ornek proje kayitlari:

```powershell
devhub add -Key teklif-motoru -Name "Teklif Motoru" -RepoUrl "https://github.com/hmbakirdogen-cmyk/Meba-Teklif-Sistemi.git" -LocalPath "C:\Users\user\Desktop\Projects\Teklif-Motoru" -Branch "feature/eposta-composer-onyx-tema" -StartCommand "npm run dev" -Url "http://localhost:5173/" -Ports "3001,5173"
```

Gunluk kullanim:

```powershell
devhub menu
devhub launch -Key teklif-motoru
devhub list
```

Detaylar icin: `docs/devhub-kullanim.md`
