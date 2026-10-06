// Stáhne reálné nabídky kanceláří z endpointu mapy výpisu → site/data/<office>-listings.js
// Strukturované parametry (typ, dispozice, plochy) se v předloze parsují z CRM názvu.
// Produkce je musí brát z polí CRM – parsování je jen náhrada pro předlohu.
import fs from 'fs';

const OFFICES = { tgh: 'https://www.nextreality-tgh.cz', stars: 'https://www.nextrealitystars.cz' };

function parse(t) {
  const rent = /^Pronájem/.test(t);
  const type = /^\S+ bytu/.test(t) ? 'byt' : /^\S+ domu/.test(t) ? 'dum' : /^\S+ pozemku/.test(t) ? 'pozemek'
    : /komerčních prostor/.test(t) ? 'komercni' : 'ostatni';
  const disp = (t.match(/\b(\d\+(?:kk|\d))\b/) || [])[1] || null;
  const land = +((t.match(/pozemek (\d+) m²/) || [])[1] || 0) || null;
  const areaM = t.replace(/pozemek \d+ m²/, '').match(/(\d+) m²/);
  const area = areaM ? +areaM[1] : null;
  const sub = type === 'dum' ? (t.match(/domu (.+?) \d+ m²/) || [])[1]
    : type === 'komercni' ? (t.match(/prostor (.+?) \d+ m²/) || [])[1]
    : type === 'pozemek' ? (t.match(/pozemku (.+?) pozemek/) || [])[1]
    : type === 'ostatni' ? (t.match(/prostor (.+?) \d+ m²/) || [])[1] : null;
  const place = t.split(', ').slice(1).join(', ');
  return { rent, type, sub: sub || null, disp, area, land, place };
}

for (const [key, BASE] of Object.entries(OFFICES)) {
  const page = await fetch(BASE + '/nabidka-nemovitosti');
  const cookie = page.headers.getSetCookie().map(c => c.split(';')[0]).join('; ');
  const html = await page.text();
  const res = {};
  for (const [name, attr] of [['active', 'data-map-markers-endpoint'], ['sold', 'data-map-sold-markers-endpoint']]) {
    const ep = ((html.match(new RegExp(attr + '="([^"]*reoUnitsMap-[a-zA-Z]+)"')) || [])[1] || '').replace(/&amp;/g, '&');
    const out = (res[name] = []);
    if (!ep) continue;
    let data = null;
    for (let i = 0; i < 3 && !data; i++) {
      const txt = await (await fetch(BASE + ep, { headers: { cookie } })).text();
      try { data = txt.trim() ? JSON.parse(txt) : []; } catch { await new Promise(r => setTimeout(r, 1500)); }
    }
    if (!data) { console.log(key, name, 'endpoint nevrátil JSON'); continue; }
    for (const m of data) {
      for (const blk of m.content.split(/class="(?:nextweb-marker|info_content info_content--next)"/).slice(1)) {
        const t = ((blk.match(/unitMarker-name"><span>([^<]+)</) || blk.match(/alt="([^"]+)"/) || [])[1] || '').replace(/&amp;/g, '&').trim();
        const imgM = blk.match(/src="(\/www\/upload\/[a-z0-9]+\/\d+\/\d+)(\.[^"]+)"/) || [];
        const href = (blk.match(/href="(\/[^"#]+)"/) || [])[1];
        const leaves = [...blk.matchAll(/>([^<>]+)</g)].map(x => x[1].replace(/\s+/g, ' ').trim()).filter(s => s && s !== 'Detail nemovitosti' && s !== t);
        const priceTxt = leaves.find(s => /Kč|vyžádání/i.test(s)) || '';
        const loc = (leaves.find(s => s !== priceTxt && /[a-zá-ž]/i.test(s) && !/nemovitost/i.test(s)) || '').replace(/\s+,/g, ',').replace(/,\s+/g, ', ');
        const price = /\d/.test(priceTxt) ? +priceTxt.replace(/\D/g, '') : null;
        out.push({ id: out.length, lat: +m.position.lat.toFixed(5), lng: +m.position.lng.toFixed(5), t, loc, price, img: imgM[1] ? BASE + imgM[1] + imgM[2] : null, href, ...parse(t) });
      }
    }
  }
  fs.mkdirSync('site/data', { recursive: true });
  fs.writeFileSync(`site/data/${key}-listings.js`, `// ${res.active.length} aktivních + ${res.sold.length} realizovaných, staženo ${new Date().toISOString().slice(0, 10)} z ${BASE}\nwindow.LISTINGS = window.LISTINGS || {};\nwindow.LISTINGS.${key} = ${JSON.stringify(res.active)};\nwindow.SOLD = window.SOLD || {};\nwindow.SOLD.${key} = ${JSON.stringify(res.sold)};\n`);
  const types = res.active.reduce((a, x) => (a[x.type] = (a[x.type] || 0) + 1, a), {});
  console.log(key, res.active.length, '+ sold', res.sold.length, JSON.stringify(types), 'na vyžádání:', res.active.filter(x => x.price == null).length, '| vzorek:', JSON.stringify(res.active[0]).slice(0, 260));
}
