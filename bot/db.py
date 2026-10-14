import json
import sqlite3
from contextlib import closing
from dataclasses import dataclass

SCHEMA = """
CREATE TABLE IF NOT EXISTS categories (
    id   INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS products (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    category_id INTEGER NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
    name        TEXT NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    price       INTEGER NOT NULL CHECK (price >= 0),
    photo_id    TEXT,
    stock       INTEGER,            -- NULL = cheklanmagan
    is_active   INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS users (
    id         INTEGER PRIMARY KEY,
    full_name  TEXT,
    username   TEXT,
    phone      TEXT,
    lang       TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
);

CREATE TABLE IF NOT EXISTS cart (
    user_id    INTEGER NOT NULL,
    product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    qty        INTEGER NOT NULL CHECK (qty > 0),
    PRIMARY KEY (user_id, product_id)
);

CREATE TABLE IF NOT EXISTS orders (
    id             INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id        INTEGER NOT NULL,
    full_name      TEXT NOT NULL,
    phone          TEXT NOT NULL,
    address        TEXT NOT NULL,
    latitude       REAL,
    longitude      REAL,
    comment        TEXT NOT NULL DEFAULT '',
    delivery_type  TEXT NOT NULL DEFAULT 'delivery',
    payment_method TEXT NOT NULL DEFAULT 'cash',
    paid           INTEGER NOT NULL DEFAULT 0,
    subtotal       INTEGER NOT NULL DEFAULT 0,
    discount       INTEGER NOT NULL DEFAULT 0,
    delivery_fee   INTEGER NOT NULL DEFAULT 0,
    promo_code     TEXT,
    total          INTEGER NOT NULL,
    status         TEXT NOT NULL DEFAULT 'new',
    rating         INTEGER,
    created_at     TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
);

CREATE TABLE IF NOT EXISTS order_items (
    order_id   INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    product_id INTEGER,
    name       TEXT NOT NULL,
    price      INTEGER NOT NULL,
    qty        INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS promo_codes (
    code      TEXT PRIMARY KEY,
    percent   INTEGER NOT NULL CHECK (percent BETWEEN 1 AND 100),
    max_uses  INTEGER,              -- NULL = cheklanmagan
    used      INTEGER NOT NULL DEFAULT 0,
    is_active INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS settings (
    key   TEXT PRIMARY KEY,
    value TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS fsm (
    key   TEXT PRIMARY KEY,
    state TEXT,
    data  TEXT NOT NULL DEFAULT '{}'
);
"""

# Eski bazalarni yangilash uchun: (jadval, ustun, ta'rif)
MIGRATIONS = [
    ("products", "stock", "INTEGER"),
    ("users", "lang", "TEXT"),
    ("orders", "delivery_type", "TEXT NOT NULL DEFAULT 'delivery'"),
    ("orders", "payment_method", "TEXT NOT NULL DEFAULT 'cash'"),
    ("orders", "paid", "INTEGER NOT NULL DEFAULT 0"),
    ("orders", "subtotal", "INTEGER NOT NULL DEFAULT 0"),
    ("orders", "discount", "INTEGER NOT NULL DEFAULT 0"),
    ("orders", "delivery_fee", "INTEGER NOT NULL DEFAULT 0"),
    ("orders", "promo_code", "TEXT"),
    ("orders", "rating", "INTEGER"),
]

ORDER_STATUSES = ("new", "accepted", "delivering", "done", "cancelled")

# Admin panelidan o'zgartiriladigan sozlamalar va standart qiymatlari
DEFAULT_SETTINGS = {
    "delivery_fee": 15_000,       # yetkazib berish narxi
    "free_delivery_from": 300_000,  # shu summadan boshlab bepul (0 = hech qachon)
    "min_order": 0,               # minimal buyurtma summasi
    "low_stock": 3,               # qoldiq shundan kam bo'lsa adminga ogohlantirish
}


class OutOfStock(Exception):
    def __init__(self, items: list[tuple[str, int]]):
        super().__init__(items)
        self.items = items  # [(mahsulot nomi, mavjud qoldiq)]


@dataclass(frozen=True)
class Quote:
    subtotal: int
    discount: int
    delivery_fee: int
    promo_code: str | None

    @property
    def total(self) -> int:
        return self.subtotal - self.discount + self.delivery_fee


class Database:
    def __init__(self, path: str):
        self.conn = sqlite3.connect(path)
        self.conn.row_factory = sqlite3.Row
        self.conn.execute("PRAGMA foreign_keys = ON")
        self.conn.executescript(SCHEMA)
        self._migrate()
        self.conn.commit()

    def _migrate(self) -> None:
        for table, column, ddl in MIGRATIONS:
            cols = {r["name"] for r in self.conn.execute(f"PRAGMA table_info({table})")}
            if column not in cols:
                self.conn.execute(f"ALTER TABLE {table} ADD COLUMN {column} {ddl}")

    def close(self) -> None:
        self.conn.close()

    def _all(self, sql: str, params: tuple = ()) -> list[sqlite3.Row]:
        with closing(self.conn.execute(sql, params)) as cur:
            return cur.fetchall()

    def _one(self, sql: str, params: tuple = ()) -> sqlite3.Row | None:
        with closing(self.conn.execute(sql, params)) as cur:
            return cur.fetchone()

    def _exec(self, sql: str, params: tuple = ()) -> int:
        with self.conn:
            cur = self.conn.execute(sql, params)
            return cur.lastrowid

    # --- Sozlamalar ---

    def get_setting(self, key: str) -> int:
        row = self._one("SELECT value FROM settings WHERE key = ?", (key,))
        return int(row["value"]) if row else DEFAULT_SETTINGS[key]

    def set_setting(self, key: str, value: int) -> None:
        if key not in DEFAULT_SETTINGS:
            raise ValueError(f"Noma'lum sozlama: {key}")
        self._exec(
            "INSERT INTO settings (key, value) VALUES (?, ?) "
            "ON CONFLICT(key) DO UPDATE SET value = excluded.value",
            (key, str(int(value))),
        )

    # --- FSM holatlari (bot qayta ishga tushganda yo'qolmasligi uchun) ---

    def fsm_get(self, key: str) -> tuple[str | None, dict]:
        row = self._one("SELECT state, data FROM fsm WHERE key = ?", (key,))
        return (row["state"], json.loads(row["data"])) if row else (None, {})

    def fsm_set_state(self, key: str, state: str | None) -> None:
        self._exec(
            "INSERT INTO fsm (key, state) VALUES (?, ?) "
            "ON CONFLICT(key) DO UPDATE SET state = excluded.state",
            (key, state),
        )

    def fsm_set_data(self, key: str, data: dict) -> None:
        self._exec(
            "INSERT INTO fsm (key, data) VALUES (?, ?) "
            "ON CONFLICT(key) DO UPDATE SET data = excluded.data",
            (key, json.dumps(data, ensure_ascii=False)),
        )

    # --- Foydalanuvchilar ---

    def upsert_user(self, user_id: int, full_name: str, username: str | None) -> None:
        self._exec(
            """INSERT INTO users (id, full_name, username) VALUES (?, ?, ?)
               ON CONFLICT(id) DO UPDATE SET full_name = excluded.full_name,
                                             username = excluded.username""",
            (user_id, full_name, username),
        )

    def set_user_phone(self, user_id: int, phone: str) -> None:
        self._exec("UPDATE users SET phone = ? WHERE id = ?", (phone, user_id))

    def set_user_lang(self, user_id: int, lang: str) -> None:
        self._exec("UPDATE users SET lang = ? WHERE id = ?", (lang, user_id))

    def get_user(self, user_id: int) -> sqlite3.Row | None:
        return self._one("SELECT * FROM users WHERE id = ?", (user_id,))

    def all_user_ids(self) -> list[int]:
        return [r["id"] for r in self._all("SELECT id FROM users")]

    def get_customers(self) -> list[sqlite3.Row]:
        return self._all(
            """SELECT u.*, COUNT(o.id) AS orders_count,
                      COALESCE(SUM(CASE WHEN o.status != 'cancelled' THEN o.total END), 0) AS spent
               FROM users u LEFT JOIN orders o ON o.user_id = u.id
               GROUP BY u.id ORDER BY spent DESC"""
        )

    # --- Kategoriyalar ---

    def add_category(self, name: str) -> int:
        return self._exec("INSERT INTO categories (name) VALUES (?)", (name,))

    def get_categories(self, only_with_products: bool = False) -> list[sqlite3.Row]:
        if only_with_products:
            return self._all(
                """SELECT c.* FROM categories c
                   WHERE EXISTS (SELECT 1 FROM products p
                                 WHERE p.category_id = c.id AND p.is_active = 1)
                   ORDER BY c.name"""
            )
        return self._all("SELECT * FROM categories ORDER BY name")

    def get_category(self, category_id: int) -> sqlite3.Row | None:
        return self._one("SELECT * FROM categories WHERE id = ?", (category_id,))

    def delete_category(self, category_id: int) -> None:
        self._exec("DELETE FROM categories WHERE id = ?", (category_id,))

    # --- Mahsulotlar ---

    def add_product(
        self,
        category_id: int,
        name: str,
        price: int,
        description: str = "",
        photo_id: str | None = None,
        stock: int | None = None,
    ) -> int:
        return self._exec(
            """INSERT INTO products (category_id, name, description, price, photo_id, stock)
               VALUES (?, ?, ?, ?, ?, ?)""",
            (category_id, name, description, price, photo_id, stock),
        )

    def get_products(self, category_id: int, include_hidden: bool = False) -> list[sqlite3.Row]:
        sql = "SELECT * FROM products WHERE category_id = ?"
        if not include_hidden:
            sql += " AND is_active = 1"
        return self._all(sql + " ORDER BY name", (category_id,))

    def get_product(self, product_id: int) -> sqlite3.Row | None:
        return self._one("SELECT * FROM products WHERE id = ?", (product_id,))

    def search_products(self, query: str, limit: int = 10) -> list[sqlite3.Row]:
        # SQLite LOWER() faqat ASCII ni o'zgartiradi, shuning uchun Pythonda filtrlaymiz.
        q = query.casefold().strip()
        if not q:
            return []
        rows = self._all("SELECT * FROM products WHERE is_active = 1 ORDER BY name")
        found = [r for r in rows if q in r["name"].casefold() or q in r["description"].casefold()]
        return found[:limit]

    EDITABLE_FIELDS = ("name", "description", "price", "photo_id", "stock", "is_active")

    def update_product(self, product_id: int, **fields) -> None:
        bad = set(fields) - set(self.EDITABLE_FIELDS)
        if bad:
            raise ValueError(f"Tahrirlab bo'lmaydigan maydon: {bad}")
        if not fields:
            return
        assignments = ", ".join(f"{k} = ?" for k in fields)
        self._exec(
            f"UPDATE products SET {assignments} WHERE id = ?", (*fields.values(), product_id)
        )
        if fields.get("is_active") == 0:
            self._exec("DELETE FROM cart WHERE product_id = ?", (product_id,))

    def update_product_price(self, product_id: int, price: int) -> None:
        self.update_product(product_id, price=price)

    def delete_product(self, product_id: int) -> None:
        self._exec("DELETE FROM products WHERE id = ?", (product_id,))

    def count_products(self) -> int:
        return self._one("SELECT COUNT(*) AS n FROM products WHERE is_active = 1")["n"]

    def low_stock_products(self, threshold: int | None = None) -> list[sqlite3.Row]:
        if threshold is None:
            threshold = self.get_setting("low_stock")
        return self._all(
            "SELECT * FROM products WHERE is_active = 1 AND stock IS NOT NULL AND stock <= ? "
            "ORDER BY stock",
            (threshold,),
        )

    # --- Savat ---

    def add_to_cart(self, user_id: int, product_id: int, qty: int = 1) -> None:
        self._exec(
            """INSERT INTO cart (user_id, product_id, qty) VALUES (?, ?, ?)
               ON CONFLICT(user_id, product_id) DO UPDATE SET qty = qty + excluded.qty""",
            (user_id, product_id, qty),
        )

    def set_cart_qty(self, user_id: int, product_id: int, qty: int) -> None:
        if qty <= 0:
            self._exec(
                "DELETE FROM cart WHERE user_id = ? AND product_id = ?", (user_id, product_id)
            )
        else:
            self._exec(
                "UPDATE cart SET qty = ? WHERE user_id = ? AND product_id = ?",
                (qty, user_id, product_id),
            )

    def get_cart(self, user_id: int) -> list[sqlite3.Row]:
        return self._all(
            """SELECT c.product_id, c.qty, p.name, p.price, p.stock,
                      c.qty * p.price AS subtotal
               FROM cart c JOIN products p ON p.id = c.product_id
               WHERE c.user_id = ? AND p.is_active = 1
               ORDER BY p.name""",
            (user_id,),
        )

    def cart_total(self, user_id: int) -> int:
        return sum(r["subtotal"] for r in self.get_cart(user_id))

    def clear_cart(self, user_id: int) -> None:
        self._exec("DELETE FROM cart WHERE user_id = ?", (user_id,))

    def refill_cart_from_order(self, user_id: int, order_id: int) -> int:
        """Eski buyurtmadagi hali sotuvda bor mahsulotlarni savatga qo'shadi."""
        added = 0
        for item in self.get_order_items(order_id):
            p = self.get_product(item["product_id"]) if item["product_id"] else None
            if p and p["is_active"]:
                self.add_to_cart(user_id, p["id"], item["qty"])
                added += 1
        return added

    # --- Promokodlar ---

    def add_promo(self, code: str, percent: int, max_uses: int | None = None) -> None:
        self._exec(
            "INSERT INTO promo_codes (code, percent, max_uses) VALUES (?, ?, ?) "
            "ON CONFLICT(code) DO UPDATE SET percent = excluded.percent, "
            "max_uses = excluded.max_uses, used = 0, is_active = 1",
            (code.upper(), percent, max_uses),
        )

    def get_promo(self, code: str) -> sqlite3.Row | None:
        """Faol va limiti tugamagan promokodni qaytaradi."""
        return self._one(
            "SELECT * FROM promo_codes WHERE code = ? AND is_active = 1 "
            "AND (max_uses IS NULL OR used < max_uses)",
            (code.strip().upper(),),
        )

    def get_promos(self) -> list[sqlite3.Row]:
        return self._all("SELECT * FROM promo_codes WHERE is_active = 1 ORDER BY code")

    def delete_promo(self, code: str) -> None:
        self._exec("UPDATE promo_codes SET is_active = 0 WHERE code = ?", (code,))

    # --- Narx hisoblash ---

    def quote(self, user_id: int, delivery_type: str = "delivery", promo_code: str | None = None) -> Quote:
        subtotal = self.cart_total(user_id)
        promo = self.get_promo(promo_code) if promo_code else None
        discount = subtotal * promo["percent"] // 100 if promo else 0
        fee = 0
        if delivery_type == "delivery":
            free_from = self.get_setting("free_delivery_from")
            if not (free_from and subtotal - discount >= free_from):
                fee = self.get_setting("delivery_fee")
        return Quote(subtotal, discount, fee, promo["code"] if promo else None)

    # --- Buyurtmalar ---

    def create_order(
        self,
        user_id: int,
        full_name: str,
        phone: str,
        address: str,
        latitude: float | None = None,
        longitude: float | None = None,
        comment: str = "",
        delivery_type: str = "delivery",
        payment_method: str = "cash",
        promo_code: str | None = None,
    ) -> int | None:
        """Savatdan buyurtma yaratadi, qoldiqni kamaytiradi va savatni tozalaydi.
        Savat bo'sh bo'lsa None qaytaradi, qoldiq yetmasa OutOfStock ko'taradi."""
        items = self.get_cart(user_id)
        if not items:
            return None
        short = [(r["name"], r["stock"]) for r in items if r["stock"] is not None and r["qty"] > r["stock"]]
        if short:
            raise OutOfStock(short)

        q = self.quote(user_id, delivery_type, promo_code)
        with self.conn:
            cur = self.conn.execute(
                """INSERT INTO orders (user_id, full_name, phone, address, latitude, longitude,
                                       comment, delivery_type, payment_method, subtotal, discount,
                                       delivery_fee, promo_code, total)
                   VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
                (user_id, full_name, phone, address, latitude, longitude, comment, delivery_type,
                 payment_method, q.subtotal, q.discount, q.delivery_fee, q.promo_code, q.total),
            )
            order_id = cur.lastrowid
            self.conn.executemany(
                "INSERT INTO order_items (order_id, product_id, name, price, qty) VALUES (?, ?, ?, ?, ?)",
                [(order_id, r["product_id"], r["name"], r["price"], r["qty"]) for r in items],
            )
            self.conn.executemany(
                "UPDATE products SET stock = stock - ? WHERE id = ? AND stock IS NOT NULL",
                [(r["qty"], r["product_id"]) for r in items],
            )
            if q.promo_code:
                self.conn.execute("UPDATE promo_codes SET used = used + 1 WHERE code = ?", (q.promo_code,))
            self.conn.execute("DELETE FROM cart WHERE user_id = ?", (user_id,))
        return order_id

    def get_order(self, order_id: int) -> sqlite3.Row | None:
        return self._one("SELECT * FROM orders WHERE id = ?", (order_id,))

    def get_order_items(self, order_id: int) -> list[sqlite3.Row]:
        return self._all("SELECT * FROM order_items WHERE order_id = ?", (order_id,))

    def get_user_orders(self, user_id: int, limit: int = 10) -> list[sqlite3.Row]:
        return self._all(
            "SELECT * FROM orders WHERE user_id = ? ORDER BY id DESC LIMIT ?", (user_id, limit)
        )

    def get_orders(self, status: str | None = None, limit: int | None = 20) -> list[sqlite3.Row]:
        sql, params = "SELECT * FROM orders", []
        if status:
            sql += " WHERE status = ?"
            params.append(status)
        sql += " ORDER BY id DESC"
        if limit:
            sql += " LIMIT ?"
            params.append(limit)
        return self._all(sql, tuple(params))

    def set_order_status(self, order_id: int, status: str) -> None:
        if status not in ORDER_STATUSES:
            raise ValueError(f"Noma'lum status: {status}")
        order = self.get_order(order_id)
        if order is None:
            return
        with self.conn:
            # Bekor qilinganda qoldiqni qaytaramiz, qayta tiklanganda yana ayiramiz.
            if status == "cancelled" and order["status"] != "cancelled":
                sign = 1
            elif order["status"] == "cancelled" and status != "cancelled":
                sign = -1
            else:
                sign = 0
            if sign:
                self.conn.executemany(
                    "UPDATE products SET stock = stock + ? WHERE id = ? AND stock IS NOT NULL",
                    [(sign * i["qty"], i["product_id"]) for i in self.get_order_items(order_id)],
                )
            self.conn.execute("UPDATE orders SET status = ? WHERE id = ?", (status, order_id))

    def set_order_paid(self, order_id: int) -> None:
        self._exec("UPDATE orders SET paid = 1 WHERE id = ?", (order_id,))

    def set_order_rating(self, order_id: int, rating: int) -> None:
        self._exec("UPDATE orders SET rating = ? WHERE id = ?", (max(1, min(5, rating)), order_id))

    def stats(self, day: str | None = None) -> dict:
        """Umumiy statistika. day='YYYY-MM-DD' berilsa, faqat o'sha kun uchun."""
        where = "WHERE date(created_at) = ?" if day else ""
        params = (day,) if day else ()
        row = self._one(
            f"""SELECT COUNT(*) AS orders,
                       COALESCE(SUM(status = 'new'), 0) AS new_orders,
                       COALESCE(SUM(status = 'cancelled'), 0) AS cancelled,
                       COALESCE(SUM(CASE WHEN status = 'done' THEN total END), 0) AS revenue,
                       COALESCE(SUM(CASE WHEN status != 'cancelled' THEN total END), 0) AS sales,
                       AVG(rating) AS avg_rating
                FROM orders {where}""",
            params,
        )
        result = dict(row)
        result["users"] = self._one("SELECT COUNT(*) AS n FROM users")["n"]
        result["today_orders"] = self._one(
            "SELECT COUNT(*) AS n FROM orders WHERE date(created_at) = date('now', 'localtime')"
        )["n"]
        result["top_products"] = [
            (r["name"], r["qty"])
            for r in self._all(
                f"""SELECT i.name, SUM(i.qty) AS qty FROM order_items i
                    JOIN orders o ON o.id = i.order_id
                    WHERE o.status != 'cancelled' {"AND date(o.created_at) = ?" if day else ""}
                    GROUP BY i.name ORDER BY qty DESC LIMIT 5""",
                params,
            )
        ]
        return result

    # --- Demo ma'lumotlar ---

    def seed_demo(self) -> None:
        """Baza bo'sh bo'lsa, namunaviy kategoriya va mahsulotlarni qo'shadi."""
        if self._one("SELECT 1 FROM categories LIMIT 1"):
            return
        demo = {
            "📱 Elektronika": [
                ("Simsiz quloqchin", 249_000, "Bluetooth 5.3, 24 soatgacha ishlaydi", 10),
                ("Power bank 20000 mAh", 189_000, "Tez quvvatlash, 2 ta USB port", 15),
            ],
            "👕 Kiyim-kechak": [
                ("Futbolka (paxta)", 89_000, "100% paxta, o'lchamlar: S-XXL", None),
                ("Sport shim", 159_000, "Yengil va qulay", None),
            ],
            "🍫 Oziq-ovqat": [
                ("Shokolad to'plami", 65_000, "12 dona assorti", 30),
                ("Ko'k choy 100 g", 25_000, "Yuqori navli", None),
            ],
        }
        for cat, products in demo.items():
            cat_id = self.add_category(cat)
            for name, price, desc, stock in products:
                self.add_product(cat_id, name, price, desc, stock=stock)
