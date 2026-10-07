// Developerské projekty – sdílené pomůcky (výpis i detail) + výpis s filtrem štítků a animací stavby v hlavičce.
// Štítky se odvozují jen z reálných dat projektu: stav (label z CMS), lokalita (z názvu/popisu), vlastnosti (z faktů a popisu).

const PJ = (() => {
  // lokalita – rozpoznání z textu projektu (CMS nemá samostatné pole lokality)
  const CITIES = [['Karlovy Vary', /karlovar/i], ['Plzeň', /plzn|plzeň/i], ['Písecko', /písec/i], ['Praha', /praha|prah[ayu]|pražsk|košíř|záběhlic|strašnic|libn|vysočan|zbraslav|suchdol|vinohrad|podolí|kyjích/i]];
  const DISTRICTS = [['Košíře', /košíř/i], ['Záběhlice', /záběhlic/i], ['Strašnice', /strašnic/i], ['Libeň', /libn/i], ['Vysočany', /vysočan/i], ['Zbraslav', /zbraslav/i], ['Suchdol', /suchdol/i], ['Vinohrady', /vinohrad/i], ['Podolí', /podolí/i], ['Kyje', /kyjích/i], ['Bukovec', /bukov/i]];
  // vlastnosti – klíčová slova ve faktech, odrážkách a popisu
  const FEATS = [['Zahrádky', /zahrád/i], ['Rekonstrukce', /rekonstru|revitaliz/i], ['Historický dům', /histori|secesn/i], ['Pro investici', /investi|výnos/i], ['Parkování', /parkov/i], ['Ihned k nastěhování', /nastěhování ihned|okamžitému nastěhování/i]];
  const text = p => [p.n, p.d, ...(p.bullets || []).map(b => (Array.isArray(b) ? b.join(' ') : b))].filter(Boolean).join(' ');
  // stejná trojice faktů u více projektů = výchozí text šablony CMS (u všech „Realizováno“) → nepoužívá se
  const boiler = list => {
    const c = {};
    list.forEach(p => { const k = (p.facts || []).join('|'); if (k) c[k] = (c[k] || 0) + 1; });
    return new Set(Object.keys(c).filter(k => c[k] >= 3));
  };
  function enrich(list) {
    const bp = boiler(list);
    return list.map(p => {
      const isBoiler = bp.has((p.facts || []).join('|'));
      const facts = isBoiler ? [] : (p.facts || []).map(f => f.replace('podaží', 'podlaží').replace('světelní a aktustické', 'světelné a akustické'));
      const t = text(p) + ' ' + facts.join(' ');
      const city = (CITIES.find(([, r]) => r.test(t)) || [])[0] || null;
      const district = (DISTRICTS.find(([, r]) => r.test(t)) || [])[0] || null;
      return { ...p, facts, boiler: isBoiler, city, district, feats: FEATS.filter(([, r]) => r.test(t)).map(([n]) => n), done: p.label === 'Realizováno' };
    });
  }
  function list(k) {
    k = dataKey(k);
    const raw = k === 'stars' ? OFFICES.stars.projects.map(p => ({ ...p, label: 'V prodeji', facts: [], bullets: [] })) : (PROJECTS[k] || []);
    return enrich(raw);
  }
  const link = p => href('projekt.html', p.slug ? '&slug=' + p.slug : '&name=' + encodeURIComponent(p.n));
  const where = p => [p.city, p.district].filter(Boolean).join(' · ');
  const reduce = () => matchMedia('(prefers-reduced-motion: reduce)').matches || qs.has('nomotion');
  const card = p => `<article class="pj-card${p.done ? ' is-done' : ''}" data-slug="${esc(p.slug || p.n)}">
      <div class="pj-card__media${p.img ? '' : ' is-empty'}">${p.img ? `<img src="${esc(p.img)}" alt="" loading="lazy">` : ico('projekt', 'icon icon--lg')}
        <span class="pj-status${p.done ? ' is-done' : ''}">${esc(p.label || 'V prodeji')}</span></div>
      ${where(p) ? `<span class="pj-card__loc">${esc(where(p))}</span>` : ''}
      <h2><a href="${link(p)}">${esc(p.n)}</a></h2>
      ${p.d ? `<p>${esc(p.d)}</p>` : ''}
      ${p.facts.length ? `<ul class="pj-tags" aria-label="Fakta projektu">${p.facts.map(f => `<li class="pj-tag">${esc(f)}</li>`).join('')}</ul>` : ''}
      <span class="pj-card__more" aria-hidden="true">${p.done ? 'Prohlédnout projekt' : 'Detail projektu'} ${ico('arrow')}</span>
    </article>`;
  return { list, link, where, card, reduce, FEATS };
})();

// --- Výpis projektů ---------------------------------------------------------------------
if (document.body.dataset.page === 'projekty' && document.getElementById('pj-grid')) {
  const F = { st: qs.get('st') || '', loc: qs.get('loc') || '', f: new Set((qs.get('f') || '').split(',').filter(Boolean)) };
  let ALL = [];
  const match = (p, o = F) => (!o.st || p.label === o.st) && (!o.loc || p.city === o.loc) && [...o.f].every(x => p.feats.includes(x));
  const uniq = (arr, order) => { const c = {}; arr.forEach(v => v && (c[v] = (c[v] || 0) + 1)); return Object.keys(c).sort((a, b) => (order ? order.indexOf(a) - order.indexOf(b) : c[b] - c[a] || a.localeCompare(b, 'cs'))); };

  function chips() {
    const cnt = o => ALL.filter(p => match(p, o)).length;
    const sts = uniq(ALL.map(p => p.label), ['V prodeji', 'Realizováno']);
    const locs = uniq(ALL.map(p => p.city));
    const feats = PJ.FEATS.map(([n]) => n).filter(n => ALL.some(p => p.feats.includes(n)));
    const single = (key, vals) => [['', 'Vše'], ...vals.map(v => [v, v])].map(([v, l]) => {
      const n = cnt({ ...F, [key]: v });
      return `<button type="button" class="pj-chip" data-k="${key}" data-v="${esc(v)}" aria-pressed="${F[key] === v}"${n || F[key] === v ? '' : ' disabled'}>${esc(l)} <small>${n}</small></button>`;
    }).join('');
    const multi = feats.map(v => {
      const on = F.f.has(v), f2 = new Set(F.f); f2.add(v);
      const n = cnt({ ...F, f: f2 });
      return `<button type="button" class="pj-chip" data-k="f" data-v="${esc(v)}" aria-pressed="${on}"${n || on ? '' : ' disabled'}>${esc(v)} <small>${n}</small></button>`;
    }).join('');
    $('#pj-filter').innerHTML = `
      <div class="pj-filter__row" role="group" aria-label="Stav projektu"><span class="pj-filter__label">Stav</span>${single('st', sts)}</div>
      ${locs.length > 1 ? `<div class="pj-filter__row" role="group" aria-label="Lokalita"><span class="pj-filter__label">Lokalita</span>${single('loc', locs)}</div>` : ''}
      ${feats.length ? `<div class="pj-filter__row" role="group" aria-label="Vlastnosti (lze kombinovat)"><span class="pj-filter__label">Vlastnosti</span>${multi}</div>` : ''}`;
  }

  function apply(animate) {
    const cards = $$('#pj-grid .pj-card');
    const show = new Set(ALL.filter(p => match(p)).map(p => p.slug || p.n));
    const n = show.size, active = !!(F.st || F.loc || F.f.size);
    $('#pj-info').textContent = `${n} ${n === 1 ? 'projekt' : n >= 2 && n <= 4 ? 'projekty' : 'projektů'}${active ? ` z ${ALL.length}` : ''}`;
    $('#pj-reset').hidden = !active;
    $('#pj-empty').hidden = n > 0;
    const smooth = animate && !PJ.reduce();
    cards.forEach(c => {
      const on = show.has(c.dataset.slug);
      if (!smooth) { c.hidden = !on; c.classList.remove('is-out'); return; }
      if (on && c.hidden) { c.hidden = false; c.classList.add('is-out'); void c.offsetWidth; c.classList.remove('is-out'); }
      else if (!on && !c.hidden) { c.classList.add('is-out'); clearTimeout(c._t); c._t = setTimeout(() => { if (!show.has(c.dataset.slug) || c.classList.contains('is-out')) c.hidden = true; }, 320); }
      else if (on) { clearTimeout(c._t); c.classList.remove('is-out'); }
    });
    // URL – filtr přežije obnovení stránky i přepnutí verze předlohy
    const u = new URLSearchParams(location.search);
    ['st', 'loc', 'f'].forEach(k => u.delete(k));
    if (F.st) u.set('st', F.st); if (F.loc) u.set('loc', F.loc); if (F.f.size) u.set('f', [...F.f].join(','));
    history.replaceState(null, '', location.pathname + '?' + u.toString() + location.hash);
    chips();
    syncMap();
  }

  // Mapa projektů v hlavičce. CMS nemá souřadnice → dohledáno podle adresy / ulice v názvu (OSM Photon, 7. 10. 2026).
  // approx = jen čtvrť nebo okolí (název projektu adresu neobsahuje) – pin má čárkovaný kroužek.
  const GEO = {
    'musilkova': [50.06726, 14.36732], 'v-zahradach-17': [50.11543, 14.47326], 'kolma-5': [50.10354, 14.51582],
    'elisky-premyslovny-428': [49.97273, 14.39244], 'rezidence-jablonskeho-1': [49.73972, 13.38959], 'velehradska-24': [50.08031, 14.45327],
    'palackeho-namesti-2': [50.07296, 14.41475], 'pod-pekarnami': [50.11126, 14.50361, 1], 'rezidence-gutovka': [50.06784, 14.49187, 1],
    'bydleni-suchdolska': [50.13039, 14.38236, 1], 'vajgarska': [50.10046, 14.55433, 1], 'dum-u-tyrse': [50.07151, 14.38508, 1],
    'maison-de-vary': [50.22529, 12.88179, 1], 'duo-zabehlice': [50.05096, 14.49381, 1], 'exkluzivni-bydleni-vyhledy-podoli': [50.0516, 14.42116, 1],
    'Vila domy Plzeň Bukovec': [49.7699, 13.4397, 1], 'Výjimečný ranč v krajině Píseckých hor': [49.29429, 14.19426, 1],
  };
  let lmap = null, pins = {};
  const key = p => p.slug || p.n;
  function drawMap() {
    const el = $('#pj-map');
    if (lmap) { lmap.remove(); lmap = null; } pins = {};
    const located = ALL.filter(p => GEO[key(p)]);
    if (consent.get() !== 'yes' || !window.L) {
      el.innerHTML = blocked('map', 300);
      return;
    }
    el.innerHTML = '';
    lmap = L.map(el, { zoomControl: false, scrollWheelZoom: false });
    L.control.zoom({ position: 'topright', zoomInTitle: 'Přiblížit', zoomOutTitle: 'Oddálit' }).addTo(lmap);
    lmap.attributionControl.setPrefix(false);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 18, className: 'pj-tiles', attribution: '© <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a>' }).addTo(lmap);
    lmap.on('click', () => lmap.scrollWheelZoom.enable());
    // názvy u pinů až po přiblížení (v přehledu ČR by se pražské projekty překrývaly)
    lmap.on('zoomend', () => el.classList.toggle('is-near', lmap.getZoom() >= 13));
    el.addEventListener('mouseleave', () => lmap?.scrollWheelZoom.disable());
    located.forEach(p => {
      const [lat, lng, approx] = GEO[key(p)];
      const m = L.marker([lat, lng], { icon: L.divIcon({ className: 'pjpin-wrap', html: `<span class="pjpin${p.done ? ' is-done' : ''}${approx ? ' is-approx' : ''}"><em>${esc(p.n)}</em></span>`, iconSize: null }), title: p.n, riseOnHover: true, zIndexOffset: p.done ? 0 : 500 });
      m.bindPopup(`${p.img ? `<img src="${esc(p.img)}" alt="">` : ''}<div class="pj-pop__b"><small>${esc(p.label || 'V prodeji')}${PJ.where(p) ? ' · ' + esc(PJ.where(p)) : ''}${approx ? ' · poloha orientační' : ''}</small><b>${esc(p.n)}</b><a href="${PJ.link(p)}">Detail projektu →</a></div>`, { className: 'pj-pop', closeButton: false, offset: [0, -10] });
      m.on('mouseover', () => hot(key(p), true)); m.on('mouseout', () => hot(key(p), false));
      pins[key(p)] = m;
    });
    const n = ALL.length - located.length;
    if (n) el.insertAdjacentHTML('beforeend', `<span class="pj-map__note">${n} ${n === 1 ? 'projekt' : 'projekty'} bez známé polohy</span>`);
    syncMap(true);
  }
  // piny = aktuální výsledek filtru; mapa se přizpůsobí výřezu
  function syncMap(fit) {
    if (!lmap) return;
    const vis = ALL.filter(p => match(p) && pins[key(p)]);
    Object.entries(pins).forEach(([k, m]) => (vis.some(p => key(p) === k) ? m.addTo(lmap) : m.remove()));
    if (fit !== false && vis.length) lmap.fitBounds(L.latLngBounds(vis.map(p => GEO[key(p)].slice(0, 2))), { padding: [48, 48], maxZoom: 14, animate: !PJ.reduce() });
  }
  function hot(k, on) {
    pins[k]?.getElement()?.querySelector('.pjpin')?.classList.toggle('is-hot', on);
    $(`#pj-grid .pj-card[data-slug="${CSS.escape(k)}"]`)?.classList.toggle('is-hot', on);
  }

  window.PAGE = {
    note: 'Štítky filtru se odvozují z dat: stav = label z CMS, lokalita = rozpoznaná z názvu a popisu (CMS nemá pole lokality), vlastnosti = klíčová slova ve faktech a popisu. 7 projektů „Realizováno“ má v CMS shodnou trojici faktů (výchozí text šablony) – v předloze se nezobrazuje ani nefiltruje. Mapa: CMS nemá souřadnice projektů – dohledány podle adresy v názvu, u projektů bez adresy jen orientačně (čtvrť), Rezidence Zádušní bez polohy. Do CMS doplnit pole lat/lng.',
    render(k) {
      document.title = `Developerské projekty | ${OFFICES[k].name}`;
      ALL = PJ.list(k);
      // odebrat filtr, který v nové kanceláři nedává smysl
      if (F.loc && !ALL.some(p => p.city === F.loc)) F.loc = '';
      if (F.st && !ALL.some(p => p.label === F.st)) F.st = '';
      F.f.forEach(x => { if (!ALL.some(p => p.feats.includes(x))) F.f.delete(x); });
      const sale = ALL.filter(p => !p.done).length, done = ALL.length - sale, cities = new Set(ALL.map(p => p.city).filter(Boolean)).size;
      $('#pj-stats').innerHTML = [[sale, sale === 1 ? 'projekt v prodeji' : sale <= 4 ? 'projekty v prodeji' : 'projektů v prodeji'], ...(done ? [[done, 'realizovaných projektů']] : []), ...(cities ? [[cities, cities === 1 ? 'lokalita' : cities <= 4 ? 'lokality' : 'lokalit']] : [])]
        .map(([v, l]) => `<div><dt data-count="${v}">${v}</dt><dd>${l}</dd></div>`).join('');
      $('#pj-grid').innerHTML = ALL.map(PJ.card).join('');
      apply(false);
      drawMap();
    },
    checks() {
      const tags = $$('.pj-tag, .pj-status'), bad = tags.filter(t => { const s = getComputedStyle(t); return parseFloat(s.paddingLeft) < 8 || (parseFloat(s.borderTopWidth) === 0 && s.backgroundColor === 'rgba(0, 0, 0, 0)'); });
      const vis = $$('#pj-grid .pj-card:not([hidden])').length;
      return check('Štítky s okrajem', !bad.length, bad.length ? bad.length + ' bez okraje' : tags.length + ' ok')
        + check('Filtr = karty', vis === ALL.filter(p => match(p)).length, vis + ' karet');
    },
    init() {
      document.addEventListener('consent', () => ALL.length && drawMap());
      $('#pj-grid').addEventListener('mouseover', e => { const c = e.target.closest('.pj-card'); if (c && c !== hot.last) { if (hot.last) hot(hot.last.dataset.slug, false); hot.last = c; hot(c.dataset.slug, true); } });
      $('#pj-grid').addEventListener('mouseleave', () => { if (hot.last) hot(hot.last.dataset.slug, false); hot.last = null; });
      document.addEventListener('click', e => {
        const c = e.target.closest('.pj-chip'); if (c && !c.disabled) {
          const k = c.dataset.k, v = c.dataset.v;
          if (k === 'f') F.f.has(v) ? F.f.delete(v) : F.f.add(v); else F[k] = F[k] === v && v ? '' : v;
          apply(true);
          $(`.pj-chip[data-k="${k}"][data-v="${CSS.escape(v)}"]`)?.focus();
        }
        if (e.target.closest('#pj-reset, [data-pj-reset]')) { F.st = F.loc = ''; F.f.clear(); apply(true); }
      });
    },
  };
}
