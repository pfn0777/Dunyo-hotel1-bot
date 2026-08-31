# Spec — Rasm keshi (kirish qismi takrorlanishi, 12-xona dushi yo'qolishi)

**Holat:** tuzatildi (kod yozildi, deploy qilinmagan)
**Sana:** 2026-08-31

## 1. Shikoyat

1. Kirish qismida ikkala rasm bir xil ko'rinadi.
2. 12-xonada dush (hammom) rasmi yo'q, garchi asl papkada bor.

## 2. Tekshiruv natijasi — fayllar to'g'ri, kesh noto'g'ri

Asl papka va repozitoriy to'liq mos:

| Papka | Asl JPG | `webapp/images/` | `data.js` |
|-------|---------|------------------|-----------|
| `Kirish qismi` | 2 | `kirishqismi-1,2` | 2 |
| `12 xona 300 ming` | 3 | `r12-1,2,3` | 3 |

- `r12-3.webp` — **aynan dush/hammom rasmi**, o'z joyida (ochib ko'rildi).
- `kirishqismi-1.webp` (fasad) va `kirishqismi-2.webp` (lobbi) — **turli** rasmlar,
  md5 ham har xil.
- Vercel'dagi jonli sayt ham to'g'ri baytlarni beradi
  (`Content-Length`: 88320 / 79248 / 86978 / 48736 / 68760 — lokal fayllar bilan bir xil).

Demak muammo serverda emas, **mehmonning brauzeridagi eski keshda**.

## 3. Asl sabab

`31dc0d3 "udalit qildim keraksiz rasmlarni"` commitida keraksiz rasmlar
o'chirildi va qolganlari **joyida qayta raqamlandi**:

```
kirishqismi:  -1 -2 -3 -4   →   -1 -2        (eski -2 va -3 o'chdi, eski -4 → -2)
r12:          -1 -2 -3 -4   →   -1 -2 -3     (eski -1 o'chdi, hammasi bir pog'ona surildi)
```

Ya'ni **bir xil fayl nomi endi boshqa rasmni** saqlaydi. Bir vaqtning o'zida
[vercel.json:26-28](../../vercel.json#L26-L28):

```json
{ "source": "/images/(.*)", "headers": [{ "key": "Cache-Control", "value": "public, max-age=31536000, immutable" }] }
```

`immutable` — brauzer bir yil davomida qayta so'ramaydi. Commitdan **oldin**
ilovani ochgan mehmonda:

| Ko'rinadigan nom | Mehmonda keshdagi bayt | Natija |
|------------------|------------------------|--------|
| `kirishqismi-1` | eski -1 (fasad) | to'g'ri |
| `kirishqismi-2` | eski -2 (yana fasad, o'xshash kadr) | **"ikkalasi bir xil"** |
| `r12-1` | eski -1 (o'chirilgan rasm) | noto'g'ri |
| `r12-2` | eski -2 = hozirgi -1 | siljigan |
| `r12-3` | eski -3 = hozirgi -2 | siljigan |
| — | hozirgi -3 (dush) hech qachon so'ralmaydi | **"dush yo'q"** |

Ikkala shikoyat ham shu bitta sabab bilan aniq tushuntiriladi.

## 4. Yechim

`immutable` keshni saqlab qolgan holda **URL'ni o'zgartirish** — rasm manziliga
versiya qo'shiladi, shunda kesh kaliti yangilanadi:

| Joy | O'zgarish |
|-----|-----------|
| [app.js:24](../../webapp/app.js#L24) | `const ASSET_V = '2';` + nima uchun kerakligi izohi |
| [app.js:197](../../webapp/app.js#L197) | `img.src = 'images/' + src + '?v=' + ASSET_V;` |

Nima uchun `?v=` va content-hash emas: `webapp/data.js` ni `ingest_rooms.py`
qayta generatsiya qiladi, shuning uchun fayl nomidagi hash har ingestda
yo'qoladi. `ASSET_V` esa `app.js` da — u hech qachon generatsiya qilinmaydi.

Nima uchun `immutable` olib tashlanmadi: rasmlar sahifaning eng og'ir qismi
(~2 MB), `must-revalidate` har ochilishda 30+ shartli so'rov qo'shadi. Kesh
to'g'ri, faqat kalit noto'g'ri edi.

## 5. Qoida (buzilmasin)

**`webapp/images/` ichidagi biror faylning mazmuni o'zgarsa — `ASSET_V` ni
bittaga oshirish shart.** Ayniqsa `ingest_rooms.py` ni qayta ishlatgandan
keyin: u rasmlarni joyida qayta raqamlaydi. Aks holda mehmonlar bir yilgacha
eski rasmni ko'rib turadi.

CSS teksturalari (`walnut/felt/paper.webp`) bu qoidaga kirmaydi — ular
authored asset, hech qachon o'zgarmaydi.

## 6. Qabul mezonlari

1. Ilova ochilganda rasm so'rovlari `images/r12-3.webp?v=2` ko'rinishida ketadi.
2. Muammoni ko'rgan mehmonda (kesh tozalanmagan holda) kirish qismida 2 ta
   turli rasm, 12-xonada 3 ta rasm — uchinchisi dush.
3. `vercel.json` o'zgarmaydi; `/images/*` hamon `immutable`.
4. Bot tomoni tegilmagan; `python -m unittest test_rooms_sync -v` o'tadi.

## 7. Ochiq savol (bu spec doirasidan tashqari)

`4-xona` va `5-xona` ikkita **bir xil** rasmni bo'lishadi
(`r4-1 == r5-4`, `r4-2 == r5-5`, md5 mos). Sabab — egalik papkalarida
`IMG_6923.jpg` va `IMG_6924.jpg` **ikkala** papkada ham bor. Bu kesh muammosi
emas, manba ma'lumotidagi takror. Egadan so'rash kerak: bu rasmlar qaysi
xonaniki?
