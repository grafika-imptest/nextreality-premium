// Detail nemovitosti – galerie (video první), parametry, PENB, mapa, kalkulačka, lepící lišta.
const D = window.DETAIL;
const PENB = [['A', '#1b7f3b', 'Mimořádně úsporná'], ['B', '#4a9b2f', 'Velmi úsporná'], ['C', '#9bc23c', 'Úsporná'], ['D', '#f2d43d', 'Méně úsporná'], ['E', '#f0a830', 'Nehospodárná'], ['F', '#e2702a', 'Velmi nehospodárná'], ['G', '#c62828', 'Mimořádně nehospodárná']];
const items = [{ video: D.video, img: D.gallery[0] }, ...D.gallery.map(img => ({ img }))];
let lbIndex = 0, dmap;

function gallery() {
  const g = $('#gallery');
  g.innerHTML = [0, 2, 3, 4, 5].map(i => [items[i], i]).map(([it, i]) => `<button class="gallery__item${it.video ? ' gallery__item--video' : ''}" data-lb="${i}" aria-label="${it.video ? 'Přehrát videoprohlídku' : 'Fotografie ' + i + ' z ' + D.gallery.length}">
      <img src="${esc(it.img)}" alt="" ${i ? 'loading="lazy"' : 'fetchpriority="high"'}>
      ${it.video ? `<span class="gallery__play">${ico('play')}Videoprohlídka</span>` : ''}</button>`).join('')
    + `<button class="btn btn--secondary gallery__all" data-lb="1">${ico('image')} Všech ${D.gallery.length} fotografií</button>`;
}

function lightbox(i) {
  lbIndex = (i + items.length) % items.length;
  const it = items[lbIndex];
  $('#lightbox').hidden = false; document.body.style.overflow = 'hidden';
  $('#lb-count').textContent = it.video ? 'Videoprohlídka' : `Fotografie ${lbIndex} / ${D.gallery.length}`;
  const vid = (D.video.match(/vimeo\.com\/(\d+)/) || [])[1];
  $('#lb-media').innerHTML = it.video
    ? (consent.get() === 'yes' ? `<iframe src="https://player.vimeo.com/video/${vid}?autoplay=1" allow="autoplay; fullscreen" allowfullscreen title="Videoprohlídka"></iframe>` : blocked('video', 360))
    : `<img src="${esc(it.img)}" alt="Fotografie ${lbIndex} z ${D.gallery.length}">`;
  const th = $('#lb-thumbs');
  if (!th.children.length) th.innerHTML = items.map((x, k) => `<button data-lbt="${k}" aria-label="${x.video ? 'Video' : 'Fotografie ' + k}"><img src="${esc(x.img)}" alt="" loading="lazy">${x.video ? ico('play', 'icon icon--lg') : ''}</button>`).join('');
  $$('#lb-thumbs button').forEach((b, k) => b.toggleAttribute('aria-current', k === lbIndex));
  th.children[lbIndex].scrollIntoView({ block: 'nearest', inline: 'center' });
  $('#lb-close').focus();
}
const closeLb = () => { $('#lightbox').hidden = true; $('#lb-media').innerHTML = ''; document.body.style.overflow = ''; };

function drawMap() {
  const el = $('#d-map');
  if (consent.get() !== 'yes' || !window.L) { el.innerHTML = blocked('map', 360); dmap = null; return; }
  if (dmap) return;
  el.innerHTML = '';
  dmap = L.map(el, { scrollWheelZoom: false }).setView([D.lat, D.lng], 14);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 18, attribution: '© OpenStreetMap' }).addTo(dmap);
  L.marker([D.lat, D.lng], { icon: L.divIcon({ className: 'mpin', html: `<span>${kc(D.price)}</span>`, iconSize: null }) }).addTo(dmap);
}

// čísla z polí: „27 000“, „4,5“ → číslo; prázdné / nesmysl → NaN
const val = id => parseFloat(String($(id).value).replace(/[\s ]/g, '').replace(',', '.'));
const clamp = (x, a, b) => Math.min(b, Math.max(a, x));
// anuitní splátka: úvěr, roční sazba v %, doba v letech
function annuity(loan, ratePct, years) {
  const r = (ratePct || 0) / 100 / 12, n = Math.round((years || 0) * 12);
  if (!(loan > 0) || !(n > 0)) return 0;
  return r ? loan * r / (1 - Math.pow(1 + r, -n)) : loan / n;
}
function calc() {
  const own = clamp(val('#c-own') || 0, 0, 100) / 100;
  const m = annuity(D.price * (1 - own), val('#c-rate'), val('#c-years'));
  $('#c-out').textContent = m > 0 && isFinite(m) ? kc(Math.round(m / 10) * 10) : '–';
}

// --- Investiční výpočet (orientační) ---
const pct = x => (x * 100).toLocaleString('cs-CZ', { minimumFractionDigits: 1, maximumFractionDigits: 1 }) + ' %';
const signedKc = x => (x < 0 ? '−' : x > 0 ? '+' : '') + kc(Math.abs(x));
const yearsCz = y => `${num(y)} ${y === 1 ? 'rok' : y >= 2 && y <= 4 ? 'roky' : 'let'}`;
const RENT_YIELD_EST = 0.03; // předvyplněný nájem = 3 % ceny ročně (jen výchozí odhad, ne údaj z nabídky)
function invest() {
  const price = D.price;
  const rent = Math.max(0, val('#i-rent') || 0);
  const cost = Math.max(0, val('#i-cost') || 0);
  const vac = clamp(val('#i-vac') || 0, 0, 12);
  const own = clamp(val('#i-own') || 0, 0, 100) / 100;
  const loan = price * (1 - own);
  const pay = annuity(loan, val('#i-rate'), val('#i-years'));
  const grossYear = rent * 12;                    // hrubý roční nájem
  const netYear = rent * (12 - vac) - cost * 12;  // čistý roční příjem před financováním
  const cf = netYear / 12 - pay;                  // měsíční cashflow po splátce
  const r = { grossYield: grossYear / price, netYield: netYear / price, cf, pay, loan, payback: netYear > 0 ? price / netYear : null };
  $('#i-gross').textContent = rent ? pct(r.grossYield) : '–';
  $('#i-net').textContent = rent ? pct(r.netYield) : '–';
  $('#i-cf').textContent = rent || pay ? signedKc(Math.round(cf / 10) * 10) : '–';
  $('#i-cf').classList.toggle('is-neg', cf < 0);
  $('#i-cf-sub').textContent = pay ? `po splátce hypotéky ${kc(Math.round(pay / 10) * 10)} (úvěr ${kc(Math.round(loan))})` : 'bez hypotéky';
  $('#i-pay').textContent = r.payback ? yearsCz(Math.round(r.payback)) : '–';
  return r;
}

// --- Makléř: spárování s profilem (data/phase3.js) podle e-mailu nebo jména ---
function broker() {
  const a = D.agent, all = [...(window.BROKERS?.tgh || []), ...(window.BROKERS?.stars || [])];
  const b = all.find(x => x.mail === a.mail) || all.find(x => x.n === a.n);
  const full = b && window.BROKER_DETAIL?.slug === b.slug ? BROKER_DETAIL : null;
  const offers = full ? (window.LISTINGS?.tgh || []).filter(x => full.hrefs?.includes(x.href)).length : 0;
  return {
    ...a, slug: b?.slug, office: b?.office || '',
    img: b?.img || a.img, square: full?.portrait || b?.img || a.img, motto: full?.motto || '', offers,
    url: href('makler.html', b?.slug ? '&slug=' + b.slug : '&name=' + encodeURIComponent(a.n)),
    tel0: a.tel.replace(/\s/g, ''),
  };
}
function renderBroker() {
  const b = broker();
  const role = `${esc(b.r)}${b.office ? ` · ${esc(b.office)}` : ''}`;
  const why = 'Zakázku vede osobně. Domluví prohlídku a odpoví na dotazy k domu, vybavení, provozním nákladům i podmínkám prodeje.';
  const profile = `<a class="d-agent__profile" href="${b.url}">Profil makléře${ico('arrow')}</a>`;
  // boční panel (desktop, lepí se pod podnavigací)
  $('#d-agent').innerHTML = `<a class="d-agent__photo" href="${b.url}" tabindex="-1" aria-hidden="true"><img src="${esc(b.square)}" alt="" loading="lazy"></a>
    <div class="d-agent__id"><span class="t-label eyebrow">Nemovitost nabízí</span>
      <h2 class="d-agent__name"><a href="${b.url}">${esc(b.n)}</a></h2><p class="d-agent__role">${role}</p></div>
    <p class="d-agent__why">${why}</p>
    <div class="d-agent__actions">
      <a class="btn btn--primary btn--block" href="tel:${b.tel0}">${ico('phone')}<span>${esc(b.tel)}</span></a>
      <a class="btn btn--secondary btn--block" href="mailto:${esc(b.mail)}">${ico('mail')}<span>Napsat e-mail</span></a>
    </div>${profile}`;
  // mobil / tablet: proužek pod přehledem
  $('#d-agent-strip').innerHTML = `<a class="d-agent-strip__photo" href="${b.url}" tabindex="-1" aria-hidden="true"><img src="${esc(b.img)}" alt="" loading="lazy"></a>
    <div class="d-agent-strip__id"><span class="t-label">Nemovitost nabízí</span><b class="d-agent__name"><a href="${b.url}">${esc(b.n)}</a></b><span class="d-agent__role">${role}</span></div>
    <div class="d-agent-strip__actions"><a class="btn btn--primary" href="tel:${b.tel0}">${ico('phone')}<span>Zavolat</span></a><a class="btn btn--secondary" href="${b.url}">Profil makléře</a></div>`;
  // sekce Mám zájem: velký portrét + motto z profilu
  $('#d-broker').innerHTML = `<a class="d-broker__photo" href="${b.url}" tabindex="-1" aria-hidden="true"><img src="${esc(b.img)}" alt="" loading="lazy"></a>
    <div class="d-broker__body">
      <span class="t-label eyebrow">Váš makléř</span>
      <h3 class="d-broker__name"><a href="${b.url}">${esc(b.n)}</a></h3>
      <p class="d-agent__role">${role}</p>
      ${b.motto ? `<blockquote class="d-broker__motto">${esc(b.motto)}</blockquote>` : `<p class="d-agent__why">${why}</p>`}
      <div class="d-broker__links"><a href="tel:${b.tel0}">${ico('phone')}${esc(b.tel)}</a><a href="mailto:${esc(b.mail)}">${ico('mail')}${esc(b.mail)}</a></div>
      <div class="d-broker__foot">${profile}${b.offers ? `<span>${num(b.offers)} ${b.offers === 1 ? 'nemovitost' : b.offers <= 4 ? 'nemovitosti' : 'nemovitostí'} v nabídce</span>` : ''}</div>
    </div>`;
  $('#sb-call').href = 'tel:' + b.tel0;
  return b;
}

function setCalcTab(inv, focus) {
  $('#t-mort').setAttribute('aria-selected', !inv); $('#t-inv').setAttribute('aria-selected', inv);
  $('#t-mort').tabIndex = inv ? -1 : 0; $('#t-inv').tabIndex = inv ? 0 : -1;
  $('#calc').hidden = inv; $('#calc-inv').hidden = !inv;
  $('#h-calc').textContent = inv ? 'Investiční kalkulačka' : 'Hypoteční kalkulačka';
  if (focus) (inv ? $('#t-inv') : $('#t-mort')).focus();
}

window.PAGE = {
  note: 'Detail: reálná zakázka N119591 z TGH. Vybavení ručně z popisu, půdorys v CRM chybí → prázdný stav.',
  render() {
    const st = STATUS[D.status];
    document.title = `${D.t} | ${OFFICES[office].name}`;
    $('#crumb-cur').textContent = D.t;
    $('#d-status').innerHTML = `<span class="badge badge--${st[1]}">${st[0]}</span>`;
    $('#d-h1').textContent = D.t;
    $('#d-loc').textContent = `${D.loc} ${D.region}`;
    $('#d-key').innerHTML = `<span class="kp kp--price">${kc(D.price)}</span>` + D.key.map(([i, v, s]) => `<span class="kp">${ico(i)}${esc(v)}${s ? ` <small>${esc(s)}</small>` : ''}</span>`).join('');
    $('#d-equip').innerHTML = D.equipment.map(([i, l]) => `<li>${ico(i)}<span>${esc(l)}</span></li>`).join('');
    $('#d-params').innerHTML = D.params.map(([k, v, h]) => `<div><dt>${esc(k)}${h ? `<button type="button" class="hint" aria-label="Vysvětlivka">${ico('info')}<span class="hint__tip" role="tooltip">${esc(h)}</span></button>` : ''}</dt><dd>${esc(v)}</dd></div>`).join('');
    $('#d-desc').innerHTML = D.desc.map(p => `<p>${esc(p)}</p>`).join('');
    $('#d-plan').innerHTML = D.floorplan
      ? `<button class="gallery__item" style="border-radius:var(--r-card);aspect-ratio:4/3" data-plan><img src="${esc(D.floorplan)}" alt="Půdorys"></button>`
      : `<div class="dempty">${ico('floor')}<div><b>Půdorys k této nemovitosti zatím nemáme</b><span>Rádi vám ho na vyžádání pošleme. <a href="#zajem">Požádat makléře</a></span></div></div>`;
    const pc = PENB.findIndex(x => x[0] === D.penb.cls);
    $('#d-penb').innerHTML = `<div class="penb__scale" role="img" aria-label="Energetická třída ${D.penb.cls} – ${D.penb.label}">
        ${PENB.map(([c, col, lab], k) => `<div class="penb__row${k === pc ? ' is-active' : ''}" data-label="${lab}"><span class="penb__bar" style="width:${30 + k * 10}%;background:${col};color:${k >= 2 && k <= 4 ? '#232a31' : '#fff'}">${c}</span></div>`).join('')}
      </div>
      <div class="penb__val"><span>Třída ${D.penb.cls} · ${esc(D.penb.label)}</span><b>${D.penb.kwh} kWh/m²/rok</b><span>dle vyhlášky ${esc(D.penb.law)}</span>
        ${D.penb.pdf ? `<a class="btn btn--secondary" href="#" style="margin-top:var(--s-2)">${ico('download')} Stáhnout průkaz (PDF)</a>` : ''}</div>`;
    $('#d-map-note').textContent = `${D.loc} ${D.region}. Poloha podle údajů v inzerci.`;
    $('#d-price').innerHTML = `${kc(D.price)}<small>${esc(D.loc)} ${esc(D.region)}</small>`;
    $('#d-ref').textContent = `Evidenční číslo ${D.ref} – uveďte při komunikaci s makléřem.`;
    renderBroker();
    // investice: předvyplněný odhad nájmu (zaokrouhleno na 500 Kč) – jen pokud uživatel nic nezadal
    if (!$('#i-rent').value) $('#i-rent').value = num(Math.round(D.price * RENT_YIELD_EST / 12 / 500) * 500);
    $('#i-price').textContent = kc(D.price);
    $('#i-hint').textContent = `Nájem je předvyplněný odhad (≈ ${num(RENT_YIELD_EST * 100)} % kupní ceny ročně), ne údaj z nabídky – skutečný nájem v lokalitě ověřte u makléře. Náklady majitele: pojištění, daň z nemovitosti, údržba.`;
    $('#z-msg').value = `Dobrý den, mám zájem o nemovitost ${D.ref} (${D.t}). Prosím o kontakt a domluvu prohlídky.`;
    $('#sb-title').textContent = D.t;
    $('#sb-price').innerHTML = `${kc(D.price)}<small>${esc(D.loc)}</small>`;
    // podobné: domy v cenovém pásmu ±40 %, bez této zakázky
    const sim = (window.LISTINGS.tgh || []).filter(x => x.type === 'dum' && !x.rent && x.price && Math.abs(x.price - D.price) / D.price < 0.4 && !x.t.includes('Bžany-Lhenice')).slice(0, 4);
    $('#similar').innerHTML = sim.map(x => card(x)).join('');
    // prémiová hlavička a přehled (údaje z parametrů a popisu zakázky N119591)
    $('#dh-img').src = D.gallery[0];
    $('#dh-price').textContent = $('#sn-price').textContent = kc(D.price);
    $('#dh-all').innerHTML = `${ico('image')}${D.gallery.length} fotografií`;
    $('#d-lead').textContent = `${D.desc[0]} ${D.desc[1]}`;
    const facts = [['226', 'm² obytná plocha'], ['528', 'm² pozemek'], ['5+', 'pokojů'], [D.penb.cls, 'energetická třída'], ['2014', 'kompletní rekonstrukce']];
    $('#d-facts').innerHTML = facts.map(([v, l]) => `<div data-reveal><dt>${esc(v)}</dt><dd>${esc(l)}</dd></div>`).join('');
    gallery(); drawMap(); calc(); invest();
  },
  checks() {
    const h1 = $('#d-h1'), lines = Math.round(h1.offsetHeight / parseFloat(getComputedStyle(h1).lineHeight));
    const sb = $('#stickybar').getBoundingClientRect();
    const b = broker(), r = invest();
    return check('H1 detailu', parseFloat(getComputedStyle(h1).fontSize) <= 32, getComputedStyle(h1).fontSize + ' · ' + lines + ' ř.')
      + check('Profil makléře', !!b.slug, b.slug ? b.slug : 'nespárováno → odkaz podle jména')
      + check('Investice', isFinite(r.grossYield), `hrubý ${pct(r.grossYield)} · čistý ${pct(r.netYield)}`)
      + check('Lepící lišta', null, innerWidth < 1024 ? (sb.bottom <= innerHeight + 1 ? 'dole' : '?') : ($('#stickybar').classList.contains('is-on') ? 'zobrazena' : 'čeká na scroll'));
  },
  init() {
    document.addEventListener('click', e => {
      const t = e.target.closest('[data-lb]'); if (t) lightbox(+t.dataset.lb);
      const th = e.target.closest('[data-lbt]'); if (th) lightbox(+th.dataset.lbt);
      const tg = e.target.closest('[data-toggle]');
      if (tg) { const on = tg.getAttribute('aria-pressed') !== 'true'; tg.setAttribute('aria-pressed', on); tg.querySelector('span').textContent = on ? tg.dataset.toggle : tg.dataset.orig; }
    });
    $$('[data-toggle]').forEach(b => (b.dataset.orig = b.querySelector('span').textContent));
    $('#lb-close').addEventListener('click', closeLb);
    $('#lb-prev').addEventListener('click', () => lightbox(lbIndex - 1));
    $('#lb-next').addEventListener('click', () => lightbox(lbIndex + 1));
    addEventListener('keydown', e => {
      if ($('#lightbox').hidden) return;
      if (e.key === 'Escape') closeLb(); if (e.key === 'ArrowLeft') lightbox(lbIndex - 1); if (e.key === 'ArrowRight') lightbox(lbIndex + 1);
    });
    let x0 = null; // swipe na mobilu
    $('#lb-stage').addEventListener('touchstart', e => (x0 = e.touches[0].clientX), { passive: true });
    $('#lb-stage').addEventListener('touchend', e => { if (x0 == null) return; const dx = e.changedTouches[0].clientX - x0; if (Math.abs(dx) > 40) lightbox(lbIndex + (dx < 0 ? 1 : -1)); x0 = null; });
    $('#d-desc-btn').addEventListener('click', e => {
      const d = $('#d-desc'), open = d.classList.toggle('is-collapsed') === false;
      e.currentTarget.setAttribute('aria-expanded', open);
      e.currentTarget.innerHTML = open ? `Sbalit popis ${ico('chev-down')}` : `Zobrazit celý popis ${ico('chev-down')}`;
      e.currentTarget.querySelector('.icon').style.transform = open ? 'rotate(180deg)' : '';
    });
    $$('#calc input').forEach(i => i.addEventListener('input', calc));
    $$('#calc-inv input').forEach(i => i.addEventListener('input', invest));
    $('#t-mort').addEventListener('click', () => setCalcTab(false));
    $('#t-inv').addEventListener('click', () => setCalcTab(true));
    $('.calc-tabs').addEventListener('keydown', e => {
      const inv = $('#t-inv').getAttribute('aria-selected') === 'true';
      const next = { ArrowLeft: !inv, ArrowRight: !inv, Home: false, End: true }[e.key];
      if (next !== undefined) { e.preventDefault(); setCalcTab(next, true); }
    });
    if (location.hash === '#investice') setCalcTab(true);
    $('#d-share').addEventListener('click', () => navigator.share ? navigator.share({ title: D.t, url: location.href }).catch(() => {}) : navigator.clipboard?.writeText(location.href));
    document.addEventListener('consent', () => { dmap = null; drawMap(); if (!$('#lightbox').hidden) lightbox(lbIndex); });
    // desktop: lišta nahoře, jakmile cenový box zmizí z obrazovky
    new IntersectionObserver(([en]) => { $('#stickybar').classList.toggle('is-on', !en.isIntersecting && en.boundingClientRect.top < 0); runChecks(); }).observe($('#price-box'));
    // prémiová podnavigace – zvýrazní sekci, která je právě na obrazovce
    const links = $$('.d-subnav a[href^="#"]:not(.d-subnav__cta)');
    const spy = new IntersectionObserver(ens => ens.forEach(en => {
      if (!en.isIntersecting) return;
      const id = en.target.id || en.target.querySelector('h2')?.id;
      links.forEach(a => a.classList.toggle('is-on', a.getAttribute('href') === '#' + id));
    }), { rootMargin: '-30% 0px -60% 0px' });
    links.forEach(a => { const t = document.querySelector(a.getAttribute('href')); const sec = t?.closest('section') || t; if (sec) spy.observe(sec); });
  },
};
