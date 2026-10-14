import os
from dataclasses import dataclass, field

from dotenv import load_dotenv

load_dotenv()


@dataclass(frozen=True)
class Config:
    bot_token: str
    admin_ids: frozenset[int] = field(default_factory=frozenset)
    db_path: str = "shop.db"
    shop_name: str = "Do'kon"
    shop_phone: str = ""
    shop_address: str = ""
    shop_hours: str = ""


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
    )
