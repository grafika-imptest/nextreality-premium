// Prémiová homepage – stejná data jako standardní verze, jiná kompozice.
// Rozdíl oproti standardu: živý počet ve vyhledávání se počítá nad reálnými daty výpisu (ne simulace).
const PREMIUM = {
  tgh: {
    // Praha z věže při západu slunce – Magnific stock (premium licence, autor tan4ikk)
    hero: 'assets/hero-praha-2400.jpg', heroSet: 'assets/hero-praha-1280.jpg 1280w, assets/hero-praha-2400.jpg 2400w',
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
const CATS = [['byt', 'Byty'], ['dum', 'Domy'], ['pozemek', 'Pozemky'], ['komercni', 'Komerční prostory'], ['ostatni', 'Ostatní']];
let qi = 0;
const listings = () => window.LISTINGS?.[dataKey(office)] || [];

function liveCount() {
  const rent = $('[data-deal="pronajem"]').getAttribute('aria-pressed') === 'true';
  const type = $('#f-type').value, q = $('#f-loc').value.trim().toLowerCase();
  return listings().filter(x => !!x.rent === rent && (!type || x.type === type) && (!q || x.t.toLowerCase().includes(q) || x.loc.toLowerCase().includes(q))).length;
}
function updateCount() { $('#live-count').textContent = nab(liveCount(), true); }

function quote() {
  const refs = OFFICES[office].refs, r = refs[qi % refs.length];
  $('#quote').innerHTML = `<blockquote class="d-sm">„${esc(r.q)}“</blockquote><figcaption><b>${esc(r.n)}</b>${r.d ? `<span>${esc(r.d)}</span>` : ''}</figcaption>`;
  $('#q-count').textContent = `${(qi % refs.length) + 1} / ${refs.length}`;
  if (window.gsap && !matchMedia('(prefers-reduced-motion: reduce)').matches) gsap.from('#quote > *', { opacity: 0, y: 24, duration: 0.9, ease: 'expo.out', stagger: 0.08 });
}

window.PAGE = {
  note: 'Prémiová homepage: fotky z CRM mají kolísavé rozlišení (Stars 430×270) – velké formáty proto stojí na fotkách projektů a galerie, ne na kartách inzerátů.',
  render(k) {
    const o = OFFICES[k], P = PREMIUM[k], L = listings();
    document.title = `Reality a nemovitosti ${o.region} | ${o.name}`;
    $$('[data-bind="hero"]').forEach(i => { i.srcset = P.heroSet || ''; i.sizes = '100vw'; i.src = P.hero; });
    $$('[data-bind="final"]').forEach(i => (i.src = P.final));
    $$('[data-bind="region"]').forEach(e => (e.textContent = o.region));
    $$('[data-bind="region-short"]').forEach(e => (e.textContent = P.short));
    $$('[data-bind="total"]').forEach(e => (e.textContent = o.total));
    $$('[data-all]').forEach(a => (a.href = href('vypis.html')));

    const sold = (window.SOLD?.[dataKey(k)] || []).length;
    // [hodnota, popisek, přípona, bez formátování tisíců]
    const stats = [[o.total, 'nemovitostí v nabídce'], [100, 'realitních serverů pro inzerci'], [2006, 'rok založení značky NEXT', '', true]];
    if (sold) stats.push([sold, 'realizovaných prodejů na mapě']); else if (o.satisfied) stats.push([parseInt(o.satisfied), 'spokojených klientů', ' %']);
    $('#stats').innerHTML = stats.map(([n, l, suf = '', plain]) => `<div data-reveal><dt><span${plain ? '' : ` data-count="${n}"`}>${plain ? n : num(n)}</span>${suf}</dt><dd>${l}</dd></div>`).join('');

    $('#cards').innerHTML = o.listings.map(x => `<div class="p-featured__item">${card(x)}<a class="p-featured__cta" href="${href('detail.html')}" tabindex="-1">Detail nemovitosti ${ico('arrow')}</a></div>`).join('')
      + `<a class="p-featured__more" href="${href('vypis.html')}"><span class="d-sm">Celá nabídka</span><span>${nab(o.total)} ${ico('arrow', 'icon icon--lg')}</span></a>`;

    $('#cats').innerHTML = CATS.map(([t, l], i) => {
      const n = o.cats[t] ?? L.filter(x => x.type === t).length;
      const img = (L.find(x => x.type === t && x.img) || {}).img || '';
      return `<li data-img="${esc(img)}"><a href="${href('vypis.html', '&type=' + t)}"><span class="p-index__no">0${i + 1}</span><span class="p-index__name">${l}</span><span class="p-index__n">${n ? nab(n) : 'Zobrazit'}</span>${ico('arrow', 'icon icon--lg')}</a></li>`;
    }).join('');

    const projs = k === 'stars' ? o.projects : (window.PROJECTS?.tgh || o.projects).slice(0, 3);
    $('#projects').innerHTML = projs.map((p, i) => `<article class="p-proj${i % 2 ? ' is-rev' : ''}">
        <a class="p-proj__media" data-clip href="${href('projekt.html', p.slug ? '&slug=' + p.slug : '')}" tabindex="-1" aria-hidden="true"><img src="${esc(p.img)}" alt="" loading="lazy"></a>
        <div class="p-proj__body">
          <span class="p-proj__no">0${i + 1}</span>
          <h3 class="d-sm"><a href="${href('projekt.html', p.slug ? '&slug=' + p.slug : '')}">${esc(p.n)}</a></h3>
          ${p.d ? `<p>${esc(p.d)}</p>` : ''}
          ${p.facts?.length ? `<ul class="p-proj__facts">${p.facts.map(f => `<li>${esc(f)}</li>`).join('')}</ul>` : ''}
          <a class="btn btn--ghost" href="${href('projekt.html', p.slug ? '&slug=' + p.slug : '')}">Detail projektu ${ico('arrow')}</a>
        </div></article>`).join('');

    // portrétní páry (neutrální → úsměv při najetí). Upraveno v Magnificu (Nano Banana Pro), viz README.
    $('#agents').innerHTML = o.agents.map(a => {
      const pair = SMILES[a.n];
      return `<article class="p-agent${pair ? ' has-smile' : ''}" data-reveal>
        <div class="p-agent__photo">${pair
          ? `<img src="assets/agents/${pair}-a.jpg" alt="" loading="lazy" width="640" height="960"><img class="p-agent__smile" src="assets/agents/${pair}-b.jpg" alt="" loading="lazy" width="640" height="960">`
          : `<img src="${esc(a.img)}" alt="" loading="lazy">`}</div>
        <h3><a href="${href('makleri.html')}">${esc(a.n)}</a></h3><p>${esc(a.r)}</p>
        <a class="p-agent__tel" href="tel:${a.tel.replace(/\s/g, '')}">${esc(a.tel)}</a></article>`;
    }).join('');
    smileOnTouch();

    $('#ratings').innerHTML = o.ratings.map(r => `<div><b class="d-sm">${String(r.v).replace('.', ',')}</b><span>${esc(r.src)}</span></div>`).join('');
    qi = 0; quote();
    updateCount();
    document.dispatchEvent(new Event('rendered'));
  },
  checks() {
    const h = $('.p-hero').getBoundingClientRect();
    return check('Hero = celá obrazovka', null, Math.round(h.height) + ' px') + check('Funkční H1 strop', null, 'editoriál uvolněn (dohoda)');
  },
  init() {
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
    $('#q-prev').addEventListener('click', () => { const n = OFFICES[office].refs.length; qi = (qi % n + n - 1) % n; quote(); });
    $('#q-next').addEventListener('click', () => { qi++; quote(); });
  },
};
