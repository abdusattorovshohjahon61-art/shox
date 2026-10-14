from aiogram import F, Router
from aiogram.types import CallbackQuery, Message

from bot.db import Database
from bot.handlers.common import show_screen
from bot.i18n import all_langs, t
from bot.keyboards import CartCb, cart_kb
from bot.utils import cart_text, money

router = Router(name="cart")


def _cart_screen(db: Database, user_id: int, lang: str) -> tuple[str, object]:
    items = db.get_cart(user_id)
    if not items:
        return t("cart_empty", lang), None
    text = cart_text(items, lang)
    subtotal = sum(r["subtotal"] for r in items)
    free_from = db.get_setting("free_delivery_from")
    if free_from and subtotal < free_from:
        text += "\n" + t("free_delivery_hint", lang, sum=money(free_from - subtotal, lang))
    min_order = db.get_setting("min_order")
    if subtotal < min_order:
        text += "\n" + t("min_order", lang, sum=money(min_order, lang))
    return text, cart_kb(items, lang)


@router.message(F.text.in_(all_langs("btn_cart")))
async def show_cart(message: Message, db: Database, lang: str) -> None:
    text, kb = _cart_screen(db, message.from_user.id, lang)
    await message.answer(text, reply_markup=kb)


@router.callback_query(CartCb.filter(F.action.in_({"show", "inc", "dec", "del", "clear"})))
async def cart_action(callback: CallbackQuery, callback_data: CartCb, db: Database, lang: str) -> None:
    user_id = callback.from_user.id
    action, pid = callback_data.action, callback_data.id

    if action == "clear":
        db.clear_cart(user_id)
    elif action in {"inc", "dec", "del"}:
        current = {r["product_id"]: r for r in db.get_cart(user_id)}
        if pid in current:
            row = current[pid]
            new_qty = {"inc": row["qty"] + 1, "dec": row["qty"] - 1, "del": 0}[action]
            if action == "inc" and row["stock"] is not None and new_qty > row["stock"]:
                await callback.answer(t("not_enough_stock", lang, n=row["stock"]), show_alert=True)
                return
            db.set_cart_qty(user_id, pid, new_qty)

    text, kb = _cart_screen(db, user_id, lang)
    await show_screen(callback, text, kb)
    await callback.answer()
