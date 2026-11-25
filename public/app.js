(() => {
  'use strict';

  const THEMES = window.DST_THEMES;
  const STORAGE_KEY = 'dst2b2-session-v2';
  const COLOURS = ['#f6d38f', '#a9dccf', '#f0b3a3', '#bcd3e6', '#f6d38f', '#a9dccf'];
  const PER_THEME = 6;
  const SEGMENT = 360 / PER_THEME;
  const RADIUS = 250;
  const SPIN_MS = matchMedia('(prefers-reduced-motion: reduce)').matches ? 400 : 4200;
  const $ = id => document.getElementById(id);
  const SVG = 'http://www.w3.org/2000/svg';

  // history: questions drawn so far, as { t: theme index, q: question index }
  let history = load();
  let theme = null;
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

  function drawWheel() {
    const svg = $('wheel');
    el('circle', { r: RADIUS + 6, fill: '#fff', stroke: '#d7e0e3', 'stroke-width': 2 }, svg);
    const rotor = el('g', { id: 'wheel-rotor' }, svg);
    for (let i = 0; i < PER_THEME; i++) {
      const group = el('g', { class: 'segment', 'data-question': i }, rotor);
      const [x0, y0] = point(i * SEGMENT, RADIUS);
      const [x1, y1] = point((i + 1) * SEGMENT, RADIUS);
      el('path', {
        d: `M0 0 L${x0} ${y0} A${RADIUS} ${RADIUS} 0 0 1 ${x1} ${y1} Z`,
        fill: COLOURS[i], stroke: '#fff', 'stroke-width': 3
      }, group);
      const [tx, ty] = point(i * SEGMENT + SEGMENT / 2, 168);
      const label = el('text', { x: tx, y: ty, 'text-anchor': 'middle', 'dominant-baseline': 'central', class: 'segment-number' }, group);
      label.textContent = i + 1;
    }
    rotor.style.transform = `rotate(${rotation}deg)`;
  }

  function drawThemes() {
    $('theme-grid').replaceChildren(...THEMES.map((item, t) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'theme-button';
      button.setAttribute('role', 'radio');
      button.dataset.theme = t;
      const number = document.createElement('span');
      number.textContent = item.id;
      button.append(number, item.name);
      button.addEventListener('click', () => choose(t));
      return button;
    }));
  }

  function refresh() {
    document.querySelectorAll('.theme-button').forEach(button => {
      const t = Number(button.dataset.theme);
      button.setAttribute('aria-checked', String(t === theme));
      button.disabled = spinning;
    });
    document.querySelectorAll('.segment').forEach(segment => {
      segment.classList.toggle('done', theme !== null && isUsed(theme, Number(segment.dataset.question)));
    });
    $('hub-number').textContent = theme === null ? '–' : THEMES[theme].id;
    $('spin').disabled = spinning || theme === null;
    $('spin-label').textContent = theme === null ? 'Choose a theme first' : 'Spin the wheel';
    $('put-back').disabled = spinning || !history.length || theme === null || history[history.length - 1].t !== theme;
    if (theme !== null) {
      const left = remainingIn(theme);
      $('wheel-note').textContent = left === PER_THEME
        ? `Theme ${THEMES[theme].id}: all 6 questions available.`
        : left === 0
          ? `Theme ${THEMES[theme].id}: all 6 questions used. The next spin starts the theme again.`
          : `Theme ${THEMES[theme].id}: ${left} of 6 questions left. Drawn questions are skipped.`;
    }
  }

  function showTheme() {
    $('card').classList.remove('has-question');
    $('theme-tag').textContent = `THEME ${THEMES[theme].id} · ${THEMES[theme].name.toUpperCase()}`;
    $('question-number').textContent = '';
    $('question').textContent = 'Spin the wheel to draw the question.';
  }

  function showQuestion(item) {
    $('card').classList.remove('spinning');
    $('card').classList.add('has-question');
    $('theme-tag').textContent = `THEME ${THEMES[item.t].id} · ${THEMES[item.t].name.toUpperCase()}`;
    $('question-number').textContent = `Question ${item.q + 1} of 6`;
    $('question').textContent = THEMES[item.t].questions[item.q];
  }

  function choose(t) {
    if (spinning) return;
    theme = t;
    showTheme();
    refresh();
  }

  function spin() {
    if (spinning || theme === null) return;
    if (remainingIn(theme) === 0) history = history.filter(item => item.t !== theme);
    const pool = THEMES[theme].questions.map((_, q) => q).filter(q => !isUsed(theme, q));
    const pick = { t: theme, q: pool[Math.floor(Math.random() * pool.length)] };

    spinning = true;
    $('card').classList.add('spinning');
    $('question-number').textContent = 'Spinning…';
    refresh();

    const target = pick.q * SEGMENT + SEGMENT * (0.2 + Math.random() * 0.6);
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
      showQuestion(pick);
      refresh();
      $('question').focus({ preventScroll: true });
    };
    rotor.addEventListener('transitionend', finish, { once: true });
    setTimeout(finish, SPIN_MS + 300);
  }

  function putBack() {
    if (spinning || !history.length || history[history.length - 1].t !== theme) return;
    history.pop();
    save();
    showTheme();
    refresh();
  }

  function newSession() {
    if (spinning) return;
    if (history.length && !confirm('Start a new exam session? Every question goes back on the wheel.')) return;
    history = [];
    save();
    if (theme !== null) showTheme();
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

  drawThemes();
  drawWheel();
  refresh();
})();
