from aiogram import F, Router
from aiogram.filters import CommandStart, StateFilter
from aiogram.fsm.context import FSMContext
from aiogram.fsm.state import State, StatesGroup
from aiogram.types import CallbackQuery, Message

from bot.config import Config
from bot.db import Database
from bot.handlers.common import notify_admins, show_screen
from bot.i18n import all_langs, t
from bot.keyboards import (
    AddCb,
    CategoryCb,
    LangCb,
    MyOrderCb,
    ProductCb,
    RateCb,
    after_add_kb,
    cancel_kb,
    categories_kb,
    lang_kb,
    main_menu,
    my_order_kb,
    product_kb,
    products_kb,
)
from bot.utils import escape, money, order_text

router = Router(name="user")


class SearchState(StatesGroup):
    query = State()


def _menu(user_id: int, config: Config, lang: str):
    return main_menu(lang, user_id in config.admin_ids)


@router.message(CommandStart())
async def start(message: Message, state: FSMContext, db: Database, config: Config, lang: str, lang_chosen: bool) -> None:
    await state.clear()
    user = message.from_user
    db.upsert_user(user.id, user.full_name, user.username)
    if not lang_chosen:
        await message.answer(t("choose_lang"), reply_markup=lang_kb())
        return
    await message.answer(
        t("welcome", lang, name=escape(user.first_name), shop=escape(config.shop_name)),
        reply_markup=_menu(user.id, config, lang),
    )


@router.message(F.text.in_(all_langs("btn_lang")))
async def change_lang(message: Message) -> None:
    await message.answer(t("choose_lang"), reply_markup=lang_kb())


@router.callback_query(LangCb.filter())
async def set_lang(callback: CallbackQuery, callback_data: LangCb, db: Database, config: Config) -> None:
    user = callback.from_user
    lang = callback_data.code
    db.upsert_user(user.id, user.full_name, user.username)
    db.set_user_lang(user.id, lang)
    await callback.message.delete()
    await callback.message.answer(
        t("welcome", lang, name=escape(user.first_name), shop=escape(config.shop_name)),
        reply_markup=_menu(user.id, config, lang),
    )
    await callback.answer(t("lang_changed", lang))


# --- Katalog ---

def _catalog(db: Database, lang: str) -> tuple[str, object]:
    categories = db.get_categories(only_with_products=True)
    if not categories:
        return t("no_products", lang), None
    return t("choose_category", lang), categories_kb(categories)


@router.message(F.text.in_(all_langs("btn_catalog")))
async def catalog(message: Message, db: Database, lang: str) -> None:
    text, kb = _catalog(db, lang)
    await message.answer(text, reply_markup=kb)


@router.callback_query(F.data == "catalog")
async def catalog_cb(callback: CallbackQuery, db: Database, lang: str) -> None:
    text, kb = _catalog(db, lang)
    await show_screen(callback, text, kb)
    await callback.answer()


@router.callback_query(CategoryCb.filter())
async def category(callback: CallbackQuery, callback_data: CategoryCb, db: Database, lang: str) -> None:
    cat = db.get_category(callback_data.id)
    products = db.get_products(callback_data.id)
    if not cat or not products:
        await callback.answer(t("category_empty", lang), show_alert=True)
        return
    await show_screen(
        callback,
        t("choose_product", lang, cat=escape(cat["name"])),
        products_kb(products, lang, category_id=cat["id"], page=callback_data.page),
    )
    await callback.answer()


def _available(p) -> bool:
    return p["stock"] is None or p["stock"] > 0


def _product_caption(p, lang: str) -> str:
    text = f"<b>{escape(p['name'])}</b>\n\n"
    if p["description"]:
        text += f"{escape(p['description'])}\n\n"
    text += t("price", lang, price=money(p["price"], lang))
    if p["stock"] is not None:
        text += "\n" + (t("in_stock", lang, n=p["stock"]) if p["stock"] > 0 else t("out_of_stock", lang))
    return text


@router.callback_query(ProductCb.filter())
async def product(callback: CallbackQuery, callback_data: ProductCb, db: Database, lang: str) -> None:
    p = db.get_product(callback_data.id)
    if not p or not p["is_active"]:
        await callback.answer(t("product_not_found", lang), show_alert=True)
        return
    qty = callback_data.qty
    if p["stock"] is not None and p["stock"] > 0:
        qty = min(qty, p["stock"])
    kb = product_kb(p["id"], p["category_id"], qty, lang, available=_available(p))

    if callback_data.upd:
        if qty != callback_data.qty:
            await callback.answer(t("not_enough_stock", lang, n=p["stock"]))
            return
        await callback.message.edit_reply_markup(reply_markup=kb)
        await callback.answer()
        return

    caption = _product_caption(p, lang)
    await callback.message.delete()
    if p["photo_id"]:
        await callback.message.answer_photo(p["photo_id"], caption=caption, reply_markup=kb)
    else:
        await callback.message.answer(caption, reply_markup=kb)
    await callback.answer()


@router.callback_query(AddCb.filter())
async def add_to_cart(callback: CallbackQuery, callback_data: AddCb, db: Database, lang: str) -> None:
    p = db.get_product(callback_data.id)
    if not p or not p["is_active"]:
        await callback.answer(t("product_not_found", lang), show_alert=True)
        return
    user_id = callback.from_user.id
    if p["stock"] is not None:
        in_cart = next((r["qty"] for r in db.get_cart(user_id) if r["product_id"] == p["id"]), 0)
        if in_cart + callback_data.qty > p["stock"]:
            await callback.answer(t("not_enough_stock", lang, n=p["stock"]), show_alert=True)
            return
    db.add_to_cart(user_id, p["id"], callback_data.qty)
    await callback.answer(t("added_alert", lang))
    await callback.message.answer(
        t("added", lang, name=escape(p["name"]), qty=callback_data.qty, total=money(db.cart_total(user_id), lang)),
        reply_markup=after_add_kb(lang),
    )


# --- Qidiruv ---

async def _send_search_results(message: Message, db: Database, query: str, lang: str) -> bool:
    found = db.search_products(query)
    if not found:
        return False
    await message.answer(
        t("search_found", lang, q=escape(query), n=len(found)), reply_markup=products_kb(found, lang)
    )
    return True


@router.message(F.text.in_(all_langs("btn_search")))
async def search_start(message: Message, state: FSMContext, lang: str) -> None:
    await state.set_state(SearchState.query)
    await message.answer(t("search_prompt", lang), reply_markup=cancel_kb(lang))


@router.message(SearchState.query, F.text)
async def search_query(message: Message, state: FSMContext, db: Database, config: Config, lang: str) -> None:
    await state.clear()
    if not await _send_search_results(message, db, message.text, lang):
        await message.answer(t("search_none", lang))
    await message.answer(t("main_menu", lang), reply_markup=_menu(message.from_user.id, config, lang))


# --- Buyurtmalarim ---

@router.message(F.text.in_(all_langs("btn_orders")))
async def my_orders(message: Message, db: Database, config: Config, lang: str) -> None:
    orders = db.get_user_orders(message.from_user.id, limit=5)
    if not orders:
        await message.answer(t("no_orders", lang))
        return
    for o in reversed(orders):
        await message.answer(
            order_text(o, db.get_order_items(o["id"]), lang),
            reply_markup=my_order_kb(o, lang, can_pay=bool(config.payment_token)),
        )


@router.callback_query(MyOrderCb.filter(F.action.in_({"cancel", "repeat"})))
async def my_order_action(callback: CallbackQuery, callback_data: MyOrderCb, db: Database, config: Config, lang: str) -> None:
    order = db.get_order(callback_data.id)
    if not order or order["user_id"] != callback.from_user.id:
        await callback.answer()
        return

    if callback_data.action == "repeat":
        added = db.refill_cart_from_order(callback.from_user.id, order["id"])
        await callback.answer(t("repeat_done" if added else "repeat_none", lang), show_alert=not added)
        return

    if order["status"] != "new":
        await callback.answer(t("cannot_cancel", lang), show_alert=True)
        return
    db.set_order_status(order["id"], "cancelled")
    order = db.get_order(order["id"])
    await callback.message.edit_text(
        order_text(order, db.get_order_items(order["id"]), lang),
        reply_markup=my_order_kb(order, lang, can_pay=False),
    )
    await callback.answer(t("order_cancelled_by_user", lang, id=order["id"]))
    note = "\n💳 Buyurtma to'langan edi — pulni qaytarishni unutmang!" if order["paid"] else ""
    await notify_admins(callback.bot, config, f"❌ Mijoz buyurtma <b>#{order['id']}</b> ni bekor qildi.{note}")


@router.callback_query(RateCb.filter())
async def rate(callback: CallbackQuery, callback_data: RateCb, db: Database, config: Config, lang: str) -> None:
    order = db.get_order(callback_data.id)
    if not order or order["user_id"] != callback.from_user.id:
        await callback.answer()
        return
    db.set_order_rating(order["id"], callback_data.stars)
    await callback.message.edit_text(t("rate_thanks", lang) + "\n" + "⭐️" * callback_data.stars)
    await callback.answer()
    if callback_data.stars <= 3:
        await notify_admins(
            callback.bot, config,
            f"⚠️ Buyurtma <b>#{order['id']}</b> past baholandi: {'⭐️' * callback_data.stars}\n"
            f"👤 {escape(order['full_name'])}, 📞 {escape(order['phone'])}",
        )


# --- Ma'lumot ---

@router.message(F.text.in_(all_langs("btn_contact")))
async def contact(message: Message, config: Config, lang: str) -> None:
    await message.answer(
        t(
            "contact", lang,
            phone=escape(config.shop_phone or "—"),
            address=escape(config.shop_address or "—"),
            hours=escape(config.shop_hours or "—"),
        )
    )


@router.message(F.text.in_(all_langs("btn_about")))
async def about(message: Message, config: Config, db: Database, lang: str) -> None:
    await message.answer(t("about", lang, shop=escape(config.shop_name), n=db.count_products()))


# --- Boshqa matnlar: avval mahsulot qidiramiz, topilmasa adminlarga yuboramiz ---

@router.message(StateFilter(None), F.text)
async def fallback(message: Message, db: Database, config: Config, lang: str) -> None:
    if message.text.startswith("/"):
        await message.answer(t("unknown_command", lang))
        return
    if await _send_search_results(message, db, message.text, lang):
        return
    user = message.from_user
    if user.id in config.admin_ids:
        await message.answer(t("search_none", lang))
        return
    await notify_admins(
        message.bot, config,
        f"💬 <b>Mijozdan xabar</b>\n"
        f"👤 {escape(user.full_name)} (<code>{user.id}</code>)\n\n"
        f"{escape(message.text)}\n\n"
        f"Javob berish uchun: <code>/reply {user.id} matn</code>",
    )
    await message.answer(t("message_to_admin_sent", lang))
