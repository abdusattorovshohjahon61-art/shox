import asyncio
import logging
import os
import time

from aiogram import Bot, Dispatcher
from aiogram.client.default import DefaultBotProperties
from aiogram.enums import ParseMode
from aiogram.fsm.storage.base import BaseStorage
from aiogram.types import BotCommand

from bot.config import Config, load_config
from bot.db import Database
from bot.handlers import admin, cart, common, order, payments, user
from bot.middlewares import LangMiddleware
from bot.reports import daily_report_loop
from bot.storage import SQLiteStorage


def build_dispatcher(db: Database, config: Config, storage: BaseStorage | None = None) -> Dispatcher:
    dp = Dispatcher(storage=storage or SQLiteStorage(db))
    dp["db"] = db
    dp["config"] = config
    lang_mw = LangMiddleware()
    for observer in (dp.message, dp.callback_query, dp.pre_checkout_query):
        observer.outer_middleware(lang_mw)
    # Tartib muhim: bekor qilish birinchi, umumiy matn (fallback) oxirgi.
    dp.include_routers(common.router, admin.router, payments.router, order.router, cart.router, user.router)
    return dp


async def main() -> None:
    logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s: %(message)s")
    config = load_config()
    # SQLite'dagi 'localtime' do'kon vaqt zonasida ishlashi uchun
    os.environ["TZ"] = config.timezone
    if hasattr(time, "tzset"):
        time.tzset()
    if not config.admin_ids:
        logging.warning("ADMIN_IDS bo'sh — buyurtmalar hech kimga yuborilmaydi.")

    db = Database(config.db_path)
    db.seed_demo()

    bot = Bot(config.bot_token, default=DefaultBotProperties(parse_mode=ParseMode.HTML))
    await bot.set_my_commands([BotCommand(command="start", description="Boshlash / Начать")])
    dp = build_dispatcher(db, config)
    report_task = asyncio.create_task(daily_report_loop(bot, db, config))
    try:
        await dp.start_polling(bot)
    finally:
        report_task.cancel()
        db.close()
        await bot.session.close()


if __name__ == "__main__":
    asyncio.run(main())
