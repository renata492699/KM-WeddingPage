/* ═══════════════════════════════════════════════════
   KM Wedding Page — gifts.js
   Firebase Firestore gift reservation list
   ═══════════════════════════════════════════════════ */

/* ─── Firebase config ──────────────────────────────────────────────────────
   Nahraďte hodnotami z Firebase Console → Nastavení projektu → Webová aplikace
   Replace with values from Firebase Console → Project settings → Web app
   ─────────────────────────────────────────────────────────────────────────── */
const FIREBASE_CONFIG = {
  apiKey: "AIzaSyDRVrSgKPViH7CSEgY1wQUBcvwBxUlhy4o",
  authDomain: "klarkamatejweb.firebaseapp.com",
  projectId: "klarkamatejweb",
  storageBucket: "klarkamatejweb.firebasestorage.app",
  messagingSenderId: "537018599098",
  appId: "1:537018599098:web:bd5c3075e3263ab08be483",
  measurementId: "G-8RBMGWNQ5N"
};

const isConfigured = !FIREBASE_CONFIG.apiKey.startsWith('YOUR_');

const USE_MOCK = false; // set to false to load real data from Firebase

/* db and Firestore helpers are loaded lazily on first open */
let db             = null;
let _collection, _getDocs, _doc, _updateDoc, _query, _orderBy;


/* ─── DOM refs ─── */
const giftsList = document.getElementById('gifts-list');


/* ─── Mock data (used only when page is opened via file://) ─── */

const MOCK_GIFTS = [
  { id: 'm1', name: 'Kávový mlýnek',       url: 'https://example.com', taken: false, takenBy: '', order: 1 },
  { id: 'm2', name: 'Sada ručníků',         url: '',                    taken: true,  takenBy: 'Jana Nováková', order: 2 },
  { id: 'm3', name: 'Vývrtka a dekantér',   url: 'https://example.com', taken: false, takenBy: '', order: 3 },
  { id: 'm4', name: 'Pikniková deka',        url: '',                    taken: false, takenBy: '', order: 4 },
  { id: 'm5', name: 'Dárková poukázka',      url: '',                    taken: true,  takenBy: 'Tomáš Veselý', order: 5 },
];

function renderGiftData(gifts) {
  const available = gifts.filter(g => !g.taken).length;
  giftsList.innerHTML = '';

  if (USE_MOCK) {
    const notice = document.createElement('p');
    notice.className   = 'gifts-mock-notice';
    notice.textContent = '⚠ Náhled (testovací data) – otevřete přes server pro načtení skutečného seznamu';
    giftsList.appendChild(notice);
  }

  const counter = document.createElement('p');
  counter.className   = 'gifts-counter';
  counter.textContent = counterText(available, gifts.length);
  giftsList.appendChild(counter);

  gifts.forEach(gift => giftsList.appendChild(renderCard(gift)));
}


/* ─── Load gifts from Firestore ─── */

async function initFirebase() {
  if (db) return true;
  try {
    const { initializeApp }                                = await import('https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js');
    const { getFirestore, collection, getDocs, doc,
            updateDoc, query, orderBy }                    = await import('https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js');
    db         = getFirestore(initializeApp(FIREBASE_CONFIG));
    _collection = collection;
    _getDocs    = getDocs;
    _doc        = doc;
    _updateDoc  = updateDoc;
    _query      = query;
    _orderBy    = orderBy;
    return true;
  } catch {
    return false;
  }
}

async function loadGifts() {
  giftsList.innerHTML = `
    <div class="gifts-loading">
      <span class="material-symbols-outlined ms-spin" aria-hidden="true">progress_activity</span>
      <span>Načítám seznam…</span>
    </div>`;

  if (USE_MOCK) {
    renderGiftData(MOCK_GIFTS);
    return;
  }

  if (!isConfigured) {
    giftsList.innerHTML = `
      <div class="gifts-setup">
        <span class="material-symbols-outlined" aria-hidden="true">settings</span>
        <p>Firebase zatím není nastaveno.<br>Vyplňte konfiguraci v souboru <code>gifts.js</code>.</p>
      </div>`;
    return;
  }

  if (!await initFirebase()) {
    giftsList.innerHTML = `
      <div class="gifts-error">
        <span class="material-symbols-outlined" aria-hidden="true">warning</span>
        <span>Nepodařilo se načíst seznam přání. Zkontrolujte připojení k internetu.</span>
      </div>`;
    return;
  }

  try {
    const snapshot = await _getDocs(_query(_collection(db, 'gifts'), _orderBy('order')));

    if (snapshot.empty) {
      giftsList.innerHTML = `<p class="gifts-empty">Seznam přání je zatím prázdný.</p>`;
      return;
    }

    const gifts = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
    renderGiftData(gifts);
  } catch {
    giftsList.innerHTML = `
      <div class="gifts-error">
        <span class="material-symbols-outlined" aria-hidden="true">warning</span>
        <span>Nepodařilo se načíst seznam přání.</span>
      </div>`;
  }
}


/* ─── Render one gift card ─── */

function renderCard(gift) {
  const card = document.createElement('div');
  card.className  = `gift-card${gift.taken ? ' taken' : ''}`;
  card.dataset.id = gift.id;

  card.innerHTML = `
    <div class="gift-info">
      ${nameHtml(gift)}
      ${statusHtml(gift)}
    </div>`;

  if (gift.taken) {
    wireUnreserve(gift, card);
  } else {
    const btn   = card.querySelector('.btn-reserve');
    const input = card.querySelector('.gift-name-input');
    btn.addEventListener('click', () => reserveGift(gift, card, input, btn));
    input.addEventListener('keydown', e => {
      if (e.key === 'Enter') reserveGift(gift, card, input, btn);
    });
  }

  return card;
}

function nameHtml(gift) {
  return gift.url
    ? `<a href="${esc(gift.url)}" target="_blank" rel="noopener noreferrer" class="gift-name">${esc(gift.name)} <span class="material-symbols-outlined" aria-hidden="true">open_in_new</span></a>`
    : `<span class="gift-name">${esc(gift.name)}</span>`;
}

function statusHtml(gift) {
  if (gift.taken) {
    return `<div class="gift-status taken">
      <span class="material-symbols-outlined" aria-hidden="true">check_circle</span>
      <span>Rezervováno</span>
      <button class="btn-unreserve" aria-label="Zrušit rezervaci dárku ${esc(gift.name)}">Zrušit</button>
    </div>`;
  }
  return `<div class="gift-reserve-form">
    <input type="text" class="gift-name-input" placeholder="Vaše jméno" maxlength="60"
           aria-label="Vaše jméno pro rezervaci: ${esc(gift.name)}">
    <button class="btn-reserve">Rezervovat</button>
  </div>`;
}


/* ─── Reserve a gift ─── */

async function reserveGift(gift, card, input, btn) {
  const name = input.value.trim();

  if (!name) {
    input.focus();
    input.classList.add('shake');
    setTimeout(() => input.classList.remove('shake'), 400);
    return;
  }

  btn.disabled   = true;
  input.disabled = true;
  btn.innerHTML  = '<span class="material-symbols-outlined ms-spin" aria-hidden="true">progress_activity</span>';

  try {
    await _updateDoc(_doc(db, 'gifts', gift.id), { taken: true, takenBy: name });

    const takenGift = { ...gift, taken: true, takenBy: name };
    card.classList.add('taken');
    card.querySelector('.gift-info').innerHTML = `
      ${nameHtml(gift)}
      <div class="gift-status taken">
        <span class="material-symbols-outlined" aria-hidden="true">check_circle</span>
        <span>Rezervováno</span>
        <button class="btn-unreserve" aria-label="Zrušit rezervaci dárku ${esc(gift.name)}">Zrušit</button>
      </div>`;

    wireUnreserve(takenGift, card);
    updateCounter();
  } catch {
    btn.disabled   = false;
    input.disabled = false;
    btn.textContent = 'Rezervovat';

    card.querySelector('.gift-err')?.remove();
    const err = document.createElement('p');
    err.className   = 'gift-err';
    err.textContent = 'Nepodařilo se rezervovat. Zkuste to prosím znovu.';
    card.querySelector('.gift-reserve-form').appendChild(err);
    setTimeout(() => err.remove(), 4000);
  }
}


/* ─── Unreserve a gift ─── */

function wireUnreserve(gift, card) {
  const btn = card.querySelector('.btn-unreserve');
  if (!btn) return;
  btn.addEventListener('click', () => showUnreserveConfirm(gift, card));
}

function showUnreserveConfirm(gift, card) {
  const status = card.querySelector('.gift-status.taken');
  status.innerHTML = `
    <span class="material-symbols-outlined" aria-hidden="true">help</span>
    <span>Opravdu zrušit rezervaci?</span>
    <div class="gift-confirm-btns">
      <button class="btn-confirm-yes">Ano</button>
      <button class="btn-confirm-no">Ne</button>
    </div>`;

  status.querySelector('.btn-confirm-yes').addEventListener('click', () => unreserveGift(gift, card));
  status.querySelector('.btn-confirm-no').addEventListener('click',  () => restoreStatus(gift, card));
}

function restoreStatus(gift, card) {
  card.querySelector('.gift-status.taken').innerHTML = `
    <span class="material-symbols-outlined" aria-hidden="true">check_circle</span>
    <span>Rezervováno</span>
    <button class="btn-unreserve" aria-label="Zrušit rezervaci dárku ${esc(gift.name)}">Zrušit</button>`;
  wireUnreserve(gift, card);
}

async function unreserveGift(gift, card) {
  const status = card.querySelector('.gift-status.taken');
  status.innerHTML = `
    <span class="material-symbols-outlined ms-spin" aria-hidden="true">progress_activity</span>
    <span>Ruším rezervaci…</span>`;

  try {
    await _updateDoc(_doc(db, 'gifts', gift.id), { taken: false, takenBy: '' });

    const freeGift = { ...gift, taken: false, takenBy: '' };
    card.classList.remove('taken');
    card.querySelector('.gift-info').innerHTML = `
      ${nameHtml(freeGift)}
      <div class="gift-reserve-form">
        <input type="text" class="gift-name-input" placeholder="Vaše jméno" maxlength="60"
               aria-label="Vaše jméno pro rezervaci: ${esc(gift.name)}">
        <button class="btn-reserve">Rezervovat</button>
      </div>`;

    const btn   = card.querySelector('.btn-reserve');
    const input = card.querySelector('.gift-name-input');
    btn.addEventListener('click', () => reserveGift(freeGift, card, input, btn));
    input.addEventListener('keydown', e => {
      if (e.key === 'Enter') reserveGift(freeGift, card, input, btn);
    });

    updateCounter();
  } catch {
    restoreStatus(gift, card);

    const errEl = document.createElement('p');
    errEl.className   = 'gift-err';
    errEl.textContent = 'Nepodařilo se zrušit rezervaci. Zkuste to prosím znovu.';
    card.querySelector('.gift-reserve-form, .gift-status')?.after(errEl);
    setTimeout(() => errEl.remove(), 4000);
  }
}


/* ─── Helpers ─── */

function updateCounter() {
  const counter   = giftsList.querySelector('.gifts-counter');
  if (!counter) return;
  const all       = giftsList.querySelectorAll('.gift-card').length;
  const available = giftsList.querySelectorAll('.gift-card:not(.taken)').length;
  counter.textContent = counterText(available, all);
}

function counterText(available, total) {
  if (available === 0) return 'Všechny dárky jsou již rezervovány 🎉';
  return `${available} z ${total} dárků je stále volných`;
}

function esc(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

loadGifts();
