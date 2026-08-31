# Dunyo Hotel 1 — Telegram Mini App

Mehmon Telegramda `/start` bosadi → bot klaviatura tugmasini beradi → Mini App ochiladi:
registratura kalit taxtasi, har bir xonaning raqami, narxi, haqiqiy rasmlari, manzil va bron
so'rovi formasi. Forma yuborilganda so'rov mehmonxona egasining Telegramiga tushadi.

Til: **o'zbek (lotin)** va **rus**, tepadagi tugma orqali almashadi.

## Nima nimadan iborat

```
webapp/          Mini App — statik HTML/CSS/JS, build step yo'q. Vercel shu papkani chiqaradi.
  index.html     Struktura
  styles.css     Butun vizual dunyo (yong'oq taxta, latun kalit, qog'oz mehmon kartasi)
  app.js         Telegram SDK, til, galereya, forma, sendData
  data.js        HOTEL + ROOMS + tarjimalar  ← narx/xona shu yerda tahrirlanadi
  images/        Xona rasmlari (WebP) + uchta material teksturasi
  fonts/         Archivo 900 + PT Sans / PT Sans Narrow (o'zimizda, CDN'siz)
bot/             aiogram bot — so'rovni qabul qiladi va egaga yuboradi
  bot.py         /start + web_app_data handler
  rooms.py       ROOMS ning server nusxasi  ← narx shu yerda ham tahrirlanadi
  test_rooms_sync.py  data.js ↔ rooms.py mosligini tekshiradi
deploy/          VPS uchun systemd unit + install.sh (qarang: deploy/README.md)
vercel.json      Deploy + CSP/cache sarlavhalari
PRODUCT.md       Mahsulot haqiqati (kim uchun, nima tasdiqlangan, nima o'ylab topilmaydi)
DESIGN.md        Dizayn tizimi — styles.css ni o'zgartirishdan oldin o'qing
```

## Ishga tushirish

### 1. BotFather'da bot yarating

```
@BotFather → /newbot → nom va username → tokenni saqlang
```

### 2. Mini App'ni Vercel'ga chiqaring

```bash
npx vercel        # birinchi marta: login + project yaratish
npx vercel --prod
```

Vercel bergan `https://...vercel.app` manzilini saqlang.

### 3. Botni sozlang

```bash
cd bot
python -m venv .venv
.venv/Scripts/activate          # Windows
pip install -r requirements.txt
cp .env.example .env            # keyin to'ldiring
```

`.env` ichida:
- `BOT_TOKEN` — BotFather bergan token
- `WEBAPP_URL` — Vercel manzili (majburiy `https://`, Telegram boshqasini qabul qilmaydi)
- `OWNER_CHAT_ID` — so'rovlar kimga borishi. Egasining akkauntidan
  [@userinfobot](https://t.me/userinfobot) ga yozing, u ID beradi.
- `INFO_URL` — ixtiyoriy. "ℹ️ Qo'shimcha ma'lumotlar" tugmasi ochadigan ikkinchi
  sahifa (majburiy `https://`). Bo'sh qoldirilsa, tugma umuman ko'rinmaydi.

### 4. Botni ishga tushiring

Lokal sinov: `python bot.py`. Doimiy ishlashi uchun — VPS'da systemd ostida, to'liq
yo'riqnoma: **[deploy/README.md](deploy/README.md)**. Python **3.11+** kerak.

### 5. Tekshiring

Botga `/start` → "🔑 Xonalarni ko'rish" tugmasi → Mini App → xona tanlang → forma to'ldiring →
yuboring. So'rov `OWNER_CHAT_ID` ga tushishi kerak.

## Muhim texnik cheklov

`Telegram.WebApp.sendData()` **faqat** Mini App **reply-keyboard tugmasidan** ochilganda ishlaydi.
Menu tugmasi yoki inline tugmadan ochilsa — ma'lumot botga bormaydi. Shuning uchun `/start`
javobi klaviatura tugmasi bo'lishi shart. BotFather'dagi "Menu Button" ni Mini App'ga **bog'lamang**.

## Narx yoki xonani o'zgartirish

Ikkita faylni **birga** tahrirlang — aks holda mehmon ko'rgan narx bilan egaga borgan narx
farq qiladi:

1. `webapp/data.js` → `ROOMS`
2. `bot/rooms.py` → `ROOMS`

```bash
cd bot && python -m unittest test_rooms_sync    # ikkisi mos ekanini tekshiradi
```

Bot mijozdan kelgan narxga **ishonmaydi** — u narxni har doim `bot/rooms.py` dan qayta
hisoblaydi. Bu ataylab: brauzerdagi kodni o'zgartirib arzon narx yuborish mumkin emas.

Yangi rasm: `webapp/images/` ga `r<xona>-<n>.webp` nomi bilan qo'ying va `data.js` dagi
`photos` ro'yxatiga qo'shing. Yoki butun rasm papkasini qayta ingest qiling
(qarang: hotel-miniapp skill, `scripts/ingest_rooms.py`).

## Qasddan qilinmagan narsalar

`PRODUCT.md` da tasdiqlangan qaror — unutilgan emas:

- **Onlayn to'lov yo'q** (Payme/Click/Stars). Bu bron **so'rovi**, tasdiq emas.
- **Real vaqtda bandlik yo'q.** Sayt xona bo'shligini bilmaydi — buni ega tasdiqlaydi.
- **Admin panel yo'q.** Xona va narx yuqoridagi ikki fayldan tahrirlanadi.
- **O'ylab topilgan ma'lumot yo'q**: yulduzcha reyting, sharhlar, wifi/nonushta/parking
  ro'yxati, xona maydoni, karavot turi, check-in vaqti, bekor qilish shartlari.

## Lokal ko'rish

```bash
cd webapp && python -m http.server 8777
```

`http://127.0.0.1:8777` — brauzerda "ko'rish rejimi" ogohlantirishi chiqadi va so'rov
yuborilmaydi (Telegram SDK yo'q). Dizayn va formani tekshirish uchun yetarli.
