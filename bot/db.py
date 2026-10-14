import sqlite3
from contextlib import closing

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
    is_active   INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS users (
    id         INTEGER PRIMARY KEY,
    full_name  TEXT,
    username   TEXT,
    phone      TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
);

CREATE TABLE IF NOT EXISTS cart (
    user_id    INTEGER NOT NULL,
    product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    qty        INTEGER NOT NULL CHECK (qty > 0),
    PRIMARY KEY (user_id, product_id)
);

CREATE TABLE IF NOT EXISTS orders (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id    INTEGER NOT NULL,
    full_name  TEXT NOT NULL,
    phone      TEXT NOT NULL,
    address    TEXT NOT NULL,
    latitude   REAL,
    longitude  REAL,
    comment    TEXT NOT NULL DEFAULT '',
    total      INTEGER NOT NULL,
    status     TEXT NOT NULL DEFAULT 'new',
    created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
);

CREATE TABLE IF NOT EXISTS order_items (
    order_id   INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    product_id INTEGER,
    name       TEXT NOT NULL,
    price      INTEGER NOT NULL,
    qty        INTEGER NOT NULL
);
"""

ORDER_STATUSES = {
    "new": "🆕 Yangi",
    "accepted": "✅ Qabul qilindi",
    "delivering": "🚚 Yetkazilmoqda",
    "done": "📦 Yetkazildi",
    "cancelled": "❌ Bekor qilindi",
}


class Database:
    def __init__(self, path: str):
        self.conn = sqlite3.connect(path)
        self.conn.row_factory = sqlite3.Row
        self.conn.execute("PRAGMA foreign_keys = ON")
        self.conn.executescript(SCHEMA)
        self.conn.commit()

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

    def get_user(self, user_id: int) -> sqlite3.Row | None:
        return self._one("SELECT * FROM users WHERE id = ?", (user_id,))

    def all_user_ids(self) -> list[int]:
        return [r["id"] for r in self._all("SELECT id FROM users")]

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
    ) -> int:
        return self._exec(
            """INSERT INTO products (category_id, name, description, price, photo_id)
               VALUES (?, ?, ?, ?, ?)""",
            (category_id, name, description, price, photo_id),
        )

    def get_products(self, category_id: int) -> list[sqlite3.Row]:
        return self._all(
            "SELECT * FROM products WHERE category_id = ? AND is_active = 1 ORDER BY name",
            (category_id,),
        )

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

    def update_product_price(self, product_id: int, price: int) -> None:
        self._exec("UPDATE products SET price = ? WHERE id = ?", (price, product_id))

    def deactivate_product(self, product_id: int) -> None:
        with self.conn:
            self.conn.execute("UPDATE products SET is_active = 0 WHERE id = ?", (product_id,))
            self.conn.execute("DELETE FROM cart WHERE product_id = ?", (product_id,))

    def count_products(self) -> int:
        return self._one("SELECT COUNT(*) AS n FROM products WHERE is_active = 1")["n"]

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
            """SELECT c.product_id, c.qty, p.name, p.price, c.qty * p.price AS subtotal
               FROM cart c JOIN products p ON p.id = c.product_id
               WHERE c.user_id = ? AND p.is_active = 1
               ORDER BY p.name""",
            (user_id,),
        )

    def cart_total(self, user_id: int) -> int:
        return sum(r["subtotal"] for r in self.get_cart(user_id))

    def clear_cart(self, user_id: int) -> None:
        self._exec("DELETE FROM cart WHERE user_id = ?", (user_id,))

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
    ) -> int | None:
        """Savatdagi mahsulotlardan buyurtma yaratadi va savatni tozalaydi.
        Savat bo'sh bo'lsa None qaytaradi."""
        items = self.get_cart(user_id)
        if not items:
            return None
        total = sum(r["subtotal"] for r in items)
        with self.conn:
            cur = self.conn.execute(
                """INSERT INTO orders (user_id, full_name, phone, address, latitude, longitude,
                                       comment, total)
                   VALUES (?, ?, ?, ?, ?, ?, ?, ?)""",
                (user_id, full_name, phone, address, latitude, longitude, comment, total),
            )
            order_id = cur.lastrowid
            self.conn.executemany(
                "INSERT INTO order_items (order_id, product_id, name, price, qty) VALUES (?, ?, ?, ?, ?)",
                [(order_id, r["product_id"], r["name"], r["price"], r["qty"]) for r in items],
            )
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

    def get_orders(self, status: str | None = None, limit: int = 20) -> list[sqlite3.Row]:
        if status:
            return self._all(
                "SELECT * FROM orders WHERE status = ? ORDER BY id DESC LIMIT ?", (status, limit)
            )
        return self._all("SELECT * FROM orders ORDER BY id DESC LIMIT ?", (limit,))

    def set_order_status(self, order_id: int, status: str) -> None:
        if status not in ORDER_STATUSES:
            raise ValueError(f"Noma'lum status: {status}")
        self._exec("UPDATE orders SET status = ? WHERE id = ?", (status, order_id))

    def stats(self) -> dict:
        row = self._one(
            """SELECT
                 (SELECT COUNT(*) FROM users) AS users,
                 (SELECT COUNT(*) FROM orders) AS orders,
                 (SELECT COUNT(*) FROM orders WHERE status = 'new') AS new_orders,
                 (SELECT COALESCE(SUM(total), 0) FROM orders WHERE status = 'done') AS revenue,
                 (SELECT COUNT(*) FROM orders
                   WHERE date(created_at) = date('now', 'localtime')) AS today_orders"""
        )
        return dict(row)

    # --- Demo ma'lumotlar ---

    def seed_demo(self) -> None:
        """Baza bo'sh bo'lsa, namunaviy kategoriya va mahsulotlarni qo'shadi."""
        if self._one("SELECT 1 FROM categories LIMIT 1"):
            return
        demo = {
            "📱 Elektronika": [
                ("Simsiz quloqchin", 249_000, "Bluetooth 5.3, 24 soatgacha ishlaydi"),
                ("Power bank 20000 mAh", 189_000, "Tez quvvatlash, 2 ta USB port"),
            ],
            "👕 Kiyim-kechak": [
                ("Futbolka (paxta)", 89_000, "100% paxta, o'lchamlar: S-XXL"),
                ("Sport shim", 159_000, "Yengil va qulay"),
            ],
            "🍫 Oziq-ovqat": [
                ("Shokolad to'plami", 65_000, "12 dona assorti"),
                ("Ko'k choy 100 g", 25_000, "Yuqori navli"),
            ],
        }
        for cat, products in demo.items():
            cat_id = self.add_category(cat)
            for name, price, desc in products:
                self.add_product(cat_id, name, price, desc)
