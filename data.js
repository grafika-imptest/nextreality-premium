// Reálná data z živých webů (stav 6. 10. 2026) – simulují výstup z CRM.
// Názvy nemovitostí jsou ponechány přesně tak, jak je CRM generuje.
// Hodnoty null = údaj na webu kanceláře nebyl dohledán → šablona ho musí umět vynechat.
const TGH = 'https://www.nextreality-tgh.cz';
const STARS = 'https://www.nextrealitystars.cz';

window.OFFICES = {
  tgh: {
    name: 'NEXT Reality TGH',
    logo: TGH + '/www/upload/f0dec1d8/20260324140901692/20260324140901692.250x76.webp',
    region: 'v Praze a okolí',
    hero: TGH + '/www/RealEstateOffice/images/poster.webp',
    total: 258,
    cats: { byt: 103, dum: 59, komercni: 30, pozemek: 52, ostatni: 14 },
    address: null, phone: null, email: null,
    ratings: [{ src: 'Google', v: 4.5 }, { src: 'Firmy.cz', v: 4.2 }],
    satisfied: '97 %',
    suggest: [
      ['Praha', 'město'], ['Praha-Vinohrady', 'čtvrť'], ['Praha 5 – Košíře', 'čtvrť'],
      ['Boleslavská, Praha', 'ulice'], ['Musílkova 39', 'projekt'], ['Rezidence Gutovka', 'projekt'],
    ],
    listings: [
      { t: 'Pronájem bytu 2+kk 65 m², Masarykova třída, Teplice', loc: 'Masarykova třída, Teplice', price: 13000, rent: true, st: 'free', p: ['Byt 2+kk', '65 m²'], img: TGH + '/www/upload/ee4c3145/20261002161507586/20261002161507586.720x520.qa-82.jpeg' },
      { t: 'Prodej domu rodinný 226 m² pozemek 528 m², Bžany-Lhenice', loc: 'Bžany', price: 10900000, st: 'free', p: ['Dům', '226 m²', 'pozemek 528 m²'], img: TGH + '/www/upload/ee4c3145/20261006114004779/20261006114004779.720x520.qa-82.jpeg' },
      { t: 'Prodej bytu 1+1 41 m², Na Vršku, Jablonec nad Nisou', loc: 'Na Vršku, Jablonec nad Nisou', price: 2655000, st: 'free', p: ['Byt 1+1', '41 m²'], img: TGH + '/www/upload/ee4c3145/20260722093509039/20260722093509039.720x520.qa-82.jpeg' },
      { t: 'Prodej bytu 3+1 70 m², Boženy Němcové, Jablonec nad Nisou-Mšeno nad Nisou', loc: 'Boženy Němcové, Jablonec nad Nisou', price: 4861360, st: 'free', p: ['Byt 3+1', '70 m²'], img: TGH + '/www/upload/ee4c3145/20260903101522884/20260903101522884.720x520.qa-82.jpeg' },
      { t: 'Prodej bytu 2+kk 40 m², Boleslavská, Praha-Vinohrady', loc: 'Boleslavská, Praha', price: 6340000, st: 'free', p: ['Byt 2+kk', '40 m²'], img: TGH + '/www/upload/ee4c3145/20260721101507683/20260721101507683.720x520.qa-82.jpeg' },
      { t: 'Pronájem komerčních prostor obchodní prostory 150 m², Masarykova třída, Teplice', loc: 'Masarykova třída, Teplice', price: 25000, rent: true, st: 'free', p: ['Obchodní prostor', '150 m²'], img: TGH + '/www/upload/ee4c3145/20261006101507602/20261006101507602.720x520.qa-82.jpeg' },
      { t: 'Prodej domu rodinný 101 m² pozemek 1204 m², Bítovany', loc: 'Bítovany', price: 6000000, st: 'free', p: ['Dům', '101 m²', 'pozemek 1 204 m²'], img: TGH + '/www/upload/ee4c3145/20260619161012389/20260619161012389.720x520.qa-82.jpeg' },
      { t: 'Prodej prostor garáž 25 m², Meziboří', loc: 'Meziboří', price: null, st: 'free', p: ['Garáž', '25 m²'], img: TGH + '/www/upload/ee4c3145/20261005214506601/20261005214506601.720x520.qa-82.jpeg' },
    ],
    agents: [
      { n: 'Mgr. Olga Procházková', r: 'Realitní makléřka · NEXT Reality Vision', tel: '+420 776 346 654', mail: 'olga.prochazkova@nextreality.cz', img: TGH + '/www/upload/24c3bdf2/20260702162125763/20260702162125763.680x860.qa-7.png' },
      { n: 'Tomáš Böhm', r: 'Realitní makléř · NEXT Reality Style', tel: '+420 603 418 108', mail: 'tomas.bohm1@nextreality.cz', img: TGH + '/www/upload/24c3bdf2/20260626014052835/20260626014052835.680x860.qa-7.png' },
      { n: 'Lenka Hes', r: 'Realitní makléřka · NEXT Reality Vision', tel: '+420 604 216 349', mail: 'lenka.hes@nextreality.cz', img: TGH + '/www/upload/24c3bdf2/20260626154009230/20260626154009230.680x860.qa-7.png' },
      { n: 'Jan Hornych', r: 'Realitní makléř · NEXT Reality Horizont', tel: '+420 608 759 928', mail: 'jan.hornych@nextreality.cz', img: TGH + '/www/upload/24c3bdf2/20260626155512674/20260626155512674.680x860.qa-7.png' },
    ],
    refs: [
      { q: 'Panu makléři moc děkuji za perfektní přístup, ochotný, se vším pomohl. Vytvořil výbornou prezentaci bytu - virtuální prohlídku, která přispěla k rychlému pronájmu. Příště se na něj určitě opět obrátím.', n: 'Martina Tomášová' },
      { q: 'Paní Lenka Hes je perfektní profesionál. Ačkoli bylo potřeba celý prodej zrealizovat v krátkém čase, zvládla to naprosto s přehledem, znalostmi a okamžitou reakcí na každou připomínku. Je to žena na svém místě, nejen profesionál, ale vše zvládla s úsměvem a ochotou kdykoli pomoci.', n: 'Ing. Zuzana Jindrová' },
      { q: 'Děkujeme moc panu Umáčenému za služby. Od prvního telefonátu po předání klíčů úžasná spolupráce.', n: 'Lucie Vlasáková' },
    ],
    projects: [
      { n: 'Maison de Vary', d: 'Blízko slavné karlovarské kolonády a na dosah filmovému festivali vdechujeme nový život domu s velkou historií. Maison de Vary představuje citlivou proměnu v moderní rezidenční bydlení se zachováním jeho charakteru.', img: TGH + '/www/upload/3820a704/20260623145658561/20260623145658561.870x590.qa-82.webp' },
      { n: 'Musílkova 39', d: 'Projekt Musílkova 39 přináší kompletně zrekonstruovaný dům v oblíbených Košířích. V klidné části Prahy 5 vzniká projekt, který propojuje historii s moderním komfortem.', img: TGH + '/www/upload/3820a704/20251003083648205/20251003083648205.870x590.qa-7.png' },
      { n: 'Duo Záběhlice', d: 'Duo Záběhlice spojuje vlastní prostor se stabilním investičním potenciálem. Flexibilní jednotky v kompletně zrekonstruovaném domě nabízejí možnost vlastního využití i pravidelného výnosu.', img: TGH + '/www/upload/3820a704/20260727092009513/20260727092009513.870x590.qa-82.jpg' },
    ],
  },

  stars: {
    name: 'NEXT REALITY STARS',
    logo: STARS + '/www/upload/f0dec1d8/20250307042656010/20250307042656010.400x90.webp',
    region: 'na Kladensku a v okolí',
    hero: STARS + '/www/upload/792159b8/20250308064947127/20250308064947127.qa-100.webp',
    total: 75,
    cats: { byt: 27, dum: 20, komercni: null, pozemek: 15, ostatni: null },
    address: 'nám. Svobody 1626, Kladno', phone: null, email: null,
    ratings: [{ src: 'Hodnocení klientů', v: 4.6 }],
    satisfied: null,
    suggest: [
      ['Kladno', 'město'], ['Kladno-Kročehlavy', 'čtvrť'], ['Petrohradská, Kladno', 'ulice'],
      ['Plzeň-Bukovec', 'čtvrť'], ['Vila domy Plzeň Bukovec', 'projekt'], ['Bydlení Sklenka', 'projekt'],
    ],
    listings: [
      { t: 'Prodej domu rodinný 348 m² pozemek 943 m², Krátká, Mšec', loc: 'Krátká, Mšec', price: 17500000, st: 'top', p: ['Dům', '348 m²', 'pozemek 943 m²'], img: STARS + '/www/upload/ee4c3145/20260310190012393/20260310190012393.430x270.webp' },
      { t: 'Prodej domu chata 51 m² pozemek 158 m², Žilov', loc: 'Žilov', price: 3800000, st: 'top', p: ['Chata', '51 m²', 'pozemek 158 m²'], img: STARS + '/www/upload/ee4c3145/20260811124004792/20260811124004792.430x270.webp' },
      { t: 'Prodej domu rodinný 223 m² pozemek 941 m², Beřovice', loc: 'Beřovice', price: 11100000, st: 'top', p: ['Dům', '223 m²', 'pozemek 941 m²'], img: STARS + '/www/upload/ee4c3145/20260626072018941/20260626072018941.430x270.webp' },
      { t: 'Prodej domu rodinný 216 m² pozemek 700 m², Levínský Vršek, Králův Dvůr-Levín', loc: 'Levínský Vršek, Králův Dvůr', price: null, st: 'top', p: ['Dům', '216 m²', 'pozemek 700 m²'], img: STARS + '/www/upload/ee4c3145/20260914134006115/20260914134006115.430x270.webp' },
      { t: 'Prodej pozemku bydlení pozemek 821 m², Lidice,Kladno,Středočeský kraj', loc: 'Lidice', price: 7100000, st: 'top', p: ['Pozemek', '821 m²'], img: STARS + '/www/upload/ee4c3145/20260505074207033/20260505074207033.430x270.webp' },
      { t: 'Prodej bytu 3+1 70 m², Petrohradská, Kladno', loc: 'Petrohradská, Kladno', price: 6490000, st: 'top', p: ['Byt 3+1', '70 m²'], img: STARS + '/www/upload/ee4c3145/20260831180008826/20260831180008826.430x270.webp' },
      { t: 'Pronájem komerčních prostor kanceláře 32 m², Nádražní, Starý Plzenec', loc: 'Nádražní, Starý Plzenec', price: 7000, rent: true, st: 'top', p: ['Kancelář', '32 m²'], img: STARS + '/www/upload/ee4c3145/20260708083005582/20260708083005582.430x270.webp' },
      { t: 'Prodej domu rodinný 194 m² pozemek 447 m², Na Chlumku, Plzeň-Bukovec', loc: 'Na Chlumku, Plzeň', price: 16490000, st: 'top', p: ['Dům', '194 m²', 'pozemek 447 m²'], img: STARS + '/www/upload/ee4c3145/20260831115506647/20260831115506647.430x270.webp' },
    ],
    agents: [
      { n: 'Petr Čížek', r: 'Majitel společnosti | Certifikovaný realitní makléř senior', tel: '+420 608 500 332', mail: 'petr.cizek@nextreality.cz', img: STARS + '/www/upload/24c3bdf2/20260608150818387/20260608150818387.340x440.png' },
      { n: 'Ing. Tomáš Roček', r: 'Certifikovaný realitní makléř senior', tel: '+420 603 912 540', mail: 'tomas.rocek@nextreality.cz', img: STARS + '/www/upload/24c3bdf2/20260608151300824/20260608151300824.340x440.png' },
      { n: 'Bc. Monika Burgrová', r: 'Ředitelka kanceláře I Certifikovaný realitní makléř senior', tel: '+420 606 145 162', mail: 'monika.burgrova@nextreality.cz', img: STARS + '/www/upload/24c3bdf2/20260609163744127/20260609163744127.340x440.png' },
      { n: 'Iveta Petráčková', r: 'Certifikovaný realitní makléř senior', tel: '+420 605 700 886', mail: 'iveta.petrackova@nextreality.cz', img: STARS + '/www/upload/24c3bdf2/20260609072829373/20260609072829373.340x440.png' },
    ],
    refs: [
      { q: 'Díky profesionálnímu přístupu makléřky p.Ivety Petráčkové při prodeji nemovitosti jsem byla velmi spokojená a doporučuji její služby lidem, kteří chtějí rychlé a spolehlivé jednání při obchodování s realitami.', n: 'Miroslava Galoczová', d: '10. 9. 2026' },
      { q: 'Byli jsme velice spokojeni s makléřkou paní Ivetou Petráčkovou. Po celou dobu zajišťování pronájmu byla ochotná, vstřícná a obratem reagovala na naše potřeby a dotazy. Děkujeme !', n: 'Marie Lapková', d: '2. 9. 2026' },
      { q: 'Skvělý makléř, opakovaně výborná zkušenost.', n: 'Petr Nekvinda', d: '1. 9. 2026' },
    ],
    projects: [
      { n: 'Vila domy Plzeň Bukovec', d: 'Moderní bydlení v Plzni-Bukovci nabízí klidné prostředí obklopené zelení, rychlé spojení do centra i k dálnici a kompletní občanskou vybavenost.', img: STARS + '/www/upload/3820a704/20260810100348203/20260810100348203.680x570.qa-100.jpg' },
      { n: 'Bydlení Sklenka', d: null, img: STARS + '/www/upload/3820a704/20251217164904513/20251217164904513.680x570.qa-100.jpg' },
      { n: 'Výjimečný ranč v krajině Píseckých hor', d: null, img: STARS + '/www/upload/3820a704/20260723162708829/20260723162708829.680x570.qa-100.jpg' },
    ],
  },
};
// testovací varianta = data TGH, jiné barvy (důkaz, že přebarvení nesahá do layoutu)
window.OFFICES.test = { ...window.OFFICES.tgh, name: 'NEXT Reality (test barev)' };
