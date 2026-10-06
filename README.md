# NEXT Reality – PRÉMIOVÁ VERZE (HTML předloha)

Druhá varianta jednotného design systemu NEXT Reality – prémiovější, editoriální, „ala Svoboda & Williams / Vynosium“.
Vznikla, aby klient mohl proklikat **obě verze stejnou cestou** a vybrat směr.

- **Online:** https://grafika-imptest.github.io/nextreality-premium/prehled.html
- **Standardní verze:** https://grafika-imptest.github.io/nextreality-ds/prehled.html · repo https://github.com/grafika-imptest/nextreality-ds
- **Přepínač verzí:** panel „Předloha · kontrola“ vpravo nahoře → Standardní / Prémiová. Zachová stránku, filtry i kancelář.

Lokálně: `node dev.js` → http://localhost:5196/prehled.html (standardní verze běží na 5194, přepínač počítá s oběma porty).
`?nomotion` vypne animace (pro screenshoty a testy) · `?office=tgh|stars|test` · `?clean` · `?grid`.

Aktualizace webu po změně v `site/`:
```bash
git subtree split --prefix site -b gh-pages && git push -f origin gh-pages
```

## Co je stejné a co jiné
| | Standardní | Prémiová |
|---|---|---|
| Data, logika (filtry, mapa, galerie, průvodce odhadem, kalkulačka) | ✓ | ✓ shodné (`core.js`, `listing.js`, `detail.js`, `prodat.js`) |
| Vizuální jazyk | světlý, funkční | dvě atmosféry: INK (tmavé „kino“) a PAPER (velmi světlá neutrální šedá #F3F4F5, „dokument“) |
| Písmo | DM Sans | DM Sans + **Instrument Serif** (editoriální nadpisy) |
| Homepage | seznam sekcí | příběh v 9 kapitolách: teze → úvod a čísla → vodorovná galerie nabídky → index kategorií → prodej → projekty → lidé → reference → závěr |
| Detail nemovitosti | galerie + 2 sloupce | filmová hlavička přes celou šířku (fotka, H1, cena, video), lepící podnavigace s cenou a „Mám zájem“, přehled velkými čísly |
| Pohyb | žádný | Lenis (plynulý scroll) + GSAP ScrollTrigger + SplitType |
| Tvary | rádius 8/12 px, jemné stíny | jen 2 rádiusy (999 px interakce, 4 px média), **bez stínů**, 1px linky |
| Karta nemovitosti | rámeček, štítek „Volný“ | bez rámečku, lokalita serifem, „Volný“ se neštítkuje (štítkují se jen výjimky) |

Soubory navíc oproti standardu: `premium.css` (vizuální vrstva, načítá se poslední), `home.css` (kompozice homepage), `motion.js` (pohyb), `assets/agents/` (portréty makléřů).

## Pravidla prémiové verze
1. **Brand zůstává.** Zelená NEXT #85B929 je jediný akcent. Na bílé neprošla kontrastem (2,3 : 1) – na tmavé INK #0D1A24 má **7,3 : 1**, proto je prémiová verze postavená na tmavých kapitolách a zelená je v nich čitelná (kurzíva v nadpisech, čísla, linky).
2. **Velká typografie jen v editoriálu** (dohoda 6. 10. 2026): hero homepage až 144 px fluidně. **Funkční stránky drží zadání** – H1 ≤ 48 px na všech šířkách (ověřeno měřením), 4 karty v řadě na výpisu, základ 16 px, první nemovitost nad ohybem.
3. **Pohyb jen s účelem.** Spouštěné animace ease-out (expo / power4), scrubované lineární, stagger 0,06–0,12 s, odhalení 1,1 s. Funkční obsah (výsledky výpisu, filtry, formuláře) se neanimuje.
4. **Přístupnost a výkon:** `prefers-reduced-motion` vypne plynulý scroll i odhalování. Když se knihovny z CDN nenačtou, obsah se zobrazí bez animace (pojistka 2,5 s). Mapy, galerie a panely mají vlastní scroll (Lenis do nich nezasahuje). Bez WebGL – kvůli výkonu na mobilu a kolísavé kvalitě fotek z CRM.

## Motion specifikace
| Prvek | Spouštěč | Animace |
|---|---|---|
| Nadpisy `[data-split]` | vstup do obrazovky (88 %) | řádky vyjíždějí zpod masky, 1,1 s power4.out, stagger 0,09 s |
| Prvky `[data-reveal]` | vstup (92 %) | opacity 0→1 + posun 32 px, 1,1 s expo.out, ve skupině stagger 0,08 s |
| Obrázky `[data-clip]` | vstup (85 %) | maska clip-path 12 % → 0, obrázek 1,18 → 1, 1,4–1,8 s |
| Hero / závěr / detail `[data-parallax]` | scroll (scrub) | posun fotky ±9 %, lineárně |
| Úvodní věta `[data-words]` | scroll (scrub) | slova se rozsvěcují 0,16 → 1 |
| Čísla `[data-count]` | vstup | dopočítání 1,6 s power3.out |
| Vybrané nemovitosti | desktop s myší | sekce se připne a scroll posouvá galerii vodorovně; na dotyku nativní swipe se snapem |
| Index kategorií | najetí myší | fotka typu nemovitosti sleduje kurzor (quickTo 0,6 s) |
| Makléři | najetí / fokus / na dotyku doscrollování doprostřed | prolnutí neutrálního portrétu do úsměvu: zpoždění 0,3 s, 1,6 s ease-in-out; návrat 0,9 s |
| Hlavička | homepage + detail | průhledná nad tmavou fotkou, po odscrollování pevná |

## Portréty makléřů – úprava výrazu (Magnific)
Na homepage TGH se makléři po najetí myší jemně usmějí. Páry obrázků (`assets/agents/*-a.jpg` výchozí, `*-b.jpg` úsměv) mají stejný výřez, takže jde jen o prolnutí.
- Upraveno v Magnificu modelem Google Nano Banana Pro, 10 generací × 75 kreditů = 750 kreditů (účet IMP net Grafika). Béžové pozadí fotek je lokálně přebarvené na šedou paletu webu.
- Böhm a Hornych: originál = neutrální, **úsměv je AI úprava**. Procházková a Hes se na originálních fotkách usmívají: **neutrální výchozí stav je AI úprava**, úsměv je jejich skutečná fotka.
- ⚠️ **Před nasazením do produkce musí s upravenými portréty souhlasit dotčení makléři.** Jde o změnu podoby skutečných lidí. Pro ostatní makléře (včetně Stars) páry zatím nejsou – karta ukáže běžnou fotku.

## Rizika prémiové verze
- **Stojí na fotkách.** Velké formáty potřebují kvalitní snímky – z CRM jdou v proměnné kvalitě (Stars karty jen 430×270). Hero homepage TGH je proto stock fotka Prahy při západu slunce (Magnific, premium licence, autor tan4ikk, 150 kreditů, `assets/hero-praha-*.jpg`), detail používá galerii zakázky; u slabých fotek bude prémiový dojem horší než ve standardní verzi.
- **Licence hero fotky:** stažena v rámci tarifu Magnific Pro účtu IMP net Grafika – před produkcí ověřit, že licence pokrývá použití na webu klienta.
- **Víc JavaScriptu:** GSAP + ScrollTrigger + Lenis + SplitType ≈ 100 kB (gzip ~40 kB) navíc, načítané `defer`. Funkce webu na nich nezávisí.
- **Vyšší náklady na vývoj a údržbu** (animace, dvě atmosféry, kontrola čitelnosti na fotkách). Pro šablonu, která se nasazuje na všechny pobočky, je to rozhodnutí o ceně, ne jen o vkusu.
- Reference, data a zjištění k CMS/CRM jsou shodné se standardní verzí – viz její README.
