# shox — Do'kon uchun Telegram chat-bot

Kichik va o'rta do'konlar uchun tayyor Telegram bot: mijozlar katalogni ko'radi,
savatga mahsulot qo'shadi va buyurtma beradi; admin esa buyurtmalarni qabul qiladi,
mahsulotlarni boshqaradi va hammaga xabar yuboradi.

Python 3.11+, [aiogram 3](https://docs.aiogram.dev) va SQLite asosida.

## Imkoniyatlar

**Mijoz uchun**
- 🛍 **Katalog** — kategoriyalar → mahsulotlar → rasm, tavsif, narx, ➖/➕ miqdor
- 🛒 **Savat** — miqdorni o'zgartirish, o'chirish, jami summa
- ✅ **Buyurtma berish** — ism, telefon (kontakt tugmasi bilan), manzil yoki lokatsiya, izoh, tasdiqlash
- 📦 **Buyurtmalarim** — buyurtmalar tarixi va holati
- 🔍 **Qidiruv** — nom yoki tavsif bo'yicha (istalgan matn yozilsa ham avtomatik qidiradi)
- ☎️ **Aloqa** / ℹ️ **Biz haqimizda**
- Mahsulot topilmagan savollar adminga yuboriladi, admin `/reply` orqali javob beradi
- Buyurtma holati o'zgarganda mijozga avtomatik xabar keladi

**Admin uchun** (`/admin` yoki «⚙️ Admin panel»)
- 🔔 Yangi buyurtma darhol adminga keladi (lokatsiya bilan), holatni tugma bilan o'zgartirish:
  Qabul qilindi → Yetkazilmoqda → Yetkazildi / Bekor qilindi
- 📊 Statistika (foydalanuvchilar, buyurtmalar, bugungi buyurtmalar, tushum)
- ➕ Kategoriya va mahsulot (rasm bilan) qo'shish
- 💲 Narxni o'zgartirish, 🗑 mahsulotni o'chirish
- 📣 Barcha foydalanuvchilarga xabar (matn yoki rasm)
- `/reply <user_id> <matn>` — mijozga javob yozish

## O'rnatish

1. [@BotFather](https://t.me/BotFather) da yangi bot yarating va tokenni oling.
2. O'z Telegram ID raqamingizni bilib oling (masalan, [@userinfobot](https://t.me/userinfobot)).
3. Loyihani sozlang:

```bash
git clone https://github.com/abdusattorovshohjahon61-art/shox.git
cd shox
python -m venv .venv
source .venv/bin/activate        # Windows: .venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env             # so'ng .env faylini tahrirlang
```

4. `.env` faylida `BOT_TOKEN`, `ADMIN_IDS` va do'kon ma'lumotlarini kiriting.
5. Ishga tushiring:

```bash
python -m bot.main
```

Birinchi ishga tushganda baza bo'sh bo'lsa, namunaviy kategoriya va mahsulotlar qo'shiladi.
Ularni admin paneldan o'chirib, o'z mahsulotlaringizni qo'shishingiz mumkin.

## Loyiha tuzilishi

```
bot/
  main.py          # ishga tushirish nuqtasi
  config.py        # .env dan sozlamalar
  db.py            # SQLite: kategoriyalar, mahsulotlar, savat, buyurtmalar
  keyboards.py     # tugmalar
  utils.py         # narx formati, telefon tekshiruvi, buyurtma matni
  handlers/
    common.py      # bekor qilish va umumiy yordamchilar
    user.py        # start, katalog, qidiruv, aloqa
    cart.py        # savat
    order.py       # buyurtma rasmiylashtirish
    admin.py       # admin panel
tests/             # pytest testlari
```

## Testlar

```bash
pip install pytest pytest-asyncio
python -m pytest
```

Testlar haqiqiy Telegramga ulanmaydi: soxta sessiya orqali to'liq buyurtma jarayoni
(katalog → savat → buyurtma → admin holatni o'zgartiradi) tekshiriladi.

## Keyingi qadamlar (g'oyalar)

- To'lov tizimlari (Click, Payme) integratsiyasi
- Bir nechta til (o'zbek / rus)
- Yetkazib berish narxi va hududlar
- Serverga joylash (systemd yoki Docker) va webhook rejimi
