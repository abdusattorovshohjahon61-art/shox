# Shox AI — AI video generator

Higgsfield uslubidagi AI video generatsiya platformasi (MVP). Matn yoki rasmdan video,
12 ta kamera harakati, uslublar va bir nechta eng kuchli modellar (Seedance, Hailuo, Kling, Veo).

## Ishga tushirish

```bash
npm install
cp .env.example .env.local   # REPLICATE_API_TOKEN ni kiriting
npm run dev                  # http://localhost:3000
```

`REPLICATE_API_TOKEN` bo'lmasa sayt **demo rejimda** ishlaydi — har qanday so'rovga namuna video qaytaradi.
Token olish: https://replicate.com/account/api-tokens (to'lov kartasi ulanadi, har bir video uchun haq olinadi).

## Tuzilma

| Fayl | Vazifasi |
|---|---|
| `app/page.tsx` | Landing sahifa (imkoniyatlar, modellar, narxlar) |
| `app/create/page.tsx` | Studiya: prompt, rasm yuklash, kamera harakati, uslub, format |
| `app/api/generate/route.ts` | Generatsiyani boshlaydi (tekshiruv + rate limit) |
| `app/api/status/[id]/route.ts` | Generatsiya holatini qaytaradi |
| `lib/models.ts` | Modellar ro'yxati — yangi model qo'shish shu yerda |
| `lib/motions.ts` | Kamera harakatlari va uslublar |
| `lib/replicate.ts` | Replicate API mijozi + demo rejim |

## Deploy

Vercel'ga ulang, `REPLICATE_API_TOKEN` ni Environment Variables'ga qo'shing — tayyor.

## Startup uchun keyingi qadamlar

1. **Ro'yxatdan o'tish** — Clerk yoki NextAuth (Google / Telegram login).
2. **Ma'lumotlar bazasi** — Postgres (Supabase/Neon): foydalanuvchilar, kreditlar, videolar tarixi.
3. **To'lov** — Click / Payme (O'zbekiston), Stripe (xalqaro). Kreditlarni serverda yechish.
4. **Video saqlash** — Replicate havolalari ~1 soatda o'chadi; natijani S3 / Cloudflare R2 ga ko'chiring.
5. **Rate limit** — hozirgi xotiradagi limitni Upstash Redis'ga almashtiring.
6. **Unit-iqtisod** — har bir model narxini Replicate'da tekshirib, `credits` qiymatini foyda bilan belgilang.
