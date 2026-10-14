from sqlite3 import Row

from aiogram.filters.callback_data import CallbackData
from aiogram.types import (
    InlineKeyboardMarkup,
    KeyboardButton,
    ReplyKeyboardMarkup,
)
from aiogram.utils.keyboard import InlineKeyboardBuilder

from bot.db import ORDER_STATUSES
from bot.utils import money

# --- Asosiy menyu tugmalari ---
BTN_CATALOG = "🛍 Katalog"
BTN_CART = "🛒 Savat"
BTN_ORDERS = "📦 Buyurtmalarim"
BTN_SEARCH = "🔍 Qidirish"
BTN_CONTACT = "☎️ Aloqa"
BTN_ABOUT = "ℹ️ Biz haqimizda"
BTN_CANCEL = "❌ Bekor qilish"
BTN_SKIP = "⏭ O'tkazib yuborish"


class CategoryCb(CallbackData, prefix="cat"):
    id: int


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


class OrderStatusCb(CallbackData, prefix="ost"):
    id: int
    status: str


class AdminCb(CallbackData, prefix="adm"):
    action: str
    id: int = 0


def main_menu(is_admin: bool = False) -> ReplyKeyboardMarkup:
    rows = [
        [KeyboardButton(text=BTN_CATALOG), KeyboardButton(text=BTN_CART)],
        [KeyboardButton(text=BTN_ORDERS), KeyboardButton(text=BTN_SEARCH)],
        [KeyboardButton(text=BTN_CONTACT), KeyboardButton(text=BTN_ABOUT)],
    ]
    if is_admin:
        rows.append([KeyboardButton(text="⚙️ Admin panel")])
    return ReplyKeyboardMarkup(keyboard=rows, resize_keyboard=True)


def cancel_kb() -> ReplyKeyboardMarkup:
    return ReplyKeyboardMarkup(keyboard=[[KeyboardButton(text=BTN_CANCEL)]], resize_keyboard=True)


def skip_cancel_kb() -> ReplyKeyboardMarkup:
    return ReplyKeyboardMarkup(
        keyboard=[[KeyboardButton(text=BTN_SKIP)], [KeyboardButton(text=BTN_CANCEL)]],
        resize_keyboard=True,
    )


def phone_kb(saved_phone: str | None = None) -> ReplyKeyboardMarkup:
    rows = [[KeyboardButton(text="📞 Raqamni yuborish", request_contact=True)]]
    if saved_phone:
        rows.insert(0, [KeyboardButton(text=saved_phone)])
    rows.append([KeyboardButton(text=BTN_CANCEL)])
    return ReplyKeyboardMarkup(keyboard=rows, resize_keyboard=True)


def location_kb() -> ReplyKeyboardMarkup:
    return ReplyKeyboardMarkup(
        keyboard=[
            [KeyboardButton(text="📍 Joylashuvni yuborish", request_location=True)],
            [KeyboardButton(text=BTN_CANCEL)],
        ],
        resize_keyboard=True,
    )


def confirm_kb() -> ReplyKeyboardMarkup:
    return ReplyKeyboardMarkup(
        keyboard=[[KeyboardButton(text="✅ Tasdiqlash")], [KeyboardButton(text=BTN_CANCEL)]],
        resize_keyboard=True,
    )


def categories_kb(categories: list[Row]) -> InlineKeyboardMarkup:
    b = InlineKeyboardBuilder()
    for c in categories:
        b.button(text=c["name"], callback_data=CategoryCb(id=c["id"]))
    b.adjust(2)
    return b.as_markup()


def products_kb(products: list[Row]) -> InlineKeyboardMarkup:
    b = InlineKeyboardBuilder()
    for p in products:
        b.button(text=f"{p['name']} — {money(p['price'])}", callback_data=ProductCb(id=p["id"]))
    b.button(text="⬅️ Kategoriyalar", callback_data="catalog")
    b.adjust(1)
    return b.as_markup()


def product_kb(product_id: int, category_id: int, qty: int) -> InlineKeyboardMarkup:
    b = InlineKeyboardBuilder()
    b.button(text="➖", callback_data=ProductCb(id=product_id, qty=max(1, qty - 1), upd=1))
    b.button(text=str(qty), callback_data="noop")
    b.button(text="➕", callback_data=ProductCb(id=product_id, qty=min(99, qty + 1), upd=1))
    b.button(text="🛒 Savatga qo'shish", callback_data=AddCb(id=product_id, qty=qty))
    b.button(text="⬅️ Orqaga", callback_data=CategoryCb(id=category_id))
    b.adjust(3, 1, 1)
    return b.as_markup()


def after_add_kb() -> InlineKeyboardMarkup:
    b = InlineKeyboardBuilder()
    b.button(text="🛒 Savatga o'tish", callback_data=CartCb(action="show"))
    b.button(text="🛍 Xaridni davom ettirish", callback_data="catalog")
    b.adjust(1)
    return b.as_markup()


def cart_kb(items: list[Row]) -> InlineKeyboardMarkup:
    b = InlineKeyboardBuilder()
    sizes = []
    for r in items:
        b.button(text="➖", callback_data=CartCb(action="dec", id=r["product_id"]))
        b.button(text=f"{r['name'][:20]} ({r['qty']})", callback_data=CartCb(action="del", id=r["product_id"]))
        b.button(text="➕", callback_data=CartCb(action="inc", id=r["product_id"]))
        sizes.append(3)
    b.button(text="✅ Buyurtma berish", callback_data=CartCb(action="checkout"))
    b.button(text="🗑 Savatni tozalash", callback_data=CartCb(action="clear"))
    b.button(text="🛍 Katalog", callback_data="catalog")
    sizes += [1, 1, 1]
    b.adjust(*sizes)
    return b.as_markup()


def order_status_kb(order_id: int) -> InlineKeyboardMarkup:
    b = InlineKeyboardBuilder()
    for key, label in ORDER_STATUSES.items():
        if key != "new":
            b.button(text=label, callback_data=OrderStatusCb(id=order_id, status=key))
    b.adjust(2)
    return b.as_markup()


def admin_kb() -> InlineKeyboardMarkup:
    b = InlineKeyboardBuilder()
    b.button(text="📊 Statistika", callback_data=AdminCb(action="stats"))
    b.button(text="🆕 Yangi buyurtmalar", callback_data=AdminCb(action="new_orders"))
    b.button(text="📋 Oxirgi buyurtmalar", callback_data=AdminCb(action="orders"))
    b.button(text="➕ Kategoriya qo'shish", callback_data=AdminCb(action="add_cat"))
    b.button(text="➕ Mahsulot qo'shish", callback_data=AdminCb(action="add_prod"))
    b.button(text="🗂 Mahsulotlarni boshqarish", callback_data=AdminCb(action="manage"))
    b.button(text="📣 Xabar yuborish (hammaga)", callback_data=AdminCb(action="broadcast"))
    b.adjust(1)
    return b.as_markup()


def admin_categories_kb(categories: list[Row], action: str) -> InlineKeyboardMarkup:
    b = InlineKeyboardBuilder()
    for c in categories:
        b.button(text=c["name"], callback_data=AdminCb(action=action, id=c["id"]))
    b.adjust(2)
    return b.as_markup()


def admin_products_kb(products: list[Row]) -> InlineKeyboardMarkup:
    b = InlineKeyboardBuilder()
    for p in products:
        b.button(text=f"{p['name']} — {money(p['price'])}", callback_data=AdminCb(action="prod", id=p["id"]))
    b.adjust(1)
    return b.as_markup()


def admin_product_kb(product_id: int) -> InlineKeyboardMarkup:
    b = InlineKeyboardBuilder()
    b.button(text="💲 Narxini o'zgartirish", callback_data=AdminCb(action="price", id=product_id))
    b.button(text="🗑 O'chirish", callback_data=AdminCb(action="del_prod", id=product_id))
    b.adjust(1)
    return b.as_markup()
