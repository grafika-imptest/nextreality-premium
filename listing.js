// Výpis nemovitostí – filtry (lokalita s více hodnotami, druh nemovitosti), řazení, stránkování,
// mapa se seznamem synchronizovaným s výřezem a porovnání nabídek. Vše počítá nad reálnými daty (data/*-listings.js).
const PER_PAGE = 12;
const CMP_MAX = 4;
const SORTS = [['', 'Doporučené'], ['price-asc', 'Od nejlevnějšího'], ['price-desc', 'Od nejdražšího'], ['ppm-asc', 'Nejnižší cena za m²'], ['area-desc', 'Podle plochy']];
const TYPE_H1 = { '': 'Nemovitosti', byt: 'Byty', dum: 'Domy', komercni: 'Komerční prostory', pozemek: 'Pozemky', ostatni: 'Ostatní nemovitosti' };
const TYPE_OPT = { '': 'Vše', byt: 'Byty', dum: 'Domy', komercni: 'Komerční', pozemek: 'Pozemky', ostatni: 'Ostatní' };
// Druh nemovitosti = pole `sub` z CRM. Popisky v množném čísle – čipy i H1.
const SUB_FIELD = { komercni: 'Druh prostoru', dum: 'Druh domu', pozemek: 'Druh pozemku', ostatni: 'Druh' };
const SUB_LABEL = {
  'kanceláře': 'Kanceláře', 'obchodní prostory': 'Obchodní prostory', 'sklady': 'Sklady', 'výroba': 'Výrobní prostory',
  'restaurace': 'Restaurace', 'ubytování': 'Ubytování', 'apartmány': 'Apartmány', 'činžovní dům': 'Činžovní domy',
  'rodinný': 'Rodinné domy', 'vícegenerační dům': 'Vícegenerační domy', 'chata': 'Chaty', 'chalupa': 'Chalupy', 'památka/jiné': 'Památky a jiné',
  'bydlení': 'Pro bydlení', 'komerční': 'Komerční', 'zahrady': 'Zahrady', 'pole': 'Pole', 'louky': 'Louky', 'lesy': 'Lesy',
  'garáž': 'Garáže', 'garážové stání': 'Garážová stání', 'půdní prostor': 'Půdní prostory', 'ostatní': 'Ostatní',
};
const SUB_H1 = { 'bydlení': 'Pozemky pro bydlení', 'komerční': 'Komerční pozemky', 'ostatní': '' };
const SUB_LAST = ['ostatní', 'památka/jiné'];
const subLabel = s => SUB_LABEL[s] || (s ? s[0].toUpperCase() + s.slice(1) : '');

const BLANK = () => ({ deal: 'prodej', type: '', sub: [], locs: [], pmin: null, pmax: null, area: null, disp: [] });
const S = { status: 'active', ...BLANK(), sort: '', view: 'list', page: 1 };

const data = () => (S.status === 'sold' ? window.SOLD : window.LISTINGS)[dataKey(office)] || [];
const parseNum = v => { const n = +String(v || '').replace(/\D/g, ''); return n || null; };
const short = p => p >= 1e6 ? (Math.round(p / 1e5) / 10).toString().replace('.', ',') + ' mil.' : p >= 1e3 ? Math.round(p / 1e3) + ' tis.' : String(p);
const norm = s => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
const isDesk = () => innerWidth >= 1024;
const sqm = x => x.area || x.land || null;
const ppm = x => (x.price != null && sqm(x) ? Math.round(x.price / sqm(x)) : null);

// --- Lokalita: obec / čtvrť / ulice z reálných polí `loc` a `place` ---
// loc = „Ulice, Obec“ | „Obec“; place = „Ulice, Obec-Čtvrť“ | „Obec, ul. …“ | „Obec,Okres,Kraj“
const GEO = new WeakMap();
function geo(x) {
  let g = GEO.get(x);
  if (g) return g;
  const city = (x.loc.split(', ').at(-1) || '').trim();
  let part = '', street = '';
  if (!/,\S/.test(x.place)) {
    const ps = x.place.split(', ').filter(p => !/^ul\.\s/.test(p));
    const last = ps.at(-1) || '';
    if (last.startsWith(city + '-')) part = last;
    if (ps.length > 1 && ps[0] !== city) street = ps[0] + ', ' + city;
  }
  g = { city, part, street };
  GEO.set(x, g);
  return g;
}
let known = { key: '', set: new Set() };
function knownLocs() {
  const k = dataKey(office);
  if (known.key === k) return known.set;
  const set = new Set();
  for (const x of [...(window.LISTINGS[k] || []), ...(window.SOLD[k] || [])]) { const g = geo(x); [g.city, g.part, g.street].forEach(v => v && set.add(norm(v))); }
  return (known = { key: k, set }).set;
}
function locMatch(x, v) {
  const g = geo(x), n = norm(v);
  if (knownLocs().has(n)) return norm(g.city) === n || norm(g.part) === n || norm(g.street) === n;
  return norm(x.t + ' ' + x.loc + ' ' + x.place).includes(n); // volný text (např. z vyhledávání na homepage)
}

function filtered(s = S) {
  let r = data().filter(x =>
    (s.deal === 'pronajem') === !!x.rent &&
    (!s.type || x.type === s.type) &&
    (!s.sub.length || s.sub.includes(x.sub)) &&
    (!s.locs.length || s.locs.some(v => locMatch(x, v))) &&
    (s.pmin == null || (x.price != null && x.price >= s.pmin)) &&
    (s.pmax == null || (x.price != null && x.price <= s.pmax)) &&
    (s.area == null || (sqm(x) || 0) >= s.area) &&
    (!s.disp.length || (x.disp && s.disp.some(d => d === '4+' ? +x.disp[0] >= 4 : d === x.disp))));
  if (s.sort === 'price-asc') r = [...r].sort((a, b) => (a.price ?? Infinity) - (b.price ?? Infinity));
  if (s.sort === 'price-desc') r = [...r].sort((a, b) => (b.price ?? -1) - (a.price ?? -1));
  if (s.sort === 'ppm-asc') r = [...r].sort((a, b) => (ppm(a) ?? Infinity) - (ppm(b) ?? Infinity));
  if (s.sort === 'area-desc') r = [...r].sort((a, b) => (sqm(b) || 0) - (sqm(a) || 0));
  return r;
}
const without = patch => filtered({ ...S, ...patch, sort: '' });

// --- URL stav ---
function readUrl() {
  S.deal = qs.get('deal') === 'pronajem' ? 'pronajem' : 'prodej';
  S.type = TYPE_H1[qs.get('type')] && qs.get('type') ? qs.get('type') : ''; S.sort = qs.get('sort') || '';
  S.locs = (qs.get('loc') || '').split('|').map(v => v.trim()).filter(Boolean);
  S.sub = S.type && S.type !== 'byt' ? (qs.get('sub') || '').split(',').filter(Boolean) : [];
  S.pmin = parseNum(qs.get('pmin')); S.pmax = parseNum(qs.get('pmax')); S.area = parseNum(qs.get('area'));
  S.disp = (qs.get('disp') || '').split(',').filter(Boolean); S.view = qs.get('view') === 'map' ? 'map' : 'list';
  S.status = qs.get('status') === 'sold' ? 'sold' : 'active'; S.page = +qs.get('page') || 1;
}
function writeUrl() {
  const p = new URLSearchParams({ office });
  if (S.status === 'sold') p.set('status', 'sold');
  if (S.deal === 'pronajem') p.set('deal', 'pronajem');
  for (const k of ['type', 'sort']) if (S[k]) p.set(k, S[k]);
  if (S.sub.length) p.set('sub', S.sub.join(','));
  if (S.locs.length) p.set('loc', S.locs.join('|'));
  for (const k of ['pmin', 'pmax', 'area']) if (S[k] != null) p.set(k, S[k]);
  if (S.disp.length) p.set('disp', S.disp.join(','));
  if (S.view === 'map') p.set('view', 'map');
  if (S.page > 1) p.set('page', S.page);
  history.replaceState(null, '', location.pathname + '?' + p);
}

// --- Synchronizace formuláře se stavem ---
function syncForm() {
  $$('[data-deal]').forEach(b => b.setAttribute('aria-pressed', b.dataset.deal === S.deal));
  $('#f-type').value = S.type;
  $('#f-pmin').value = S.pmin ? num(S.pmin) : ''; $('#f-pmax').value = S.pmax ? num(S.pmax) : '';
  $$('#f-area .chip').forEach(c => c.setAttribute('aria-pressed', +c.dataset.v === S.area));
  $$('#f-disp .chip').forEach(c => c.setAttribute('aria-pressed', S.disp.includes(c.dataset.v)));
  $('#disp-field').hidden = !!S.type && S.type !== 'byt';
  $('#sort').value = $('#sort-m').value = S.sort;
  $$('[data-view]').forEach(b => b.setAttribute('aria-pressed', b.dataset.view === S.view));
  locTags();
}

// Počty u typů a druhů – vždy vůči ostatním aktivním filtrům (kolik nabídek uživatel opravdu uvidí)
function typeCounts() {
  const base = without({ type: '', sub: [], disp: [] });
  const c = { '': base.length };
  for (const x of base) c[x.type] = (c[x.type] || 0) + 1;
  for (const o of $('#f-type').options) o.textContent = `${TYPE_OPT[o.value]} (${c[o.value] || 0})`;
}
function subChips() {
  const f = $('#sub-field');
  if (!S.type || S.type === 'byt') { f.hidden = true; return; }
  const base = without({ sub: [] }), c = new Map();
  for (const x of base) if (x.sub) c.set(x.sub, (c.get(x.sub) || 0) + 1);
  S.sub.forEach(v => c.has(v) || c.set(v, 0));
  const subs = [...c].sort((a, b) => SUB_LAST.includes(a[0]) - SUB_LAST.includes(b[0]) || b[1] - a[1] || a[0].localeCompare(b[0], 'cs'));
  f.hidden = subs.length < 2 && !S.sub.length; // jediný druh nemá smysl nabízet
  $('#lbl-sub').textContent = SUB_FIELD[S.type] || 'Druh';
  $('#f-sub').innerHTML = subs.map(([k, n]) => `<button type="button" class="chip chip--count" data-sub="${esc(k)}" aria-pressed="${S.sub.includes(k)}">${esc(subLabel(k))}<span>${n}</span></button>`).join('');
}

function activeChips() {
  const c = [];
  if (S.deal === 'pronajem') c.push(['deal', 'Pronájem']);
  if (S.type) c.push(['type', TYPE_H1[S.type]]);
  S.sub.forEach(v => c.push(['sub:' + v, subLabel(v)]));
  S.locs.forEach(v => c.push(['loc:' + v, v]));
  if (S.pmin != null || S.pmax != null) c.push(['price', (S.pmin ? 'od ' + kc(S.pmin) : '') + (S.pmin && S.pmax ? ' ' : '') + (S.pmax ? 'do ' + kc(S.pmax) : '')]);
  if (S.area) c.push(['area', 'od ' + S.area + ' m²']);
  S.disp.forEach(d => c.push(['disp:' + d, d === '4+' ? '4+ a větší' : d]));
  return c;
}
function clearChip(k, s = S) {
  const i = k.indexOf(':'), key = i < 0 ? k : k.slice(0, i), v = k.slice(i + 1);
  if (key === 'deal') s.deal = 'prodej';
  else if (key === 'type') { s.type = ''; s.sub = []; }
  else if (key === 'price') s.pmin = s.pmax = null;
  else if (key === 'area') s.area = null;
  else if (key === 'sub') s.sub = s.sub.filter(d => d !== v);
  else if (key === 'loc') s.locs = s.locs.filter(d => d !== v);
  else if (key === 'disp') s.disp = s.disp.filter(d => d !== v);
  return s;
}

function heading() {
  const verb = S.status === 'sold' ? 'realizované' : S.deal === 'pronajem' ? 'k pronájmu' : 'na prodej';
  let what = S.sub.length === 1 ? (SUB_H1[S.sub[0]] ?? subLabel(S.sub[0])) : '';
  if (!what) what = TYPE_H1[S.type];
  const l = S.locs;
  const where = !l.length ? '' : ' – ' + (l.length <= 2 ? l.join(', ') : `${l[0]}, ${l[1]} a další`);
  return `${what} ${verb}${where}`;
}

// --- Vykreslení ---
function render(withSkeleton) {
  const r = filtered();
  const pages = Math.max(1, Math.ceil(r.length / PER_PAGE));
  if (S.page > pages) S.page = pages;
  const o = OFFICES[office];
  $('#list-h1').textContent = heading();
  document.title = `${$('#list-h1').textContent} | ${o.name}`;
  $('#list-count').textContent = nab(r.length);
  typeCounts(); subChips();

  const sold = (window.SOLD[dataKey(office)] || []).length;
  $('#status-tabs').innerHTML = sold ? [['active', 'Aktuální nabídka', (window.LISTINGS[dataKey(office)] || []).length], ['sold', 'Realizováno', sold]]
    .map(([k, l, n]) => `<button role="tab" aria-selected="${S.status === k}" data-status="${k}">${l} <span>${n}</span></button>`).join('') : '';

  const chips = activeChips();
  $('#active-chips').innerHTML = chips.length ? chips.map(([k, l]) => `<button class="fchip" data-clear="${esc(k)}">${esc(l)} ${ico('x')}<span class="sr-only">odebrat filtr</span></button>`).join('') + `<button class="btn btn--ghost" data-clear="*">Zrušit filtry</button>` : '';
  $('#filter-n').hidden = !chips.length; $('#filter-n').textContent = chips.length;

  const from = (S.page - 1) * PER_PAGE;
  const slice = r.slice(from, from + PER_PAGE);
  const onMap = S.view === 'map' && !!r.length;
  $('#results-info').textContent = !r.length || onMap ? '' : `Zobrazeno ${from + 1}–${from + slice.length} z ${r.length}`;
  $('#empty').hidden = !!r.length;
  $('#grid').hidden = !r.length;
  $('#pager').hidden = r.length <= PER_PAGE;

  const paint = () => {
    const cards = slice.map(x => withCompare(x, card(S.status === 'sold' ? { ...x, st: 'sold' } : x)));
    if (cards.length > 8 && S.status !== 'sold') cards.splice(8, 0, watchdog(false));
    $('#grid').innerHTML = cards.join('');
  };
  if (withSkeleton && r.length && !onMap) { $('#grid').innerHTML = skeleton(Math.min(8, slice.length)); clearTimeout(render.t); render.t = setTimeout(paint, 280); } else paint();

  if (!r.length) $('#empty').innerHTML = emptyState();
  $('#pager').innerHTML = pager(pages);
  $('#live-count').textContent = nab(r.length, true);
  $('#results').hidden = onMap;
  $('#mapview').hidden = !onMap;
  if (onMap) drawMap(r);
  cmpBar();
  writeUrl();
  setTimeout(runChecks, 350);
}

function watchdog(big) {
  return `<div class="watchdog watchdog--inline${big ? ' watchdog--empty' : ''}">
    <span class="watchdog__ico">${ico('bell', 'icon icon--lg')}</span>
    <div><h3 class="t-h3" style="font-size:var(--fs-card);line-height:var(--lh-card)">${big ? 'Pohlídáme to za vás' : 'Hlídací pes pro toto hledání'}</h3>
      <p>${big ? 'Jakmile se objeví nemovitost odpovídající vašemu filtru, pošleme vám e-mail.' : 'Nové nabídky podle aktuálních filtrů vám pošleme e-mailem.'}</p></div>
    <form onsubmit="event.preventDefault();this.innerHTML='<p><b>Hotovo.</b> Upozornění jsme nastavili.</p>'"><label class="sr-only" for="wd-${big ? 'e' : 'i'}">E-mail</label><input class="input" id="wd-${big ? 'e' : 'i'}" type="email" required placeholder="váš@e-mail.cz"><button class="btn btn--alt">Hlídat nabídky</button></form>
  </div>`;
}
function emptyState() {
  // Navrhni, který filtr uvolnit: spočítej výsledky bez každého z aktivních filtrů
  const tips = activeChips().map(([k, l]) => {
    const n = filtered(clearChip(k, structuredClone({ ...S }))).length;
    return n ? `<button class="fchip fchip--tip" data-clear="${esc(k)}">Bez „${esc(l)}“ <b>${n}</b></button>` : '';
  }).filter(Boolean).join('');
  return `<div class="empty__in">${ico('empty', 'icon empty__ico')}
    <h2 class="t-h3">Tomuto hledání teď nic neodpovídá</h2>
    <p>Zkuste uvolnit některý z filtrů, nebo si nechte posílat nové nabídky.</p>
    ${tips ? `<div class="chips" style="justify-content:center">${tips}</div>` : ''}
    ${watchdog(true)}</div>`;
}
function pager(pages) {
  if (pages <= 1) return '';
  const p = S.page, items = [];
  const wnd = innerWidth < 480 ? 0 : 1; // na úzkém mobilu jen první / aktuální / poslední
  for (let i = 1; i <= pages; i++) if (i === 1 || i === pages || Math.abs(i - p) <= wnd) items.push(i); else if (items.at(-1) !== '…') items.push('…');
  return `<button class="btn btn--secondary pager__more" data-pg="${p + 1}"${p >= pages ? ' disabled' : ''}>Další stránka ${ico('chev-right')}</button>
    <div class="pager__nums">
      <button class="icon-btn" data-pg="${p - 1}" aria-label="Předchozí"${p <= 1 ? ' disabled' : ''}>${ico('chev-left')}</button>
      ${items.map(i => i === '…' ? '<span>…</span>' : `<button class="pager__n" data-pg="${i}"${i === p ? ' aria-current="page"' : ''}>${i}</button>`).join('')}
      <button class="icon-btn" data-pg="${p + 1}" aria-label="Další"${p >= pages ? ' disabled' : ''}>${ico('chev-right')}</button>
    </div>`;
}

// --- Lokalita: více hodnot, našeptávač s počty ---
const GROUP = { top: 'Nejvíc nabídek', obec: 'Obce', 'čtvrť': 'Čtvrti a části obcí', ulice: 'Ulice' };
function suggestions(q) {
  const base = without({ locs: [] }), m = new Map();
  const add = (n, t) => { if (!n) return; const k = t + '|' + n; m.set(k, (m.get(k) || 0) + 1); };
  for (const x of base) { const g = geo(x); add(g.city, 'obec'); add(g.part, 'čtvrť'); add(g.street, 'ulice'); }
  const all = [...m].map(([k, n]) => { const [t, v] = k.split('|'); return { t, v, n }; });
  const nq = norm(q);
  if (!nq) return { top: all.filter(h => h.t === 'obec').sort((a, b) => b.n - a.n).slice(0, 8) };
  const hit = all.filter(h => norm(h.v).includes(nq)).sort((a, b) => (norm(b.v).startsWith(nq) - norm(a.v).startsWith(nq)) || b.n - a.n);
  return { obec: hit.filter(h => h.t === 'obec').slice(0, 5), 'čtvrť': hit.filter(h => h.t === 'čtvrť').slice(0, 5), ulice: hit.filter(h => h.t === 'ulice').slice(0, 4) };
}
function mark(v, q) {
  const i = q ? norm(v).indexOf(norm(q)) : -1;
  return i > -1 ? esc(v.slice(0, i)) + '<mark>' + esc(v.slice(i, i + q.length)) + '</mark>' + esc(v.slice(i + q.length)) : esc(v);
}
function openSuggest() {
  const loc = $('#f-loc'), q = loc.value.trim(), groups = suggestions(q);
  let html = '', i = 0;
  for (const [g, hits] of Object.entries(groups)) {
    if (!hits.length) continue;
    html += `<li class="suggest__group" role="presentation">${GROUP[g]}</li>`;
    html += hits.map(h => {
      const on = S.locs.some(v => norm(v) === norm(h.v));
      return `<li role="option" id="sg-${i++}" data-v="${esc(h.v)}" aria-selected="${on}">${ico(on ? 'check' : 'pin')}<span>${mark(h.v, q)}</span><small>${h.n}</small></li>`;
    }).join('');
  }
  if (q && !html) html = `<li class="suggest__empty" role="presentation">V aktuální nabídce není lokalita „${esc(q)}“</li>`;
  if (q) html += `<li role="option" id="sg-${i++}" class="suggest__free" data-free="${esc(q)}" aria-selected="false">${ico('search')}<span>Hledat „${esc(q)}“ v názvech nabídek</span></li>`;
  $('#suggest-list').innerHTML = html;
  $('#suggest').classList.add('is-open'); loc.setAttribute('aria-expanded', 'true');
  setActiveOpt(q ? 0 : -1);
}
function setActiveOpt(i) {
  const opts = $$('#suggest-list li[role=option]'), loc = $('#f-loc');
  opts.forEach((o, j) => o.classList.toggle('is-active', j === i));
  if (opts[i]) { loc.setAttribute('aria-activedescendant', opts[i].id); opts[i].scrollIntoView({ block: 'nearest' }); } else loc.removeAttribute('aria-activedescendant');
  openSuggest.i = i;
}
function closeSuggest() { $('#suggest').classList.remove('is-open'); $('#f-loc').setAttribute('aria-expanded', 'false'); $('#f-loc').removeAttribute('aria-activedescendant'); }
function toggleLoc(v) {
  const has = S.locs.find(d => norm(d) === norm(v));
  S.locs = has ? S.locs.filter(d => d !== has) : [...S.locs, v];
}
function locTags() {
  const l = S.locs;
  $('#loc-tags').innerHTML = l.slice(0, 2).map(v => `<button type="button" class="loctag" data-loc-x="${esc(v)}" aria-label="Odebrat lokalitu ${esc(v)}"><span>${esc(v)}</span>${ico('x')}</button>`).join('')
    + (l.length > 2 ? `<span class="loctag loctag--more" title="${esc(l.slice(2).join(', '))}">+${l.length - 2}</span>` : '');
  $('#f-loc').placeholder = l.length ? 'Přidat další' : 'Město, čtvrť nebo ulice';
}

// --- Porovnání (uloženo per kancelář v prohlížeči – jen pohodlí návštěvníka) ---
const CMP_KEY = () => 'nr-compare-' + dataKey(office);
const keyOf = x => (S.status === 'sold' ? 's' : 'a') + x.id;
const byKey = k => ((k[0] === 's' ? window.SOLD : window.LISTINGS)[dataKey(office)] || [])[+k.slice(1)];
let cmpMem = [];
function cmpGet() { let a = cmpMem; try { a = JSON.parse(localStorage.getItem(CMP_KEY()) || '[]'); } catch {} return Array.isArray(a) ? a.filter(byKey).slice(0, CMP_MAX) : []; }
function cmpSet(a) { cmpMem = a; try { localStorage.setItem(CMP_KEY(), JSON.stringify(a)); } catch {} }
const cmpInner = on => ico(on ? 'check' : 'compare') + `<span>${on ? 'V porovnání' : 'Porovnat'}</span>`;
const cmpBtn = (k, cls = '') => { const on = cmpGet().includes(k); return `<button type="button" class="cmp-btn${cls}" data-cmp="${k}" aria-pressed="${on}">${cmpInner(on)}</button>`; };
// Tlačítko „Porovnat“ se vloží do fotky karty z core.js – sdílenou kartu neměníme
const withCompare = (x, html) => html.replace('<div class="pcard__badges">', cmpBtn(keyOf(x), ' cmp-btn--card') + '<div class="pcard__badges">');

function cmpToggle(k) {
  let a = cmpGet();
  if (a.includes(k)) a = a.filter(v => v !== k);
  else if (a.length >= CMP_MAX) { cmpBar(`Porovnat lze nejvýše ${CMP_MAX} nabídky. Nejprve některou odeberte.`); return; }
  else a = [...a, k];
  cmpSet(a);
  $$(`[data-cmp="${k}"]:not(.cmpbar__x):not(.cmpt__x)`).forEach(b => { b.setAttribute('aria-pressed', a.includes(k)); b.innerHTML = cmpInner(a.includes(k)); });
  cmpBar();
  if ($('#cmp-dialog').open) cmpOpen(true);
}
function cmpBar(msg) {
  const a = cmpGet(), bar = $('#cmpbar');
  bar.hidden = !a.length;
  document.body.classList.toggle('has-cmpbar', !!a.length);
  if (!a.length) { bar.innerHTML = ''; return; }
  const slots = Array.from({ length: CMP_MAX }, (_, i) => {
    const k = a[i], x = k && byKey(k);
    return x ? `<li class="cmpbar__slot"><span class="cmpbar__img${x.img ? '' : ' is-empty'}">${x.img ? `<img src="${esc(x.img)}" alt="">` : ''}</span><span class="cmpbar__txt"><b>${x.price == null ? 'Na vyžádání' : short(x.price) + ' Kč'}</b><small>${esc(geo(x).city)}</small></span><button type="button" class="cmpbar__x" data-cmp="${k}" aria-label="Odebrat z porovnání: ${esc(x.t)}">${ico('x')}</button></li>`
      : `<li class="cmpbar__slot is-empty" aria-hidden="true"></li>`;
  }).join('');
  bar.classList.toggle('is-warn', !!msg);
  bar.innerHTML = `<div class="container cmpbar__in">
    <div class="cmpbar__label"><b>Porovnání</b><span aria-live="polite">${msg ? esc(msg) : `${a.length} z ${CMP_MAX} nabídek`}</span></div>
    <ul class="cmpbar__slots">${slots}</ul>
    <div class="cmpbar__act"><button type="button" class="btn btn--ghost" data-cmp-clear>Zrušit výběr</button><button type="button" class="btn btn--primary" data-cmp-open${a.length < 2 ? ' disabled' : ''}>${a.length < 2 ? 'Vyberte ještě 1' : 'Porovnat ' + a.length}</button></div>
  </div>`;
}
function cmpOpen(refresh) {
  const d = $('#cmp-dialog'), a = cmpGet().map(k => [k, byKey(k)]);
  if (a.length < 2) { if (d.open) d.close(); return; }
  const xs = a.map(([, x]) => x), sameDeal = new Set(xs.map(x => !!x.rent)).size === 1;
  const best = (vals, fn) => { const v = vals.filter(n => n != null); return v.length > 1 && new Set(v).size > 1 ? fn(...v) : null; };
  const pBest = sameDeal ? best(xs.map(x => x.price), Math.min) : null;
  const mBest = sameDeal ? best(xs.map(ppm), Math.min) : null;
  const aBest = best(xs.map(x => x.area), Math.max);
  const lBest = best(xs.map(x => x.land), Math.max);
  const tag = t => `<em class="cmp-best">${t}</em>`;
  const per = x => x.rent ? '<small> / měsíc</small>' : '';
  const row = (label, fn) => { const v = a.map(([k, x]) => fn(x, k)); return v.every(c => c === "–") ? "" : `<tr><th scope="row">${label}</th>${v.map(c => `<td>${c}</td>`).join("")}</tr>`; }; // řádek bez údajů vynech
  const rows = [
    row('Cena', x => x.price == null ? '<span class="muted">Na vyžádání</span>' : `<b>${kc(x.price)}</b>${per(x)}${x.price === pBest ? tag('nejnižší') : ''}`),
    row('Cena za m²', x => ppm(x) == null ? '–' : `${kc(ppm(x))}${per(x)}${ppm(x) === mBest ? tag('nejnižší') : ''}`),
    row('Typ', x => `${x.rent ? 'Pronájem' : 'Prodej'} · ${TYPE_LABEL[x.type]}`),
    row('Dispozice / druh', x => esc(x.disp || subLabel(x.sub) || '–')),
    row('Plocha', x => x.area ? `${num(x.area)} m²${x.area === aBest ? tag('největší') : ''}` : '–'),
    row('Pozemek', x => x.land ? `${num(x.land)} m²${x.land === lBest ? tag('největší') : ''}` : '–'),
    row('Lokalita', x => esc(x.loc) + (geo(x).part ? `<small class="cmpt__sub">${esc(geo(x).part)}</small>` : '')),
    row('Stav nabídky', (x, k) => k[0] === 's' ? (x.rent ? 'Pronajato' : 'Prodáno') : 'V nabídce'),
  ].join('');
  const h = href('detail.html');
  d.querySelector('.cmpd__body').innerHTML = `<table class="cmpt" style="--cols:${a.length}">
    <thead><tr><td class="cmpt__corner">${nab(a.length)}</td>${a.map(([k, x]) => `<th scope="col"><div class="cmpt__head">
        <a class="cmpt__img${x.img ? '' : ' is-empty'}" href="${h}" tabindex="-1">${x.img ? `<img src="${esc(x.img)}" alt="">` : ico('image', 'icon icon--lg')}</a>
        <a class="cmpt__title" href="${h}">${esc(x.t)}</a>
        <button type="button" class="cmpt__x" data-cmp="${k}" aria-label="Odebrat z porovnání: ${esc(x.t)}">${ico('x')}<span>Odebrat</span></button>
      </div></th>`).join('')}</tr></thead>
    <tbody>${rows}<tr class="cmpt__links"><th scope="row"><span class="sr-only">Odkaz</span></th>${a.map(() => `<td><a class="btn btn--secondary" href="${h}">Detail nabídky</a></td>`).join('')}</tr></tbody></table>`;
  if (!d.open) { d.showModal(); d.querySelector('.cmpd__close').focus(); }
}

// --- Mapa: podklad OpenStreetMap (zesvětlený filtrem), cenové štítky, seznam synchronizovaný s výřezem ---
let map, cluster, markers = new Map(), mapKey = null, mapRes = [], inView = [], liveMove = true, activeKey = null, sideKey = '', popOpen = false;
const TILE = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'; // bezklíčový podklad; světlý vzhled dělá CSS filtr (listing.css)
const mapBlocked = () => `<div class="blocked">${ico('map', 'icon icon--lg')}
  <p><b>Mapa se zobrazí po povolení cookies</b><br>Mapové podklady poskytuje třetí strana (OpenStreetMap), která může ukládat cookies. Seznam nabídek funguje i bez mapy.</p>
  <button class="btn btn--secondary" data-consent-yes>Povolit a zobrazit</button></div>`;
const priceTxt = x => x.price == null ? 'Na vyžádání' : short(x.price) + (x.rent ? ' / měs.' : '');
const priceFull = x => x.price == null ? '<span class="muted">Cena na vyžádání</span>' : kc(x.price) + (x.rent ? '<small> / měsíc</small>' : '');

function mcard(x) {
  const k = keyOf(x), h = href('detail.html');
  const badge = S.status === 'sold' ? `<span class="badge badge--sold">${x.rent ? 'Pronajato' : 'Prodáno'}</span>` : x.rent ? '<span class="badge badge--rent">Pronájem</span>' : '';
  return `<article class="mcard${k === activeKey ? ' is-active' : ''}${S.status === 'sold' ? ' is-sold' : ''}" data-key="${k}">
    <a class="mcard__media${x.img ? '' : ' is-empty'}" href="${h}" tabindex="-1" aria-hidden="true">${x.img ? `<img src="${esc(x.img)}" alt="" loading="lazy" onerror="this.parentElement.classList.add('is-empty');this.remove()">` : ico('image', 'icon icon--lg')}${badge}</a>
    <div class="mcard__body">
      <div class="mcard__price">${priceFull(x)}</div>
      <div class="mcard__params">${esc(params(x).join(' · '))}</div>
      <h3 class="mcard__loc"><a href="${h}" title="${esc(x.t)}">${esc(x.loc)}</a></h3>
      ${cmpBtn(k)}
    </div>
  </article>`;
}
function popup(x) {
  const h = href('detail.html');
  return `<div class="lpop__in">
    <a class="lpop__media${x.img ? '' : ' is-empty'}" href="${h}" tabindex="-1">${x.img ? `<img src="${esc(x.img)}" alt="">` : ico('image', 'icon icon--lg')}</a>
    <div class="lpop__body">
      <div class="lpop__price">${priceFull(x)}</div>
      <div class="lpop__params">${esc(params(x).join(' · '))}${ppm(x) ? ` · ${num(ppm(x))} Kč/m²` : ''}</div>
      <div class="lpop__loc">${esc(x.loc)}</div>
      <div class="lpop__act"><a class="btn btn--primary" href="${h}">Detail nabídky</a>${cmpBtn(keyOf(x))}</div>
    </div></div>`;
}

function drawMap(r) {
  mapRes = r;
  const el = $('#map');
  if (consent.get() !== 'yes' || !window.L) {
    if (map) { map.remove(); map = null; }
    mapKey = null; markers = new Map();
    el.innerHTML = window.L ? mapBlocked() : '<div class="blocked">Mapová knihovna se nenačetla. Seznam nabídek zůstává k dispozici.</div>';
    $('#lmap-redo').hidden = true;
    inView = r; renderSide(true);
    return;
  }
  if (!map) {
    el.innerHTML = '';
    map = L.map(el, { scrollWheelZoom: true, zoomControl: false });
    L.control.zoom({ position: 'topright', zoomInTitle: 'Přiblížit', zoomOutTitle: 'Oddálit' }).addTo(map);
    L.tileLayer(TILE, { maxZoom: 19, attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>' }).addTo(map);
    map.attributionControl.setPrefix(false);
    cluster = L.markerClusterGroup({
      showCoverageOnHover: false, maxClusterRadius: 56, spiderfyDistanceMultiplier: 1.8, chunkedLoading: true,
      iconCreateFunction: c => { const n = c.getChildCount(), s = n >= 50 ? 56 : n >= 10 ? 48 : 40; return L.divIcon({ html: `<span>${n}</span>`, className: 'lclu', iconSize: [s, s] }); },
    });
    map.addLayer(cluster);
    map.on('moveend', () => { if (liveMove || !isDesk()) syncView(); else { $('#lmap-redo').hidden = false; highlight(activeKey, !!activeKey); } });
    map.on('popupopen', () => (popOpen = true));
    map.on('popupclose', () => { popOpen = false; setActive(null); });
    cluster.on('animationend', () => highlight(activeKey, !!activeKey));
  }
  setTimeout(() => map && map.invalidateSize(), 60);
  const key = JSON.stringify([office, S.status, r.map(x => x.id)]);
  if (mapKey === key) { syncView(); return; }
  mapKey = key; markers = new Map(); sideKey = ''; activeKey = null;
  map.closePopup();
  cluster.clearLayers();
  const ms = r.map(x => {
    const k = keyOf(x);
    const m = L.marker([x.lat, x.lng], { icon: L.divIcon({ className: 'lpin', html: `<span>${priceTxt(x)}</span>`, iconSize: null }), keyboard: true, title: x.t, riseOnHover: true });
    m.on('click', () => pick(k, true));
    markers.set(k, m);
    return m;
  });
  cluster.addLayers(ms);
  fitAll(false);
}
function fitAll(anim = true) {
  if (!map) return;
  const pts = mapRes.map(x => [x.lat, x.lng]);
  if (pts.length) map.fitBounds(L.latLngBounds(pts).pad(0.08), { maxZoom: 14, animate: anim });
  else map.setView([49.9, 15.3], 7);
  syncView();
}
function syncView() {
  $('#lmap-redo').hidden = true;
  if (map) { const b = map.getBounds(); inView = mapRes.filter(x => b.contains([x.lat, x.lng])); } else inView = mapRes;
  renderSide();
  highlight(activeKey, !!activeKey);
}
function renderSide(force) {
  const k = inView.map(keyOf).join(',');
  const total = mapRes.length, all = !map || inView.length === total;
  $('#lmap-info').innerHTML = all ? `<b>${nab(total)}</b>${map ? ' na mapě' : ''}` : `<b>${nab(inView.length)}</b> v zobrazené oblasti <span>z ${total}</span>`;
  $('#results-info').textContent = all ? `${nab(total)}${map ? ' na mapě' : ''}` : `${nab(inView.length)} v zobrazené oblasti z ${total}`;
  $('#lmap-fit').hidden = all;
  if (!force && k === sideKey) return;
  sideKey = k;
  const list = $('#lmap-list');
  list.innerHTML = inView.length ? inView.map(mcard).join('')
    : `<div class="lmap__none"><p>V zobrazené oblasti není žádná nabídka odpovídající filtrům.</p><button type="button" class="btn btn--secondary" data-map-all>Zobrazit všech ${total}</button></div>`;
  const c = activeKey && $(`.mcard[data-key="${activeKey}"]`, list);
  if (c) reveal(c, false); else { list.scrollTop = 0; list.scrollLeft = 0; }
}
function reveal(c, smooth = true) {
  const list = $('#lmap-list'), behavior = smooth ? 'smooth' : 'auto';
  if (isDesk()) list.scrollTo({ top: c.offsetTop - 12, behavior });
  else list.scrollTo({ left: c.offsetLeft - (list.clientWidth - c.offsetWidth) / 2, behavior });
}
// zvýraznění štítku na mapě (nebo shluku, ve kterém se nabídka skrývá)
function highlight(k, on) {
  $$('#map .is-active').forEach(e => e.classList.remove('is-active'));
  const m = k && markers.get(k);
  if (!m || !on || !cluster) return;
  const vis = cluster.getVisibleParent(m);
  const el = vis && vis.getElement && vis.getElement();
  if (el) el.classList.add('is-active');
  if (vis === m) m.setZIndexOffset(1000);
}
function setActive(k) {
  if (activeKey && activeKey !== k) markers.get(activeKey)?.setZIndexOffset(0);
  activeKey = k;
  $$('.mcard.is-active').forEach(c => c.classList.remove('is-active'));
  if (k) $(`.mcard[data-key="${k}"]`)?.classList.add('is-active');
  highlight(k, !!k);
}
function pick(k, fromMap) {
  const x = mapRes.find(v => keyOf(v) === k), m = markers.get(k);
  if (!x) return;
  if (fromMap && isDesk() && m) L.popup({ className: 'lpop', maxWidth: 300, minWidth: 280, offset: [0, -34], autoPanPadding: [32, 32] }).setLatLng(m.getLatLng()).setContent(popup(x)).openOn(map);
  setActive(k);
  const c = $(`.mcard[data-key="${k}"]`);
  if (c) reveal(c);
}

window.PAGE = {
  note: 'Data: reálné nabídky z mapy výpisu (TGH 238, Stars 68 + 184 realizovaných). Druh nemovitosti a lokalita (obec, čtvrť, ulice) jsou z polí CRM; dispozice a plocha v předloze parsované z názvu. Mapa: podklad OpenStreetMap ve světlé úpravě. Výběr k porovnání se ukládá jen v prohlížeči.',
  render() { if (!this.ready) { readUrl(); this.ready = true; } syncForm(); mapKey = null; render(); },
  checks() {
    const cmp = check('Porovnání', null, cmpGet().length + ' / ' + CMP_MAX);
    if (S.view === 'map') {
      const n = $$('#lmap-list .mcard').length;
      return check('Mapa: seznam u mapy', n > 0 || !inView.length, n + ' karet') + check('Mapa: seznam = výřez', map ? n === inView.length : null, inView.length + ' / ' + mapRes.length) + cmp;
    }
    const tops = $$('#grid .pcard').map(c => Math.round(c.getBoundingClientRect().top));
    const perRow = tops.filter(t => t === tops[0]).length;
    const first = $('#grid .pcard');
    const head = $('.list-head').getBoundingClientRect().top + scrollY;
    const fTop = first ? first.getBoundingClientRect().top + scrollY : null;
    const firstInView = first ? fTop + 120 - head <= innerHeight : null; // aspoň horní část karty (foto) do 1 posunutí
    const hs = $$('#grid .pcard').filter(c => Math.round(c.getBoundingClientRect().top) === tops[0]).map(c => c.offsetHeight);
    return check('Karet v řadě', innerWidth >= 1440 ? perRow >= 4 : null, perRow + (innerWidth >= 1440 ? ' (cíl 4)' : ''))
      + check('Stejná výška karet', hs.length ? new Set(hs).size === 1 : null, [...new Set(hs)].join('/') + ' px')
      + check('1. nemovitost do 1 posunutí', innerWidth < 768 ? firstInView : null, fTop == null ? '–' : Math.round(fTop - head) + ' px od hlavičky') + cmp;
  },
  init() {
    const opts = SORTS.map(([v, l]) => `<option value="${v}">${l}</option>`).join('');
    $('#sort').innerHTML = $('#sort-m').innerHTML = opts;
    const upd = (skel = true) => { S.page = 1; render(skel); };
    $$('[data-deal]').forEach(b => b.addEventListener('click', () => { S.deal = b.dataset.deal; syncForm(); upd(); }));
    $('#f-type').addEventListener('change', e => { S.type = e.target.value; S.sub = []; if (S.type && S.type !== 'byt') S.disp = []; syncForm(); upd(); });
    $('#f-sub').addEventListener('click', e => { const c = e.target.closest('[data-sub]'); if (!c) return; const v = c.dataset.sub; S.sub = S.sub.includes(v) ? S.sub.filter(d => d !== v) : [...S.sub, v]; upd(); });
    $$('#f-area .chip').forEach(c => c.addEventListener('click', () => { S.area = S.area === +c.dataset.v ? null : +c.dataset.v; syncForm(); upd(); }));
    $$('#f-disp .chip').forEach(c => c.addEventListener('click', () => { const v = c.dataset.v; S.disp = S.disp.includes(v) ? S.disp.filter(d => d !== v) : [...S.disp, v]; syncForm(); upd(); }));
    for (const id of ['f-pmin', 'f-pmax']) {
      const el = $('#' + id);
      el.addEventListener('input', () => { // oddělovač tisíců při psaní
        const n = parseNum(el.value); el.value = n ? num(n) : '';
        S[id === 'f-pmin' ? 'pmin' : 'pmax'] = n; clearTimeout(el.t); el.t = setTimeout(() => upd(), 400);
      });
    }
    // lokalita – více hodnot (štítky), našeptávač s počty, ovládání klávesnicí
    const loc = $('#f-loc'), list = $('#suggest-list');
    const commit = v => { toggleLoc(v); loc.value = ''; syncForm(); upd(false); openSuggest(); };
    const choose = li => commit(li.dataset.free || li.dataset.v);
    loc.addEventListener('input', () => openSuggest());
    loc.addEventListener('focus', () => openSuggest());
    $('#locbox').addEventListener('click', e => { if (!e.target.closest('[data-loc-x]')) loc.focus(); });
    list.addEventListener('mousedown', e => { e.preventDefault(); const li = e.target.closest('li[role=option]'); if (li) choose(li); });
    loc.addEventListener('blur', () => setTimeout(closeSuggest, 120));
    loc.addEventListener('keydown', e => {
      const opts = $$('#suggest-list li[role=option]'), i = openSuggest.i ?? -1;
      if (e.key === 'ArrowDown') { e.preventDefault(); if (!$('#suggest').classList.contains('is-open')) openSuggest(); setActiveOpt(Math.min(opts.length - 1, i + 1)); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); setActiveOpt(Math.max(-1, i - 1)); }
      else if (e.key === 'Enter') { e.preventDefault(); if (opts[i]) choose(opts[i]); else if (loc.value.trim()) commit(loc.value.trim()); }
      else if (e.key === 'Escape' && $('#suggest').classList.contains('is-open')) { e.stopPropagation(); closeSuggest(); }
      else if (e.key === 'Backspace' && !loc.value && S.locs.length) { S.locs = S.locs.slice(0, -1); syncForm(); upd(false); openSuggest(); }
    });
    $('#loc-tags').addEventListener('click', e => { const t = e.target.closest('[data-loc-x]'); if (!t) return; e.stopPropagation(); toggleLoc(t.dataset.locX); syncForm(); upd(false); });

    $('#sort').addEventListener('change', e => { S.sort = e.target.value; syncForm(); upd(); });
    $('#sort-m').addEventListener('change', e => { S.sort = e.target.value; syncForm(); upd(); });
    $$('[data-view]').forEach(b => b.addEventListener('click', () => { S.view = b.dataset.view; syncForm(); render(); }));
    // capture: kliknutí v Leaflet popupu se jinak k dokumentu nedostanou
    document.addEventListener('click', e => {
      const cm = e.target.closest('[data-cmp]');
      if (cm) { e.preventDefault(); e.stopPropagation(); cmpToggle(cm.dataset.cmp); return; }
      if (e.target.closest('[data-cmp-open]')) cmpOpen();
      if (e.target.closest('[data-cmp-clear]')) { cmpSet([]); $$('[data-cmp][aria-pressed="true"]').forEach(b => { b.setAttribute('aria-pressed', 'false'); b.innerHTML = cmpInner(false); }); cmpBar(); }
      if (e.target.closest('[data-map-all]')) fitAll();
    }, true);
    document.addEventListener('click', e => {
      const c = e.target.closest('[data-clear]');
      if (c) { const k = c.dataset.clear; if (k === '*') Object.assign(S, BLANK()); else clearChip(k); syncForm(); upd(); }
      const p = e.target.closest('[data-pg]');
      if (p && !p.disabled) { S.page = +p.dataset.pg; render(true); $('#main').scrollIntoView({ behavior: 'smooth' }); }
      const st = e.target.closest('[data-status]');
      if (st) { S.status = st.dataset.status; mapKey = null; upd(); }
    });
    // porovnání – dialog
    const d = $('#cmp-dialog');
    d.querySelector('.cmpd__close').addEventListener('click', () => d.close());
    d.addEventListener('click', e => { if (e.target === d) d.close(); });
    d.addEventListener('close', () => { document.documentElement.classList.remove('cmp-lock'); $('[data-cmp-open]')?.focus(); });
    new MutationObserver(() => document.documentElement.classList.toggle('cmp-lock', d.open)).observe(d, { attributes: true, attributeFilter: ['open'] });
    addEventListener('storage', e => { if (e.key === CMP_KEY()) render(); });
    // mapa – seznam ↔ štítky
    const side = $('#lmap-list');
    side.addEventListener('mouseover', e => { if (!isDesk() || popOpen) return; const c = e.target.closest('.mcard'); if (c && c.dataset.key !== activeKey) setActive(c.dataset.key); });
    side.addEventListener('mouseleave', () => { if (isDesk() && !popOpen) setActive(null); });
    side.addEventListener('focusin', e => { const c = e.target.closest('.mcard'); if (c && !popOpen) setActive(c.dataset.key); });
    side.addEventListener('scroll', () => { // mobil: karta uprostřed karuselu = zvýrazněný štítek
      if (isDesk()) return;
      clearTimeout(side.t); side.t = setTimeout(() => {
        const mid = side.scrollLeft + side.clientWidth / 2;
        const c = $$('.mcard', side).sort((a, b) => Math.abs(a.offsetLeft + a.offsetWidth / 2 - mid) - Math.abs(b.offsetLeft + b.offsetWidth / 2 - mid))[0];
        if (c && c.dataset.key !== activeKey) setActive(c.dataset.key);
      }, 120);
    }, { passive: true });
    $('#lmap-live').addEventListener('change', e => { liveMove = e.target.checked; if (liveMove) syncView(); });
    $('#lmap-redo').addEventListener('click', syncView);
    $('#lmap-fit').addEventListener('click', () => fitAll());
    // mobilní panel filtrů
    const fw = $('#filterwrap'), ob = $('#open-filters');
    const sheet = v => { fw.classList.toggle('is-open', v); ob.setAttribute('aria-expanded', v); document.body.style.overflow = v ? 'hidden' : ''; };
    ob.addEventListener('click', () => sheet(true));
    addEventListener('keydown', e => { if (e.key === 'Escape' && fw.classList.contains('is-open')) { sheet(false); ob.focus(); } });
    $('#close-filters').addEventListener('click', () => sheet(false));
    $('#apply-m').addEventListener('click', () => sheet(false));
    $('#reset-m').addEventListener('click', () => { Object.assign(S, BLANK()); syncForm(); upd(false); });
    document.addEventListener('consent', () => { mapKey = null; if (S.view === 'map') render(); });
    let rw; addEventListener('resize', () => { clearTimeout(rw); rw = setTimeout(() => { if (map && S.view === 'map') { map.invalidateSize(); renderSide(true); } }, 200); });
    // sticky lišta filtrů – stín po odlepení
    const io = new IntersectionObserver(([en]) => fw.classList.toggle('is-stuck', !en.isIntersecting), { rootMargin: '-73px 0px 0px 0px' });
    io.observe($('.list-head'));
  },
};
