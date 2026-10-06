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

function calc() {
  const p = D.price, own = parseFloat($('#c-own').value.replace(',', '.')) / 100 || 0;
  const r = parseFloat($('#c-rate').value.replace(',', '.')) / 100 / 12, n = (parseFloat($('#c-years').value) || 0) * 12;
  const loan = p * (1 - own);
  const m = !n ? 0 : r ? loan * r / (1 - Math.pow(1 + r, -n)) : loan / n;
  $('#c-out').textContent = m > 0 && isFinite(m) ? kc(Math.round(m / 10) * 10) : '–';
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
    const a = D.agent;
    $('#d-call').href = $('#sb-call').href = 'tel:' + a.tel.replace(/\s/g, '');
    $('#d-call span').textContent = a.tel;
    $('#d-ref').textContent = `Evidenční číslo ${D.ref} – uveďte při komunikaci s makléřem.`;
    const am = `<img src="${esc(a.img)}" alt=""><div><b>${esc(a.n)}</b><span>${esc(a.r)}</span></div>`;
    $('#d-agent').innerHTML = $('#d-agent-2').innerHTML = am;
    $('#d-agent-links').innerHTML = `<a href="tel:${a.tel.replace(/\s/g, '')}">${ico('phone')}${esc(a.tel)}</a><a href="mailto:${esc(a.mail)}">${ico('mail')}${esc(a.mail)}</a>`;
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
    gallery(); drawMap(); calc();
  },
  checks() {
    const h1 = $('#d-h1'), lines = Math.round(h1.offsetHeight / parseFloat(getComputedStyle(h1).lineHeight));
    const sb = $('#stickybar').getBoundingClientRect();
    return check('H1 detailu', parseFloat(getComputedStyle(h1).fontSize) <= 32, getComputedStyle(h1).fontSize + ' · ' + lines + ' ř.')
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
