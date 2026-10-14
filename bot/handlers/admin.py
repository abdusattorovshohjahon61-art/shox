import asyncio
import logging

from aiogram import F, Router
from aiogram.exceptions import TelegramAPIError
from aiogram.filters import Command, CommandObject, Filter
from aiogram.fsm.context import FSMContext
from aiogram.fsm.state import State, StatesGroup
from aiogram.types import CallbackQuery, Message, TelegramObject

from bot.config import Config
from bot.db import ORDER_STATUSES, Database
from bot.keyboards import (
    BTN_SKIP,
    AdminCb,
    OrderStatusCb,
    admin_categories_kb,
    admin_kb,
    admin_product_kb,
    admin_products_kb,
    cancel_kb,
    main_menu,
    order_status_kb,
    skip_cancel_kb,
)
from bot.utils import escape, money, order_text

log = logging.getLogger(__name__)


class IsAdmin(Filter):
    async def __call__(self, event: TelegramObject, config: Config) -> bool:
        return event.from_user is not None and event.from_user.id in config.admin_ids


router = Router(name="admin")
router.message.filter(IsAdmin())
router.callback_query.filter(IsAdmin())


class AddCategory(StatesGroup):
    name = State()


class AddProduct(StatesGroup):
    name = State()
    price = State()
    description = State()
    photo = State()


class EditPrice(StatesGroup):
    price = State()


class Broadcast(StatesGroup):
    text = State()


def _parse_price(text: str) -> int | None:
    digits = text.replace(" ", "").replace(",", "").replace("so'm", "")
    return int(digits) if digits.isdigit() else None


async def _done(message: Message, text: str) -> None:
    await message.answer(text, reply_markup=main_menu(is_admin=True))
    await message.answer("⚙️ Admin panel", reply_markup=admin_kb())


@router.message(Command("admin"))
@router.message(F.text == "⚙️ Admin panel")
async def panel(message: Message, state: FSMContext) -> None:
    await state.clear()
    await message.answer("⚙️ <b>Admin panel</b>", reply_markup=admin_kb())


@router.callback_query(AdminCb.filter(F.action == "stats"))
async def stats(callback: CallbackQuery, db: Database) -> None:
    s = db.stats()
    await callback.message.answer(
        "📊 <b>Statistika</b>\n\n"
        f"👥 Foydalanuvchilar: {s['users']}\n"
        f"🧾 Jami buyurtmalar: {s['orders']}\n"
        f"🆕 Yangi (ko'rilmagan): {s['new_orders']}\n"
        f"📅 Bugungi buyurtmalar: {s['today_orders']}\n"
        f"💰 Yetkazilganlar summasi: {money(s['revenue'])}"
    )
    await callback.answer()


@router.callback_query(AdminCb.filter(F.action.in_({"orders", "new_orders"})))
async def list_orders(callback: CallbackQuery, callback_data: AdminCb, db: Database) -> None:
    status = "new" if callback_data.action == "new_orders" else None
    orders = db.get_orders(status=status, limit=10)
    await callback.answer()
    if not orders:
        await callback.message.answer("Buyurtmalar yo'q.")
        return
    for o in reversed(orders):
        await callback.message.answer(
            order_text(o, db.get_order_items(o["id"]), for_admin=True),
            reply_markup=order_status_kb(o["id"]),
        )


@router.callback_query(OrderStatusCb.filter())
async def change_status(callback: CallbackQuery, callback_data: OrderStatusCb, db: Database) -> None:
    order = db.get_order(callback_data.id)
    if not order or callback_data.status not in ORDER_STATUSES:
        await callback.answer("Buyurtma topilmadi", show_alert=True)
        return
    if order["status"] == callback_data.status:
        await callback.answer("Holat o'zgarmadi")
        return
    db.set_order_status(order["id"], callback_data.status)
    order = db.get_order(order["id"])
    await callback.message.edit_text(
        order_text(order, db.get_order_items(order["id"]), for_admin=True),
        reply_markup=order_status_kb(order["id"]),
    )
    label = ORDER_STATUSES[callback_data.status]
    await callback.answer(f"Holat: {label}")
    try:
        await callback.bot.send_message(
            order["user_id"], f"🔔 Buyurtmangiz <b>#{order['id']}</b> holati o'zgardi: {label}"
        )
    except TelegramAPIError:
        log.warning("Mijozga (%s) xabar yuborilmadi", order["user_id"])


# --- Kategoriya qo'shish ---

@router.callback_query(AdminCb.filter(F.action == "add_cat"))
async def add_cat_start(callback: CallbackQuery, state: FSMContext) -> None:
    await state.set_state(AddCategory.name)
    await callback.message.answer("Yangi kategoriya nomini yozing (masalan: 📱 Telefonlar):", reply_markup=cancel_kb())
    await callback.answer()


@router.message(AddCategory.name, F.text)
async def add_cat_name(message: Message, state: FSMContext, db: Database) -> None:
    name = message.text.strip()
    if any(c["name"] == name for c in db.get_categories()):
        await message.answer("Bunday kategoriya allaqachon bor. Boshqa nom yozing:")
        return
    db.add_category(name)
    await state.clear()
    await _done(message, f"✅ «{escape(name)}» kategoriyasi qo'shildi.")


# --- Mahsulot qo'shish ---

@router.callback_query(AdminCb.filter(F.action == "add_prod"))
async def add_prod_start(callback: CallbackQuery, db: Database) -> None:
    categories = db.get_categories()
    await callback.answer()
    if not categories:
        await callback.message.answer("Avval kategoriya qo'shing.")
        return
    await callback.message.answer(
        "Mahsulot qaysi kategoriyaga qo'shiladi?",
        reply_markup=admin_categories_kb(categories, "add_prod_cat"),
    )


@router.callback_query(AdminCb.filter(F.action == "add_prod_cat"))
async def add_prod_cat(callback: CallbackQuery, callback_data: AdminCb, state: FSMContext) -> None:
    await state.set_state(AddProduct.name)
    await state.update_data(category_id=callback_data.id)
    await callback.message.answer("Mahsulot nomini yozing:", reply_markup=cancel_kb())
    await callback.answer()


@router.message(AddProduct.name, F.text)
async def add_prod_name(message: Message, state: FSMContext) -> None:
    await state.update_data(name=message.text.strip()[:100])
    await state.set_state(AddProduct.price)
    await message.answer("Narxini yozing (so'mda, masalan: 125000):")


@router.message(AddProduct.price, F.text)
async def add_prod_price(message: Message, state: FSMContext) -> None:
    price = _parse_price(message.text)
    if price is None:
        await message.answer("Narx faqat raqamlardan iborat bo'lsin. Masalan: 125000")
        return
    await state.update_data(price=price)
    await state.set_state(AddProduct.description)
    await message.answer("Tavsif yozing:", reply_markup=skip_cancel_kb())


@router.message(AddProduct.description, F.text)
async def add_prod_desc(message: Message, state: FSMContext) -> None:
    await state.update_data(description="" if message.text == BTN_SKIP else message.text.strip()[:900])
    await state.set_state(AddProduct.photo)
    await message.answer("Mahsulot rasmini yuboring:", reply_markup=skip_cancel_kb())


@router.message(AddProduct.photo, F.photo | (F.text == BTN_SKIP))
async def add_prod_photo(message: Message, state: FSMContext, db: Database) -> None:
    data = await state.get_data()
    photo_id = message.photo[-1].file_id if message.photo else None
    db.add_product(data["category_id"], data["name"], data["price"], data["description"], photo_id)
    await state.clear()
    await _done(message, f"✅ «{escape(data['name'])}» — {money(data['price'])} qo'shildi.")


@router.message(AddProduct.photo)
async def add_prod_photo_invalid(message: Message) -> None:
    await message.answer("Rasm yuboring yoki «⏭ O'tkazib yuborish» ni bosing.")


# --- Mahsulotlarni boshqarish ---

@router.callback_query(AdminCb.filter(F.action == "manage"))
async def manage(callback: CallbackQuery, db: Database) -> None:
    categories = db.get_categories()
    await callback.answer()
    if not categories:
        await callback.message.answer("Kategoriyalar yo'q.")
        return
    await callback.message.answer("Kategoriyani tanlang:", reply_markup=admin_categories_kb(categories, "manage_cat"))


@router.callback_query(AdminCb.filter(F.action == "manage_cat"))
async def manage_cat(callback: CallbackQuery, callback_data: AdminCb, db: Database) -> None:
    products = db.get_products(callback_data.id)
    await callback.answer()
    if not products:
        await callback.message.answer("Bu kategoriyada mahsulot yo'q.")
        return
    await callback.message.answer("Mahsulotni tanlang:", reply_markup=admin_products_kb(products))


@router.callback_query(AdminCb.filter(F.action == "prod"))
async def manage_prod(callback: CallbackQuery, callback_data: AdminCb, db: Database) -> None:
    p = db.get_product(callback_data.id)
    await callback.answer()
    if not p:
        return
    await callback.message.answer(
        f"<b>{escape(p['name'])}</b>\n{money(p['price'])}", reply_markup=admin_product_kb(p["id"])
    )


@router.callback_query(AdminCb.filter(F.action == "del_prod"))
async def delete_prod(callback: CallbackQuery, callback_data: AdminCb, db: Database) -> None:
    db.deactivate_product(callback_data.id)
    await callback.message.edit_text("🗑 Mahsulot o'chirildi.")
    await callback.answer()


@router.callback_query(AdminCb.filter(F.action == "price"))
async def price_start(callback: CallbackQuery, callback_data: AdminCb, state: FSMContext) -> None:
    await state.set_state(EditPrice.price)
    await state.update_data(product_id=callback_data.id)
    await callback.message.answer("Yangi narxni yozing:", reply_markup=cancel_kb())
    await callback.answer()


@router.message(EditPrice.price, F.text)
async def price_set(message: Message, state: FSMContext, db: Database) -> None:
    price = _parse_price(message.text)
    if price is None:
        await message.answer("Narx faqat raqamlardan iborat bo'lsin:")
        return
    data = await state.get_data()
    db.update_product_price(data["product_id"], price)
    await state.clear()
    await _done(message, f"✅ Narx yangilandi: {money(price)}")


# --- Hammaga xabar ---

@router.callback_query(AdminCb.filter(F.action == "broadcast"))
async def broadcast_start(callback: CallbackQuery, state: FSMContext) -> None:
    await state.set_state(Broadcast.text)
    await callback.message.answer(
        "Barcha foydalanuvchilarga yuboriladigan xabarni yozing (matn yoki rasm):",
        reply_markup=cancel_kb(),
    )
    await callback.answer()


@router.message(Broadcast.text)
async def broadcast_send(message: Message, state: FSMContext, db: Database) -> None:
    await state.clear()
    sent = failed = 0
    for user_id in db.all_user_ids():
        try:
            await message.copy_to(user_id)
            sent += 1
        except TelegramAPIError:
            failed += 1
        await asyncio.sleep(0.05)  # Telegram limitlari (~30 xabar/soniya)
    await _done(message, f"📣 Yuborildi: {sent} ta, yuborilmadi: {failed} ta.")


# --- Mijozga javob: /reply <user_id> <matn> ---

@router.message(Command("reply"))
async def reply_to_user(message: Message, command: CommandObject) -> None:
    parts = (command.args or "").split(maxsplit=1)
    if len(parts) != 2 or not parts[0].isdigit():
        await message.answer("Foydalanish: <code>/reply 123456789 Javob matni</code>")
        return
    try:
        await message.bot.send_message(int(parts[0]), f"📩 <b>Admin javobi:</b>\n\n{escape(parts[1])}")
        await message.answer("✅ Yuborildi.")
    except TelegramAPIError as e:
        await message.answer(f"❌ Yuborilmadi: {escape(str(e))}")
