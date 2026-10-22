// Prémiová homepage – stejná data jako standardní verze, jiná kompozice.
// Rozdíl oproti standardu: živý počet ve vyhledávání se počítá nad reálnými daty výpisu (ne simulace).
const PREMIUM = {
  tgh: {
    // Praha z věže při západu slunce – Magnific stock (premium licence, autor tan4ikk)
    hero: 'assets/hero-praha-2400.jpg', heroSet: 'assets/hero-praha-1280.jpg 1280w, assets/hero-praha-2400.jpg 2400w',
    // dronový záběr Staroměstského náměstí (20 s, smyčka) – zdroj 0_Prague_Old_Town_1920x1080.mp4 komprimovaný na 7,1 / 3,6 MB
    video: { sm: 'assets/hero-praha-1280.mp4', lg: 'assets/hero-praha-1920.mp4' },
    final: 'https://www.nextreality-tgh.cz/www/upload/d88ef166/20261006114004877/20261006114004877.1920x1440.shrinkonly.qa-82.jpeg',
    short: 'Praha a okolí',
  },
  stars: {
    hero: 'https://www.nextrealitystars.cz/www/upload/792159b8/20250308064947127/20250308064947127.qa-100.webp',
    final: 'https://www.nextrealitystars.cz/www/upload/3820a704/20260810100348203/20260810100348203.680x570.qa-100.jpg',
    short: 'Kladensko',
  },
};
PREMIUM.test = PREMIUM.tgh;
// makléři TGH s připraveným párem portrétů (výchozí neutrální / úsměv)
const SMILES = { 'Mgr. Olga Procházková': 'prochazkova', 'Tomáš Böhm': 'bohm', 'Lenka Hes': 'hes', 'Jan Hornych': 'hornych' };
// dotyková zařízení nemají hover – úsměv se ukáže, když karta doroluje doprostřed obrazovky
function smileOnTouch() {
  if (matchMedia('(hover: hover)').matches) return;
  const io = new IntersectionObserver(ens => ens.forEach(en => en.target.classList.toggle('is-smiling', en.isIntersecting)), { rootMargin: '-35% 0px -35% 0px' });
  $$('.p-agent.has-smile').forEach(el => io.observe(el));
}
// hero video: fotka se zobrazí hned, video se prolne až po načtení. Bez videa při ?nomotion,
// prefers-reduced-motion a úsporném režimu dat – tam zůstane fotka.
function heroVideo(P) {
  const v = $('[data-bind="hero-video"]'), btn = $('[data-video-toggle]');
  v.pause(); v.removeAttribute('src'); v.classList.remove('is-playing'); v.hidden = btn.hidden = true;
  const skip = !P.video || /[?&]nomotion/.test(location.search) || matchMedia('(prefers-reduced-motion: reduce)').matches || navigator.connection?.saveData;
  if (skip) return;
  v.src = innerWidth * (devicePixelRatio || 1) > 1600 ? P.video.lg : P.video.sm;
  v.hidden = false;
  v.addEventListener('playing', () => { v.classList.add('is-playing'); btn.hidden = false; }, { once: true });
  v.play().catch(err => { if (err.name === 'NotAllowedError') v.hidden = btn.hidden = true; }); // autoplay zablokovaný → zůstane fotka
}
const REF_STEP = 3;
let refShown = REF_STEP;
const RATING_LOGO = { 'Google': 'assets/logo-google.svg', 'Firmy.cz': 'assets/logo-firmy.svg' };
// reference: jméno + město (CMS musí město dodat – pole c / city), dlouhý text se rozbalí na místě
function refs() {
  const all = OFFICES[office].refs, list = all.slice(0, refShown);
  $('#refs').innerHTML = list.map((r, i) => `<figure class="p-ref" data-reveal>
      <blockquote class="p-ref__q" id="ref-q-${i}"><p>„${esc(r.q)}“</p></blockquote>
      <button type="button" class="p-ref__toggle" aria-expanded="false" aria-controls="ref-q-${i}" hidden>Číst celou referenci</button>
      <figcaption><b>${esc(r.n)}</b>${r.c || r.city ? `<span>${esc(r.c || r.city)}</span>` : ''}${r.d ? `<small>${esc(r.d)}</small>` : ''}</figcaption></figure>`).join('');
  // tlačítko jen tam, kde text opravdu přetéká oříznutí
  requestAnimationFrame(() => $$('.p-ref').forEach(f => { const q = $('.p-ref__q', f); $('.p-ref__toggle', f).hidden = q.scrollHeight <= q.clientHeight + 2; }));
  setTimeout(() => $$('.p-ref').forEach(f => { const q = $('.p-ref__q', f); if (!f.classList.contains('is-open')) $('.p-ref__toggle', f).hidden = q.scrollHeight <= q.clientHeight + 2; }), 400);
  $('#refs-more').hidden = refShown >= all.length;
}
// realizace: z webu kanceláře (SOLD), jinak dokončené developerské projekty (TGH realizace nezveřejňuje)
function done(k) {
  const sold = window.SOLD?.[dataKey(k)] || [];
  const items = sold.length
    ? sold.filter(x => x.img).slice(0, 4).map(x => ({ img: x.img, t: x.place || x.loc, s: (x.rent ? 'Pronajato' : 'Prodáno'), p: params(x).slice(0, 2).join(' · ') }))
    : (window.PROJECTS?.[dataKey(k)] || []).filter(p => p.label === 'Realizováno' && p.img).slice(0, 4).map(p => ({ img: p.img, t: p.n, s: 'Dokončeno', p: 'Developerský projekt', href: href('projekt.html', '&slug=' + p.slug) }));
  $('#done').innerHTML = items.map(x => `<a class="p-done__item" href="${x.href || href('realizovano.html')}" data-reveal>
      <span class="p-done__img"><img src="${esc(x.img)}" alt="" loading="lazy"><span class="p-done__seal">${ico('check')}${x.s}</span></span>
      <span class="p-done__t">${esc(x.t)}</span><span class="p-done__p">${esc(x.p)}</span></a>`).join('');
  $('.p-done').hidden = !items.length;
}
const listings = () => window.LISTINGS?.[dataKey(office)] || [];

function liveCount() {
  const rent = $('[data-deal="pronajem"]').getAttribute('aria-pressed') === 'true';
  const type = $('#f-type').value, q = $('#f-loc').value.trim().toLowerCase();
  return listings().filter(x => !!x.rent === rent && (!type || x.type === type) && (!q || x.t.toLowerCase().includes(q) || x.loc.toLowerCase().includes(q))).length;
}
function updateCount() { $('#live-count').textContent = nab(liveCount(), true); }

window.PAGE = {
  note: 'Homepage stojí na náběru zakázek (připomínka klienta 10/2026): hero = kancelář + odhad ceny, makléři hned po úvodu, prodej, realizace, reference; nabídka až níž jako ukázka práce. Reference: CMS musí doplnit město (pole c). Developerské projekty jen odkazem.',
  render(k) {
    const o = OFFICES[k], P = PREMIUM[k], L = listings();
    document.title = `Reality a nemovitosti ${o.region} | ${o.name}`;
    $$('[data-bind="hero"]').forEach(i => { i.srcset = P.heroSet || ''; i.sizes = '100vw'; i.src = P.hero; });
    heroVideo(P);
    $$('[data-bind="final"]').forEach(i => (i.src = P.final));
    $$('[data-bind="region"]').forEach(e => (e.textContent = o.region));
    $$('[data-bind="region-short"]').forEach(e => (e.textContent = P.short));
    const brokers = (window.BROKERS?.[dataKey(k)] || o.agents).length;
    $$('[data-bind="agents-count"]').forEach(e => (e.textContent = brokers));
    $$('[data-bind="region-loc"]').forEach(e => (e.textContent = k === 'stars' ? 'Kladensko a okolí' : 'Prahu a okolí'));
    $$('[data-bind="total"]').forEach(e => (e.textContent = o.total));
    $$('[data-all]').forEach(a => (a.href = href('vypis.html')));

    const sold = (window.SOLD?.[dataKey(k)] || []).length;
    // [hodnota, popisek, přípona, bez formátování tisíců]
    const stats = [[o.total, 'nemovitostí v nabídce'], [100, 'realitních serverů pro inzerci'], [2006, 'rok založení značky NEXT', '', true]];
    if (sold) stats.push([sold, 'realizovaných prodejů na mapě']); else if (o.satisfied) stats.push([parseInt(o.satisfied), 'spokojených klientů', ' %']);
    $('#stats').innerHTML = stats.map(([n, l, suf = '', plain]) => `<div data-reveal><dt><span${plain ? '' : ` data-count="${n}"`}>${plain ? n : num(n)}</span>${suf}</dt><dd>${l}</dd></div>`).join('');

    $('#cards').innerHTML = o.listings.slice(0, 4).map(x => card(x)).join('');

    // portrétní páry (neutrální → úsměv při najetí). Upraveno v Magnificu (Nano Banana Pro), viz README.
    $('#agents').innerHTML = o.agents.map(a => {
      const pair = SMILES[a.n];
      return `<article class="p-agent${pair ? ' has-smile' : ''}" data-reveal>
        <div class="p-agent__photo">${pair
          ? `<img src="assets/agents/${pair}-a.jpg" alt="" loading="lazy" width="640" height="960"><img class="p-agent__smile" src="assets/agents/${pair}-b.jpg" alt="" loading="lazy" width="640" height="960">`
          : `<img src="${esc(a.img)}" alt="" loading="lazy">`}</div>
        <h3><a href="${href('makleri.html')}">${esc(a.n)}</a></h3>${/certifik|ředitel|majitel|senior|vedouc/i.test(a.r) ? `<p>${esc(a.r.split(' · ')[0])}</p>` : ''}
        <a class="p-agent__tel" href="tel:${a.tel.replace(/\s/g, '')}">${esc(a.tel)}</a>${a.mail ? `<a class="p-agent__mail" href="mailto:${esc(a.mail)}">${esc(a.mail)}</a>` : ''}</article>`;
    }).join('');
    smileOnTouch();
    // ukázka rádce: skutečné nabídky odpovídající ilustrovanému dotazu (2+kk, Praha, do 8 mil.)
    if ($('#rad-demo-cards') && window.RADCE) {
      const c = { deal: 'prodej', type: 'byt', disp: '2+kk', loc: 'Praha', pmax: 8e6 };
      const hit = L.filter(x => RADCE.match(x, c));
      $('#rad-demo-cards').innerHTML = (hit.length ? hit : L.filter(x => x.type === 'byt' && !x.rent)).filter((x, i, a) => a.findIndex(y => y.price === x.price && y.place === x.place) === i).slice(0, 2).map(RADCE.card).join('');
    }

    $('#ratings').innerHTML = o.ratings.map(r => `<div class="p-rating">${RATING_LOGO[r.src] ? `<img src="${RATING_LOGO[r.src]}" alt="" width="28" height="28">` : ico('star')}<b>${String(r.v).replace('.', ',')}</b><span>${esc(r.src)}</span></div>`).join('');
    refShown = REF_STEP; refs();
    done(k);
    updateCount();
    document.dispatchEvent(new Event('rendered'));
  },
  checks() {
    const h = $('.p-hero').getBoundingClientRect();
    return check('Hero = celá obrazovka', null, Math.round(h.height) + ' px') + check('Funkční H1 strop', null, 'editoriál uvolněn (dohoda)');
  },
  init() {
    $('[data-video-toggle]').addEventListener('click', e => {
      const v = $('[data-bind="hero-video"]'), b = e.currentTarget, paused = !v.paused;
      paused ? v.pause() : v.play();
      b.classList.toggle('is-paused', paused);
      b.setAttribute('aria-label', paused ? 'Přehrát video' : 'Pozastavit video');
    });
    $$('[data-deal]').forEach(b => b.addEventListener('click', () => { $$('[data-deal]').forEach(x => x.setAttribute('aria-pressed', x === b)); updateCount(); }));
    $('#f-type').addEventListener('change', updateCount);
    $('#search').addEventListener('submit', e => {
      e.preventDefault();
      const p = new URLSearchParams();
      if ($('[data-deal="pronajem"]').getAttribute('aria-pressed') === 'true') p.set('deal', 'pronajem');
      if ($('#f-type').value) p.set('type', $('#f-type').value);
      if ($('#f-loc').value.trim()) p.set('loc', $('#f-loc').value.trim());
      location.href = href('vypis.html', p.toString() ? '&' + p : '');
    });
    // našeptávač nad reálnými daty – obce a čtvrti s počty
    const loc = $('#f-loc'), sug = $('#suggest'), list = $('#suggest-list');
    const open = () => {
      const q = loc.value.trim().toLowerCase(), m = new Map();
      for (const x of listings()) { const last = (x.place.split(', ').at(-1) || ''); [last.split('-')[0], last].forEach(n => n && m.set(n, (m.get(n) || 0) + 1)); }
      const hits = [...m].filter(([n]) => !q || n.toLowerCase().includes(q)).sort((a, b) => b[1] - a[1]).slice(0, 6);
      list.innerHTML = hits.map(([n, c]) => `<li role="option" data-v="${esc(n)}">${ico('pin')}<span>${esc(n)}</span><small>${c}</small></li>`).join('') || '<li aria-disabled="true">Žádná lokalita v nabídce</li>';
      sug.classList.add('is-open'); loc.setAttribute('aria-expanded', 'true');
    };
    loc.addEventListener('input', () => { open(); updateCount(); });
    loc.addEventListener('focus', open);
    list.addEventListener('mousedown', e => { const li = e.target.closest('li[data-v]'); if (li) { loc.value = li.dataset.v; updateCount(); } });
    loc.addEventListener('blur', () => setTimeout(() => { sug.classList.remove('is-open'); loc.setAttribute('aria-expanded', 'false'); }, 120));
    $('#estimate').addEventListener('submit', e => { e.preventDefault(); location.href = href('prodat.html') + '#odhad'; });
    $('#refs').addEventListener('click', e => { const b = e.target.closest('.p-ref__toggle'); if (!b) return; const f = b.closest('.p-ref'), on = !f.classList.contains('is-open'); f.classList.toggle('is-open', on); b.setAttribute('aria-expanded', on); b.textContent = on ? 'Skrýt' : 'Číst celou referenci'; });
    $('#refs-more').addEventListener('click', () => { refShown += REF_STEP; refs(); });
  },
};
