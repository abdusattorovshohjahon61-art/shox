"""Botni haqiqiy Telegramsiz, soxta sessiya orqali boshdan-oxir sinab ko'rish."""
import dataclasses
import datetime as dt
import itertools

import pytest
from aiogram import Bot
from aiogram.client.session.base import BaseSession
from aiogram.methods import EditMessageText, SendMessage, TelegramMethod
from aiogram.types import (
    CallbackQuery, Chat, Contact, Message, PreCheckoutQuery, SuccessfulPayment, Update, User,
)

from bot.config import Config
from bot.db import Database
from bot.keyboards import AddCb, AdminCb, CartCb, CategoryCb, LangCb, MyOrderCb, OrderStatusCb, ProductCb, RateCb
from bot.main import build_dispatcher
from bot.storage import SQLiteStorage

USER_ID, ADMIN_ID = 1001, 9009
_ids = itertools.count(1)


class FakeSession(BaseSession):
    def __init__(self):
        super().__init__()
        self.calls: list[TelegramMethod] = []

    async def make_request(self, bot, method, timeout=None):
        self.calls.append(method)
        if type(method).__name__.startswith(("Send", "Edit")) and type(method).__name__ != "EditMessageReplyMarkup":
            return Message(
                message_id=next(_ids), date=dt.datetime.now(),
                chat=Chat(id=getattr(method, "chat_id", None) or USER_ID, type="private"),
                text=getattr(method, "text", None),
            )
        return True

    async def stream_content(self, *a, **kw):  # pragma: no cover
        yield b""

    async def close(self):
        pass

    def texts(self, chat_id=None) -> list[str]:
        return [
            c.text for c in self.calls
            if isinstance(c, (SendMessage, EditMessageText)) and (chat_id is None or c.chat_id == chat_id)
        ]

    def last(self, chat_id=None) -> str:
        return self.texts(chat_id)[-1]

    def methods(self, name: str) -> list[TelegramMethod]:
        return [c for c in self.calls if type(c).__name__ == name]


CONFIG = Config(bot_token="42:TEST", admin_ids=frozenset({ADMIN_ID}), shop_name="Test Do'kon",
                shop_address="Chilonzor 1")
# Routerlar modul darajasida bo'lgani uchun dispetcher bir marta quriladi.
DP = build_dispatcher(Database(":memory:"), CONFIG)


@pytest.fixture
def env():
    db = Database(":memory:")
    db.seed_demo()
    DP["db"] = db
    DP["config"] = CONFIG
    DP.fsm.storage = SQLiteStorage(db)
    session = FakeSession()
    bot = Bot("42:TEST", session=session)
    yield db, bot, DP, session
    db.close()


def _user(uid):
    return User(id=uid, is_bot=False, first_name="Ali", last_name="Valiyev")


def _msg(uid, text=None, **kw):
    return Message(
        message_id=next(_ids), date=dt.datetime.now(), chat=Chat(id=uid, type="private"),
        from_user=_user(uid), text=text, **kw,
    )


async def send(dp, bot, uid, text=None, **kw):
    await dp.feed_update(bot, Update(update_id=next(_ids), message=_msg(uid, text, **kw)))


async def click(dp, bot, uid, data, text="x"):
    cq = CallbackQuery(
        id=str(next(_ids)), from_user=_user(uid), chat_instance="ci",
        data=data if isinstance(data, str) else data.pack(), message=_msg(uid, text),
    )
    await dp.feed_update(bot, Update(update_id=next(_ids), callback_query=cq))


async def register(dp, bot, uid, lang="uz"):
    await send(dp, bot, uid, "/start")
    await click(dp, bot, uid, LangCb(code=lang))


def first_product(db, name=None):
    for c in db.get_categories():
        for p in db.get_products(c["id"]):
            if name is None or p["name"] == name:
                return c, p
    raise LookupError(name)


async def checkout(dp, bot, s, *, delivery="🚚 Yetkazib berish", promo=None, payment=None):
    await click(dp, bot, USER_ID, CartCb(action="checkout"))
    await send(dp, bot, USER_ID, delivery)
    await send(dp, bot, USER_ID, "⏭ O'tkazib yuborish")  # ism -> Telegramdagi ism
    await send(dp, bot, USER_ID, contact=Contact(phone_number="998901234567", first_name="Ali"))
    if delivery.startswith("🚚"):
        await send(dp, bot, USER_ID, "Toshkent, Chilonzor 5-kvartal, 12-uy")
    await send(dp, bot, USER_ID, "3-qavat")
    await send(dp, bot, USER_ID, promo or "⏭ O'tkazib yuborish")
    if payment:
        await send(dp, bot, USER_ID, payment)
    assert "tasdiqlaysizmi" in s.last(USER_ID)
    await send(dp, bot, USER_ID, "✅ Tasdiqlash")


async def test_full_order_flow(env):
    db, bot, dp, s = env

    await send(dp, bot, USER_ID, "/start")
    assert "Tilni tanlang" in s.last()
    await click(dp, bot, USER_ID, LangCb(code="uz"))
    assert "xush kelibsiz" in s.methods("SendMessage")[-1].text

    await send(dp, bot, USER_ID, "🛍 Katalog")
    assert "Kategoriyani tanlang" in s.last()

    cat, prod = first_product(db, "Ko'k choy 100 g")  # 25 000, qoldiq cheklanmagan
    await click(dp, bot, USER_ID, CategoryCb(id=cat["id"]))
    await click(dp, bot, USER_ID, ProductCb(id=prod["id"]))
    assert "Ko'k choy" in s.last()

    await click(dp, bot, USER_ID, AddCb(id=prod["id"], qty=2))
    await click(dp, bot, USER_ID, CartCb(action="inc", id=prod["id"]))
    assert db.get_cart(USER_ID)[0]["qty"] == 3
    assert "bepul" in s.last()  # bepul yetkazishgacha qancha qolgani

    db.add_promo("YANGI10", 10)
    await click(dp, bot, USER_ID, CartCb(action="checkout"))
    await send(dp, bot, USER_ID, "🚚 Yetkazib berish")
    await send(dp, bot, USER_ID, "⏭ O'tkazib yuborish")
    await send(dp, bot, USER_ID, "12345")
    assert "noto'g'ri" in s.last()
    await send(dp, bot, USER_ID, contact=Contact(phone_number="998901234567", first_name="Ali"))
    await send(dp, bot, USER_ID, "Toshkent, Chilonzor 5-kvartal, 12-uy")
    await send(dp, bot, USER_ID, "3-qavat")
    await send(dp, bot, USER_ID, "NOTOGRI")
    assert "topilmadi" in s.last()
    await send(dp, bot, USER_ID, "yangi10")
    assert "tasdiqlaysizmi" in s.last()
    await send(dp, bot, USER_ID, "✅ Tasdiqlash")

    [order] = db.get_user_orders(USER_ID)
    assert order["full_name"] == "Ali Valiyev"
    assert order["phone"] == "+998901234567"
    assert (order["subtotal"], order["discount"], order["delivery_fee"], order["total"]) == (75_000, 7_500, 15_000, 82_500)
    assert order["promo_code"] == "YANGI10" and order["comment"] == "3-qavat"
    assert db.get_cart(USER_ID) == []
    assert any("YANGI BUYURTMA" in t for t in s.texts(ADMIN_ID))

    # Admin holatni o'zgartiradi -> mijozga xabar boradi
    await click(dp, bot, ADMIN_ID, OrderStatusCb(id=order["id"], status="accepted"))
    assert "Qabul qilindi" in s.last(USER_ID)
    # Yetkazildi -> mijozdan baho so'raladi
    await click(dp, bot, ADMIN_ID, OrderStatusCb(id=order["id"], status="done"))
    assert "baholang" in s.last(USER_ID)
    await click(dp, bot, USER_ID, RateCb(id=order["id"], stars=2))
    assert db.get_order(order["id"])["rating"] == 2
    assert "past baholandi" in s.last(ADMIN_ID)


async def test_russian_language(env):
    db, bot, dp, s = env
    await register(dp, bot, USER_ID, "ru")
    assert "Добро пожаловать" in s.methods("SendMessage")[-1].text
    await send(dp, bot, USER_ID, "🛍 Каталог")
    assert "Выберите категорию" in s.last()
    await send(dp, bot, USER_ID, "🛒 Корзина")
    assert "корзина пуста" in s.last()
    await send(dp, bot, USER_ID, "🌐 Til / Язык")
    await click(dp, bot, USER_ID, LangCb(code="uz"))
    await send(dp, bot, USER_ID, "🛒 Savat")
    assert "Savatingiz bo'sh" in s.last()


async def test_stock_limits_and_user_cancel(env):
    db, bot, dp, s = env
    await register(dp, bot, USER_ID)
    cat, p = first_product(db, "Simsiz quloqchin")
    db.update_product(p["id"], stock=2)

    await click(dp, bot, USER_ID, AddCb(id=p["id"], qty=3))
    assert db.get_cart(USER_ID) == []
    alert = s.methods("AnswerCallbackQuery")[-1]
    assert alert.show_alert and "2" in alert.text

    await click(dp, bot, USER_ID, AddCb(id=p["id"], qty=2))
    await checkout(dp, bot, s)
    [order] = db.get_user_orders(USER_ID)
    assert db.get_product(p["id"])["stock"] == 0
    assert any("kam qoldi" in t for t in s.texts(ADMIN_ID))

    await send(dp, bot, USER_ID, "📦 Buyurtmalarim")
    await click(dp, bot, USER_ID, MyOrderCb(action="cancel", id=order["id"]))
    assert db.get_order(order["id"])["status"] == "cancelled"
    assert db.get_product(p["id"])["stock"] == 2
    assert "bekor qildi" in s.last(ADMIN_ID)

    await click(dp, bot, USER_ID, MyOrderCb(action="repeat", id=order["id"]))
    assert db.get_cart(USER_ID)[0]["qty"] == 2


async def test_pickup_has_no_delivery_fee(env):
    db, bot, dp, s = env
    await register(dp, bot, USER_ID)
    _, p = first_product(db, "Ko'k choy 100 g")
    db.add_to_cart(USER_ID, p["id"])
    await checkout(dp, bot, s, delivery="🏃 Olib ketish")
    [order] = db.get_user_orders(USER_ID)
    assert (order["delivery_type"], order["delivery_fee"], order["total"]) == ("pickup", 0, 25_000)
    assert "Chilonzor 1" in order["address"]


async def test_min_order_blocks_checkout(env):
    db, bot, dp, s = env
    await register(dp, bot, USER_ID)
    _, p = first_product(db, "Ko'k choy 100 g")
    db.add_to_cart(USER_ID, p["id"])
    db.set_setting("min_order", 50_000)
    await click(dp, bot, USER_ID, CartCb(action="checkout"))
    assert "Minimal" in s.methods("AnswerCallbackQuery")[-1].text
    assert await dp.fsm.storage.get_state(
        dp.fsm.get_context(bot, USER_ID, USER_ID).key) is None


async def test_card_payment(env):
    db, bot, dp, s = env
    dp["config"] = dataclasses.replace(CONFIG, payment_token="TEST:PAY")
    await register(dp, bot, USER_ID)
    _, p = first_product(db, "Ko'k choy 100 g")
    db.add_to_cart(USER_ID, p["id"])
    await checkout(dp, bot, s, payment="💳 Karta (Click / Payme)")

    [order] = db.get_user_orders(USER_ID)
    [invoice] = s.methods("SendInvoice")
    assert invoice.payload == f"order:{order['id']}"
    assert invoice.prices[0].amount == order["total"] * 100

    pcq = PreCheckoutQuery(id="1", from_user=_user(USER_ID), currency="UZS",
                           total_amount=order["total"] * 100, invoice_payload=invoice.payload)
    await dp.feed_update(bot, Update(update_id=next(_ids), pre_checkout_query=pcq))
    assert s.methods("AnswerPreCheckoutQuery")[-1].ok

    bad = pcq.model_copy(update={"id": "2", "total_amount": 100})
    await dp.feed_update(bot, Update(update_id=next(_ids), pre_checkout_query=bad))
    assert not s.methods("AnswerPreCheckoutQuery")[-1].ok

    paid = SuccessfulPayment(currency="UZS", total_amount=order["total"] * 100, invoice_payload=invoice.payload,
                             telegram_payment_charge_id="t1", provider_payment_charge_id="p1")
    await send(dp, bot, USER_ID, successful_payment=paid)
    assert db.get_order(order["id"])["paid"] == 1
    assert "to'landi" in s.last(ADMIN_ID)


async def test_admin_panel(env):
    db, bot, dp, s = env
    await register(dp, bot, ADMIN_ID)

    await click(dp, bot, ADMIN_ID, AdminCb(action="add_cat"))
    await send(dp, bot, ADMIN_ID, "📚 Kitoblar")
    cat = next(c for c in db.get_categories() if c["name"] == "📚 Kitoblar")

    await click(dp, bot, ADMIN_ID, AdminCb(action="add_prod_cat", id=cat["id"]))
    await send(dp, bot, ADMIN_ID, "O'tkan kunlar")
    await send(dp, bot, ADMIN_ID, "45 000")
    await send(dp, bot, ADMIN_ID, "⏭ O'tkazib yuborish")
    await send(dp, bot, ADMIN_ID, "⏭ O'tkazib yuborish")
    await send(dp, bot, ADMIN_ID, "7")
    [p] = db.get_products(cat["id"])
    assert (p["name"], p["price"], p["photo_id"], p["stock"]) == ("O'tkan kunlar", 45_000, None, 7)

    await click(dp, bot, ADMIN_ID, AdminCb(action="edit", id=p["id"], key="price"))
    await send(dp, bot, ADMIN_ID, "50000")
    assert db.get_product(p["id"])["price"] == 50_000

    await click(dp, bot, ADMIN_ID, AdminCb(action="toggle", id=p["id"]))
    assert db.get_product(p["id"])["is_active"] == 0

    await click(dp, bot, ADMIN_ID, AdminCb(action="del_prod", id=p["id"]))
    assert db.get_product(p["id"]) is not None  # avval tasdiqlash so'raladi
    await click(dp, bot, ADMIN_ID, AdminCb(action="del_prod", id=p["id"], key="yes"))
    assert db.get_product(p["id"]) is None

    await click(dp, bot, ADMIN_ID, AdminCb(action="add_promo"))
    await send(dp, bot, ADMIN_ID, "bahor 15 100")
    promo = db.get_promo("BAHOR")
    assert (promo["percent"], promo["max_uses"]) == (15, 100)

    await click(dp, bot, ADMIN_ID, AdminCb(action="set", key="delivery_fee"))
    await send(dp, bot, ADMIN_ID, "20 000")
    assert db.get_setting("delivery_fee") == 20_000

    await click(dp, bot, ADMIN_ID, AdminCb(action="export"))
    [doc] = s.methods("SendDocument")
    assert doc.document.filename.endswith(".xlsx")

    await click(dp, bot, ADMIN_ID, AdminCb(action="stats"))
    assert "statistika" in s.last(ADMIN_ID).lower()


async def test_non_admin_cannot_use_admin(env):
    db, bot, dp, s = env
    await register(dp, bot, USER_ID)
    _, p = first_product(db)
    db.add_to_cart(USER_ID, p["id"])
    oid = db.create_order(USER_ID, "Ali", "+998901234567", "Toshkent")
    await click(dp, bot, USER_ID, OrderStatusCb(id=oid, status="done"))
    await click(dp, bot, USER_ID, AdminCb(action="del_prod", id=p["id"], key="yes"))
    await send(dp, bot, USER_ID, "/admin")
    assert db.get_order(oid)["status"] == "new"
    assert db.get_product(p["id"]) is not None
    assert not any("Admin panel" in (t or "") for t in s.texts(USER_ID))


async def test_free_text_search_and_question_to_admin(env):
    db, bot, dp, s = env
    await register(dp, bot, USER_ID)
    await send(dp, bot, USER_ID, "quloqchin")
    assert "topildi" in s.last(USER_ID)

    await send(dp, bot, USER_ID, "Yetkazib berish bormi?")
    assert "Mijozdan xabar" in s.last(ADMIN_ID)
    await send(dp, bot, ADMIN_ID, f"/reply {USER_ID} Ha, bor!")
    assert "Admin javobi" in s.last(USER_ID)
