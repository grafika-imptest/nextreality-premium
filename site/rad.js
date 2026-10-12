// Realitní rádce NEXT – AI chat jako součást webu (jen prémiová verze).
// Inspirace: Redfin (konverzace přímo z vyhledávání, doptávání, navazující dotazy bez opakování kritérií),
// Rightmove („Use AI“ v hledací liště, shortlist z živé nabídky), Sotheby's Côte d'Azur (concierge 24/7,
// první kontakt a předání makléři).
// V PŘEDLOZE neběží jazykový model: odpovědi skládá skriptovaný parser nad REÁLNOU nabídkou kanceláře
// (data/*-listings.js). V produkci ho nahradí LLM s nástroji (hledání v nabídce, hypotéka, předání makléři)
// – rozhraní a typy odpovědí zůstávají stejné.
(function () {
  const RAD = { open: false, ctx: null, crit: {}, busy: false, started: false };
  const reduce = () => matchMedia('(prefers-reduced-motion: reduce)').matches || qs.has('nomotion');
  const norm = s => (s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  const kcs = n => num(Math.round(n)) + ' Kč';
  const mil = n => (n >= 1e6 ? (Math.round(n / 1e5) / 10).toString().replace('.', ',') + ' mil. Kč' : num(n) + ' Kč');

  // --- data nabídky (na stránkách bez výpisu se dočtou až při prvním dotazu) ---
  function data() {
    const k = dataKey(office);
    if (window.LISTINGS?.[k]) return Promise.resolve(window.LISTINGS[k]);
    return new Promise(res => {
      const s = document.createElement('script');
      s.src = `data/${k}-listings.js`;
      s.onload = () => res(window.LISTINGS?.[k] || []);
      s.onerror = () => res([]);
      document.head.appendChild(s);
    });
  }

  // --- porozumění dotazu (pravidla nad češtinou; v produkci LLM s funkcí search_listings) ---
  const TYPES = [
    ['byt', /\bbyt|garson|dvoupokoj|tripokoj|ctyrpokoj|\d\s*\+\s*(kk|1)\b/],
    ['dum', /\bdum\b|\bdom[uey]|domek|domk|rodinn|vil[auy]\b|chat[auy]?\b|chalup/],
    ['pozemek', /pozem|parcel|stavebni|zahrad[ua]\b|louk|pole\b/],
    ['komercni', /kancel|obchod|sklad|komer|restaur|vyrob|hal[auy]\b|provozov/],
    ['ostatni', /garaz|parkovaci stani/],
  ];
  const SUBS = [['kanceláře', /kancel/], ['obchodní prostory', /obchod/], ['sklady', /sklad|hal[auy]\b/], ['restaurace', /restaur/], ['výroba', /vyrob/],
    ['chata', /chat[auy]?\b/], ['chalupa', /chalup/], ['garáž', /garaz/], ['zahrady', /zahrad[uy]?\b(?!ou)/]];
  const TYPE_L = { byt: 'byt', dum: 'dům', pozemek: 'pozemek', komercni: 'komerční prostor', ostatni: 'ostatní' };
  function places(L) {
    const m = new Map();
    L.forEach(x => [x.loc?.split(', ').at(-1), ...(x.place || '').split(', ').at(-1).split('-')].forEach(p => { p = (p || '').trim(); if (p.length > 2) m.set(norm(p), p); }));
    return [...m].sort((a, b) => b[0].length - a[0].length); // delší názvy dřív (Praha-Košíře před Praha)
  }
  function parse(text, L) {
    const t = norm(text), c = {};
    if (/pronaj|najem|podnaj|na pronajem/.test(t)) c.deal = 'pronajem'; else if (/koupit|koupe|prodej\b|na prodej/.test(t)) c.deal = 'prodej';
    for (const [k, re] of TYPES) if (re.test(t)) { c.type = k; break; }
    for (const [s, re] of SUBS) if (re.test(t)) { c.sub = s; break; }
    const d = t.match(/(\d)\s*\+\s*(kk|1)/); if (d) { c.disp = d[1] + '+' + d[2]; c.type = 'byt'; }
    else if (/garson/.test(t)) { c.disp = '1+kk'; c.type = 'byt'; }
    const p = t.match(/(?:do|max(?:imalne)?|nejvys|pod|za)\s*(\d+(?:[.,]\d+)?)\s*(mil|milion|m\b|tis|k\b|000)?/);
    if (p) { let v = parseFloat(p[1].replace(',', '.')); const u = p[2] || ''; v = /mil|^m$/.test(u) ? v * 1e6 : /tis|k|000/.test(u) ? v * 1e3 : v < 1000 ? (c.deal === 'pronajem' || v < 100 ? v * (c.deal === 'pronajem' ? 1e3 : 1e6) : v) : v; c.pmax = Math.round(v); }
    const a = t.match(/(?:aspon|min(?:imalne)?|od|nad)?\s*(\d{2,4})\s*(?:m2|m²|metr)/); if (a) c.area = +a[1];
    // místa i ve skloňovaném tvaru: „v Praze“, „u Plzně“, „v Kladně“ – kmen názvu + nepravidelné tvary
    const IRREG = { praze: 'praha', prahy: 'praha', plzni: 'plzen', plzne: 'plzen', brne: 'brno', mostu: 'most' };
    const tt = t.replace(/\b(praze|prahy|plzni|plzne|brne|mostu)\b/g, w => IRREG[w]);
    const esc_ = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const hit = places(L).find(([n]) => new RegExp('\\b' + esc_(n.length >= 5 ? n.slice(0, -1) : n) + (n.length >= 5 ? '\\w{0,3}\\b' : '\\b')).test(tt)); if (hit) c.loc = hit[1];
    const feats = ['balkon', 'teras', 'garaz', 'parkov', 'sklep', 'vytah', 'zahrad', 'bazen', 'krb', 'novostavb'].filter(f => t.includes(f) && !(f === 'zahrad' && c.type === 'pozemek') && !(f === 'garaz' && c.type === 'ostatni'));
    if (feats.length) c.feats = feats;
    return c;
  }
  const intent = t => (t = norm(t),
    /hypo|splat|uver|kolik bych splac/.test(t) ? 'mortgage'
    : /jak dlouho.*prod|prodej.*trva|co (vsechno )?zaridite|co delate|jak probiha prodej/.test(t) ? 'sellfaq'
      : /prodat|prodam|kolik (je|stoji|ma hodnot).*(muj|nas)|odhad|ocen/.test(t) ? 'sell'
        : /investi|vynos|pronajmu za|vydelek/.test(t) && !/hled|chci|koupit/.test(t) ? 'invest'
          : /makler|zavolat|prohlid|schuzk|kontakt|clovek|osobne/.test(t) ? 'human'
            : /zacit znovu|reset|vymaz/.test(t) ? 'reset' : 'search');

  const match = (x, c) => (c.deal === 'pronajem' ? !!x.rent : !x.rent) && (!c.type || x.type === c.type) && (!c.sub || x.sub === c.sub)
    && (!c.disp || x.disp === c.disp) && (!c.pmax || (x.price != null && x.price <= c.pmax)) && (!c.area || (x.area || 0) >= c.area)
    && (!c.loc || norm(x.loc + ' ' + x.place).includes(norm(c.loc)));
  function listUrl(c) {
    const p = [];
    if (c.deal === 'pronajem') p.push('deal=pronajem');
    if (c.type) p.push('type=' + c.type);
    if (c.loc) p.push('loc=' + encodeURIComponent(c.loc));
    if (c.disp) p.push('disp=' + encodeURIComponent(c.disp));
    if (c.pmax) p.push('pmax=' + c.pmax);
    if (c.area) p.push('area=' + c.area);
    return href('vypis.html', p.length ? '&' + p.join('&') : '');
  }

  // --- stavební kameny odpovědí ---
  const FEAT_L = { balkon: 'balkon', teras: 'terasa', garaz: 'garáž', parkov: 'parkování', sklep: 'sklep', vytah: 'výtah', zahrad: 'zahrada', bazen: 'bazén', krb: 'krb', novostavb: 'novostavba' };
  const chipsOf = c => [
    [c.deal === 'pronajem' ? 'Pronájem' : 'Koupě', 'deal'],
    c.type && [TYPE_L[c.type] + (c.sub ? ' · ' + c.sub : ''), 'type'], c.disp && [c.disp, 'disp'], c.loc && [c.loc, 'loc'],
    c.pmax && ['do ' + mil(c.pmax), 'pmax'], c.area && ['od ' + c.area + ' m²', 'area'],
  ].filter(Boolean);
  const critHtml = c => `<div class="rad-crit" aria-label="Jak jsem dotaz pochopil"><span class="rad-crit__l">Rozumím takto</span>${chipsOf(c).map(([l, k]) => `<span class="rad-chip rad-chip--crit">${esc(l)}${k !== 'deal' ? `<button type="button" data-rad-drop="${k}" aria-label="Odebrat: ${esc(l)}">${ico('x')}</button>` : ''}</span>`).join('')}</div>`;
  const pcardHtml = x => `<a class="rad-card" href="${href('detail.html')}">
      <span class="rad-card__img">${x.img ? `<img src="${esc(x.img)}" alt="" loading="lazy">` : ''}</span>
      <span class="rad-card__b"><b>${x.price == null ? 'Cena na vyžádání' : kcs(x.price)}${x.rent ? ' / měs.' : ''}</b><span>${esc(params(x).join(' · '))}</span><em>${esc(x.place || x.loc)}</em></span></a>`;
  const suggest = arr => `<div class="rad-sugg">${arr.map(s => `<button type="button" class="rad-chip" data-rad-say="${esc(s)}">${esc(s)}</button>`).join('')}</div>`;
  function broker() {
    const o = OFFICES[office], d = RAD.ctx?.broker;
    const a = d || o.agents?.find(x => x.tel) || {};
    return { n: a.n || o.name, r: a.r || 'Realitní makléř', tel: a.tel || o.phone || '', img: a.img || '', mail: a.mail || a.email || '' };
  }
  const handoffHtml = why => {
    const b = broker();
    return `<div class="rad-hand"><span class="rad-hand__img">${b.img ? `<img src="${esc(b.img)}" alt="">` : ''}</span>
      <div class="rad-hand__b"><small>${esc(why || 'Předám vás makléři')}</small><b>${esc(b.n)}</b><span>${esc(b.r)}</span></div>
      <div class="rad-hand__a">${b.tel ? `<a class="btn btn--primary" href="tel:${b.tel.replace(/\s/g, '')}">${ico('phone')}<span>Zavolat</span></a>` : ''}<button type="button" class="btn btn--secondary" data-rad-lead>${ico('calendar')}<span>Domluvit</span></button></div></div>`;
  };
  const leadHtml = () => `<form class="rad-lead" data-rad-leadform novalidate>
      <p>Nechte kontakt – makléř se ozve do 24 hodin, v pracovní dny obvykle do 2 hodin.</p>
      <input class="input" name="n" placeholder="Jméno" autocomplete="name" required>
      <input class="input" name="t" type="tel" placeholder="Telefon" autocomplete="tel" required>
      <label class="rad-lead__ok"><input type="checkbox" required> Souhlasím se zpracováním údajů pro kontaktování.</label>
      <button class="btn btn--primary" type="submit">Odeslat makléři</button></form>`;

  // --- odpovědi ---
  async function answer(text) {
    const L = await data(); let it = intent(text);
    if (RAD.skip) it = 'search';
    if (it === 'reset') { RAD.crit = {}; return say(`Dobře, začneme znovu. Co hledáte – nebo chcete spíš prodat?`, suggest(starters())); }
    if (it === 'human') return say(`Rád vás propojím s člověkem. Makléř zná lokalitu i detaily, které v inzerátu nejsou.`, handoffHtml('Váš makléř'));
    if (it === 'sell') {
      const sold = (window.SOLD?.[dataKey(office)] || []).length;
      return say(`Prodat pomůžeme. Nejrychlejší první krok je <b>bezplatný odhad ceny</b> – zabere asi 2 minuty a makléř ho do 24 hodin upřesní podle srovnatelných prodejů${sold ? ` (jen tato kancelář jich má na webu ${num(sold)})` : ''}.`,
        `<div class="rad-actions"><a class="btn btn--primary" href="${href('prodat.html')}#odhad">Spočítat odhad ceny</a><a class="btn btn--secondary" href="${href('prodat.html')}#kontakt">Napsat makléři</a></div>`, suggest(['Jak dlouho prodej trvá?', 'Co všechno zařídíte?', 'Chci mluvit s makléřem']));
    }
    if (it === 'sellfaq') {
      return say(/jak dlouho|trva/.test(norm(text))
        ? `Délka prodeje záleží hlavně na typu nemovitosti, lokalitě a nastavení ceny – realistický odhad vám makléř řekne po prohlídce. Postup je vždy stejný: <b>odhad ceny → smlouva → příprava a inzerce až na 100 serverech → prohlídky → rezervace → kupní smlouva a předání</b>.`
        : `O všechno: ocenění podle srovnatelných prodejů, přípravu nemovitosti a inzerci až na 100 realitních serverech, prohlídky, vyjednávání a kompletní právní servis až po předání. Vy se rozhodujete, my zařizujeme.`,
        `<div class="rad-actions"><a class="btn btn--primary" href="${href('prodat.html')}#odhad">Spočítat odhad ceny</a></div>`, suggest(['Chci mluvit s makléřem', 'Kolik je můj byt?']));
    }
    if (it === 'mortgage') {
      const price = RAD.ctx?.price || RAD.crit.pmax || parseFloat((norm(text).match(/(\d+(?:[.,]\d+)?)\s*mil/) || [])[1]?.replace(',', '.')) * 1e6 || 6e6;
      const loan = price * 0.8, r = 0.045 / 12, n = 360, pay = loan * r / (1 - Math.pow(1 + r, -n));
      return say(`Orientačně pro ${RAD.ctx ? 'tuto nemovitost' : 'cenu ' + mil(price)}: při 20 % vlastních zdrojů, sazbě 4,5 % a splatnosti 30 let vychází splátka kolem <b>${kcs(pay)} měsíčně</b> (úvěr ${mil(loan)}).`,
        `<p class="rad-note">Je to orientační výpočet, ne nabídka banky. Přesnou sazbu vám spočítá hypoteční specialista, se kterým makléři spolupracují.</p>`, suggest(['A s 10 % vlastních zdrojů?', 'Chci konzultaci k hypotéce', 'Co vychází na pronájem?']));
    }
    if (it === 'invest') {
      return say(`U investičního bytu se vyplatí sledovat výnos z nájmu. V Praze se u menších bytů hrubý výnos obvykle pohybuje kolem 3–4 % ročně – jde o orientační rozpětí, ne slib. Na detailu každé nabídky najdete kalkulačku <b>Investice</b>, kde si výnos a cashflow spočítáte sami.`,
        suggest(['Ukaž 1+kk v Praze do 6 milionů', 'Byty na investici do 5 mil', 'Chci mluvit s makléřem']));
    }
    // hledání – navazující dotaz doplní předchozí kritéria (jako u Redfinu)
    const n = RAD.skip ? {} : parse(text, L); RAD.skip = false;
    // dotaz k právě otevřené nemovitosti (detail): co je v inzerátu, řekne; co není, poctivě předá makléři
    if (RAD.ctx && !n.type && !n.loc && !n.disp) {
      const t = norm(text);
      const ANS = [
        [/skol|skolk|mhd|autobus|vlak|metro|obchod|okoli|soused/, 'Polohu najdete v sekci <a href="#poloha">Poloha</a> na mapě. Konkrétní vzdálenosti ke škole a zastávkám'],
        [/provoz|naklad|energi|penb|topen|zalohy|poplat/, 'Údaje z průkazu energetické náročnosti jsou v parametrech nabídky. Skutečné měsíční náklady'],
        [/cena|sleva|vyjedn|dohod/, `Cena v inzerátu je ${kcs(RAD.ctx.price)}. Prostor pro jednání a podmínky prodeje`],
      ];
      const hit = ANS.find(([re]) => re.test(t));
      return say(`${hit ? hit[1] : `U nabídky <b>${esc(RAD.ctx.title)}</b> tohle v inzerátu uvedené není. Přesnou odpověď`} vám spolehlivě potvrdí makléř, který zakázku vede – nechci tipovat.`,
        handoffHtml('Zeptám se za vás'), suggest(['Jaká by byla hypotéka?', 'Chci prohlídku', 'Podobné domy na prodej']));
    }
    // navazující dotaz doplní předchozí kritéria; jiný typ nemovitosti ale smaže to, co k typu patřilo
    const prev = RAD.crit, c = { ...prev, ...n };
    if (n.type && n.type !== prev.type) { if (!n.disp) delete c.disp; if (!n.sub) delete c.sub; if (!n.area) delete c.area; }
    if (n.deal && n.deal !== (prev.deal || 'prodej') && !n.pmax) delete c.pmax; // rozpočet koupě ≠ nájem
    RAD.crit = c;
    const res = L.filter(x => match(x, c)), top = res.filter((x, i, a) => a.findIndex(y => y.price === x.price && y.place === x.place) === i).slice(0, 3); // stejné jednotky v jednom domě jen jednou
    const unknown = (n.feats || []).map(f => FEAT_L[f]);
    const missing = [];
    if (!c.type) missing.push('typ');
    if (!c.loc) missing.push('lokalitu');
    if (!c.pmax) missing.push('rozpočet');
    let intro;
    if (!Object.keys(n).length && !RAD.started) intro = `Zkusím to v aktuální nabídce. Napište klidně vlastními slovy, co hledáte – typ, lokalitu, rozpočet nebo to, na čem vám záleží.`;
    else if (!res.length) intro = `V aktuální nabídce teď nic přesně neodpovídá. Zkuste některé kritérium uvolnit – nebo nechte makléře, ať vás upozorní, až se něco objeví (často dřív, než to jde na web).`;
    else intro = `V aktuální nabídce ${esc(OFFICES[office].name)} jsem našel <b>${nab(res.length, true)}</b>.${res.length > 3 ? ' Tady jsou tři, které sedí nejlépe:' : ''}`;
    RAD.started = true;
    const ref = [];
    if (missing.includes('lokalitu')) { const top4 = topPlaces(L.filter(x => match(x, { ...c, loc: '' }))); ref.push(...top4.map(p => 'v lokalitě ' + p)); }
    else if (missing.includes('rozpočet') && c.deal !== 'pronajem') ref.push('do 5 milionů', 'do 8 milionů', 'do 12 milionů');
    else if (c.type === 'byt' && !c.disp) ref.push('2+kk', '3+kk');
    if (res.length && c.deal !== 'pronajem') ref.push('Jaká by byla hypotéka?');
    // nic nenalezeno → nabídnout konkrétní uvolnění s počtem výsledků (místo slepé uličky)
    const relax = !res.length ? [['pmax', 'bez limitu ceny'], ['loc', 'v jiné lokalitě'], ['disp', 'jiná dispozice'], ['sub', 'jakýkoli druh'], ['area', 'menší plocha']]
      .filter(([k]) => c[k]).map(([k, l]) => { const cc = { ...c }; delete cc[k]; return [k, l, L.filter(x => match(x, cc)).length]; }).filter(([, , m]) => m) : [];
    return say(intro, critHtml(c),
      unknown.length ? `<p class="rad-note">${esc(unknown.join(', '))} zatím z nabídky spolehlivě nevyčtu – u vybraných nemovitostí to ověří makléř.</p>` : '',
      top.length ? `<div class="rad-cards">${top.map(pcardHtml).join('')}</div><a class="rad-all" href="${listUrl(c)}">Zobrazit ${res.length > 3 ? 'všech ' + num(res.length) : 've výpisu'} ${ico('arrow')}</a>` : handoffHtml('Hlídání nabídky s makléřem'),
      relax.length ? `<div class="rad-sugg"><span class="rad-crit__l">Zkusit</span>${relax.map(([k, l, m]) => `<button type="button" class="rad-chip" data-rad-drop="${k}">${l} <small>${num(m)}</small></button>`).join('')}</div>` : '',
      ref.length ? suggest(ref.slice(0, 4)) : '');
  }
  function topPlaces(L) {
    const m = {}; L.forEach(x => { const p = (x.loc || '').split(', ').at(-1); if (p) m[p] = (m[p] || 0) + 1; });
    return Object.entries(m).sort((a, b) => b[1] - a[1]).slice(0, 4).map(([p]) => p);
  }
  function starters() {
    if (RAD.ctx) return ['Jaká by byla hypotéka?', 'Je v okolí škola a MHD?', 'Kolik stojí provoz?', 'Chci prohlídku'];
    if (document.body.dataset.page === 'prodat') return ['Kolik je můj byt v Praze?', 'Jak dlouho prodej trvá?', 'Co všechno zařídíte?'];
    const big = /Praz|Praha/.test(OFFICES[office].region || '') ? 'Praze' : (OFFICES[office].short || 'okolí');
    return [`2+kk v ${big} do 8 milionů`, 'Rodinný dům se zahradou', 'Chci prodat byt', 'Jaká by byla hypotéka?'];
  }

  // --- rozhraní ---
  const log = () => $('#rad-log');
  function bubble(html, who) {
    const el = document.createElement('div');
    el.className = 'rad-msg rad-msg--' + who;
    el.innerHTML = who === 'ai' ? `<span class="rad-msg__av" aria-hidden="true"></span><div class="rad-msg__b">${html}</div>` : `<div class="rad-msg__b">${esc(html)}</div>`;
    log().appendChild(el);
    log().scrollTo({ top: log().scrollHeight, behavior: reduce() ? 'auto' : 'smooth' });
    return el;
  }
  function say(text, ...blocks) { return { text, blocks: blocks.filter(Boolean).join('') }; }
  async function ask(text) {
    if (!text.trim() || RAD.busy) return;
    RAD.busy = true;
    bubble(text, 'me');
    const typing = bubble('<span class="rad-typing"><i></i><i></i><i></i></span>', 'ai');
    const [r] = await Promise.all([answer(text), new Promise(res => setTimeout(res, reduce() ? 0 : 650))]);
    typing.querySelector('.rad-msg__b').innerHTML = `<p>${r.text}</p>${r.blocks}`;
    typing.classList.add('is-in');
    log().scrollTo({ top: typing.offsetTop - 12, behavior: reduce() ? 'auto' : 'smooth' });
    RAD.busy = false;
  }
  function welcome() {
    const o = OFFICES[office];
    const lead = RAD.ctx
      ? `Dobrý den, jsem realitní rádce ${esc(o.name)}. Ptejte se na <b>${esc(RAD.ctx.title)}</b> – spočítám hypotéku, poradím s dalším krokem a cokoli, co v inzerátu není, ověřím u makléře.`
      : `Dobrý den, jsem realitní rádce ${esc(o.name)}. Řekněte mi vlastními slovy, co hledáte nebo co chcete prodat. Prohledám aktuální nabídku a až budete chtít, předám vás makléři.`;
    log().innerHTML = '';
    bubble(`<p>${lead}</p>${suggest(starters())}`, 'ai').classList.add('is-in');
  }
  function mount() {
    if ($('#rad')) return;
    document.body.insertAdjacentHTML('beforeend', `
      <button type="button" class="rad-fab" id="rad-fab" aria-controls="rad" aria-expanded="false"><span class="rad-fab__dot" aria-hidden="true"></span><span class="rad-fab__l">Realitní rádce</span><span class="rad-fab__ai">AI</span></button>
      <div class="rad" id="rad" role="dialog" aria-modal="false" aria-labelledby="rad-h" hidden data-lenis-prevent>
        <header class="rad__head">
          <span class="rad__av" aria-hidden="true"></span>
          <div><h2 id="rad-h">Realitní rádce <span class="rad__beta">AI · beta</span></h2><p>Zná aktuální nabídku · předá vás makléři</p></div>
          <button type="button" class="rad__x" data-rad-close aria-label="Zavřít rádce">${ico('x', 'icon icon--lg')}</button>
        </header>
        <div class="rad__modes" role="group" aria-label="S čím pomoci">${[['Hledám bydlení', 'Hledám byt nebo dům'], ['Chci prodat', 'Chci prodat nemovitost'], ['Investice', 'Zajímá mě investiční byt'], ['Hypotéka', 'Jaká by byla hypotéka?']].map(([l, s]) => `<button type="button" data-rad-say="${s}">${l}</button>`).join('')}</div>
        <div class="rad__log" id="rad-log" aria-live="polite"></div>
        <form class="rad__form" id="rad-form"><label class="sr-only" for="rad-in">Zpráva rádci</label>
          <textarea id="rad-in" rows="1" placeholder="${innerWidth < 480 ? 'Např. 2+kk v Praze do 8 mil.' : 'Např. 3+kk v Praze do 9 milionů s balkonem'}"></textarea>
          <button type="submit" class="rad__send" aria-label="Odeslat">${ico('arrow')}</button></form>
        <p class="rad__legal">AI rádce může chybovat – ceny a dostupnost vždy potvrdí makléř. <span class="rad__proto">Předloha: odpovídá skriptovaný parser nad reálnou nabídkou, ne jazykový model.</span></p>
      </div>`);
    $('#rad-fab').addEventListener('click', () => toggle(true));
    $('#rad').addEventListener('click', e => {
      if (e.target.closest('[data-rad-close]')) return toggle(false);
      const s = e.target.closest('[data-rad-say]'); if (s) return ask(s.dataset.radSay);
      const d = e.target.closest('[data-rad-drop]');
      if (d) { delete RAD.crit[d.dataset.radDrop]; if (d.dataset.radDrop === 'type') { delete RAD.crit.sub; delete RAD.crit.disp; } const lbl = (d.closest('.rad-chip--crit') ? d.parentElement.firstChild.textContent : d.firstChild.textContent).trim(); RAD.skip = true; return ask(d.closest('.rad-chip--crit') ? 'Bez: ' + lbl : 'Zkusit ' + lbl); }
      const l = e.target.closest('[data-rad-lead]'); if (l) { l.closest('.rad-msg__b').insertAdjacentHTML('beforeend', leadHtml()); l.disabled = true; log().scrollTo({ top: log().scrollHeight, behavior: 'smooth' }); }
    });
    $('#rad').addEventListener('submit', e => {
      const f = e.target.closest('[data-rad-leadform]');
      if (f) {
        e.preventDefault();
        if (!f.checkValidity()) { f.reportValidity(); return; }
        const b = broker();
        f.outerHTML = `<p class="rad-done">${ico('check')} Hotovo, ${esc(f.n.value.split(' ')[0])}. ${esc(b.n)} se vám ozve na ${esc(f.t.value)}. Shrnutí rozhovoru mu předám, ať nemusíte nic opakovat.</p>`;
        return;
      }
      if (e.target.id === 'rad-form') { e.preventDefault(); const i = $('#rad-in'); const v = i.value; i.value = ''; i.style.height = ''; ask(v); }
    });
    const inp = $('#rad-in');
    inp.addEventListener('keydown', e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); $('#rad-form').requestSubmit(); } });
    inp.addEventListener('input', () => { inp.style.height = ''; inp.style.height = Math.min(inp.scrollHeight, 120) + 'px'; });
    addEventListener('keydown', e => { if (e.key === 'Escape' && RAD.open) toggle(false); });
  }
  function toggle(on, prompt) {
    RAD.open = on;
    $('#rad').hidden = !on;
    document.body.classList.toggle('rad-open', on);
    $('#rad-fab').setAttribute('aria-expanded', on);
    if (on) {
      if (!log().children.length) welcome();
      if (prompt) ask(prompt);
      setTimeout(() => $('#rad-in').focus({ preventScroll: true }), 50);
    } else $('#rad-fab').focus({ preventScroll: true });
  }

  // veřejné API pro vstupy na stránkách (hero homepage, detail, chci prodat)
  window.RADCE = {
    open: (prompt) => toggle(true, prompt),
    card: pcardHtml, match,
    context: ctx => { RAD.ctx = ctx; if (log()?.children.length) welcome(); },
  };
  document.addEventListener('click', e => { const t = e.target.closest('[data-radce]'); if (t) { e.preventDefault(); toggle(true, t.dataset.radce || ''); } });
  document.addEventListener('rendered', () => { RAD.crit = {}; if ($('#rad-log')?.children.length) welcome(); });
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mount); else mount();
})();
