# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

A **Telegram Mini App** for Dunyo Hotel 1 plus the small BotFather bot that serves and receives
it. The guest sends `/start`, the bot answers with a reply-keyboard button, the button opens a
static HTTPS page hosted on Vercel, and the guest browses rooms, sees real photos and prices, and
sends a booking **request** that lands in the hotel owner's Telegram.

Product truth: [PRODUCT.md](PRODUCT.md) · Design system: [DESIGN.md](DESIGN.md) · Setup and
deploy: [README.md](README.md) · [deploy/README.md](deploy/README.md)

Scaffolded by the `hotel-miniapp` skill from the Dunyo Hotel pattern.

## Hard constraints — do not violate when changing behavior

- **`sendData()` only works from a reply-keyboard `web_app` button.** Not the menu button, not an
  inline button. This is why `/start` answers with a `ReplyKeyboardMarkup` and why the README warns
  against wiring BotFather's Menu Button to the Mini App. Any change to how the app is opened must
  preserve this or bookings silently stop arriving.
- **The bot never trusts the client's money or dates.** `render_request()` recomputes the price
  from `bot/rooms.py` and derives `nights` from the parsed check-in/check-out dates. The payload's
  `price`, `total` and `nights` fields are ignored on purpose — a browser-side edit must not be
  able to put a false total in the owner's message.
- **This is a request, never a reservation.** There is no availability data anywhere in the system.
  Every string in both languages says *so'rov* / *заявка*, and the bot's confirmation repeats that
  the hotel still has to confirm. Do not introduce wording that implies a booking is secured.
- **Invent nothing about the hotel.** Star ratings, reviews, amenity lists (wifi, breakfast,
  parking, AC), room area, bed configuration, occupancy limits, check-in times and cancellation
  policies are all **unconfirmed** — see PRODUCT.md "Evidence on Hand". An empty section is the
  correct output; a plausible-sounding invention is not. The guest-count cap of 20 is a sanity
  bound and is commented as such in both files, not a house rule.
- **`webapp/data.js` and `bot/rooms.py` mirror each other.** Editing one without the other makes
  the price the guest saw disagree with the price the owner receives. Both files carry this warning
  in their header comments, and `bot/test_rooms_sync.py` is the guard.
- **Renaming a photo in place is a cache trap.** `vercel.json` serves `/images/*` as
  `max-age=31536000, immutable`, and `ingest_rooms.py` renumbers photos in place — deleting one
  shifts every later file, so the same filename comes to hold a different picture and returning
  guests keep the old bytes for a year. `app.js` appends `?v=ASSET_V` to every photo URL for this
  reason. **Bump `ASSET_V` whenever any file in `webapp/images/` changes content.** Recorded in
  [docs/specs/image-cache-busting.md](docs/specs/image-cache-busting.md).
- **Not every tag on the board is a room.** `ROOMS` also carries *shared spaces*, marked
  `shared: true` with `price: null` / `price=None`. They exist to be looked at, not requested: they
  have no number, so they carry their own `uz_name`/`ru_name` (Python) or `titleKey`/`noteKey`
  (JS) into `T` instead of the `"{plate}-xona"` / `"Номер {plate}"` pattern, and the guest card
  must never be reachable from one. Any code that maps a room to a price or a label has to handle
  the `null` case rather than assume a number.
- **The visual world is committed, not themed.** The app deliberately overrides Telegram's theme
  (`setHeaderColor` / `setBackgroundColor`) instead of reading `--tg-theme-*`. Recorded as a
  decision in PRODUCT.md principle 5 and DESIGN.md's "Theme Override Rule" — don't "fix" it back to
  following the client theme. Telegram's *other* affordances (BackButton, haptics, safe areas,
  closing confirmation) are honored and must stay.

## Commands

```bash
# Preview the Mini App locally (shows a "view mode" notice; sendData is unavailable outside Telegram)
cd webapp && python -m http.server 8777        # http://127.0.0.1:8777

# Bot setup
cd bot
python -m venv .venv
.venv/Scripts/activate                          # Windows (Git Bash: source .venv/Scripts/activate)
pip install -r requirements.txt
cp .env.example .env                            # then fill BOT_TOKEN / WEBAPP_URL / OWNER_CHAT_ID
python bot.py

# Syntax-check without running (bot.py needs a real token to start)
python -m py_compile bot.py rooms.py

# The one test: webapp/data.js and bot/rooms.py must agree, room for room
python -m unittest test_rooms_sync -v           # from bot/

# Deploy the Mini App
npx vercel --prod                               # from the repo root; vercel.json points at webapp/

# Deploy the bot to the VPS (from the repo root, in Git Bash)
~/.claude/skills/hotel-miniapp/scripts/deploy_hetzner.sh --host <ip> --slug dunyo-hotel-1

# Re-read the owner's photo folders into images + both room tables
python ~/.claude/skills/hotel-miniapp/scripts/ingest_rooms.py --src "<photos>" --out . --dry-run
```

There is no build step and no bundler; the webapp is plain HTML/CSS/JS served as-is.

## Architecture

One booking, end to end:

1. **`bot/bot.py`** answers `/start` with a `ReplyKeyboardMarkup` carrying a `KeyboardButton` whose
   `web_app` points at `WEBAPP_URL`. Language is picked from `message.from_user.language_code`.
2. **`webapp/index.html` + `app.js`** run inside Telegram's webview. `app.js` is one IIFE with no
   framework and no router — the board, the room sheet and the guest card are all mounted at once
   and the sheet/card slide over the board as layers. `show()` / `pop()` maintain a layer stack,
   set `inert` on everything beneath the top layer, move focus in, restore focus out, and drive
   Telegram's `BackButton`.
3. **`webapp/data.js`** holds `HOTEL`, `ROOMS` and the `T` translation table (`uz` / `ru`). It is a
   plain script, not a module — `app.js` reads the globals. This is the file the hotel owner edits.
4. Submitting calls `Telegram.WebApp.sendData(JSON.stringify(payload))`. The payload carries
   `room_id`, both dates, guests, name, phone and a rendered `text` — the bot uses only the
   identifying fields and recomputes everything monetary itself.
5. **`bot/bot.py`**'s `F.web_app_data` handler parses the JSON and validates through
   `render_request()`, which returns either `Rendered` or a `Rejected` carrying the `TEXTS` key
   that explains *which* field was unusable. It then forwards an HTML-escaped summary to
   `OWNER_CHAT_ID` with a `tg://user?id=` link back to the guest.

   **The forward is wrapped in `try/except TelegramAPIError` and this is load-bearing.** The Mini
   App has already closed itself by the time the bot runs, so an unhandled error here makes the
   booking vanish with no trace on either side. The owner's copy is attempted *first*; the guest is
   only told "the hotel has it" if it landed, and gets `owner_unreachable` if it did not. Never
   reorder those two sends, and never let this `except` become bare or silent.

### Where the design lives

`webapp/styles.css` is the whole visual system and is not generated from anything. Read
[DESIGN.md](DESIGN.md) before changing it — it records the tokens, the named rules, and the
reasoning. Notable non-obvious pieces:

- **`flipTag()`** in `app.js` is the signature interaction: a FLIP animation carrying the pressed
  brass tag from its hook on the board into the sheet header. It measures the source rect *before*
  the sheet paints. `is-lifted` is applied to the source tag 180ms later so the pigeonhole stands
  empty while the key is "in the guest's hand", and `pop()` puts it back only when the layer stack
  empties.
- **`renderDigits()`** renders night counts and totals as one brass tile per digit and animates
  **only the tiles whose digit changed**. Non-digit runs (the currency word) stay one uncut tile —
  splitting them letter-by-letter was a bug once already.
- **`--tilt`** is a custom property set per `:nth-child` so each key tag hangs at its own angle. The
  rules are `2n`/`3n`/`5n` cycles plus two hand-set exceptions, so they keep working as rooms are
  added. The `:active` lift composes with it via `calc()` rather than overriding it. If you add a
  transform to `.tag`, compose — don't replace.
- **Inline `<span>` wrapping a block child** caused a visible paint seam down the middle of every
  pigeonhole in an early build. `.hole__lip` and `.tag` carry an explicit `display: block` with a
  comment for this reason.

### Textures

`webapp/images/walnut.webp`, `felt.webp` and `paper.webp` are **authored assets**, generated
procedurally (periodic sine-sum noise so the tiles are seamless) rather than downloaded. They are
the world's three materials and DESIGN.md forbids substituting gradients for them. The room photos
(`r<plate>-<n>.webp`) and shared-space photos are the hotel's real JPGs, converted to WebP at
1080px by `scripts/ingest_rooms.py`.

### Fonts

Self-hosted in `webapp/fonts/`, with Latin **and** Cyrillic subsets, because the app ships in two
scripts. Archivo 900 is Latin-only on purpose — it is used for digits (room numbers, digit tiles)
and never for Cyrillic text. Do not swap these for a CDN link: `vercel.json`'s CSP allows scripts
only from `telegram.org` and styles/fonts only from `self`.

## Security-sensitive files (never commit, see `.gitignore`)

- `bot/.env` — contains `BOT_TOKEN`, which is full control of the bot, and `OWNER_CHAT_ID`.

## Uzbek/Russian copy

Every user-visible string lives in `data.js`'s `T` table (Mini App) or `bot.py`'s `TEXTS` dict
(bot). Never hard-code a user-facing string in markup or logic. Uzbek is Latin script and uses
`o'`/`g'` with the correct apostrophe character (U+2018), which is present in the shipped font
subsets.
