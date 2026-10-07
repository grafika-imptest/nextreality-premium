// Chci prodat – kontaktní formulář (hlavní cesta), průvodce odhadem ceny (4 kroky), postup prodeje, služby, čísla, makléři, reference, FAQ.
// Všechna čísla na stránce se počítají z dat kanceláře (OFFICES, SOLD, BROKERS) – žádné neověřené superlativy.
// Pole a volby formuláře podle reálného formuláře nextrealitystars.cz/online-odhad-nemovitosti, texty podle nextreality-tgh.cz/prodej-nemovitosti.
const PROCESS = [
  ['Analýza nemovitosti a určení ceny', 'Na základě dlouholetých zkušeností a odborných znalostí stanovíme reálnou cenu nemovitosti.'],
  ['Stanovení prodejní strategie', 'Nastavíme prodejní strategii podle vašich specifických požadavků tak, abychom našli kupce rychle a s maximálním ziskem.'],
  ['Příprava prodeje', 'Postaráme se o přípravu prezentace vaší nemovitosti. Nafotíme, natočíme i popíšeme ji tak, abychom ukázali veškeré její důležité aspekty.'],
  ['Inzerce a nabídky', 'Umístíme nabídku na naše stránky, důležité realitní servery a oslovíme i poptávající z naší rozsáhlé databáze.'],
  ['Prohlídky', 'Domluvíme termíny a provedeme zájemce celou nemovitostí. Ukážeme mu ji ze všech stran a zodpovíme případné dotazy.'],
  ['Financování a rezervace', 'Umíme poradit s financováním koupě. Po rozhodnutí kupujícího podepíšeme závaznou rezervační smlouvu a kupující složí rezervační poplatek.'],
  ['Podpis smluv', 'Připravíme právně bezchybné smlouvy a podklady k prodeji. Po podpisu doručíme vše na katastrální úřad a zařídíme přepis vlastnického práva.'],
  ['Předání nemovitosti', 'Po úspěšném převodu financí zajistíme předání nemovitosti včetně přepisu energií.'],
];
const SERVICES = [['camera', 'Profesionální fotografie'], ['video', 'Videoprohlídky a 3D vizualizace'], ['floor', 'Zajištění půdorysů'], ['megaphone', 'Online i offline marketing'],
  ['people', 'Databáze poptávajících klientů'], ['calendar', 'Organizace prohlídek'], ['doc', 'Právní servis a smlouvy'], ['key', 'Předání a přepis energií']];
const TYPE_TXT = { flat: 'Byt', house: 'Dům', land: 'Pozemek' };
let step = 1;
const type = () => $('input[name="type"]:checked').value;

function showStep(n) {
  step = n;
  $$('.wizard__step').forEach(f => (f.hidden = +f.dataset.step !== n));
  $$('#wiz-progress li').forEach((li, i) => { li.classList.toggle('is-done', i + 1 < n); li.toggleAttribute('aria-current', i + 1 === n); if (i + 1 === n) li.setAttribute('aria-current', 'step'); });
  $('#wiz-back').hidden = n === 1;
  $('#wiz-next').innerHTML = n === 4 ? `Odeslat a získat odhad ${ico('arrow')}` : `Pokračovat ${ico('arrow')}`;
  // pole podle typu nemovitosti
  $$('[data-for]').forEach(el => (el.hidden = !el.dataset.for.split(' ').includes(type())));
  const first = $(`.wizard__step[data-step="${n}"] input:not([type=radio]):not([type=checkbox]), .wizard__step[data-step="${n}"] select`);
  if (n > 1 && first) first.focus({ preventScroll: true });
}

function validate(n) {
  let ok = true;
  const fs = $(`.wizard__step[data-step="${n}"]`);
  $$('[data-req], [data-req-land]', fs).forEach(inp => {
    const field = inp.closest('.field');
    if (field.hidden) return;
    if (inp.hasAttribute('data-req-land') && type() !== 'land') return;
    const v = inp.value.trim();
    let bad = !v;
    if (!bad && inp.dataset.pattern === 'tel') bad = !/^(\+?\d[\d ]{8,15})$/.test(v);
    if (!bad && inp.dataset.pattern === 'mail') bad = !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(v);
    if (!bad && inp.inputMode === 'numeric' && field.querySelector('.input-suffix')) bad = !(+v.replace(/\s/g, '') > 0);
    inp.classList.toggle('is-error', bad);
    inp.setAttribute('aria-invalid', bad);
    field.querySelector('.field__error').hidden = !bad;
    if (bad && ok) inp.focus();
    if (bad) ok = false;
  });
  if (n === 4) { const g = $('#w-gdpr').checked; $('#w-gdpr-err').hidden = g; if (!g) ok = false; }
  return ok;
}

function submit() {
  const btn = $('#wiz-next');
  btn.classList.add('is-loading');
  setTimeout(() => {
    btn.classList.remove('is-loading');
    const t = type(), adds = $$('.checks input:checked').map(i => i.value);
    const area = t === 'land' ? $('#w-estate').value + ' m² pozemek' : $('#w-usable').value + ' m²';
    const detail = [t === 'flat' ? $('#w-subtype').value : t === 'house' ? $('#w-houseType').value : $('#w-landType').value, area, $('#w-rating').value, adds.join(', ')].filter(Boolean).join(' · ');
    $$('.wizard__step').forEach(f => (f.hidden = true));
    $('#wiz-nav').hidden = true; $('#wiz-progress').hidden = true;
    const d = $('#wiz-done');
    d.hidden = false;
    d.innerHTML = `${ico('check')}<h3 class="t-h3">Děkujeme, poptávka odhadu je odeslaná</h3>
      <p>Nejpozději do 24 hodin se vám ozve makléř z kanceláře ${esc(OFFICES[office].name)} a domluví další postup.</p>
      <div class="summary"><span>${esc(TYPE_TXT[t])} · ${$('[data-sale="rent"]').getAttribute('aria-pressed') === 'true' ? 'pronájem' : 'prodej'}</span><b>${esc(detail)}</b>
        <span>${esc($('#w-street').value)}, ${esc($('#w-city').value)}</span><span>${esc($('input[name="valuation"]:checked').value)} · ${esc($('#w-mail').value)}</span></div>
      <a class="btn btn--secondary" data-href="vypis.html" href="${href('vypis.html', '&status=sold')}">Podívejte se, co jsme už prodali</a>`;
    d.setAttribute('tabindex', '-1'); d.focus();
  }, 700);
}

// --- Kontaktní formulář prodávajícího (předloha – nic se neodesílá) ---
const RX = { tel: /^(\+?\d[\d ]{8,15})$/, mail: /^[^@\s]+@[^@\s]+\.[^@\s]+$/ };
const fieldBad = inp => { const v = inp.value.trim(); return !v || (RX[inp.dataset.pattern] ? !RX[inp.dataset.pattern].test(v) : false); };
function markField(inp, bad) {
  inp.classList.toggle('is-error', bad);
  bad ? inp.setAttribute('aria-invalid', 'true') : inp.removeAttribute('aria-invalid');
  inp.closest('.field').querySelector('.field__error').hidden = !bad;
}
function contactSubmit(e) {
  e.preventDefault();
  const f = $('#sp-form');
  let first = null;
  $$('[data-req]', f).forEach(inp => { const bad = fieldBad(inp); markField(inp, bad); if (bad && !first) first = inp; });
  const g = $('#k-gdpr');
  $('#k-gdpr-err').hidden = g.checked;
  g.checked ? g.removeAttribute('aria-invalid') : g.setAttribute('aria-invalid', 'true');
  if (!g.checked && !first) first = g;
  if (first) { first.focus(); return; }
  const btn = $('#k-submit');
  btn.classList.add('is-loading'); btn.disabled = true;
  setTimeout(() => {
    btn.classList.remove('is-loading'); btn.disabled = false;
    const name = $('#k-name').value.trim().split(/\s+/)[0];
    const what = [$('#k-type').value, $('#k-loc').value.trim()].filter(Boolean).join(' · ');
    f.hidden = true;
    const d = $('#sp-done');
    d.hidden = false;
    d.innerHTML = `${ico('check')}<h3>Děkujeme${name ? ', ' + esc(name) : ''}. Poptávka je odeslaná.</h3>
      <p>Nejpozději do 24 hodin se vám ozve makléř z kanceláře ${esc(OFFICES[office].name)} na čísle <b>${esc($('#k-tel').value.trim())}</b> a domluví další postup.</p>
      ${what ? `<div class="sp-done__sum"><span>Vaše nemovitost</span><b>${esc(what)}</b></div>` : ''}
      <div class="sp-done__btns"><a class="btn btn--primary" href="#odhad">Mezitím online odhad ceny ${ico('arrow')}</a><button type="button" class="btn btn--ghost" id="sp-again">Upravit údaje</button></div>`;
    d.focus();
    $('#sp-again').addEventListener('click', () => { d.hidden = true; f.hidden = false; $('#k-name').focus(); });
  }, 700);
}

// skloňování a pomocníci
const plural = (n, one, few, many) => (n === 1 ? one : n >= 2 && n <= 4 ? few : many);
const dec = v => String(v).replace('.', ',');
const brokers = k => window.BROKERS?.[dataKey(k)] || [];
// odpovědi jen z ověřených textů webů kanceláří (žádné podmínky, které neznáme – např. provize)
const FAQ = o => [
  ['Kolik stojí odhad ceny?', 'Orientační odhad tržní ceny od makléře je zdarma a nezávazný. Pokud potřebujete právně závazný dokument pro oficiální účely, zvolte v posledním kroku odhadu znalecký posudek – zpracovává ho znalec.'],
  ['Jak rychle se ozvete?', `Nejpozději do 24 hodin od odeslání formuláře se vám ozve makléř z kanceláře ${esc(o.name)} a domluví další postup.`],
  ['Kde vaši nemovitost uvidí kupující?', 'Na našem webu, až na 100 realitních serverech a nabídku pošleme i poptávajícím z naší databáze. Připravíme k tomu profesionální fotografie, video, podle potřeby 3D vizualizaci a půdorysy.'],
  ['Co všechno za mě vyřešíte?', 'Celý prodej: nacenění, prodejní strategii, prezentaci, inzerci, prohlídky, poradenství s financováním, rezervační a kupní smlouvy, podání na katastr i předání nemovitosti včetně přepisu energií.'],
];

window.PAGE = {
  note: 'Kontaktní formulář i odhad = poptávka pro makléře, předloha nic neodesílá. Čísla se počítají z dat kanceláře (hodnocení, realizace z webu, počet makléřů); 100 serverů a rok 2006 jsou údaje značky NEXT. Cenu předloha nepočítá – žádný z webů ji dnes automaticky nepočítá.',
  render(k) {
    const o = OFFICES[k], B = brokers(k), offices = new Set(B.map(a => a.office)).size;
    const soldAll = window.SOLD?.[dataKey(k)] || [];
    const mk = plural(B.length, 'makléř', 'makléři', 'makléřů');
    document.title = `Chci prodat nemovitost – rychle a za nejlepší cenu | ${o.name}`;

    // hero – krátký pruh důkazů
    $('#sp-proof').innerHTML = [
      ...o.ratings.map(r => `<li><b>${dec(r.v)}</b><span>${esc(r.src)}</span></li>`),
      B.length && `<li><b>${num(B.length)}</b><span>${mk}${offices > 1 ? ` v ${offices} kancelářích` : ''}</span></li>`,
      '<li><b>2006</b><span>značka NEXT od roku</span></li>',
    ].filter(Boolean).join('');

    // čísla – [hodnota, popisek, upřesnění, bez formátování]
    const stats = [];
    if (soldAll.length) stats.push([soldAll.length, 'realizovaných obchodů', 'prodeje i pronájmy zveřejněné na webu kanceláře']);
    else stats.push([o.total, 'nemovitostí právě v nabídce', 'aktuální nabídka kanceláře']);
    stats.push([100, 'realitních serverů', 'až na tolika serverech může běžet inzerce vaší nemovitosti']);
    if (B.length) stats.push([B.length, mk, offices > 1 ? `v ${offices} kancelářích – vždy někdo, kdo zná vaši lokalitu` : `místní tým, který působí ${o.region}`]);
    stats.push([2006, 'rok založení značky NEXT', 'zkušenosti celé sítě kanceláří NEXT Reality', true]);
    $('#sp-stats').innerHTML = stats.map(([n, l, d, plain]) => `<div data-reveal><dt><span${plain ? '' : ` data-count="${n}"`}>${plain ? n : num(n)}</span></dt><dd><b>${l}</b><span>${d}</span></dd></div>`).join('');
    $('#why-lead').textContent = `Místo superlativů ukazujeme fakta. ${o.name} působí ${o.region}${o.satisfied ? ` a ${o.satisfied} klientů je s našimi službami spokojeno` : ''}.`;

    // makléři
    $('#sp-agents').innerHTML = o.agents.map(a => `<article class="sp-agent" data-reveal>
        <div class="sp-agent__photo"><img src="${esc(a.img)}" alt="" loading="lazy" onerror="this.remove()"></div>
        <h3><a href="${href('makleri.html')}">${esc(a.n)}</a></h3><p>${esc(a.r)}</p>
        <a class="sp-agent__tel" href="tel:${a.tel.replace(/\s/g, '')}">${ico('phone')}<span>${esc(a.tel)}</span></a></article>`).join('');
    $('#all-agents').innerHTML = `Všichni makléři${B.length ? ` (${B.length})` : ''} ${ico('arrow')}`;

    // reference
    $('#sp-ratings').innerHTML = o.ratings.map(r => `<div><b>${dec(r.v)}<small> / 5</small></b><span>${esc(r.src)}</span></div>`).join('');
    $('#sp-refs').innerHTML = o.refs.map(r => `<figure class="sp-ref" data-reveal><blockquote>„${esc(r.q)}“</blockquote><figcaption><b>${esc(r.n)}</b>${r.d ? `<span>${esc(r.d)}</span>` : ''}</figcaption></figure>`).join('');

    // realizováno
    const sold = soldAll.slice(0, 4);
    $('#sold-sec').hidden = !sold.length;
    $('#sold').innerHTML = sold.map(x => card({ ...x, st: 'sold' })).join('');

    // časté otázky
    $('#sp-faq').innerHTML = FAQ(o).map(([q, a]) => `<details><summary>${q}</summary><p>${a}</p></details>`).join('');
  },
  checks() {
    const f = Math.round($('#kontakt').getBoundingClientRect().top + scrollY);
    return check('Kontaktní formulář nad ohybem', f < innerHeight, f + ' px od shora');
  },
  init() {
    $('#process').innerHTML = PROCESS.map(([h, p], i) => `<li><span class="sp-steps__no">${String(i + 1).padStart(2, '0')}</span><h3>${h}</h3><p>${p}</p></li>`).join('');
    $('#services').innerHTML = SERVICES.map(([i, l]) => `<li>${ico(i)}<span>${l}</span></li>`).join('');
    $$('[data-sale]').forEach(b => b.addEventListener('click', () => $$('[data-sale]').forEach(x => x.setAttribute('aria-pressed', x === b))));
    $$('input[name="type"]').forEach(r => r.addEventListener('change', () => showStep(step)));
    $('#wiz-next').addEventListener('click', () => { if (!validate(step)) return; step < 4 ? showStep(step + 1) : submit(); });
    $('#wiz-back').addEventListener('click', () => showStep(step - 1));
    $('#odhad').addEventListener('keydown', e => { if (e.key === 'Enter' && e.target.matches('input:not([type=checkbox]):not([type=radio])')) { e.preventDefault(); $('#wiz-next').click(); } });
    $$('#odhad input').forEach(i => i.addEventListener('input', () => { if (i.classList.contains('is-error')) { i.classList.remove('is-error'); i.closest('.field').querySelector('.field__error').hidden = true; } }));
    $('#w-usable').addEventListener('blur', e => { const n = +e.target.value.replace(/\D/g, ''); if (n) e.target.value = num(n); });
    showStep(1);

    // kontaktní formulář: validace při odeslání, oprava chyby hned při psaní, kontrola formátu po opuštění pole
    $('#sp-form').addEventListener('submit', contactSubmit);
    $$('#sp-form [data-req]').forEach(i => {
      i.addEventListener('input', () => { if (i.classList.contains('is-error') && !fieldBad(i)) markField(i, false); });
      i.addEventListener('blur', () => { if (i.value.trim()) markField(i, fieldBad(i)); });
    });
    $('#k-gdpr').addEventListener('change', e => { if (e.target.checked) { $('#k-gdpr-err').hidden = true; e.target.removeAttribute('aria-invalid'); } });
    // odkazy #kontakt → po doscrollování fokus do prvního pole (scroll řeší prohlížeč / Lenis)
    document.addEventListener('click', e => {
      if (!e.target.closest('a[href="#kontakt"]')) return;
      setTimeout(() => { if (!$('#sp-form').hidden) $('#k-name').focus({ preventScroll: true }); }, 700);
    });
  },
};

