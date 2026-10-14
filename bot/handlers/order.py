import logging

from aiogram import F, Router
from aiogram.fsm.context import FSMContext
from aiogram.fsm.state import State, StatesGroup
from aiogram.types import CallbackQuery, Message, ReplyKeyboardRemove

from bot.config import Config
from bot.db import Database
from bot.keyboards import (
    BTN_SKIP,
    CartCb,
    confirm_kb,
    location_kb,
    main_menu,
    order_status_kb,
    phone_kb,
    skip_cancel_kb,
)
from bot.utils import cart_text, escape, normalize_phone, order_text

router = Router(name="order")
log = logging.getLogger(__name__)


class Checkout(StatesGroup):
    name = State()
    phone = State()
    address = State()
    comment = State()
    confirm = State()


@router.callback_query(CartCb.filter(F.action == "checkout"))
async def checkout_start(callback: CallbackQuery, state: FSMContext, db: Database) -> None:
    if not db.get_cart(callback.from_user.id):
        await callback.answer("Savat bo'sh", show_alert=True)
        return
    await callback.answer()
    await state.set_state(Checkout.name)
    await state.update_data(default_name=callback.from_user.full_name)
    await callback.message.answer(
        "📝 Buyurtmani rasmiylashtiramiz.\n\n"
        f"Ismingizni kiriting yoki «{BTN_SKIP}» ni bosing (Telegramdagi ismingiz olinadi):",
        reply_markup=skip_cancel_kb(),
    )


@router.message(Checkout.name, F.text)
async def checkout_name(message: Message, state: FSMContext, db: Database) -> None:
    data = await state.get_data()
    name = data.get("default_name") if message.text == BTN_SKIP else message.text.strip()
    if not name or len(name) > 64:
        await message.answer("Iltimos, ismingizni to'g'ri kiriting:")
        return
    await state.update_data(name=name)
    await state.set_state(Checkout.phone)
    user = db.get_user(message.from_user.id)
    await message.answer(
        "📞 Telefon raqamingizni yuboring yoki yozing (masalan: +998901234567):",
        reply_markup=phone_kb(user["phone"] if user else None),
    )


@router.message(Checkout.phone, F.contact | F.text)
async def checkout_phone(message: Message, state: FSMContext, db: Database) -> None:
    raw = message.contact.phone_number if message.contact else message.text
    phone = normalize_phone(raw)
    if not phone:
        await message.answer("❗ Raqam noto'g'ri. Namuna: +998901234567")
        return
    db.set_user_phone(message.from_user.id, phone)
    await state.update_data(phone=phone)
    await state.set_state(Checkout.address)
    await message.answer(
        "📍 Yetkazib berish manzilini yozing yoki joylashuvni yuboring:",
        reply_markup=location_kb(),
    )


@router.message(Checkout.address, F.location)
async def checkout_location(message: Message, state: FSMContext) -> None:
    loc = message.location
    await state.update_data(
        address=f"Lokatsiya: {loc.latitude:.5f}, {loc.longitude:.5f}",
        latitude=loc.latitude,
        longitude=loc.longitude,
    )
    await _ask_comment(message, state)


@router.message(Checkout.address, F.text)
async def checkout_address(message: Message, state: FSMContext) -> None:
    address = message.text.strip()
    if len(address) < 5:
        await message.answer("Manzilni batafsilroq yozing:")
        return
    await state.update_data(address=address, latitude=None, longitude=None)
    await _ask_comment(message, state)


async def _ask_comment(message: Message, state: FSMContext) -> None:
    await state.set_state(Checkout.comment)
    await message.answer(
        "💬 Izoh qoldirasizmi? (masalan: qo'ng'iroq qilib keling, 3-qavat)",
        reply_markup=skip_cancel_kb(),
    )


@router.message(Checkout.comment, F.text)
async def checkout_comment(message: Message, state: FSMContext, db: Database) -> None:
    comment = "" if message.text == BTN_SKIP else message.text.strip()[:500]
    await state.update_data(comment=comment)
    data = await state.get_data()
    items = db.get_cart(message.from_user.id)
    if not items:
        await state.clear()
        await message.answer("Savat bo'sh.", reply_markup=ReplyKeyboardRemove())
        return
    await state.set_state(Checkout.confirm)
    summary = (
        f"{cart_text(items)}\n\n"
        f"👤 {escape(data['name'])}\n"
        f"📞 {escape(data['phone'])}\n"
        f"📍 {escape(data['address'])}"
    )
    if comment:
        summary += f"\n💬 {escape(comment)}"
    summary += "\n\nBuyurtmani tasdiqlaysizmi?"
    await message.answer(summary, reply_markup=confirm_kb())


@router.message(Checkout.confirm, F.text == "✅ Tasdiqlash")
async def checkout_confirm(message: Message, state: FSMContext, db: Database, config: Config) -> None:
    data = await state.get_data()
    await state.clear()
    is_admin = message.from_user.id in config.admin_ids

    order_id = db.create_order(
        user_id=message.from_user.id,
        full_name=data["name"],
        phone=data["phone"],
        address=data["address"],
        latitude=data.get("latitude"),
        longitude=data.get("longitude"),
        comment=data.get("comment", ""),
    )
    if order_id is None:
        await message.answer("Savat bo'sh, buyurtma yaratilmadi.", reply_markup=main_menu(is_admin))
        return

    await message.answer(
        f"🎉 Rahmat! Buyurtmangiz <b>#{order_id}</b> qabul qilindi.\n"
        "Tez orada operatorimiz siz bilan bog'lanadi.",
        reply_markup=main_menu(is_admin),
    )

    order = db.get_order(order_id)
    text = order_text(order, db.get_order_items(order_id), for_admin=True)
    for admin_id in config.admin_ids:
        try:
            await message.bot.send_message(admin_id, text, reply_markup=order_status_kb(order_id))
            if order["latitude"] is not None:
                await message.bot.send_location(admin_id, order["latitude"], order["longitude"])
        except Exception:
            log.exception("Adminga (%s) buyurtma yuborilmadi", admin_id)


@router.message(Checkout.confirm)
async def checkout_confirm_other(message: Message) -> None:
    await message.answer("Tasdiqlash uchun «✅ Tasdiqlash», bekor qilish uchun «❌ Bekor qilish» ni bosing.")
