# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Stack

Static HTML/CSS/JS (no framework, no build step) for the Telegram Mini App front-end, deployed to
Vercel. A small Python `aiogram` bot in `bot/` receives the booking payload via
`Telegram.WebApp.sendData()` and forwards it to the hotel owner's Telegram. Chosen because the
Mini App must be a plain HTTPS static surface and the bot must be a long-running process, which
Vercel cannot host.

## Users

Guests in Toshkent who message Dunyo Hotel 1 on Telegram looking for a room — usually on a
phone, usually deciding within minutes, often between several hotels at once. Their job: see what
the rooms actually look like, learn the price, and send a booking request without leaving Telegram.

Secondary user: the hotel owner, who reads incoming booking requests in Telegram and answers
manually. They must be able to read a request at a glance and reply.

## Product Purpose

Replace an unstructured Telegram conversation — photo dumps, repeated "narxi qancha?" — with a
browsable surface: pick a room, see its photos and price, send a dated booking request. Success =
the guest sends a structured request (room, dates, guest count, name, phone) instead of an
open-ended question.

## Positioning

A single-property hotel's own booking surface, living inside the Telegram conversation the guest
already started. No account, no OTA commission, no app install, no redirect to a browser. The
owner's real photos and real prices, not an aggregator's listing.

## Operating Context

- Entry point: guest sends `/start` to the hotel's BotFather bot; the bot replies with a
  reply-keyboard button that opens the Mini App. (`sendData()` only works from a reply-keyboard
  `web_app` button — this constrains the whole entry flow.)
- The Mini App runs inside Telegram's in-app webview on Android and iOS. Telegram supplies safe-area
  insets, `BackButton`, `MainButton`, and haptics via `telegram-web-app.js`.
- Phones are held in bright daylight and in hotel-lobby light.

## Capabilities and Constraints

**Confirmed functionality**
- Browse 8 entries — 7 numbered rooms plus 1 shared
  space(s) — each with photos and, for a room, a price.
- Per-room photo gallery.
- Booking request form: room, check-in date, check-out date, guest count, name, phone.
- Map / address block with a link to the exact coordinates.
- Uzbek (Latin) ↔ Russian language switch, persisted.

**Constraints**
- No backend for the web surface — Vercel static hosting only. All state is client-side.
- No real-time availability: the app cannot know whether a room is free. Booking is a *request*,
  confirmed manually by the owner.
- Bot token lives only in `bot/.env`, never in the Mini App.
- Total page weight must stay small — guests are on mobile data inside a webview.

**Explicitly out of scope (undecided / not built)**
- Online payment (Payme, Click, Telegram Stars).
- Real-time availability or a calendar of booked dates.
- Admin panel for editing rooms — the owner edits `webapp/data.js` and `bot/rooms.py` directly.
- Reviews, ratings, loyalty.

## Brand Commitments

- Name: **Dunyo Hotel 1**.
- Voice: Uzbek, plain and warm, no hospitality-brochure register.
- No logo, no brand colors, no typeface are confirmed — the walnut-and-brass key board is the
  established visual world (see DESIGN.md).

## Evidence on Hand

Confirmed via interview, 2026-08-31:

- **Room photos:** 35 real photos supplied by the owner, converted to WebP at 1080px
  into `webapp/images/`.
- **Real prices:** room 2 — 450 000; rooms 4 and 5 — 350 000; room 9 — 400 000; rooms 8, 11 and 12 — 300 000 som per night.
- **Real address:** Toshkent, Sergeli, Quruvchilar 2, Farogʻatli 2
- **Real coordinates:** 41.216128, 69.266011
- **Absent, must not be fabricated:** star rating, review count, amenity list (wifi, breakfast,
  parking, AC), room area in m², bed configuration, occupancy limits, check-in/check-out times,
  cancellation policy, years in business, awards. None of these are confirmed.

## Product Principles

1. **The photos are the product.** A guest choosing a room is choosing what the room looks like;
   everything else is supporting text. Never shrink the photography to make room for chrome.
2. **Price is stated, never hidden.** Guests ask the price first. The price is visible without a tap.
3. **A request, not a reservation.** Never imply a room is confirmed or available. The language is
   "so'rov yuborish" — the owner confirms.
4. **Invent nothing.** Amenities, ratings, and policies that the owner has not confirmed do not
   appear, however empty that leaves a section. An honest gap beats a plausible lie.
5. **Telegram is the host, not a browser.** Honor Telegram's affordances — safe areas, the
   BackButton, haptics, the closing confirmation. **Theme is the deliberate exception:** the
   surface is a physical walnut-and-brass key board, so it sets its own header and background
   colors (`setHeaderColor` / `setBackgroundColor`) instead of following `--tg-theme-*`. A board
   that changed color with the user's chat theme would stop being an object.

## Accessibility & Inclusion

- Bilingual by requirement (Uzbek Latin / Russian), switchable at any point without losing state.
- Thumb-reachable primary actions; touch targets ≥44px — the surface is phone-only in practice.
- Cyrillic and Latin must both render in the chosen typeface.
