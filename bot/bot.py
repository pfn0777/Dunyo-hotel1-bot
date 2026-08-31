"""Dunyo Hotel 1 booking bot.

Serves the reply-keyboard button that opens the Mini App, receives the booking
request through `web_app_data`, and forwards a clean, server-computed summary
to the hotel owner.

`sendData()` only reaches a bot when the Mini App was opened from a
*reply-keyboard* `web_app` button — not from the menu button and not from an
inline button. That constraint is why /start answers with a keyboard.
"""

from __future__ import annotations

import asyncio
import html
import json
import logging
import os
import re
import time
from dataclasses import dataclass
from datetime import date, datetime, timedelta, timezone

from aiogram import Bot, Dispatcher, F
from aiogram.client.default import DefaultBotProperties
from aiogram.enums import ChatType, ParseMode
from aiogram.exceptions import TelegramAPIError
from aiogram.filters import CommandStart
from aiogram.types import KeyboardButton, Message, ReplyKeyboardMarkup, WebAppInfo
from dotenv import load_dotenv

from rooms import BY_ID, ROOMS

logger = logging.getLogger("dunyo_hotel_1_miniapp")

MAX_NAME = 80
MAX_PHONE = 24
MIN_NAME = 2
# The Mini App asks for +998 XX XXX XX XX (12 digits). The bot accepts fewer so a
# guest with a foreign number is not rejected by a rule the hotel never set — it
# only refuses a field that cannot be a phone number at all.
MIN_PHONE_DIGITS = 9
MAX_GUESTS = 20        # sanity bound, not a confirmed occupancy limit
MAX_NIGHTS = 90
REQUEST_COOLDOWN_SEC = 30

# Uzbekistan is UTC+5 year-round and observes no DST, so a fixed offset is exact
# and avoids depending on the tz database being present on the host. The server
# runs in UTC; without this, "today" flips five hours early for the guest.
TASHKENT = timezone(timedelta(hours=5))


class ConfigError(Exception):
    pass


@dataclass(frozen=True)
class Settings:
    token: str
    webapp_url: str
    owner_chat_id: int
    # Optional second page (hotel info). Empty string hides the button entirely,
    # so an operator who has no such page is not forced to invent one.
    info_url: str = ""


def load_settings() -> Settings:
    load_dotenv()

    def require(name: str) -> str:
        value = os.environ.get(name, "").strip()
        if not value:
            raise ConfigError(f"Missing required .env value: {name}")
        return value

    # Checked in the order the operator fills them in, so a fresh .env complains
    # about the first blank line rather than the third.
    token = require("BOT_TOKEN")

    url = require("WEBAPP_URL")
    if not url.startswith("https://"):
        raise ConfigError("WEBAPP_URL must be an https:// URL — Telegram rejects anything else")

    try:
        owner = int(require("OWNER_CHAT_ID"))
    except ValueError as exc:
        raise ConfigError("OWNER_CHAT_ID must be an integer") from exc

    info_url = os.environ.get("INFO_URL", "").strip()
    if info_url and not info_url.startswith("https://"):
        raise ConfigError("INFO_URL must be an https:// URL — Telegram rejects anything else")

    return Settings(token=token, webapp_url=url, owner_chat_id=owner, info_url=info_url)


TEXTS = {
    "uz": {
        "start": (
            "Assalomu alaykum! Dunyo Hotel 1.\n\n"
            "Xonalar, rasmlar va narxlarni ko‘rish hamda bron so‘rovini yuborish uchun "
            "quyidagi tugmani bosing."
        ),
        "open": "🔑 Xonalarni ko‘rish",
        "info": "ℹ️ Qo‘shimcha ma’lumotlar",
        "thanks": (
            "So‘rovingiz qabul qilindi. Mehmonxona tez orada siz bilan bog‘lanadi.\n\n"
            "Eslatma: bu bron tasdig‘i emas — xona bandligini mehmonxona tasdiqlaydi."
        ),
        "bad": "So‘rovni o‘qib bo‘lmadi. Iltimos, qaytadan urinib ko‘ring.",
        "bad_room": "Xona tanlanmagan yoki tanilmadi. Tugmani bosib, ro‘yxatdan xona tanlang.",
        "bad_dates": (
            "Sanalar to‘g‘ri emas. Kelish sanasi bugundan boshlansin, ketish sanasi undan "
            "keyin bo‘lsin."
        ),
        "bad_guests": "Mehmonlar soni to‘g‘ri emas. 1 dan 20 gacha bo‘lishi kerak.",
        "bad_contact": "Ism va telefon raqamini to‘liq yozing — mehmonxona shu orqali bog‘lanadi.",
        "owner_unreachable": (
            "So‘rovingizni hozir mehmonxonaga yetkazib bo‘lmadi. Iltimos, bir necha daqiqadan "
            "so‘ng qayta urinib ko‘ring."
        ),
        "throttled": "So‘rovingiz endigina yuborildi. Yangisini yuborishdan oldin biroz kuting.",
        "fallback": "Xonalar, narxlar va bron so‘rovi uchun quyidagi tugmani bosing.",
        "room": "Xona",
        "check_in": "Kelish",
        "check_out": "Ketish",
        "nights": "Kecha",
        "guests": "Mehmonlar",
        "name": "Ism",
        "phone": "Telefon",
        "total": "Taxminiy jami",
        "som": "so‘m",
    },
    "ru": {
        "start": (
            "Здравствуйте! Dunyo Hotel 1.\n\n"
            "Нажмите кнопку ниже, чтобы посмотреть номера, фото и цены "
            "и отправить заявку на бронирование."
        ),
        "open": "🔑 Посмотреть номера",
        "info": "ℹ️ Дополнительная информация",
        "thanks": (
            "Заявка принята. Отель скоро свяжется с вами.\n\n"
            "Обратите внимание: это не подтверждение брони — наличие номера подтверждает отель."
        ),
        "bad": "Не удалось прочитать заявку. Попробуйте ещё раз.",
        "bad_room": "Номер не выбран или не распознан. Нажмите кнопку и выберите номер из списка.",
        "bad_dates": (
            "Даты указаны неверно. Заезд — не раньше сегодняшнего дня, выезд — позже заезда."
        ),
        "bad_guests": "Количество гостей указано неверно. Допустимо от 1 до 20.",
        "bad_contact": "Укажите имя и телефон полностью — отель свяжется с вами по ним.",
        "owner_unreachable": (
            "Не удалось передать заявку в отель. Пожалуйста, попробуйте ещё раз через "
            "несколько минут."
        ),
        "throttled": "Заявка только что отправлена. Подождите немного перед следующей.",
        "fallback": "Нажмите кнопку ниже, чтобы посмотреть номера, цены и отправить заявку.",
        "room": "Номер",
        "check_in": "Заезд",
        "check_out": "Выезд",
        "nights": "Ночей",
        "guests": "Гостей",
        "name": "Имя",
        "phone": "Телефон",
        "total": "Примерно итого",
        "som": "сум",
    },
}


def keyboard_for(message: Message, settings: Settings, lang: str) -> ReplyKeyboardMarkup | None:
    """The keyboard, but only where Telegram accepts it.

    `KeyboardButton.web_app` is a private-chat-only field. `OWNER_CHAT_ID` may be
    a group id (see .env.example), so /start in that group would otherwise raise
    TelegramAPIError and the sender would get no reply at all.
    """
    if message.chat.type != ChatType.PRIVATE:
        return None
    return keyboard(settings, lang)


def keyboard(settings: Settings, lang: str) -> ReplyKeyboardMarkup:
    # The booking button stays alone on the first row: it is the one that carries
    # `sendData`, and a second button beside it would halve its target size.
    rows = [[KeyboardButton(text=TEXTS[lang]["open"], web_app=WebAppInfo(url=settings.webapp_url))]]
    if settings.info_url:
        rows.append(
            [KeyboardButton(text=TEXTS[lang]["info"], web_app=WebAppInfo(url=settings.info_url))]
        )
    return ReplyKeyboardMarkup(
        keyboard=rows,
        resize_keyboard=True,
        is_persistent=True,
    )


def money(value: int) -> str:
    return f"{value:,}".replace(",", " ")


def parse_date(value: object) -> date | None:
    try:
        return date.fromisoformat(str(value))
    except (ValueError, TypeError):
        return None


def clean_text(value: object, limit: int) -> str:
    text = str(value or "").strip()
    text = re.sub(r"\s+", " ", text)
    return text[:limit] or "—"


def clamp_int(value: object, low: int, high: int) -> int | None:
    try:
        number = int(value)
    except (TypeError, ValueError):
        return None
    return number if low <= number <= high else None


def payload_lang(payload: dict) -> str:
    """The Mini App's own language toggle wins over the Telegram client locale.

    Guarded with `isinstance`: an unhashable JSON value (`{"lang": []}`) would
    otherwise raise `TypeError` on the membership test and kill the handler
    before it can answer the guest at all.
    """
    value = payload.get("lang")
    return value if isinstance(value, str) and value in TEXTS else "uz"


def today_tashkent() -> date:
    return datetime.now(TASHKENT).date()


@dataclass(frozen=True)
class Rendered:
    """A request the bot is willing to forward."""

    message: str
    lang: str


@dataclass(frozen=True)
class Rejected:
    """A request the bot refuses, and the TEXTS key explaining why."""

    reason: str
    lang: str


def render_request(payload: dict) -> Rendered | Rejected:
    """Build the owner's message from *our* room data, never the client's."""
    lang = payload_lang(payload)
    words = TEXTS[lang]

    room = BY_ID.get(str(payload.get("room_id", "")))
    # A shared space carries no price and is gallery-only in the Mini App;
    # a request naming one did not come from our form.
    if room is None or room.shared:
        return Rejected("bad_room", lang)

    guests = clamp_int(payload.get("guests"), 1, MAX_GUESTS)
    if guests is None:
        return Rejected("bad_guests", lang)

    # Nights are derived from the dates, never taken from the payload: a
    # tampered `nights` would otherwise put a total in the owner's message that
    # contradicts the dates printed two lines above it.
    check_in = parse_date(payload.get("check_in"))
    check_out = parse_date(payload.get("check_out"))
    if check_in is None or check_out is None:
        return Rejected("bad_dates", lang)
    nights = (check_out - check_in).days
    if not 1 <= nights <= MAX_NIGHTS:
        return Rejected("bad_dates", lang)
    # The Mini App refuses a past arrival too; repeated here because a stale tab
    # or a tampered payload must not reach the owner as a live request.
    if check_in < today_tashkent():
        return Rejected("bad_dates", lang)

    # The whole point of the product is the owner getting a name and a number to
    # call back. `clean_text` would happily render an empty field as "—", so the
    # emptiness is caught before it becomes an unactionable request.
    name = clean_text(payload.get("name"), MAX_NAME)
    phone = clean_text(payload.get("phone"), MAX_PHONE)
    if len(name) < MIN_NAME or name == "—":
        return Rejected("bad_contact", lang)
    if len(re.sub(r"\D", "", phone)) < MIN_PHONE_DIGITS:
        return Rejected("bad_contact", lang)

    lines = [
        "<b>Yangi bron so‘rovi</b>" if lang == "uz" else "<b>Новая заявка на бронь</b>",
        "",
        f"{words['room']}: <b>{html.escape(room.label(lang))}</b>",
        f"{words['check_in']}: {check_in.strftime('%d.%m.%Y')}",
        f"{words['check_out']}: {check_out.strftime('%d.%m.%Y')}",
        f"{words['nights']}: {nights}",
        f"{words['guests']}: {guests}",
        f"{words['name']}: {html.escape(name)}",
        f"{words['phone']}: {html.escape(phone)}",
    ]
    if room.price is not None:
        lines.append(f"{words['total']}: <b>{money(room.price * nights)} {words['som']}</b>")

    return Rendered("\n".join(lines), lang)


class Cooldown:
    """One booking request per user per `REQUEST_COOLDOWN_SEC`.

    In-memory on purpose: a single-property hotel runs one process, and a flood
    that survives a restart is not the threat — a script hammering the owner's
    chat inside one session is. Stale entries are pruned as they are read, so the
    map stays the size of the currently active guests.
    """

    def __init__(self, window: int = REQUEST_COOLDOWN_SEC) -> None:
        self._window = window
        self._seen: dict[int, float] = {}

    def hit(self, user_id: int) -> bool:
        """True if the request is allowed; False if the user is still cooling down."""
        now = time.monotonic()
        self._seen = {uid: ts for uid, ts in self._seen.items() if now - ts < self._window}
        if user_id in self._seen:
            return False
        self._seen[user_id] = now
        return True


def build_dispatcher(settings: Settings) -> Dispatcher:
    dp = Dispatcher()
    cooldown = Cooldown()

    @dp.message(CommandStart())
    async def on_start(message: Message) -> None:
        lang = "ru" if (message.from_user and message.from_user.language_code == "ru") else "uz"
        await message.answer(TEXTS[lang]["start"], reply_markup=keyboard_for(message, settings, lang))

    @dp.message(F.web_app_data)
    async def on_web_app_data(message: Message, bot: Bot) -> None:
        user = message.from_user
        if user is None:
            logger.warning("web_app_data with no sender; ignored")
            return

        lang = "ru" if user.language_code == "ru" else "uz"
        try:
            payload = json.loads(message.web_app_data.data)
        except (json.JSONDecodeError, AttributeError):
            logger.warning("Unparseable web_app_data from user_id=%s", user.id)
            await message.answer(TEXTS[lang]["bad"])
            return

        if not isinstance(payload, dict):
            logger.warning("Non-object web_app_data from user_id=%s (%s)", user.id, type(payload).__name__)
            await message.answer(TEXTS[lang]["bad"])
            return

        result = render_request(payload)
        lang = result.lang
        if isinstance(result, Rejected):
            # The payload itself is never logged: it carries the guest's name and
            # phone, and journalctl keeps them forever. The reason key is enough
            # to tell which field was unusable.
            logger.warning(
                "Rejected web_app_data from user_id=%s (%s)", user.id, result.reason
            )
            await message.answer(TEXTS[lang][result.reason])
            return

        # Checked after validation on purpose: only a request that would actually
        # reach the owner spends the cooldown. A guest who mistyped a date can fix
        # it and resend immediately instead of being locked out for half a minute.
        if not cooldown.hit(user.id):
            logger.info("Throttled booking request from user_id=%s", user.id)
            await message.answer(TEXTS[lang]["throttled"])
            return

        contact = f'<a href="tg://user?id={user.id}">{html.escape(user.full_name)}</a>'
        if user.username:
            contact += f" (@{html.escape(user.username)})"

        # The guest's Mini App has already closed itself by now, so an unhandled
        # error here would make the request vanish with no trace on either side.
        # The owner's copy is attempted first; only if it lands is the guest told
        # the hotel has it.
        try:
            await bot.send_message(
                settings.owner_chat_id,
                f"{result.message}\n\nTelegram: {contact}",
                disable_web_page_preview=True,
            )
        except TelegramAPIError:
            logger.exception(
                "Could not deliver booking request from user_id=%s to owner_chat_id=%s",
                user.id,
                settings.owner_chat_id,
            )
            await message.answer(TEXTS[lang]["owner_unreachable"], reply_markup=keyboard(settings, lang))
            return

        await message.answer(TEXTS[lang]["thanks"], reply_markup=keyboard(settings, lang))
        logger.info("Booking request forwarded from user_id=%s", user.id)

    # Registered last: aiogram matches handlers in registration order, so this
    # only catches what /start and web_app_data did not.
    @dp.message()
    async def on_anything_else(message: Message) -> None:
        lang = "ru" if (message.from_user and message.from_user.language_code == "ru") else "uz"
        await message.answer(TEXTS[lang]["fallback"], reply_markup=keyboard_for(message, settings, lang))

    return dp


async def main() -> None:
    # Before basicConfig, or LOG_LEVEL from .env is read after logging is already
    # configured and silently ignored. `load_dotenv` is idempotent; load_settings
    # calls it again harmlessly.
    load_dotenv()
    logging.basicConfig(level=os.environ.get("LOG_LEVEL", "INFO"), format="%(asctime)s %(levelname)s %(message)s")
    settings = load_settings()
    bot = Bot(settings.token, default=DefaultBotProperties(parse_mode=ParseMode.HTML))
    dp = build_dispatcher(settings)
    logger.info("Mini App: %s | rooms: %d", settings.webapp_url, len(ROOMS))
    # Requests queued while the bot was down are dropped: a booking request that
    # sat in Telegram's queue for hours is stale, and replaying it would tell the
    # guest "the hotel has your request" long after they gave up.
    await dp.start_polling(
        bot,
        drop_pending_updates=True,
        allowed_updates=dp.resolve_used_update_types(),
    )


if __name__ == "__main__":
    try:
        asyncio.run(main())
    except ConfigError as exc:
        # A misconfigured .env is an operator mistake, not a crash: say which
        # line is wrong instead of burying it under a traceback in journalctl.
        raise SystemExit(f"Configuration error: {exc}") from None
    except KeyboardInterrupt:
        pass
