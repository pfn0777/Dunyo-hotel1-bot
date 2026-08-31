# Deploy

Ikki qism alohida joyga chiqadi:

| Qism | Qayerga | Nima bilan |
|---|---|---|
| `webapp/` | Vercel (statik) | `npx vercel --prod` |
| `bot/` | Hetzner VPS (systemd) | `deploy/install.sh` yoki skilldagi `deploy_hetzner.sh` |

Bot **long-polling** — doimiy ishlab turadigan process kerak. Vercel/serverless'da ishlamaydi.

Unit nomi `dunyo-hotel-1-miniapp-bot`, yo'li `/opt/dunyo-hotel-1-miniapp-bot`.

---

## 1. Avval Mini App

```bash
npx vercel --prod
```

Chiqqan `https://...vercel.app` manzili keyingi qadamda `WEBAPP_URL` bo'ladi.
Telegram faqat `https://` qabul qiladi.

## 2. `.env` ni lokal to'ldiring

```bash
cp bot/.env.example bot/.env
```

- `BOT_TOKEN` — BotFather bergan token
- `WEBAPP_URL` — 1-qadamdagi Vercel manzili
- `OWNER_CHAT_ID` — so'rovlar tushadigan chat. Ega akkauntidan
  [@userinfobot](https://t.me/userinfobot) ga yozib oling.

`bot/.env` gitignore'da — hech qachon commit qilinmaydi.

## 3. Serverga chiqarish (bir buyruq, Git Bash)

```bash
~/.claude/skills/hotel-miniapp/scripts/deploy_hetzner.sh --host <server-ip> --slug dunyo-hotel-1
```

Skript: ulanishni tekshiradi → kodni `tar | ssh` bilan `/srv/dunyo-hotel-1-miniapp-bot` ga
yuboradi → `bot/.env` ni alohida `scp` qiladi va `chmod 600` beradi → `deploy/install.sh` ni
ishga tushiradi → service holati va oxirgi loglarni ko'rsatadi.

Faqat holatni ko'rish: `... --slug dunyo-hotel-1 --host <ip> --check`

### Qo'lda qilmoqchi bo'lsangiz

```bash
ssh root@<server-ip>
git clone <repo-url> /srv/dunyo-hotel-1-miniapp-bot
cd /srv/dunyo-hotel-1-miniapp-bot
nano bot/.env          # to'ldiring
sudo ./deploy/install.sh
```

`install.sh` idempotent: service user yaratadi, kodni `/opt/...` ga rsync qiladi, venv quradi,
`.env` ni ishga tushirishdan **oldin** tekshiradi va unit'ni `Restart=always` bilan yoqadi.
`.env` topilmasa — namunadan yaratadi va to'xtaydi.

## 4. Tekshirish

```bash
systemctl status dunyo-hotel-1-miniapp-bot
journalctl -u dunyo-hotel-1-miniapp-bot -f
```

Ishga tushganda log'da: `Mini App: https://... | rooms: N`

**Muhim:** ega (`OWNER_CHAT_ID` egasi) botga kamida bir marta `/start` yozishi shart —
Telegram bot hech qachon yozmagan foydalanuvchiga xabar yubora olmaydi.

Botga `/start` → "🔑 Xonalarni ko'rish" **klaviatura** tugmasi chiqadi (menu tugmasi emas —
`sendData()` faqat klaviatura tugmasidan ishlaydi) → Mini App → forma → so'rov egaga tushadi.

## 5. Nosozliklar

| Belgi | Sabab |
|---|---|
| `Configuration error: Missing required .env value: X` | `.env` da shu qator bo'sh |
| Log'da `Could not deliver booking request ... to owner_chat_id=` | Ega botni `/start` qilmagan yoki `OWNER_CHAT_ID` xato. Mehmon "yetkazib bo'lmadi" xabarini oladi — so'rov yo'qolmaydi, lekin yetib bormaydi. |
| Mini App ochiladi, lekin forma yuborilmaydi | Mini App menu tugmasidan ochilgan. BotFather'dagi Menu Button'ni Mini App'ga **bog'lamang**. |
| `TelegramConflictError` | Bot boshqa joyda ham ishlayapti (lokal `python bot.py` unutilgan) |

## Narx yoki xona o'zgarganda

`webapp/data.js` va `bot/rooms.py` — **ikkalasi birga** tahrirlanadi. Keyin:

```bash
cd bot && python -m unittest test_rooms_sync    # ikkisi mos ekanini tekshiradi
npx vercel --prod                               # webapp
~/.claude/skills/hotel-miniapp/scripts/deploy_hetzner.sh --host <ip> --slug dunyo-hotel-1
```
