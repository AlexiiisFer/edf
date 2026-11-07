// Petites chorégraphies d'interface basées sur Anime.js v4 (public/vendor).
// Tout est facultatif : sans Anime.js ou avec « réduire les animations », l'UI reste statique.
(function () {
  const A = window.anime;
  const reduce = (() => { try { return matchMedia('(prefers-reduced-motion: reduce)').matches; } catch { return false; } })();
  const on = !!A && !reduce;

  const UI = {
    on,
    // Entrée en cascade : opacité + léger glissement
    enter(targets, { y = 18, x = 0, duration = 650, stagger = 60, delay = 0 } = {}) {
      if (!on) return;
      const els = typeof targets === 'string' ? document.querySelectorAll(targets) : targets;
      if (!els || (els.length === 0)) return;
      A.animate(els, { opacity: [0, 1], y: [y, 0], x: [x, 0], duration, ease: 'out(4)', delay: A.stagger(stagger, { start: delay }) });
    },
    // Apparition « ressort »
    pop(targets, { delay = 0, stagger = 40 } = {}) {
      if (!on) return;
      const els = typeof targets === 'string' ? document.querySelectorAll(targets) : targets;
      if (!els || els.length === 0) return;
      A.animate(els, { scale: [0, 1], opacity: [0, 1], duration: 700, ease: 'outElastic(1, .6)', delay: A.stagger(stagger, { start: delay }) });
    },
    // Petit rebond quand une valeur change
    bump(el, k = 1.16) {
      if (!on || !el) return;
      A.animate(el, { scale: [1, k, 1], duration: 520, ease: 'out(3)' });
    },
    // Fait défiler une ou plusieurs valeurs numériques jusqu'à leur cible.
    // render(values) renvoie le texte à afficher.
    tween(el, to, render, duration = 900) {
      if (!el) return;
      to = [].concat(to).map(Number);
      const prev = el._twTarget;
      if (prev && prev.length === to.length && prev.every((v, i) => v === to[i])) return;
      el._twTarget = to;
      if (!on || !el._twCur) {
        el._twCur = Object.fromEntries(to.map((v, i) => ['v' + i, on ? 0 : v]));
        if (!on) { el.textContent = render(to); return; }
      }
      if (el._twAnim) el._twAnim.pause();
      const cur = el._twCur;
      el._twAnim = A.animate(cur, {
        ...Object.fromEntries(to.map((v, i) => ['v' + i, v])),
        duration, ease: 'out(3)',
        onUpdate: () => { el.textContent = render(to.map((_, i) => cur['v' + i])); },
        onComplete: () => { el.textContent = render(to); },
      });
    },
    // Montre une vue puis anime ses enfants directs
    reveal(section, selector = ':scope > *') {
      if (!on || !section) return;
      UI.enter(section.querySelectorAll(selector), { y: 22, stagger: 55 });
    },
    // Découpe un titre en mots pour une entrée mot à mot
    words(el, opts = {}) {
      if (!el) return;
      const text = el.textContent;
      el.setAttribute('aria-label', text);
      el.innerHTML = text.split(/( +)/).map(w => /^ +$/.test(w) ? w : `<span class="w" aria-hidden="true" style="display:inline-block">${w.replace(/&/g, '&amp;').replace(/</g, '&lt;')}</span>`).join('');
      UI.enter(el.querySelectorAll('.w'), { y: 40, stagger: 70, duration: 900, ...opts });
    },
    // Dessine les tracés SVG (stroke)
    draw(targets, { duration = 1400, delay = 0 } = {}) {
      if (!on || !A.svg) return;
      A.animate(A.svg.createDrawable(targets), { draw: ['0 0', '0 1'], duration, delay: A.stagger(90, { start: delay }), ease: 'inOut(3)' });
    },
  };
  // En-tête EDF : bande bleue qui part du haut à gauche et descend en courbe vers la droite, soulignée d'une ligne orange.
  // left = hauteur du bord à gauche (0 à 1) ; la courbe finit en bas à droite.
  UI.brandWave = function ({ left = 0, className = '', fit = '', variant = '' } = {}) {
    const y0 = Math.round(left * 100), mid = Math.round(y0 + (100 - y0) * .18);
    const wrap = document.createElement('div');
    wrap.className = 'brand-wave ' + className;
    wrap.setAttribute('aria-hidden', 'true');
    // variant 'card' : bord presque plat, légère courbe à gauche (le logo reste entier) et courbe qui plonge à droite.
    const fill = variant === 'card'
      ? `M0,0 H1000 V108 C1000,78 920,64 720,64 H130 C55,64 0,40 0,0 Z`
      : `M0,0 H1000 V100 C660,100 320,${mid} 0,${y0} Z`;
    const line = variant === 'card'
      ? `M3,0 C3,46 58,70 130,70 H720 C905,70 994,82 994,112`
      : `M0,${y0 + 7} C320,${mid + 7} 660,107 1000,107`;
    wrap.innerHTML = `<svg viewBox="0 0 1000 112" preserveAspectRatio="none">
      <path class="bw-fill" d="${fill}"/>
      <path class="bw-line" pathLength="1" d="${line}"/></svg>`;
    const sky = document.querySelector('.sky');
    sky ? sky.after(wrap) : document.body.prepend(wrap);
    // fit : la bande s'ajuste à la première ligne visible (logo, étapes, onglets) pour qu'elle tienne entièrement dans le bleu.
    if (fit) {
      const resize = () => {
        const row = [...document.querySelectorAll(fit)].find(el => el.offsetParent !== null);
        if (!row) return;
        row.style.marginBottom = '';
        const r = row.getBoundingClientRect(), bottom = r.bottom + 12, h = Math.round(bottom / Math.max(left, .3));
        wrap.style.height = h + 'px';
        const mb = parseFloat(getComputedStyle(row).marginBottom) || 0;
        row.style.marginBottom = Math.max(mb, h - r.bottom + 8) + 'px';
      };
      resize();
      addEventListener('resize', resize);
      document.fonts?.ready.then(resize);
      new MutationObserver(resize).observe(document.body, { subtree: true, attributes: true, attributeFilter: ['class', 'hidden'] });
    }
    return wrap;
  };
  window.UI = UI;
})();
