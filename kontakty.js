// Kontakty (prémiová verze) – nejdřív KDE jsou kanceláře (mapa + karty), až pak detaily (formulář, fakturace, makléři).
// TGH: 7 poboček z /kancelare (BRANCHES.tgh), Stars: jedna kancelář + právní údaje a účty z /kontakty (6. 10. 2026).
// Mapa: Leaflet + dlaždice OpenStreetMap (CSS tónování do INK), jen po souhlasu s cookies. Bez souhlasu (nebo bez knihovny) schematická mapa v SVG,
// vykreslená ze stejných souřadnic – grafika zůstává, jen bez podkladu třetí strany.

// Souřadnice: v CMS chybí. Geokódováno z adres v datech (OpenStreetMap / Photon, shoda na číslo domu, 7. 10. 2026).
// Do produkce: pole lat/lng v CMS u kanceláře.
const GEO = {
  style: [50.0906516, 14.432124, 'Praha'],
  vision: [50.0906516, 14.432124, 'Praha'],
  bridge: [50.5056242, 13.6394635, 'Most'],
  capital: [50.1236238, 14.4530082, 'Praha'],
  horizont: [50.5624601, 15.9087525, 'Trutnov'],
  heroes: [50.0981913, 14.4334454, 'Praha'],
  victory: [49.7432163, 13.3832343, 'Plzeň'],
  stars: [50.1437226, 14.0945638, 'Kladno'],
};
const STARS_LEGAL = {
  ico: '09683810',
  note: 'Kancelář je nezávisle provozována společností Gamp reality servis s.r.o. IČ: 09683810 a využívá ochrannou známku NEXT REALITY. Makléři této kanceláře jsou samostatní podnikatelé podnikající na základě živnostenského listu.',
  accounts: [['Gamp reality servis s.r.o.', '4156583319/5500'], ['Gamp reality rent s.r.o.', '4156583378/5500'], ['Absolut Reality a finance s.r.o.', '3288652377/5500']],
};
const mapyCz = a => 'https://mapy.cz/zakladni?q=' + encodeURIComponent(a);
const gmaps = a => 'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(a);
const cap = t => (t ? t[0].toUpperCase() + t.slice(1) : 'Vedení kanceláře');
const pad2 = n => String(n).padStart(2, '0');
const short = n => n.replace(/^NEXT REALITY\s*/i, '');
const sameName = (a, b) => a.toLowerCase() === b.toLowerCase();
const kancelar = n => `${n} ${n === 1 ? 'kancelář' : n >= 2 && n <= 4 ? 'kanceláře' : 'kanceláří'}`;
const makler = n => `${n} ${n === 1 ? 'makléř' : n >= 2 && n <= 4 ? 'makléři' : 'makléřů'}`;
const mesto = n => `${n} ${n === 1 ? 'město' : n >= 2 && n <= 4 ? 'města' : 'měst'}`;

let CT = null;              // { offices: [...], points: [...], cities: [...] }
let lmap = null, lmode = null, lmarkers = {}, lcity = {}, active = null;
const isDesk = () => matchMedia('(min-width: 1024px)').matches;

// --- data pro aktuální kancelář ---
function model(k) {
  const o = OFFICES[k];
  let offices;
  if (k === 'stars') {
    offices = [{ key: 'stars', n: o.name, address: o.address, img: null, brokers: BROKERS.stars }];
  } else {
    offices = BRANCHES.tgh.map(b => ({ key: b.slug, n: b.n, address: b.address, img: b.img, brokers: BROKERS.tgh.filter(a => sameName(a.office, b.n)) }));
  }
  offices.forEach((x, i) => {
    x.i = i + 1;
    const g = GEO[x.key];
    x.geo = g ? [g[0], g[1]] : null;
    x.city = g ? g[2] : '';
    x.director = x.brokers.find(a => /ředitel/i.test(a.r)) || null;
  });
  // body = kanceláře na stejné adrese (Style + Vision sdílí Zlatnickou)
  const points = [];
  offices.filter(x => x.geo).forEach(x => {
    let p = points.find(q => q.geo[0] === x.geo[0] && q.geo[1] === x.geo[1]);
    if (!p) points.push(p = { geo: x.geo, city: x.city, offices: [] });
    p.offices.push(x);
  });
  offices.forEach(x => (x.shares = offices.filter(y => y !== x && y.geo && x.geo && y.geo[0] === x.geo[0] && y.geo[1] === x.geo[1])));
  // města (pro oddálenou mapu a schéma)
  const cities = [];
  points.forEach(p => {
    let c = cities.find(q => q.name === p.city);
    if (!c) cities.push(c = { name: p.city, points: [], offices: [] });
    c.points.push(p); c.offices.push(...p.offices);
  });
  cities.forEach(c => (c.geo = [c.points.reduce((s, p) => s + p.geo[0], 0) / c.points.length, c.points.reduce((s, p) => s + p.geo[1], 0) / c.points.length]));
  const uniq = new Set(offices.flatMap(x => x.brokers.map(a => a.tel))).size; // stejný makléř ve dvou kancelářích = 1
  return { k, o, offices, points, cities, brokerCount: uniq };
}

// --- karty kanceláří ---
function officeCard(x, single) {
  const team = x.brokers;
  const faces = team.slice(0, 4).map(a => `<img src="${esc(a.img)}" alt="" loading="lazy">`).join('');
  return `<article class="ofc${x.img ? '' : ' ofc--noimg'}${single ? ' ofc--single' : ''}" data-o="${x.key}" id="ofc-${x.key}">
    ${x.img ? `<div class="ofc__media"><img src="${esc(x.img)}" alt="Kancelář ${esc(x.n)}" loading="lazy"></div>` : ''}
    <div class="ofc__body">
      <div class="ofc__top"><span class="ofc__num">${pad2(x.i)}</span><span class="ofc__city">${esc(x.city)}</span>
        <button class="ofc__locate" type="button" data-locate="${x.key}" aria-label="Ukázat ${esc(x.n)} na mapě">${ico('map')}<span>Na mapě</span></button></div>
      <h3 class="ofc__name">${esc(x.n)}</h3>
      <p class="ofc__addr">${ico('pin')}<span>${esc(x.address)}${x.shares.length ? `<small>Stejná adresa jako ${x.shares.map(s => esc(s.n)).join(', ')}</small>` : ''}</span></p>
      ${x.director ? `<p class="ofc__dir"><span class="ofc__k">${esc(cap(x.director.r.split(/\s[|I]\s/)[0].trim()))}</span><b>${esc(x.director.n.replace(/\s+STYLE$/, ''))}</b><a href="tel:${x.director.tel.replace(/\s/g, '')}">${ico('phone')}${esc(x.director.tel)}</a></p>` : ''}
      ${team.length ? `<a class="ofc__team" href="#tym" data-team="${x.key}"><span class="ofc__faces" aria-hidden="true">${faces}</span><span>${makler(team.length)}</span>${ico('arrow')}</a>` : ''}
      <div class="ofc__actions">
        <a class="btn btn--primary" href="#kontakt" data-write="${esc(x.n)}">${ico('mail')} Napsat kanceláři</a>
        <a class="btn btn--secondary" href="${mapyCz(x.address)}" target="_blank" rel="noopener">${ico('nav')} Navigovat</a>
      </div>
      <p class="ofc__links">Trasa: <a href="${mapyCz(x.address)}" target="_blank" rel="noopener">Mapy.cz</a><span aria-hidden="true">·</span><a href="${gmaps(x.address)}" target="_blank" rel="noopener">Google Maps</a></p>
    </div>
  </article>`;
}

// --- zvýraznění karta ↔ špendlík ---
function highlight(key, on) {
  const keys = on ? String(key).split(' ') : [];
  if (!on && active) keys.push(...active.split(' '));
  $$('.ofc').forEach(c => c.classList.toggle('is-on', keys.includes(c.dataset.o)));
  $$('[data-pin]').forEach(p => p.classList.toggle('is-on', p.dataset.pin.split(' ').some(k => keys.includes(k))));
}
function select(key, { fly = true, scrollCard = false, scrollMap = false } = {}) {
  active = key;
  highlight(key, true);
  const x = CT.offices.find(o => o.key === key);
  if (fly && lmap && x?.geo) lmap.flyTo(x.geo, Math.max(lmap.getZoom(), 15), { duration: 0.9 });
  if (scrollCard) scrollToEl($('#ofc-' + key), 'center');
  if (scrollMap) scrollToEl($('#ct-map'), 'start');
}
function scrollToEl(el, block) {
  if (!el) return;
  const hh = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--header-h')) || 64;
  const lenis = window.MOTION?.lenis;
  const r = el.getBoundingClientRect();
  const y = block === 'center' ? scrollY + r.top - (innerHeight - r.height) / 2 : scrollY + r.top - hh - 12;
  if (lenis) lenis.scrollTo(Math.max(0, y)); else scrollTo({ top: Math.max(0, y), behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
}

// --- Leaflet mapa (po souhlasu) ---
const pinHtml = (p, extra = '') => `<div class="kpin${extra}" data-pin="${p.offices.map(o => o.key).join(' ')}"><span class="kpin__dot" aria-hidden="true"></span><span class="kpin__lbl">${p.offices.map(o => `<b>${pad2(o.i)}</b>${esc(short(o.n))}`).join('<i aria-hidden="true"></i>')}</span></div>`;
const cityHtml = c => `<div class="kpin kpin--city" data-pin="${c.offices.map(o => o.key).join(' ')}"><span class="kpin__dot" aria-hidden="true">${c.offices.length}</span><span class="kpin__lbl"><b>${esc(c.name)}</b>${kancelar(c.offices.length)}</span></div>`;
function drawMap() {
  const el = $('#ct-map');
  if (lmap) { lmap.remove(); lmap = null; }
  lmarkers = {}; lcity = {}; lmode = null;
  if (consent.get() !== 'yes' || !window.L) { drawSchema(el); return; }
  el.innerHTML = '';
  el.classList.remove('is-schema');
  lmap = L.map(el, { zoomControl: false, scrollWheelZoom: false, attributionControl: true });
  L.control.zoom({ position: 'bottomright', zoomInTitle: 'Přiblížit', zoomOutTitle: 'Oddálit' }).addTo(lmap);
  lmap.attributionControl.setPrefix(false);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 18, className: 'ct-tiles', attribution: '© <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a>',
  }).addTo(lmap);
  // kolečko myši až po kliknutí do mapy – stránka se neroluje „do mapy“
  lmap.on('click focus', () => lmap.scrollWheelZoom.enable());
  el.addEventListener('mouseleave', () => lmap?.scrollWheelZoom.disable());
  const mk = (geo, html, z) => L.marker(geo, { icon: L.divIcon({ className: 'kpin-wrap', html, iconSize: null }), keyboard: true, riseOnHover: true, zIndexOffset: z || 0 });
  CT.points.forEach(p => {
    const m = mk(p.geo, pinHtml(p));
    m.on('click', () => select(p.offices[0].key, { fly: true, scrollCard: true }));
    m.on('mouseover', () => highlight(p.offices.map(o => o.key).join(' '), true));
    m.on('mouseout', () => highlight(null, false));
    m.options.title = p.offices.map(o => o.n).join(', ');
    lmarkers[p.offices.map(o => o.key).join(' ')] = m;
  });
  CT.cities.forEach(c => {
    if (c.offices.length < 2) return; // město s jednou kanceláří = rovnou špendlík kanceláře
    const m = mk(c.geo, cityHtml(c), 500);
    m.on('click', () => lmap.flyToBounds(L.latLngBounds(c.points.map(p => p.geo)).pad(0.6), { maxZoom: 14, duration: 0.9 }));
    m.on('mouseover', () => highlight(c.offices.map(o => o.key).join(' '), true));
    m.on('mouseout', () => highlight(null, false));
    lcity[c.name] = m;
  });
  const sync = () => {
    const mode = lmap.getZoom() >= 12 || !Object.keys(lcity).length ? 'detail' : 'city';
    if (mode === lmode) return;
    lmode = mode;
    CT.points.forEach(p => {
      const m = lmarkers[p.offices.map(o => o.key).join(' ')];
      const grouped = lcity[p.city] && mode === 'city';
      grouped ? m.remove() : m.addTo(lmap);
    });
    Object.values(lcity).forEach(m => (mode === 'city' ? m.addTo(lmap) : m.remove()));
    if (active) highlight(active, true);
  };
  lmap.on('zoomend', sync);
  fitAll(false);
  sync();
  setTimeout(() => lmap?.invalidateSize(), 200);
}
function fitAll(anim = true) {
  if (!lmap) return;
  if (CT.points.length === 1) lmap.setView(CT.points[0].geo, 15, { animate: anim });
  else lmap.fitBounds(L.latLngBounds(CT.points.map(p => p.geo)), { padding: isDesk() ? [80, 120] : [40, 60], animate: anim, maxZoom: 12 });
}

// --- schematická mapa bez třetích stran (bez souhlasu / bez knihovny) ---
function drawSchema(el) {
  el.classList.add('is-schema');
  el.innerHTML = `<div class="kschema" aria-label="Schéma polohy kanceláří">
      <svg class="kschema__svg" aria-hidden="true"></svg>
      <div class="kschema__pins"></div>
    </div>
    <div class="kschema__bar">
      <p>${ico('map')}<span><b>Interaktivní mapa se zobrazí po povolení cookies.</b><span class="kschema__more"> Podklad poskytuje třetí strana (OpenStreetMap). Trasu najdete i v kartě kanceláře.</span></span></p>
      <button class="btn btn--secondary" type="button" data-consent-yes>Povolit mapu</button>
    </div>`;
  const box = $('.kschema', el);
  const render = () => schemaRender(box);
  render();
  if (window.ResizeObserver) { el._ro?.disconnect(); el._ro = new ResizeObserver(() => { clearTimeout(el._rt); el._rt = setTimeout(render, 60); }); el._ro.observe(box); }
}
function schemaRender(box) {
  const W = box.clientWidth, H = box.clientHeight;
  if (!W || !H) return;
  const svg = $('.kschema__svg', box), pinsEl = $('.kschema__pins', box);
  svg.setAttribute('viewBox', `0 0 ${W} ${H}`); svg.setAttribute('width', W); svg.setAttribute('height', H);
  const pts = CT.points;
  const lat0 = pts.reduce((s, p) => s + p.geo[0], 0) / pts.length;
  const kx = Math.cos(lat0 * Math.PI / 180);
  // rozsah: všechny body + okraj; jedna kancelář = okolí ±0,08°
  let minLa = Math.min(...pts.map(p => p.geo[0])), maxLa = Math.max(...pts.map(p => p.geo[0]));
  let minLo = Math.min(...pts.map(p => p.geo[1])), maxLo = Math.max(...pts.map(p => p.geo[1]));
  const single = pts.length === 1;
  if (single) { minLa -= 0.08; maxLa += 0.08; minLo -= 0.08 / kx * 1.6; maxLo += 0.08 / kx * 1.6; }
  const narrow = W < 600, hasLens = CT.cities.some(c => c.points.length > 1);
  const lensR = Math.min(narrow ? 62 : 118, H * 0.24);
  // úzké displeje: lupa dostane vlastní pás dole, body se rozprostřou nad ní
  const padX = narrow ? 44 : 130, padT = narrow ? 48 : 56, padB = narrow && hasLens ? 2 * lensR + 52 : narrow ? 40 : 56;
  const spanX = (maxLo - minLo) * kx, spanY = maxLa - minLa;
  const s = Math.min((W - 2 * padX) / spanX, (H - padT - padB) / spanY);
  const ox = (W - spanX * s) / 2, oy = padT + ((H - padT - padB) - spanY * s) / 2;
  const P = ([la, lo]) => [ox + (lo - minLo) * kx * s, oy + (maxLa - la) * s];
  // obrácená projekce pro rozsah mřížky
  const loAt = x => minLo + (x - ox) / s / kx, laAt = y => maxLa - (y - oy) / s;
  const step = single ? 0.05 : 0.5;
  let g = '';
  let lastX = -Infinity;
  for (let lo = Math.ceil(loAt(0) / step) * step; lo <= loAt(W); lo += step) {
    const [x] = P([lat0, lo]);
    const lbl = x - lastX >= 96 && x < W - 80;
    if (lbl) lastX = x;
    g += `<line x1="${x}" y1="0" x2="${x}" y2="${H}" class="kschema__grid"/>${lbl ? `<text x="${x + 6}" y="${H - 10}" class="kschema__deg">${lo.toFixed(single ? 2 : 1).replace('.', ',')}° v. d.</text>` : ''}`;
  }
  let lastY = Infinity;
  for (let la = Math.ceil(laAt(H) / step) * step; la <= laAt(0); la += step) {
    const [, y] = P([la, minLo]);
    const lbl = lastY - y >= 64 && y > 56 && y < H - 30;
    if (lbl) lastY = y;
    g += `<line x1="0" y1="${y}" x2="${W}" y2="${y}" class="kschema__grid"/>${lbl ? `<text x="10" y="${y - 6}" class="kschema__deg">${la.toFixed(single ? 2 : 1).replace('.', ',')}° s. š.</text>` : ''}`;
  }
  // spojnice mezi městy (trasa „sítě“ – jen grafický rytmus, seřazeno podle zeměpisné délky)
  const cityPts = CT.cities.map(c => P(c.geo)).sort((a, b) => a[0] - b[0]);
  if (cityPts.length > 1) g += `<polyline points="${cityPts.map(p => p.join(',')).join(' ')}" class="kschema__net"/>`;
  // kruhy kolem bodů
  CT.cities.forEach(c => { const [x, y] = P(c.geo); g += [single ? 160 : 44, single ? 100 : 26, single ? 48 : 0].filter(Boolean).map(r => `<circle cx="${x}" cy="${y}" r="${r}" class="kschema__ring"/>`).join(''); });
  // měřítko
  const kmPerPx = 111.32 / s; // 1° šířky ≈ 111 km
  const target = (W < 600 ? 80 : 140) * kmPerPx;
  const nice = [0.5, 1, 2, 5, 10, 20, 25, 50, 100].find(v => v >= target * 0.6) || 100;
  const len = nice / kmPerPx;
  g += `<g class="kschema__scale"><line x1="${W - 24 - len}" y1="28" x2="${W - 24}" y2="28"/><line x1="${W - 24 - len}" y1="23" x2="${W - 24 - len}" y2="33"/><line x1="${W - 24}" y1="23" x2="${W - 24}" y2="33"/><text x="${W - 24 - len}" y="18">${String(nice).replace('.', ',')} km</text></g>`;
  // severka
  g += `<g class="kschema__north" transform="translate(28 30)"><path d="M0 -12 L5 6 L0 2 L-5 6 Z"/><text x="10" y="4">S</text></g>`;
  // lupa pro město s více body (Praha) – do rohu nejdál od ostatních bodů
  let pins = '';
  const multi = CT.cities.find(c => c.points.length > 1);
  CT.points.forEach(p => {
    if (multi && multi.points.includes(p)) return;
    const [x, y] = P(p.geo);
    pins += schemaPin(p.offices, x, y, '', x > W * 0.62);
  });
  if (multi) {
    const [cx, cy] = P(multi.geo);
    const R = lensR;
    const corners = [[R + 24, H - R - 48], [W - R - 24, H - R - 48], [R + 24, R + 56], [W - R - 24, R + 56]];
    const far = corners.map(c => [c, Math.min(...CT.points.map(p => Math.hypot(P(p.geo)[0] - c[0], P(p.geo)[1] - c[1])))]).sort((a, b) => b[1] - a[1])[0][0];
    const [ix, iy] = narrow ? [W - R - 20, H - R - 30] : far;
    g += `<circle cx="${cx}" cy="${cy}" r="10" class="kschema__focus"/>`;
    const d = Math.hypot(ix - cx, iy - cy) || 1;
    g += `<line x1="${cx + (ix - cx) / d * 12}" y1="${cy + (iy - cy) / d * 12}" x2="${ix - (ix - cx) / d * R}" y2="${iy - (iy - cy) / d * R}" class="kschema__lead"/>`;
    g += `<circle cx="${ix}" cy="${iy}" r="${R}" class="kschema__lens"/>`;
    pins += `<span class="kschema__city" style="left:${cx}px;top:${cy}px" data-pin="${multi.offices.map(o => o.key).join(' ')}"><b>${esc(multi.name)}</b> ${kancelar(multi.offices.length)}</span>`;
    // body uvnitř lupy
    const la = multi.points.map(p => p.geo[0]), lo = multi.points.map(p => p.geo[1]);
    const mLa = (Math.min(...la) + Math.max(...la)) / 2, mLo = (Math.min(...lo) + Math.max(...lo)) / 2;
    const span = Math.max((Math.max(...lo) - Math.min(...lo)) * kx, Math.max(...la) - Math.min(...la)) || 0.01;
    const ls = (R * 1.0) / span;
    // štítky směrem do plochy a rozestoupené na výšku (min. 30 px), ať se nepřekrývají
    const inward = ix > W / 2;
    const lp = multi.points.map(p => ({ p, x: ix + (p.geo[1] - mLo) * kx * ls, y: iy - (p.geo[0] - mLa) * ls })).sort((a, b) => a.y - b.y);
    let last = -Infinity;
    lp.forEach(q => { q.ly = Math.max(q.y, last + 30); last = q.ly; });
    const shift = Math.max(0, (last - (iy + R * 0.8)));
    lp.forEach(q => { q.ly -= shift; pins += schemaPin(q.p.offices, q.x, q.y, ' kpin--lens', inward, q.ly - q.y); });
    pins += `<span class="kschema__lenslbl" style="left:${ix}px;top:${narrow ? iy - R - 18 : iy + R + 10}px">${esc(multi.name)} · detail</span>`;
  }
  svg.innerHTML = g;
  pinsEl.innerHTML = pins;
  if (active) highlight(active, true);
}
function schemaPin(offs, x, y, cls, left, dy = 0) {
  return `<button type="button" class="kpin kpin--schema${cls}${left ? ' kpin--left' : ''}" style="left:${x}px;top:${y}px;--dy:${Math.round(dy)}px" data-pin="${offs.map(o => o.key).join(' ')}" data-locate-card="${offs[0].key}" aria-label="${esc(offs.map(o => o.n).join(', '))}"><span class="kpin__dot" aria-hidden="true"></span><span class="kpin__lbl">${offs.map(o => `<b>${pad2(o.i)}</b>${esc(short(o.n))}`).join('<i aria-hidden="true"></i>')}</span></button>`;
}

// --- tým podle kanceláře ---
let teamFilter = '';
function drawTeam() {
  const all = CT.offices.flatMap(x => x.brokers);
  const multi = CT.offices.length > 1;
  const list = teamFilter ? CT.offices.find(x => x.key === teamFilter).brokers : (multi ? all.slice(0, 8) : all);
  $('#tym-chips').innerHTML = multi ? `<button class="chip" type="button" data-tf="" aria-pressed="${!teamFilter}">Všechny kanceláře</button>` + CT.offices.map(x => `<button class="chip" type="button" data-tf="${x.key}" aria-pressed="${teamFilter === x.key}">${esc(short(x.n))} <span>${x.brokers.length}</span></button>`).join('') : '';
  $('#tym-chips').hidden = !multi;
  $('#tym-grid').innerHTML = list.map(a => `<article class="agent"><div class="agent__photo"><img src="${esc(a.img)}" alt="" loading="lazy"></div><div class="agent__body"><h3 class="agent__name">${esc(a.n)}</h3><p class="agent__role">${esc(a.r || 'Realitní makléř')}${multi ? ` · ${esc(short(a.office))}` : ''}</p><div class="agent__contact"><a href="tel:${a.tel.replace(/\s/g, '')}">${ico('phone')}<span>${esc(a.tel)}</span></a><a href="mailto:${esc(a.mail)}">${ico('mail')}<span>${esc(a.mail)}</span></a></div></div></article>`).join('');
  const more = multi && !teamFilter && all.length > list.length;
  $('#tym-more').innerHTML = more ? `<p>Zobrazeno ${list.length} z ${all.length} profilů. Vyberte kancelář, nebo projděte všechny makléře.</p>` : '';
}

window.PAGE = {
  note: 'Souřadnice kanceláří nejsou v CMS – geokódovány z adres (OSM, číslo domu). Telefon, e-mail a otevírací doba poboček v datech nejsou, proto se nezobrazují. Mapa (OSM, tónovaná do INK) až po souhlasu s cookies, jinak SVG schéma.',
  init() {
    document.addEventListener('consent', () => CT && drawMap());
    // karta ↔ mapa
    const list = $('#ct-list');
    list.addEventListener('mouseover', e => { const c = e.target.closest('.ofc'); if (c) highlight(c.dataset.o, true); });
    list.addEventListener('mouseleave', () => highlight(null, false));
    list.addEventListener('focusin', e => { const c = e.target.closest('.ofc'); if (c) highlight(c.dataset.o, true); });
    // schéma (bez cookies): špendlík ↔ karta
    const mapEl = $('#ct-map');
    mapEl.addEventListener('mouseover', e => { const p = e.target.closest('.kpin--schema'); if (p) highlight(p.dataset.pin, true); });
    mapEl.addEventListener('focusin', e => { const p = e.target.closest('.kpin--schema'); if (p) highlight(p.dataset.pin, true); });
    mapEl.addEventListener('mouseout', e => { if (e.target.closest('.kpin--schema') && !e.relatedTarget?.closest?.('.kpin--schema')) highlight(null, false); });
    document.addEventListener('click', e => {
      const loc = e.target.closest('[data-locate]');
      if (loc) { select(loc.dataset.locate, { fly: true, scrollMap: !isDesk() }); return; }
      const cb = e.target.closest('[data-city]');
      if (cb) {
        const c = CT.cities.find(q => q.name === cb.dataset.city);
        active = c.offices.map(o => o.key).join(' ');
        highlight(active, true);
        if (lmap) c.points.length > 1 ? lmap.flyToBounds(L.latLngBounds(c.points.map(p => p.geo)).pad(0.6), { maxZoom: 14, duration: 0.9 }) : lmap.flyTo(c.geo, 13, { duration: 0.9 });
        scrollToEl($('#ct-map'), 'start');
        return;
      }
      const sp = e.target.closest('[data-locate-card]');
      if (sp) { select(sp.dataset.locateCard, { fly: false, scrollCard: true }); return; }
      const card = e.target.closest('.ofc');
      if (card && !e.target.closest('a, button')) select(card.dataset.o, { fly: true });
      const w = e.target.closest('[data-write]');
      if (w && $('#c-branch')) { const opt = [...$('#c-branch').options].find(o => o.value === w.dataset.write); if (opt) $('#c-branch').value = opt.value; }
      const t = e.target.closest('[data-team]');
      if (t) { teamFilter = t.dataset.team; drawTeam(); }
      const tf = e.target.closest('[data-tf]');
      if (tf) { teamFilter = tf.dataset.tf; drawTeam(); }
    });
    $('#ct-fit').addEventListener('click', () => { active = null; highlight(null, false); fitAll(true); });
  },
  render(k) {
    k = dataKey(k);
    CT = model(k);
    active = null; teamFilter = '';
    const o = CT.o, single = CT.offices.length === 1;
    document.title = `Kontakty | ${o.name}`;
    $('#ct-h1').textContent = 'Kde nás najdete';
    $('#ct-lead').textContent = single
      ? `Kancelář ${o.name} najdete v Kladně na náměstí Svobody. Zastavte se osobně, nebo nám napište – ozveme se.`
      : `${kancelar(CT.offices.length)} ve ${CT.cities.length} městech. Najděte tu nejbližší a domluvte si schůzku s makléřem z vašeho regionu.`;
    const word = t => t.replace(/^\d+\s/, '');
    $('#ct-stats').innerHTML = (single ? [[CT.brokerCount, word(makler(CT.brokerCount))]] : [
      [CT.offices.length, word(kancelar(CT.offices.length))],
      [CT.cities.length, word(mesto(CT.cities.length))],
      [CT.brokerCount, word(makler(CT.brokerCount))],
    ]).map(([n, l]) => `<div><dt>${n}</dt><dd>${l}</dd></div>`).join('');
    $('#ct-cities').innerHTML = CT.cities.map(c => `<li><button type="button" data-city="${esc(c.name)}">${esc(c.name)}<span>${c.offices.length}</span></button></li>`).join('');
    $('#ct-cities').hidden = single;
    $('#ct-list-e').textContent = single ? CT.offices[0].city : 'Pobočky';
    $('#ct-list-h').textContent = single ? 'Kancelář' : `${kancelar(CT.offices.length)}`;
    $('#ct-list').innerHTML = CT.offices.map(x => officeCard(x, single)).join('');
    $('#ct-fit').hidden = single;
    $('#ct-stage').classList.toggle('is-single', single);
    drawMap();
    // formulář
    if (single) { $('#c-branch-f').hidden = true; }
    else {
      $('#c-branch').innerHTML = '<option value="">Nevím, poraďte mi</option>' + CT.offices.map(x => `<option value="${esc(x.n)}">${esc(x.n)} – ${esc(x.city)}</option>`).join('');
      $('#c-branch-f').hidden = false;
    }
    // fakturační údaje – jen tam, kde jsou reálná data
    const legal = k === 'stars';
    $('#fakturace').hidden = !legal;
    if (legal) {
      $('#fakturace-body').innerHTML = `<div class="ct-legal__col"><dl class="ct-legal__dl"><div><dt>Provozovatel</dt><dd>Gamp reality servis s.r.o.</dd></div><div><dt>IČ</dt><dd>${STARS_LEGAL.ico}</dd></div><div><dt>Adresa kanceláře</dt><dd>${esc(o.address)}</dd></div></dl><p class="ct-legal__note">${esc(STARS_LEGAL.note)}</p></div>
        <div class="ct-legal__col"><h3 class="ct-legal__h">${ico('bank')} Účty pro rezervační poplatky</h3><dl class="ct-legal__dl">${STARS_LEGAL.accounts.map(([n, a]) => `<div><dt>${esc(n)}</dt><dd>${esc(a)}</dd></div>`).join('')}</dl></div>`;
    }
    $('#tym-h').textContent = single ? 'Makléři kanceláře' : 'Makléři podle kanceláře';
    $('#tym-all').href = href('makleri.html');
    drawTeam();
  },
  checks() {
    const m = $('#ct-map');
    const mode = lmap ? 'Leaflet' : m?.classList.contains('is-schema') ? 'schéma' : '–';
    return check('Mapa', true, mode) + check('Špendlíky', CT?.points.length > 0, String(CT?.points.length || 0)) + check('Lenis vyp. v mapě', m?.hasAttribute('data-lenis-prevent'), m?.hasAttribute('data-lenis-prevent') ? 'ano' : 'ne');
  },
};
