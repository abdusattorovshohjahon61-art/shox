import html
import re
from sqlite3 import Row

from bot.db import ORDER_STATUSES


def escape(text: str) -> str:
    """HTML uchun xavfsiz qiladi, lekin apostrofni (o', g') o'zgartirmaydi."""
    return html.escape(text, quote=False)


def money(amount: int) -> str:
    return f"{amount:,}".replace(",", " ") + " so'm"


PHONE_RE = re.compile(r"^\+?998\d{9}$")


def normalize_phone(text: str) -> str | None:
    """'+998 90 123-45-67', '901234567' kabi yozuvlarni '+998901234567' ko'rinishiga keltiradi."""
    digits = re.sub(r"[^\d+]", "", text)
    if re.fullmatch(r"\d{9}", digits):
        digits = "998" + digits
    if not digits.startswith("+"):
        digits = "+" + digits
    return digits if PHONE_RE.match(digits) else None


def cart_text(items: list[Row]) -> str:
    lines = ["🛒 <b>Savatingiz:</b>\n"]
    for i, r in enumerate(items, 1):
        lines.append(
            f"{i}. {escape(r['name'])}\n   {r['qty']} x {money(r['price'])} = <b>{money(r['subtotal'])}</b>"
        )
    total = sum(r["subtotal"] for r in items)
    lines.append(f"\n💰 <b>Jami: {money(total)}</b>")
    return "\n".join(lines)


def order_text(order: Row, items: list[Row], for_admin: bool = False) -> str:
    lines = [
        f"🧾 <b>Buyurtma #{order['id']}</b>",
        f"Holati: {ORDER_STATUSES.get(order['status'], order['status'])}",
        f"Sana: {order['created_at']}",
        "",
    ]
    for r in items:
        lines.append(f"• {escape(r['name'])} — {r['qty']} x {money(r['price'])}")
    lines.append(f"\n💰 <b>Jami: {money(order['total'])}</b>")
    if for_admin:
        lines += [
            "",
            f"👤 {escape(order['full_name'])}",
            f"📞 {escape(order['phone'])}",
            f"📍 {escape(order['address'])}",
        ]
        if order["comment"]:
            lines.append(f"💬 {escape(order['comment'])}")
        lines.append(f'🔗 <a href="tg://user?id={order["user_id"]}">Mijoz profili</a>')
    return "\n".join(lines)
