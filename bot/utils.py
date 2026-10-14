import html
import re
from sqlite3 import Row

from bot.db import Quote
from bot.i18n import status_name, t


def escape(text: str) -> str:
    """HTML uchun xavfsiz qiladi, lekin apostrofni (o', g') o'zgartirmaydi."""
    return html.escape(text, quote=False)


def money(amount: int, lang: str = "uz") -> str:
    return f"{amount:,}".replace(",", " ") + " " + t("currency", lang)


PHONE_RE = re.compile(r"^\+?998\d{9}$")


def normalize_phone(text: str) -> str | None:
    """'+998 90 123-45-67', '901234567' kabi yozuvlarni '+998901234567' ko'rinishiga keltiradi."""
    digits = re.sub(r"[^\d+]", "", text)
    if re.fullmatch(r"\d{9}", digits):
        digits = "998" + digits
    if not digits.startswith("+"):
        digits = "+" + digits
    return digits if PHONE_RE.match(digits) else None


def parse_int(text: str) -> int | None:
    """'125 000', '125,000 so'm' -> 125000."""
    digits = re.sub(r"[\s,.]|so'm|сум", "", text.strip(), flags=re.IGNORECASE)
    return int(digits) if digits.isdigit() else None


def price_lines(q: Quote, lang: str, delivery: bool = True) -> list[str]:
    lines = [t("subtotal", lang, sum=money(q.subtotal, lang))]
    if q.discount:
        lines.append(t("discount", lang, code=q.promo_code, sum=money(q.discount, lang)))
    if delivery:
        lines.append(
            t("delivery_fee", lang, sum=money(q.delivery_fee, lang)) if q.delivery_fee
            else t("delivery_free", lang)
        )
    lines.append(t("total", lang, sum=money(q.total, lang)))
    return lines


def cart_text(items: list[Row], lang: str = "uz") -> str:
    lines = [t("cart_title", lang)]
    for i, r in enumerate(items, 1):
        lines.append(
            f"{i}. {escape(r['name'])}\n"
            f"   {r['qty']} x {money(r['price'], lang)} = <b>{money(r['subtotal'], lang)}</b>"
        )
    total = sum(r["subtotal"] for r in items)
    lines.append("\n" + t("total", lang, sum=money(total, lang)))
    return "\n".join(lines)


def payment_label(order: Row, lang: str) -> str:
    method = t("btn_card" if order["payment_method"] == "card" else "btn_cash", lang)
    if order["payment_method"] == "card":
        method += " — " + t("paid" if order["paid"] else "unpaid", lang)
    return method


def order_text(order: Row, items: list[Row], lang: str = "uz", for_admin: bool = False) -> str:
    lines = [
        t("order_title", lang, id=order["id"]),
        t("order_status", lang, status=status_name(order["status"], lang)),
        t("order_date", lang, date=order["created_at"]),
        t("btn_pickup" if order["delivery_type"] == "pickup" else "btn_delivery", lang),
        t("order_payment", lang, method=payment_label(order, lang)),
        "",
    ]
    for r in items:
        lines.append(f"• {escape(r['name'])} — {r['qty']} x {money(r['price'], lang)}")
    lines.append("")
    q = Quote(order["subtotal"] or order["total"], order["discount"], order["delivery_fee"], order["promo_code"])
    lines += price_lines(q, lang, delivery=order["delivery_type"] == "delivery")
    if for_admin:
        lines += [
            "",
            f"👤 {escape(order['full_name'])}",
            f"📞 {escape(order['phone'])}",
            f"📍 {escape(order['address'])}",
        ]
        if order["comment"]:
            lines.append(f"💬 {escape(order['comment'])}")
        if order["rating"]:
            lines.append("⭐️" * order["rating"])
        lines.append(f'🔗 <a href="tg://user?id={order["user_id"]}">Mijoz profili</a>')
    return "\n".join(lines)
