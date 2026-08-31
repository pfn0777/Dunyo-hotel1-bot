/* Dunyo Hotel 1 Mini App.
   One continuous object: board -> tag -> room sheet -> guest card -> stub.
   No route swaps; the board stays mounted behind every layer. */

(function () {
  'use strict';

  const tg = window.Telegram && window.Telegram.WebApp;
  const inTelegram = !!(tg && tg.initData !== undefined && tg.platform && tg.platform !== 'unknown');

  const $ = (id) => document.getElementById(id);
  // Deliberately above any plausible party for these rooms: the hotel has not
  // confirmed an occupancy limit, so this is a sanity bound, not a house rule.
  const MAX_GUESTS = 20;
  // Mirrors MAX_NIGHTS in bot/bot.py — the bot rejects anything longer.
  const MAX_NIGHTS = 90;
  const NBSP = ' ';

  /* ── state ───────────────────────────────────────────────────── */

  /* Telegram Web runs the app in a cross-origin iframe; a browser blocking
     third-party storage makes every localStorage access throw SecurityError.
     Uncaught, that kills the IIFE before anything is wired up. */
  function storedLang() {
    try { return localStorage.getItem('dh.lang'); } catch (e) { return null; }
  }
  function storeLang(v) {
    try { localStorage.setItem('dh.lang', v); } catch (e) { /* storage blocked */ }
  }

  const state = {
    lang: storedLang() === 'ru' ? 'ru' : 'uz',
    room: null,
    photo: 0,
    guests: 2,
    sourceTag: null,
    lastDigits: {},
  };

  const t = () => T[state.lang];
  const roomById = (id) => ROOMS.find((r) => r.id === id);

  /* ── formatting ──────────────────────────────────────────────── */

  function money(n) {
    return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, NBSP);
  }

  function priceLine(room) {
    if (room.price == null) return t().priceUnset;
    return money(room.price) + ' ' + t().som + ' / ' + t().perNight;
  }

  function roomTitle(room) {
    return room.shared ? t()[room.titleKey] : t().roomTitle(room.plate);
  }

  /* Uzbekistan is UTC+5 year-round with no DST. The bot validates check-in
     against the Tashkent date (today_tashkent in bot.py); computing "today" from
     the device clock instead would let a guest abroad pass client validation and
     be rejected by the bot after the app had already closed. */
  const TASHKENT_OFFSET_MIN = 5 * 60;

  function todayISO(offsetDays) {
    const d = new Date(Date.now() + TASHKENT_OFFSET_MIN * 60000);
    d.setUTCDate(d.getUTCDate() + (offsetDays || 0));
    return d.toISOString().slice(0, 10);
  }

  function humanDate(iso) {
    if (!iso) return '—';
    const [y, m, d] = iso.split('-');
    return `${d}.${m}.${y}`;
  }

  function nightsBetween(a, b) {
    if (!a || !b) return 0;
    const ms = new Date(b + 'T12:00:00') - new Date(a + 'T12:00:00');
    return ms > 0 ? Math.round(ms / 86400000) : 0;
  }

  /* ── brass digit tiles (they move, they never silently re-render) ── */

  function renderDigits(el, text, key) {
    const prev = state.lastDigits[key] || '';
    if (prev === text) return;
    state.lastDigits[key] = text;
    el.textContent = '';
    // Only the tiles whose digit actually changed flip; the rest of the number
    // holds still, the way a counter with independent wheels behaves.
    const aligned = prev.length === text.length;
    let i = -1;
    // Digits get their own tile so a change is a physical event; everything
    // else (the currency word, an em dash) stays one uncut run.
    for (const token of text.match(/\d|[  ]|[^\d  ]+/g) || []) {
      i += 1;
      const tile = document.createElement('span');
      if (token === ' ' || token === NBSP) tile.className = 'digit digit--gap';
      else if (/^\d$/.test(token)) tile.className = 'digit' + (aligned && prev[i] === token ? '' : ' is-new');
      else tile.className = 'digit digit--unit';
      tile.textContent = token;
      el.appendChild(tile);
    }
  }

  /* A numbered room stamps its number; the shared kitchen has no number, so it
     stamps the key itself rather than a word that will not fit the plate. */
  function plateMark(room, cls) {
    if (!room.shared) {
      const num = document.createElement('span');
      num.className = cls;
      num.textContent = room.plate;
      return num;
    }
    const wrap = document.createElement('span');
    wrap.className = cls + ' tag__mark';
    wrap.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><use href="#i-key"/></svg>';
    return wrap;
  }

  /* ── the board ───────────────────────────────────────────────── */

  function renderBoard() {
    const holes = $('holes');
    holes.textContent = '';
    for (const room of ROOMS) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'hole';
      btn.dataset.id = room.id;
      btn.setAttribute('aria-label', roomTitle(room) + ', ' + priceLine(room));

      const mouth = document.createElement('span');
      mouth.className = 'hole__mouth';
      const hook = document.createElement('span');
      hook.className = 'hole__hook';
      const tag = document.createElement('span');
      tag.className = 'tag' + (room.shared ? ' tag--shared' : '');
      tag.appendChild(plateMark(room, 'tag__num'));
      mouth.append(hook, tag);

      const lip = document.createElement('span');
      lip.className = 'hole__lip';
      const price = document.createElement('span');
      price.className = 'hole__price';
      price.textContent = room.shared
        ? t()[room.titleKey].toUpperCase()
        : room.price == null
          ? t().priceUnset
          : money(room.price) + ' ' + t().som;
      lip.appendChild(price);

      btn.append(mouth, lip);
      btn.addEventListener('click', () => openRoom(room, tag));
      holes.appendChild(btn);
    }
  }

  /* Only priced rooms can be requested; shared spaces are gallery-only. */
  const BOOKABLE = ROOMS.filter((r) => r.price != null);

  /* ── room sheet ──────────────────────────────────────────────── */

  function openRoom(room, sourceTag) {
    state.room = room;
    state.photo = 0;
    haptic('rigid');

    $('dockTag').classList.toggle('tag--shared', !!room.shared);
    $('dockTag').replaceChildren(plateMark(room, 'tag__num'));
    $('sheetTitle').textContent = roomTitle(room);
    $('sheetPrice').textContent = priceLine(room);

    const note = $('sheetNote');
    note.hidden = !room.shared;
    if (room.shared) note.textContent = t()[room.noteKey];

    // Only a priced room can be requested. Shared spaces are the usual case, but
    // a priced-room entry with `price: null` is equally unrequestable — and
    // BOOKABLE filters on the price, so `shared` alone is the wrong test: it
    // would leave the button on a room openCard() cannot actually select.
    $('bookBtn').hidden = room.price == null;

    const strip = $('gallery');
    const rivets = $('rivets');
    strip.textContent = '';
    rivets.textContent = '';
    room.photos.forEach((src, i) => {
      const img = document.createElement('img');
      img.src = 'images/' + src;
      img.alt = roomTitle(room) + ' — ' + t().photoOf(i + 1, room.photos.length);
      img.loading = i === 0 ? 'eager' : 'lazy';
      img.decoding = 'async';
      strip.appendChild(img);

      const dot = document.createElement('button');
      dot.type = 'button';
      dot.className = 'rivet' + (i === 0 ? ' is-on' : '');
      dot.setAttribute('aria-label', t().photoOf(i + 1, room.photos.length));
      dot.addEventListener('click', () => {
        strip.scrollTo({ left: strip.clientWidth * i, behavior: 'smooth' });
      });
      rivets.appendChild(dot);
    });
    rivets.hidden = room.photos.length < 2;
    strip.onscroll = () => {
      const i = Math.round(strip.scrollLeft / Math.max(1, strip.clientWidth));
      if (i === state.photo) return;
      state.photo = i;
      [...rivets.children].forEach((d, j) => d.classList.toggle('is-on', j === i));
    };

    show('sheet');
    // The key is off the board while it is in the guest's hand: its hook shows
    // empty until the sheet is closed.
    state.sourceTag = sourceTag;
    flipTag(sourceTag, $('dockTag'));
    if (sourceTag) setTimeout(() => { if (state.sourceTag === sourceTag) sourceTag.classList.add('is-lifted'); }, 180);
  }

  /* The signature moment: the tag leaves its hook and docks into the sheet. */
  function flipTag(from, to) {
    if (!from || !to || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const a = from.getBoundingClientRect();
    requestAnimationFrame(() => {
      const b = to.getBoundingClientRect();
      if (!a.width || !b.width) return;
      to.animate(
        [
          {
            transformOrigin: 'top center',
            transform: `translate(${a.left + a.width / 2 - (b.left + b.width / 2)}px, ${a.top - b.top}px) scale(${a.width / b.width}) rotate(-3deg)`,
            offset: 0,
          },
          { transform: 'translate(0,0) scale(1) rotate(0deg)', offset: 1 },
        ],
        { duration: 460, easing: 'cubic-bezier(.16,1,.3,1)' }
      );
    });
  }

  /* ── guest card ──────────────────────────────────────────────── */

  function openCard() {
    fillRoomSelect();
    const start = state.room && state.room.price != null ? state.room : BOOKABLE[0];
    $('fRoom').value = start.id;

    if (!$('fIn').value) $('fIn').value = todayISO(0);
    if (!$('fOut').value) $('fOut').value = todayISO(1);
    $('fIn').min = todayISO(0);
    $('fOut').min = todayISO(1);

    show('card');
    recalc();
  }

  function recalc() {
    const room = roomById($('fRoom').value) || BOOKABLE[0];
    const n = nightsBetween($('fIn').value, $('fOut').value);

    renderDigits($('dNights'), n ? String(n) : '0', 'nights');
    const total = room.price != null && n ? room.price * n : null;
    renderDigits($('dTotal'), total == null ? '—' : money(total) + ' ' + t().som, 'total');

    $('stubBody').textContent = buildMessage();
    $('gVal').textContent = String(state.guests);
    $('gMinus').disabled = state.guests <= 1;
    $('gPlus').disabled = state.guests >= MAX_GUESTS;
    $('stampDate').textContent = humanDate($('fIn').value);
  }

  /* The exact text the hotel owner will receive — visible before sending. */
  function buildMessage() {
    const s = t();
    const room = roomById($('fRoom').value) || BOOKABLE[0];
    const n = nightsBetween($('fIn').value, $('fOut').value);
    const total = room.price != null && n ? room.price * n : null;
    const lines = [
      `${s.msgRoom}: ${roomTitle(room)}`,
      `${s.msgIn}: ${humanDate($('fIn').value)}`,
      `${s.msgOut}: ${humanDate($('fOut').value)}`,
      `${s.msgNights}: ${n || '—'}`,
      `${s.msgGuests}: ${state.guests}`,
      `${s.msgName}: ${$('fName').value.trim() || '—'}`,
      `${s.msgPhone}: ${$('fPhone').value.trim() || '—'}`,
    ];
    if (total != null) lines.push(`${s.msgTotal}: ${money(total)} ${s.som}`);
    return lines.join('\n');
  }

  function validate() {
    const s = t();
    let ok = true;

    const mark = (inputs, errEl, msg) => {
      const bad = !!msg;
      if (bad) ok = false;
      errEl.textContent = msg || '';
      errEl.hidden = !bad;
      for (const input of inputs) {
        input.closest('.field').classList.toggle('is-bad', bad);
        input.setAttribute('aria-invalid', bad ? 'true' : 'false');
        if (bad) input.setAttribute('aria-describedby', errEl.id);
        else input.removeAttribute('aria-describedby');
      }
    };

    mark([$('fName')], $('errName'),
      $('fName').value.trim().length < 2 ? s.errName : null);

    mark([$('fPhone')], $('errPhone'),
      $('fPhone').value.replace(/\D/g, '').length < 12 ? s.errPhone : null);

    // Clear both date fields first: mark() only resets the inputs handed to it,
    // so flagging one would otherwise leave the other stuck red from a previous
    // attempt while the message on screen talks about a different field.
    const inV = $('fIn').value, outV = $('fOut').value;
    mark([$('fIn'), $('fOut')], $('errDate'), null);
    const nights = nightsBetween(inV, outV);
    if (!inV) mark([$('fIn')], $('errDate'), s.errIn);
    else if (inV < todayISO(0)) mark([$('fIn')], $('errDate'), s.errPast);
    else if (nights < 1) mark([$('fOut')], $('errDate'), s.errOut);
    // MAX_NIGHTS mirrors bot.py. Without it the card happily totals a 122-night
    // stay and the bot answers "dates are wrong" without ever saying why.
    else if (nights > MAX_NIGHTS) mark([$('fOut')], $('errDate'), s.errTooLong(MAX_NIGHTS));

    return ok;
  }

  function submit(e) {
    e.preventDefault();
    $('errSend').hidden = true;   // stale from a previous failed send
    if (!validate()) {
      haptic('error');
      document.querySelector('.err:not([hidden])')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }

    const room = roomById($('fRoom').value) || BOOKABLE[0];
    const n = nightsBetween($('fIn').value, $('fOut').value);
    const payload = {
      v: 1,
      lang: state.lang,
      room_id: room.id,
      room_label: roomTitle(room),
      price: room.price,
      check_in: $('fIn').value,
      check_out: $('fOut').value,
      nights: n,
      guests: state.guests,
      name: $('fName').value.trim(),
      phone: $('fPhone').value.trim(),
      total: room.price != null ? room.price * n : null,
      text: buildMessage(),
    };

    const btn = $('sendBtn');
    btn.disabled = true;
    $('sendBtnText').textContent = t().sending;

    if (inTelegram && typeof tg.sendData === 'function') {
      // Telegram caps sendData at 4096 bytes and throws past it. Uncaught, the
      // send button would stay disabled on "sending…" with nothing on screen to
      // say the request never left.
      try {
        tg.sendData(JSON.stringify(payload));
      } catch (sendErr) {
        haptic('error');
        btn.disabled = false;
        $('sendBtnText').textContent = t().send;
        const banner = $('errSend');
        banner.textContent = t().errSend;
        banner.hidden = false;
        banner.scrollIntoView({ behavior: 'smooth', block: 'center' });
        return;
      }
      haptic('success');
      // Telegram closes the Mini App itself; this only shows if it does not.
      setTimeout(() => finish(), 900);
    } else {
      finish();
    }
  }

  function finish() {
    $('doneText').textContent = t().sent;
    $('done').hidden = false;
  }

  /* ── layers ──────────────────────────────────────────────────── */

  const stack = [];
  const FOCUSABLE = 'a[href], button:not([disabled]), input, select, textarea, [tabindex]:not([tabindex="-1"])';

  /* Layers are modal, so the layers underneath must actually leave the tab
     order — aria-modal alone does not do that. */
  function setInert(name) {
    const top = name ? $(name) : null;
    for (const el of [$('board'), $('sheet'), $('card')]) {
      const active = el === top;
      if (!name && el.id === 'board') { el.removeAttribute('inert'); continue; }
      if (active) el.removeAttribute('inert');
      else el.setAttribute('inert', '');
    }
    if (!name) { $('sheet').setAttribute('inert', ''); $('card').setAttribute('inert', ''); }
  }

  function show(name) {
    const el = $(name);
    stack.push({ name, from: document.activeElement });
    el.hidden = false;
    void el.offsetWidth;
    el.classList.add('is-on');
    $('scrim').hidden = false;
    void $('scrim').offsetWidth;
    $('scrim').classList.add('is-on');
    document.body.classList.add('is-over', 'is-locked');
    setInert(name);
    // Focus the dialog itself, not its close button: assistive tech then reads
    // the layer's title instead of announcing "Yopish" as the whole context.
    el.focus({ preventScroll: true });
    syncBack();
  }

  function pop() {
    const layer = stack.pop();
    if (!layer) return;
    const el = $(layer.name);
    el.classList.remove('is-on');
    setTimeout(() => { if (!el.classList.contains('is-on')) el.hidden = true; }, 420);
    if (!stack.length) {
      $('scrim').classList.remove('is-on');
      setTimeout(() => { if (!stack.length) $('scrim').hidden = true; }, 380);
      document.body.classList.remove('is-over', 'is-locked');
    }
    setInert(stack.length ? stack[stack.length - 1].name : null);
    if (!stack.length && state.sourceTag) {
      state.sourceTag.classList.remove('is-lifted');   // the key goes back on its hook
      state.sourceTag = null;
    }
    if (layer.from && document.contains(layer.from)) layer.from.focus({ preventScroll: true });
    syncBack();
  }

  /* Tab must not walk out of the top layer even where `inert` is unsupported. */
  function trapTab(e) {
    if (e.key !== 'Tab' || !stack.length) return;
    const el = $(stack[stack.length - 1].name);
    const items = [...el.querySelectorAll(FOCUSABLE)].filter((n) => n.offsetParent !== null);
    if (!items.length) return;
    const first = items[0], last = items[items.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  }

  function syncBack() {
    if (!inTelegram || !tg.BackButton) return;
    if (stack.length) tg.BackButton.show();
    else tg.BackButton.hide();
  }

  function haptic(kind) {
    if (!inTelegram || !tg.HapticFeedback) return;
    try {
      if (kind === 'success' || kind === 'error') tg.HapticFeedback.notificationOccurred(kind);
      else tg.HapticFeedback.impactOccurred(kind);
    } catch (_) { /* older clients */ }
  }

  function toast(msg) {
    const el = $('toast');
    el.textContent = msg;
    el.classList.add('is-on');
    clearTimeout(toast._t);
    toast._t = setTimeout(() => el.classList.remove('is-on'), 2200);
  }

  /* ── language ────────────────────────────────────────────────── */

  function applyLang() {
    const s = t();
    document.body.dataset.lang = state.lang;
    document.documentElement.lang = state.lang;
    storeLang(state.lang);

    $('boardNote').textContent = s.boardNote;
    $('addrLabel').textContent = s.addressLabel;
    $('addrText').textContent = HOTEL.address[state.lang];
    $('mapBtnText').textContent = s.showOnMap;
    $('bookBtnText').textContent = s.book;
    $('cardTitle').textContent = s.formTitle;
    $('cardLead').textContent = s.formLead;
    $('lRoom').textContent = s.fRoom;
    $('lIn').textContent = s.fIn;
    $('lOut').textContent = s.fOut;
    $('lGuests').textContent = s.fGuests;
    $('lName').textContent = s.fName;
    $('lPhone').textContent = s.fPhone;
    $('fName').placeholder = s.fNamePh;
    $('lNights').textContent = s.nights;
    $('lTotal').textContent = s.total;
    $('totalNote').textContent = s.totalNote;
    $('stubTitle').textContent = s.stubTitle;
    $('sendBtnText').textContent = s.send;
    $('sheetClose').setAttribute('aria-label', s.close);
    $('cardClose').setAttribute('aria-label', s.close);
    $('gMinus').setAttribute('aria-label', s.fewerGuests);
    $('gPlus').setAttribute('aria-label', s.moreGuests);
    $('stampLabel').textContent = s.stampLabel;
    $('addrText').setAttribute('aria-label', s.addressLabel + ': ' + HOTEL.address[state.lang]);

    const notice = $('notice');
    notice.hidden = inTelegram;
    if (!inTelegram) notice.textContent = s.outsideTg;

    state.lastDigits = {};
    // renderBoard() replaces every tag node, so the one we lifted is now detached.
    // Re-point at the rebuilt tag for the open room instead of leaving pop() to
    // un-lift an orphan while the new tag sits on its hook.
    const liftedId = state.sourceTag && state.room ? state.room.id : null;
    renderBoard();
    if (liftedId) {
      state.sourceTag = document.querySelector(`[data-id="${liftedId}"] .tag`);
      if (state.sourceTag) state.sourceTag.classList.add('is-lifted');
    }
    if (state.room) {
      $('sheetTitle').textContent = roomTitle(state.room);
      $('sheetPrice').textContent = priceLine(state.room);
      if (state.room.shared) $('sheetNote').textContent = s[state.room.noteKey];
    }
    if (stack.some((l) => l.name === 'card')) {
      const keep = $('fRoom').value;
      fillRoomSelect();
      $('fRoom').value = keep;
      recalc();
    }
  }

  function fillRoomSelect() {
    const sel = $('fRoom');
    sel.textContent = '';
    for (const r of BOOKABLE) {
      const o = document.createElement('option');
      o.value = r.id;
      o.textContent = roomTitle(r) + (r.price == null ? '' : ' — ' + money(r.price) + ' ' + t().som);
      sel.appendChild(o);
    }
  }

  /* ── wiring ──────────────────────────────────────────────────── */

  function init() {
    if (inTelegram) {
      tg.ready();
      tg.expand();
      try {
        tg.setHeaderColor('#1B120E');
        tg.setBackgroundColor('#1B120E');
      } catch (_) { /* Bot API < 6.1 */ }
      if (tg.BackButton) tg.BackButton.onClick(pop);
      if (tg.enableClosingConfirmation) tg.enableClosingConfirmation();
      const u = tg.initDataUnsafe && tg.initDataUnsafe.user;
      if (u) {
        const full = [u.first_name, u.last_name].filter(Boolean).join(' ');
        if (full) $('fName').value = full;
        if (u.language_code === 'ru' && !storedLang()) state.lang = 'ru';
      }
    }

    applyLang();

    $('langsw').addEventListener('click', () => {
      state.lang = state.lang === 'uz' ? 'ru' : 'uz';
      haptic('light');
      applyLang();
    });

    $('mapBtn').addEventListener('click', () => {
      const url = `https://maps.google.com/?q=${HOTEL.lat},${HOTEL.lon}`;
      if (inTelegram && tg.openLink) tg.openLink(url);
      else window.open(url, '_blank', 'noopener');
    });

    $('addrText').addEventListener('click', async () => {
      try {
        await navigator.clipboard.writeText(HOTEL.address[state.lang]);
        toast(t().copied);
      } catch (_) { /* clipboard unavailable */ }
    });

    $('sheetClose').addEventListener('click', pop);
    $('cardClose').addEventListener('click', pop);
    $('scrim').addEventListener('click', pop);
    $('bookBtn').addEventListener('click', openCard);

    $('gMinus').addEventListener('click', () => { state.guests = Math.max(1, state.guests - 1); haptic('light'); recalc(); });
    $('gPlus').addEventListener('click', () => { state.guests = Math.min(MAX_GUESTS, state.guests + 1); haptic('light'); recalc(); });

    for (const id of ['fRoom', 'fIn', 'fOut', 'fName', 'fPhone']) {
      $(id).addEventListener('input', () => {
        if (id === 'fIn') $('fOut').min = todayISO(0) > $('fIn').value ? todayISO(1) : nextDay($('fIn').value);
        recalc();
      });
      $(id).addEventListener('change', recalc);
    }

    $('fPhone').addEventListener('focus', () => {
      if (!$('fPhone').value.trim()) $('fPhone').value = '+998 ';
    });

    $('form').addEventListener('submit', submit);

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && stack.length) pop();
      else trapTab(e);
    });

    setInert(null);
  }

  function nextDay(iso) {
    const d = new Date(iso + 'T12:00:00');
    d.setDate(d.getDate() + 1);
    return d.toISOString().slice(0, 10);
  }

  document.addEventListener('DOMContentLoaded', init);
})();
