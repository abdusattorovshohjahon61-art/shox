import asyncio
import logging

from aiogram import Bot, Dispatcher
from aiogram.client.default import DefaultBotProperties
from aiogram.enums import ParseMode
from aiogram.fsm.storage.memory import MemoryStorage
from aiogram.types import BotCommand

from bot.config import load_config
from bot.db import Database
from bot.handlers import admin, cart, common, order, user


def build_dispatcher(db: Database, config) -> Dispatcher:
    dp = Dispatcher(storage=MemoryStorage())
    dp["db"] = db
    dp["config"] = config
    # Tartib muhim: bekor qilish birinchi, umumiy matn (fallback) oxirgi.
    dp.include_routers(common.router, admin.router, order.router, cart.router, user.router)
    return dp


async def main() -> None:
    logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s: %(message)s")
    config = load_config()
    if not config.admin_ids:
        logging.warning("ADMIN_IDS bo'sh — buyurtmalar hech kimga yuborilmaydi.")

    db = Database(config.db_path)
    db.seed_demo()

    bot = Bot(config.bot_token, default=DefaultBotProperties(parse_mode=ParseMode.HTML))
    await bot.set_my_commands([BotCommand(command="start", description="Botni ishga tushirish")])
    dp = build_dispatcher(db, config)
    try:
        await dp.start_polling(bot)
    finally:
        db.close()
        await bot.session.close()


if __name__ == "__main__":
    asyncio.run(main())
