import logging

from aiogram import Bot, F, Router
from aiogram.fsm.context import FSMContext
from aiogram.fsm.state import State, StatesGroup
from aiogram.types import CallbackQuery, Message, ReplyKeyboardRemove

from bot.config import Config
from bot.db import Database, OutOfStock
from bot.handlers.common import notify_admins
from bot.handlers.payments import send_invoice
from bot.i18n import all_langs, t
from bot.keyboards import (
    CartCb,
    confirm_kb,
    delivery_type_kb,
    location_kb,
    main_menu,
    order_status_kb,
    payment_kb,
    phone_kb,
    skip_cancel_kb,
)
from bot.utils import escape, money, normalize_phone, order_text, price_lines

router = Router(name="order")
log = logging.getLogger(__name__)

SKIP = all_langs("btn_skip")


class Checkout(StatesGroup):
    delivery_type = State()
    name = State()
    phone = State()
    address = State()
    comment = State()
    promo = State()
    payment = State()
    confirm = State()


@router.callback_query(CartCb.filter(F.action == "checkout"))
async def checkout_start(callback: CallbackQuery, state: FSMContext, db: Database, config: Config, lang: str) -> None:
    subtotal = db.cart_total(callback.from_user.id)
    if not subtotal:
        await callback.answer(t("cart_empty_short", lang), show_alert=True)
        return
    min_order = db.get_setting("min_order")
    if subtotal < min_order:
        await callback.answer(t("min_order", lang, sum=money(min_order, lang)), show_alert=True)
        return
    await callback.answer()
    await state.set_data({"default_name": callback.from_user.full_name})
    if config.pickup_enabled:
        await state.set_state(Checkout.delivery_type)
        await callback.message.answer(t("ask_delivery_type", lang), reply_markup=delivery_type_kb(lang))
    else:
        await state.update_data(delivery_type="delivery")
        await _ask_name(callback.message, state, lang)


@router.message(Checkout.delivery_type, F.text)
async def checkout_delivery_type(message: Message, state: FSMContext, lang: str) -> None:
    if message.text in all_langs("btn_delivery"):
        await state.update_data(delivery_type="delivery")
    elif message.text in all_langs("btn_pickup"):
        await state.update_data(delivery_type="pickup")
    else:
        await message.answer(t("use_buttons", lang))
        return
    await _ask_name(message, state, lang)


async def _ask_name(message: Message, state: FSMContext, lang: str) -> None:
    await state.set_state(Checkout.name)
    await message.answer(t("ask_name", lang), reply_markup=skip_cancel_kb(lang))


@router.message(Checkout.name, F.text)
async def checkout_name(message: Message, state: FSMContext, db: Database, lang: str) -> None:
    data = await state.get_data()
    name = data.get("default_name") if message.text in SKIP else message.text.strip()
    if not name or len(name) > 64:
        await message.answer(t("bad_name", lang))
        return
    await state.update_data(name=name)
    await state.set_state(Checkout.phone)
    user = db.get_user(message.from_user.id)
    await message.answer(t("ask_phone", lang), reply_markup=phone_kb(lang, user["phone"] if user else None))


@router.message(Checkout.phone, F.contact | F.text)
async def checkout_phone(message: Message, state: FSMContext, db: Database, config: Config, lang: str) -> None:
    raw = message.contact.phone_number if message.contact else message.text
    phone = normalize_phone(raw)
    if not phone:
        await message.answer(t("bad_phone", lang))
        return
    db.set_user_phone(message.from_user.id, phone)
    await state.update_data(phone=phone)
    data = await state.get_data()
    if data["delivery_type"] == "pickup":
        await state.update_data(
            address=t("pickup_address", "uz", address=config.shop_address or "—"),
            latitude=None, longitude=None,
        )
        await _ask_comment(message, state, lang)
        return
    await state.set_state(Checkout.address)
    await message.answer(t("ask_address", lang), reply_markup=location_kb(lang))


@router.message(Checkout.address, F.location)
async def checkout_location(message: Message, state: FSMContext, lang: str) -> None:
    loc = message.location
    await state.update_data(
        address=t("location_address", "uz", lat=f"{loc.latitude:.5f}", lon=f"{loc.longitude:.5f}"),
        latitude=loc.latitude,
        longitude=loc.longitude,
    )
    await _ask_comment(message, state, lang)


@router.message(Checkout.address, F.text)
async def checkout_address(message: Message, state: FSMContext, lang: str) -> None:
    address = message.text.strip()
    if len(address) < 5:
        await message.answer(t("bad_address", lang))
        return
    await state.update_data(address=address[:300], latitude=None, longitude=None)
    await _ask_comment(message, state, lang)


async def _ask_comment(message: Message, state: FSMContext, lang: str) -> None:
    await state.set_state(Checkout.comment)
    await message.answer(t("ask_comment", lang), reply_markup=skip_cancel_kb(lang))


@router.message(Checkout.comment, F.text)
async def checkout_comment(message: Message, state: FSMContext, lang: str) -> None:
    await state.update_data(comment="" if message.text in SKIP else message.text.strip()[:500])
    await state.set_state(Checkout.promo)
    await message.answer(t("ask_promo", lang), reply_markup=skip_cancel_kb(lang))


@router.message(Checkout.promo, F.text)
async def checkout_promo(message: Message, state: FSMContext, db: Database, config: Config, lang: str) -> None:
    if message.text in SKIP:
        await state.update_data(promo=None)
    else:
        promo = db.get_promo(message.text)
        if not promo:
            await message.answer(t("promo_bad", lang))
            return
        await state.update_data(promo=promo["code"])
        await message.answer(t("promo_ok", lang, percent=promo["percent"]))

    if config.payment_token:
        await state.set_state(Checkout.payment)
        await message.answer(t("ask_payment", lang), reply_markup=payment_kb(lang))
    else:
        await state.update_data(payment="cash")
        await _show_summary(message, state, db, config, lang)


@router.message(Checkout.payment, F.text)
async def checkout_payment(message: Message, state: FSMContext, db: Database, config: Config, lang: str) -> None:
    if message.text in all_langs("btn_cash"):
        await state.update_data(payment="cash")
    elif message.text in all_langs("btn_card"):
        await state.update_data(payment="card")
    else:
        await message.answer(t("use_buttons", lang))
        return
    await _show_summary(message, state, db, config, lang)


async def _show_summary(message: Message, state: FSMContext, db: Database, config: Config, lang: str) -> None:
    data = await state.get_data()
    items = db.get_cart(message.from_user.id)
    if not items:
        await state.clear()
        await message.answer(t("cart_empty_short", lang), reply_markup=ReplyKeyboardRemove())
        return
    await state.set_state(Checkout.confirm)
    q = db.quote(message.from_user.id, data["delivery_type"], data.get("promo"))
    lines = [t("cart_title", lang)]
    for r in items:
        lines.append(f"• {escape(r['name'])} — {r['qty']} x {money(r['price'], lang)}")
    lines.append("")
    lines += price_lines(q, lang, delivery=data["delivery_type"] == "delivery")
    lines += [
        "",
        t("btn_pickup" if data["delivery_type"] == "pickup" else "btn_delivery", lang),
        t("order_payment", lang, method=t("btn_card" if data["payment"] == "card" else "btn_cash", lang)),
        f"👤 {escape(data['name'])}",
        f"📞 {escape(data['phone'])}",
        f"📍 {escape(data['address'])}",
    ]
    if data.get("comment"):
        lines.append(f"💬 {escape(data['comment'])}")
    if not config.is_open():
        lines += ["", t("shop_closed_note", lang, hours=escape(config.shop_hours or "—"))]
    lines += ["", t("confirm_question", lang)]
    await message.answer("\n".join(lines), reply_markup=confirm_kb(lang))


@router.message(Checkout.confirm, F.text.in_(all_langs("btn_confirm")))
async def checkout_confirm(message: Message, state: FSMContext, db: Database, config: Config, lang: str) -> None:
    data = await state.get_data()
    menu = main_menu(lang, message.from_user.id in config.admin_ids)

    try:
        order_id = db.create_order(
            user_id=message.from_user.id,
            full_name=data["name"],
            phone=data["phone"],
            address=data["address"],
            latitude=data.get("latitude"),
            longitude=data.get("longitude"),
            comment=data.get("comment", ""),
            delivery_type=data["delivery_type"],
            payment_method=data["payment"],
            promo_code=data.get("promo"),
        )
    except OutOfStock as e:
        await state.clear()
        items = "\n".join(f"• {escape(name)} — {t('in_stock', lang, n=max(n, 0))}" for name, n in e.items)
        await message.answer(t("out_of_stock_order", lang, items=items), reply_markup=menu)
        return
    await state.clear()
    if order_id is None:
        await message.answer(t("cart_empty_short", lang), reply_markup=menu)
        return

    order = db.get_order(order_id)
    if order["payment_method"] == "card":
        await message.answer(t("order_created_pay", lang, id=order_id), reply_markup=menu)
        await send_invoice(message.bot, message.chat.id, order, config, lang)
    else:
        await message.answer(t("order_created", lang, id=order_id), reply_markup=menu)

    await notify_new_order(message.bot, db, config, order_id)


async def notify_new_order(bot: Bot, db: Database, config: Config, order_id: int) -> None:
    order = db.get_order(order_id)
    text = "🔔 <b>YANGI BUYURTMA</b>\n\n" + order_text(order, db.get_order_items(order_id), "uz", for_admin=True)
    await notify_admins(bot, config, text, reply_markup=order_status_kb(order_id))
    if order["latitude"] is not None:
        for admin_id in config.admin_ids:
            try:
                await bot.send_location(admin_id, order["latitude"], order["longitude"])
            except Exception:
                log.warning("Adminga (%s) lokatsiya yuborilmadi", admin_id)

    ordered_ids = {i["product_id"] for i in db.get_order_items(order_id)}
    low = [p for p in db.low_stock_products() if p["id"] in ordered_ids]
    if low:
        lines = [f"• {escape(p['name'])} — {p['stock']} dona" for p in low]
        await notify_admins(bot, config, "📉 <b>Omborda kam qoldi:</b>\n" + "\n".join(lines))


@router.message(Checkout.confirm)
async def checkout_confirm_other(message: Message, lang: str) -> None:
    await message.answer(t("press_confirm", lang))
