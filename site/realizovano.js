// Realizováno – uzavřené zakázky kanceláře. Vše se počítá z window.SOLD[kancelář] (staženo z webu kanceláře),
// nic se nedopočítává ani nevymýšlí. Bez dat (dnes TGH) se ukáže poctivý prázdný stav.
// Pohyb: pečeť „Prodáno / Pronajato“ dopadne na kartu při vjetí do obrazovky (IntersectionObserver + CSS),
// cesta zakázky se škrtá se scrollem (GSAP ScrollTrigger, jen když je k dispozici).
// Bez pohybu (?nomotion, reduced-motion, knihovny se nenačtou) je hned vidět konečný stav.
(function () {
  const PER = 12;
  const R = { deal: 'all', shown: PER };
  const reduce = () => matchMedia('(prefers-reduced-motion: reduce)').matches || qs.has('nomotion');
  const sold = () => window.SOLD?.[dataKey(office)] || [];
  const cityOf = x => ((x.place || x.loc || '').split(', ').at(-1) || '').split('-')[0].trim();
  const kind = x => (x.rent ? 'Pronajato' : 'Prodáno');
  const TYPES = [['byt', 'Byty'], ['dum', 'Domy'], ['komercni', 'Komerční'], ['pozemek', 'Pozemky'], ['ostatni', 'Ostatní']];
  const obec = n => (n === 1 ? 'obec' : n >= 2 && n <= 4 ? 'obce' : 'obcí');

  function stats(list) {
    const sale = list.filter(x => !x.rent), rent = list.filter(x => x.rent);
    const priced = sale.filter(x => x.price != null);
    const vol = priced.reduce((a, x) => a + x.price, 0);
    const types = TYPES.map(([t, l]) => [l, list.filter(x => x.type === t).length]).filter(([, n]) => n);
    const pm = {};
    list.forEach(x => { const c = cityOf(x); if (c) pm[c] = (pm[c] || 0) + 1; });
    const places = Object.entries(pm).sort((a, b) => b[1] - a[1]);
    return { total: list.length, sale: sale.length, rent: rent.length, priced: priced.length, vol, types, places, cities: places.length };
  }

  // --- pečeť: kruhový text + stav uprostřed ---
  let sealN = 0;
  const seal = x => {
    const id = 'rz-seal-' + (++sealN);
    return `<span class="rz-seal" aria-hidden="true"><svg viewBox="0 0 100 100"><defs><path id="${id}" d="M50,50 m-37,0 a37,37 0 1,1 74,0 a37,37 0 1,1 -74,0"/></defs>
      <circle cx="50" cy="50" r="47" class="rz-seal__ring"/><circle cx="50" cy="50" r="28" class="rz-seal__ring rz-seal__ring--in"/>
      <text class="rz-seal__txt"><textPath href="#${id}" textLength="228" lengthAdjust="spacing">${kind(x).toUpperCase()} · REALIZOVÁNO ·</textPath></text>
      <path class="rz-seal__check" d="M38 50.5l8 8L63 41.5"/></svg></span>`;
  };
  const rcard = x => `<article class="rz-card${x.img ? '' : ' is-empty'}">
      <div class="rz-card__media">${x.img ? `<img src="${esc(x.img)}" alt="" loading="lazy" onerror="this.parentElement.parentElement.classList.add('is-empty');this.remove()">` : ''}${seal(x)}</div>
      <div class="rz-card__body">
        <div class="pcard__params">${params(x).map(p => `<span class="param">${esc(p)}</span>`).join('')}</div>
        <h3 class="rz-card__loc">${esc(x.place || x.loc)}</h3>
        <p class="rz-card__st"><span class="rz-card__dot" aria-hidden="true"></span>${kind(x)} · uzavřená zakázka</p>
      </div>
    </article>`;

  // --- zeď: pečeť dopadne, fotka přejde do archivní šedi ---
  let io = null;
  function armWall() {
    const wall = $('#rz-wall');
    io?.disconnect();
    if (reduce() || !('IntersectionObserver' in window)) { wall.classList.remove('is-armed'); return; }
    wall.classList.add('is-armed');
    let batch = 0, t = 0;
    io = new IntersectionObserver(es => {
      es.forEach(e => {
        if (!e.isIntersecting) return;
        const el = e.target;
        el.style.setProperty('--d', (batch++ % 4) * 110 + 'ms');
        clearTimeout(t); t = setTimeout(() => (batch = 0), 120);
        el.classList.add('is-closed');
        io.unobserve(el);
      });
    }, { rootMargin: '0px 0px -12% 0px', threshold: 0.25 });
    $$('.rz-card:not(.is-closed)', wall).forEach(c => io.observe(c));
  }
  function drawWall() {
    const all = sold(), list = R.deal === 'all' ? all : all.filter(x => (R.deal === 'rent' ? x.rent : !x.rent));
    const wall = $('#rz-wall');
    const have = $$('.rz-card', wall).length;
    const slice = list.slice(0, R.shown);
    if (have && have < slice.length && wall.dataset.deal === R.deal) wall.insertAdjacentHTML('beforeend', slice.slice(have).map(rcard).join(''));
    else wall.innerHTML = slice.map(rcard).join('');
    wall.dataset.deal = R.deal;
    $('#rz-wall-info').textContent = `Zobrazeno ${num(slice.length)} z ${num(list.length)}`;
    $('#rz-more').hidden = slice.length >= list.length;
    armWall();
  }
  function drawFilter(s) {
    const opts = [['all', 'Vše', s.total], ['sale', 'Prodeje', s.sale], ['rent', 'Pronájmy', s.rent]].filter(([k, , n]) => k === 'all' || n);
    $('#rz-filter').innerHTML = opts.map(([k, l, n]) => `<button type="button" data-deal="${k}" aria-pressed="${R.deal === k}">${l} <span class="rz-filter__n">${num(n)}</span></button>`).join('');
    $('#rz-filter').hidden = opts.length < 3;
  }

  // --- mapa (souhlas s cookies jako na výpisu; podklad OSM ztlumený do šedi – CARTO dnes vyžaduje API klíč) ---
  let map = null;
  function drawMap() {
    const el = $('#rz-map'), list = sold().filter(x => x.lat && x.lng);
    if (map) { map.remove(); map = null; }
    if (consent.get() !== 'yes') { el.innerHTML = blocked('map', 420); return; }
    if (!window.L || !L.markerClusterGroup) { el.innerHTML = '<div class="blocked" style="min-height:420px">Mapová knihovna se nenačetla.</div>'; return; }
    el.innerHTML = '';
    map = L.map(el, { scrollWheelZoom: false, zoomControl: true, attributionControl: true });
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 18, attribution: '© OpenStreetMap' }).addTo(map);
    const cluster = L.markerClusterGroup({ showCoverageOnHover: false, maxClusterRadius: 48,
      iconCreateFunction: c => L.divIcon({ html: `<span>${c.getChildCount()}</span>`, className: 'rz-mcluster', iconSize: [44, 44] }) });
    cluster.addLayers(list.map(x => L.marker([x.lat, x.lng], { icon: L.divIcon({ className: 'rz-mpin', html: '<span></span>', iconSize: [16, 16] }), keyboard: true, title: `${kind(x)}: ${x.t}` })
      .bindPopup(`<div class="rz-pop"><span class="rz-pop__st">${kind(x)}</span><b>${esc(x.place || x.loc)}</b><span>${esc(params(x).join(' · '))}</span></div>`, { closeButton: true, maxWidth: 260 })));
    map.addLayer(cluster);
    if (list.length) map.fitBounds(L.latLngBounds(list.map(x => [x.lat, x.lng])).pad(0.08), { maxZoom: 12 });
    else map.setView([49.9, 15.3], 7);
    setTimeout(() => map?.invalidateSize(), 80);
  }

  // --- cesta zakázky: dva stavy se přeškrtnou, třetí se rozsvítí (scrub) ---
  let pathTl = null;
  function armPath() {
    const ol = $('#rz-path');
    pathTl?.scrollTrigger?.kill(); pathTl?.kill(); pathTl = null;
    ol.classList.remove('is-armed');
    $$('li', ol).forEach(li => li.style.removeProperty('--s'));
    if (reduce() || !window.gsap || !window.ScrollTrigger) return;
    gsap.registerPlugin(ScrollTrigger);
    ol.classList.add('is-armed');
    const [a, b, c] = $$('li', ol);
    pathTl = gsap.timeline({ scrollTrigger: { trigger: ol, start: 'top 78%', end: 'bottom 52%', scrub: true } })
      .fromTo(a, { '--s': 0 }, { '--s': 1, ease: 'none', duration: 1 })
      .fromTo(b, { '--s': 0 }, { '--s': 1, ease: 'none', duration: 1 })
      .fromTo(c, { '--s': 0 }, { '--s': 1, ease: 'none', duration: 0.8 });
  }

  // --- pásky (typ, lokalita) – narostou při vjetí ---
  let bio = null;
  function bars(rows, max) {
    return rows.map(([l, n]) => `<li><span class="rz-bars__l">${esc(l)}</span><span class="rz-bars__n">${num(n)}</span><span class="rz-bars__t"><i style="--w:${(n / max * 100).toFixed(1)}%"></i></span></li>`).join('');
  }
  function armBars() {
    bio?.disconnect();
    const box = $('#rz-nums');
    if (reduce() || !('IntersectionObserver' in window)) { box.classList.remove('is-armed'); return; }
    box.classList.add('is-armed');
    bio = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { e.target.classList.add('is-in'); bio.unobserve(e.target); } }), { threshold: 0.3 });
    $$('.rz-bars', box).forEach(b => { b.classList.remove('is-in'); bio.observe(b); });
  }

  // --- hero: mozaika skutečných fotek realizací v archivní šedi ---
  function mosaic(list) {
    const imgs = list.filter(x => x.img).slice(0, 24).map(x => x.img);
    if (imgs.length < 8) return '';
    const cols = 4, per = Math.ceil(imgs.length / cols);
    return Array.from({ length: cols }, (_, i) => {
      const set = imgs.slice(i * per, i * per + per).map(s => `<img src="${esc(s)}" alt="" loading="lazy" decoding="async">`).join('');
      return `<div class="rz-hero__col"><div class="rz-hero__track">${set}${set}</div></div>`;
    }).join('');
  }

  window.PAGE = {
    note: 'Realizace = window.SOLD (Stars: 184 z webu kanceláře, TGH: web je nezveřejňuje → prázdný stav). Čísla se počítají z dat; objem je součet posledních inzerovaných cen prodejů, ne kupní ceny. Data neobsahují datum uzavření, proto stránka nemá časovou osu.',
    init() {
      $('#rz-filter').addEventListener('click', e => {
        const b = e.target.closest('[data-deal]'); if (!b) return;
        R.deal = b.dataset.deal; R.shown = PER;
        $$('[data-deal]').forEach(x => x.setAttribute('aria-pressed', x === b));
        drawWall();
      });
      $('#rz-more').addEventListener('click', () => { R.shown += PER; drawWall(); });
      document.addEventListener('consent', () => { if (sold().length) drawMap(); });
    },
    render(k) {
      const o = OFFICES[k], list = sold(), s = stats(list), has = !!list.length;
      document.title = `Realizováno | ${o.name}`;
      R.deal = 'all'; R.shown = PER;

      $('#rz-mosaic').innerHTML = mosaic(list);
      $('#rz-lead').innerHTML = has
        ? `<b>Prodeje i pronájmy, které jsme dovedli až k podpisu.</b> Tady už nic nenabízíme – tady ukazujeme, co máme za sebou.`
        : `Uzavřené zakázky ukazujeme otevřeně – jako doklad práce, ne jako nabídku. Archiv této kanceláře se připravuje.`;
      $('#rz-hero-stat').innerHTML = has
        ? `<span class="rz-hero__n" data-count="${s.total}">${num(s.total)}</span><span class="rz-hero__nl">realizovaných zakázek<br>na webu kanceláře</span>`
        : '';

      ['#rz-nums', '#rz-map-sec', '#zed'].forEach(id => ($(id).hidden = !has));
      $('#rz-empty').hidden = has;
      $('.rz-hero').classList.toggle('is-empty', !has);
      if (!has) {
        $('#rz-empty-p').textContent = `Web kanceláře ${o.name} dnes realizované zakázky nezveřejňuje, proto tu zatím nejsou. Stránka se naplní sama, jakmile budou realizace v datech z CRM – čísla, mapa i archiv se počítají automaticky.`;
        io?.disconnect(); bio?.disconnect(); $('#rz-wall').innerHTML = ''; if (map) { map.remove(); map = null; }
        armPath();
        return;
      }

      const st = [[s.total, 'realizovaných zakázek'], [s.sale, s.sale === 1 ? 'prodej' : s.sale <= 4 ? 'prodeje' : 'prodejů'], [s.rent, s.rent === 1 ? 'pronájem' : s.rent <= 4 ? 'pronájmy' : 'pronájmů'], [s.cities, obec(s.cities) + ' a měst']];
      if (s.priced) st.push([Math.round(s.vol / 1e6), 'mil. Kč v inzerovaných cenách prodejů', '*']);
      $('#rz-stats').innerHTML = st.map(([n, l, mark]) => `<div data-reveal><dt><span data-count="${n}">${num(n)}</span>${mark ? '<sup>*</sup>' : ''}</dt><dd>${l}</dd></div>`).join('');
      $('#rz-types').innerHTML = bars(s.types, Math.max(...s.types.map(t => t[1])));
      const top = s.places.slice(0, 6);
      $('#rz-places').innerHTML = bars(top, top[0][1]);
      $('#rz-note').textContent = (s.priced ? `* Součet posledních inzerovaných cen ${num(s.priced)} prodaných nemovitostí. Nejde o skutečné kupní ceny. ` : '')
        + `Počítáno z ${num(s.total)} realizací zveřejněných na webu kanceláře. Lokalita = obec z adresy nabídky.`;

      drawFilter(s);
      drawWall();
      $('#rz-all').href = href('vypis.html', '&status=sold');
      drawMap();
      armBars();
      armPath();
    },
    checks() {
      const list = sold(), s = stats(list);
      const shown = $('#rz-hero-stat [data-count]'), cards = $$('#rz-wall .rz-card').length;
      const vis = el => el && !el.hidden && getComputedStyle(el).opacity !== '0';
      return check('Realizace v datech', null, num(s.total))
        + check('Počítadlo = data', list.length ? +shown?.dataset.count === s.total : null, list.length ? shown?.dataset.count + ' / ' + s.total : 'prázdný stav')
        + check('Karty na zdi', list.length ? cards === Math.min(PER, s.total) || cards > 0 : null, String(cards))
        + check('Pečeti viditelné bez pohybu', reduce() ? $$('.rz-seal').every(vis) : null, reduce() ? 'ok' : 'animace');
    },
  };
})();
