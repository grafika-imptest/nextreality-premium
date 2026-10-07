// Detail developerského projektu – prémiová verze ve stejném jazyce jako detail nemovitosti:
// filmová hlavička, lepící podnavigace, přehled velkými čísly, galerie s lightboxem, jednotky, lokalita, makléř + poptávka.
// Data: PROJECTS (výpis z CMS) + PROJECT_DETAIL (plný text Musílkova 39) + LISTINGS (jednotky párované podle ulice).

// Doplněno z živého webu nextreality-tgh.cz/musilkova (ověřeno 7. 10. 2026): originály fotek (CMS je na webu jen
// zmenšuje), video na YouTube a termín nastěhování. Fotky v plném rozlišení: interiéry 1920 × 1280, exteriéry jen 735 × 572 / 669 × 643.
const TGH_UP = 'https://www.nextreality-tgh.cz/www/upload/';
const EXTRA = {
  musilkova: {
    hero: TGH_UP + '846b8691/20260622231040237.jpeg',
    gallery: [
      [TGH_UP + '3820a704/20251003083648205.png', 'Dům z ulice'],
      [TGH_UP + 'b3996e3a/20251003084024003.png', 'Vnitroblok se zahrádkami'],
      [TGH_UP + '846b8691/20260622231040237.jpeg', 'Ukázka standardu – obývací pokoj s kuchyní'],
      [TGH_UP + '846b8691/20260622231207877.jpeg', 'Ukázka standardu – ložnice'],
    ],
    video: 'Ru6acr849fU',
    move: '10/2026',
  },
};

let P = null, ITEMS = [], lbIndex = 0, pmap = null;
const U = { disp: '', sort: 'price', dir: 1 };
const units = () => (P?.street ? (LISTINGS.tgh || []).filter(x => x.place === P.street) : []);
const nPhotos = () => ITEMS.filter(x => !x.video).length;
const fotek = n => `${n} ${n === 1 ? 'fotografie' : n >= 2 && n <= 4 ? 'fotografie' : 'fotografií'}`;

function pick(k) {
  const all = PJ.list(k), s = qs.get('slug'), n = qs.get('name');
  let p = (s && all.find(x => x.slug === s)) || (n && all.find(x => x.n === n)) || all.find(x => x.slug === PROJECT_DETAIL.slug) || all[0];
  const full = p.slug === PROJECT_DETAIL.slug ? PROJECT_DETAIL : null, ex = EXTRA[p.slug] || {};
  p = {
    ...p,
    lead: full?.lead || null,
    d: full?.d || p.d,
    bullets: full ? full.bullets : (p.bullets || []).map(b => { const i = b.indexOf(' – '); return i > 0 ? [b.slice(0, i), b.slice(i + 3)] : ['', b]; }),
    place: full?.place || PJ.where(p) || null,
    street: full?.street || null, location: full?.location || null, standard: full?.standard || null, units: full?.units || null,
    hero: ex.hero || full?.images?.[0] || p.img,
    gallery: ex.gallery || (full ? full.images.map(s => [s, '']) : p.img ? [[p.img, '']] : []),
    video: ex.video || null, move: ex.move || null,
  };
  return p;
}

// přehled velkými čísly – z faktů typu „14 bytových jednotek“, „K nastěhování 4/2027“
function bigFacts() {
  const out = [], rest = [];
  P.facts.forEach(f => {
    let m = f.match(/^(\d+)\s+(.+)$/); if (m) return out.push([m[1], m[2]]);
    m = f.match(/^K nastěhování\s+(?:od\s+)?(.+)$/i); if (m) return out.push([m[1].replace(/^ihned$/i, 'Ihned'), 'k nastěhování']);
    rest.push(f);
  });
  if (P.move && !out.some(x => x[1] === 'k nastěhování')) out.push([P.move, 'plánované nastěhování']);
  const u = units();
  if (u.length) out.push([String(u.length), u.length === 1 ? 'jednotka v aktuální nabídce' : u.length <= 4 ? 'jednotky v aktuální nabídce' : 'jednotek v aktuální nabídce']);
  return { out: out.slice(0, 5), rest };
}

function gallery() {
  const g = $('#pg-gal');
  ITEMS = P.gallery.map(([img, cap]) => ({ img, cap }));
  if (P.video) ITEMS.push({ img: P.hero, cap: 'Video projektu', video: P.video });
  g.dataset.n = ITEMS.length;
  g.innerHTML = ITEMS.map((it, i) => `<button type="button" class="pj-gal__item${it.video ? ' pj-gal__item--video' : ''}" data-pjlb="${i}" aria-label="${it.video ? 'Přehrát video projektu' : `Fotografie ${i + 1} z ${nPhotos()}${it.cap ? ' – ' + esc(it.cap) : ''}`}">
      <img src="${esc(it.img)}" alt="" loading="${i ? 'lazy' : 'eager'}">${it.video ? `<span class="pj-gal__cap">${ico('play')}Video projektu</span>` : i === 0 && nPhotos() > 1 ? `<span class="pj-gal__cap">${ico('image')}${fotek(nPhotos())}</span>` : ''}</button>`).join('');
  $('#pg-gal-note').textContent = nPhotos() < 2
    ? 'Web kanceláře u projektu zatím uvádí jen titulní fotografii – další snímky a vizualizace se doplní z CMS.'
    : `${fotek(nPhotos())} a vizualizace z prezentace projektu${P.video ? ' a video' : ''}. Snímky ze standardu jsou ukázkové.`;
}

function lightbox(i) {
  lbIndex = (i + ITEMS.length) % ITEMS.length;
  const it = ITEMS[lbIndex], photoNo = ITEMS.slice(0, lbIndex + 1).filter(x => !x.video).length;
  $('#lightbox').hidden = false; document.body.style.overflow = 'hidden';
  $('#lb-count').textContent = it.video ? 'Video projektu' : `Fotografie ${photoNo} / ${nPhotos()}${it.cap ? ' · ' + it.cap : ''}`;
  $('#lb-media').innerHTML = it.video
    ? (consent.get() === 'yes'
      ? `<iframe class="pj-lb-video" src="https://www.youtube-nocookie.com/embed/${esc(it.video)}?autoplay=1&rel=0" allow="autoplay; fullscreen; picture-in-picture" allowfullscreen title="Video projektu ${esc(P.n)}"></iframe>`
      : `<div class="blocked" style="min-height:360px">${ico('play', 'icon icon--lg')}<p><b>Video se zobrazí po povolení cookies</b><br>Obsah poskytuje třetí strana (YouTube), která může ukládat cookies.</p><button class="btn btn--secondary" data-consent-yes>Povolit a zobrazit</button></div>`)
    : `<img src="${esc(it.img)}" alt="${esc(it.cap || 'Fotografie ' + photoNo + ' z ' + nPhotos())}">`;
  const th = $('#lb-thumbs');
  if (th.dataset.for !== P.n) { th.dataset.for = P.n; th.innerHTML = ITEMS.map((x, k) => `<button type="button" data-pjlbt="${k}" aria-label="${x.video ? 'Video' : 'Fotografie ' + (k + 1)}"><img src="${esc(x.img)}" alt="" loading="lazy">${x.video ? ico('play', 'icon icon--lg') : ''}</button>`).join(''); }
  $$('#lb-thumbs button').forEach((b, k) => b.toggleAttribute('aria-current', k === lbIndex));
  th.children[lbIndex]?.scrollIntoView({ block: 'nearest', inline: 'center' });
  $('#lb-prev').hidden = $('#lb-next').hidden = ITEMS.length < 2;
  $('#lb-close').focus();
}
function closeLb() { $('#lightbox').hidden = true; $('#lb-media').innerHTML = ''; document.body.style.overflow = ''; lightbox.from?.focus(); }

function drawUnits() {
  let r = units().filter(x => !U.disp || x.disp === U.disp);
  r = [...r].sort((a, b) => ((a[U.sort] ?? 0) - (b[U.sort] ?? 0)) * U.dir);
  $('#pr-units tbody').innerHTML = r.map(x => `<tr tabindex="0" data-go="${href('detail.html')}">
      <td>Byt ${esc(x.disp)}</td><td data-l="Plocha">${x.area} m²</td>
      <td><span class="pj-tag pj-unit-free">Volný</span></td><td class="num" data-l="">${x.price ? kc(x.price) : 'Cena na vyžádání'}</td></tr>`).join('');
  $$('#pr-units th[data-sort]').forEach(th => { if (th.dataset.sort === U.sort) th.setAttribute('aria-sort', U.dir > 0 ? 'ascending' : 'descending'); else th.removeAttribute('aria-sort'); });
}
function drawMap() {
  const el = $('#pr-map'), u = units()[0];
  if (!el) return;
  if (!u) { el.hidden = true; return; }
  el.hidden = false;
  if (consent.get() !== 'yes' || !window.L) { el.innerHTML = blocked('map', 360); pmap = null; return; }
  if (pmap) return;
  el.innerHTML = '';
  pmap = L.map(el, { scrollWheelZoom: false }).setView([u.lat, u.lng], 15);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 18, attribution: '© OpenStreetMap' }).addTo(pmap);
  L.marker([u.lat, u.lng], { icon: L.divIcon({ className: 'mpin', html: `<span>${esc(P.n)}</span>`, iconSize: null }) }).addTo(pmap);
}

// makléř projektu – CMS ani web kanceláře makléře k projektu nepřiřazuje → ilustrační: první makléř kanceláře
function broker(k) {
  const a = OFFICES[k].agents?.[0]; if (!a) return null;
  const b = (BROKERS[dataKey(k)] || []).find(x => x.mail === a.mail) || {};
  return { ...a, slug: b.slug, link: href('makler.html', b.slug ? '&slug=' + b.slug : '&name=' + encodeURIComponent(a.n)) };
}

window.PAGE = {
  note: 'Detail projektu: plný obsah má jen Musílkova 39 (text, jednotky z aktivních nabídek podle ulice, mapa, 4 fotky + video z webu kanceláře). Ostatní projekty mají z CMS jen titulní fotku, perex a fakta. Makléř projektu je ILUSTRAČNÍ – web kanceláře ho u projektů neuvádí, v CMS je potřeba pole „makléř projektu“.',
  render(k) {
    P = pick(k);
    pmap = null; $('#pr-map').innerHTML = '';
    document.title = `${P.n} – developerský projekt | ${OFFICES[k].name}`;
    $('#crumb-cur').textContent = $('#ph-h1').textContent = P.n;
    $('#ph-img').src = P.hero; $('#ph-img').alt = '';
    $('#ph-status').textContent = P.label || 'V prodeji'; $('#ph-status').classList.toggle('is-done', !!P.done);
    $('#ph-loc').hidden = !P.place; $('#ph-place').textContent = P.place || '';
    $('#ph-lead').hidden = true; // perex nese přehled pod hlavičkou (velké písmo), v hlavičce by se opakoval
    const all = units(), prices = all.map(x => x.price).filter(Boolean), disps = [...new Set(all.map(x => x.disp))].sort();
    const from = prices.length ? 'od ' + kc(Math.min(...prices)) : P.done ? 'Realizováno' : 'Cena na vyžádání';
    $('#ph-price').innerHTML = `${esc(from)}${prices.length ? `<small>${esc(disps.join(' · '))} · ${nab(all.length)}</small>` : ''}`;
    $('#sn-price').textContent = prices.length ? from : '';
    $('#pr-price').innerHTML = prices.length ? `${esc(from)}<small>do ${kc(Math.max(...prices))} · ${esc(disps.join(', '))}</small>` : esc(from);
    $('#pr-count').textContent = all.length ? `${nab(all.length)} v aktuální nabídce${P.units ? ` z ${P.units} jednotek projektu` : ''}` : 'Aktuální dostupnost jednotek vám sdělí makléř.';
    // přehled
    const lead = P.lead ? `${P.lead}.` : (P.d || '').split(/(?<=\.)\s/)[0];
    $('#pg-lead').textContent = lead; $('#pg-lead').hidden = !lead;
    const { out, rest } = bigFacts();
    $('#pg-facts').style.setProperty('--n', Math.max(out.length, 1));
    $('#pg-facts').innerHTML = out.map(([v, l]) => `<div data-reveal><dt>${esc(v)}</dt><dd>${esc(l)}</dd></div>`).join('');
    $('#pg-facts').hidden = !out.length;
    $('#pg-tags').innerHTML = [...rest, ...P.feats.filter(f => !P.facts.join(' ').toLowerCase().includes(f.toLowerCase().split(' ')[0].slice(0, 6)))].map(t => `<li class="pj-tag">${esc(t)}</li>`).join('');
    // o projektu
    $('#pr-desc').textContent = P.d || '';
    $('#pr-benefits').innerHTML = P.bullets.map(([b, t]) => `<li>${ico('check')}<span>${b ? `<b>${esc(b)}</b> – ` : ''}${esc(t)}</span></li>`).join('');
    $('#o-projektu').hidden = !P.d && !P.bullets.length;
    // jednotky
    $('#jednotky').hidden = !all.length;
    $('#pr-disp').innerHTML = ['', ...disps].map(d => `<button type="button" class="pj-chip" data-d="${d}" aria-pressed="${U.disp === d}">${d || 'Vše'} <small>${d ? all.filter(x => x.disp === d).length : all.length}</small></button>`).join('');
    $('#pr-units-note').textContent = `Ceny a dostupnost podle aktuální nabídky kanceláře.${P.units ? ` Projekt má celkem ${P.units} jednotek, v nabídce je ${all.length}.` : ''} Rezervované a prodané jednotky výpis nevrací.`;
    // lokalita a standardy
    $('#pr-loc').textContent = P.location || (P.place ? `${P.n} – ${P.place}. Podrobný popis lokality a mapu doplní CMS.` : 'Popis lokality a mapu doplní CMS.');
    $('#standardy').hidden = !P.standard; $('#pr-std').textContent = P.standard || '';
    // makléř
    const b = broker(k), tel = b ? b.tel.replace(/\s/g, '') : '';
    $('#pb-card').innerHTML = b ? `<div class="pj-broker__photo">${b.img ? `<img src="${esc(b.img)}" alt="${esc(b.n)}" loading="lazy">` : ''}</div>
      <div><span class="t-label eyebrow">Makléř projektu</span><h3 class="pj-broker__name" style="margin-top:var(--s-3)"><a href="${b.link}">${esc(b.n)}</a></h3><p class="pj-broker__role">${esc(b.r)}</p></div>` : '';
    $('#pb-links').innerHTML = b ? `<a href="tel:${tel}">${ico('phone')}${esc(b.tel)}</a><a href="mailto:${esc(b.mail)}">${ico('mail')}${esc(b.mail)}</a><a href="${b.link}">${ico('user')}Profil makléře a jeho nabídky</a>` : '';
    $('#pa-broker').innerHTML = b ? `<a class="pj-aside-broker" href="${b.link}"><img src="${esc(b.img)}" alt=""><div><b>${esc(b.n)}</b><span>Makléř projektu</span></div></a>
      <div class="agent-links"><a href="tel:${tel}">${ico('phone')}${esc(b.tel)}</a><a href="mailto:${esc(b.mail)}">${ico('mail')}${esc(b.mail)}</a></div>` : '';
    $('#ph-call').href = 'tel:' + tel; $('#ph-call').hidden = !b;
    $('#z-msg').value = `Dobrý den, mám zájem o projekt ${P.n}. Prosím o zaslání aktuální nabídky jednotek a domluvu prezentace.`;
    // galerie a další projekty
    gallery();
    $('#ph-all').innerHTML = `${ico('image')}${nPhotos() === 1 ? 'Fotografie' : fotek(nPhotos())}`;
    $('#ph-video').hidden = !P.video;
    const more = PJ.list(k).filter(x => x.n !== P.n && !x.done).slice(0, 3);
    $('#pj-more').hidden = !more.length;
    $('#pj-more-grid').innerHTML = more.map(PJ.card).join('');
    // skryté sekce bez třídy dsec a prázdný perex bez data-words – motion.js je pak neanimuje (jinak GSAP hlásí prázdný cíl)
    $$('#jednotky, #o-projektu, #standardy').forEach(x => x.classList.toggle('dsec', !x.hidden));
    $('#pg-lead').toggleAttribute('data-words', !!lead);
    // podnavigace jen na sekce, které existují
    $$('.d-subnav a[data-sec]').forEach(a => (a.hidden = !!$(a.getAttribute('href'))?.hidden));
    drawUnits(); drawMap();
  },
  checks() {
    const h1 = $('#ph-h1');
    return check('H1 projektu', parseFloat(getComputedStyle(h1).fontSize) <= 48, getComputedStyle(h1).fontSize)
      + check('Galerie', nPhotos() > 0, nPhotos() + ' foto' + (P.video ? ' + video' : ''))
      + check('Makléř', !!$('#pb-card').children.length, $('#pb-card').children.length ? 'ilustrační' : 'chybí');
  },
  init() {
    document.addEventListener('click', e => {
      const t = e.target.closest('[data-pjlb]'); if (t) { lightbox.from = t; lightbox(+t.dataset.pjlb); }
      const th = e.target.closest('[data-pjlbt]'); if (th) lightbox(+th.dataset.pjlbt);
      const c = e.target.closest('[data-d]'); if (c) { U.disp = c.dataset.d; $$('#pr-disp .pj-chip').forEach(x => x.setAttribute('aria-pressed', x === c)); drawUnits(); }
      const s = e.target.closest('th[data-sort]'); if (s) { U.dir = U.sort === s.dataset.sort ? -U.dir : 1; U.sort = s.dataset.sort; drawUnits(); }
      const tr = e.target.closest('tr[data-go]'); if (tr) location.href = tr.dataset.go;
    });
    document.addEventListener('keydown', e => { const tr = e.target.closest?.('tr[data-go]'); if (tr && e.key === 'Enter') location.href = tr.dataset.go; });
    $('#lb-close').addEventListener('click', closeLb);
    $('#lb-prev').addEventListener('click', () => lightbox(lbIndex - 1));
    $('#lb-next').addEventListener('click', () => lightbox(lbIndex + 1));
    addEventListener('keydown', e => {
      if ($('#lightbox').hidden) return;
      if (e.key === 'Escape') closeLb(); if (e.key === 'ArrowLeft') lightbox(lbIndex - 1); if (e.key === 'ArrowRight') lightbox(lbIndex + 1);
    });
    let x0 = null;
    $('#lb-stage').addEventListener('touchstart', e => (x0 = e.touches[0].clientX), { passive: true });
    $('#lb-stage').addEventListener('touchend', e => { if (x0 == null) return; const dx = e.changedTouches[0].clientX - x0; if (Math.abs(dx) > 40) lightbox(lbIndex + (dx < 0 ? 1 : -1)); x0 = null; });
    document.addEventListener('consent', () => { pmap = null; drawMap(); if (!$('#lightbox').hidden) lightbox(lbIndex); });
    $('#pj-form').addEventListener('submit', e => {
      e.preventDefault();
      const b = broker(office);
      e.currentTarget.outerHTML = `<div class="pj-form__done" role="status"><h3>Děkujeme, poptávka je odeslaná</h3><p style="margin-top:var(--s-3)">${b ? esc(b.n) + ' se vám' : 'Ozveme se vám'} ozve nejpozději do 24 hodin.</p></div>`;
    });
    // podnavigace – zvýrazní sekci na obrazovce
    const links = $$('.d-subnav a[data-sec]');
    const spy = new IntersectionObserver(ens => ens.forEach(en => {
      if (!en.isIntersecting) return;
      links.forEach(a => a.classList.toggle('is-on', a.getAttribute('href') === '#' + en.target.id));
    }), { rootMargin: '-30% 0px -60% 0px' });
    links.forEach(a => { const t = $(a.getAttribute('href')); if (t) spy.observe(t); });
  },
};
