// Prémiová verze – pohyb. Lenis (plynulý scroll) + GSAP ScrollTrigger + SplitType.
// Zákony pohybu (převzato z projektu Vynosium):
//  - scrubované animace jsou lineární, spouštěné používají ease-out (expo/power4.out), nic jen „in“
//  - stagger 0,06–0,12 s, odhalení 1,1 s, nic nad 1,6 s bez vazby na scroll
//  - prefers-reduced-motion = žádný smooth scroll, žádné odhalování (obsah je hned vidět)
//  - když se knihovny z CDN nenačtou, obsah se ukáže bez animace (třída js-motion se odebere)
(function () {
  // průhledná hlavička nad tmavým hero → pevná po odscrollování (nezávisle na animacích)
  const hero = document.querySelector('[data-over-hero]');
  if (hero) {
    document.body.classList.add('has-over-hero');
    const sentinel = document.createElement('div');
    sentinel.style.cssText = 'position:absolute;left:0;width:1px;height:1px;pointer-events:none;bottom:80px';
    hero.appendChild(sentinel);
    new IntersectionObserver(([en]) => document.querySelector('.header')?.classList.toggle('is-solid', !en.isIntersecting)).observe(sentinel);
  }

  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches || new URLSearchParams(location.search).has('nomotion');
  const html = document.documentElement;
  if (reduce || !window.gsap || !window.ScrollTrigger) { html.classList.remove('js-motion'); window.MOTION = { refresh() {} }; return; }
  gsap.registerPlugin(ScrollTrigger);

  // --- plynulý scroll (jen myš/trackpad; dotyk zůstává nativní) ---
  let lenis = null;
  if (window.Lenis) {
    lenis = new Lenis({ duration: 1.15, easing: t => 1 - Math.pow(1 - t, 4), smoothWheel: true });
    lenis.on('scroll', ScrollTrigger.update);
    gsap.ticker.add(t => lenis.raf(t * 1000));
    gsap.ticker.lagSmoothing(0);
    document.addEventListener('click', e => {
      const a = e.target.closest('a[href^="#"]');
      if (!a || a.getAttribute('href').length < 2) return;
      const t = document.querySelector(a.getAttribute('href'));
      if (t) { e.preventDefault(); lenis.scrollTo(t, { offset: -parseInt(getComputedStyle(html).getPropertyValue('--header-h')) - 8 }); }
    });
    // zamčení scrollu při otevřeném dialogu (filtry, galerie, menu)
    new MutationObserver(() => (document.body.style.overflow === 'hidden' ? lenis.stop() : lenis.start())).observe(document.body, { attributes: true, attributeFilter: ['style'] });
  }

  const once = (el, k) => (el.dataset['m' + k] ? false : (el.dataset['m' + k] = 1));
  function init(root = document) {
    // podstránky: editoriální odhalení jen u hlavních nadpisů (funkční obsah zůstává okamžitý)
    document.querySelectorAll('.page-hero h1, .sg-sec > h2, .dsec > h2, .profile h1, .notfound h1').forEach(h => { if (!h.hasAttribute('data-split')) h.setAttribute('data-split', ''); });
    // vlastní scroll (mapa, galerie, filtry, našeptávač) – Lenis do nich nezasahuje
    document.querySelectorAll('#map, #d-map, #pr-map, .leaflet-container, .lightbox, .filters, .suggest__list, .drawer, .lightbox__thumbs').forEach(el => el.setAttribute('data-lenis-prevent', ''));
    // nadpisy po řádcích – maska zdola
    root.querySelectorAll('[data-split]').forEach(el => {
      if (!once(el, 's') || !window.SplitType) return;
      const s = new SplitType(el, { types: 'lines' });
      s.lines.forEach(l => { const w = document.createElement('span'); w.className = 'split-line'; l.parentNode.insertBefore(w, l); w.appendChild(l); });
      gsap.from(s.lines, { yPercent: 110, duration: 1.1, ease: 'power4.out', stagger: 0.09, delay: +el.dataset.delay || 0,
        scrollTrigger: el.dataset.split === 'now' ? null : { trigger: el, start: 'top 88%' } });
    });
    // prvky – vyjetí zdola, skupiny se staggerem
    root.querySelectorAll('[data-reveal]').forEach(el => {
      if (!once(el, 'r')) return;
      const grp = el.closest('[data-reveal-group]');
      const i = grp ? [...grp.querySelectorAll('[data-reveal]')].indexOf(el) : 0;
      gsap.to(el, { opacity: 1, y: 0, duration: 1.1, ease: 'expo.out', delay: (i % 6) * 0.08 + (+el.dataset.delay || 0),
        scrollTrigger: { trigger: el, start: 'top 92%' } });
    });
    // obrázky – odhalení maskou + jemné oddálení
    root.querySelectorAll('[data-clip]').forEach(el => {
      if (!once(el, 'c')) return;
      const img = el.querySelector('img');
      const tl = gsap.timeline({ scrollTrigger: { trigger: el, start: 'top 85%' } });
      tl.to(el, { clipPath: 'inset(0% 0 0% 0)', duration: 1.4, ease: 'expo.out' });
      if (img) tl.from(img, { scale: 1.18, duration: 1.8, ease: 'expo.out' }, 0);
    });
    // parallax – scrub, lineární
    root.querySelectorAll('[data-parallax]').forEach(el => {
      if (!once(el, 'p')) return;
      const amt = +el.dataset.parallax || 0.15;
      gsap.fromTo(el, { yPercent: -amt * 50 }, { yPercent: amt * 50, ease: 'none', scrollTrigger: { trigger: el.parentElement, start: 'top bottom', end: 'bottom top', scrub: true } });
    });
    // statement – slova se rozsvěcují se scrollem
    root.querySelectorAll('[data-words]').forEach(el => {
      if (!once(el, 'w') || !window.SplitType) return;
      const s = new SplitType(el, { types: 'words' });
      gsap.fromTo(s.words, { opacity: 0.16 }, { opacity: 1, stagger: 0.1, ease: 'none', scrollTrigger: { trigger: el, start: 'top 78%', end: 'bottom 45%', scrub: true } });
    });
    // počítadla
    root.querySelectorAll('[data-count]').forEach(el => {
      if (!once(el, 'n')) return;
      const to = +el.dataset.count, o = { v: 0 };
      gsap.to(o, { v: to, duration: 1.6, ease: 'power3.out', scrollTrigger: { trigger: el, start: 'top 90%' },
        onUpdate: () => (el.textContent = Math.round(o.v).toLocaleString('cs-CZ')) });
    });
    // vodorovná galerie – na desktopu připnutá a řízená scrollem, na dotyku nativní swipe
    root.querySelectorAll('[data-hscroll]').forEach(sec => {
      if (!once(sec, 'h')) return;
      const track = sec.querySelector('[data-track]');
      gsap.matchMedia().add('(min-width: 1024px) and (pointer: fine)', () => {
          const dist = () => Math.max(0, track.scrollWidth - track.clientWidth);
          sec.classList.add('is-pinned');
          const tw = gsap.to(track, { x: () => -dist(), ease: 'none', scrollTrigger: { trigger: sec, start: 'top top', end: () => '+=' + dist(), pin: true, scrub: 0.6, invalidateOnRefresh: true,
            onUpdate: s => sec.style.setProperty('--p', s.progress) } });
          return () => { sec.classList.remove('is-pinned'); gsap.set(track, { x: 0 }); };
      });
    });
    // index kategorií – obrázek následuje kurzor
    root.querySelectorAll('[data-hover-list]').forEach(list => {
      if (!once(list, 'i') || !matchMedia('(pointer: fine)').matches) return;
      const fig = list.querySelector('.hover-fig');
      const xTo = gsap.quickTo(fig, 'x', { duration: 0.6, ease: 'power3' }), yTo = gsap.quickTo(fig, 'y', { duration: 0.6, ease: 'power3' });
      list.addEventListener('mousemove', e => { const r = list.getBoundingClientRect(); xTo(e.clientX - r.left); yTo(e.clientY - r.top); });
      list.querySelectorAll('[data-img]').forEach(row => row.addEventListener('mouseenter', () => {
        fig.querySelector('img').src = row.dataset.img; gsap.to(fig, { opacity: 1, scale: 1, duration: 0.5, ease: 'expo.out' });
      }));
      list.addEventListener('mouseleave', () => gsap.to(fig, { opacity: 0, scale: 0.85, duration: 0.4, ease: 'expo.out' }));
    });
    ScrollTrigger.refresh();
  }

  window.MOTION = { refresh: root => init(root), lenis };
  const start = () => init();
  if (document.readyState === 'complete') start(); else addEventListener('load', start);
  document.addEventListener('rendered', () => requestAnimationFrame(() => init()));
})();
