# Spec — "Qo'shimcha ma'lumotlar" tugmasi

**Holat:** kod yozilgan (commit qilinmagan), yoqilmagan — `INFO_URL` bo'sh.
**Sana:** 2026-08-31

## 1. Muammo

`/start` javobida faqat bitta tugma bor: **🔑 Посмотреть номера / Xonalarni ko'rish**.
Mehmonxona haqidagi kengaytirilgan sahifa (birjoyda katalogi) mehmonga umuman
ko'rinmaydi — havolani faqat qo'lda yuborish mumkin.

## 2. Yechim

Reply-klaviaturaga **ikkinchi qatorga** yana bitta tugma qo'shiladi:

| Til | Matn | Ochadigan manzil |
|-----|------|------------------|
| uz | `ℹ️ Qo'shimcha ma'lumotlar` | `INFO_URL` |
| ru | `ℹ️ Дополнительная информация` | `INFO_URL` |

Ishlab chiqarishdagi qiymat:

```
INFO_URL=https://birjoyda.vercel.app/dunyo-hotel-1
```

## 3. Talablar

### Funksional

1. `INFO_URL` to'ldirilgan bo'lsa — tugma ko'rinadi; bo'sh bo'lsa — umuman
   chizilmaydi (operator sahifasi yo'q bo'lsa, uni "o'ylab topishga" majbur emas).
2. Tugma **alohida qatorda**, bron tugmasidan pastda. Bron tugmasi yakka qoladi —
   u `sendData()` tashuvchi tugma va yonidagi ikkinchi tugma uning bosish
   maydonini ikki barobar kichraytiradi.
3. Klaviatura ikkala tilda ham (`uz`/`ru`) bir xil tuzilishda bo'ladi; matn
   faqat `TEXTS[lang]["info"]` dan olinadi — markup ichida hard-code yo'q.
4. `keyboard_for()` mantig'i o'zgarmaydi: guruh chatda klaviatura umuman
   yuborilmaydi (`KeyboardButton.web_app` faqat private chat uchun).

### Nofunksional / cheklovlar

5. `INFO_URL` `https://` bilan boshlanishi shart, aks holda `ConfigError` —
   Telegram boshqasini rad etadi va bot start bo'lmaydi.
6. Info-sahifa `sendData()` chaqirmaydi, shuning uchun `F.web_app_data`
   handleriga ta'sir qilmaydi. Bron oqimi (`render_request`, egaga forward,
   `try/except TelegramAPIError`) mutlaqo tegilmaydi.
7. Vercel'dagi Mini App'ga o'zgarish yo'q — bu faqat bot tomonidagi o'zgarish.

## 4. Amalga oshirish (kodda mavjud)

| Joy | O'zgarish |
|-----|-----------|
| [bot.py:80](../../bot/bot.py#L80) | `Settings.info_url: str = ""` |
| [bot.py:105-107](../../bot/bot.py#L105-L107) | `.env` dan o'qish + `https://` validatsiyasi |
| [bot.py:130](../../bot/bot.py#L130), [bot.py:173](../../bot/bot.py#L173) | `TEXTS["uz"]["info"]`, `TEXTS["ru"]["info"]` |
| [bot.py:216-228](../../bot/bot.py#L216-L228) | `keyboard()` — `rows` ro'yxati, shartli ikkinchi qator |
| [.env.example](../../bot/.env.example) | `INFO_URL=` izohi bilan |

## 5. Qolgan ishlar

- [x] Lokal `bot/.env` ga `INFO_URL=https://birjoyda.vercel.app/dunyo-hotel-1`
- [x] [README.md](../../README.md#L58) va [deploy/README.md](../../deploy/README.md#L32)
      env ro'yxatiga `INFO_URL` (ixtiyoriy) qatorini qo'shish
- [ ] VPS'dagi `.env` ga o'sha qator + `systemctl restart dunyo-hotel-1-miniapp-bot`
      (server'da hali yoqilmagan — mehmonlar tugmani hozircha ko'rmaydi)

## 6. Qabul mezonlari

1. `INFO_URL` to'ldirilgan bot'da `/start` → klaviaturada 2 ta tugma, info
   tugmasi pastda.
2. Info tugmasi bosilganda Telegram webview'da birjoyda sahifasi ochiladi,
   botga hech qanday xabar tushmaydi.
3. `INFO_URL` bo'sh bot'da `/start` → avvalgidek 1 ta tugma, xato yo'q.
4. `INFO_URL=http://...` bo'lsa bot ishga tushmaydi va aniq `ConfigError` beradi.
5. `python -m unittest test_rooms_sync -v` hamon o'tadi (bu o'zgarish xonalarga
   tegmaydi).
