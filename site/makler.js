// Detail makléře = „jeho vlastní web“: hero, O mně, Čím se mohu pochlubit, nabídka, realizace, reference, kontakt.
// Sdílené mezi standardní a prémiovou verzí (liší se jen markup sekcí a makler.css).
//
// DATA – co je reálné a co ukázka (viz i panel „Předloha · kontrola“):
//  - makléř, role, kancelář, telefon, e-mail, fotka = reálná data z webu kanceláře (BROKERS)
//  - bio, motto a seznam zakázek existují jen u Zdeňka Kubáta (BROKER_DETAIL) → jeho nabídka je spárovaná reálně
//  - nabídky ve výpisu (LISTINGS / SOLD) NEnesou makléře → ostatním makléřům předloha rozdělí nabídky kanceláře
//    deterministicky (každá N-tá) a sekci viditelně označí jako ukázku
//  - reference se párují podle jména makléře v textu reference (reálné); bez shody → reference kanceláře s popiskem
//  - ocenění, roky praxe ani certifikáty (mimo text role) v datech nejsou → sloty k doplnění v CMS, nic se nevymýšlí
(function () {
  const TYPE_PL = { byt: 'byty', dum: 'domy', pozemek: 'pozemky', komercni: 'komerční prostory', ostatni: 'ostatní nemovitosti' };
  const norm = s => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
  const plural = (n, one, few, many) => (n === 1 ? one : n >= 2 && n <= 4 ? few : many);
  const clean = n => n.replace(/,.*$/, '').replace(/\b(Mgr|Ing|Bc|MBA|DiS|Ph\.?D)\.?/g, '').replace(/\bSTYLE\b/, '').trim();
  const surname = n => clean(n).split(/\s+/).pop();
  // kmen příjmení kvůli skloňování (Petráčková → Petráčkové / Petráčkovou), min. 4 znaky, jen od začátku slova
  const stemRe = n => { const s = norm(surname(n)); return new RegExp('(^|[^a-z])' + s.slice(0, Math.min(s.length, Math.max(4, s.length - 2)))); };
  const initials = n => clean(n).split(/\s+/).map(w => w[0]).slice(0, 2).join('').toUpperCase();
  const top = (arr, k = 3) => Object.entries(arr.reduce((m, v) => (v && (m[v] = (m[v] || 0) + 1), m), {})).sort((a, b) => b[1] - a[1]).slice(0, k).map(e => e[0]);
  const city = x => (x.loc || '').split(',').pop().trim();
  const demoTag = t => `<p class="mk-demo">${ico('info')}<span>${t}</span></p>`;
  const cms = (field, hint) => `<div class="mk-cms"><b>[Doplní makléř v CMS]</b><span>${field}${hint ? ` – ${hint}` : ''}</span></div>`;
  const OFFER_MAX = 8, SOLD_MAX = 4;
  let S = null; // aktuální stav stránky (kvůli rozbalení a kontrolám)

  function resolve(k) {
    const list = BROKERS[dataKey(k)] || [];
    const slug = qs.get('slug'), name = qs.get('name');
    let b = (slug && list.find(x => x.slug === slug)) || (name && list.find(x => x.n === name));
    const fallback = !b;
    // bez parametru (nebo makléř z jiné kanceláře) → makléř s vyplněným profilem, jinak první v seznamu kanceláře
    if (!b) b = list.find(x => x.slug && x.slug === window.BROKER_DETAIL?.slug) || list[0];
    return { list, b, fallback };
  }

  function collect(k) {
    const { list, b, fallback } = resolve(k);
    const dk = dataKey(k);
    const D = window.BROKER_DETAIL && b.slug === BROKER_DETAIL.slug ? BROKER_DETAIL : null;
    const act = LISTINGS[dk] || [], sold = (window.SOLD && SOLD[dk]) || [];
    let mine, mineSold, src, inactive = 0;
    if (D) {
      mine = act.filter(x => D.hrefs.includes(x.href));
      mineSold = sold.filter(x => D.hrefs.includes(x.href));
      inactive = D.hrefs.length - mine.length - mineSold.length;
      src = 'crm';
    } else {
      // ukázka: nabídky kanceláře rozdělené mezi makléře (každá N-tá), bez zakázek makléře s reálným profilem
      const det = window.BROKER_DETAIL?.hrefs || [];
      const others = list.filter(x => !(x.slug && x.slug === window.BROKER_DETAIL?.slug));
      const i = Math.max(0, others.indexOf(b)), n = Math.max(1, others.length);
      mine = act.filter(x => !det.includes(x.href)).filter((_, j) => j % n === i);
      mineSold = sold.filter((_, j) => j % n === i);
      src = 'demo';
    }
    // reference: nejdřív ty, které makléře jmenují; bez shody reference kanceláře, které nejmenují nikoho jiného
    const refs = OFFICES[k].refs || [];
    const named = r => list.filter(x => stemRe(x.n).test(norm(r.q)));
    const own = refs.filter(r => named(r).includes(b));
    const officeRefs = refs.filter(r => !named(r).length);
    return { k, dk, list, b, D, fallback, mine, mineSold, src, inactive, own, officeRefs, o: OFFICES[k] };
  }

  // --- části stránky ---
  function hero(s) {
    const { b, D, mine, mineSold, src, own, o } = s;
    document.title = `${b.n}${b.r ? ' – ' + b.r : ''} | ${b.office}`;
    $('#mk-crumb').textContent = clean(b.n);
    $('#mk-office').textContent = b.office;
    $('#mk-name').textContent = b.n;
    $('#mk-role').textContent = b.r ? (b.r[0].toUpperCase() + b.r.slice(1)).replace(/\s+[|I]\s+/g, ' · ') : 'Realitní makléř';
    const img = b.img || D?.portrait;
    $('#mk-photo').innerHTML = img ? `<img src="${esc(img)}" alt="${esc(b.n)}" fetchpriority="high">` : ico('user', 'icon icon--lg');
    $('#mk-photo').classList.toggle('is-empty', !img);
    // úvodní věta: fakta z jeho nabídky (typy, lokality); motto je v sekci O mně, aby se neopakovalo
    const cities = top(mine.map(city)), types = top(mine.map(x => x.type), 2).map(t => TYPE_PL[t]);
    $('#mk-lead').innerHTML = cities.length ? `Nabízím ${esc(types.join(' a '))} – nejčastěji ${esc(cities.join(', '))}.`
      : 'Pomohu vám s prodejem, koupí i pronájmem nemovitosti.';
    const tel = b.tel ? b.tel.replace(/\s/g, '') : null;
    $('#mk-cta').innerHTML = `${tel ? `<a class="btn btn--primary" href="tel:${tel}">${ico('phone')}<span>${esc(b.tel)}</span></a>` : ''}
      ${b.mail ? `<a class="btn btn--secondary" href="mailto:${esc(b.mail)}">${ico('mail')}<span>Napsat e-mail</span></a>` : ''}
      <a class="btn btn--secondary" href="#kontakt" data-topic="Osobní schůzka">${ico('calendar')}<span>Domluvit schůzku</span></a>`;
    const r0 = o.ratings?.[0];
    const nums = [
      [mine.length, plural(mine.length, 'nemovitost v nabídce', 'nemovitosti v nabídce', 'nemovitostí v nabídce')],
      mineSold.length ? [mineSold.length, plural(mineSold.length, 'realizovaný obchod', 'realizované obchody', 'realizovaných obchodů')]
        : D ? [D.hrefs.length, 'zakázek na profilu'] : null,
      own.length ? [own.length, plural(own.length, 'reference klienta', 'reference klientů', 'referencí klientů')]
        : r0 ? [String(r0.v).replace('.', ','), `hodnocení kanceláře · ${r0.src}`, true] : null,
    ].filter(Boolean);
    $('#mk-nums').innerHTML = nums.map(([v, l, raw]) => `<div><dt${raw ? '' : ` data-count="${v}"`}>${raw ? (r0 ? `${ico('star')}` : '') + esc(v) : num(v)}</dt><dd>${esc(l)}</dd></div>`).join('');
    $('#mk-nums-demo').innerHTML = src === 'demo' ? demoTag('Počty jsou z ukázkového rozdělení nabídek – CRM zatím nepáruje nabídku s makléřem.') : '';
  }

  function about(s) {
    const { b, D } = s;
    $('#mk-motto').innerHTML = D?.motto ? `${ico('quote')}<span>${esc(D.motto)}</span>` : cms('Motto', 'jedna věta, kterou se makléř představí');
    $('#mk-bio').innerHTML = D?.bio?.length ? D.bio.map((p, i) => `<p${i ? '' : ' class="mk-bio__lead"'}>${esc(p)}</p>`).join('')
      : cms('Text „O mně“', `2–4 odstavce: kdo je ${esc(clean(b.n))}, jak pracuje, v čem je silný`)
        + `<p class="mk-muted">Než makléř profil vyplní, stránka ukáže kontakty a jeho aktuální nabídku – nikdy prázdné místo.</p>`;
  }

  function highlights(s) {
    const { b, D, mine, mineSold, src, inactive } = s;
    const t = [];
    const role = b.r || '';
    if (/certifik/i.test(role)) t.push({ ico: 'shield', v: 'Certifikace', l: role.split(/\s+[|I]\s+/).find(x => /certifik/i.test(x)).trim(), s: 'z profilu na webu kanceláře' });
    const pos = role.split(/\s+[|I]\s+/).find(x => /ředitel|majitel/i.test(x));
    if (pos) t.push({ ico: 'key', v: 'Pozice', l: pos.trim() + ' · ' + b.office, s: 'z profilu na webu kanceláře' });
    t.push({ n: mine.length, l: plural(mine.length, 'nemovitost, kterou právě nabízím', 'nemovitosti, které právě nabízím', 'nemovitostí, které právě nabízím'), s: src === 'crm' ? 'spárováno s výpisem' : 'ukázka' });
    if (mineSold.length) t.push({ n: mineSold.length, l: plural(mineSold.length, 'úspěšně uzavřený obchod', 'úspěšně uzavřené obchody', 'úspěšně uzavřených obchodů'), s: src === 'crm' ? 'z CRM' : 'ukázka' });
    else if (D) t.push({ n: D.hrefs.length, l: `zakázek na profilu, z toho ${inactive} už mimo aktivní nabídku`, s: 'z profilu na webu kanceláře' });
    const cities = top(mine.map(city), 2);
    if (cities.length) t.push({ ico: 'pin', v: cities.join(', '), l: 'lokality, kde nabízím nejčastěji', s: src === 'crm' ? 'z jeho nabídky' : 'ukázka' });
    t.push({ ico: 'people', v: 'NEXT REALITY', l: `součást realitní sítě · ${b.office}`, s: 'reálná kancelář' });
    // sloty pro obsah, který v datech není – pole CMS, ne vymyšlená ocenění. Slot „Ocenění“ je vždy.
    const slots = [['Ocenění a úspěchy', 'název, rok, kdo udělil'], ['Roky praxe v realitách', 'číslo + rok nástupu do NEXT'], ['Certifikace a vzdělání', 'certifikát makléře, odbornost'], ['Specializace', 'typ nemovitostí nebo služby, na které se zaměřuji']]
      .filter(x => !(x[0].startsWith('Certifikace') && /certifik/i.test(role)));
    t.splice(5);
    while (t.length < 6 && slots.length) { const [f, h] = slots.shift(); t.push({ slot: true, f, h }); }
    $('#mk-hl').innerHTML = t.map(x => x.slot
      ? `<li class="mk-hl mk-hl--slot">${ico('star')}<b>${esc(x.f)}</b><span>[Doplní makléř v CMS] – ${esc(x.h)}</span></li>`
      : `<li class="mk-hl">${x.n != null ? `<b class="mk-hl__n" data-count="${x.n}">${num(x.n)}</b>` : `${ico(x.ico)}<b class="mk-hl__v">${esc(x.v)}</b>`}<span>${esc(x.l)}</span><small>${esc(x.s)}</small></li>`).join('');
  }

  function offer(s, all) {
    const { mine, src, b } = s;
    const list = all ? mine : mine.slice(0, OFFER_MAX);
    $('#mk-offer-n').textContent = mine.length ? `${nab(mine.length)}${src === 'demo' ? ' (ukázka)' : ''}` : '';
    $('#mk-offer-demo').innerHTML = src === 'demo' ? demoTag('Ukázka: CRM zatím neposílá, komu nabídka patří. Předloha zobrazuje část nabídky kanceláře – po napojení tu budou jen nabídky tohoto makléře.') : '';
    $('#mk-offer').innerHTML = list.length ? list.map(x => card(x)).join('')
      : `<div class="dempty mk-span">${ico('dum')}<div><b>${esc(clean(b.n))} teď nemá nemovitost v aktivní nabídce</b><span>Nové nabídky se tu objeví automaticky. Chcete prodat? Napište mi.</span></div></div>`;
    $('#mk-offer-more').hidden = all || mine.length <= OFFER_MAX;
    $('#mk-offer-more').textContent = `Zobrazit všech ${num(mine.length)}`;
  }

  function soldSec(s, all) {
    const { mineSold, src, inactive, D } = s;
    const list = (all ? mineSold : mineSold.slice(0, SOLD_MAX)).map(x => ({ ...x, st: 'sold' }));
    $('#mk-sold-n').textContent = mineSold.length ? `${num(mineSold.length)} ${plural(mineSold.length, 'realizace', 'realizace', 'realizací')}${src === 'demo' ? ' (ukázka)' : ''}` : '';
    $('#mk-sold-demo').innerHTML = src === 'demo' && mineSold.length ? demoTag('Ukázka: realizované zakázky kanceláře rozdělené mezi makléře. CRM musí u prodané zakázky posílat makléře.') : '';
    // pronájem se neprodává → štítek „Pronajato“ místo „Prodáno“ + „Pronájem“
    const soldCard = x => (x.rent ? card(x).replace('>Prodáno<', '>Pronajato<').replace('<span class="badge badge--rent">Pronájem</span>', '') : card(x));
    $('#mk-sold').innerHTML = list.length ? list.map(soldCard).join('')
      : `<div class="dempty mk-span">${ico('key')}<div><b>Realizované zakázky zatím nejsou k dispozici</b><span>${D && inactive
        ? `Na profilu je dalších ${inactive} zakázek, které už nejsou v aktivní nabídce. CRM neposílá, zda jde o prodej, nebo stažení – po napojení se prodané zobrazí tady.`
        : 'Kancelář zatím na webu realizace nezveřejňuje. Po napojení CRM se tu zobrazí prodané a pronajaté nemovitosti makléře.'}</span></div></div>`;
    $('#mk-sold-more').hidden = all || mineSold.length <= SOLD_MAX;
    $('#mk-sold-more').textContent = `Zobrazit všech ${num(mineSold.length)}`;
  }

  function references(s) {
    const { own, officeRefs, o, b } = s;
    const refs = own.length ? own : officeRefs;
    const ref = r => `<figure class="ref mk-ref"><blockquote>„${esc(r.q)}“</blockquote><footer><span class="ref__avatar" aria-hidden="true">${esc(initials(r.n))}</span><div><b>${esc(r.n)}</b>${r.d ? `<span>${esc(r.d)}</span>` : ''}</div></footer></figure>`;
    $('#mk-ref-src').innerHTML = own.length
      ? `${plural(own.length, 'Reference, ve které', 'Reference, ve kterých', 'Reference, ve kterých')} klienti jmenují přímo ${esc(clean(b.n))}.`
      : `${esc(clean(b.n))} zatím nemá reference se svým jménem – ukazujeme hodnocení celé kanceláře ${esc(o.name)}.`;
    $('#mk-ref-demo').innerHTML = own.length ? '' : demoTag('Reference kanceláře, ne makléře. V CMS je potřeba u reference vyplnit makléře – pak se tu zobrazí jen jeho.');
    $('#mk-ratings').innerHTML = (o.ratings || []).map(r => `<div>${ico('star')}<b>${String(r.v).replace('.', ',')}</b><span>${esc(r.src)} · kancelář</span></div>`).join('');
    $('#mk-refs').innerHTML = refs.length ? refs.map(ref).join('') : `<div class="dempty mk-span">${ico('chat')}<div><b>Zatím bez referencí</b><span>Reference se po napojení CMS zobrazí automaticky.</span></div></div>`;
  }

  function contact(s) {
    const { b } = s;
    const img = b.img || s.D?.portrait;
    $('#mk-k-card').innerHTML = `<div class="mk-k__photo">${img ? `<img src="${esc(img)}" alt="" loading="lazy">` : ico('user')}</div>
      <div><b>${esc(b.n)}</b><span>${esc(b.office)}</span></div>`;
    $('#mk-k-links').innerHTML = `${b.tel ? `<a href="tel:${b.tel.replace(/\s/g, '')}">${ico('phone')}${esc(b.tel)}</a>` : ''}${b.mail ? `<a href="mailto:${esc(b.mail)}">${ico('mail')}${esc(b.mail)}</a>` : ''}`;
    $('#k-msg').placeholder = `Zpráva pro: ${clean(b.n)}`;
    $('#mk-k-to').value = b.mail || b.n;
  }

  function schema(s) {
    const { b } = s;
    let el = $('#mk-ld');
    if (!el) { el = document.createElement('script'); el.type = 'application/ld+json'; el.id = 'mk-ld'; document.head.appendChild(el); }
    el.textContent = JSON.stringify({ '@context': 'https://schema.org', '@type': 'RealEstateAgent', name: clean(b.n), jobTitle: b.r || undefined, telephone: b.tel || undefined, email: b.mail || undefined, image: b.img || undefined, worksFor: { '@type': 'Organization', name: b.office } });
  }

  window.PAGE = {
    note: 'Detail makléře jako jeho vlastní web. Reálná data: kontakty, fotka, role a kancelář všech makléřů; bio, motto a spárovaná nabídka jen u Zdeňka Kubáta (TGH); reference se párují podle jména v textu. Nabídky ve výpisu makléře nenesou → u ostatních makléřů je nabídka a realizace ukázka (označená). Ocenění v datech nejsou → sloty pro CMS.',
    render(k) {
      S = collect(k);
      [hero, about, highlights, references, contact, schema].forEach(f => f(S));
      offer(S); soldSec(S);
      $$('.mk-subnav a[href="#realizace"]').forEach(a => a.classList.toggle('is-muted', !S.mineSold.length));
    },
    checks() {
      if (!S) return '';
      const ids = ['o-mne', 'pochlubit', 'nabidka', 'realizace', 'reference', 'kontakt'];
      const ok = ids.every(i => $('#' + i) && $('#' + i).offsetHeight > 0);
      return check('Sekce profilu', ok, ok ? '6 / 6' : 'chybí')
        + check('Nabídka makléře', null, `${S.mine.length} · ${S.src === 'crm' ? 'spárováno' : 'ukázka'}`)
        + check('Realizace', null, `${S.mineSold.length}`)
        + check('Reference', null, S.own.length ? `${S.own.length} vlastní` : `${S.officeRefs.length} kanceláře`);
    },
    init() {
      document.addEventListener('click', e => {
        const t = e.target.closest('[data-topic]');
        if (t) { const sel = $('#k-topic'); if (sel) sel.value = t.dataset.topic; }
      });
      $('#mk-offer-more').addEventListener('click', () => { offer(S, true); document.dispatchEvent(new Event('rendered')); });
      $('#mk-sold-more').addEventListener('click', () => { soldSec(S, true); document.dispatchEvent(new Event('rendered')); });
      // podnavigace – zvýraznění aktuální sekce
      const links = $$('.mk-subnav a[href^="#"]');
      const io = new IntersectionObserver(es => es.forEach(en => {
        if (en.isIntersecting) links.forEach(a => a.classList.toggle('is-on', a.getAttribute('href') === '#' + en.target.id));
      }), { rootMargin: '-40% 0px -55% 0px' });
      links.forEach(a => { const s = $(a.getAttribute('href')); if (s) io.observe(s); });
      $('#mk-form').addEventListener('submit', e => {
        e.preventDefault();
        const n = esc(clean(S.b.n));
        e.target.innerHTML = `<div class="box mk-thanks" role="status"><h3 class="t-h3">Děkuji, zpráva je odeslaná</h3><p>${n} se vám ozve nejpozději do 24 hodin.</p></div>`;
      });
    },
  };
})();
