"""Mijozlar uchun matnlar (o'zbek va rus tillarida). Admin panel o'zbek tilida."""

LANGS = ("uz", "ru")
DEFAULT_LANG = "uz"

TEXTS: dict[str, dict[str, str]] = {
    # --- Tugmalar ---
    "btn_catalog": {"uz": "🛍 Katalog", "ru": "🛍 Каталог"},
    "btn_cart": {"uz": "🛒 Savat", "ru": "🛒 Корзина"},
    "btn_orders": {"uz": "📦 Buyurtmalarim", "ru": "📦 Мои заказы"},
    "btn_search": {"uz": "🔍 Qidirish", "ru": "🔍 Поиск"},
    "btn_contact": {"uz": "☎️ Aloqa", "ru": "☎️ Контакты"},
    "btn_about": {"uz": "ℹ️ Biz haqimizda", "ru": "ℹ️ О нас"},
    "btn_lang": {"uz": "🌐 Til / Язык", "ru": "🌐 Til / Язык"},
    "btn_cancel": {"uz": "❌ Bekor qilish", "ru": "❌ Отмена"},
    "btn_skip": {"uz": "⏭ O'tkazib yuborish", "ru": "⏭ Пропустить"},
    "btn_send_phone": {"uz": "📞 Raqamni yuborish", "ru": "📞 Отправить номер"},
    "btn_send_location": {"uz": "📍 Joylashuvni yuborish", "ru": "📍 Отправить геолокацию"},
    "btn_confirm": {"uz": "✅ Tasdiqlash", "ru": "✅ Подтвердить"},
    "btn_delivery": {"uz": "🚚 Yetkazib berish", "ru": "🚚 Доставка"},
    "btn_pickup": {"uz": "🏃 Olib ketish", "ru": "🏃 Самовывоз"},
    "btn_cash": {"uz": "💵 Naqd pul", "ru": "💵 Наличные"},
    "btn_card": {"uz": "💳 Karta (Click / Payme)", "ru": "💳 Карта (Click / Payme)"},
    "btn_add_to_cart": {"uz": "🛒 Savatga qo'shish", "ru": "🛒 В корзину"},
    "btn_back": {"uz": "⬅️ Orqaga", "ru": "⬅️ Назад"},
    "btn_categories": {"uz": "⬅️ Kategoriyalar", "ru": "⬅️ Категории"},
    "btn_go_cart": {"uz": "🛒 Savatga o'tish", "ru": "🛒 Перейти в корзину"},
    "btn_continue": {"uz": "🛍 Xaridni davom ettirish", "ru": "🛍 Продолжить покупки"},
    "btn_checkout": {"uz": "✅ Buyurtma berish", "ru": "✅ Оформить заказ"},
    "btn_clear_cart": {"uz": "🗑 Savatni tozalash", "ru": "🗑 Очистить корзину"},
    "btn_cancel_order": {"uz": "❌ Buyurtmani bekor qilish", "ru": "❌ Отменить заказ"},
    "btn_repeat_order": {"uz": "🔁 Qayta buyurtma", "ru": "🔁 Повторить заказ"},
    "btn_pay": {"uz": "💳 To'lash", "ru": "💳 Оплатить"},
    # --- Asosiy ---
    "choose_lang": {
        "uz": "Tilni tanlang / Выберите язык:",
        "ru": "Tilni tanlang / Выберите язык:",
    },
    "welcome": {
        "uz": "Assalomu alaykum, <b>{name}</b>! 👋\n\n<b>{shop}</b> botiga xush kelibsiz.\n"
              "Bu yerda mahsulotlarni ko'rib, savatga qo'shib, buyurtma berishingiz mumkin.\n\n"
              "Quyidagi menyudan tanlang 👇",
        "ru": "Здравствуйте, <b>{name}</b>! 👋\n\nДобро пожаловать в бот <b>{shop}</b>.\n"
              "Здесь вы можете посмотреть товары, добавить их в корзину и оформить заказ.\n\n"
              "Выберите раздел в меню 👇",
    },
    "main_menu": {"uz": "Asosiy menyu:", "ru": "Главное меню:"},
    "cancelled": {"uz": "Bekor qilindi.", "ru": "Отменено."},
    "unknown_command": {"uz": "Noma'lum buyruq. /start ni bosing.", "ru": "Неизвестная команда. Нажмите /start."},
    "shop_closed_note": {
        "uz": "🕘 Hozir ish vaqtidan tashqari ({hours}). Buyurtmangiz ish vaqtida ko'rib chiqiladi.",
        "ru": "🕘 Сейчас нерабочее время ({hours}). Заказ будет обработан в рабочее время.",
    },
    # --- Katalog ---
    "no_products": {"uz": "Hozircha mahsulotlar yo'q. Tez orada qo'shiladi! 🙂", "ru": "Пока товаров нет. Скоро появятся! 🙂"},
    "choose_category": {"uz": "🛍 <b>Kategoriyani tanlang:</b>", "ru": "🛍 <b>Выберите категорию:</b>"},
    "choose_product": {"uz": "<b>{cat}</b>\n\nMahsulotni tanlang:", "ru": "<b>{cat}</b>\n\nВыберите товар:"},
    "category_empty": {"uz": "Bu kategoriyada mahsulot yo'q", "ru": "В этой категории нет товаров"},
    "product_not_found": {"uz": "Mahsulot topilmadi", "ru": "Товар не найден"},
    "price": {"uz": "💰 Narxi: <b>{price}</b>", "ru": "💰 Цена: <b>{price}</b>"},
    "in_stock": {"uz": "📦 Omborda: {n} dona", "ru": "📦 В наличии: {n} шт."},
    "out_of_stock": {"uz": "⛔️ Tugagan", "ru": "⛔️ Нет в наличии"},
    "not_enough_stock": {
        "uz": "Omborda faqat {n} dona qolgan", "ru": "В наличии только {n} шт.",
    },
    "added_alert": {"uz": "✅ Savatga qo'shildi", "ru": "✅ Добавлено в корзину"},
    "added": {
        "uz": "✅ <b>{name}</b> — {qty} dona savatga qo'shildi.\nSavatdagi jami summa: <b>{total}</b>",
        "ru": "✅ <b>{name}</b> — {qty} шт. добавлено в корзину.\nСумма в корзине: <b>{total}</b>",
    },
    # --- Qidiruv ---
    "search_prompt": {"uz": "Mahsulot nomini yozing:", "ru": "Введите название товара:"},
    "search_found": {"uz": "🔍 «{q}» bo'yicha topildi: {n} ta", "ru": "🔍 По запросу «{q}» найдено: {n}"},
    "search_none": {"uz": "Hech narsa topilmadi 😕", "ru": "Ничего не найдено 😕"},
    "message_to_admin_sent": {
        "uz": "Xabaringiz qabul qilindi ✅ Admin tez orada javob beradi.\n"
              "Mahsulotlarni ko'rish uchun «🛍 Katalog» tugmasini bosing.",
        "ru": "Ваше сообщение получено ✅ Администратор скоро ответит.\n"
              "Чтобы посмотреть товары, нажмите «🛍 Каталог».",
    },
    "admin_reply": {"uz": "📩 <b>Admin javobi:</b>\n\n{text}", "ru": "📩 <b>Ответ администратора:</b>\n\n{text}"},
    # --- Savat ---
    "cart_empty": {
        "uz": "🛒 Savatingiz bo'sh.\n«🛍 Katalog» orqali mahsulot tanlang.",
        "ru": "🛒 Ваша корзина пуста.\nВыберите товары в «🛍 Каталог».",
    },
    "cart_title": {"uz": "🛒 <b>Savatingiz:</b>\n", "ru": "🛒 <b>Ваша корзина:</b>\n"},
    "subtotal": {"uz": "Mahsulotlar: {sum}", "ru": "Товары: {sum}"},
    "discount": {"uz": "🎟 Chegirma ({code}): −{sum}", "ru": "🎟 Скидка ({code}): −{sum}"},
    "delivery_fee": {"uz": "🚚 Yetkazib berish: {sum}", "ru": "🚚 Доставка: {sum}"},
    "delivery_free": {"uz": "🚚 Yetkazib berish: bepul", "ru": "🚚 Доставка: бесплатно"},
    "total": {"uz": "💰 <b>Jami: {sum}</b>", "ru": "💰 <b>Итого: {sum}</b>"},
    "free_delivery_hint": {
        "uz": "💡 Yana {sum} lik xarid qilsangiz, yetkazib berish bepul!",
        "ru": "💡 Добавьте товаров ещё на {sum} — и доставка будет бесплатной!",
    },
    "min_order": {
        "uz": "❗ Minimal buyurtma summasi: {sum}", "ru": "❗ Минимальная сумма заказа: {sum}",
    },
    # --- Buyurtma rasmiylashtirish ---
    "ask_delivery_type": {"uz": "Qanday qabul qilasiz?", "ru": "Как хотите получить заказ?"},
    "ask_name": {
        "uz": "📝 Ismingizni kiriting yoki «⏭ O'tkazib yuborish» ni bosing (Telegramdagi ismingiz olinadi):",
        "ru": "📝 Введите ваше имя или нажмите «⏭ Пропустить» (возьмём имя из Telegram):",
    },
    "bad_name": {"uz": "Iltimos, ismingizni to'g'ri kiriting:", "ru": "Пожалуйста, введите имя корректно:"},
    "ask_phone": {
        "uz": "📞 Telefon raqamingizni yuboring yoki yozing (masalan: +998901234567):",
        "ru": "📞 Отправьте или введите номер телефона (например: +998901234567):",
    },
    "bad_phone": {"uz": "❗ Raqam noto'g'ri. Namuna: +998901234567", "ru": "❗ Неверный номер. Пример: +998901234567"},
    "ask_address": {
        "uz": "📍 Yetkazib berish manzilini yozing yoki joylashuvni yuboring:",
        "ru": "📍 Напишите адрес доставки или отправьте геолокацию:",
    },
    "bad_address": {"uz": "Manzilni batafsilroq yozing:", "ru": "Укажите адрес подробнее:"},
    "location_address": {"uz": "Lokatsiya: {lat}, {lon}", "ru": "Геолокация: {lat}, {lon}"},
    "pickup_address": {"uz": "Olib ketish: {address}", "ru": "Самовывоз: {address}"},
    "ask_comment": {
        "uz": "💬 Izoh qoldirasizmi? (masalan: qo'ng'iroq qilib keling, 3-qavat)",
        "ru": "💬 Комментарий к заказу? (например: позвоните заранее, 3 этаж)",
    },
    "ask_promo": {"uz": "🎟 Promokodingiz bormi? Yozing yoki o'tkazib yuboring:", "ru": "🎟 Есть промокод? Введите или пропустите:"},
    "promo_ok": {"uz": "✅ Promokod qabul qilindi: −{percent}%", "ru": "✅ Промокод применён: −{percent}%"},
    "promo_bad": {"uz": "❌ Promokod topilmadi yoki muddati tugagan. Boshqasini yozing yoki o'tkazib yuboring:",
                  "ru": "❌ Промокод не найден или истёк. Введите другой или пропустите:"},
    "ask_payment": {"uz": "To'lov usulini tanlang:", "ru": "Выберите способ оплаты:"},
    "confirm_question": {"uz": "Buyurtmani tasdiqlaysizmi?", "ru": "Подтверждаете заказ?"},
    "press_confirm": {
        "uz": "Tasdiqlash uchun «✅ Tasdiqlash», bekor qilish uchun «❌ Bekor qilish» ni bosing.",
        "ru": "Нажмите «✅ Подтвердить» или «❌ Отмена».",
    },
    "use_buttons": {"uz": "Iltimos, tugmalardan birini tanlang.", "ru": "Пожалуйста, выберите вариант на кнопках."},
    "order_created": {
        "uz": "🎉 Rahmat! Buyurtmangiz <b>#{id}</b> qabul qilindi.\nTez orada operatorimiz siz bilan bog'lanadi.",
        "ru": "🎉 Спасибо! Ваш заказ <b>#{id}</b> принят.\nНаш оператор скоро свяжется с вами.",
    },
    "order_created_pay": {
        "uz": "🎉 Buyurtma <b>#{id}</b> yaratildi. Quyidagi tugma orqali to'lovni amalga oshiring 👇",
        "ru": "🎉 Заказ <b>#{id}</b> создан. Оплатите его по кнопке ниже 👇",
    },
    "out_of_stock_order": {
        "uz": "😔 Ba'zi mahsulotlar omborda yetarli emas:\n{items}\n\nSavatni tahrirlab, qaytadan urinib ko'ring.",
        "ru": "😔 Некоторых товаров недостаточно на складе:\n{items}\n\nИзмените корзину и попробуйте снова.",
    },
    "cart_empty_short": {"uz": "Savat bo'sh.", "ru": "Корзина пуста."},
    # --- To'lov ---
    "invoice_title": {"uz": "Buyurtma #{id}", "ru": "Заказ #{id}"},
    "invoice_desc": {"uz": "{shop} — buyurtma uchun to'lov", "ru": "{shop} — оплата заказа"},
    "payment_ok": {"uz": "✅ To'lov qabul qilindi! Buyurtma #{id} to'landi.", "ru": "✅ Оплата получена! Заказ #{id} оплачен."},
    "payment_unavailable": {"uz": "Karta orqali to'lov hozircha mavjud emas.", "ru": "Оплата картой пока недоступна."},
    "already_paid": {"uz": "Bu buyurtma allaqachon to'langan.", "ru": "Этот заказ уже оплачен."},
    # --- Buyurtmalar ---
    "no_orders": {"uz": "Sizda hali buyurtmalar yo'q.", "ru": "У вас пока нет заказов."},
    "order_title": {"uz": "🧾 <b>Buyurtma #{id}</b>", "ru": "🧾 <b>Заказ #{id}</b>"},
    "order_status": {"uz": "Holati: {status}", "ru": "Статус: {status}"},
    "order_date": {"uz": "Sana: {date}", "ru": "Дата: {date}"},
    "order_payment": {"uz": "To'lov: {method}", "ru": "Оплата: {method}"},
    "paid": {"uz": "✅ to'langan", "ru": "✅ оплачен"},
    "unpaid": {"uz": "⏳ to'lanmagan", "ru": "⏳ не оплачен"},
    "status_changed": {
        "uz": "🔔 Buyurtmangiz <b>#{id}</b> holati o'zgardi: {status}",
        "ru": "🔔 Статус вашего заказа <b>#{id}</b> изменён: {status}",
    },
    "order_cancelled_by_user": {"uz": "❌ Buyurtma #{id} bekor qilindi.", "ru": "❌ Заказ #{id} отменён."},
    "cannot_cancel": {
        "uz": "Buyurtmani endi bekor qilib bo'lmaydi. Operator bilan bog'laning.",
        "ru": "Заказ уже нельзя отменить. Свяжитесь с оператором.",
    },
    "repeat_done": {"uz": "🔁 Mahsulotlar savatga qo'shildi.", "ru": "🔁 Товары добавлены в корзину."},
    "repeat_none": {"uz": "Bu buyurtmadagi mahsulotlar endi sotuvda yo'q.", "ru": "Товаров из этого заказа больше нет в продаже."},
    "rate_request": {
        "uz": "🙏 Buyurtma #{id} yetkazildi. Xizmatimizni baholang:",
        "ru": "🙏 Заказ #{id} доставлен. Оцените наш сервис:",
    },
    "rate_thanks": {"uz": "Bahoingiz uchun rahmat! ⭐️", "ru": "Спасибо за оценку! ⭐️"},
    # --- Ma'lumot ---
    "contact": {
        "uz": "☎️ <b>Biz bilan bog'lanish</b>\n\n📞 Telefon: {phone}\n📍 Manzil: {address}\n🕘 Ish vaqti: {hours}\n\n"
              "Savolingiz bo'lsa, shu yerga yozib qoldiring — admin javob beradi.",
        "ru": "☎️ <b>Контакты</b>\n\n📞 Телефон: {phone}\n📍 Адрес: {address}\n🕘 Время работы: {hours}\n\n"
              "Если есть вопрос, напишите его здесь — администратор ответит.",
    },
    "about": {
        "uz": "ℹ️ <b>{shop}</b>\n\nSifatli mahsulotlar, qulay narxlar va tez yetkazib berish.\n"
              "Hozirda katalogda {n} ta mahsulot bor.\n\nBuyurtma berish uchun «🛍 Katalog» bo'limiga o'ting.",
        "ru": "ℹ️ <b>{shop}</b>\n\nКачественные товары, доступные цены и быстрая доставка.\n"
              "Сейчас в каталоге {n} товаров.\n\nЧтобы сделать заказ, перейдите в «🛍 Каталог».",
    },
    "lang_changed": {"uz": "✅ Til o'zgartirildi.", "ru": "✅ Язык изменён."},
    # --- Birliklar ---
    "currency": {"uz": "so'm", "ru": "сум"},
    "pcs": {"uz": "dona", "ru": "шт."},
}

STATUS_NAMES = {
    "new": {"uz": "🆕 Yangi", "ru": "🆕 Новый"},
    "accepted": {"uz": "✅ Qabul qilindi", "ru": "✅ Принят"},
    "delivering": {"uz": "🚚 Yetkazilmoqda", "ru": "🚚 В пути"},
    "done": {"uz": "📦 Yetkazildi", "ru": "📦 Доставлен"},
    "cancelled": {"uz": "❌ Bekor qilindi", "ru": "❌ Отменён"},
}


def t(key: str, lang: str | None = DEFAULT_LANG, **kwargs) -> str:
    variants = TEXTS[key]
    text = variants.get(lang or DEFAULT_LANG) or variants[DEFAULT_LANG]
    return text.format(**kwargs) if kwargs else text


def all_langs(key: str) -> set[str]:
    """Tugma matnini barcha tillarda qaytaradi — F.text.in_(...) filtri uchun."""
    return set(TEXTS[key].values())


def status_name(status: str, lang: str | None = DEFAULT_LANG) -> str:
    names = STATUS_NAMES.get(status)
    return names.get(lang or DEFAULT_LANG, names[DEFAULT_LANG]) if names else status
