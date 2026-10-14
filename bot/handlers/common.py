import logging

from aiogram import Bot, F, Router
from aiogram.exceptions import TelegramAPIError
from aiogram.fsm.context import FSMContext
from aiogram.types import CallbackQuery, Message

from bot.config import Config
from bot.i18n import all_langs, t
from bot.keyboards import main_menu

router = Router(name="common")
log = logging.getLogger(__name__)


@router.message(F.text.in_(all_langs("btn_cancel")))
async def cancel(message: Message, state: FSMContext, config: Config, lang: str) -> None:
    await state.clear()
    await message.answer(
        t("cancelled", lang) + " " + t("main_menu", lang),
        reply_markup=main_menu(lang, message.from_user.id in config.admin_ids),
    )


@router.callback_query(F.data == "noop")
async def noop(callback: CallbackQuery) -> None:
    await callback.answer()


async def show_screen(callback: CallbackQuery, text: str, reply_markup=None) -> None:
    """Inline xabarni yangi matn bilan almashtiradi. Rasmli xabarni matnga
    tahrirlab bo'lmagani uchun uni o'chirib, yangisini yuboradi."""
    msg = callback.message
    if msg.text is not None:
        await msg.edit_text(text, reply_markup=reply_markup)
    else:
        await msg.delete()
        await msg.answer(text, reply_markup=reply_markup)


async def notify_admins(bot: Bot, config: Config, text: str, **kwargs) -> None:
    for admin_id in config.admin_ids:
        try:
            await bot.send_message(admin_id, text, **kwargs)
        except TelegramAPIError:
            log.warning("Adminga (%s) xabar yuborilmadi", admin_id)
