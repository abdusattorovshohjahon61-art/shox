from sqlite3 import Row

from aiogram.filters.callback_data import CallbackData
from aiogram.types import InlineKeyboardMarkup, KeyboardButton, ReplyKeyboardMarkup
from aiogram.utils.keyboard import InlineKeyboardBuilder

from bot.db import ORDER_STATUSES
from bot.i18n import status_name, t
from bot.utils import money

PAGE_SIZE = 8
ADMIN_PANEL_BTN = "⚙️ Admin panel"


class LangCb(CallbackData, prefix="lang"):
    code: str


class CategoryCb(CallbackData, prefix="cat"):
    id: int
    page: int = 0


class ProductCb(CallbackData, prefix="prod"):
    id: int
    qty: int = 1
    upd: int = 0  # 1 - faqat miqdor tugmalarini yangilash


class AddCb(CallbackData, prefix="add"):
    id: int
    qty: int


class CartCb(CallbackData, prefix="cart"):
    action: str  # inc | dec | del | clear | checkout | show
    id: int = 0


class MyOrderCb(CallbackData, prefix="my"):
    action: str  # cancel | repeat | pay
    id: int


class RateCb(CallbackData, prefix="rate"):
    id: int
    stars: int


class OrderStatusCb(CallbackData, prefix="ost"):
    id: int
    status: str


class AdminCb(CallbackData, prefix="adm"):
    action: str
    id: int = 0
    key: str = ""


def _reply(rows: list[list[str]]) -> ReplyKeyboardMarkup:
    return ReplyKeyboardMarkup(
        keyboard=[[KeyboardButton(text=x) for x in row] for row in rows], resize_keyboard=True
    )


# --- Mijoz menyulari ---

def lang_kb() -> InlineKeyboardMarkup:
    b = InlineKeyboardBuilder()
    b.button(text="🇺🇿 O'zbekcha", callback_data=LangCb(code="uz"))
    b.button(text="🇷🇺 Русский", callback_data=LangCb(code="ru"))
    return b.as_markup()


def main_menu(lang: str, is_admin: bool = False) -> ReplyKeyboardMarkup:
    rows = [
        [t("btn_catalog", lang), t("btn_cart", lang)],
        [t("btn_orders", lang), t("btn_search", lang)],
        [t("btn_contact", lang), t("btn_about", lang)],
        [t("btn_lang", lang)],
    ]
    if is_admin:
        rows.append([ADMIN_PANEL_BTN])
    return _reply(rows)


def cancel_kb(lang: str = "uz") -> ReplyKeyboardMarkup:
    return _reply([[t("btn_cancel", lang)]])


def skip_cancel_kb(lang: str = "uz") -> ReplyKeyboardMarkup:
    return _reply([[t("btn_skip", lang)], [t("btn_cancel", lang)]])


def phone_kb(lang: str, saved_phone: str | None = None) -> ReplyKeyboardMarkup:
    rows = [[KeyboardButton(text=t("btn_send_phone", lang), request_contact=True)]]
    if saved_phone:
        rows.insert(0, [KeyboardButton(text=saved_phone)])
    rows.append([KeyboardButton(text=t("btn_cancel", lang))])
    return ReplyKeyboardMarkup(keyboard=rows, resize_keyboard=True)


def location_kb(lang: str) -> ReplyKeyboardMarkup:
    return ReplyKeyboardMarkup(
        keyboard=[
            [KeyboardButton(text=t("btn_send_location", lang), request_location=True)],
            [KeyboardButton(text=t("btn_cancel", lang))],
        ],
        resize_keyboard=True,
    )


def delivery_type_kb(lang: str) -> ReplyKeyboardMarkup:
    return _reply([[t("btn_delivery", lang), t("btn_pickup", lang)], [t("btn_cancel", lang)]])


def payment_kb(lang: str) -> ReplyKeyboardMarkup:
    return _reply([[t("btn_cash", lang), t("btn_card", lang)], [t("btn_cancel", lang)]])


def confirm_kb(lang: str) -> ReplyKeyboardMarkup:
    return _reply([[t("btn_confirm", lang)], [t("btn_cancel", lang)]])


def categories_kb(categories: list[Row]) -> InlineKeyboardMarkup:
    b = InlineKeyboardBuilder()
    for c in categories:
        b.button(text=c["name"], callback_data=CategoryCb(id=c["id"]))
    b.adjust(2)
    return b.as_markup()


def _product_label(p: Row, lang: str) -> str:
    label = f"{p['name']} — {money(p['price'], lang)}"
    return ("⛔️ " + label) if p["stock"] is not None and p["stock"] <= 0 else label


def products_kb(products: list[Row], lang: str, category_id: int | None = None, page: int = 0) -> InlineKeyboardMarkup:
    """Mahsulotlar ro'yxati. category_id berilsa — sahifalab ko'rsatadi."""
    b = InlineKeyboardBuilder()
    pages = max(1, (len(products) + PAGE_SIZE - 1) // PAGE_SIZE)
    page = min(max(page, 0), pages - 1)
    shown = products[page * PAGE_SIZE:(page + 1) * PAGE_SIZE] if category_id else products
    for p in shown:
        b.button(text=_product_label(p, lang), callback_data=ProductCb(id=p["id"]))
    sizes = [1] * len(shown)
    if category_id and pages > 1:
        nav = 0
        if page > 0:
            b.button(text="◀️", callback_data=CategoryCb(id=category_id, page=page - 1))
            nav += 1
        b.button(text=f"{page + 1}/{pages}", callback_data="noop")
        nav += 1
        if page < pages - 1:
            b.button(text="▶️", callback_data=CategoryCb(id=category_id, page=page + 1))
            nav += 1
        sizes.append(nav)
    b.button(text=t("btn_categories", lang), callback_data="catalog")
    sizes.append(1)
    b.adjust(*sizes)
    return b.as_markup()


def product_kb(product_id: int, category_id: int, qty: int, lang: str, available: bool = True) -> InlineKeyboardMarkup:
    b = InlineKeyboardBuilder()
    if available:
        b.button(text="➖", callback_data=ProductCb(id=product_id, qty=max(1, qty - 1), upd=1))
        b.button(text=str(qty), callback_data="noop")
        b.button(text="➕", callback_data=ProductCb(id=product_id, qty=min(99, qty + 1), upd=1))
        b.button(text=t("btn_add_to_cart", lang), callback_data=AddCb(id=product_id, qty=qty))
    b.button(text=t("btn_back", lang), callback_data=CategoryCb(id=category_id))
    b.adjust(*([3, 1, 1] if available else [1]))
    return b.as_markup()


def after_add_kb(lang: str) -> InlineKeyboardMarkup:
    b = InlineKeyboardBuilder()
    b.button(text=t("btn_go_cart", lang), callback_data=CartCb(action="show"))
    b.button(text=t("btn_continue", lang), callback_data="catalog")
    b.adjust(1)
    return b.as_markup()


def cart_kb(items: list[Row], lang: str) -> InlineKeyboardMarkup:
    b = InlineKeyboardBuilder()
    sizes = []
    for r in items:
        b.button(text="➖", callback_data=CartCb(action="dec", id=r["product_id"]))
        b.button(text=f"❌ {r['name'][:18]} ({r['qty']})", callback_data=CartCb(action="del", id=r["product_id"]))
        b.button(text="➕", callback_data=CartCb(action="inc", id=r["product_id"]))
        sizes.append(3)
    b.button(text=t("btn_checkout", lang), callback_data=CartCb(action="checkout"))
    b.button(text=t("btn_clear_cart", lang), callback_data=CartCb(action="clear"))
    b.button(text=t("btn_catalog", lang), callback_data="catalog")
    b.adjust(*sizes, 1, 1, 1)
    return b.as_markup()


def my_order_kb(order: Row, lang: str, can_pay: bool) -> InlineKeyboardMarkup | None:
    b = InlineKeyboardBuilder()
    if order["status"] == "new":
        b.button(text=t("btn_cancel_order", lang), callback_data=MyOrderCb(action="cancel", id=order["id"]))
    if can_pay and order["payment_method"] == "card" and not order["paid"] and order["status"] != "cancelled":
        b.button(text=t("btn_pay", lang), callback_data=MyOrderCb(action="pay", id=order["id"]))
    b.button(text=t("btn_repeat_order", lang), callback_data=MyOrderCb(action="repeat", id=order["id"]))
    b.adjust(1)
    return b.as_markup()


def rate_kb(order_id: int) -> InlineKeyboardMarkup:
    b = InlineKeyboardBuilder()
    for stars in range(1, 6):
        b.button(text="⭐️" * stars, callback_data=RateCb(id=order_id, stars=stars))
    b.adjust(1)
    return b.as_markup()


# --- Admin ---

def order_status_kb(order_id: int) -> InlineKeyboardMarkup:
    b = InlineKeyboardBuilder()
    for key in ORDER_STATUSES:
        if key != "new":
            b.button(text=status_name(key, "uz"), callback_data=OrderStatusCb(id=order_id, status=key))
    b.adjust(2)
    return b.as_markup()


def admin_kb() -> InlineKeyboardMarkup:
    b = InlineKeyboardBuilder()
    buttons = [
        ("📊 Statistika", "stats"),
        ("🆕 Yangi buyurtmalar", "new_orders"),
        ("📋 Oxirgi buyurtmalar", "orders"),
        ("➕ Kategoriya", "add_cat"),
        ("➕ Mahsulot", "add_prod"),
        ("🗂 Mahsulotlar", "manage"),
        ("📉 Kam qolganlar", "low_stock"),
        ("🎟 Promokodlar", "promos"),
        ("⚙️ Sozlamalar", "settings"),
        ("📥 Excel hisobot", "export"),
        ("📣 Xabar yuborish", "broadcast"),
    ]
    for text, action in buttons:
        b.button(text=text, callback_data=AdminCb(action=action))
    b.adjust(1, 2, 2, 2, 2, 2)
    return b.as_markup()


def admin_categories_kb(categories: list[Row], action: str) -> InlineKeyboardMarkup:
    b = InlineKeyboardBuilder()
    for c in categories:
        b.button(text=c["name"], callback_data=AdminCb(action=action, id=c["id"]))
    b.adjust(2)
    return b.as_markup()


def admin_products_kb(products: list[Row], category_id: int) -> InlineKeyboardMarkup:
    b = InlineKeyboardBuilder()
    for p in products:
        prefix = "" if p["is_active"] else "🙈 "
        stock = "" if p["stock"] is None else f" [{p['stock']}]"
        b.button(text=f"{prefix}{p['name']} — {money(p['price'])}{stock}", callback_data=AdminCb(action="prod", id=p["id"]))
    b.button(text="🗑 Kategoriyani o'chirish", callback_data=AdminCb(action="del_cat", id=category_id))
    b.adjust(1)
    return b.as_markup()


EDIT_FIELDS = {
    "name": "✏️ Nomi",
    "price": "💲 Narxi",
    "description": "📝 Tavsifi",
    "photo_id": "🖼 Rasmi",
    "stock": "📦 Qoldiq",
}


def admin_product_kb(product: Row) -> InlineKeyboardMarkup:
    b = InlineKeyboardBuilder()
    for field, label in EDIT_FIELDS.items():
        b.button(text=label, callback_data=AdminCb(action="edit", id=product["id"], key=field))
    b.button(
        text="🙈 Yashirish" if product["is_active"] else "👁 Ko'rsatish",
        callback_data=AdminCb(action="toggle", id=product["id"]),
    )
    b.button(text="🗑 O'chirish", callback_data=AdminCb(action="del_prod", id=product["id"]))
    b.adjust(2, 2, 1, 2)
    return b.as_markup()


def confirm_delete_kb(action: str, item_id: int) -> InlineKeyboardMarkup:
    b = InlineKeyboardBuilder()
    b.button(text="✅ Ha, o'chirish", callback_data=AdminCb(action=action, id=item_id, key="yes"))
    b.button(text="❌ Yo'q", callback_data=AdminCb(action="noop"))
    return b.as_markup()


SETTING_LABELS = {
    "delivery_fee": "🚚 Yetkazib berish narxi",
    "free_delivery_from": "🎁 Bepul yetkazish (dan)",
    "min_order": "🧾 Minimal buyurtma",
    "low_stock": "📉 Kam qoldiq chegarasi",
}


def settings_kb(values: dict[str, int]) -> InlineKeyboardMarkup:
    b = InlineKeyboardBuilder()
    for key, label in SETTING_LABELS.items():
        value = values[key]
        shown = f"{value} dona" if key == "low_stock" else money(value)
        b.button(text=f"{label}: {shown}", callback_data=AdminCb(action="set", key=key))
    b.adjust(1)
    return b.as_markup()


def promos_kb(promos: list[Row]) -> InlineKeyboardMarkup:
    b = InlineKeyboardBuilder()
    for p in promos:
        uses = f"{p['used']}/{p['max_uses']}" if p["max_uses"] else f"{p['used']}/∞"
        b.button(text=f"🗑 {p['code']} −{p['percent']}% ({uses})", callback_data=AdminCb(action="del_promo", key=p["code"]))
    b.button(text="➕ Promokod qo'shish", callback_data=AdminCb(action="add_promo"))
    b.adjust(1)
    return b.as_markup()
