// Fáze 3 – stáhne makléře (TGH 3 stránky, Stars), detail makléře a developerské projekty TGH → site/data/phase3.js
import fs from 'fs';
const TGH = 'https://www.nextreality-tgh.cz', STARS = 'https://www.nextrealitystars.cz';
const get = async u => (await fetch(u)).text();
const clean = s => s.replace(/<br\s*\/?>/g, ' ').replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/\s+/g, ' ').trim();

// --- makléři TGH (entityBox--broker) ---
async function tghBrokers() {
  const out = [];
  for (let p = 1; p <= 5; p++) {
    const h = await get(`${TGH}/makleri?paginator-set=pa%3A${p}%3Bipp%3A15`);
    const blocks = h.split('class="entityBox entityBox--broker"').slice(1);
    if (!blocks.length) break;
    for (const b of blocks) {
      const slug = (b.match(/href="\/([^"]+)" class="picture"/) || [])[1];
      if (out.some(x => x.slug === slug)) continue;
      const photo = (b.match(/class="portrait">[\s\S]*?<img src="([^"]+)"/) || b.match(/<img src="([^"]+)"/) || [])[1];
      out.push({
        slug, n: clean((b.match(/<h3>([\s\S]*?)<\/h3>/) || [])[1] || ''),
        r: clean((b.match(/entityBox__badge">([\s\S]*?)<\/div>/) || [])[1] || ''),
        office: clean((b.match(/entityBox__office">Kancelář: ([\s\S]*?)<\/p>/) || [])[1] || ''),
        tel: clean((b.match(/href="tel:[^"]*"[^>]*>([\s\S]*?)<\/a>/) || [])[1] || ''),
        mail: (b.match(/mailto:([^"]+)"/) || [])[1] || '',
        img: photo ? TGH + photo : null,
      });
    }
  }
  return out;
}

// --- makléři Stars (stránka /makleri – jiná šablona) ---
async function starsBrokers() {
  const h = await get(`${STARS}/makleri`);
  const out = [];
  for (const m of h.matchAll(/<img[^>]+(?:data-src|src)="(\/www\/upload\/24c3bdf2\/[^"]+340x440[^"]*)"[^>]*alt="([^"]+)"[\s\S]*?<\/picture>([\s\S]{0,2500}?)mailto:([^"]+)"/g)) {
    const txt = clean(m[3]);
    const tel = (txt.match(/\+420[\d ]{9,12}/) || [])[0]?.trim() || '';
    const r = txt.replace(m[2], '').split('+420')[0].trim();
    const slug = (m[3].match(/href="\/([^"#?]+)"/) || [])[1] || null;
    if (!out.some(x => x.n === m[2])) out.push({ slug, n: m[2], r, office: 'NEXT REALITY STARS', tel, mail: m[4], img: STARS + m[1] });
  }
  return out;
}

// --- detail makléře TGH ---
async function tghBroker(slug) {
  const h = await get(`${TGH}/${slug}`);
  const main = (h.match(/<main[\s\S]*?<\/main>/) || [h])[0];
  const paras = [...main.matchAll(/<p>([\s\S]*?)<\/p>/g)].map(m => clean(m[1])).filter(s => s.length > 80);
  const motto = clean((main.match(/<h1[\s\S]*?<\/h1>[\s\S]*?<p[^>]*>([\s\S]*?)<\/p>/) || [])[1] || '');
  const cover = (main.match(/(\/www\/upload\/24c3bdf2\/\d+\/\d+\.1940x760[^"\s,]+)/) || [])[1];
  const portrait = (main.match(/(\/www\/upload\/24c3bdf2\/\d+\/\d+\.760x760\.fill\.png)/) || [])[1];
  const hrefs = [...new Set([...main.matchAll(/href="\/((?:prodej|pronajem)-[^"#?]+)"/g)].map(m => '/' + m[1]))];
  return { slug, motto, bio: paras.filter(p => p !== motto).slice(0, 6), cover: cover && TGH + cover, portrait: portrait && TGH + portrait, hrefs };
}

// --- developerské projekty TGH ---
async function tghProjects() {
  const h = await get(`${TGH}/developerske-projekty`);
  return h.split('<section class="reoUnitDevelopmentProjectList">').slice(1).map(b => {
    const img = (b.match(/<img src="(\/www\/upload\/3820a704\/[^"]+)"/) || [])[1];
    const content = (b.match(/<div class="content">([\s\S]*?)<\/div>/) || [])[1] || '';
    return {
      slug: (b.match(/href="\/([^"]+)" class="button/) || [])[1],
      n: clean((b.match(/<h2>([\s\S]*?)<\/h2>/) || [])[1] || ''),
      label: clean((b.match(/label"[^>]*>\s*<span>([\s\S]*?)<\/span>/) || [])[1] || ''),
      d: clean((content.match(/<p>([\s\S]*?)<\/p>/) || [])[1] || ''),
      bullets: [...content.matchAll(/<li>([\s\S]*?)<\/li>/g)].map(m => clean(m[1])),
      facts: [...b.matchAll(/benefitsBox--project2">[\s\S]*?<h3>([\s\S]*?)<\/h3>/g)].map(m => clean(m[1])),
      img: img ? TGH + img : null,
    };
  });
}

async function tghOffices() {
  const h = await get(`${TGH}/kancelare`);
  return h.split('class="branchBox"').slice(1).map(b => ({
    slug: (b.match(/href="\/([^"]+)"/) || [])[1],
    n: clean((b.match(/<h2>([\s\S]*?)<\/h2>/) || [])[1] || ''),
    address: clean((b.match(/<p>([\s\S]*?)<\/p>/) || [])[1] || ''),
    img: TGH + (b.match(/<img[^>]+src="([^"]+)"/) || [])[1],
  }));
}

const [tgh, stars, projects, offices] = await Promise.all([tghBrokers(), starsBrokers(), tghProjects(), tghOffices()]);
const kubat = await tghBroker('zdenek-kubat');
fs.writeFileSync('site/data/phase3.js', `// Staženo ${new Date().toISOString().slice(0, 10)}: makléři TGH (${tgh.length}), Stars (${stars.length}), projekty TGH (${projects.length}), detail makléře
window.BROKERS = ${JSON.stringify({ tgh, stars })};
window.BROKER_DETAIL = ${JSON.stringify(kubat)};
window.PROJECTS = ${JSON.stringify({ tgh: projects })};
window.BRANCHES = ${JSON.stringify({ tgh: offices })};
`);
console.log('TGH makléři', tgh.length, '| kanceláře', [...new Set(tgh.map(x => x.office))].join(', '));
console.log('duplicitní telefony', Object.entries(tgh.reduce((a, x) => (a[x.tel] = [...(a[x.tel] || []), x.n], a), {})).filter(([, v]) => v.length > 1).map(([t, v]) => t + ': ' + v.join(' / ')).join(' ; '));
console.log('Stars makléři', stars.length, stars.slice(0, 2));
console.log('pobočky', offices.length, offices[2]);
console.log('projekty', projects.length, projects.map(p => p.n + ' [' + p.facts.length + ']').join(', '));
console.log('detail', kubat.motto, '| bio', kubat.bio.length, '| nabídek', kubat.hrefs.length, '| cover', !!kubat.cover);
