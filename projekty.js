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
  }

  // Animace v hlavičce: výkres domu, který se staví po patrech (dekorace, aria-hidden)
  function buildSvg() {
    const W = 520, H = 360, G = 316, FL = 6, FH = 36, X = 170, BW = 190;
    let grid = '';
    for (let x = 0; x <= W; x += 26) grid += `<line x1="${x}" y1="0" x2="${x}" y2="${G}"/>`;
    for (let y = G; y >= 0; y -= 26) grid += `<line x1="0" y1="${y}" x2="${W}" y2="${y}"/>`;
    const lit = new Set(['1-2', '3-0', '4-3', '5-1']);
    let floors = '';
    for (let i = 0; i < FL; i++) {
      const y = G - (i + 1) * FH;
      let win = '';
      // přízemí: vstup uprostřed místo dvou oken
      const cols = i === 0 ? [0, 3] : [0, 1, 2, 3];
      cols.forEach(w => (win += `<rect class="bp-win${lit.has(i + '-' + w) ? ' is-lit' : ''}" x="${X + 18 + w * 42}" y="${y + 10}" width="22" height="${FH - 18}"/>`));
      const door = i === 0 ? `<path class="bp-thin" d="M${X + BW / 2 - 14} ${G}v-26h28v26M${X + BW / 2} ${G}v-26"/>` : '';
      floors += `<g class="bp-floor"><path class="bp-line" d="M${X} ${y + FH}V${y}H${X + BW}V${y + FH}"/>${win}${door}</g>`;
    }
    const top = G - FL * FH;
    return `<svg viewBox="0 0 ${W} ${H}" role="presentation" focusable="false">
      <g class="bp-grid" data-bp="grid">${grid}</g>
      <g data-bp="side"><path class="bp-thin bp-draw" d="M40 ${G}V${G - 3 * FH}H${X}"/><path class="bp-thin bp-draw" d="M40 ${G - FH}H${X}M40 ${G - 2 * FH}H${X}"/>
        <path class="bp-thin bp-draw" d="M${X + BW} ${G - 2 * FH}H${X + BW + 70}V${G}"/></g>
      <g data-bp="floors">${floors}</g>
      <path class="bp-line bp-draw" data-bp="roof" d="M${X - 8} ${top}H${X + BW + 8}M${X + 24} ${top}v-14h40v14"/>
      <g data-bp="crane"><path class="bp-line bp-draw" d="M440 ${G}V36M428 ${G}V36M428 36h12M428 ${G}l12-24M440 ${G - 24}l-12-24M428 ${G - 48}l12-24M440 ${G - 72}l-12-24M428 ${G - 96}l12-24M440 ${G - 120}l-12-24M428 ${G - 144}l12-24M440 ${G - 168}l-12-24M428 ${G - 192}l12-24M440 ${G - 216}l-12-24"/>
        <path class="bp-line bp-draw" d="M300 44H508M300 36H508M300 44l8-8M330 44l8-8M360 44l8-8M390 44l8-8M470 44l8-8M500 44l8-8M434 36V14L300 36M434 14l74 22"/>
        <rect class="bp-line" x="476" y="44" width="28" height="18"/></g>
      <g data-bp="hook"><line class="bp-thin" x1="352" y1="44" x2="352" y2="${top - 40}" data-bp="cable"/><path class="bp-accent" d="M346 ${top - 40}h12v8h-12zM352 ${top - 32}v6a5 5 0 1 1-5 5"/></g>
      <g data-bp="dim"><path class="bp-thin bp-draw" d="M${X - 34} ${G}V${top}M${X - 40} ${G}h12M${X - 40} ${top}h12"/>
        <text class="bp-label" x="${X - 44}" y="${(G + top) / 2}" text-anchor="end" transform="rotate(-90 ${X - 44} ${(G + top) / 2})" dy="0">${FL} NP</text></g>
      <path class="bp-line bp-draw" data-bp="ground" d="M0 ${G}H${W}"/>
      <path class="bp-accent bp-draw" data-bp="ground2" d="M${X} ${G + 6}H${X + BW}"/>
      <text class="bp-label" x="0" y="${G + 30}">Řez A–A · ilustrace</text>
    </svg>`;
  }
  function animateBuild() {
    if (PJ.reduce() || !window.gsap || animateBuild.done) return;
    animateBuild.done = true;
    const root = $('#pj-build svg'), q = s => root.querySelectorAll(s);
    q('.bp-draw').forEach(p => { const l = Math.ceil(p.getTotalLength()); p.style.strokeDasharray = l; p.style.strokeDashoffset = l; });
    const floors = q('.bp-floor'), top = 316 - 6 * 36;
    const tl = gsap.timeline({ defaults: { ease: 'expo.out' }, delay: 0.2 });
    tl.from(root.querySelector('[data-bp="grid"]'), { opacity: 0, duration: 1.2, ease: 'power2.out' })
      .to(root.querySelectorAll('[data-bp="ground"]'), { strokeDashoffset: 0, duration: 1.1 }, 0.1)
      .to(root.querySelectorAll('[data-bp="crane"] .bp-draw'), { strokeDashoffset: 0, duration: 1.4, stagger: 0.12 }, 0.35)
      .from(root.querySelector('[data-bp="crane"] rect'), { opacity: 0, duration: 0.6 }, 0.9)
      .from(root.querySelector('[data-bp="hook"]'), { opacity: 0, duration: 0.6 }, 1.0)
      .from(floors, { scaleY: 0, opacity: 0, transformOrigin: '50% 100%', duration: 0.9, stagger: 0.22, ease: 'power4.out' }, 1.1)
      .from(q('.bp-floor .bp-win'), { opacity: 0, duration: 0.5, stagger: 0.03, ease: 'power2.out' }, 1.4)
      .from(root.querySelector('[data-bp="cable"]'), { attr: { y2: 316 - 60 }, duration: 6 * 0.22 + 0.9, ease: 'power2.inOut' }, 1.1)
      .from(root.querySelector('[data-bp="hook"] .bp-accent'), { y: 316 - 60 - (top - 40), duration: 6 * 0.22 + 0.9, ease: 'power2.inOut' }, 1.1)
      .to(root.querySelectorAll('[data-bp="roof"], [data-bp="side"] .bp-draw, [data-bp="dim"] .bp-draw, [data-bp="ground2"]'), { strokeDashoffset: 0, duration: 1.1, stagger: 0.1 }, 2.4)
      .from(root.querySelector('[data-bp="dim"] text'), { opacity: 0, duration: 0.6 }, 2.9);
    // pojistka: když prohlížeč nespouští snímky (skrytá karta), ukáže se hotový stav
    setTimeout(() => { if (tl.progress() < 1) tl.progress(1); }, 6000);
  }

  window.PAGE = {
    note: 'Štítky filtru se odvozují z dat: stav = label z CMS, lokalita = rozpoznaná z názvu a popisu (CMS nemá pole lokality), vlastnosti = klíčová slova ve faktech a popisu. 7 projektů „Realizováno“ má v CMS shodnou trojici faktů (výchozí text šablony) – v předloze se nezobrazuje ani nefiltruje. Ilustrace stavby je dekorace.',
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
    },
    checks() {
      const tags = $$('.pj-tag, .pj-status'), bad = tags.filter(t => { const s = getComputedStyle(t); return parseFloat(s.paddingLeft) < 8 || (parseFloat(s.borderTopWidth) === 0 && s.backgroundColor === 'rgba(0, 0, 0, 0)'); });
      const vis = $$('#pj-grid .pj-card:not([hidden])').length;
      return check('Štítky s okrajem', !bad.length, bad.length ? bad.length + ' bez okraje' : tags.length + ' ok')
        + check('Filtr = karty', vis === ALL.filter(p => match(p)).length, vis + ' karet');
    },
    init() {
      $('#pj-build').innerHTML = buildSvg();
      document.addEventListener('click', e => {
        const c = e.target.closest('.pj-chip'); if (c && !c.disabled) {
          const k = c.dataset.k, v = c.dataset.v;
          if (k === 'f') F.f.has(v) ? F.f.delete(v) : F.f.add(v); else F[k] = F[k] === v && v ? '' : v;
          apply(true);
          $(`.pj-chip[data-k="${k}"][data-v="${CSS.escape(v)}"]`)?.focus();
        }
        if (e.target.closest('#pj-reset, [data-pj-reset]')) { F.st = F.loc = ''; F.f.clear(); apply(true); }
      });
      if (document.readyState === 'complete') animateBuild(); else addEventListener('load', animateBuild, { once: true });
    },
  };
}
