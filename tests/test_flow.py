"""Botni haqiqiy Telegramsiz, soxta sessiya orqali boshdan-oxir sinab ko'rish."""
import datetime as dt
import itertools

import pytest
from aiogram import Bot
from aiogram.client.session.base import BaseSession
from aiogram.fsm.storage.memory import MemoryStorage
from aiogram.methods import SendLocation, SendMessage, SendPhoto, EditMessageText
from aiogram.types import CallbackQuery, Chat, Contact, Message, Update, User

from bot.config import Config
from bot.db import Database
from bot.keyboards import AddCb, CartCb, CategoryCb, OrderStatusCb, ProductCb
from bot.main import build_dispatcher

USER_ID, ADMIN_ID = 1001, 9009
_ids = itertools.count(1)


class FakeSession(BaseSession):
    def __init__(self):
        super().__init__()
        self.calls = []

    async def make_request(self, bot, method, timeout=None):
        self.calls.append(method)
        if isinstance(method, (SendMessage, SendPhoto, SendLocation, EditMessageText)):
            return Message(
                message_id=next(_ids),
                date=dt.datetime.now(),
                chat=Chat(id=method.chat_id or USER_ID, type="private"),
                text=getattr(method, "text", None),
            )
        return True

    async def stream_content(self, *a, **kw):  # pragma: no cover
        yield b""

    async def close(self):
        pass

    def sent_texts(self, chat_id=None):
        return [
            c.text for c in self.calls
            if isinstance(c, (SendMessage, EditMessageText)) and (chat_id is None or c.chat_id == chat_id)
        ]


CONFIG = Config(bot_token="42:TEST", admin_ids=frozenset({ADMIN_ID}), shop_name="Test Do'kon")
# Routerlar modul darajasida bo'lgani uchun dispetcher bir marta quriladi.
DP = build_dispatcher(Database(":memory:"), CONFIG)


@pytest.fixture
def env():
    db = Database(":memory:")
    db.seed_demo()
    DP["db"] = db
    DP.fsm.storage = MemoryStorage()
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
    ).as_(None)


async def send(dp, bot, uid, text=None, **kw):
    await dp.feed_update(bot, Update(update_id=next(_ids), message=_msg(uid, text, **kw)))


async def click(dp, bot, uid, data, text="x"):
    cq = CallbackQuery(
        id=str(next(_ids)), from_user=_user(uid), chat_instance="ci", data=data,
        message=_msg(uid, text),
    )
    await dp.feed_update(bot, Update(update_id=next(_ids), callback_query=cq))


async def test_full_order_flow(env):
    db, bot, dp, s = env

    await send(dp, bot, USER_ID, "/start")
    assert "xush kelibsiz" in s.sent_texts()[-1]
    assert db.get_user(USER_ID) is not None

    await send(dp, bot, USER_ID, "🛍 Katalog")
    assert "Kategoriyani tanlang" in s.sent_texts()[-1]

    cat = db.get_categories()[0]
    prod = db.get_products(cat["id"])[0]
    await click(dp, bot, USER_ID, CategoryCb(id=cat["id"]).pack())
    await click(dp, bot, USER_ID, ProductCb(id=prod["id"]).pack())
    assert prod["name"] in s.sent_texts()[-1]

    await click(dp, bot, USER_ID, AddCb(id=prod["id"], qty=2).pack())
    assert db.cart_total(USER_ID) == prod["price"] * 2

    await click(dp, bot, USER_ID, CartCb(action="inc", id=prod["id"]).pack())
    assert db.get_cart(USER_ID)[0]["qty"] == 3

    await click(dp, bot, USER_ID, CartCb(action="checkout").pack())
    await send(dp, bot, USER_ID, "⏭ O'tkazib yuborish")  # ism -> Telegramdagi ism
    await send(dp, bot, USER_ID, "12345")  # noto'g'ri raqam
    assert "noto'g'ri" in s.sent_texts()[-1]
    await send(dp, bot, USER_ID, contact=Contact(phone_number="998901234567", first_name="Ali"))
    await send(dp, bot, USER_ID, "Toshkent, Chilonzor 5-kvartal, 12-uy")
    await send(dp, bot, USER_ID, "3-qavat")
    assert "tasdiqlaysizmi" in s.sent_texts()[-1]
    await send(dp, bot, USER_ID, "✅ Tasdiqlash")

    orders = db.get_user_orders(USER_ID)
    assert len(orders) == 1
    order = orders[0]
    assert order["full_name"] == "Ali Valiyev"
    assert order["phone"] == "+998901234567"
    assert order["total"] == prod["price"] * 3
    assert order["comment"] == "3-qavat"
    assert db.get_cart(USER_ID) == []
    assert any(f"#{order['id']}" in t for t in s.sent_texts(ADMIN_ID)), "admin xabardor qilinmadi"

    # Admin holatni o'zgartiradi -> mijozga xabar boradi
    await click(dp, bot, ADMIN_ID, OrderStatusCb(id=order["id"], status="accepted").pack())
    assert db.get_order(order["id"])["status"] == "accepted"
    assert "Qabul qilindi" in s.sent_texts(USER_ID)[-1]


async def test_non_admin_cannot_change_status(env):
    db, bot, dp, s = env
    p = db.get_products(db.get_categories()[0]["id"])[0]
    db.add_to_cart(USER_ID, p["id"])
    oid = db.create_order(USER_ID, "Ali", "+998901234567", "Toshkent")
    await click(dp, bot, USER_ID, OrderStatusCb(id=oid, status="done").pack())
    await send(dp, bot, USER_ID, "/admin")
    assert db.get_order(oid)["status"] == "new"
    assert not any("Admin panel" in (t or "") for t in s.sent_texts(USER_ID))


async def test_admin_adds_product(env):
    db, bot, dp, s = env
    from bot.keyboards import AdminCb

    await send(dp, bot, ADMIN_ID, "/admin")
    await click(dp, bot, ADMIN_ID, AdminCb(action="add_cat").pack())
    await send(dp, bot, ADMIN_ID, "📚 Kitoblar")
    cat = next(c for c in db.get_categories() if c["name"] == "📚 Kitoblar")

    await click(dp, bot, ADMIN_ID, AdminCb(action="add_prod_cat", id=cat["id"]).pack())
    await send(dp, bot, ADMIN_ID, "O'tkan kunlar")
    await send(dp, bot, ADMIN_ID, "45 000")
    await send(dp, bot, ADMIN_ID, "⏭ O'tkazib yuborish")
    await send(dp, bot, ADMIN_ID, "⏭ O'tkazib yuborish")
    [p] = db.get_products(cat["id"])
    assert (p["name"], p["price"], p["photo_id"]) == ("O'tkan kunlar", 45_000, None)


async def test_free_text_searches_products(env):
    db, bot, dp, s = env
    await send(dp, bot, USER_ID, "quloqchin")
    assert "topildi" in s.sent_texts(USER_ID)[-1]

    await send(dp, bot, USER_ID, "Yetkazib berish bormi?")
    assert any("Mijozdan xabar" in t for t in s.sent_texts(ADMIN_ID))
