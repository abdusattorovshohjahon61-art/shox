# Nilufar Shoes — oyoq kiyim internet do'koni

Vizual effektli internet do'kon: mijoz sahifasi va CEO paneli. Faqat HTML/CSS/JS bilan yozilgan, server yoki o'rnatish shart emas.

## Ishga tushirish

`index.html` faylini brauzerda oching. Lokal server orqali ochish yaxshiroq:

```bash
python3 -m http.server 8000
# http://localhost:8000          — do'kon
# http://localhost:8000/admin.html — CEO panel (parol: admin123)
```

GitHub Pages'ga ham shundayligicha joylash mumkin.

## Imkoniyatlar

**Mijoz uchun (`index.html`)**
- Katalog: kategoriya, qidiruv, saralash, "faqat sevimlilar" filtri
- Mahsulot oynasi: rang, o'lcham va sonini tanlash
- ❤ Sevimlilar va 🛍 savat (brauzerda saqlanadi)
- Buyurtma: ism, telefon (+998 maska), qo'shimcha raqam, viloyat (14 ta), tuman, manzil, mo'ljal, to'lov usuli
- Kun / tun rejimi, UZ / RU / EN tillari
- Effektlar: zarrachali fon, 3D egiluvchi kartalar, scroll paytida paydo bo'lish, savatga uchish, konfetti, kursor nuri, marquee

**CEO panel (`admin.html`)**
- Boshqaruv: daromad, buyurtmalar, o'rtacha chek, konversiya, 14 kunlik grafik, kategoriyalar, eng ko'p sotilganlar
- Tahlil: har bir mahsulot bo'yicha ko'rishlar, savatga qo'shishlar, sevimlilar, sotuv, daromad, konversiya, baho (0–100) va avtomatik tavsiya ("zaxirani to'ldiring", "ko'p ko'rilgan, kam sotilgan" va h.k.), sotuv voronkasi, viloyatlar va o'lchamlar
- Mahsulotlar: qo'shish / tahrirlash / o'chirish, uch tilda nom va tavsif, rasm (URL yoki fayl)
- Buyurtmalar: holat bo'yicha filtr, holatni o'zgartirish (bekor qilinsa, qoldiq qaytariladi)
- Sayt matnlari: barcha matnlarni uch tilda tahrirlash **yoki** "Saytda tahrirlash" rejimi — do'kon sahifasida matn ustiga bosib o'zgartirasiz
- Sozlamalar: parol, yetkazib berish narxi, bepul yetkazish chegarasi, JSON eksport/import, demo ma'lumotlarni qayta yuklash

## Qayerni o'zgartirish kerak

| Nima | Fayl |
|---|---|
| Logotip | `assets/logo.png` |
| Standart matnlar va tarjimalar | `js/i18n.js` |
| Viloyatlar, kategoriyalar | `js/i18n.js` (`REGIONS`, `CATEGORIES`) |
| Demo mahsulotlar, standart parol, yetkazish narxi | `js/core.js` (`SEED_PRODUCTS`, `DEFAULT_SETTINGS`) |
| Ranglar, shriftlar, dizayn | `css/style.css` (`:root` va `[data-theme="dark"]`) |
| Effektlar | `js/effects.js` |

## Muhim eslatma

Hozircha barcha ma'lumotlar (mahsulotlar, buyurtmalar, statistika) **brauzerning localStorage**'ida saqlanadi. Ya'ni:
- mijoz buyurtmasi faqat o'sha brauzerdagi CEO panelda ko'rinadi;
- CEO paroli kodda tekshiriladi, haqiqiy himoya emas.

Haqiqiy do'kon sifatida ishlatish uchun backend (masalan, ma'lumotlar bazasi + Telegram botga buyurtma yuborish) ulash kerak — `js/core.js` dagi `Store` obyekti shu uchun alohida ajratilgan.
