
from aiogram import F, Router
from aiogram.filters import CommandStart, StateFilter
from aiogram.fsm.context import FSMContext
from aiogram.fsm.state import State, StatesGroup
from aiogram.types import CallbackQuery, Message

from bot.config import Config
from bot.db import Database
from bot.handlers.common import show_screen
from bot.keyboards import (
    BTN_ABOUT,
    BTN_CATALOG,
    BTN_CONTACT,
    BTN_ORDERS,
    BTN_SEARCH,
    AddCb,
    CategoryCb,
    ProductCb,
    after_add_kb,
    cancel_kb,
    categories_kb,
    main_menu,
    product_kb,
    products_kb,
)
from bot.utils import escape, money, order_text

router = Router(name="user")


class SearchState(StatesGroup):
    query = State()


@router.message(CommandStart())
async def start(message: Message, state: FSMContext, db: Database, config: Config) -> None:
    await state.clear()
    user = message.from_user
    db.upsert_user(user.id, user.full_name, user.username)
    await message.answer(
        f"Assalomu alaykum, <b>{escape(user.first_name)}</b>! 👋\n\n"
        f"<b>{escape(config.shop_name)}</b> botiga xush kelibsiz.\n"
        "Bu yerda mahsulotlarni ko'rib, savatga qo'shib, buyurtma berishingiz mumkin.\n\n"
        "Quyidagi menyudan tanlang 👇",
        reply_markup=main_menu(user.id in config.admin_ids),
    )


# --- Katalog ---

def _catalog_text(db: Database) -> tuple[str, object]:
    categories = db.get_categories(only_with_products=True)
    if not categories:
        return "Hozircha mahsulotlar yo'q. Tez orada qo'shiladi! 🙂", None
    return "🛍 <b>Kategoriyani tanlang:</b>", categories_kb(categories)


@router.message(F.text == BTN_CATALOG)
async def catalog(message: Message, db: Database) -> None:
    text, kb = _catalog_text(db)
    await message.answer(text, reply_markup=kb)


@router.callback_query(F.data == "catalog")
async def catalog_cb(callback: CallbackQuery, db: Database) -> None:
    text, kb = _catalog_text(db)
    await show_screen(callback, text, kb)
    await callback.answer()


@router.callback_query(CategoryCb.filter())
async def category(callback: CallbackQuery, callback_data: CategoryCb, db: Database) -> None:
    cat = db.get_category(callback_data.id)
    products = db.get_products(callback_data.id)
    if not cat or not products:
        await callback.answer("Bu kategoriyada mahsulot yo'q", show_alert=True)
        return
    await show_screen(callback, f"<b>{escape(cat['name'])}</b>\n\nMahsulotni tanlang:", products_kb(products))
    await callback.answer()


def _product_caption(p) -> str:
    text = f"<b>{escape(p['name'])}</b>\n\n"
    if p["description"]:
        text += f"{escape(p['description'])}\n\n"
    text += f"💰 Narxi: <b>{money(p['price'])}</b>"
    return text


@router.callback_query(ProductCb.filter())
async def product(callback: CallbackQuery, callback_data: ProductCb, db: Database) -> None:
    p = db.get_product(callback_data.id)
    if not p or not p["is_active"]:
        await callback.answer("Mahsulot topilmadi", show_alert=True)
        return
    kb = product_kb(p["id"], p["category_id"], callback_data.qty)

    if callback_data.upd:
        await callback.message.edit_reply_markup(reply_markup=kb)
        await callback.answer()
        return

    caption = _product_caption(p)
    await callback.message.delete()
    if p["photo_id"]:
        await callback.message.answer_photo(p["photo_id"], caption=caption, reply_markup=kb)
    else:
        await callback.message.answer(caption, reply_markup=kb)
    await callback.answer()


@router.callback_query(AddCb.filter())
async def add_to_cart(callback: CallbackQuery, callback_data: AddCb, db: Database) -> None:
    p = db.get_product(callback_data.id)
    if not p or not p["is_active"]:
        await callback.answer("Mahsulot topilmadi", show_alert=True)
        return
    db.add_to_cart(callback.from_user.id, p["id"], callback_data.qty)
    await callback.answer(f"✅ {p['name']} ({callback_data.qty} dona) savatga qo'shildi")
    await callback.message.answer(
        f"✅ <b>{escape(p['name'])}</b> — {callback_data.qty} dona savatga qo'shildi.\n"
        f"Savatdagi jami summa: <b>{money(db.cart_total(callback.from_user.id))}</b>",
        reply_markup=after_add_kb(),
    )


# --- Qidiruv ---

async def _send_search_results(message: Message, db: Database, query: str) -> bool:
    found = db.search_products(query)
    if not found:
        return False
    await message.answer(
        f"🔍 «{escape(query)}» bo'yicha topildi: {len(found)} ta",
        reply_markup=products_kb(found),
    )
    return True


@router.message(F.text == BTN_SEARCH)
async def search_start(message: Message, state: FSMContext) -> None:
    await state.set_state(SearchState.query)
    await message.answer("Mahsulot nomini yozing:", reply_markup=cancel_kb())


@router.message(SearchState.query, F.text)
async def search_query(message: Message, state: FSMContext, db: Database, config: Config) -> None:
    await state.clear()
    if not await _send_search_results(message, db, message.text):
        await message.answer("Hech narsa topilmadi 😕")
    await message.answer("Asosiy menyu:", reply_markup=main_menu(message.from_user.id in config.admin_ids))


# --- Buyurtmalar tarixi ---

@router.message(F.text == BTN_ORDERS)
async def my_orders(message: Message, db: Database) -> None:
    orders = db.get_user_orders(message.from_user.id)
    if not orders:
        await message.answer("Sizda hali buyurtmalar yo'q.")
        return
    for o in orders[:5]:
        await message.answer(order_text(o, db.get_order_items(o["id"])))


# --- Ma'lumot ---

@router.message(F.text == BTN_CONTACT)
async def contact(message: Message, config: Config) -> None:
    await message.answer(
        "☎️ <b>Biz bilan bog'lanish</b>\n\n"
        f"📞 Telefon: {escape(config.shop_phone or '—')}\n"
        f"📍 Manzil: {escape(config.shop_address or '—')}\n"
        f"🕘 Ish vaqti: {escape(config.shop_hours or '—')}\n\n"
        "Savolingiz bo'lsa, shu yerga yozib qoldiring — admin javob beradi."
    )


@router.message(F.text == BTN_ABOUT)
async def about(message: Message, config: Config, db: Database) -> None:
    await message.answer(
        f"ℹ️ <b>{escape(config.shop_name)}</b>\n\n"
        "Sifatli mahsulotlar, qulay narxlar va tez yetkazib berish.\n"
        f"Hozirda katalogda {db.count_products()} ta mahsulot bor.\n\n"
        "Buyurtma berish uchun «🛍 Katalog» bo'limiga o'ting."
    )


# --- Boshqa matnlar: avval mahsulot qidiramiz, topilmasa adminlarga yuboramiz ---

@router.message(StateFilter(None), F.text)
async def fallback(message: Message, db: Database, config: Config) -> None:
    if message.text.startswith("/"):
        await message.answer("Noma'lum buyruq. /start ni bosing.")
        return
    if await _send_search_results(message, db, message.text):
        return
    user = message.from_user
    for admin_id in config.admin_ids:
        try:
            await message.bot.send_message(
                admin_id,
                f"💬 <b>Mijozdan xabar</b>\n"
                f"👤 {escape(user.full_name)} (<code>{user.id}</code>)\n\n"
                f"{escape(message.text)}\n\n"
                f"Javob berish uchun: <code>/reply {user.id} matn</code>",
            )
        except Exception:
            pass
    await message.answer(
        "Xabaringiz qabul qilindi ✅ Admin tez orada javob beradi.\n"
        "Mahsulotlarni ko'rish uchun «🛍 Katalog» tugmasini bosing."
    )
