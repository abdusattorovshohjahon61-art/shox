from aiogram import F, Router
from aiogram.fsm.context import FSMContext
from aiogram.types import CallbackQuery, Message

from bot.config import Config
from bot.keyboards import BTN_CANCEL, main_menu

router = Router(name="common")


@router.message(F.text == BTN_CANCEL)
async def cancel(message: Message, state: FSMContext, config: Config) -> None:
    await state.clear()
    await message.answer(
        "Bekor qilindi. Asosiy menyu:",
        reply_markup=main_menu(message.from_user.id in config.admin_ids),
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
