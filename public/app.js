(() => {
  'use strict';

  const THEMES = window.DST_THEMES;
  const COLOURS = ['#f6d38f', '#a9dccf', '#f0b3a3', '#bcd3e6', '#f6d38f', '#a9dccf'];
  const PER_THEME = 6;
  const SEGMENT = 360 / PER_THEME;
  const RADIUS = 250;
  const SPIN_MS = matchMedia('(prefers-reduced-motion: reduce)').matches ? 400 : 4200;
  const $ = id => document.getElementById(id);
  const SVG = 'http://www.w3.org/2000/svg';

  let theme = null;
  let rotation = 0;
  let spinning = false;

  function point(angle, radius) {
    const rad = angle * Math.PI / 180;
    return [radius * Math.sin(rad), -radius * Math.cos(rad)];
  }

  function el(name, attrs, parent) {
    const node = document.createElementNS(SVG, name);
    Object.entries(attrs).forEach(([key, value]) => node.setAttribute(key, value));
    parent.appendChild(node);
    return node;
  }

  function drawWheel() {
    const svg = $('wheel');
    el('circle', { r: RADIUS + 6, fill: '#fff', stroke: '#d7e0e3', 'stroke-width': 2 }, svg);
    const rotor = el('g', { id: 'wheel-rotor' }, svg);
    for (let i = 0; i < PER_THEME; i++) {
      const [x0, y0] = point(i * SEGMENT, RADIUS);
      const [x1, y1] = point((i + 1) * SEGMENT, RADIUS);
      el('path', {
        d: `M0 0 L${x0} ${y0} A${RADIUS} ${RADIUS} 0 0 1 ${x1} ${y1} Z`,
        fill: COLOURS[i], stroke: '#fff', 'stroke-width': 3
      }, rotor);
      const [tx, ty] = point(i * SEGMENT + SEGMENT / 2, 168);
      const label = el('text', { x: tx, y: ty, 'text-anchor': 'middle', 'dominant-baseline': 'central', class: 'segment-number' }, rotor);
      label.textContent = i + 1;
    }
  }

  function drawThemes() {
    $('theme-grid').replaceChildren(...THEMES.map((item, t) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'theme-button';
      button.setAttribute('role', 'radio');
      button.setAttribute('aria-checked', 'false');
      button.dataset.theme = t;
      const number = document.createElement('span');
      number.textContent = item.id;
      const name = document.createElement('em');
      name.lang = 'en';
      name.textContent = item.name;
      button.append(number, name);
      button.addEventListener('click', () => choose(t));
      return button;
    }));
  }

  function refresh() {
    document.querySelectorAll('.theme-button').forEach(button => {
      button.setAttribute('aria-checked', String(Number(button.dataset.theme) === theme));
      button.disabled = spinning;
    });
    $('hub-number').textContent = theme === null ? '–' : THEMES[theme].id;
    $('spin').disabled = spinning || theme === null;
    $('spin-label').textContent = theme === null ? 'Choisissez d’abord un thème' : 'Lancer la roue';
  }

  function setTag(t) {
    const tag = $('theme-tag');
    const name = document.createElement('span');
    name.lang = 'en';
    name.textContent = THEMES[t].name.toUpperCase();
    tag.replaceChildren(`THÈME ${THEMES[t].id} · `, name);
  }

  function choose(t) {
    if (spinning) return;
    theme = t;
    setTag(t);
    $('card').classList.remove('has-question');
    $('question-number').textContent = '';
    $('question').lang = 'fr';
    $('question').textContent = 'Lancez la roue pour tirer la question.';
    refresh();
  }

  function spin() {
    if (spinning || theme === null) return;
    const pick = Math.floor(Math.random() * PER_THEME);
    const t = theme;

    spinning = true;
    $('card').classList.add('spinning');
    $('question-number').textContent = 'La roue tourne…';
    refresh();

    const target = pick * SEGMENT + SEGMENT * (0.2 + Math.random() * 0.6);
    const current = ((rotation % 360) + 360) % 360;
    const delta = ((360 - target) - current + 720) % 360;
    rotation += 360 * 5 + delta;
    const rotor = $('wheel-rotor');
    rotor.style.transition = `transform ${SPIN_MS}ms cubic-bezier(.12,.62,.16,1)`;
    rotor.style.transform = `rotate(${rotation}deg)`;

    let finished = false;
    const finish = () => {
      if (finished) return;
      finished = true;
      spinning = false;
      $('card').classList.remove('spinning');
      $('card').classList.add('has-question');
      $('question-number').textContent = `Question ${pick + 1} sur 6`;
      $('question').lang = 'en';
      $('question').textContent = THEMES[t].questions[pick];
      refresh();
      $('question').focus({ preventScroll: true });
    };
    rotor.addEventListener('transitionend', finish, { once: true });
    setTimeout(finish, SPIN_MS + 300);
  }

  $('spin').addEventListener('click', spin);
  $('fullscreen').addEventListener('click', () => {
    if (document.fullscreenElement) document.exitFullscreen();
    else document.documentElement.requestFullscreen?.();
  });
  document.addEventListener('fullscreenchange', () => {
    $('fullscreen').textContent = document.fullscreenElement ? 'Quitter le plein écran' : 'Plein écran';
  });
  document.addEventListener('keydown', event => {
    if (event.code !== 'Space' || event.repeat) return;
    if (event.target.closest('button, select, input, textarea')) return;
    event.preventDefault();
    spin();
  });

  drawThemes();
  drawWheel();
  refresh();
})();
