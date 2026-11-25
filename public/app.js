(() => {
  'use strict';

  const THEMES = window.DST_THEMES;
  const COLOURS = ['#f6d38f', '#a9dccf', '#f0b3a3', '#bcd3e6', '#f6d38f', '#a9dccf'];
  const PER_THEME = 6;
  const SEGMENT = 360 / PER_THEME;
  const RADIUS = 250;
  const REDUCED = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const SPIN_MS = REDUCED ? 600 : 5200;
  const PEG = 20; // a peg every 20°, three per number
  const SOUND_KEY = 'dst2b2-sound';
  const $ = id => document.getElementById(id);
  const SVG = 'http://www.w3.org/2000/svg';

  let theme = null;
  let rotation = 0;
  let spinning = false;
  let soundOn = readSound();

  function readSound() {
    try { return localStorage.getItem(SOUND_KEY) !== 'off'; } catch { return true; }
  }

  // Sound: each peg that passes the pointer hits the rubber flapper.
  // A short filtered noise burst gives the click, a falling low tone gives the knock of the wood.
  const audio = (() => {
    let ctx = null;
    let noise = null;
    let lastTick = -Infinity;

    function ready() {
      if (!soundOn) return null;
      const Ctx = window.AudioContext || window.webkitAudioContext;
      if (!Ctx) return null;
      if (!ctx) {
        ctx = new Ctx();
        noise = ctx.createBuffer(1, Math.floor(ctx.sampleRate * 0.05), ctx.sampleRate);
        const data = noise.getChannelData(0);
        for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / data.length, 3);
      }
      if (ctx.state === 'suspended') ctx.resume();
      return ctx;
    }

    function tick(speed) {
      const c = ready();
      if (!c || c.state !== 'running') return;
      const wall = performance.now();
      if (wall - lastTick < 12) return; // very fast spins become a rattle, not a buzz
      lastTick = wall;
      const now = c.currentTime;
      const level = 0.35 + 0.25 * Math.min(1, speed);

      const click = c.createBufferSource();
      click.buffer = noise;
      click.playbackRate.value = 0.9 + Math.random() * 0.2;
      const band = c.createBiquadFilter();
      band.type = 'bandpass';
      band.frequency.value = 2600 + Math.random() * 500;
      band.Q.value = 1.4;
      const clickGain = c.createGain();
      clickGain.gain.setValueAtTime(level, now);
      clickGain.gain.exponentialRampToValueAtTime(0.001, now + 0.035);
      click.connect(band).connect(clickGain).connect(c.destination);
      click.start(now);
      click.stop(now + 0.05);

      const knock = c.createOscillator();
      knock.type = 'triangle';
      knock.frequency.setValueAtTime(520, now);
      knock.frequency.exponentialRampToValueAtTime(180, now + 0.04);
      const knockGain = c.createGain();
      knockGain.gain.setValueAtTime(level * 0.5, now);
      knockGain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);
      knock.connect(knockGain).connect(c.destination);
      knock.start(now);
      knock.stop(now + 0.06);
    }

    return { ready, tick };
  })();

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
    for (let angle = 0; angle < 360; angle += PEG) {
      const [px, py] = point(angle, RADIUS - 9);
      el('circle', { cx: px, cy: py, r: 4.5, class: 'peg' }, rotor);
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

  function renderSound() {
    $('sound').setAttribute('aria-pressed', String(soundOn));
    $('sound').textContent = soundOn ? 'Son : activé' : 'Son : coupé';
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
    const from = rotation;
    const current = ((from % 360) + 360) % 360;
    const delta = ((360 - target) - current + 720) % 360;
    const to = from + 360 * (REDUCED ? 1 : 6) + delta;
    rotation = to;
    const rotor = $('wheel-rotor');
    const pointer = document.querySelector('.wheel-pointer');
    const ease = x => 1 - Math.pow(1 - x, 3);
    const startedAt = performance.now();
    let lastPeg = Math.floor(from / PEG);
    let finished = false;
    audio.ready();

    // The pointer is a flapper: a peg pushes it aside as it approaches, then it snaps back.
    function place(angle) {
      rotor.style.transform = `rotate(${angle}deg)`;
      const phase = (angle % PEG) / PEG;
      const bend = phase > 0.6 ? (phase - 0.6) / 0.4 : 0;
      pointer.style.transform = `translateX(-50%) rotate(${-bend * 22}deg)`;
    }

    const finish = () => {
      if (finished) return;
      finished = true;
      place(to);
      spinning = false;
      $('card').classList.remove('spinning');
      $('card').classList.add('has-question');
      $('question-number').textContent = `Question ${pick + 1} sur 6`;
      $('question').lang = 'en';
      $('question').textContent = THEMES[t].questions[pick];
      refresh();
      $('question').focus({ preventScroll: true });
    };

    function frame(now) {
      if (finished) return;
      const x = Math.min(1, (now - startedAt) / SPIN_MS);
      const angle = from + (to - from) * ease(x);
      const peg = Math.floor(angle / PEG);
      if (peg !== lastPeg) {
        lastPeg = peg;
        audio.tick(3 * Math.pow(1 - x, 2));
      }
      place(angle);
      if (x < 1) requestAnimationFrame(frame);
      else finish();
    }
    requestAnimationFrame(frame);
    setTimeout(finish, SPIN_MS + 1500); // if the tab is hidden and frames stop
  }

  $('spin').addEventListener('click', spin);
  $('sound').addEventListener('click', () => {
    soundOn = !soundOn;
    try { localStorage.setItem(SOUND_KEY, soundOn ? 'on' : 'off'); } catch { /* private mode */ }
    renderSound();
    if (soundOn) audio.tick(0.5);
  });
  document.addEventListener('keydown', event => {
    if (event.code !== 'Space' || event.repeat) return;
    if (event.target.closest('button, select, input, textarea')) return;
    event.preventDefault();
    spin();
  });

  drawThemes();
  drawWheel();
  renderSound();
  refresh();
})();
