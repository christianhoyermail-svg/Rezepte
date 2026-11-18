'use strict';

/* ============================================================
   Daten & Speicherung (localStorage im Browser)
   ============================================================ */
const STORAGE_KEY = 'rezepteapp.v1';
// Index = Date.getDay() (0 = Sonntag)
const WEEKDAYS = ['Sonntag', 'Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag'];
const WD_SHORT = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'];
const MAX_PLAN_DAYS = 31;
const MEALS = { mittag: '☀️ Mittagessen', abend: '🌙 Abendessen' };
const CATEGORIES = { kochen: 'Kochen', backen: 'Backen' };

function defaultState() {
  return {
    recipes: [],
    // { 'YYYY-MM-DD': { mittag: { recipeId, locked, active? }, abend: { … } } }
    // active fehlt = Standard (Abendessen immer, Mittagessen an settings.lunchDays)
    days: {},
    // Einkaufslisten pro Zeitraum: { 'start|end': { checked: [key], extra: [{ id, text }] } }
    shopping: {},
    settings: {
      planCategory: 'kochen',
      planStartDay: 3, planEndDay: 2, // Mittwoch bis Dienstag
      lunchDays: [6, 0],              // Mittagessen standardmäßig Sa + So
    },
    seeded: false,
  };
}

// Altes Format (Pläne pro Kalenderwoche ab Montag) in Einträge pro Datum umwandeln
function migratePlans(plans) {
  const days = {};
  Object.entries(plans || {}).forEach(([monday, p]) => (p.days || []).forEach((d, i) => {
    if (d.recipeId || d.locked) days[shiftIso(monday, i)] = { recipeId: d.recipeId, locked: !!d.locked };
  }));
  return days;
}

// Altes Format { recipeId, locked } pro Tag wird zum Abendessen
function normalizeDays(days) {
  const out = {};
  Object.entries(days || {}).forEach(([iso, d]) => {
    out[iso] = d && !d.mittag && !d.abend && ('recipeId' in d || 'locked' in d)
      ? { abend: { recipeId: d.recipeId || null, locked: !!d.locked } }
      : d;
  });
  return out;
}

function load() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultState();
    const s = Object.assign(defaultState(), JSON.parse(raw));
    s.settings = Object.assign(defaultState().settings, s.settings);
    s.days = normalizeDays(Object.assign(migratePlans(s.plans), s.days));
    delete s.plans;
    return s;
  } catch (e) {
    return defaultState();
  }
}

let state = load();

/* Beispielbilder (Wikimedia Commons, freie Lizenzen) – per Rezept-ID oder Titel.
   Werden nur gesetzt, wenn ein Rezept noch nie ein Bildfeld hatte. */
const COMMONS = f => `https://commons.wikimedia.org/wiki/Special:FilePath/${encodeURIComponent(f)}?width=640`;
const DEFAULT_IMAGES = {
  'Spaghetti Bolognese': 'Spaghetti Bolognese.jpg',
  'Gemüsecurry': 'Mixed vegetable curry 1.jpg',
  'Bananenbrot': 'Banana bread slices.jpg',
  'bfb-w1-mo': 'Vegan patties with potatoes and salad.jpg',
  'bfb-w1-di': '2023-01-20 Turkish pide.jpg',
  'bfb-w1-mi': 'CreamSauceWithCarrot.jpg',
  'bfb-w1-do': 'Peas Pilaf And Basmati Rice - The Indismart Hotel - Salt Lake City - Kolkata 2023-09-10 5202.jpg',
  'bfb-w1-fr': 'Kartoffelgulasch 02.jpg',
  'bfb-w2-mo': 'Asparagus quiche, Marienthal.jpg',
  'bfb-w2-di': 'Polenta al horno - Backed Polenta (6322521114).jpg',
  'bfb-w2-mi': 'Schupfnudeln aus Roggenmehl in Salbeibutter.01.jpg',
  'bfb-w2-do': 'BroccoliPasta.jpg',
  'bfb-w2-fr': 'Homemade Lentil Soup - Lavash 2025-02-10.jpg',
  'bfb-w3-mo': 'Neapolitan pizza with crab and asparagus.jpg',
  'bfb-w3-di': 'Gnocchi al pomodoro.JPG',
  'bfb-w3-mi': 'Broccoli and Potato dish with Indian seasoning in Paulínia, 2023-10-17.jpg',
  'bfb-w3-do': 'Grilled Broccoli & Cauliflower Pasta (3825172428).jpg',
  'bfb-w3-fr': 'Red lentil curry soup.jpg',
  'bfb-w4-mo': 'Frittata02.jpg',
  'bfb-w4-di': 'MashedPotatoes.jpg',
  'bfb-w4-mi': 'Pizza with zucchini flowers and mozzarella.jpg',
  'bfb-w4-do': 'Smokey Millet Super Grain Bowl With Crispy Tofu.jpg',
  'bfb-w4-fr': 'Eggplant Lasagna (Vegitarian) (6 of 6).jpg',
};

function applyDefaultImages() {
  let changed = false;
  state.recipes.forEach(r => {
    if ('image' in r) return;
    const f = DEFAULT_IMAGES[r.id] || DEFAULT_IMAGES[r.title];
    r.image = f ? COMMONS(f) : '';
    changed = true;
  });
  return changed;
}

function save() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (e) {
    toast('Speichern fehlgeschlagen: ' + e.message);
  }
}

function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

// Beispielrezepte beim allerersten Start, damit der Wochenplan direkt ausprobiert werden kann
if (!state.seeded) {
  const ex = (title, category, servings, prep, total, ingredients, steps, tags) => ({
    id: uid(), title, category, servings, prepTime: prep, totalTime: total,
    ingredients, steps, tags, notes: '', createdAt: new Date().toISOString(),
  });
  state.recipes.push(
    ex('Spaghetti Bolognese', 'kochen', 4, 15, 45,
      ['400 g Spaghetti', '500 g Rinderhack', '1 Zwiebel', '1 Karotte', '1 Dose gehackte Tomaten (400 g)', '2 EL Tomatenmark', 'Salz, Pfeffer, Oregano'],
      ['Zwiebel und Karotte fein hacken.', 'Hackfleisch anbraten, Gemüse dazugeben und mitbraten.', 'Tomatenmark und Tomaten zugeben, 30 Minuten köcheln lassen und abschmecken.', 'Spaghetti nach Packungsanweisung kochen und mit der Soße servieren.'],
      ['Pasta']),
    ex('Gemüsecurry', 'kochen', 4, 15, 35,
      ['1 Dose Kokosmilch (400 ml)', '2 EL rote Currypaste', '1 Paprika', '1 Zucchini', '200 g Kichererbsen', '250 g Reis'],
      ['Reis kochen.', 'Currypaste in etwas Öl anrösten, Gemüse dazugeben.', 'Mit Kokosmilch ablöschen, Kichererbsen zugeben und 15 Minuten köcheln lassen.'],
      ['Vegetarisch']),
    ex('Bananenbrot', 'backen', 1, 15, 75,
      ['3 reife Bananen', '2 Eier', '80 g Butter, geschmolzen', '100 g Zucker', '250 g Mehl', '1 Pck. Backpulver', '1 Prise Salz'],
      ['Ofen auf 175 °C Ober-/Unterhitze vorheizen.', 'Bananen zerdrücken und mit Eiern, Butter und Zucker verrühren.', 'Mehl, Backpulver und Salz unterheben.', 'In eine gefettete Kastenform füllen und ca. 60 Minuten backen.'],
      ['Kuchen']),
  );
  state.seeded = true;
  save();
}
if (applyDefaultImages()) save();

/* ============================================================
   Hilfsfunktionen
   ============================================================ */
const app = document.getElementById('app');

function esc(s) {
  return String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

let toastTimer;
function toast(msg) {
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('show'), 2500);
}

function download(filename, content, type) {
  const blob = new Blob([content], { type });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

async function copyText(text, msg = 'In die Zwischenablage kopiert') {
  try {
    await navigator.clipboard.writeText(text);
  } catch (e) {
    const ta = document.createElement('textarea');
    ta.value = text;
    document.body.appendChild(ta);
    ta.select();
    document.execCommand('copy');
    ta.remove();
  }
  toast(msg);
}

function lines(text) {
  return String(text || '').split('\n').map(l => l.trim()).filter(Boolean);
}

function getRecipe(id) {
  return state.recipes.find(r => r.id === id);
}

// Datumsfunktionen (lokale Zeit)
function isoDate(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
function parseIso(s) {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d);
}
function addDays(d, n) {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}
function shiftIso(iso, n) {
  return isoDate(addDays(parseIso(iso), n));
}
function shortDate(d) {
  return `${String(d.getDate()).padStart(2, '0')}.${String(d.getMonth() + 1).padStart(2, '0')}.`;
}

/* ============================================================
   Navigation
   ============================================================ */
let view = { name: 'list' };
let listFilter = { q: '', cat: 'alle', fav: false };
let planRange = null; // { start, end } als 'YYYY-MM-DD'

function go(v) {
  view = v;
  render();
  window.scrollTo(0, 0);
}

function render() {
  ({ list: renderList, detail: renderDetail, edit: renderEditor, plan: renderPlan, shop: renderShop, data: renderData }[view.name])();
}

/** Buchseite mit Seitenleiste (Navigation + Register-Tabs) – für alle Ansichten */
function shell({ kicker, title, body, recipe = null, after = '' }) {
  const n = view.name;
  const nav = (action, ic, label, { active = false, extra = '' } = {}) =>
    `<button data-action="${action}" ${extra} class="${active ? 'active' : ''}" title="${label}" aria-label="${label}">${icon(ic)}</button>`;
  const currentCat = recipe ? recipe.category : n === 'list' ? listFilter.cat : null;
  const tabs = [['alle', 'Alle'], ...Object.entries(CATEGORIES)];
  return `
    <div class="book">
      <article class="page">
        <div class="kicker"><span>${kicker}</span></div>
        ${title}
        <div class="gold-rule"></div>
        ${body}
      </article>
      <nav class="side" aria-label="Navigation">
        <div class="side-inner">
          ${nav('home', 'home', 'Rezepte', { active: n === 'list' })}
          ${n === 'detail' ? nav('back', 'back', 'Zurück') : ''}
          ${n === 'edit' ? nav('cancel-edit', 'back', 'Zurück') : ''}
          ${nav('favs', 'heart', 'Favoriten', { active: n === 'list' && listFilter.fav })}
          ${nav('goplan', 'plan', 'Wochenplan', { active: n === 'plan' })}
          ${nav('goshop', 'cart', 'Einkaufsliste', { active: n === 'shop' })}
          ${recipe ? nav('edit', 'edit', 'Bearbeiten', { extra: `data-id="${recipe.id}"` }) : ''}
          ${recipe ? nav('copy-part', 'copy', 'Ganzes Rezept kopieren', { extra: 'data-part="all"' }) : ''}
          ${nav('godata', 'data', 'Daten', { active: n === 'data' })}
          <div class="side-tabs">
            ${tabs.map(([k, l], i) =>
              `<button class="tab tab-${i} ${currentCat === k ? 'current' : ''}" data-action="cat-go" data-cat="${k}">${l}</button>`).join('')}
          </div>
        </div>
      </nav>
    </div>
    ${after}`;
}

const pageTitle = text => `<h2 class="page-title">${esc(text)}</h2>`;

/** Herz-Schalter zum Markieren als Favorit (liegt auf dem Foto) */
const favButton = r => `
  <button class="fav-btn ${r.favorite ? 'on' : ''}" data-action="fav-toggle" data-id="${r.id}"
    title="${r.favorite ? 'Aus Favoriten entfernen' : 'Zu Favoriten hinzufügen'}" aria-pressed="${!!r.favorite}">${icon('heart', r.favorite ? 'filled' : '')}</button>`;

function listHeading() {
  const cat = listFilter.cat === 'alle' ? '' : CATEGORIES[listFilter.cat];
  if (listFilter.fav) return cat ? `${cat}-Favoriten` : 'Favoriten';
  return cat || 'Meine Rezepte';
}

/* ============================================================
   Rezeptliste
   ============================================================ */
function renderList() {
  app.innerHTML = shell({
    kicker: 'Rezeptbuch',
    title: pageTitle(listHeading()),
    body: `
      <div class="list-tools">
        <input id="search" class="hand-input" type="search" placeholder="Suchen (Titel, Zutat, Tag) …" value="${esc(listFilter.q)}">
        <button class="btn fav-filter ${listFilter.fav ? 'on' : ''}" data-action="favs" aria-pressed="${listFilter.fav}">${icon('heart', listFilter.fav ? 'filled' : '')} Favoriten</button>
        <button class="btn primary" data-action="new">+ Neues Rezept</button>
      </div>
      <div id="results"></div>`,
  });

  document.getElementById('search').addEventListener('input', e => {
    listFilter.q = e.target.value;
    renderResults();
  });
  renderResults();
}

function renderResults() {
  const q = listFilter.q.trim().toLowerCase();
  const list = state.recipes
    .filter(r => listFilter.cat === 'alle' || r.category === listFilter.cat)
    .filter(r => !listFilter.fav || r.favorite)
    .filter(r => !q || [r.title, ...(r.ingredients || []), ...(r.tags || [])].join(' ').toLowerCase().includes(q))
    .sort((a, b) => a.title.localeCompare(b.title, 'de'));

  const el = document.getElementById('results');
  if (!list.length) {
    el.innerHTML = `<div class="empty">${
      !state.recipes.length ? 'Noch keine Rezepte – leg dein erstes an!'
      : listFilter.fav && !q ? `Noch keine ${listHeading()}. Tippe bei einem Rezept auf das Herz ♡, um es zu merken.`
      : 'Keine Treffer.'}</div>`;
    return;
  }
  const noun = listFilter.fav ? (list.length === 1 ? 'Favorit' : 'Favoriten') : (list.length === 1 ? 'Rezept' : 'Rezepte');
  el.innerHTML = `
    <div class="sec-head"><h3>${list.length} ${noun}</h3></div>
    <div class="recipe-grid">
      ${list.map(r => `
      <div class="rcard" role="link" tabindex="0" data-action="open" data-id="${r.id}">
        <div class="photo ${r.image ? '' : 'noimg'}">
          ${r.image ? `<img src="${esc(r.image)}" alt="" loading="lazy" onerror="this.parentNode.classList.add('noimg')">` : ''}
          <div class="photo-ph">${icon('dish')}</div>
          ${favButton(r)}
        </div>
        <div class="rtitle">${esc(r.title)}</div>
        <div class="rmeta">
          ${r.totalTime ? `${icon('clock')}<span>${r.totalTime} Min</span>` : ''}
          ${r.servings ? `${icon('people')}<span>${esc(r.servings)}</span>` : ''}
          <span class="rcat">${CATEGORIES[r.category] || esc(r.category)}</span>
        </div>
      </div>`).join('')}
    </div>`;
}

/* ============================================================
   Rezept-Detail
   ============================================================ */
// Strich-Icons (currentColor) für das Rezeptblatt
const ICONS = {
  prep: '<path d="M3 12h18c0 4.4-4 8-9 8s-9-3.6-9-8z"/><path d="M5 20h14"/><path d="M12 12 19 3"/><path d="M15.2 5.6c1.6-2.4 4.3-3.4 5-2.7s-.4 3.4-2.8 5"/>',
  cook: '<path d="M2 12h14v1.5a4.5 4.5 0 0 1-4.5 4.5h-5A4.5 4.5 0 0 1 2 13.5z"/><path d="M16 13h6"/><path d="M6 3.5c-1 1.2 1 2.3 0 3.5M9.5 3.5c-1 1.2 1 2.3 0 3.5M13 3.5c-1 1.2 1 2.3 0 3.5"/>',
  oven: '<rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 8h18"/><rect x="7" y="11" width="10" height="7" rx="1"/><path d="M7 5.5h.01M10 5.5h.01"/>',
  people: '<circle cx="12" cy="7" r="3"/><path d="M6.5 20v-1.5a5.5 5.5 0 0 1 11 0V20"/><circle cx="5" cy="9" r="2.2"/><path d="M1.5 19v-1a3.8 3.8 0 0 1 4.6-3.7"/><circle cx="19" cy="9" r="2.2"/><path d="M22.5 19v-1a3.8 3.8 0 0 0-4.6-3.7"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3.5 2"/>',
  home: '<path d="M3 11 12 3l9 8"/><path d="M5 9.5V21h5v-6h4v6h5V9.5"/>',
  back: '<path d="M10 6 4 12l6 6"/><path d="M4 12h16"/>',
  plan: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/>',
  edit: '<path d="M4 20h4L19 9l-4-4L4 16z"/><path d="m13.5 6.5 4 4"/>',
  copy: '<rect x="8" y="8" width="12" height="13" rx="2"/><path d="M16 8V5a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v11a2 2 0 0 0 2 2h2"/>',
  cart: '<path d="M2 3h3l2.4 11.2a2 2 0 0 0 2 1.6h8.2a2 2 0 0 0 2-1.5L21 7H6"/><circle cx="10" cy="20" r="1.4"/><circle cx="17" cy="20" r="1.4"/>',
  heart: '<path d="M12 20.3 4.3 12.8a4.9 4.9 0 0 1 6.9-6.9l.8.8.8-.8a4.9 4.9 0 0 1 6.9 6.9z"/>',
  data: '<path d="M5 3h11l3 3v15H5z"/><path d="M8 3v5h7V3"/><rect x="8" y="13" width="8" height="5" rx="1"/>',
  dish: '<path d="M3 15h18"/><path d="M5 15a7 7 0 0 1 14 0"/><path d="M12 6v2"/><path d="M2 18h20"/>',
};
const icon = (name, cls = '') => `<svg class="ico ${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[name]}</svg>`;

// "250 g Mehl" → ["250 g", "Mehl"]; ohne Mengenangabe → ["", Text]
const UNITS = 'kg|g|mg|l|ml|cl|dl|EL|TL|Msp\\.?|Prisen?|Pck\\.?|Päckchen|Packungen?|Dosen?|Bund|Stangen?|Zehen?|Scheiben?|Becher|Gläser|Glas|Handvoll|Stück|Stk\\.?|Tassen?|Zweige?|Blätter|Blatt|Köpfe|Kopf|Knollen?|Würfel|Tropfen|cm';
const AMOUNT_RE = new RegExp(`^((?:[Cc]a\\.\\s*)?[\\d½¼¾⅓⅔][\\d½¼¾⅓⅔.,/–-]*(?:\\s*(?:${UNITS})(?=\\s|$))?)\\s+(.+)$`);
function splitIngredient(s) {
  const m = String(s).match(AMOUNT_RE);
  return m ? [m[1], m[2]] : ['', s];
}

// Bei Wikimedia-Bildern auf die Dateiseite (Lizenz/Urheber) verlinken
function imageCredit(url) {
  const m = String(url || '').match(/commons\.wikimedia\.org\/wiki\/Special:FilePath\/([^?#]+)/);
  return m ? `https://commons.wikimedia.org/wiki/File:${m[1]}` : '';
}

function photoHtml(r) {
  const credit = imageCredit(r.image);
  return `
    <figure class="photo ${r.image ? '' : 'noimg'}">
      ${r.image ? `<img src="${esc(r.image)}" alt="${esc(r.title)}" loading="lazy" onerror="this.parentNode.classList.add('noimg')">` : ''}
      <div class="photo-ph">${icon('dish')}<span>Kein Bild</span></div>
      ${favButton(r)}
      ${credit ? `<figcaption><a href="${esc(credit)}" target="_blank" rel="noopener">Foto: Wikimedia Commons</a></figcaption>` : ''}
    </figure>`;
}

function renderDetail() {
  const r = getRecipe(view.id);
  if (!r) return go({ name: 'list' });
  const cookTime = r.totalTime && r.prepTime ? Math.max(r.totalTime - r.prepTime, 0) : '';
  const fact = (ic, value, unit, label) => `
    <div class="fact" title="${label}">
      ${icon(ic)}
      <span class="fact-val">${value !== '' && value != null ? `${esc(value)} ${unit}` : '–'}</span>
      <span class="fact-label">${label}</span>
    </div>`;

  app.innerHTML = shell({
    kicker: 'Rezept',
    recipe: r,
    title: `<h2 class="page-title copyable" data-action="copy-part" data-part="title" title="Antippen zum Kopieren">${esc(r.title)}</h2>`,
    body: `
        <div class="facts">
          ${fact('prep', r.prepTime, 'MIN', 'Vorbereitung')}
          ${fact(r.category === 'backen' ? 'oven' : 'cook', cookTime, 'MIN', r.category === 'backen' ? 'Backen' : 'Kochen')}
          ${fact('people', r.servings, r.category === 'backen' ? 'Stk.' : 'Pers.', 'Portionen')}
          ${fact('clock', r.totalTime, 'MIN', 'Gesamt')}
        </div>

        <div class="page-top">
          ${photoHtml(r)}
          <section class="ing">
            <div class="sec-head">
              <h3>Zutaten</h3>
              <button class="iconbtn" data-action="copy-part" data-part="ingredients" title="Alle Zutaten kopieren">${icon('copy')}</button>
            </div>
            <ul class="ing-list">
              ${(r.ingredients || []).map((x, i) => {
                const [amt, name] = splitIngredient(x);
                return `<li class="copyable" data-action="copy-item" data-part="ingredients" data-index="${i}"><span class="amt">${esc(amt)}</span><span class="name">${esc(name)}</span></li>`;
              }).join('')}
              <li class="blank"></li>
            </ul>
          </section>
        </div>

        <section class="prep">
          <div class="sec-head">
            <h3>Zubereitung</h3>
            <button class="iconbtn" data-action="copy-part" data-part="steps" title="Alle Schritte kopieren">${icon('copy')}</button>
          </div>
          <div class="lined">
            ${(r.steps || []).map((x, i) =>
              `<p class="copyable" data-action="copy-item" data-part="steps" data-index="${i}">${esc(x)}</p>`).join('')}
            <p class="blank"></p>
          </div>
        </section>

        ${r.notes ? `
        <section class="prep">
          <div class="sec-head"><h3>Notizen</h3></div>
          <div class="lined">${lines(r.notes).map(n => `<p>${esc(n)}</p>`).join('')}</div>
        </section>` : ''}

        ${(r.tags || []).length ? `<div class="page-tags">${r.tags.map(t => `<span>#${esc(t)}</span>`).join('')}</div>` : ''}`,
    after: `
    <h3>In Cookidoo als eigene Kreation speichern</h3>
    <div class="panel">
      <ol class="meta" style="padding-left:20px;margin:0">
        <li>In Cookidoo: <b>Meine Rezepte → Kreationen → Rezept erstellen</b>.</li>
        <li>Name, Portionen und Zeiten übernehmen (<b>Titel antippen</b> kopiert den Namen).</li>
        <li>Zutaten: Kopier-Symbol neben „Zutaten“ und einfügen – oder einzeln: <b>auf eine Zeile tippen</b> kopiert genau diese Zutat.</li>
        <li>Zubereitung: jeden Schritt antippen und in einen eigenen Schritt in Cookidoo einfügen.</li>
      </ol>
      <div class="row" style="margin-top:10px">
        <button class="btn" data-action="copy-part" data-part="all">📋 Ganzes Rezept als Text</button>
      </div>
    </div>

    <div class="row" style="margin-top:20px">
      <button class="btn danger" data-action="delete" data-id="${r.id}">Rezept löschen</button>
    </div>`,
  });
}

/* ============================================================
   Rezept-Editor
   ============================================================ */
function renderEditor() {
  const r = view.id ? getRecipe(view.id) : null;
  const v = r || { title: '', category: 'kochen', servings: 4, prepTime: '', totalTime: '', ingredients: [], steps: [], tags: [], notes: '', image: '' };
  app.innerHTML = shell({
    kicker: r ? 'Rezept bearbeiten' : 'Neues Rezept',
    title: pageTitle(r ? r.title : 'Neues Rezept'),
    body: `
    <form id="recipe-form">
      <label for="f-title">Titel *</label>
      <input id="f-title" name="title" required value="${esc(v.title)}">

      <label for="f-image">Bild-URL (optional)</label>
      <input id="f-image" name="image" type="url" placeholder="https://…" value="${esc(v.image)}">
      <div class="img-preview">${v.image ? `<img src="${esc(v.image)}" alt="" onerror="this.remove()">` : ''}</div>

      <div class="grid2">
        <div>
          <label for="f-cat">Kategorie</label>
          <select id="f-cat" name="category">
            ${Object.entries(CATEGORIES).map(([k, l]) => `<option value="${k}" ${v.category === k ? 'selected' : ''}>${l}</option>`).join('')}
          </select>
        </div>
        <div>
          <label for="f-serv">Portionen</label>
          <input id="f-serv" name="servings" type="number" min="1" value="${esc(v.servings)}">
        </div>
      </div>

      <div class="grid2">
        <div>
          <label for="f-prep">Vorbereitung (Min)</label>
          <input id="f-prep" name="prepTime" type="number" min="0" value="${esc(v.prepTime)}">
        </div>
        <div>
          <label for="f-total">Gesamtzeit (Min)</label>
          <input id="f-total" name="totalTime" type="number" min="0" value="${esc(v.totalTime)}">
        </div>
      </div>

      <label for="f-ing">Zutaten – eine pro Zeile</label>
      <textarea id="f-ing" name="ingredients" placeholder="200 g Mehl&#10;2 Eier">${esc((v.ingredients || []).join('\n'))}</textarea>

      <label for="f-steps">Zubereitung – ein Schritt pro Zeile</label>
      <textarea id="f-steps" name="steps" style="min-height:160px">${esc((v.steps || []).join('\n'))}</textarea>

      <label for="f-tags">Tags (mit Komma getrennt)</label>
      <input id="f-tags" name="tags" placeholder="Vegetarisch, Schnell" value="${esc((v.tags || []).join(', '))}">

      <label for="f-notes">Notizen</label>
      <textarea id="f-notes" name="notes" style="min-height:70px">${esc(v.notes)}</textarea>

      <div class="row" style="margin-top:16px">
        <button type="submit" class="btn primary">Speichern</button>
        <button type="button" class="btn" data-action="cancel-edit">Abbrechen</button>
      </div>
    </form>`,
  });

  document.getElementById('f-image').addEventListener('change', e => {
    const url = e.target.value.trim();
    e.target.closest('form').querySelector('.img-preview').innerHTML =
      url ? `<img src="${esc(url)}" alt="" onerror="this.remove()">` : '';
  });

  document.getElementById('recipe-form').addEventListener('submit', e => {
    e.preventDefault();
    const f = new FormData(e.target);
    const data = {
      title: f.get('title').trim(),
      category: f.get('category'),
      servings: Number(f.get('servings')) || '',
      prepTime: Number(f.get('prepTime')) || '',
      totalTime: Number(f.get('totalTime')) || '',
      ingredients: lines(f.get('ingredients')),
      steps: lines(f.get('steps')),
      tags: String(f.get('tags')).split(',').map(t => t.trim()).filter(Boolean),
      notes: f.get('notes').trim(),
      image: String(f.get('image') || '').trim(),
    };
    if (!data.title) return toast('Bitte einen Titel eingeben');
    let id;
    if (r) {
      Object.assign(r, data);
      id = r.id;
    } else {
      id = uid();
      state.recipes.push({ id, createdAt: new Date().toISOString(), ...data });
    }
    save();
    toast('Gespeichert');
    go({ name: 'detail', id });
  });
}

/* ============================================================
   Wochenplan
   ============================================================ */
/** Anzahl Tage vom Start-Wochentag bis zum End-Wochentag (Mi→Di = 6, Do→Di = 5) */
function periodLength(startWd, endWd) {
  const d = (endWd - startWd + 7) % 7;
  return d === 0 ? 7 : d;
}

/** Zeitraum, der heute enthält – sonst der nächste */
function defaultRange() {
  const { planStartDay: s, planEndDay: e } = state.settings;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  let start = addDays(today, -((today.getDay() - s + 7) % 7));
  let end = addDays(start, periodLength(s, e));
  if (end < today) {
    start = addDays(start, 7);
    end = addDays(end, 7);
  }
  return { start: isoDate(start), end: isoDate(end) };
}

function range() {
  if (!planRange) planRange = defaultRange();
  return planRange;
}

function planDates() {
  const { start, end } = range();
  const out = [];
  for (let iso = start; iso <= end && out.length < MAX_PLAN_DAYS; iso = shiftIso(iso, 1)) out.push(iso);
  return out;
}

/** Mahlzeit lesen, ohne etwas anzulegen */
function peekSlot(iso, meal) {
  return (state.days[iso] || {})[meal] || {};
}

/** Mahlzeit lesen und bei Bedarf anlegen (zum Ändern) */
function slot(iso, meal) {
  const d = state.days[iso] || (state.days[iso] = {});
  return d[meal] || (d[meal] = { recipeId: null, locked: false });
}

function isActive(iso, meal) {
  const s = peekSlot(iso, meal);
  if (typeof s.active === 'boolean') return s.active;
  return meal === 'abend' || state.settings.lunchDays.includes(parseIso(iso).getDay());
}

/** Alle eingeplanten Mahlzeiten im Zeitraum */
function planSlots() {
  const out = [];
  planDates().forEach(iso => Object.keys(MEALS).forEach(meal => {
    if (isActive(iso, meal)) out.push({ iso, meal, key: `${iso}|${meal}` });
  }));
  return out;
}

function poolRecipes() {
  const cat = state.settings.planCategory;
  return state.recipes.filter(r => cat === 'alle' || r.category === cat);
}

/** Füllt alle nicht gesperrten Mahlzeiten des Zeitraums (oder nur eine) zufällig.
 *  Wiederholungen innerhalb des Zeitraums werden vermieden, solange genug Rezepte da sind. */
function fillPlan(onlyKey = null) {
  const pool = poolRecipes();
  if (!pool.length) return toast('Keine passenden Rezepte für den Plan vorhanden');
  const slots = planSlots();

  const used = new Set(slots
    .map(s => [s.key, peekSlot(s.iso, s.meal)])
    .filter(([key, d]) => d.recipeId && (d.locked || (onlyKey !== null && key !== onlyKey)))
    .map(([, d]) => d.recipeId));

  const pick = exclude => {
    let c = pool.filter(r => !used.has(r.id) && r.id !== exclude);
    if (!c.length) c = pool.filter(r => r.id !== exclude);
    if (!c.length) c = pool;
    const r = c[Math.floor(Math.random() * c.length)];
    used.add(r.id);
    return r.id;
  };

  slots.forEach(s => {
    if (onlyKey !== null && s.key !== onlyKey) return;
    const d = slot(s.iso, s.meal);
    if (d.locked) return;
    d.recipeId = pick(onlyKey !== null ? d.recipeId : null);
  });
  save();
  renderPlan();
}

function renderPlan() {
  const { start, end } = range();
  const dates = planDates();
  const startWd = parseIso(start).getDay();
  const allSorted = [...state.recipes].sort((a, b) => a.title.localeCompare(b.title, 'de'));
  const { planCategory: cat, planEndDay } = state.settings;

  app.innerHTML = shell({
    kicker: 'Planer',
    title: pageTitle('Wochenplan'),
    body: `
    <div class="panel">
      <label style="margin-top:0">Erster Tag (Einkaufstag)</label>
      <div class="chips" style="margin:0">
        ${[1, 2, 3, 4, 5, 6, 0].map(wd =>
          `<button class="btn small ${startWd === wd ? 'on' : ''}" data-action="start-day" data-wd="${wd}">${WD_SHORT[wd]}</button>`).join('')}
      </div>
      <div class="grid2">
        <div><label for="plan-from">Von</label><input type="date" id="plan-from" value="${start}"></div>
        <div><label for="plan-to">Bis</label><input type="date" id="plan-to" value="${end}"></div>
      </div>
      <div class="row" style="margin-top:12px">
        <button class="btn small" data-action="period" data-dir="-1">◀ Früher</button>
        <button class="btn small" data-action="period" data-dir="0">Aktuell</button>
        <button class="btn small" data-action="period" data-dir="1">Später ▶</button>
        <span class="spacer"></span>
        <label for="plan-endday" style="margin:0">endet am</label>
        <select id="plan-endday" style="width:auto">
          ${[1, 2, 3, 4, 5, 6, 0].map(wd => `<option value="${wd}" ${planEndDay === wd ? 'selected' : ''}>${WEEKDAYS[wd]}</option>`).join('')}
        </select>
      </div>
      <label>Mittagessen standardmäßig an</label>
      <div class="chips" style="margin:0">
        ${[1, 2, 3, 4, 5, 6, 0].map(wd =>
          `<button class="btn small ${state.settings.lunchDays.includes(wd) ? 'on' : ''}" data-action="lunch-day" data-wd="${wd}">${WD_SHORT[wd]}</button>`).join('')}
      </div>
      <p class="meta" style="margin-bottom:0">${dates.length} Tage: ${WEEKDAYS[startWd]}, ${shortDate(parseIso(start))} – ${WEEKDAYS[parseIso(end).getDay()]}, ${shortDate(parseIso(end))}${parseIso(end).getFullYear()}</p>
    </div>

    <div class="panel">
      <div class="row">
        <label for="plan-cat" style="margin:0">Zufallsauswahl aus:</label>
        <select id="plan-cat" style="width:auto">
          <option value="kochen" ${cat === 'kochen' ? 'selected' : ''}>Kochen</option>
          <option value="backen" ${cat === 'backen' ? 'selected' : ''}>Backen</option>
          <option value="alle" ${cat === 'alle' ? 'selected' : ''}>Allen Rezepten</option>
        </select>
      </div>
      <div class="row" style="margin-top:10px">
        <button class="btn primary" data-action="fill">🎲 Woche zufällig füllen</button>
        <button class="btn" data-action="clear-plan">Leeren</button>
        <button class="btn" data-action="plan-pdf">📄 PDF / Drucken</button>
        <button class="btn" data-action="goshop">🛒 Einkaufsliste</button>
      </div>
      <p class="meta" style="margin-top:8px">„PDF / Drucken“ öffnet den Druckdialog – dort „Als PDF speichern“ wählen. Gesperrte Mahlzeiten (🔒) bleiben beim Würfeln erhalten. Jede Mahlzeit lässt sich auch manuell über die Auswahl ändern, hinzufügen („+“) oder streichen („entfällt“).</p>
    </div>

    ${dates.map(iso => {
      const dt = parseIso(iso);
      const name = WEEKDAYS[dt.getDay()];
      const meals = Object.keys(MEALS);
      const active = meals.filter(m => isActive(iso, m));
      const inactive = meals.filter(m => !isActive(iso, m));
      return `
      <div class="day">
        <div class="day-head">
          <strong>${name}</strong>
          <span class="meta">${shortDate(dt)}</span>
        </div>
        ${active.map(m => mealRow(iso, m, `${name}, ${shortDate(dt)}`, allSorted)).join('')}
        ${!active.length ? '<p class="meta" style="margin:4px 0">Keine Mahlzeit geplant</p>' : ''}
        ${inactive.length ? `<div class="row" style="margin-top:6px">${inactive.map(m =>
          `<button class="btn small" data-action="meal-on" data-date="${iso}" data-meal="${m}">+ ${MEALS[m]}</button>`).join('')}</div>` : ''}
      </div>`;
    }).join('')}`,
  });

  document.getElementById('plan-cat').addEventListener('change', e => {
    state.settings.planCategory = e.target.value;
    save();
  });

  // "Von" geändert: "Bis" automatisch auf den nächsten End-Wochentag setzen
  document.getElementById('plan-from').addEventListener('change', e => {
    const v = e.target.value;
    if (!v) return renderPlan();
    planRange = { start: v, end: shiftIso(v, periodLength(parseIso(v).getDay(), state.settings.planEndDay)) };
    renderPlan();
  });

  document.getElementById('plan-to').addEventListener('change', e => {
    const v = e.target.value;
    if (v && v < start) toast('„Bis“ darf nicht vor „Von“ liegen');
    else if (v && v > shiftIso(start, MAX_PLAN_DAYS - 1)) toast(`Maximal ${MAX_PLAN_DAYS} Tage`);
    else if (v) planRange = { start, end: v };
    renderPlan();
  });

  document.getElementById('plan-endday').addEventListener('change', e => {
    state.settings.planEndDay = Number(e.target.value);
    save();
    planRange = { start, end: shiftIso(start, periodLength(startWd, state.settings.planEndDay)) };
    renderPlan();
  });

  app.querySelectorAll('select[data-meal]').forEach(sel => sel.addEventListener('change', e => {
    slot(e.target.dataset.date, e.target.dataset.meal).recipeId = e.target.value || null;
    save();
    renderPlan();
  }));
}

/* ------------------------------------------------------------
   PDF-Export: eigenes A4-Drucklayout, gespeichert über den
   Druckdialog des Browsers („Als PDF speichern“)
   ------------------------------------------------------------ */
const MEAL_NAMES = { mittag: 'Mittagessen', abend: 'Abendessen' };

function planPrintHtml() {
  const { start, end } = range();
  const dates = planDates();
  const s = parseIso(start), e = parseIso(end);
  const meals = Object.keys(MEALS).filter(m => dates.some(iso => isActive(iso, m)));
  // Zeilenhöhe so wählen, dass der Plan möglichst auf eine A4-Seite passt
  // (nutzbare Fläche bei 2 cm / 2,5 cm Rand: 160 × 257 mm)
  const rowH = dates.length <= 8 ? 23 : dates.length <= 14 ? 14 : 8.5;
  const withNotes = dates.length <= 10;

  const cell = (iso, m) => {
    if (!isActive(iso, m)) return '<td class="pp-off">–</td>';
    const id = peekSlot(iso, m).recipeId;
    const r = id ? getRecipe(id) : null;
    if (!r) return '<td class="pp-free"><span class="pp-line"></span></td>';
    const meta = [r.totalTime ? `${r.totalTime} Min` : '', r.servings ? `${r.servings} ${r.category === 'backen' ? 'Stk.' : 'Pers.'}` : '']
      .filter(Boolean).join(' · ');
    return `<td><div class="pp-dish">${esc(r.title)}</div>${meta ? `<div class="pp-meta">${esc(meta)}</div>` : ''}</td>`;
  };

  return `
    <div class="pp" style="--row-h:${rowH}mm">
      <div class="pp-kicker"><span>Wochenplan</span></div>
      <h1 class="pp-title">${WEEKDAYS[s.getDay()]}, ${shortDate(s)} – ${WEEKDAYS[e.getDay()]}, ${shortDate(e)}${e.getFullYear()}</h1>
      <div class="pp-rule"></div>
      <table class="pp-table">
        <colgroup><col class="pp-col-day">${meals.map(() => '<col>').join('')}</colgroup>
        <thead><tr><th>Tag</th>${meals.map(m => `<th>${MEAL_NAMES[m]}</th>`).join('')}</tr></thead>
        <tbody>
          ${dates.map(iso => {
            const d = parseIso(iso);
            const we = d.getDay() === 0 || d.getDay() === 6;
            return `<tr class="${we ? 'pp-we' : ''}">
              <th scope="row"><div class="pp-wd">${WEEKDAYS[d.getDay()]}</div><div class="pp-date">${shortDate(d)}</div></th>
              ${meals.map(m => cell(iso, m)).join('')}
            </tr>`;
          }).join('')}
        </tbody>
      </table>
      ${withNotes ? `
      <div class="pp-notes">
        <div class="pp-notes-head">Notizen</div>
        ${'<div class="pp-line"></div>'.repeat(4)}
      </div>` : ''}
      <div class="pp-foot">Erstellt am ${shortDate(new Date())}${new Date().getFullYear()}</div>
    </div>`;
}

function printPlan() {
  if (!planSlots().length) return toast('Im Zeitraum ist keine Mahlzeit geplant');
  const { start, end } = range();
  printDoc(planPrintHtml(), `Wochenplan ${start} bis ${end}`);
}

/** Druckt beliebiges HTML im A4-Drucklayout; `title` wird als PDF-Dateiname vorgeschlagen */
function printDoc(html, title) {
  let area = document.getElementById('print-area');
  if (!area) {
    area = document.createElement('div');
    area.id = 'print-area';
    document.body.appendChild(area);
  }
  area.innerHTML = html;
  const oldTitle = document.title;
  document.title = title;
  const restore = () => {
    document.title = oldTitle;
    area.innerHTML = '';
    window.removeEventListener('afterprint', restore);
  };
  window.addEventListener('afterprint', restore);
  // Kurz warten, damit Schriften fürs Drucklayout geladen sind
  (document.fonts ? document.fonts.ready : Promise.resolve()).then(() => window.print());
}

/* ============================================================
   Einkaufsliste (aus dem Wochenplan-Zeitraum)
   ============================================================ */
// Supermarkt-Bereiche; Zuordnung über das längste passende Stichwort im Zutatennamen
const SHOP_GROUPS = [
  ['obst', 'Obst & Gemüse', 'apfel äpfel banane zitrone limette orange beere tomate tomaten gurke paprika zucchini aubergine möhre möhren karotte zwiebel knoblauch lauch porree sellerie staudensellerie spinat salat kohl brokkoli blumenkohl spargel fenchel kürbis kartoffel süßkartoffel pilz champignon radieschen avocado erbse erbsen bohne mais kräuter petersilie schnittlauch basilikum dill ingwer chili frühlingszwiebel rote bete aprikose mango ananas kresse rucola mangold pastinake birne trauben rhabarber'],
  ['kuehl', 'Kühlregal', 'milch butter sahne schmand quark joghurt käse feta ricotta mozzarella parmesan camembert bergkäse frischkäse ei eier tofu räuchertofu hafercuisine crème creme mascarpone skyr hefe'],
  ['fleisch', 'Fleisch & Fisch', 'hack hackfleisch rinderhack rind schwein hähnchen hühnchen huhn pute speck schinken wurst lachs fisch garnelen thunfisch chorizo'],
  ['brot', 'Brot & Backwaren', 'brot brötchen fladenbrot toast tortilla wraps pizzateig blätterteig semmelbrösel paniermehl'],
  ['trocken', 'Nudeln, Reis & Getreide', 'nudel nudeln pasta spaghetti penne lasagneplatten gnocchi schupfnudeln reis couscous bulgur quinoa hirse polenta linsen berglinsen kichererbsen haferflocken mehl grieß stärke'],
  ['konserve', 'Konserven, Gläser & Soßen', 'passierte tomatenmark kokosmilch brühe gemüsebrühe fond oliven kapern pesto senf ketchup mayonnaise sojasoße sojasauce currypaste essig sauerkraut'],
  ['backen', 'Backzutaten & Süßes', 'zucker backpulver natron vanille vanillezucker kakao schokolade honig sirup agavendicksaft ahornsirup rosinen nüsse mandeln walnüsse haselnüsse kokosraspeln sesam kerne sonnenblumenkerne'],
  ['gewuerz', 'Gewürze & Öle', 'chilipulver paprika edelsüß edelsüß rosenpaprika salz pfeffer öl olivenöl bratöl rapsöl paprikapulver curry currypulver kreuzkümmel kurkuma zimt muskat oregano thymian rosmarin gewürz lorbeer koriander chiliflocken majoran'],
].map(([id, label, words]) => ({ id, label, words: words.split(' ').map(w => w.replace(/ /g, ' ')) }));
const SHOP_EXTRA = { id: 'extra', label: 'Eigene Einträge' };
const SHOP_OTHER = { id: 'other', label: 'Sonstiges' };
const WHOLE_WORD = new Set(['ei', 'eier', 'öl', 'reis']);

function shopGroup(name, unit) {
  if (/^(Dosen?|Gläser|Glas)$/.test(unit)) return SHOP_GROUPS.find(g => g.id === 'konserve');
  const n = name.toLowerCase();
  let best = null, bestLen = 0;
  SHOP_GROUPS.forEach(g => g.words.forEach(w => {
    const hit = WHOLE_WORD.has(w)
      ? new RegExp(`(^|[^a-zäöüß])${w}($|[^a-zäöüß])`).test(n)
      : n.includes(w);
    if (hit && w.length > bestLen) { best = g; bestLen = w.length; }
  }));
  return best || SHOP_OTHER;
}

const FRACTIONS = { '½': .5, '¼': .25, '¾': .75, '⅓': 1 / 3, '⅔': 2 / 3 };
/** "1,5" / "1/2" / "1 ½" → Zahl; Bereiche wie "2-3" → null */
function parseQty(s) {
  s = s.trim().replace(/^ca\.\s*/i, '');
  if (/[–-]/.test(s)) return null;
  let total = 0;
  for (const part of s.split(/\s+/)) {
    if (FRACTIONS[part] != null) total += FRACTIONS[part];
    else if (/^\d+\/\d+$/.test(part)) { const [a, b] = part.split('/').map(Number); total += a / b; }
    else if (/^\d+[½¼¾⅓⅔]$/.test(part)) total += Number(part.slice(0, -1)) + FRACTIONS[part.slice(-1)];
    else if (/^\d+([.,]\d+)?$/.test(part)) total += Number(part.replace(',', '.'));
    else return null;
  }
  return total;
}

const UNIT_NORMAL = {
  kg: ['g', 1000], g: ['g', 1], mg: ['g', .001], l: ['ml', 1000], ml: ['ml', 1], cl: ['ml', 10], dl: ['ml', 100],
  Dosen: ['Dose', 1], Prisen: ['Prise', 1], Zehen: ['Zehe', 1], Stangen: ['Stange', 1], Scheiben: ['Scheibe', 1],
  Packungen: ['Packung', 1], Pck: ['Pck.', 1], Päckchen: ['Pck.', 1], Tassen: ['Tasse', 1], Knollen: ['Knolle', 1],
  Köpfe: ['Kopf', 1], Gläser: ['Glas', 1], Zweige: ['Zweig', 1], Blätter: ['Blatt', 1], Stück: ['', 1], Stk: ['', 1], 'Stk.': ['', 1],
};
const UNIT_PLURAL = { Dose: 'Dosen', Prise: 'Prisen', Zehe: 'Zehen', Stange: 'Stangen', Scheibe: 'Scheiben', Packung: 'Packungen', Tasse: 'Tassen', Knolle: 'Knollen', Kopf: 'Köpfe', Glas: 'Gläser', Zweig: 'Zweige', Blatt: 'Blätter' };

function fmtNum(n) {
  return (Math.round(n * 100) / 100).toLocaleString('de-DE');
}
function fmtAmount(qty, unit) {
  if (unit === 'g' && qty >= 1000) return `${fmtNum(qty / 1000)} kg`;
  if (unit === 'ml' && qty >= 1000) return `${fmtNum(qty / 1000)} l`;
  const u = qty > 1 && UNIT_PLURAL[unit] ? UNIT_PLURAL[unit] : unit;
  return u ? `${fmtNum(qty)} ${u}` : fmtNum(qty);
}

// Schlüssel zum Zusammenfassen: ohne Klammern/Zusätze, Plural-Endung grob entfernt
// (Zwiebel/Zwiebeln, Möhre/Möhren, Knoblauchzehe/Knoblauchzehen)
function shopKey(name) {
  return name.toLowerCase().replace(/\(.*?\)/g, '').replace(/,.*$/, '').replace(/\s+/g, ' ').trim()
    .replace(/(en|n|e)$/, '');
}

/** Alle Zutaten der im Zeitraum geplanten Rezepte, zusammengefasst und nach Bereichen sortiert */
function buildShoppingList() {
  const items = new Map();
  const dishes = [];
  const add = (name, unit, qty, text, recipe) => {
    name = name.trim();
    if (!name) return;
    const key = shopKey(name) || name.toLowerCase();
    let it = items.get(key);
    if (!it) {
      it = { key, name: name.replace(/,.*$/, '').trim(), amounts: new Map(), texts: [], recipes: new Set(), group: shopGroup(name, unit) };
      items.set(key, it);
    }
    if (qty != null) it.amounts.set(unit, (it.amounts.get(unit) || 0) + qty);
    else if (text && !it.texts.includes(text)) it.texts.push(text);
    it.recipes.add(recipe.title);
  };

  planSlots().forEach(s => {
    const r = getRecipe(peekSlot(s.iso, s.meal).recipeId);
    if (!r) return;
    dishes.push(r.title);
    (r.ingredients || []).forEach(line => {
      // "Nach Belieben: ½ TL Chilipulver" → "½ TL Chilipulver (nach Belieben)"
      const opt = line.match(/^\s*(nach belieben|optional|evtl\.?)\s*:?\s*/i);
      if (opt) line = line.slice(opt[0].length);
      let [amt, name] = splitIngredient(line);
      if (opt) name += ' (nach Belieben)';
      if (!amt) {
        // "Salz, Pfeffer, Oregano" / "Salz & Pfeffer" → einzelne Einträge
        name.split(/\s*(?:,|&|\bund\b)\s*/).forEach(part => add(part, '', null, '', r));
        return;
      }
      const m = amt.match(/^(.*?\d[½¼¾⅓⅔]?|.*?[½¼¾⅓⅔])\s*([A-Za-zÄÖÜäöüß.]*)$/);
      const rawUnit = m ? m[2] : '';
      const qty = m ? parseQty(m[1]) : null;
      const [unit, factor] = UNIT_NORMAL[rawUnit] || [rawUnit, 1];
      if (qty == null) add(name, unit, null, amt, r);
      else add(name, unit, qty * factor, '', r);
    });
  });

  const list = [...items.values()].map(it => ({
    ...it,
    amount: [...[...it.amounts].map(([u, q]) => fmtAmount(q, u)), ...it.texts].join(' + '),
    recipes: [...it.recipes],
  }));
  const order = [...SHOP_GROUPS, SHOP_OTHER];
  const groups = order
    .map(g => ({ ...g, items: list.filter(i => i.group.id === g.id).sort((a, b) => a.name.localeCompare(b.name, 'de')) }))
    .filter(g => g.items.length);
  return { groups, dishes };
}

function shopState() {
  const { start, end } = range();
  const k = `${start}|${end}`;
  if (!state.shopping) state.shopping = {};
  return state.shopping[k] || (state.shopping[k] = { checked: [], extra: [] });
}

function rangeLabel() {
  const { start, end } = range();
  const s = parseIso(start), e = parseIso(end);
  return `${WD_SHORT[s.getDay()]}, ${shortDate(s)} – ${WD_SHORT[e.getDay()]}, ${shortDate(e)}${e.getFullYear()}`;
}

/** Gruppen inkl. eigener Einträge, mit Abhak-Status */
function shoppingGroups() {
  const st = shopState();
  const { groups, dishes } = buildShoppingList();
  const checked = new Set(st.checked);
  const all = groups.map(g => ({ ...g, items: g.items.map(i => ({ ...i, done: checked.has(i.key) })) }));
  if (st.extra.length) {
    all.push({ ...SHOP_EXTRA, items: st.extra.map(x => ({ key: 'x:' + x.id, extraId: x.id, name: x.text, amount: '', recipes: [], done: checked.has('x:' + x.id) })) });
  }
  return { groups: all, dishes };
}

function renderShop() {
  const { groups, dishes } = shoppingGroups();
  const total = groups.reduce((n, g) => n + g.items.length, 0);
  const done = groups.reduce((n, g) => n + g.items.filter(i => i.done).length, 0);

  app.innerHTML = shell({
    kicker: 'Einkaufsliste',
    title: pageTitle('Einkaufsliste'),
    body: `
      <p class="shop-range">${rangeLabel()} · ${dishes.length} ${dishes.length === 1 ? 'Gericht' : 'Gerichte'}
        <button class="linkbtn" data-action="goplan">Zeitraum ändern</button></p>

      ${total ? `
      <div class="row shop-actions">
        <button class="btn small" data-action="shop-copy">📋 Als Text kopieren</button>
        <button class="btn small" data-action="shop-pdf">📄 PDF / Drucken</button>
        ${done ? `<button class="btn small" data-action="shop-reset">Haken entfernen (${done})</button>` : ''}
      </div>` : ''}

      <form class="shop-add" id="shop-add">
        <input class="hand-input" name="text" placeholder="Eigenen Eintrag hinzufügen, z. B. Spülmittel" autocomplete="off">
        <button class="btn" type="submit">+</button>
      </form>

      ${!dishes.length && !total ? `
        <div class="empty">Im Wochenplan ist für diesen Zeitraum noch kein Rezept eingeplant.<br><br>
          <button class="btn primary" data-action="goplan">Zum Wochenplan</button></div>` : ''}

      ${groups.map(g => `
        <section class="shop-group">
          <div class="sec-head"><h3>${esc(g.label)}</h3><span class="shop-count">${g.items.filter(i => i.done).length}/${g.items.length}</span></div>
          <ul class="shop-list">
            ${g.items.map(i => `
              <li class="shop-item ${i.done ? 'done' : ''}" data-action="shop-check" data-key="${esc(i.key)}" role="checkbox" aria-checked="${i.done}" tabindex="0">
                <span class="box">${i.done ? '✓' : ''}</span>
                <span class="amt">${esc(i.amount)}</span>
                <span class="name">${esc(i.name)}${i.recipes.length ? `<small>${esc(i.recipes.join(', '))}</small>` : ''}</span>
                ${i.extraId ? `<button class="linkbtn" data-action="shop-del" data-id="${i.extraId}" title="Eintrag löschen">✕</button>` : ''}
              </li>`).join('')}
          </ul>
        </section>`).join('')}

      ${total ? `<p class="meta" style="margin-top:16px">Zutaten mehrfach geplanter Gerichte werden addiert. Antippen hakt ab – die Haken bleiben für diesen Zeitraum gespeichert.</p>` : ''}`,
  });

  document.getElementById('shop-add').addEventListener('submit', e => {
    e.preventDefault();
    const text = new FormData(e.target).get('text').trim();
    if (!text) return;
    shopState().extra.push({ id: uid(), text });
    save();
    renderShop();
    document.querySelector('#shop-add input').focus();
  });
}

function shoppingText() {
  const { groups } = shoppingGroups();
  const out = [`Einkaufsliste ${rangeLabel()}`];
  groups.forEach(g => {
    const open = g.items.filter(i => !i.done);
    if (!open.length) return;
    out.push('', g.label + ':', ...open.map(i => `- ${i.amount ? i.amount + ' ' : ''}${i.name}`));
  });
  return out.join('\n');
}

function shopPrintHtml() {
  const { groups, dishes } = shoppingGroups();
  return `
    <div class="pp">
      <div class="pp-kicker"><span>Einkaufsliste</span></div>
      <h1 class="pp-title">${rangeLabel()}</h1>
      <div class="pp-rule"></div>
      <div class="ps-cols">
        ${groups.map(g => {
          const open = g.items.filter(i => !i.done);
          if (!open.length) return '';
          return `<section class="ps-group">
            <h2>${esc(g.label)}</h2>
            <ul>${open.map(i => `<li><span class="ps-box"></span><span class="ps-amt">${esc(i.amount)}</span><span class="ps-name">${esc(i.name)}</span></li>`).join('')}</ul>
          </section>`;
        }).join('')}
      </div>
      <div class="pp-foot">Für: ${esc(dishes.filter((d, i) => dishes.indexOf(d) === i).join(' · '))}</div>
    </div>`;
}

function mealRow(iso, meal, dayLabel, allSorted) {
  const d = peekSlot(iso, meal);
  const r = d.recipeId ? getRecipe(d.recipeId) : null;
  const attrs = `data-date="${iso}" data-meal="${meal}"`;
  return `
    <div class="meal ${d.locked ? 'locked' : ''}">
      <div class="meal-head">
        <span class="meta">${MEALS[meal]}</span>
        <button class="linkbtn" data-action="meal-off" ${attrs}>entfällt</button>
      </div>
      <div class="day-body">
        <select ${attrs} aria-label="${MEALS[meal]} am ${dayLabel}">
          <option value="">– kein Rezept –</option>
          ${allSorted.map(x => `<option value="${x.id}" ${r && r.id === x.id ? 'selected' : ''}>${esc(x.title)}</option>`).join('')}
        </select>
        <button class="btn icon" data-action="reroll" ${attrs} title="Neu würfeln" ${d.locked ? 'disabled' : ''}>🎲</button>
        <button class="btn icon ${d.locked ? 'on' : ''}" data-action="lock" ${attrs} title="${d.locked ? 'Entsperren' : 'Sperren'}">${d.locked ? '🔒' : '🔓'}</button>
        ${r ? `<button class="btn icon" data-action="open" data-id="${r.id}" title="Rezept ansehen">👁</button>` : ''}
      </div>
    </div>`;
}

/* ============================================================
   Daten: Backup & Wiederherstellung
   ============================================================ */
function renderData() {
  app.innerHTML = shell({
    kicker: 'Backup',
    title: pageTitle('Daten'),
    body: `
    <div class="panel">
      <p><b>${state.recipes.length}</b> Rezepte gespeichert – lokal in diesem Browser auf diesem Gerät.</p>
      <p class="meta">Daten werden nicht automatisch zwischen Geräten abgeglichen. Mit Backup &amp; Import kannst du sie übertragen (z. B. über Google Drive).</p>
    </div>

    <h3>Backup</h3>
    <div class="row">
      <button class="btn primary" data-action="backup">⬇ Backup herunterladen (JSON)</button>
    </div>

    <h3>Backup einspielen</h3>
    <div class="panel">
      <input type="file" id="import-file" accept=".json,application/json">
      <div class="row" style="margin-top:10px">
        <button class="btn" data-action="import" data-mode="merge">Zusammenführen</button>
        <button class="btn danger" data-action="import" data-mode="replace">Alles ersetzen</button>
      </div>
      <p class="meta">„Zusammenführen“ ergänzt neue Rezepte und aktualisiert vorhandene mit gleicher ID.</p>
    </div>`,
  });
}

function doBackup() {
  const data = { app: 'RezepteApp', version: 2, exportedAt: new Date().toISOString(), recipes: state.recipes, days: state.days, settings: state.settings };
  download(`rezepte-backup-${isoDate(new Date())}.json`, JSON.stringify(data, null, 2), 'application/json');
}

async function doImport(mode) {
  const file = document.getElementById('import-file').files[0];
  if (!file) return toast('Bitte zuerst eine Datei auswählen');
  let data;
  try {
    data = JSON.parse(await file.text());
    if (!Array.isArray(data.recipes)) throw new Error('keine Rezeptliste gefunden');
  } catch (e) {
    return toast('Ungültige Datei: ' + e.message);
  }
  const importedDays = normalizeDays(Object.assign(migratePlans(data.plans), data.days || {}));
  if (mode === 'replace') {
    if (!confirm('Alle aktuellen Daten werden durch das Backup ersetzt. Fortfahren?')) return;
    state.recipes = data.recipes;
    state.days = importedDays;
    if (data.settings) state.settings = Object.assign(defaultState().settings, data.settings);
  } else {
    const byId = new Map(state.recipes.map(r => [r.id, r]));
    data.recipes.forEach(r => byId.set(r.id, r));
    state.recipes = [...byId.values()];
    state.days = Object.assign({}, state.days, importedDays);
  }
  planRange = null;
  applyDefaultImages();
  save();
  toast(`${data.recipes.length} Rezepte importiert`);
  renderData();
}

/* ============================================================
   Cookidoo-Export
   ============================================================ */
function recipeAsText(r) {
  const out = [r.title, ''];
  if (r.servings) out.push(`Portionen: ${r.servings}`);
  if (r.prepTime) out.push(`Vorbereitung: ${r.prepTime} Min`);
  if (r.totalTime) out.push(`Gesamtzeit: ${r.totalTime} Min`);
  out.push('', 'Zutaten:', ...(r.ingredients || []).map(i => `- ${i}`));
  out.push('', 'Zubereitung:', ...(r.steps || []).map((s, i) => `${i + 1}. ${s}`));
  if (r.notes) out.push('', 'Notizen:', r.notes);
  return out.join('\n');
}

/* ============================================================
   Zentrale Klick-Behandlung
   ============================================================ */
app.addEventListener('click', e => {
  const el = e.target.closest('[data-action]');
  if (!el) return;
  const id = el.dataset.id;

  switch (el.dataset.action) {
    case 'new': return go({ name: 'edit' });
    case 'open': return go({ name: 'detail', id, from: view.name });
    case 'edit': return go({ name: 'edit', id });
    case 'back': return go({ name: view.from || 'list' });
    case 'home': return go({ name: 'list' });
    case 'goplan': return go({ name: 'plan' });
    case 'godata': return go({ name: 'data' });
    case 'goshop': return go({ name: 'shop' });
    case 'shop-check': {
      const st = shopState();
      const key = el.dataset.key;
      st.checked = st.checked.includes(key) ? st.checked.filter(k => k !== key) : [...st.checked, key];
      save();
      return renderShop();
    }
    case 'shop-del': {
      const st = shopState();
      st.extra = st.extra.filter(x => x.id !== id);
      st.checked = st.checked.filter(k => k !== 'x:' + id);
      save();
      return renderShop();
    }
    case 'shop-reset':
      shopState().checked = [];
      save();
      return renderShop();
    case 'shop-copy': return copyText(shoppingText(), 'Einkaufsliste kopiert');
    case 'shop-pdf': {
      const { start, end } = range();
      return printDoc(shopPrintHtml(), `Einkaufsliste ${start} bis ${end}`);
    }
    case 'favs':
      // In der Übersicht umschalten, von anderen Seiten aus direkt die Favoriten zeigen
      listFilter.fav = view.name === 'list' ? !listFilter.fav : true;
      return go({ name: 'list' });
    case 'fav-toggle': {
      const r = getRecipe(id);
      if (!r) return;
      r.favorite = !r.favorite;
      save();
      toast(r.favorite ? 'Zu Favoriten hinzugefügt' : 'Aus Favoriten entfernt');
      if (view.name === 'list') return renderResults();
      return render();
    }
    case 'cat-go':
      listFilter.cat = el.dataset.cat;
      return go({ name: 'list' });
    case 'cancel-edit': return go(view.id ? { name: 'detail', id: view.id } : { name: 'list' });
    case 'delete': {
      const r = getRecipe(id);
      if (!r || !confirm(`„${r.title}“ wirklich löschen?`)) return;
      state.recipes = state.recipes.filter(x => x.id !== id);
      Object.values(state.days).forEach(d => Object.keys(MEALS).forEach(m => {
        if (d[m] && d[m].recipeId === id) d[m].recipeId = null;
      }));
      save();
      toast('Gelöscht');
      return go({ name: 'list' });
    }
    case 'copy-part': {
      const r = getRecipe(view.id);
      const part = el.dataset.part;
      if (part === 'title') return copyText(r.title, 'Name kopiert');
      if (part === 'all') return copyText(recipeAsText(r), 'Rezept kopiert');
      return copyText((r[part] || []).join('\n'), part === 'steps' ? 'Alle Schritte kopiert' : 'Alle Zutaten kopiert');
    }
    case 'copy-item': {
      const r = getRecipe(view.id);
      const i = Number(el.dataset.index);
      const label = el.dataset.part === 'steps' ? `Schritt ${i + 1} kopiert` : 'Zutat kopiert';
      el.classList.add('copied');
      setTimeout(() => el.classList.remove('copied'), 800);
      return copyText(r[el.dataset.part][i], label);
    }
    case 'period': {
      const dir = Number(el.dataset.dir);
      const r = range();
      planRange = dir === 0 ? defaultRange() : { start: shiftIso(r.start, 7 * dir), end: shiftIso(r.end, 7 * dir) };
      return renderPlan();
    }
    case 'start-day': {
      // Ende bleibt, der Start springt auf den gewählten Wochentag davor
      const wd = Number(el.dataset.wd);
      state.settings.planStartDay = wd;
      save();
      const r = range();
      planRange = { start: shiftIso(r.end, -periodLength(wd, parseIso(r.end).getDay())), end: r.end };
      return renderPlan();
    }
    case 'lunch-day': {
      const wd = Number(el.dataset.wd);
      const ld = state.settings.lunchDays;
      state.settings.lunchDays = ld.includes(wd) ? ld.filter(x => x !== wd) : [...ld, wd];
      save();
      return renderPlan();
    }
    case 'fill': return fillPlan();
    case 'reroll': return fillPlan(`${el.dataset.date}|${el.dataset.meal}`);
    case 'lock': {
      const d = slot(el.dataset.date, el.dataset.meal);
      d.locked = !d.locked;
      save();
      return renderPlan();
    }
    case 'meal-on':
      slot(el.dataset.date, el.dataset.meal).active = true;
      save();
      return renderPlan();
    case 'meal-off': {
      const d = slot(el.dataset.date, el.dataset.meal);
      Object.assign(d, { active: false, recipeId: null, locked: false });
      save();
      return renderPlan();
    }
    case 'plan-pdf': return printPlan();
    case 'clear-plan':
      planSlots().forEach(s => { const d = peekSlot(s.iso, s.meal); if (d.recipeId && !d.locked) d.recipeId = null; });
      save();
      return renderPlan();
    case 'backup': return doBackup();
    case 'import': return doImport(el.dataset.mode);
  }
});

// Fokussierbare Nicht-Buttons (Rezeptkarten, Einkaufszeilen) per Enter/Leertaste auslösen
app.addEventListener('keydown', e => {
  const t = e.target;
  if ((e.key === 'Enter' || e.key === ' ') && t.dataset && t.dataset.action && t.tabIndex >= 0 && !/^(BUTTON|INPUT|SELECT|TEXTAREA)$/.test(t.tagName)) {
    e.preventDefault();
    t.click();
  }
});

/* ============================================================
   Start
   ============================================================ */
render();

// Offline-Fähigkeit / Installierbarkeit (nur wenn über http(s) ausgeliefert)
if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
  navigator.serviceWorker.register('sw.js').catch(() => {});
}
