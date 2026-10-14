from typing import Any, Awaitable, Callable

from aiogram import BaseMiddleware
from aiogram.types import TelegramObject

from bot.db import Database
from bot.i18n import DEFAULT_LANG


class LangMiddleware(BaseMiddleware):
    """Har bir handlerga foydalanuvchi tilini `lang` sifatida uzatadi."""

    async def __call__(
        self,
        handler: Callable[[TelegramObject, dict[str, Any]], Awaitable[Any]],
        event: TelegramObject,
        data: dict[str, Any],
    ) -> Any:
        user = data.get("event_from_user")
        db: Database = data["db"]
        row = db.get_user(user.id) if user else None
        data["lang"] = (row["lang"] if row and row["lang"] else None) or DEFAULT_LANG
        data["lang_chosen"] = bool(row and row["lang"])
        return await handler(event, data)
