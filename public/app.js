(() => {
  'use strict';

  const THEMES = window.DST_THEMES;
  const STORAGE_KEY = 'dst2b2-session-v1';
  const COLOURS = ['#f6d38f', '#a9dccf', '#f0b3a3', '#bcd3e6'];
  const SEGMENT = 360 / THEMES.length;
  const RADIUS = 250;
  const SPIN_MS = matchMedia('(prefers-reduced-motion: reduce)').matches ? 400 : 4200;
  const TOTAL = THEMES.reduce((sum, theme) => sum + theme.questions.length, 0);
  const $ = id => document.getElementById(id);
  const SVG = 'http://www.w3.org/2000/svg';

  let history = load();
  let rotation = 0;
  let spinning = false;

  function load() {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
      return Array.isArray(saved)
        ? saved.filter(item => THEMES[item.t] && THEMES[item.t].questions[item.q])
        : [];
    } catch {
      return [];
    }
  }

  function save() {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(history)); } catch { /* private mode */ }
  }

  const isUsed = (t, q) => history.some(item => item.t === t && item.q === q);
  const remainingIn = t => THEMES[t].questions.filter((_, q) => !isUsed(t, q)).length;

  function point(angle, radius) {
    const rad = angle * Math.PI / 180;
    return [radius * Math.sin(rad), -radius * Math.cos(rad)];
  }

  function el(name, attrs, parent) {
    const node = document.createElementNS(SVG, name);
    Object.entries(attrs).forEach(([key, value]) => node.setAttribute(key, value));
    if (parent) parent.appendChild(node);
    return node;
  }

  function splitName(name) {
    if (name.length <= 13) return [name];
    const words = name.split(' ');
    const half = Math.ceil(words.length / 2);
    return [words.slice(0, half).join(' '), words.slice(half).join(' ')];
  }

  function drawWheel() {
    const svg = $('wheel');
    svg.replaceChildren();
    el('circle', { r: RADIUS + 6, fill: '#fff', stroke: '#d7e0e3', 'stroke-width': 2 }, svg);
    const rotor = el('g', { id: 'wheel-rotor' }, svg);
    THEMES.forEach((theme, i) => {
      const group = el('g', { class: 'segment', 'data-theme': i }, rotor);
      const [x0, y0] = point(i * SEGMENT, RADIUS);
      const [x1, y1] = point((i + 1) * SEGMENT, RADIUS);
      el('path', {
        d: `M0 0 L${x0} ${y0} A${RADIUS} ${RADIUS} 0 0 1 ${x1} ${y1} Z`,
        fill: COLOURS[i % COLOURS.length], stroke: '#fff', 'stroke-width': 2
      }, group);
      const centre = i * SEGMENT + SEGMENT / 2;
      const label = el('g', { transform: `rotate(${centre - 90})` }, group);
      const number = el('text', { x: 232, y: 0, 'text-anchor': 'middle', 'dominant-baseline': 'central', class: 'segment-number' }, label);
      number.textContent = theme.id;
      const lines = splitName(theme.name);
      const text = el('text', { x: 214, y: 0, 'text-anchor': 'end', class: 'segment-label' }, label);
      lines.forEach((line, n) => {
        const span = el('tspan', { x: 214, dy: n === 0 ? (lines.length === 1 ? '0.35em' : '-0.25em') : '1.15em' }, text);
        span.textContent = line;
      });
    });
    rotor.style.transform = `rotate(${rotation}deg)`;
    refresh();
  }

  function refresh() {
    const left = TOTAL - history.length;
    $('progress').textContent = `${left} / ${TOTAL} questions left`;
    document.querySelectorAll('.segment').forEach(segment => {
      segment.classList.toggle('done', remainingIn(Number(segment.dataset.theme)) === 0);
    });
    $('spin').disabled = spinning || left === 0;
    if (left === 0 && !spinning) $('spin').lastChild.textContent = 'All questions drawn';
    else $('spin').lastChild.textContent = 'Spin the wheel';
    $('put-back').disabled = spinning || history.length === 0;

  }

  function show(item) {
    const card = $('card');
    if (!item) {
      $('theme-tag').textContent = 'READY';
      $('question-number').textContent = '';
      $('question').textContent = history.length === TOTAL
        ? 'All 72 questions have been drawn.'
        : 'Spin the wheel to draw a question.';
      return;
    }
    const theme = THEMES[item.t];
    $('theme-tag').textContent = `THEME ${theme.id} · ${theme.name.toUpperCase()}`;
    $('question-number').textContent = `Question ${item.q + 1} of 6`;
    $('question').textContent = theme.questions[item.q];
    card.classList.remove('spinning');
  }

  function spin() {
    if (spinning) return;
    const pool = [];
    THEMES.forEach((theme, t) => theme.questions.forEach((_, q) => { if (!isUsed(t, q)) pool.push({ t, q }); }));
    if (!pool.length) return;
    const pick = pool[Math.floor(Math.random() * pool.length)];

    spinning = true;
    $('card').classList.add('spinning');
    $('theme-tag').textContent = 'SPINNING…';
    $('question-number').textContent = '';
    refresh();

    const target = pick.t * SEGMENT + SEGMENT * (0.18 + Math.random() * 0.64);
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
      history.push(pick);
      save();
      show(pick);
      refresh();
      $('question').focus({ preventScroll: true });
    };
    rotor.addEventListener('transitionend', finish, { once: true });
    setTimeout(finish, SPIN_MS + 300);
  }

  function putBack() {
    if (spinning || !history.length) return;
    history.pop();
    save();
    show(null);
    refresh();
  }

  function newSession() {
    if (spinning) return;
    if (history.length && !confirm('Start a new exam session? Every question goes back on the wheel.')) return;
    history = [];
    save();
    show(null);
    refresh();
  }


  $('spin').addEventListener('click', spin);
  $('put-back').addEventListener('click', putBack);
  $('reset').addEventListener('click', newSession);
  $('fullscreen').addEventListener('click', () => {
    if (document.fullscreenElement) document.exitFullscreen();
    else document.documentElement.requestFullscreen?.();
  });
  document.addEventListener('fullscreenchange', () => {
    $('fullscreen').textContent = document.fullscreenElement ? 'Exit full screen' : 'Full screen';
  });
  document.addEventListener('keydown', event => {
    if (event.code !== 'Space' || event.repeat) return;
    if (event.target.closest('button, select, input, textarea')) return;
    event.preventDefault();
    spin();
  });

  drawWheel();
  show(history[history.length - 1] || null);
})();
