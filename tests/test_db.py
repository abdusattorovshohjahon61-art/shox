import pytest

from bot.db import Database
from bot.utils import money, normalize_phone


@pytest.fixture
def db():
    d = Database(":memory:")
    yield d
    d.close()


def test_seed_is_idempotent(db):
    db.seed_demo()
    db.seed_demo()
    assert len(db.get_categories()) == 3
    assert db.count_products() == 6


def test_cart_and_order_flow(db):
    cat = db.add_category("Test")
    a = db.add_product(cat, "Olma", 10_000)
    b = db.add_product(cat, "Nok", 5_000)

    db.add_to_cart(1, a, 2)
    db.add_to_cart(1, a, 1)
    db.add_to_cart(1, b)
    assert {r["product_id"]: r["qty"] for r in db.get_cart(1)} == {a: 3, b: 1}
    assert db.cart_total(1) == 35_000

    db.set_cart_qty(1, b, 0)
    assert db.cart_total(1) == 30_000

    order_id = db.create_order(1, "Ali", "+998901234567", "Toshkent")
    assert order_id is not None
    assert db.get_cart(1) == []
    order = db.get_order(order_id)
    assert order["total"] == 30_000 and order["status"] == "new"
    assert [(i["name"], i["qty"]) for i in db.get_order_items(order_id)] == [("Olma", 3)]

    # Narx o'zgarsa ham buyurtmadagi narx saqlanib qoladi
    db.update_product_price(a, 99_000)
    assert db.get_order_items(order_id)[0]["price"] == 10_000

    db.set_order_status(order_id, "done")
    assert db.stats()["revenue"] == 30_000
    with pytest.raises(ValueError):
        db.set_order_status(order_id, "xato")


def test_empty_cart_creates_no_order(db):
    assert db.create_order(1, "Ali", "+998901234567", "Toshkent") is None


def test_deactivated_product_leaves_cart_and_catalog(db):
    cat = db.add_category("Test")
    p = db.add_product(cat, "Olma", 1000)
    db.add_to_cart(1, p)
    db.deactivate_product(p)
    assert db.get_cart(1) == []
    assert db.get_products(cat) == []
    assert db.get_categories(only_with_products=True) == []


def test_search_is_case_insensitive_for_cyrillic(db):
    cat = db.add_category("Test")
    db.add_product(cat, "Шоколад", 1000)
    db.add_product(cat, "Choy", 1000, "Ko'k choy")
    assert [r["name"] for r in db.search_products("шоколад")] == ["Шоколад"]
    assert [r["name"] for r in db.search_products("KO'K")] == ["Choy"]


@pytest.mark.parametrize(
    "raw,expected",
    [
        ("+998 90 123-45-67", "+998901234567"),
        ("998901234567", "+998901234567"),
        ("901234567", "+998901234567"),
        ("12345", None),
        ("+7 999 123 45 67", None),
    ],
)
def test_normalize_phone(raw, expected):
    assert normalize_phone(raw) == expected


def test_money():
    assert money(1250000) == "1 250 000 so'm"
