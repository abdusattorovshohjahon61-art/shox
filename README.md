# shox — Do'kon uchun Telegram chat-bot

Do'kon egalari uchun to'liq tayyor Telegram bot. Mijozlar o'zbek yoki rus tilida katalogni ko'radi,
savatga mahsulot qo'shadi, buyurtma beradi va Click/Payme orqali to'laydi. Do'kon egasi esa
buyurtmalar, ombor, narxlar, promokodlar va hisobotlarni shu botning o'zidan boshqaradi.

Python 3.11+, [aiogram 3](https://docs.aiogram.dev), SQLite.

## Imkoniyatlar

### 🛍 Mijoz uchun
| | |
|---|---|
| 🌐 **Ikki til** | O'zbekcha va ruscha, istalgan payt almashtirish mumkin |
| 🛍 **Katalog** | Kategoriyalar, sahifalash, rasm, tavsif, narx, ombordagi qoldiq, ➖/➕ miqdor |
| 🛒 **Savat** | Miqdorni o'zgartirish, o'chirish, «yana N so'm — yetkazish bepul» maslahati |
| 🚚 **Yetkazib berish / olib ketish** | Manzil yoki lokatsiya, yetkazish narxi avtomatik hisoblanadi |
| 🎟 **Promokod** | Foizli chegirma |
| 💳 **To'lov** | Naqd yoki karta (Click / Payme — Telegram Payments orqali) |
| 📦 **Buyurtmalarim** | Holatni kuzatish, ❌ bekor qilish (hali qabul qilinmagan bo'lsa), 🔁 qayta buyurtma, 💳 keyinroq to'lash |
| 🔔 **Bildirishnomalar** | Buyurtma holati o'zgarganda avtomatik xabar |
| ⭐️ **Baholash** | Yetkazilgandan keyin 1–5 yulduz (past baho bo'lsa admin darhol biladi) |
| 🔍 **Qidiruv** | Istalgan matn yozilsa mahsulot qidiriladi, topilmasa savol adminga boradi |
| 🕘 **Ish vaqti** | Ish vaqtidan tashqari buyurtmada ogohlantirish |

### ⚙️ Do'kon egasi (admin) uchun — `/admin` yoki «⚙️ Admin panel»
| | |
|---|---|
| 🔔 **Yangi buyurtma** | Darhol keladi (lokatsiya bilan), holat tugmalari: Qabul qilindi → Yetkazilmoqda → Yetkazildi / Bekor |
| 🗂 **Mahsulotlar** | Qo'shish, nomi/narxi/tavsifi/rasmi/qoldig'ini tahrirlash, yashirish, o'chirish |
| 📦 **Ombor** | Qoldiq hisobi: buyurtmada kamayadi, bekor qilinsa qaytadi; tugagan mahsulotni sotib bo'lmaydi |
| 📉 **Kam qolganlar** | Qoldiq chegaradan tushsa avtomatik ogohlantirish |
| 🎟 **Promokodlar** | `KOD FOIZ [LIMIT]` — masalan `BAHOR 15 100` |
| ⚙️ **Sozlamalar** | Yetkazish narxi, bepul yetkazish chegarasi, minimal buyurtma, kam qoldiq chegarasi |
| 📊 **Statistika** | Savdo, tushum, o'rtacha baho, eng ko'p sotilgan mahsulotlar |
| 📅 **Kunlik hisobot** | Har kuni belgilangan vaqtda avtomatik keladi |
| 📥 **Excel hisobot** | Buyurtmalar, mahsulotlar va mijozlar (telefon, xaridlar summasi) — bitta faylda |
| 📣 **Xabar yuborish** | Barcha mijozlarga aksiya/yangilik (matn, rasm, video) |
| 💬 **Mijozga javob** | `/reply <user_id> <matn>` |

Bot qayta ishga tushsa ham mijozning yarim qolgan buyurtmasi saqlanib qoladi (holatlar SQLite'da).

## O'rnatish

1. [@BotFather](https://t.me/BotFather) da bot yarating va tokenni oling.
2. O'z Telegram ID raqamingizni bilib oling (masalan, [@userinfobot](https://t.me/userinfobot)).
3. Sozlamalar faylini yarating:
   ```bash
   cp .env.example .env
   ```
   `.env` ichida `BOT_TOKEN`, `ADMIN_IDS` va do'kon ma'lumotlarini kiriting.

### Variant A — Docker (serverga tavsiya etiladi)

```bash
docker compose up -d --build
docker compose logs -f        # loglarni ko'rish
```
Baza `./data/shop.db` faylida saqlanadi, server qayta yuklansa bot o'zi ishga tushadi.

### Variant B — oddiy Python

```bash
python -m venv .venv
source .venv/bin/activate        # Windows: .venv\Scripts\activate
pip install -r requirements.txt
python -m bot.main
```

Birinchi ishga tushganda namunaviy kategoriya va mahsulotlar qo'shiladi — ularni admin paneldan
o'chirib, o'z mahsulotlaringizni kiriting.

## Karta orqali to'lovni yoqish (Click / Payme)

1. @BotFather → `/mybots` → botingiz → **Payments**.
2. **Click** yoki **Payme** ni tanlang va ko'rsatmalar bo'yicha ulaning (avval test token bilan sinab ko'rish mumkin).
3. Olingan tokenni `.env` dagi `PAYMENT_PROVIDER_TOKEN` ga yozing va botni qayta ishga tushiring.

Token bo'lmasa, bot faqat naqd to'lov bilan ishlaydi.

## Sozlamalar (`.env`)

| O'zgaruvchi | Tavsif |
|---|---|
| `BOT_TOKEN` | Bot tokeni (majburiy) |
| `ADMIN_IDS` | Adminlar ID raqamlari, vergul bilan |
| `SHOP_NAME`, `SHOP_PHONE`, `SHOP_ADDRESS`, `SHOP_HOURS` | Do'kon ma'lumotlari |
| `OPEN_TIME`, `CLOSE_TIME` | Ish vaqti (`09:00`, `21:00`). Bo'sh bo'lsa — 24/7 |
| `TIMEZONE` | Vaqt zonasi, standart `Asia/Tashkent` |
| `REPORT_TIME` | Kunlik hisobot vaqti (`21:30`). Bo'sh bo'lsa — yuborilmaydi |
| `PAYMENT_PROVIDER_TOKEN` | Click/Payme tokeni |
| `PICKUP_ENABLED` | Olib ketish imkoniyati (`1`/`0`) |

Yetkazish narxi, minimal buyurtma kabi qiymatlar esa **admin paneldagi ⚙️ Sozlamalar** orqali o'zgartiriladi.

## Loyiha tuzilishi

```
bot/
  main.py          # ishga tushirish
  config.py        # .env sozlamalari, ish vaqti
  db.py            # SQLite: mahsulotlar, savat, buyurtmalar, ombor, promokodlar, sozlamalar
  i18n.py          # o'zbek va rus tilidagi matnlar
  keyboards.py     # tugmalar
  middlewares.py   # foydalanuvchi tilini aniqlash
  storage.py       # FSM holatlarini SQLite'da saqlash
  reports.py       # Excel va kunlik hisobot
  utils.py         # narx formati, telefon tekshiruvi, buyurtma matni
  handlers/
    common.py      # bekor qilish, adminlarga xabar
    user.py        # start, til, katalog, qidiruv, buyurtmalarim, baholash
    cart.py        # savat
    order.py       # buyurtma rasmiylashtirish
    payments.py    # Click / Payme to'lovi
    admin.py       # admin panel
tests/             # pytest testlari
```

## Testlar

```bash
pip install pytest pytest-asyncio
python -m pytest
```

Testlar haqiqiy Telegramga ulanmaydi: soxta sessiya orqali to'liq jarayonlar — til tanlash,
katalog, savat, promokod, yetkazish/olib ketish, karta to'lovi, ombor, bekor qilish, baholash va
admin panel — tekshiriladi.
