from aiogram import F, Router
from aiogram.types import CallbackQuery, Message

from bot.db import Database
from bot.handlers.common import show_screen
from bot.keyboards import BTN_CART, CartCb, cart_kb
from bot.utils import cart_text

router = Router(name="cart")

EMPTY = "🛒 Savatingiz bo'sh.\n«🛍 Katalog» orqali mahsulot tanlang."


@router.message(F.text == BTN_CART)
async def show_cart(message: Message, db: Database) -> None:
    items = db.get_cart(message.from_user.id)
    if not items:
        await message.answer(EMPTY)
        return
    await message.answer(cart_text(items), reply_markup=cart_kb(items))


@router.callback_query(CartCb.filter(F.action.in_({"show", "inc", "dec", "del", "clear"})))
async def cart_action(callback: CallbackQuery, callback_data: CartCb, db: Database) -> None:
    user_id = callback.from_user.id
    action, pid = callback_data.action, callback_data.id

    if action == "clear":
        db.clear_cart(user_id)
    elif action in {"inc", "dec", "del"}:
        current = {r["product_id"]: r["qty"] for r in db.get_cart(user_id)}
        if pid in current:
            new_qty = {"inc": current[pid] + 1, "dec": current[pid] - 1, "del": 0}[action]
            db.set_cart_qty(user_id, pid, new_qty)

    items = db.get_cart(user_id)
    if items:
        await show_screen(callback, cart_text(items), cart_kb(items))
    else:
        await show_screen(callback, EMPTY)
    await callback.answer()
