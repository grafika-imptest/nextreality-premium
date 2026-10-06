// Výpis nemovitostí – filtry, řazení, stránkování, přepínač Seznam / Mapa. Vše počítá nad reálnými daty (data/*-listings.js).
const PER_PAGE = 12;
const SORTS = [['', 'Doporučené'], ['price-asc', 'Od nejlevnějšího'], ['price-desc', 'Od nejdražšího'], ['area-desc', 'Podle plochy']];
const TYPE_H1 = { '': 'Nemovitosti', byt: 'Byty', dum: 'Domy', komercni: 'Komerční prostory', pozemek: 'Pozemky', ostatni: 'Ostatní nemovitosti' };
const S = { status: 'active', deal: 'prodej', type: '', loc: '', pmin: null, pmax: null, area: null, disp: [], sort: '', view: 'list', page: 1 };
let map, cluster, mapLayerFor;

const data = () => (S.status === 'sold' ? window.SOLD : window.LISTINGS)[dataKey(office)] || [];
const parseNum = v => { const n = +String(v || '').replace(/\D/g, ''); return n || null; };
const short = p => p >= 1e6 ? (Math.round(p / 1e5) / 10).toString().replace('.', ',') + ' mil.' : p >= 1e3 ? Math.round(p / 1e3) + ' tis.' : p;

function filtered(s = S) {
  const q = s.loc.trim().toLowerCase();
  let r = data().filter(x =>
    (s.deal === 'pronajem') === !!x.rent &&
    (!s.type || x.type === s.type) &&
    (!q || x.t.toLowerCase().includes(q) || x.loc.toLowerCase().includes(q)) &&
    (s.pmin == null || (x.price != null && x.price >= s.pmin)) &&
    (s.pmax == null || (x.price != null && x.price <= s.pmax)) &&
    (s.area == null || (x.area || x.land || 0) >= s.area) &&
    (!s.disp.length || (x.disp && s.disp.some(d => d === '4+' ? +x.disp[0] >= 4 : d === x.disp))));
  if (s.sort === 'price-asc') r = [...r].sort((a, b) => (a.price ?? Infinity) - (b.price ?? Infinity));
  if (s.sort === 'price-desc') r = [...r].sort((a, b) => (b.price ?? -1) - (a.price ?? -1));
  if (s.sort === 'area-desc') r = [...r].sort((a, b) => (b.area || b.land || 0) - (a.area || a.land || 0));
  return r;
}

// --- URL stav ---
function readUrl() {
  S.deal = qs.get('deal') === 'pronajem' ? 'pronajem' : 'prodej';
  S.type = qs.get('type') || ''; S.loc = qs.get('loc') || ''; S.sort = qs.get('sort') || '';
  S.pmin = parseNum(qs.get('pmin')); S.pmax = parseNum(qs.get('pmax')); S.area = parseNum(qs.get('area'));
  S.disp = (qs.get('disp') || '').split(',').filter(Boolean); S.view = qs.get('view') === 'map' ? 'map' : 'list';
  S.status = qs.get('status') === 'sold' ? 'sold' : 'active'; S.page = +qs.get('page') || 1;
}
function writeUrl() {
  const p = new URLSearchParams({ office });
  if (S.status === 'sold') p.set('status', 'sold');
  if (S.deal === 'pronajem') p.set('deal', 'pronajem');
  for (const k of ['type', 'loc', 'sort']) if (S[k]) p.set(k, S[k]);
  for (const k of ['pmin', 'pmax', 'area']) if (S[k] != null) p.set(k, S[k]);
  if (S.disp.length) p.set('disp', S.disp.join(','));
  if (S.view === 'map') p.set('view', 'map');
  if (S.page > 1) p.set('page', S.page);
  history.replaceState(null, '', location.pathname + '?' + p);
}

// --- Synchronizace formuláře se stavem ---
function syncForm() {
  $$('[data-deal]').forEach(b => b.setAttribute('aria-pressed', b.dataset.deal === S.deal));
  $('#f-type').value = S.type; $('#f-loc').value = S.loc;
  $('#f-pmin').value = S.pmin ? num(S.pmin) : ''; $('#f-pmax').value = S.pmax ? num(S.pmax) : '';
  $$('#f-area .chip').forEach(c => c.setAttribute('aria-pressed', +c.dataset.v === S.area));
  $$('#f-disp .chip').forEach(c => c.setAttribute('aria-pressed', S.disp.includes(c.dataset.v)));
  $('#disp-field').hidden = !!S.type && S.type !== 'byt';
  $('#sort').value = $('#sort-m').value = S.sort;
  $$('[data-view]').forEach(b => b.setAttribute('aria-pressed', b.dataset.view === S.view));
}

function activeChips() {
  const c = [];
  if (S.deal === 'pronajem') c.push(['deal', 'Pronájem']);
  if (S.type) c.push(['type', TYPE_H1[S.type]]);
  if (S.loc) c.push(['loc', S.loc]);
  if (S.pmin != null || S.pmax != null) c.push(['price', (S.pmin ? 'od ' + kc(S.pmin) : '') + (S.pmin && S.pmax ? ' ' : '') + (S.pmax ? 'do ' + kc(S.pmax) : '')]);
  if (S.area) c.push(['area', 'od ' + S.area + ' m²']);
  S.disp.forEach(d => c.push(['disp:' + d, d === '4+' ? '4+ a větší' : d]));
  return c;
}
function clearChip(k) {
  if (k === 'deal') S.deal = 'prodej'; else if (k === 'price') S.pmin = S.pmax = null;
  else if (k.startsWith('disp:')) S.disp = S.disp.filter(d => d !== k.slice(5)); else S[k] = k === 'area' ? null : '';
}

// --- Vykreslení ---
function render(withSkeleton) {
  const r = filtered();
  const pages = Math.max(1, Math.ceil(r.length / PER_PAGE));
  if (S.page > pages) S.page = pages;
  const o = OFFICES[office];
  const verb = S.status === 'sold' ? 'realizované' : S.deal === 'pronajem' ? 'k pronájmu' : 'na prodej';
  $('#list-h1').textContent = `${TYPE_H1[S.type]} ${verb}${S.loc ? ' – ' + S.loc : ''}`;
  document.title = `${$('#list-h1').textContent} | ${o.name}`;
  $('#list-count').textContent = nab(r.length);

  const sold = (window.SOLD[dataKey(office)] || []).length;
  $('#status-tabs').innerHTML = sold ? [['active', 'Aktuální nabídka', (window.LISTINGS[dataKey(office)] || []).length], ['sold', 'Realizováno', sold]]
    .map(([k, l, n]) => `<button role="tab" aria-selected="${S.status === k}" data-status="${k}">${l} <span>${n}</span></button>`).join('') : '';

  const chips = activeChips();
  $('#active-chips').innerHTML = chips.length ? chips.map(([k, l]) => `<button class="fchip" data-clear="${esc(k)}">${esc(l)} ${ico('x')}<span class="sr-only">odebrat filtr</span></button>`).join('') + `<button class="btn btn--ghost" data-clear="*">Zrušit filtry</button>` : '';
  $('#filter-n').hidden = !chips.length; $('#filter-n').textContent = chips.length;

  const from = (S.page - 1) * PER_PAGE;
  const slice = r.slice(0, from + PER_PAGE).slice(from);
  $('#results-info').textContent = !r.length ? '' : S.view === 'map' ? `${nab(r.length)} na mapě` : `Zobrazeno ${from + 1}–${from + slice.length} z ${r.length}`;
  $('#empty').hidden = !!r.length;
  $('#grid').hidden = !r.length;
  $('#pager').hidden = r.length <= PER_PAGE;

  const paint = () => {
    const cards = slice.map(x => card(S.status === 'sold' ? { ...x, st: 'sold' } : x));
    if (cards.length > 8 && S.status !== 'sold') cards.splice(8, 0, watchdog(false));
    $('#grid').innerHTML = cards.join('');
  };
  if (withSkeleton && r.length) { $('#grid').innerHTML = skeleton(Math.min(8, slice.length)); clearTimeout(render.t); render.t = setTimeout(paint, 280); } else paint();

  if (!r.length) $('#empty').innerHTML = emptyState();
  $('#pager').innerHTML = pager(pages);
  $('#live-count').textContent = nab(r.length, true);
  $('#results').hidden = S.view === 'map';
  $('#mapview').hidden = S.view !== 'map';
  if (S.view === 'map') drawMap(r);
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
    const t = JSON.parse(JSON.stringify(S)); const save = Object.assign({}, S);
    Object.assign(S, t); clearChip(k); const n = filtered().length; Object.assign(S, save);
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

// --- Mapa ---
function drawMap(r) {
  const el = $('#map');
  if (consent.get() !== 'yes') { el.innerHTML = blocked('map', 420); map = null; return; }
  if (!window.L) { el.innerHTML = '<div class="blocked">Mapová knihovna se nenačetla.</div>'; return; }
  if (!map) {
    el.innerHTML = '';
    map = L.map(el, { scrollWheelZoom: true, zoomControl: true });
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 18, attribution: '© OpenStreetMap' }).addTo(map);
    cluster = L.markerClusterGroup({ showCoverageOnHover: false, maxClusterRadius: 50, iconCreateFunction: c => L.divIcon({ html: `<span>${c.getChildCount()}</span>`, className: 'mcluster', iconSize: [40, 40] }) });
    map.addLayer(cluster);
    map.on('click', () => ($('#map-card').hidden = true));
  }
  setTimeout(() => map.invalidateSize(), 50);
  const key = JSON.stringify([office, S.status, r.length, r[0]?.id, r.at(-1)?.id]);
  if (mapLayerFor === key) return;
  mapLayerFor = key;
  cluster.clearLayers();
  const ms = r.map(x => L.marker([x.lat, x.lng], {
    icon: L.divIcon({ className: 'mpin', html: `<span>${x.price == null ? 'na vyžádání' : short(x.price)}</span>`, iconSize: null }),
    keyboard: true, title: x.t,
  }).on('click', () => { const c = $('#map-card'); c.innerHTML = `<button class="icon-btn map-card__x" aria-label="Zavřít">${ico('x')}</button>` + card(S.status === 'sold' ? { ...x, st: 'sold' } : x); c.hidden = false; }));
  cluster.addLayers(ms);
  if (ms.length) map.fitBounds(L.latLngBounds(r.map(x => [x.lat, x.lng])).pad(0.1), { maxZoom: 13 });
  else map.setView([49.9, 15.3], 7);
}

// --- Našeptávač nad reálnými daty: obce, čtvrti, ulice s počty ---
function suggestions(q) {
  const m = new Map();
  for (const x of filtered({ ...S, loc: '' })) {
    const parts = x.place.split(', ');
    const last = parts.at(-1) || '';
    const city = last.split('-')[0];
    const add = (n, t) => { if (!n) return; const k = n + '|' + t; m.set(k, (m.get(k) || 0) + 1); };
    add(city, 'obec'); if (last.includes('-')) add(last, 'čtvrť'); if (parts.length > 1) add(parts[0] + ', ' + city, 'ulice');
  }
  q = q.toLowerCase();
  return [...m].map(([k, n]) => [...k.split('|'), n]).filter(([n]) => !q || n.toLowerCase().includes(q))
    .sort((a, b) => (b[0].toLowerCase().startsWith(q) - a[0].toLowerCase().startsWith(q)) || b[2] - a[2]).slice(0, 7);
}

window.PAGE = {
  note: 'Data: reálné nabídky z mapy výpisu (TGH 238, Stars 68 + 184 realizovaných). Parametry karty jsou v předloze parsované z názvu.',
  render() { if (!this.ready) { readUrl(); this.ready = true; } syncForm(); mapLayerFor = null; render(); },
  checks() {
    const tops = $$('#grid .pcard').map(c => Math.round(c.getBoundingClientRect().top));
    const perRow = tops.filter(t => t === tops[0]).length;
    const first = $('#grid .pcard');
    const head = $('.list-head').getBoundingClientRect().top + scrollY;
    const fTop = first ? first.getBoundingClientRect().top + scrollY : null;
    const firstInView = first ? fTop + 120 - head <= innerHeight : null; // aspoň horní část karty (foto) do 1 posunutí
    const hs = $$('#grid .pcard').filter(c => Math.round(c.getBoundingClientRect().top) === tops[0]).map(c => c.offsetHeight);
    return check('Karet v řadě', innerWidth >= 1440 ? perRow >= 4 : null, perRow + (innerWidth >= 1440 ? ' (cíl 4)' : ''))
      + check('Stejná výška karet', hs.length ? new Set(hs).size === 1 : null, [...new Set(hs)].join('/') + ' px')
      + check('1. nemovitost do 1 posunutí', innerWidth < 768 ? firstInView : null, fTop == null ? '–' : Math.round(fTop - head) + ' px od hlavičky');
  },
  init() {
    const opts = SORTS.map(([v, l]) => `<option value="${v}">${l}</option>`).join('');
    $('#sort').innerHTML = $('#sort-m').innerHTML = opts;
    const upd = (skel = true) => { S.page = 1; render(skel); };
    $$('[data-deal]').forEach(b => b.addEventListener('click', () => { S.deal = b.dataset.deal; syncForm(); upd(); }));
    $('#f-type').addEventListener('change', e => { S.type = e.target.value; if (S.type && S.type !== 'byt') S.disp = []; syncForm(); upd(); });
    $$('#f-area .chip').forEach(c => c.addEventListener('click', () => { S.area = S.area === +c.dataset.v ? null : +c.dataset.v; syncForm(); upd(); }));
    $$('#f-disp .chip').forEach(c => c.addEventListener('click', () => { const v = c.dataset.v; S.disp = S.disp.includes(v) ? S.disp.filter(d => d !== v) : [...S.disp, v]; syncForm(); upd(); }));
    for (const id of ['f-pmin', 'f-pmax']) {
      const el = $('#' + id);
      el.addEventListener('input', () => { // oddělovač tisíců při psaní
        const n = parseNum(el.value); el.value = n ? num(n) : '';
        S[id === 'f-pmin' ? 'pmin' : 'pmax'] = n; clearTimeout(el.t); el.t = setTimeout(() => upd(), 400);
      });
    }
    // lokalita
    const loc = $('#f-loc'), sug = $('#suggest'), list = $('#suggest-list');
    const open = () => {
      const q = loc.value.trim(), hits = suggestions(q);
      list.innerHTML = hits.length ? hits.map(([n, t, c]) => {
        const i = n.toLowerCase().indexOf(q.toLowerCase());
        const label = q && i > -1 ? esc(n.slice(0, i)) + '<mark>' + esc(n.slice(i, i + q.length)) + '</mark>' + esc(n.slice(i + q.length)) : esc(n);
        return `<li role="option" data-v="${esc(n)}">${ico('pin')}<span>${label}</span><small>${t} · ${c}</small></li>`;
      }).join('') : `<li aria-disabled="true" style="cursor:default;color:var(--text-muted)">Žádná lokalita v aktuální nabídce</li>`;
      sug.classList.add('is-open'); loc.setAttribute('aria-expanded', 'true');
    };
    loc.addEventListener('input', () => { open(); clearTimeout(loc.t); loc.t = setTimeout(() => { S.loc = loc.value.trim(); upd(); }, 400); });
    loc.addEventListener('focus', open);
    list.addEventListener('mousedown', e => { const li = e.target.closest('li[role=option]'); if (!li) return; loc.value = S.loc = li.dataset.v.split(', ')[0]; upd(); });
    loc.addEventListener('blur', () => setTimeout(() => { sug.classList.remove('is-open'); loc.setAttribute('aria-expanded', 'false'); }, 120));
    loc.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); S.loc = loc.value.trim(); upd(); loc.blur(); } });

    $('#sort').addEventListener('change', e => { S.sort = e.target.value; syncForm(); upd(); });
    $('#sort-m').addEventListener('change', e => { S.sort = e.target.value; syncForm(); upd(); });
    $$('[data-view]').forEach(b => b.addEventListener('click', () => { S.view = b.dataset.view; syncForm(); render(); }));
    document.addEventListener('click', e => {
      const c = e.target.closest('[data-clear]');
      if (c) { const k = c.dataset.clear; if (k === '*') Object.assign(S, { deal: 'prodej', type: '', loc: '', pmin: null, pmax: null, area: null, disp: [] }); else clearChip(k); syncForm(); upd(); }
      const p = e.target.closest('[data-pg]');
      if (p && !p.disabled) { S.page = +p.dataset.pg; render(true); $('#main').scrollIntoView({ behavior: 'smooth' }); }
      const st = e.target.closest('[data-status]');
      if (st) { S.status = st.dataset.status; mapLayerFor = null; upd(); }
      if (e.target.closest('.map-card__x')) $('#map-card').hidden = true;
    });
    // mobilní panel filtrů
    const fw = $('#filterwrap'), ob = $('#open-filters');
    const sheet = v => { fw.classList.toggle('is-open', v); ob.setAttribute('aria-expanded', v); document.body.style.overflow = v ? 'hidden' : ''; };
    ob.addEventListener('click', () => sheet(true));
    addEventListener('keydown', e => { if (e.key === 'Escape' && fw.classList.contains('is-open')) { sheet(false); ob.focus(); } });
    $('#close-filters').addEventListener('click', () => sheet(false));
    $('#apply-m').addEventListener('click', () => sheet(false));
    $('#reset-m').addEventListener('click', () => { Object.assign(S, { deal: 'prodej', type: '', loc: '', pmin: null, pmax: null, area: null, disp: [] }); syncForm(); upd(false); });
    document.addEventListener('consent', () => { map = null; mapLayerFor = null; if (S.view === 'map') render(); });
    // sticky lišta filtrů – stín po odlepení
    const io = new IntersectionObserver(([en]) => fw.classList.toggle('is-stuck', !en.isIntersecting), { rootMargin: '-73px 0px 0px 0px' });
    io.observe($('.list-head'));
  },
};
