// Chci prodat – průvodce odhadem ceny (4 kroky, validace, souhrn), postup prodeje, služby, realizované.
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

window.PAGE = {
  note: 'Odhad = poptávka pro makléře (stejně jako dnes na Stars). Předloha nevypočítává cenu – žádný z webů ji dnes automaticky nepočítá.',
  render(k) {
    const sold = (window.SOLD?.[dataKey(k)] || []).slice(0, 4);
    $('#sold-sec').hidden = !sold.length;
    $('#sold').innerHTML = sold.map(x => card({ ...x, st: 'sold' })).join('');
  },
  init() {
    $('#process').innerHTML = PROCESS.map(([h, p]) => `<li><h3>${h}</h3><p>${p}</p></li>`).join('');
    $('#services').innerHTML = SERVICES.map(([i, l]) => `<li>${ico(i)}<span>${l}</span></li>`).join('');
    $$('[data-sale]').forEach(b => b.addEventListener('click', () => $$('[data-sale]').forEach(x => x.setAttribute('aria-pressed', x === b))));
    $$('input[name="type"]').forEach(r => r.addEventListener('change', () => showStep(step)));
    $('#wiz-next').addEventListener('click', () => { if (!validate(step)) return; step < 4 ? showStep(step + 1) : submit(); });
    $('#wiz-back').addEventListener('click', () => showStep(step - 1));
    $('#odhad').addEventListener('keydown', e => { if (e.key === 'Enter' && e.target.matches('input:not([type=checkbox]):not([type=radio])')) { e.preventDefault(); $('#wiz-next').click(); } });
    $$('#odhad input').forEach(i => i.addEventListener('input', () => { if (i.classList.contains('is-error')) { i.classList.remove('is-error'); i.closest('.field').querySelector('.field__error').hidden = true; } }));
    $('#w-usable').addEventListener('blur', e => { const n = +e.target.value.replace(/\D/g, ''); if (n) e.target.value = num(n); });
    showStep(1);
  },
};
