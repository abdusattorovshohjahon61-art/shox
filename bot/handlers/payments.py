"""Click / Payme orqali to'lov (Telegram Payments)."""
import logging
from sqlite3 import Row

from aiogram import Bot, F, Router
from aiogram.types import CallbackQuery, LabeledPrice, Message, PreCheckoutQuery

from bot.config import Config
from bot.db import Database
from bot.handlers.common import notify_admins
from bot.i18n import t
from bot.keyboards import MyOrderCb
from bot.utils import money

router = Router(name="payments")
log = logging.getLogger(__name__)

CURRENCY = "UZS"


def _payload(order_id: int) -> str:
    return f"order:{order_id}"


def _order_id(payload: str) -> int | None:
    prefix, _, value = payload.partition(":")
    return int(value) if prefix == "order" and value.isdigit() else None


async def send_invoice(bot: Bot, chat_id: int, order: Row, config: Config, lang: str) -> None:
    await bot.send_invoice(
        chat_id=chat_id,
        title=t("invoice_title", lang, id=order["id"]),
        description=t("invoice_desc", lang, shop=config.shop_name),
        payload=_payload(order["id"]),
        provider_token=config.payment_token,
        currency=CURRENCY,
        # Telegram summani eng kichik birlikda (tiyin) qabul qiladi
        prices=[LabeledPrice(label=t("invoice_title", lang, id=order["id"]), amount=order["total"] * 100)],
    )


@router.callback_query(MyOrderCb.filter(F.action == "pay"))
async def pay_again(callback: CallbackQuery, callback_data: MyOrderCb, db: Database, config: Config, lang: str) -> None:
    order = db.get_order(callback_data.id)
    if not order or order["user_id"] != callback.from_user.id or order["status"] == "cancelled":
        await callback.answer()
        return
    if order["paid"]:
        await callback.answer(t("already_paid", lang), show_alert=True)
        return
    if not config.payment_token:
        await callback.answer(t("payment_unavailable", lang), show_alert=True)
        return
    await callback.answer()
    await send_invoice(callback.bot, callback.message.chat.id, order, config, lang)


@router.pre_checkout_query()
async def pre_checkout(query: PreCheckoutQuery, db: Database, lang: str) -> None:
    order_id = _order_id(query.invoice_payload)
    order = db.get_order(order_id) if order_id else None
    if not order or order["status"] == "cancelled":
        await query.answer(ok=False, error_message=t("product_not_found", lang))
    elif order["paid"]:
        await query.answer(ok=False, error_message=t("already_paid", lang))
    elif query.total_amount != order["total"] * 100 or query.currency != CURRENCY:
        await query.answer(ok=False, error_message="Amount mismatch")
    else:
        await query.answer(ok=True)


@router.message(F.successful_payment)
async def successful_payment(message: Message, db: Database, config: Config, lang: str) -> None:
    payment = message.successful_payment
    order_id = _order_id(payment.invoice_payload)
    if order_id is None:
        log.error("Noma'lum to'lov payload: %s", payment.invoice_payload)
        return
    db.set_order_paid(order_id)
    await message.answer(t("payment_ok", lang, id=order_id))
    await notify_admins(
        message.bot, config,
        f"💳 Buyurtma <b>#{order_id}</b> to'landi: {money(payment.total_amount // 100)}\n"
        f"ID: <code>{payment.provider_payment_charge_id}</code>",
    )
