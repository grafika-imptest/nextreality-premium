// Knihovna komponent – vše vykresleno ze stejných tříd a funkcí (core.js) jako stránky předlohy.
const css = n => getComputedStyle(document.documentElement).getPropertyValue(n).trim();
function lum(hex) {
  let h = hex.replace('#', ''); if (h.length === 3) h = h.replace(/./g, c => c + c);
  const m = h.match(/../g); if (!m) return 1;
  const [r, g, b] = m.map(x => parseInt(x, 16) / 255).map(v => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
const contrast = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };
const sec = (id, title, intro, body) => `<section class="sg-sec" id="${id}"><h2>${title}</h2>${intro ? `<p>${intro}</p>` : ''}${body}</section>`;
const cell = (label, html) => `<div class="sg-cell"><small>${label}</small>${html}</div>`;

const COLORS = [
  ['--accent', 'Primární akce (tlačítko, aktivní stav)', '#fff'], ['--accent-hover', 'Primární – najetí', '#fff'], ['--accent-soft', 'Podklad štítků, výběru', '--ink'],
  ['--accent-deco', 'Brand zelená – jen dekor, ikony', '#fff'], ['--accent-2', 'Doplňková – odkazy, sekundární akce', '#fff'], ['--accent-2-soft', 'Podklad informačních bloků', '--ink'],
  ['--brand-navy', 'Tmavé sekce, TOP štítek', '#fff'], ['--ink', 'Nadpisy', '#fff'], ['--text', 'Běžný text', '#fff'], ['--text-muted', 'Popisky (na bílé)', '#fff'],
  ['--line', 'Oddělovače', '--ink'], ['--line-strong', 'Okraje polí', '--ink'], ['--surface-2', 'Tónované sekce', '--ink'],
  ['--st-free', 'Stav Volný (text)', '--st-free-bg'], ['--st-reserved', 'Stav Rezervováno', '--st-reserved-bg'], ['--st-sold', 'Stav Prodáno', '--st-sold-bg'], ['--st-last', 'Poslední v projektu', '--st-last-bg'], ['--danger', 'Chyba, Zlevněno', '#fff'], ['--focus', 'Zaměření klávesnicí', '#fff'],
];
const TYPE = [ // role, třída/token, mobil, tablet, desktop, váha
  ['Hero nadpis', '--fs-hero', '32/38', '40/48', '48/56', 700], ['H1 stránky', '--fs-h1', '28/34', '34/42', '40/48', 700], ['H2 sekce · H1 detailu', '--fs-h2', '24/30', '28/36', '32/40', 700],
  ['H3', '--fs-h3', '20/26', '22/30', '24/32', 600], ['Nadpis karty', '--fs-card', '17/24', '18/26', '18/26', 600], ['Perex', '--fs-lead', '17/26', '18/28', '18/28', 400],
  ['Běžný text', '--fs-body', '16/25', '16/26', '16/26', 400], ['Malý text, popisky', '--fs-small', '14/20', '14/20', '14/20', 400], ['Štítek / label', '--fs-label', '12/16 · 0,06em', '12/16', '12/16', 600],
];
const L = () => window.LISTINGS.tgh || [];
const byLen = () => [...L()].sort((a, b) => a.t.length - b.t.length);

function render() {
  const btnRow = cls => ['', 'is-hover', 'is-active', 'is-focus'].map((s, i) => cell(['výchozí', 'najetí', 'aktivní', 'zaměření'][i], `<button class="btn ${cls} ${s}">Mám zájem</button>`)).join('')
    + cell('neaktivní', `<button class="btn ${cls}" disabled>Mám zájem</button>`) + cell('načítání', `<button class="btn ${cls} is-loading">Mám zájem</button>`)
    + cell('s ikonou', `<button class="btn ${cls}">${ico('phone')}Zavolat</button>`);
  const shortT = byLen()[0], longT = byLen().at(-1), base = L().find(x => x.type === 'byt' && x.img) || L()[0];
  const states = [
    ['Volný', { ...base }], ['Rezervováno', { ...base, st: 'reserved' }], ['Prodáno', { ...base, st: 'sold' }], ['TOP nabídka', { ...base, st: 'top' }],
    ['Poslední v projektu', { ...base, st: 'last' }], ['Zlevněno', { ...base, st: 'drop', oldPrice: Math.round(base.price * 1.08 / 1000) * 1000 }],
    ['Cena na vyžádání', { ...base, price: null }], ['Pronájem', L().find(x => x.rent) || base], ['Bez fotky', { ...base, img: null }],
    ['Nejkratší reálný název', shortT], ['Nejdelší reálný název', longT],
  ];
  const agents = window.BROKERS.tgh;
  const agentCard = a => `<article class="agent"><div class="agent__photo">${a.img ? `<img src="${esc(a.img)}" alt="" loading="lazy">` : ''}</div><div class="agent__body"><span class="agent__office">${esc(a.office)}</span><h3 class="agent__name"><a href="#">${esc(a.n)}</a></h3><p class="agent__role">${esc(a.r)}</p><div class="agent__contact"><a href="#">${ico('phone')}<span>${esc(a.tel)}</span></a><a href="#">${ico('mail')}<span>${esc(a.mail)}</span></a></div></div></article>`;
  const proj = window.PROJECTS.tgh;
  const projCard = p => `<article class="project"><div class="project__media">${p.img ? `<img src="${esc(p.img)}" alt="" loading="lazy">` : ''}<div class="pcard__badges"><span class="badge badge--free">${esc(p.label || 'V prodeji')}</span></div></div><div class="project__body"><h3 class="t-h3"><a href="#">${esc(p.n)}</a></h3>${p.d ? `<p>${esc(p.d)}</p>` : ''}${p.facts?.length ? `<div class="project__facts">${p.facts.map(f => `<span class="param">${esc(f)}</span>`).join('')}</div>` : ''}</div></article>`;
  const refs = OFFICES.tgh.refs;
  const ref = r => `<figure class="ref" style="margin:0"><blockquote>„${esc(r.q)}“</blockquote><footer><span class="ref__avatar">${esc(r.n.replace(/^(Ing|Mgr|Bc)\.\s*/, '')[0])}</span><span><b>${esc(r.n)}</b></span></footer></figure>`;

  const html = [
    sec('barvy', 'Barvy', 'Kontrast se počítá živě vůči textu, který na barvě skutečně leží. Cíl WCAG AA: 4,5 : 1 pro běžný text, 3 : 1 pro velký text a ikony. Přepni kancelář na „Test přebarvení“ – změní se jen tyto proměnné.',
      `<div class="sg-grid">${COLORS.map(([v, use, on]) => {
        const c = css(v), fg = on.startsWith('--') ? css(on) : on, cr = contrast(c, fg);
        return `<div class="sw"><div class="sw__c" style="background:${c};color:${fg}">Aa</div><div class="sw__m"><code>${v}</code><span>${c}</span><span>${use}</span><span class="${cr >= 4.5 ? 'ok' : cr >= 3 ? '' : 'bad'}">${cr.toFixed(1).replace('.', ',')} : 1 ${cr >= 4.5 ? 'AA' : cr >= 3 ? 'jen velký text' : 'nevyhovuje'}</span></div></div>`;
      }).join('')}</div>
      <div class="sg-box"><b>Brand originály – proč nejsou na tlačítkách</b><div class="sg-row">${[['#85b929', 'zelená NEXT'], ['#3187aa', 'modrá NEXT']].map(([c, n]) => `<div class="sw" style="width:200px"><div class="sw__c" style="background:${c};color:#fff">Aa</div><div class="sw__m"><code>${c}</code><span>${n} + bílý text</span><span class="bad">${contrast(c, '#ffffff').toFixed(1).replace('.', ',')} : 1 nevyhovuje</span></div></div>`).join('')}</div></div>`),

    sec('typografie', 'Typografie', `DM Sans. Základ 16 px se nemění se šířkou okna – velikosti se přepínají jen na 768 a 1280 px. Aktuální okno: <b id="sg-w"></b>.`,
      `<div class="sg-scroll"><table class="sg-table"><thead><tr><th>Role</th><th>Token</th><th>Mobil &lt;768</th><th>Tablet 768–1279</th><th>Desktop ≥1280</th><th>Váha</th><th>Teď</th></tr></thead><tbody>
      ${TYPE.map(([r, t, m, tb, d, w]) => `<tr><td>${r}</td><td><code>${t}</code></td><td>${m}</td><td>${tb}</td><td>${d}</td><td>${w}</td><td>${css(t)} / ${css(t.replace('fs', 'lh'))}</td></tr>`).join('')}</tbody></table></div>
      <div class="sg-box"><p class="t-hero">Hero nadpis 48</p><p class="t-h1">H1 stránky 40</p><p class="t-h2">H2 sekce 32</p><p class="t-h3">H3 24</p><p class="t-lead">Perex 18 – úvodní odstavec sekce.</p><p>Běžný text 16 – popisy nemovitostí a odstavce.</p><p class="t-small">Malý text 14 – popisky, metadata.</p><p class="t-label">Štítek 12 · verzálky jen tady</p></div>`),

    sec('odsazeni', 'Odsazení, rádiusy, stíny', 'Výhradně tato škála. Svislé odsazení sekcí 56 / 72 / 96 px (mobil / tablet / desktop), okraje stránky 20 / 32 / 40 px.',
      `<div style="display:grid;gap:var(--s-2)">${['1', '2', '3', '4', '5', '6', '8', '10', '12', '16', '24'].map(n => `<div class="sp"><code style="width:56px">--s-${n}</code><i style="width:${css('--s-' + n)}"></i><span>${css('--s-' + n)}</span></div>`).join('')}</div>
      <div class="sg-row">${[['--r-btn', 'tlačítko'], ['--r-input', 'pole'], ['--r-card', 'karta'], ['--r-pill', 'chip']].map(([v, n]) => cell(`${n} · ${css(v)}`, `<div style="width:96px;height:64px;border:2px solid var(--accent);border-radius:var(${v})"></div>`)).join('')}
      ${[['--sh-1', 'karta'], ['--sh-2', 'najetí'], ['--sh-3', 'panel, dialog']].map(([v, n]) => cell(`${v} · ${n}`, `<div style="width:120px;height:64px;border-radius:var(--r-card);background:var(--surface);box-shadow:var(${v})"></div>`)).join('')}</div>`),

    sec('ikony', 'Ikony', `Vlastní sada ${Object.keys(ICONS).length} ikon, mřížka 24 × 24, tah 1,8, zaoblené konce. 20 px v textu, 24 px samostatně. Klik na ikonu = stažení SVG.`,
      `<div class="sg-row"><button class="btn btn--secondary" id="dl-sprite">${ico('download')} Stáhnout celou sadu (SVG sprite)</button></div>
       <div class="sg-grid" style="grid-template-columns:repeat(auto-fill,minmax(96px,1fr))">${Object.keys(ICONS).map(k => `<button class="ic" data-ic="${k}">${ico(k)}<span>${k}</span></button>`).join('')}</div>`),

    sec('tlacitka', 'Tlačítka', 'Tři úrovně + doplňková. Výška 44 px desktop / 48 px mobil, text 15 px / 600, bez verzálek. Najetí a aktivní stav jsou tu vynucené třídou <code>.is-hover</code> / <code>.is-active</code> – v produkci <code>:hover</code> / <code>:active</code>.',
      ['btn--primary', 'btn--secondary', 'btn--ghost', 'btn--alt'].map(c => `<div class="sg-lbl">.${c}</div><div class="sg-row">${btnRow(c)}</div>`).join('')
      + `<div class="sg-lbl">na tmavém podkladu · přes celou šířku · ikonové</div><div class="sg-row"><div class="section--dark" style="padding:var(--s-4);border-radius:var(--r-card)"><button class="btn btn--secondary btn--on-dark">Prohlédnout realizace</button></div><div style="width:260px"><button class="btn btn--primary btn--block">Zjistit cenu zdarma</button></div><button class="icon-btn" aria-label="Oblíbené">${ico('heart', 'icon icon--lg')}<span class="count">2</span></button><button class="icon-btn" disabled aria-label="Další">${ico('chev-right')}</button></div>`),

    sec('formulare', 'Formulářová pole', 'Výška 44 px desktop / 48 px mobil, text 16 px (na iOS nezoomuje). Chyba se ukazuje u pole a říká, jak ji opravit.',
      `<div class="sg-grid sg-grid--wide">
        ${cell('výchozí', `<div class="field" style="width:100%"><label>Jméno a příjmení *</label><input class="input" placeholder="Jan Novák"></div>`)}
        ${cell('najetí', `<div class="field" style="width:100%"><label>Jméno a příjmení *</label><input class="input is-hover" placeholder="Jan Novák"></div>`)}
        ${cell('zaměření', `<div class="field" style="width:100%"><label>Jméno a příjmení *</label><input class="input is-focus" value="Jan Nov"></div>`)}
        ${cell('vyplněno / ověřeno', `<div class="field" style="width:100%"><label>E-mail *</label><input class="input is-success" value="jan.novak@email.cz"></div>`)}
        ${cell('chyba', `<div class="field" style="width:100%"><label>Telefon *</label><input class="input is-error" value="603 41" aria-invalid="true"><span class="field__error">Zadejte telefon ve tvaru 603 418 108</span></div>`)}
        ${cell('neaktivní', `<div class="field" style="width:100%"><label>Evidenční číslo</label><input class="input" value="N119591" disabled></div>`)}
        ${cell('s ikonou', `<div class="field" style="width:100%"><label>Lokalita</label><div class="input-icon">${ico('pin')}<input class="input" placeholder="Město, čtvrť nebo ulice"></div></div>`)}
        ${cell('s jednotkou', `<div class="field" style="width:100%"><label>Užitková plocha</label><div class="input-suffix"><input class="input" value="226"><span>m²</span></div></div>`)}
        ${cell('výběr', `<div class="field" style="width:100%"><label>Typ nemovitosti</label><select class="select"><option>Domy</option></select></div>`)}
        ${cell('rozsah', `<div class="field" style="width:100%"><span class="field__label">Cena</span><div class="range"><input class="input" placeholder="od Kč"><span>–</span><input class="input" value="10 900 000"></div></div>`)}
        ${cell('víceřádkové', `<div class="field" style="width:100%"><label>Zpráva</label><textarea class="input">Dobrý den, mám zájem o prohlídku.</textarea></div>`)}
        ${cell('souhlas', `<label class="check"><input type="checkbox" checked> <span>Souhlasím se zpracováním osobních údajů. <a href="#">Jak s nimi nakládáme</a></span></label>`)}
      </div>
      <div class="sg-lbl">chipy (dispozice, plocha) · segment · dlaždice · volby</div>
      <div class="sg-row">${cell('výchozí', '<button class="chip">2+kk</button>')}${cell('najetí', '<button class="chip is-hover">2+kk</button>')}${cell('vybráno', '<button class="chip" aria-pressed="true">2+kk</button>')}${cell('zaměření', '<button class="chip is-focus">2+kk</button>')}${cell('neaktivní', '<button class="chip" disabled>2+kk</button>')}
        ${cell('segment', '<div class="seg"><button aria-pressed="true">Prodej</button><button aria-pressed="false">Pronájem</button></div>')}</div>
      <div class="sg-row" style="align-items:start"><div style="width:min(100%,420px)"><div class="tiles"><label class="tile"><input type="radio" name="sg-t" checked><span>${ico('byt')}Byt</span></label><label class="tile"><input type="radio" name="sg-t"><span>${ico('dum')}Dům</span></label><label class="tile"><input type="radio" name="sg-t"><span>${ico('pozemek')}Pozemek</span></label></div></div>
        <div class="radios" style="width:min(100%,420px)"><label class="radio"><input type="radio" name="sg-r" checked><span>Orientační tržní cena<small>Zdarma a nezávazně</small></span></label><label class="radio"><input type="radio" name="sg-r"><span>Znalecký posudek</span></label></div>
        <div class="checks"><label><input type="checkbox" checked>garáž</label><label><input type="checkbox">sklep</label></div></div>`),

    sec('stitky', 'Štítky', 'Stavy nabídky mají pevné barvy pro všechny kanceláře. Verzálky s prostrkáním jen tady.',
      `<div class="sg-row">${Object.entries(STATUS).map(([k, [l, c]]) => `<span class="badge badge--${c}">${l}</span>`).join('')}<span class="badge badge--rent">Pronájem</span><span class="param">Byt 2+kk</span><span class="param">pozemek 528 m²</span><button class="fchip">Byty ${ico('x')}</button><button class="fchip fchip--tip">Bez „do 1 000 Kč“ <b>3</b></button><span class="pill">2</span></div>`),

    sec('karta', 'Karta nemovitosti', 'Nejdůležitější komponenta. Foto 4 : 3 s ořezem, pevné pozice (štítky → název max. 2 řádky → lokalita 1 řádek → cena), stejná výška v řadě bez ohledu na délku názvu. Názvy jsou reálné, ze CRM. Stavy jsou nasimulované na reálné nabídce.',
      `<div class="sg-cards">${states.map(([l, x]) => `<div class="sg-cell" style="justify-items:stretch"><small>${l}</small>${card(x)}</div>`).join('')}
        <div class="sg-cell" style="justify-items:stretch"><small>Načítání</small>${skeleton(1)}</div>
        <div class="sg-cell" style="justify-items:stretch"><small>Najetí</small>${card(base).replace('class="pcard"', 'class="pcard is-hover"')}</div>
        <div class="sg-cell" style="justify-items:stretch"><small>Zaměření klávesnicí</small>${card(base).replace('class="pcard"', 'class="pcard is-focus"')}</div></div>`),

    sec('karty', 'Další karty', 'Makléř (foto 1 : 1, role max. 2 řádky), reference (max. 5 řádků), projekt (foto 3 : 2, popis max. 3 řádky, fakta zalamovací), článek (foto 16 : 9; bez fotky brandová plocha – dnes nemá fotku žádný článek TGH).',
      `<div class="sg-lbl">makléř – běžný · dlouhá role · bez fotky</div><div class="grid-agents">${agentCard(agents[0])}${agentCard({ ...(window.BROKERS.stars[2] || agents[1]) })}${agentCard({ ...agents[2], img: null })}${agentCard(agents.find(a => a.slug === 'zdenek-kubat') || agents[3])}</div>
       <div class="sg-lbl">reference – krátká · dlouhá (ořez)</div><div class="grid-refs">${ref(refs[2])}${ref(refs[1])}${ref(refs[0])}</div>
       <div class="sg-lbl">projekt – s fakty · bez faktů</div><div class="grid-projects">${projCard(proj[1])}${projCard(proj.at(-1))}${projCard({ ...proj[0], d: '' })}</div>
       <div class="sg-lbl">článek – reálné články TGH</div><div class="grid-articles">${ARTICLES.map(acard).join('')}</div>`),

    sec('navigace', 'Navigace', 'Hlavička a patička jsou na každé stránce (nahoře). Na mobilu se menu otevírá ikonou ☰ jako boční panel.',
      `<div class="sg-box"><nav class="crumbs" style="margin:0"><a href="#">Domů</a><span>/</span><a href="#">Nabídka nemovitostí</a><span>/</span><a href="#">Domy</a><span>/</span><span aria-current="page">Prodej domu rodinný 226 m² pozemek 528 m², Bžany-Lhenice</span></nav>
       <div class="status-tabs" style="margin:0"><button aria-selected="true">Aktuální nabídka <span>68</span></button><button aria-selected="false">Realizováno <span>184</span></button></div>
       <div class="pager" style="margin:0;align-items:start">${['první', 'uprostřed', 'poslední'].map((l, i) => { const p = [1, 9, 18][i]; const items = i === 0 ? [1, 2, '…', 18] : i === 1 ? [1, '…', 8, 9, 10, '…', 18] : [1, '…', 17, 18]; return `<div class="sg-cell"><small>${l}</small><div class="pager__nums"><button class="icon-btn"${p === 1 ? ' disabled' : ''}>${ico('chev-left')}</button>${items.map(x => x === '…' ? '<span>…</span>' : `<button class="pager__n"${x === p ? ' aria-current="page"' : ''}>${x}</button>`).join('')}<button class="icon-btn"${p === 18 ? ' disabled' : ''}>${ico('chev-right')}</button></div></div>`; }).join('')}</div></div>`),

    sec('vyhledavani', 'Vyhledávání a filtry', 'Našeptávač lokality (obec / čtvrť / ulice / projekt s počty), aktivní filtry jako odebíratelné štítky, živý počet na tlačítku. Celé filtry (desktop lišta + mobilní panel) viz <a href="vypis.html">výpis</a>.',
      `<div class="sg-row" style="align-items:start"><div class="field suggest is-open" style="width:min(100%,380px)"><label>Lokalita</label><div class="input-icon">${ico('pin')}<input class="input is-focus" value="Pra"></div>
        <ul class="suggest__list" style="position:static;margin-top:var(--s-1)"><li>${ico('pin')}<span><mark>Pra</mark>ha</span><small>obec · 20</small></li><li aria-selected="true">${ico('pin')}<span><mark>Pra</mark>ha-Libeň</span><small>čtvrť · 5</small></li><li>${ico('projekt')}<span>Musílkova 39</span><small>projekt</small></li></ul></div>
        <div class="sg-cell"><small>živý počet · načítání</small><button class="btn btn--primary">${ico('search')}Zobrazit 3 nabídky</button><button class="btn btn--primary is-loading">Zobrazit</button></div>
        <div class="sg-cell"><small>aktivní filtry</small><div class="active-chips" style="padding:0"><button class="fchip">Byty ${ico('x')}</button><button class="fchip">Praha ${ico('x')}</button><button class="fchip">2+kk ${ico('x')}</button><button class="btn btn--ghost">Zrušit filtry</button></div></div></div>`),

    sec('stavy', 'Zpětná vazba a prázdné stavy', 'Nikde nesmí zůstat prázdné bílé místo – každý blok, který může chybět (fotka, půdorys, mapa po odmítnutí cookies, výsledky hledání), má náhradní stav.',
      `<div class="sg-grid sg-grid--wide">
        <div class="sg-cell" style="justify-items:stretch"><small>mapa po odmítnutí cookies</small>${blocked('map', 220)}</div>
        <div class="sg-cell" style="justify-items:stretch"><small>video po odmítnutí cookies</small>${blocked('video', 220)}</div>
        <div class="sg-cell" style="justify-items:stretch"><small>chybějící blok (půdorys)</small><div class="dempty">${ico('floor')}<div><b>Půdorys k této nemovitosti zatím nemáme</b><span>Rádi vám ho na vyžádání pošleme.</span></div></div></div>
        <div class="sg-cell" style="justify-items:stretch"><small>odesláno</small><div class="box"><h3 class="t-h3">Děkujeme, poptávka je odeslaná</h3><p>Makléř se vám ozve nejpozději do 24 hodin.</p></div></div>
        <div class="sg-cell" style="justify-items:stretch"><small>vysvětlivka</small><div class="box"><dl class="ptable" style="grid-template-columns:1fr"><div><dt>Evidenční číslo <button type="button" class="hint" aria-label="Vysvětlivka">${ico('info')}<span class="hint__tip" style="display:block;position:static;transform:none;margin-top:4px">Uveďte při komunikaci s makléřem.</span></button></dt><dd>N119591</dd></div></dl></div></div>
      </div>
      <div class="sg-lbl">hlídací pes – ve výpisu · v prázdném výsledku</div>
      <div class="watchdog watchdog--inline"><span class="watchdog__ico">${ico('bell', 'icon icon--lg')}</span><div><h3 class="t-h3" style="font-size:var(--fs-card)">Hlídací pes pro toto hledání</h3><p>Nové nabídky podle aktuálních filtrů vám pošleme e-mailem.</p></div><form onsubmit="event.preventDefault()"><input class="input" placeholder="váš@e-mail.cz"><button class="btn btn--alt">Hlídat nabídky</button></form></div>
      <div class="empty__in">${ico('empty', 'icon empty__ico')}<h2 class="t-h3">Tomuto hledání teď nic neodpovídá</h2><p>Zkuste uvolnit některý z filtrů, nebo si nechte posílat nové nabídky.</p><div class="chips" style="justify-content:center"><button class="fchip fchip--tip">Bez „2+kk“ <b>12</b></button><button class="fchip fchip--tip">Bez „do 5 000 000 Kč“ <b>4</b></button></div></div>`),

    sec('listy', 'Lišty a detailní bloky', 'Cookie lišta (rovnocenná tlačítka „Odmítnout vše“ a „Povolit vše“), lepící lišta detailu, PENB. V produkci jsou lišty <code>position: fixed</code>; tady jsou zobrazené na místě.',
      `<div class="sg-static" style="display:grid;gap:var(--s-6)">
        <div class="cookies" style="display:grid"><p>Cookies používáme k měření návštěvnosti a k zobrazení map a videí. Můžete je povolit, odmítnout, nebo nastavit podrobně.</p><div class="cookies__btns"><button class="btn btn--ghost">Nastavit</button><button class="btn btn--secondary">Odmítnout vše</button><button class="btn btn--secondary">Povolit vše</button></div></div>
        <div class="stickybar"><div class="container stickybar__in"><span class="stickybar__title">Prodej domu rodinný 226 m² pozemek 528 m², Bžany-Lhenice</span><span class="stickybar__price">10 900 000 Kč<small>Lhenice, Bžany</small></span><span class="stickybar__cta"><a class="icon-btn" href="#" style="border:1.5px solid var(--line-strong)">${ico('phone', 'icon icon--lg')}</a><a class="btn btn--primary" href="#">Mám zájem</a></span></div></div>
        <div class="sg-box"><div class="penb">${(() => { const P = [['A', '#1b7f3b'], ['B', '#4a9b2f'], ['C', '#9bc23c'], ['D', '#f2d43d'], ['E', '#f0a830'], ['F', '#e2702a'], ['G', '#c62828']]; return `<div class="penb__scale">${P.map(([c, col], k) => `<div class="penb__row${k === 0 ? ' is-active' : ''}" data-label="Mimořádně úsporná"><span class="penb__bar" style="width:${30 + k * 10}%;background:${col};color:${k >= 2 && k <= 4 ? '#232a31' : '#fff'}">${c}</span></div>`).join('')}</div>`; })()}<div class="penb__val"><span>Třída A · Mimořádně úsporná</span><b>97 kWh/m²/rok</b><span>dle vyhlášky č. 264/2020 Sb.</span></div></div></div>
      </div>`),
  ].join('');
  $('#sg').innerHTML = html;
  $('#toc').innerHTML = $$('.sg-sec').map(s => `<a href="#${s.id}">${s.querySelector('h2').textContent}</a>`).join('') + `<a href="predani.html" style="margin-top:var(--s-3);color:var(--accent-2);font-weight:600">Pravidla pro vývoj →</a>`;
  $('#sg-w').textContent = innerWidth + ' px';
}

function download(name, text) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([text], { type: 'image/svg+xml' }));
  a.download = name; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}
const svgOf = k => `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${ICONS[k]}</svg>`;

window.PAGE = {
  note: 'Stavy najetí/aktivní/zaměření jsou vynucené třídami .is-hover/.is-active/.is-focus (components.css) – stejné hodnoty jako :hover/:active/:focus-visible.',
  render() { render(); },
  init() {
    document.addEventListener('click', e => {
      const i = e.target.closest('[data-ic]'); if (i) download(`next-${i.dataset.ic}.svg`, svgOf(i.dataset.ic));
      if (e.target.closest('#dl-sprite')) download('next-ikony-sprite.svg', `<svg xmlns="http://www.w3.org/2000/svg" style="display:none">\n${Object.keys(ICONS).map(k => `  <symbol id="i-${k}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${ICONS[k]}</symbol>`).join('\n')}\n</svg>\n`);
    });
    addEventListener('resize', () => { const w = $('#sg-w'); if (w) w.textContent = innerWidth + ' px'; });
  },
};
