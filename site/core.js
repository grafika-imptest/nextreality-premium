// Společné jádro předlohy: ikony, hlavička, patička, cookies, karta nemovitosti, přepínač kanceláře, kontrola kritérií.
// Každá stránka definuje window.PAGE = { render(officeKey), checks() } a načte core.js jako poslední.
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const num = n => n.toLocaleString('cs-CZ');
const kc = n => num(n) + ' Kč';
const ico = (id, cls = 'icon') => `<svg class="${cls}" aria-hidden="true"><use href="#i-${id}"/></svg>`;
const qs = new URLSearchParams(location.search);
// Dvě verze předlohy (standardní / prémiová) – přepínač zachová stránku, filtry i kancelář
const VERSION = 'premium';
const VERSIONS = { standard: { label: 'Standardní', repo: 'nextreality-ds', port: 5194 }, premium: { label: 'Prémiová', repo: 'nextreality-premium', port: 5196 } };
function versionUrl(v) {
  const t = VERSIONS[v], file = location.pathname.split('/').pop() || 'index.html';
  const base = location.hostname.endsWith('github.io') ? `${location.origin}/${t.repo}/` : `${location.protocol}//${location.hostname}:${t.port}/`;
  return base + file + location.search + location.hash;
}
const versionSwitch = () => `<div class="review__ver" role="group" aria-label="Verze předlohy">${Object.entries(VERSIONS).map(([k, v]) => k === VERSION
  ? `<span class="review__vbtn is-on" aria-current="true">${v.label}</span>`
  : `<a class="review__vbtn" href="${versionUrl(k)}" data-version="${k}">${v.label}</a>`).join('')}</div>`;
// skloňování: nab(1)='1 nabídka', nab(3)='3 nabídky', nab(5)='5 nabídek'; acc=true pro 4. pád (zobrazit 1 nabídku)
const nab = (n, acc) => `${num(n)} ${n === 1 ? (acc ? 'nabídku' : 'nabídka') : n >= 2 && n <= 4 ? 'nabídky' : 'nabídek'}`;

// --- Ikonová sada: 24×24, tah 1.8. 20 px v textu, 24 px samostatně ---
const ICONS = {
  search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>',
  pin: '<path d="M12 21s-7-6.2-7-11.5a7 7 0 0 1 14 0C19 14.8 12 21 12 21z"/><circle cx="12" cy="9.5" r="2.5"/>',
  byt: '<rect x="5" y="3" width="14" height="18" rx="1.5"/><path style="stroke:var(--icon-accent,currentColor)" d="M9 7h1M14 7h1M9 11h1M14 11h1M9 15h1M14 15h1"/><path d="M10.5 21v-3h3v3"/>',
  dum: '<path style="stroke:var(--icon-accent,currentColor)" d="M3 11 12 4l9 7"/><path d="M5 9.5V20h14V9.5"/><path style="stroke:var(--icon-accent,currentColor)" d="M10 20v-6h4v6"/>',
  komercni: '<rect x="3" y="7" width="18" height="13" rx="2"/><path style="stroke:var(--icon-accent,currentColor)" d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><path d="M3 13h18"/><path style="stroke:var(--icon-accent,currentColor)" d="M11 13v2h2v-2"/>',
  pozemek: '<path style="stroke:var(--icon-accent,currentColor)" d="M3 20h18"/><path d="M8 20v-5"/><path d="M8 4 3.5 13h9z"/><path d="M16.5 20v-3"/><path style="stroke:var(--icon-accent,currentColor)" d="M16.5 9 13.5 17h6z"/>',
  ostatni: '<rect x="4" y="4" width="7" height="7" rx="1.5"/><rect style="stroke:var(--icon-accent,currentColor)" x="13" y="4" width="7" height="7" rx="1.5"/><rect x="4" y="13" width="7" height="7" rx="1.5"/><rect x="13" y="13" width="7" height="7" rx="1.5"/>',
  projekt: '<path d="M3 21h18M5 21V8l7-5 7 5v13"/><path style="stroke:var(--icon-accent,currentColor)" d="M9 10h1M14 10h1M9 13.5h1M14 13.5h1"/><path d="M9 21v-4h6v4"/>',
  heart: '<path d="M12 20s-7.5-4.6-9.2-9.3A4.9 4.9 0 0 1 12 7a4.9 4.9 0 0 1 9.2 3.7C19.5 15.4 12 20 12 20z"/>',
  phone: '<path d="M5 4h3.5l2 5-2.5 1.5a11 11 0 0 0 5.5 5.5L15 13.5l5 2V19a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2"/>',
  mail: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3.5 7 8.5 6 8.5-6"/>',
  arrow: '<path d="M5 12h14M13 6l6 6-6 6"/>',
  'arrow-left': '<path d="M19 12H5M11 6l-6 6 6 6"/>',
  'chev-left': '<path d="m15 6-6 6 6 6"/>',
  'chev-right': '<path d="m9 6 6 6-6 6"/>',
  'chev-down': '<path d="m6 9 6 6 6-6"/>',
  check: '<path d="M20 6 9 17l-5-5"/>',
  star: '<path d="M12 3l2.8 5.7 6.2.9-4.5 4.4 1 6.2L12 17.3l-5.5 2.9 1-6.2L3 9.6l6.2-.9z"/>',
  menu: '<path d="M4 7h16M4 12h16M4 17h16"/>',
  x: '<path d="M6 6l12 12M18 6 6 18"/>',
  bell: '<path d="M6 9a6 6 0 0 1 12 0c0 7 3 8 3 8H3s3-1 3-8"/><path d="M10 21h4"/>',
  image: '<rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="9" cy="10" r="2"/><path d="m21 16-5-5-9 9"/>',
  play: '<circle cx="12" cy="12" r="10"/><path d="m10 8 6 4-6 4z" fill="currentColor"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  filter: '<path d="M4 6h16M7 12h10M10 18h4"/>',
  sort: '<path d="M7 4v16M3 16l4 4 4-4M17 20V4M13 8l4-4 4 4"/>',
  list: '<rect x="3" y="4" width="7" height="7" rx="1.5"/><rect x="14" y="4" width="7" height="7" rx="1.5"/><rect x="3" y="13" width="7" height="7" rx="1.5"/><rect x="14" y="13" width="7" height="7" rx="1.5"/>',
  map: '<path d="M9 4 3 6v14l6-2 6 2 6-2V4l-6 2z"/><path d="M9 4v14M15 6v14"/>',
  plocha: '<path d="M4 9V4h5M15 4h5v5M20 15v5h-5M9 20H4v-5"/>',
  pokoje: '<rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 12h9M12 3v18M16 12h5"/>',
  stav: '<path d="m4 20 4-1L19 8l-3-3L5 16z"/><path d="m14 7 3 3"/>',
  solar: '<rect x="3" y="10" width="18" height="10" rx="1"/><path d="M3 15h18M9 10v10M15 10v10M12 3v3M5.6 5.6l1.4 1.4M18.4 5.6 17 7"/>',
  heat: '<path d="M12 3v12M8 7l4-4 4 4"/><circle cx="12" cy="18" r="3"/>',
  air: '<path d="M3 8h11a3 3 0 1 0-3-3M3 12h15a3 3 0 1 1-3 3M3 16h7"/>',
  sauna: '<path d="M4 20h16M6 20v-6h12v6"/><path d="M9 10c0-2 2-2 2-4M13 10c0-2 2-2 2-4"/>',
  terasa: '<path d="M3 10h18L12 4z"/><path d="M5 10v10M19 10v10M3 15h18"/>',
  auto: '<path d="M5 16V11l2-5h10l2 5v5"/><path d="M3 16h18v3H3zM7 19v2M17 19v2"/><circle cx="8" cy="13.5" r=".5"/><circle cx="16" cy="13.5" r=".5"/>',
  sklep: '<path d="M3 10 12 4l9 6"/><path d="M5 10v10h14V10"/><path d="M9 14h6M9 17h6"/>',
  zahrada: '<path d="M12 21V11"/><path d="M12 11c-4 0-6-3-6-7 4 0 6 3 6 7zM12 14c3 0 5-2 5-5-3 0-5 2-5 5z"/><path d="M5 21h14"/>',
  download: '<path d="M12 4v11M7 10l5 5 5-5M5 20h14"/>',
  calc: '<rect x="5" y="3" width="14" height="18" rx="2"/><path d="M8 7h8M8 11h1M12 11h1M16 11h0M8 15h1M12 15h1M16 15v3"/>',
  share: '<circle cx="18" cy="5" r="2.5"/><circle cx="6" cy="12" r="2.5"/><circle cx="18" cy="19" r="2.5"/><path d="m8.2 10.8 7.6-4.4M8.2 13.2l7.6 4.4"/>',
  info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 8h0"/>',
  compare: '<path d="M12 4v16M8 20h8M4.5 7h15"/><circle cx="12" cy="4.5" r="1"/><path d="M6.5 7 3.5 14M6.5 7l3 7M17.5 7l-3 7M17.5 7l3 7"/><path d="M3 14h7a3.5 3.5 0 0 1-7 0zM14 14h7a3.5 3.5 0 0 1-7 0z"/>', /* váhy */
  expand: '<path d="M14 4h6v6M10 20H4v-6M20 4l-7 7M4 20l7-7"/>',
  floor: '<rect x="3" y="3" width="18" height="18" rx="1"/><path d="M3 12h7v9M10 3v5M14 12h7M14 12v4"/>',
  shield: '<path d="M12 3 4 6v6c0 5 3.5 8 8 9 4.5-1 8-4 8-9V6z"/>',
  user: '<circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 4-6 8-6s8 2 8 6"/>',
  people: '<circle cx="9" cy="8" r="3.5"/><path d="M2 20c0-3.5 3-5.5 7-5.5s7 2 7 5.5"/><circle cx="17" cy="7" r="2.5"/><path d="M17 12c3 0 5 1.5 5 4.5"/>',
  camera: '<rect x="3" y="7" width="18" height="13" rx="2"/><path d="M8 7l2-3h4l2 3"/><circle cx="12" cy="13.5" r="3.5"/>',
  megaphone: '<path d="M3 10v4h4l8 5V5L7 10z"/><path d="M19 9a4 4 0 0 1 0 6"/>',
  doc: '<path d="M6 3h8l4 4v14H6z"/><path d="M14 3v4h4M9 12h6M9 16h6"/>',
  key: '<circle cx="8" cy="15" r="4"/><path d="m11 12 9-9M16 7l3 3M14 9l2 2"/>',
  calendar: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/>',
  bank: '<path d="M3 10 12 4l9 6M5 10v8M9 10v8M15 10v8M19 10v8M3 20h18"/>',
  video: '<rect x="3" y="6" width="13" height="12" rx="2"/><path d="m16 10 5-3v10l-5-3"/>',
  nav: '<path d="M3 11 21 3l-8 18-2-8z"/>',
  quote: '<path d="M7 17c-2 0-3-1.5-3-4 0-3 2-6 5-7M17 17c-2 0-3-1.5-3-4 0-3 2-6 5-7"/>',
  chat: '<path d="M4 5h16v11H9l-5 4z"/>',
  home404: '<path d="M3 11 12 4l9 7"/><path d="M5 9.5V20h14V9.5"/><path d="M10 14h4"/>',
  empty: '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5M8.5 8.5l5 5M13.5 8.5l-5 5"/>',
};
document.body.insertAdjacentHTML('afterbegin', `<svg width="0" height="0" style="position:absolute" aria-hidden="true">${Object.entries(ICONS).map(([k, v]) => `<symbol id="i-${k}" viewBox="0 0 24 24">${v}</symbol>`).join('')}</svg>`);

// --- Kancelář ---
const OFFICE_KEYS = ['tgh', 'stars', 'test'];
let office = qs.get('office') || (() => { try { return sessionStorage.getItem('nr-office'); } catch { return null; } })() || 'tgh';
if (!OFFICE_KEYS.includes(office)) office = 'tgh';
const dataKey = k => (k === 'test' ? 'tgh' : k); // test barev používá data TGH
const href = (u, extra = '') => `${u}?office=${office}${extra}`;

// --- Hlavička, patička, cookies, panel předlohy ---
const NAV = [
  ['vypis.html', 'Nabídka nemovitostí', 'vypis'], ['projekty.html', 'Developerské projekty', 'projekty'], ['realizovano.html', 'Realizováno', 'realizovano', 1],
  ['prodat.html', 'Chci prodat', 'prodat'], ['makleri.html', 'Makléři', 'makleri'], ['index.html#reference', 'Reference', null, 1], ['kontakty.html', 'Kontakty', 'kontakty'],
];
function layout() {
  const cur = document.body.dataset.page;
  const isCur = p => p && (p === cur || (p === 'realizovano' && cur === 'vypis' && qs.get('status') === 'sold')) && !(p === 'vypis' && qs.get('status') === 'sold');
  const link = u => { const [a, q] = u.split('|'); return `data-href="${a}"${q ? ` data-q="${q}"` : ''}`; };
  const nav = NAV.map(([u, l, p, opt]) => `<a${opt ? ' class="nav__opt"' : ''} ${link(u)}${isCur(p) ? ' aria-current="page"' : ''}>${l}</a>`).join('');
  $('#site-header').outerHTML = `<header class="header" id="header">
  <div class="wide header__in">
    <a class="logo" data-href="index.html" aria-label="Domů"><img data-bind="logo" alt="" width="250" height="76"></a>
    <nav class="nav" aria-label="Hlavní navigace">${nav}</nav>
    <div class="header__actions">
      <a class="icon-btn" href="#" aria-label="Oblíbené (2)">${ico('heart', 'icon icon--lg')}<span class="count">2</span></a>
      <a class="btn btn--primary" data-href="prodat.html#odhad">Odhad ceny zdarma</a>
      <button class="icon-btn menu-toggle" aria-label="Menu" aria-expanded="false" aria-controls="drawer">${ico('menu', 'icon icon--lg')}</button>
    </div>
  </div>
</header>
<div class="drawer" id="drawer" hidden>
  <div class="drawer__panel" role="dialog" aria-label="Menu">
    <div class="drawer__head"><img data-bind="logo" alt="" height="36"><button class="icon-btn" data-close aria-label="Zavřít">${ico('x', 'icon icon--lg')}</button></div>
    <nav class="drawer__nav">${NAV.map(([u, l]) => `<a ${link(u)}>${l}</a>`).join('')}</nav>
    <a class="btn btn--primary btn--block" data-href="prodat.html#odhad">Odhad ceny zdarma</a>
  </div>
</div>`;
  const ft = $('#site-footer');
  if (ft) ft.outerHTML = `<footer class="footer">
  <div class="wide">
    <div class="footer__grid">
      <div class="footer__brand"><img data-bind="logo" alt=""><p data-bind="name"></p></div>
      <div><h4>Nemovitosti</h4><ul><li><a data-href="vypis.html">Prodej</a></li><li><a data-href="vypis.html" data-q="&deal=pronajem">Pronájem</a></li><li><a data-href="projekty.html">Developerské projekty</a></li><li><a data-href="realizovano.html">Realizováno</a></li></ul></div>
      <div><h4>Služby</h4><ul><li><a data-href="prodat.html#odhad">Odhad ceny</a></li><li><a href="#">Právní služby</a></li><li><a href="#">Kalkulačka financování</a></li><li><a href="#">Výkupy nemovitostí</a></li></ul></div>
      <div><h4>O nás</h4><ul><li><a data-href="makleri.html">Makléři</a></li><li><a data-href="kontakty.html">Kontakty</a></li><li><a href="#">Reference</a></li><li><a href="#">Blog</a></li><li><a href="#">Kariéra</a></li></ul></div>
    </div>
    <div class="footer__mark" aria-hidden="true" data-bind="mark"></div>
    <div class="footer__legal"><span>© 2026 <span data-bind="name"></span></span><a href="#">Ochrana osobních údajů</a><a href="#" id="cookie-reopen">Nastavení cookies</a></div>
  </div>
</footer>`;
  document.body.insertAdjacentHTML('beforeend', `
<div class="cookies" id="cookies" role="dialog" aria-label="Souhlas s cookies" hidden>
  <p>Cookies používáme k měření návštěvnosti a k zobrazení map a videí. Můžete je povolit, odmítnout, nebo nastavit podrobně.</p>
  <div class="cookies__btns">
    <button class="btn btn--ghost" data-c="set">Nastavit</button>
    <button class="btn btn--secondary" data-c="no">Odmítnout vše</button>
    <button class="btn btn--secondary" data-c="yes">Povolit vše</button>
  </div>
</div>
<details class="review" id="review">
  <summary>Předloha · kontrola <span>▾</span></summary>
  <div class="review__body">
    <label>Kancelář <select id="office">${OFFICE_KEYS.map(k => `<option value="${k}">${{ tgh: 'TGH', stars: 'Stars', test: 'Test přebarvení' }[k]}</option>`).join('')}</select></label>
    <label>Cookies <select id="cookie-state"><option value="">nerozhodnuto</option><option value="yes">povoleno</option><option value="no">odmítnuto</option></select></label>
    <label><input type="checkbox" id="grid-toggle"> Mřížka 12 sloupců</label>
    ${versionSwitch()}
    <div class="review__links">
      <a class="review__btn review__btn--main" data-href="styleguide.html">Knihovna komponent</a>
      <a class="review__btn" data-href="predani.html">Pravidla pro vývoj</a>
      <a class="review__btn" data-href="porovnani.html">Porovnání variant</a>
      <a class="review__btn" data-href="prehled.html">Přehled všech stránek</a>
    </div>
    <ul id="checks"></ul>
    <small style="color:#999" id="review-note"></small>
  </div>
</details>`);
  // menu
  const drawer = $('#drawer'), tog = $('.menu-toggle');
  tog.addEventListener('click', () => { drawer.hidden = false; tog.setAttribute('aria-expanded', 'true'); drawer.querySelector('[data-close]').focus(); });
  addEventListener('keydown', e => { if (e.key === 'Escape' && !drawer.hidden) { drawer.hidden = true; tog.setAttribute('aria-expanded', 'false'); tog.focus(); } });
  drawer.addEventListener('click', e => { if (e.target === drawer || e.target.closest('[data-close]') || e.target.closest('a')) { drawer.hidden = true; tog.setAttribute('aria-expanded', 'false'); } });
}

// --- Cookies: stav ovlivňuje mapy a videa (náhradní stav při odmítnutí) ---
const consent = {
  get() { try { return localStorage.getItem('nr-cookies') || ''; } catch { return ''; } },
  set(v) { try { v ? localStorage.setItem('nr-cookies', v) : localStorage.removeItem('nr-cookies'); } catch {} $('#cookies').hidden = !!v; if ($('#cookie-state')) $('#cookie-state').value = v; document.dispatchEvent(new CustomEvent('consent', { detail: v })); },
};
function blocked(what, h = 320) {
  return `<div class="blocked" style="min-height:${h}px">${ico(what === 'video' ? 'play' : 'map', 'icon icon--lg')}
    <p><b>${what === 'video' ? 'Video' : 'Mapa'} se zobrazí po povolení cookies</b><br>Obsah poskytuje třetí strana (${what === 'video' ? 'Vimeo' : 'OpenStreetMap'}), která může ukládat cookies.</p>
    <button class="btn btn--secondary" data-consent-yes>Povolit a zobrazit</button></div>`;
}
document.addEventListener('click', e => { if (e.target.closest('[data-consent-yes]')) consent.set('yes'); });

// --- Karta nemovitosti (sdílená homepage / výpis / detail) ---
const STATUS = { free: ['Volný', 'free'], reserved: ['Rezervováno', 'reserved'], sold: ['Prodáno', 'sold'], top: ['TOP nabídka', 'top'], last: ['Poslední v projektu', 'last'], drop: ['Zlevněno', 'drop'] };
const TYPE_LABEL = { byt: 'Byt', dum: 'Dům', pozemek: 'Pozemek', komercni: 'Komerční', ostatni: 'Ostatní' };
function params(x) {
  if (x.p) return x.p;
  const p = [];
  if (x.type === 'byt') p.push('Byt ' + (x.disp || ''));
  else if (x.sub) p.push(x.sub[0].toUpperCase() + x.sub.slice(1));
  else p.push(TYPE_LABEL[x.type]);
  if (x.area) p.push(num(x.area) + ' m²');
  if (x.land) p.push('pozemek ' + num(x.land) + ' m²');
  return p;
}
// oficiální logotyp NEXT (zdroj: IMPnet GRAFIKA/NEXT reality/Loga/next white.svg) – bílá = currentColor, zelená #80ba27
const NEXT_MARK = '<svg class="next-mark" viewBox="0 0 155.2 59.6" aria-hidden="true"><path fill="#80ba27" d="M74.5,37.6c0-1.8-.3-3.6-.8-5.4-.5-1.6-1.3-3.2-2.4-4.5s-2.4-2.4-4-3.1c-1.7-.8-3.6-1.2-5.5-1.2s-3.6.3-5.2,1.1c-1.5.7-2.9,1.7-4.1,3-1.2,1.3-2.1,2.8-2.7,4.4-.6,1.7-1,3.6-.9,5.4,0,1.9.3,3.8,1,5.6,1.3,3.3,3.9,5.8,7.2,7.1,1.7.7,3.5,1,5.3,1,2.2.1,4.3-.4,6.3-1.4,1.7-.9,3.3-2.1,4.5-3.6l.4-.5-4.3-3.8-.4.4c-.9.9-1.9,1.6-2.9,2.1-1.1.5-2.3.7-3.5.7s-3.2-.5-4.4-1.5c-1.1-1-1.8-2.2-2.1-3.7h18.3v-.5c0-.3.2-.6.2-.9v-.7h0ZM84.2,37.1c0,12.4-10.1,22.5-22.5,22.5s-22.5-10-22.5-22.5,10.1-22.5,22.5-22.5,22.5,10.1,22.5,22.5M67,33c.2.6.4,1.2.5,1.8h-11.6c.2-1.4.9-2.7,1.9-3.8,1-1.1,2.5-1.7,4-1.6.8,0,1.6,0,2.3.5.7.3,1.3.7,1.7,1.3.5.4.9,1.1,1.2,1.8"/><polygon fill="currentColor" points="0 19.6 9.1 19.6 23.6 38.1 23.6 19.6 33.2 19.6 33.2 54.8 24.6 54.8 9.6 35.5 9.6 54.8 0 54.8 0 19.6"/><polygon fill="currentColor" points="96.3 36.8 84.7 19.6 95.9 19.6 102.1 29.5 108.4 19.6 119.4 19.6 107.8 36.8 119.9 54.8 108.7 54.8 102 44.1 95.2 54.7 84.2 54.7 96.3 36.8"/><polygon fill="currentColor" points="134.9 28.1 124.4 28.1 124.4 19.6 155.2 19.6 155.2 28.1 144.7 28.1 144.7 54.7 135 54.7 135 28.1 134.9 28.1"/><polygon fill="#80ba27" points="49.8 10.1 61.7 0 73.6 10.1 49.8 10.1"/></svg>';

function card(x, opt = {}) {
  const st = STATUS[x.st || 'free'];
  const price = x.price == null
    ? `<div class="pcard__price is-request">Cena na vyžádání</div>`
    : `<div class="pcard__price">${x.oldPrice ? `<s>${kc(x.oldPrice)}</s>` : ''}${kc(x.price)}${x.rent ? '<small>/ měsíc</small>' : ''}</div>`;
  return `<article class="pcard${x.st === 'sold' ? ' is-sold' : ''}" data-id="${x.id ?? ''}">
    <div class="pcard__media${x.img ? '' : ' is-empty'}">
      ${x.img ? `<img src="${esc(x.img)}" alt="" loading="lazy" onerror="this.parentElement.classList.add('is-empty');this.remove()">` : ico('image', 'icon icon--lg')}
      <div class="pcard__badges"><span class="badge badge--${st[1]}">${st[0]}</span>${x.rent ? '<span class="badge badge--rent">Pronájem</span>' : ''}</div>
    </div>
    <button class="pcard__fav" aria-pressed="false" aria-label="Uložit do oblíbených">${ico('heart')}</button>
    <div class="pcard__body">
      <div class="pcard__params">${params(x).map(p => `<span class="param">${esc(p)}</span>`).join('')}</div>
      <h3 class="pcard__title"><a href="${opt.href || href('detail.html')}" title="${esc(x.t)}">${esc(x.t)}</a></h3>
      <div class="pcard__loc">${ico('pin')}<span>${esc(x.loc)}</span></div>
      ${price}
    </div>
  </article>`;
}
// Karta článku – bez fotky ukáže brandovou plochu (dnes nemá fotku žádný článek TGH)
const acard = a => `<article class="acard">
    <div class="acard__media${a.img ? '' : ' is-empty'}">${a.img ? `<img src="${esc(a.img)}" alt="" loading="lazy">` : ico('doc')}</div>
    <div class="acard__body">
      <div class="acard__meta"><span>${esc(a.date)}</span>${a.read ? `<span>${esc(a.read)}</span>` : ''}</div>
      <h3 class="acard__title"><a href="#">${esc(a.t)}</a></h3>
      ${a.p ? `<p class="acard__perex">${esc(a.p)}</p>` : ''}
    </div></article>`;
// Překryv mřížky: 12 sloupců, mezera = --gap, šířka = .container (max 1280 + okraje)
function gridOverlay(on) {
  let g = $('#grid-overlay');
  if (!on) return g?.remove();
  if (g) return;
  document.body.insertAdjacentHTML('beforeend', `<div id="grid-overlay" aria-hidden="true" style="position:fixed;inset:0;z-index:95;pointer-events:none"><div class="container" style="height:100%;display:grid;grid-template-columns:repeat(12,1fr);gap:var(--gap)">${'<div style="background:rgba(255,0,80,.08);border-inline:1px solid rgba(255,0,80,.25)"></div>'.repeat(12)}</div></div>`);
}
const skeleton = n => Array.from({ length: n }, () => `<article class="pcard is-loading" aria-hidden="true"><div class="pcard__media"></div><div class="pcard__body"><span class="skel" style="width:60%"></span><span class="skel"></span><span class="skel" style="width:80%;height:20px"></span><span class="skel" style="width:50%;height:20px"></span></div></article>`).join('');
document.addEventListener('click', e => {
  const f = e.target.closest('.pcard__fav'); if (!f) return;
  f.setAttribute('aria-pressed', f.getAttribute('aria-pressed') !== 'true');
});

// --- Kontrola kritérií ---
function check(label, ok, val) { return `<li><span>${label}</span><span class="${ok === null ? 'na' : ok ? 'ok' : 'bad'}">${val}</span></li>`; }
function baseChecks() {
  const h1 = Math.max(...$$('h1').map(e => parseFloat(getComputedStyle(e).fontSize)));
  const root = parseFloat(getComputedStyle(document.documentElement).fontSize);
  const cw = Math.max(...$$('.container').map(c => c.clientWidth - parseFloat(getComputedStyle(c).paddingLeft) * 2));
  const ox = document.documentElement.scrollWidth > innerWidth + 1;
  return check('H1 ≤ 48 px', h1 <= 48, h1 + ' px') + check('Root = 16 px', root === 16, root + ' px')
    + check('Obsah ≤ 1280 px', cw <= 1280, Math.round(cw) + ' px') + check('Bez vodor. scrollu', !ox, ox ? 'přetéká' : 'ok');
}
function runChecks() {
  if (!$('#checks')) return;
  $('#checks').innerHTML = baseChecks() + (window.PAGE?.checks?.() || '') + check('Okno', null, innerWidth + ' × ' + innerHeight);
}
addEventListener('resize', () => { clearTimeout(runChecks.t); runChecks.t = setTimeout(runChecks, 150); });

// --- Start ---
function applyOffice(k) {
  office = k;
  try { sessionStorage.setItem('nr-office', k); } catch {}
  const o = OFFICES[k];
  const html = document.documentElement;
  html.classList.add('no-tr'); html.dataset.office = k; setTimeout(() => html.classList.remove('no-tr'), 50);
  $$('[data-bind="logo"]').forEach(i => { i.src = o.logo; i.alt = o.name; });
  $$('[data-bind="name"]').forEach(e => (e.textContent = o.name));
  // patička: logotyp NEXT (vektor podle loga) + zbytek názvu pobočky textem
  $$('[data-bind="mark"]').forEach(e => (e.innerHTML = NEXT_MARK + `<span>${esc(o.name.replace(/^NEXT\s*/i, ''))}</span>`));
  $$('[data-href]').forEach(a => { const [u, h] = a.dataset.href.split('#'); a.href = href(u, a.dataset.q || '') + (h ? '#' + h : ''); });
  window.PAGE?.render(k);
  document.dispatchEvent(new Event('rendered'));
  setTimeout(runChecks, 300);
}
function start() {
  layout();
  $('#office').value = office;
  $('#office').addEventListener('change', e => { history.replaceState(null, '', location.pathname + '?office=' + e.target.value); applyOffice(e.target.value); });
  $('#cookie-state').value = consent.get();
  $('#cookie-state').addEventListener('change', e => consent.set(e.target.value));
  $('#grid-toggle').addEventListener('change', e => gridOverlay(e.target.checked));
  document.addEventListener('click', e => { const v = e.target.closest('[data-version]'); if (v) { e.preventDefault(); location.href = versionUrl(v.dataset.version); } });
  if (qs.has('grid')) { $('#grid-toggle').checked = true; gridOverlay(true); }
  $$('#cookies [data-c]').forEach(b => b.addEventListener('click', () => consent.set(b.dataset.c === 'set' ? 'no' : b.dataset.c)));
  $('#cookie-reopen')?.addEventListener('click', e => { e.preventDefault(); $('#cookies').hidden = false; });
  $('#cookies').hidden = !!consent.get() || qs.has('clean');
  if (window.PAGE?.note) $('#review-note').textContent = window.PAGE.note;
  if (qs.has('clean')) $('#review').remove();
  window.PAGE?.init?.();
  applyOffice(office);
  addEventListener('load', runChecks, { once: true });
}
document.addEventListener('DOMContentLoaded', start);
