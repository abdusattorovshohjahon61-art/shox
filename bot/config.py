import os
from dataclasses import dataclass, field
from datetime import datetime, time
from zoneinfo import ZoneInfo

from dotenv import load_dotenv

load_dotenv()


def _parse_time(value: str | None) -> time | None:
    if not value:
        return None
    try:
        return datetime.strptime(value.strip(), "%H:%M").time()
    except ValueError:
        raise RuntimeError(f"Vaqt formati noto'g'ri: {value!r} (kerak: HH:MM)") from None


@dataclass(frozen=True)
class Config:
    bot_token: str
    admin_ids: frozenset[int] = field(default_factory=frozenset)
    db_path: str = "shop.db"
    shop_name: str = "Do'kon"
    shop_phone: str = ""
    shop_address: str = ""
    shop_hours: str = ""
    # Ish vaqti: shundan tashqari buyurtma berilsa, mijozga ogohlantirish chiqadi
    open_time: time | None = None
    close_time: time | None = None
    timezone: str = "Asia/Tashkent"
    # Har kuni shu vaqtda adminlarga kunlik hisobot yuboriladi (bo'sh = o'chirilgan)
    report_time: time | None = None
    # @BotFather -> Payments orqali olingan Click/Payme token (bo'sh = faqat naqd)
    payment_token: str = ""
    pickup_enabled: bool = True

    @property
    def tz(self) -> ZoneInfo:
        return ZoneInfo(self.timezone)

    def now(self) -> datetime:
        return datetime.now(self.tz)

    def is_open(self, at: datetime | None = None) -> bool:
        if not (self.open_time and self.close_time):
            return True
        current = (at or self.now()).time()
        if self.open_time <= self.close_time:
            return self.open_time <= current < self.close_time
        return current >= self.open_time or current < self.close_time  # tunda ishlaydigan do'kon


def load_config() -> Config:
    token = os.getenv("BOT_TOKEN", "").strip()
    if not token:
        raise RuntimeError("BOT_TOKEN topilmadi. .env faylini to'ldiring (.env.example ga qarang).")

    admin_ids = frozenset(
        int(x) for x in os.getenv("ADMIN_IDS", "").replace(" ", "").split(",") if x.isdigit()
    )
    return Config(
        bot_token=token,
        admin_ids=admin_ids,
        db_path=os.getenv("DB_PATH", "shop.db"),
        shop_name=os.getenv("SHOP_NAME", "Do'kon"),
        shop_phone=os.getenv("SHOP_PHONE", ""),
        shop_address=os.getenv("SHOP_ADDRESS", ""),
        shop_hours=os.getenv("SHOP_HOURS", ""),
        open_time=_parse_time(os.getenv("OPEN_TIME")),
        close_time=_parse_time(os.getenv("CLOSE_TIME")),
        timezone=os.getenv("TIMEZONE", "Asia/Tashkent"),
        report_time=_parse_time(os.getenv("REPORT_TIME")),
        payment_token=os.getenv("PAYMENT_PROVIDER_TOKEN", "").strip(),
        pickup_enabled=os.getenv("PICKUP_ENABLED", "1") not in ("0", "false", "no"),
    )
