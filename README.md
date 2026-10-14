# Shox AI — AI video generator

Higgsfield uslubidagi AI video platforma: matn yoki rasmdan video, 12 ta kamera harakati, uslublar,
4 ta model (Seedance, Hailuo, Kling, Veo), ro'yxatdan o'tish, kredit tizimi, **Click** va **Payme** to'lovlari,
videolarni saqlash va admin panel.

## Lokal ishga tushirish

```bash
npm install
cp .env.example .env.local
npm run dev        # http://localhost:3000
```

Hech qanday kalitsiz ham ishlaydi: video — **demo rejim** (namuna video), to'lov — **sinov to'lovi** tugmasi.
Baza avtomatik `data/shox.db` faylida yaratiladi. `.env.local` dagi `ADMIN_EMAILS` ga emailingizni yozing — `/admin` ochiladi.

## Ishga tushirishdan oldin (checklist)

1. **Replicate** — `REPLICATE_API_TOKEN` va `REPLICATE_WEBHOOK_SECRET`. Har bir modelni bir marta sinab ko'ring;
   model parametrlari `lib/models.ts` da, xato bersa o'sha yerda tuzatiladi.
2. **Narxlar** — Replicate'da har bir model qancha turishini tekshiring va `lib/models.ts` dagi `credits`,
   `lib/packs.ts` dagi paket narxlarini foyda bilan belgilang.
3. **Video saqlash** — Cloudflare R2 bucket (`S3_*`). Busiz Replicate havolalari ~1 soatda o'chadi.
4. **Click** — merchant.click.uz'da xizmat oching. Prepare va Complete URL: `https://SAYT/api/payments/click`.
5. **Payme** — merchant.payme.uz'da kassa oching. Endpoint: `https://SAYT/api/payments/payme`,
   hisob maydoni: `order_id`. Avval `PAYME_TEST=true` bilan sandbox testlaridan o'ting.
6. **Oferta** — `app/oferta/page.tsx` dagi `[qavs]` ichidagi ma'lumotlarni to'ldiring (Click/Payme talab qiladi).
7. `APP_URL` — saytning https manzili. `ENABLE_TEST_PAYMENTS` ishlab chiqarishda `false` bo'lsin.

## Deploy

**VPS / Docker** (tavsiya — O'zbekistondagi serverlar ham bo'ladi):
```bash
docker build -t shox .
docker run -d -p 3000:3000 --env-file .env -v shox-data:/app/data shox
```
Oldiga Nginx/Caddy qo'yib HTTPS yoqing.

**Vercel**: fayl baza saqlanmaydi, shuning uchun [Turso](https://turso.tech) baza oching va
`DATABASE_URL=libsql://...`, `DATABASE_AUTH_TOKEN` ni kiriting.

## Qanday ishlaydi

- **Kreditlar** generatsiyadan oldin atomar yechiladi; video xato bilan tugasa yoki xizmat ishlamasa — avtomatik qaytariladi.
- **Video holati** ikki yo'l bilan yangilanadi: brauzer so'rovi va Replicate webhook. Sahifa yopilsa ham video saqlanadi.
- **To'lovlar**: kredit faqat bir marta qo'shiladi (takroriy callback xavfsiz). Payme orqali qaytarilgan to'lov kreditni ham qaytarib oladi.
- **Himoya**: parollar scrypt bilan, sessiya httpOnly cookie, login/ro'yxat/generatsiya uchun rate limit,
  foydalanuvchi faqat o'z videolarini ko'radi, Click imzosi va Payme Basic-auth tekshiriladi.

## Tuzilma

| Joy | Vazifasi |
|---|---|
| `app/page.tsx` | Landing |
| `app/create`, `components/Studio.tsx` | Video studiya |
| `app/billing` | Balans, kredit sotib olish, to'lovlar tarixi |
| `app/admin` | Statistika, foydalanuvchilar, kredit qo'shish |
| `app/api/generate`, `app/api/jobs` | Generatsiya va videolar |
| `app/api/payments/{click,payme}` | To'lov tizimlari callback'lari |
| `app/api/webhooks/replicate` | Replicate webhook |
| `lib/models.ts`, `lib/packs.ts`, `lib/motions.ts` | Modellar, paketlar, kamera harakatlari |
| `lib/db.ts` | Baza va sxema (birinchi so'rovda avtomatik yaratiladi) |

## Hali yo'q (keyingi bosqich)

- Parolni tiklash (email yuborish xizmati kerak, masalan Resend) — hozircha admin yordam beradi.
- Google / Telegram orqali kirish.
- Kontent moderatsiyasi (taqiqlangan promptlarni filtrlash).
