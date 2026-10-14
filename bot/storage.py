from typing import Any

from aiogram.fsm.state import State
from aiogram.fsm.storage.base import BaseStorage, StateType, StorageKey

from bot.db import Database


class SQLiteStorage(BaseStorage):
    """FSM holatlarini SQLite'da saqlaydi: bot qayta ishga tushsa ham
    mijozning yarim qolgan buyurtmasi yo'qolmaydi."""

    def __init__(self, db: Database):
        self.db = db

    @staticmethod
    def _key(key: StorageKey) -> str:
        return ":".join(
            str(x) for x in (key.bot_id, key.chat_id, key.user_id, key.thread_id,
                             key.business_connection_id, key.destiny)
        )

    async def set_state(self, key: StorageKey, state: StateType = None) -> None:
        value = state.state if isinstance(state, State) else state
        self.db.fsm_set_state(self._key(key), value)

    async def get_state(self, key: StorageKey) -> str | None:
        return self.db.fsm_get(self._key(key))[0]

    async def set_data(self, key: StorageKey, data: dict[str, Any]) -> None:
        self.db.fsm_set_data(self._key(key), data)

    async def get_data(self, key: StorageKey) -> dict[str, Any]:
        return self.db.fsm_get(self._key(key))[1]

    async def close(self) -> None:
        pass
