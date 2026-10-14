import asyncio
import logging
import re

from aiogram import F, Router
from aiogram.exceptions import TelegramAPIError
from aiogram.filters import Command, CommandObject, Filter
from aiogram.fsm.context import FSMContext
from aiogram.fsm.state import State, StatesGroup
from aiogram.types import BufferedInputFile, CallbackQuery, Message, TelegramObject

from bot.config import Config
from bot.db import DEFAULT_SETTINGS, ORDER_STATUSES, Database
from bot.i18n import DEFAULT_LANG, all_langs, status_name, t
from bot.keyboards import (
    ADMIN_PANEL_BTN,
    EDIT_FIELDS,
    SETTING_LABELS,
    AdminCb,
    OrderStatusCb,
    admin_categories_kb,
    admin_kb,
    admin_product_kb,
    admin_products_kb,
    cancel_kb,
    confirm_delete_kb,
    main_menu,
    order_status_kb,
    promos_kb,
    rate_kb,
    settings_kb,
    skip_cancel_kb,
)
from bot.reports import build_excel, stats_text
from bot.utils import escape, money, order_text, parse_int

log = logging.getLogger(__name__)
SKIP = all_langs("btn_skip")


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
    stock = State()


class EditProduct(StatesGroup):
    value = State()


class EditSetting(StatesGroup):
    value = State()


class AddPromo(StatesGroup):
    value = State()


class Broadcast(StatesGroup):
    text = State()


async def _done(message: Message, text: str) -> None:
    await message.answer(text, reply_markup=main_menu(DEFAULT_LANG, is_admin=True))
    await message.answer("⚙️ <b>Admin panel</b>", reply_markup=admin_kb())


@router.message(Command("admin"))
@router.message(F.text == ADMIN_PANEL_BTN)
async def panel(message: Message, state: FSMContext) -> None:
    await state.clear()
    await message.answer("⚙️ <b>Admin panel</b>", reply_markup=admin_kb())


@router.callback_query(AdminCb.filter(F.action == "noop"))
async def admin_noop(callback: CallbackQuery) -> None:
    await callback.message.delete()
    await callback.answer("Bekor qilindi")


@router.callback_query(AdminCb.filter(F.action == "stats"))
async def stats(callback: CallbackQuery, db: Database) -> None:
    await callback.message.answer(stats_text(db, "Umumiy statistika"))
    await callback.answer()


@router.callback_query(AdminCb.filter(F.action == "export"))
async def export(callback: CallbackQuery, db: Database, config: Config) -> None:
    await callback.answer("Tayyorlanmoqda...")
    data = build_excel(db)
    name = f"hisobot_{config.now():%Y-%m-%d_%H%M}.xlsx"
    await callback.message.answer_document(
        BufferedInputFile(data, filename=name),
        caption="📥 Buyurtmalar, mahsulotlar va mijozlar ro'yxati",
    )


# --- Buyurtmalar ---

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
    await callback.answer(f"Holat: {status_name(callback_data.status)}")

    customer = db.get_user(order["user_id"])
    lang = (customer["lang"] if customer else None) or DEFAULT_LANG
    try:
        await callback.bot.send_message(
            order["user_id"],
            t("status_changed", lang, id=order["id"], status=status_name(callback_data.status, lang)),
        )
        if callback_data.status == "done" and not order["rating"]:
            await callback.bot.send_message(
                order["user_id"], t("rate_request", lang, id=order["id"]), reply_markup=rate_kb(order["id"])
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
    name = message.text.strip()[:60]
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
    await state.set_data({"category_id": callback_data.id})
    await callback.message.answer("Mahsulot nomini yozing:", reply_markup=cancel_kb())
    await callback.answer()


@router.message(AddProduct.name, F.text)
async def add_prod_name(message: Message, state: FSMContext) -> None:
    await state.update_data(name=message.text.strip()[:100])
    await state.set_state(AddProduct.price)
    await message.answer("Narxini yozing (so'mda, masalan: 125000):")


@router.message(AddProduct.price, F.text)
async def add_prod_price(message: Message, state: FSMContext) -> None:
    price = parse_int(message.text)
    if price is None:
        await message.answer("Narx faqat raqamlardan iborat bo'lsin. Masalan: 125000")
        return
    await state.update_data(price=price)
    await state.set_state(AddProduct.description)
    await message.answer("Tavsif yozing:", reply_markup=skip_cancel_kb())


@router.message(AddProduct.description, F.text)
async def add_prod_desc(message: Message, state: FSMContext) -> None:
    await state.update_data(description="" if message.text in SKIP else message.text.strip()[:900])
    await state.set_state(AddProduct.photo)
    await message.answer("Mahsulot rasmini yuboring:", reply_markup=skip_cancel_kb())


@router.message(AddProduct.photo, F.photo | F.text.in_(SKIP))
async def add_prod_photo(message: Message, state: FSMContext) -> None:
    await state.update_data(photo_id=message.photo[-1].file_id if message.photo else None)
    await state.set_state(AddProduct.stock)
    await message.answer(
        "Omborda nechta bor? Son yozing.\nCheklanmagan bo'lsa «⏭ O'tkazib yuborish» ni bosing.",
        reply_markup=skip_cancel_kb(),
    )


@router.message(AddProduct.photo)
async def add_prod_photo_invalid(message: Message) -> None:
    await message.answer("Rasm yuboring yoki «⏭ O'tkazib yuborish» ni bosing.")


@router.message(AddProduct.stock, F.text)
async def add_prod_stock(message: Message, state: FSMContext, db: Database) -> None:
    stock = None
    if message.text not in SKIP:
        stock = parse_int(message.text)
        if stock is None:
            await message.answer("Son yozing (masalan: 20) yoki o'tkazib yuboring:")
            return
    data = await state.get_data()
    db.add_product(data["category_id"], data["name"], data["price"], data["description"], data["photo_id"], stock)
    await state.clear()
    await _done(message, f"✅ «{escape(data['name'])}» — {money(data['price'])} qo'shildi.")


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
    products = db.get_products(callback_data.id, include_hidden=True)
    await callback.answer()
    text = "Mahsulotni tanlang:" if products else "Bu kategoriyada mahsulot yo'q."
    await callback.message.answer(text, reply_markup=admin_products_kb(products, callback_data.id))


def _admin_product_text(p) -> str:
    stock = "cheklanmagan" if p["stock"] is None else f"{p['stock']} dona"
    return (
        f"<b>{escape(p['name'])}</b>\n"
        f"💲 {money(p['price'])}\n"
        f"📦 Qoldiq: {stock}\n"
        f"{'👁 Sotuvda' if p['is_active'] else '🙈 Yashirin'}\n\n"
        f"{escape(p['description'])}"
    )


async def _send_admin_product(message: Message, p) -> None:
    if p["photo_id"]:
        await message.answer_photo(p["photo_id"], caption=_admin_product_text(p), reply_markup=admin_product_kb(p))
    else:
        await message.answer(_admin_product_text(p), reply_markup=admin_product_kb(p))


@router.callback_query(AdminCb.filter(F.action == "prod"))
async def manage_prod(callback: CallbackQuery, callback_data: AdminCb, db: Database) -> None:
    p = db.get_product(callback_data.id)
    await callback.answer()
    if p:
        await _send_admin_product(callback.message, p)


@router.callback_query(AdminCb.filter(F.action == "toggle"))
async def toggle_prod(callback: CallbackQuery, callback_data: AdminCb, db: Database) -> None:
    p = db.get_product(callback_data.id)
    if not p:
        await callback.answer()
        return
    db.update_product(p["id"], is_active=0 if p["is_active"] else 1)
    p = db.get_product(p["id"])
    await callback.message.edit_reply_markup(reply_markup=admin_product_kb(p))
    await callback.answer("👁 Sotuvga qaytarildi" if p["is_active"] else "🙈 Yashirildi")


@router.callback_query(AdminCb.filter(F.action.in_({"del_prod", "del_cat"})))
async def delete_item(callback: CallbackQuery, callback_data: AdminCb, db: Database) -> None:
    is_cat = callback_data.action == "del_cat"
    if callback_data.key != "yes":
        what = "kategoriya va undagi BARCHA mahsulotlar" if is_cat else "mahsulot"
        await callback.message.answer(
            f"Rostdan ham {what} o'chirilsinmi?",
            reply_markup=confirm_delete_kb(callback_data.action, callback_data.id),
        )
        await callback.answer()
        return
    if is_cat:
        db.delete_category(callback_data.id)
    else:
        db.delete_product(callback_data.id)
    await callback.message.edit_text("🗑 O'chirildi.")
    await callback.answer()


@router.callback_query(AdminCb.filter(F.action == "edit"))
async def edit_start(callback: CallbackQuery, callback_data: AdminCb, state: FSMContext) -> None:
    field = callback_data.key
    if field not in EDIT_FIELDS:
        await callback.answer()
        return
    await state.set_state(EditProduct.value)
    await state.set_data({"product_id": callback_data.id, "field": field})
    prompts = {
        "name": "Yangi nomni yozing:",
        "price": "Yangi narxni yozing (so'mda):",
        "description": "Yangi tavsifni yozing:",
        "photo_id": "Yangi rasmni yuboring:",
        "stock": "Ombordagi yangi sonni yozing. Cheklanmagan qilish uchun «⏭ O'tkazib yuborish»:",
    }
    kb = skip_cancel_kb() if field == "stock" else cancel_kb()
    await callback.message.answer(prompts[field], reply_markup=kb)
    await callback.answer()


@router.message(EditProduct.value)
async def edit_value(message: Message, state: FSMContext, db: Database) -> None:
    data = await state.get_data()
    field, text = data["field"], message.text or ""
    if field == "photo_id":
        if not message.photo:
            await message.answer("Rasm yuboring:")
            return
        value = message.photo[-1].file_id
    elif field == "stock" and text in SKIP:
        value = None
    elif field in ("price", "stock"):
        value = parse_int(text)
        if value is None:
            await message.answer("Faqat son yozing:")
            return
    else:
        value = text.strip()[:900 if field == "description" else 100]
        if not value:
            await message.answer("Matn yozing:")
            return
    db.update_product(data["product_id"], **{field: value})
    await state.clear()
    await message.answer("✅ Saqlandi.", reply_markup=main_menu(DEFAULT_LANG, is_admin=True))
    p = db.get_product(data["product_id"])
    if p:
        await _send_admin_product(message, p)


@router.callback_query(AdminCb.filter(F.action == "low_stock"))
async def low_stock(callback: CallbackQuery, db: Database) -> None:
    await callback.answer()
    items = db.low_stock_products()
    if not items:
        await callback.message.answer("✅ Hamma mahsulot yetarli.")
        return
    lines = [f"• {escape(p['name'])} — {p['stock']} dona" for p in items]
    await callback.message.answer("📉 <b>Omborda kam qolganlar:</b>\n" + "\n".join(lines))


# --- Sozlamalar ---

def _settings(db: Database) -> dict[str, int]:
    return {k: db.get_setting(k) for k in DEFAULT_SETTINGS}


@router.callback_query(AdminCb.filter(F.action == "settings"))
async def settings(callback: CallbackQuery, db: Database) -> None:
    await callback.answer()
    await callback.message.answer(
        "⚙️ <b>Sozlamalar</b>\nO'zgartirish uchun bosing.\n"
        "<i>Bepul yetkazish: 0 — hech qachon bepul emas.</i>",
        reply_markup=settings_kb(_settings(db)),
    )


@router.callback_query(AdminCb.filter(F.action == "set"))
async def setting_start(callback: CallbackQuery, callback_data: AdminCb, state: FSMContext) -> None:
    if callback_data.key not in DEFAULT_SETTINGS:
        await callback.answer()
        return
    await state.set_state(EditSetting.value)
    await state.set_data({"key": callback_data.key})
    await callback.message.answer(f"{SETTING_LABELS[callback_data.key]} — yangi qiymatni yozing:", reply_markup=cancel_kb())
    await callback.answer()


@router.message(EditSetting.value, F.text)
async def setting_value(message: Message, state: FSMContext, db: Database) -> None:
    value = parse_int(message.text)
    if value is None:
        await message.answer("Faqat son yozing:")
        return
    key = (await state.get_data())["key"]
    db.set_setting(key, value)
    await state.clear()
    await message.answer("✅ Saqlandi.", reply_markup=main_menu(DEFAULT_LANG, is_admin=True))
    await message.answer("⚙️ <b>Sozlamalar</b>", reply_markup=settings_kb(_settings(db)))


# --- Promokodlar ---

@router.callback_query(AdminCb.filter(F.action == "promos"))
async def promos(callback: CallbackQuery, db: Database) -> None:
    await callback.answer()
    await callback.message.answer(
        "🎟 <b>Promokodlar</b>\nO'chirish uchun promokodni bosing.", reply_markup=promos_kb(db.get_promos())
    )


@router.callback_query(AdminCb.filter(F.action == "del_promo"))
async def del_promo(callback: CallbackQuery, callback_data: AdminCb, db: Database) -> None:
    db.delete_promo(callback_data.key)
    await callback.message.edit_reply_markup(reply_markup=promos_kb(db.get_promos()))
    await callback.answer(f"🗑 {callback_data.key} o'chirildi")


@router.callback_query(AdminCb.filter(F.action == "add_promo"))
async def add_promo_start(callback: CallbackQuery, state: FSMContext) -> None:
    await state.set_state(AddPromo.value)
    await callback.message.answer(
        "Promokodni quyidagi formatda yozing:\n"
        "<code>KOD FOIZ [LIMIT]</code>\n\n"
        "Masalan:\n<code>YANGI10 10</code> — 10% chegirma, cheklanmagan\n"
        "<code>BAHOR 15 100</code> — 15% chegirma, 100 marta ishlatiladi",
        reply_markup=cancel_kb(),
    )
    await callback.answer()


@router.message(AddPromo.value, F.text)
async def add_promo_value(message: Message, state: FSMContext, db: Database) -> None:
    m = re.fullmatch(r"([A-Za-z0-9_-]{3,20})\s+(\d{1,3})(?:\s+(\d+))?", message.text.strip())
    if not m or not 1 <= int(m.group(2)) <= 100:
        await message.answer("Format noto'g'ri. Masalan: <code>YANGI10 10</code> (kod 3-20 lotin harf/raqam, foiz 1-100)")
        return
    code, percent = m.group(1).upper(), int(m.group(2))
    max_uses = int(m.group(3)) if m.group(3) else None
    db.add_promo(code, percent, max_uses)
    await state.clear()
    await _done(message, f"✅ Promokod <code>{code}</code> qo'shildi: −{percent}%")


# --- Hammaga xabar ---

@router.callback_query(AdminCb.filter(F.action == "broadcast"))
async def broadcast_start(callback: CallbackQuery, state: FSMContext) -> None:
    await state.set_state(Broadcast.text)
    await callback.message.answer(
        "Barcha foydalanuvchilarga yuboriladigan xabarni yozing (matn, rasm yoki video):",
        reply_markup=cancel_kb(),
    )
    await callback.answer()


@router.message(Broadcast.text)
async def broadcast_send(message: Message, state: FSMContext, db: Database) -> None:
    await state.clear()
    user_ids = db.all_user_ids()
    await message.answer(f"📣 {len(user_ids)} ta foydalanuvchiga yuborilmoqda...")
    sent = failed = 0
    for user_id in user_ids:
        try:
            await message.copy_to(user_id)
            sent += 1
        except TelegramAPIError:
            failed += 1
        await asyncio.sleep(0.05)  # Telegram limitlari (~30 xabar/soniya)
    await _done(message, f"📣 Yuborildi: {sent} ta, yuborilmadi (botni bloklagan): {failed} ta.")


# --- Mijozga javob: /reply <user_id> <matn> ---

@router.message(Command("reply"))
async def reply_to_user(message: Message, command: CommandObject, db: Database) -> None:
    parts = (command.args or "").split(maxsplit=1)
    if len(parts) != 2 or not parts[0].isdigit():
        await message.answer("Foydalanish: <code>/reply 123456789 Javob matni</code>")
        return
    user = db.get_user(int(parts[0]))
    lang = (user["lang"] if user else None) or DEFAULT_LANG
    try:
        await message.bot.send_message(int(parts[0]), t("admin_reply", lang, text=escape(parts[1])))
        await message.answer("✅ Yuborildi.")
    except TelegramAPIError as e:
        await message.answer(f"❌ Yuborilmadi: {escape(str(e))}")
