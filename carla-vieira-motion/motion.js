// Carla Vieira Tours — motion piece.
// Every visual is a pure function of time `t` (seconds) so frames can be rendered
// deterministically: window.renderFrame(t). Size comes from ?w=&h= (default 1920x1080).

(() => {
  const qs = new URLSearchParams(location.search);
  const W = +qs.get('w') || 1920;
  const H = +qs.get('h') || 1080;
  const PORTRAIT = H > W;
  // vertical canvases get a slightly larger unit so type fills the tall frame
  const U = PORTRAIT ? W * 0.0125 : Math.min(W, H) / 100;

  const stage = document.getElementById('stage');
  stage.style.width = W + 'px';
  stage.style.height = H + 'px';
  document.documentElement.style.setProperty('--u', U + 'px');
  if (PORTRAIT) document.body.classList.add('portrait');

  // ---------- helpers ----------
  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  const lerp = (a, b, p) => a + (b - a) * p;
  const prog = (t, a, b) => clamp((t - a) / (b - a));
  const eOut3 = (p) => 1 - Math.pow(1 - p, 3);
  const eOut5 = (p) => 1 - Math.pow(1 - p, 5);
  const eIn3 = (p) => p * p * p;
  const eIO3 = (p) => (p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2);
  const eOutBack = (p) => { const c = 1.6; return 1 + (c + 1) * Math.pow(p - 1, 3) + c * Math.pow(p - 1, 2); };
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const NS = 'http://www.w3.org/2000/svg';
  const svgEl = (tag, attrs = {}, parent) => {
    const el = document.createElementNS(NS, tag);
    for (const k in attrs) el.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(el);
    return el;
  };

  // Masked line reveal: rises in during [a, a+d], exits upward during [x, x+d2].
  function rise(span, t, a, d = 0.7, x = Infinity, d2 = 0.45) {
    const pin = eOut5(prog(t, a, a + d));
    const pout = eIn3(prog(t, x, x + d2));
    const y = (1 - pin) * 110 - pout * 110;
    span.style.transform = `translateY(${y}%)`;
  }

  // ---------- timeline ----------
  const SCENES = [
    { id: 's1', a: 0, b: 5.0 },
    { id: 's2', a: 5.0, b: 11.6 },
    { id: 's3', a: 11.6, b: 16.6 },
    { id: 's4', a: 16.6, b: 21.6 },
    { id: 's5', a: 21.6, b: 25.0 },
    { id: 's6', a: 25.0, b: 29.0 },
    { id: 's7', a: 29.0, b: 35.0 },
  ];
  const DURATION = 35.0;
  // Diagonal band wipes hiding each cut (cut happens at the midpoint).
  const WIPES = [
    { t: 5.0, colors: ['#f6f1ec', '#8b0028'] },
    { t: 11.6, colors: ['#8b0028', '#231f20'] },
    { t: 16.6, colors: ['#231f20', '#f6f1ec'] },
    { t: 21.6, colors: ['#f6f1ec', '#8b0028'] },
    { t: 25.0, colors: ['#4e0016', '#231f20'] },
    { t: 29.0, colors: ['#a7a8ab', '#ffffff'] },
  ];
  const WIPE_HALF = 0.38;

  const wipe = document.getElementById('wipe');
  const bands = [0, 1].map((i) => {
    const b = document.createElement('div');
    b.className = 'band';
    wipe.appendChild(b);
    return b;
  });

  function renderWipe(t) {
    const w = WIPES.find((w) => t >= w.t - WIPE_HALF && t <= w.t + WIPE_HALF);
    if (!w) { wipe.style.display = 'none'; return; }
    wipe.style.display = 'block';
    const p = prog(t, w.t - WIPE_HALF, w.t + WIPE_HALF);
    // two stacked bands, second one trails slightly for a layered feel
    bands.forEach((b, i) => {
      const lag = i * 0.12;
      const q = eIO3(clamp((p - lag * (1 - p)) ));
      const x = lerp(105, -105, q) + (i ? 6 : 0);
      b.style.background = w.colors[i];
      b.style.left = '0'; b.style.width = '100%';
      b.style.transform = `translateX(${x}%) skewX(-14deg)`;
      b.style.zIndex = i;
    });
  }

  // =====================================================================
  // S1 — "Não é sobre o destino. É sobre o que você vive nele."
  // =====================================================================
  const s1 = {
    line: $('#s1line'),
    r1: $('#s1r1'), r2: $('#s1r2'),
    a: $$('#s1a .mask > span'),
    b: $$('#s1b .mask > span'),
  };
  function S1(t) {
    const lw = eOut3(prog(t, 0.0, 1.2)) * W * 0.8;
    const lfade = 1 - prog(t, 0.9, 1.5);
    s1.line.style.width = lw + 'px';
    s1.line.style.transform = `translate(-50%, ${H * 0.0}px)`;
    s1.line.style.opacity = lfade;
    [s1.r1, s1.r2].forEach((r, i) => {
      const p = prog(t, 0.2 + i * 0.5, 5.0);
      const d = lerp(20, 140, eOut3(p)) * U;
      r.style.width = r.style.height = d + 'px';
      r.style.transform = `translate(-50%, -50%)`;
      r.style.opacity = (1 - p) * 0.9;
    });
    rise(s1.a[0], t, 0.35, 0.8, 2.25);
    rise(s1.a[1], t, 0.55, 0.8, 2.32);
    rise(s1.b[0], t, 2.6, 0.8, 4.35);
    rise(s1.b[1], t, 2.8, 0.85, 4.42);
    // slow push-in
    const sc = 1 + 0.04 * prog(t, 0, 5);
    $('#s1a').style.transform = $('#s1b').style.transform = `scale(${sc})`;
  }

  // =====================================================================
  // S2 — experiences seen through an airplane window
  // =====================================================================
  const BEATS = [
    { cls: 'light', num: '01', h: 'O pôr do sol', i: 'em Santorini', scene: santorini },
    { cls: 'dark', num: '02', h: 'A aurora boreal', i: 'na Islândia', scene: aurora },
    { cls: 'wine', num: '03', h: 'Voar de balão', i: 'na Capadócia', scene: balloons },
    { cls: 'light', num: '04', h: 'Um brinde', i: 'em Paris', scene: paris },
  ];
  const BEAT_LEN = (11.6 - 5.0) / BEATS.length;
  const s2 = $('#s2');
  const beats = BEATS.map((b) => {
    const el = document.createElement('div');
    el.className = 'beat ' + b.cls;
    el.innerHTML = `
      <div class="wrap">
        <div class="window"><svg viewBox="0 0 460 620" preserveAspectRatio="xMidYMid slice"></svg><div class="shade"></div></div>
        <div class="text">
          <div class="mask num"><span>EXPERIÊNCIA ${b.num}</span></div>
          <div class="mask h serif"><span>${b.h}</span></div>
          <div class="mask i ital"><span>${b.i}</span></div>
          <div class="bar"></div>
        </div>
      </div>`;
    s2.appendChild(el);
    const svg = $('svg', el);
    const update = b.scene(svg);
    return { el, svg, update, shade: $('.shade', el), win: $('.window', el),
      spans: $$('.mask > span', el), bar: $('.bar', el) };
  });

  function santorini(svg) {
    const defs = svgEl('defs', {}, svg);
    const g = svgEl('linearGradient', { id: 'sky1', x1: 0, y1: 0, x2: 0, y2: 1 }, defs);
    [['0', '#4e0016'], ['0.45', '#b8536f'], ['0.75', '#f2b9a4'], ['1', '#f7d9c4']].forEach(([o, c]) => svgEl('stop', { offset: o, 'stop-color': c }, g));
    svgEl('rect', { width: 460, height: 620, fill: 'url(#sky1)' }, svg);
    const sun = svgEl('circle', { cx: 300, r: 58, fill: '#fff4e8' }, svg);
    const glow = svgEl('circle', { cx: 300, r: 110, fill: '#fff4e8', opacity: 0.25 }, svg);
    svgEl('rect', { y: 400, width: 460, height: 220, fill: '#6a001e' }, svg);
    const waves = [];
    for (let i = 0; i < 7; i++) {
      waves.push(svgEl('rect', { y: 412 + i * 26, height: 3, rx: 1.5, fill: '#f2b9a4', opacity: 0.55 - i * 0.06 }, svg));
    }
    // cliff + white houses
    svgEl('path', { d: 'M0 360 L120 330 L170 350 L210 345 L240 400 L0 400 Z', fill: '#2c2829' }, svg);
    const houses = [[18, 318, 34, 26], [58, 306, 28, 34], [92, 312, 40, 24], [140, 326, 30, 22], [176, 334, 28, 18]];
    houses.forEach(([x, y, w, h]) => svgEl('rect', { x, y, width: w, height: h, fill: '#f6f1ec' }, svg));
    svgEl('path', { d: 'M58 306 a14 14 0 0 1 28 0 Z', fill: '#1d4f8f' }, svg);
    svgEl('path', { d: 'M140 326 a15 15 0 0 1 30 0 Z', fill: '#1d4f8f' }, svg);
    return (p) => {
      const y = lerp(250, 360, p);
      sun.setAttribute('cy', y); glow.setAttribute('cy', y);
      waves.forEach((w, i) => {
        const len = 160 + (i % 3) * 60;
        const x = ((p * 160 * (i % 2 ? 1 : -1) + i * 70) % 460 + 460) % 460 - 80;
        w.setAttribute('x', x); w.setAttribute('width', len);
      });
    };
  }

  function aurora(svg) {
    const defs = svgEl('defs', {}, svg);
    const g = svgEl('linearGradient', { id: 'sky2', x1: 0, y1: 0, x2: 0, y2: 1 }, defs);
    [['0', '#0f0c0d'], ['0.7', '#2c2829'], ['1', '#3d2b31']].forEach(([o, c]) => svgEl('stop', { offset: o, 'stop-color': c }, g));
    const ga = svgEl('linearGradient', { id: 'au', x1: 0, y1: 0, x2: 0, y2: 1 }, defs);
    [['0', '#e8c3cc', 0], ['0.5', '#e8c3cc', 0.75], ['1', '#8b0028', 0]].forEach(([o, c, op]) => svgEl('stop', { offset: o, 'stop-color': c, 'stop-opacity': op }, ga));
    const ga2 = svgEl('linearGradient', { id: 'au2', x1: 0, y1: 0, x2: 0, y2: 1 }, defs);
    [['0', '#bfe3d6', 0], ['0.5', '#bfe3d6', 0.45], ['1', '#bfe3d6', 0]].forEach(([o, c, op]) => svgEl('stop', { offset: o, 'stop-color': c, 'stop-opacity': op }, ga2));
    svgEl('filter', { id: 'blur6' }, defs).appendChild(Object.assign(document.createElementNS(NS, 'feGaussianBlur'), {}));
    $('#blur6', svg).firstChild.setAttribute('stdDeviation', 8);
    svgEl('rect', { width: 460, height: 620, fill: 'url(#sky2)' }, svg);
    const stars = [];
    let seed = 7;
    const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
    for (let i = 0; i < 70; i++) stars.push(svgEl('circle', { cx: rnd() * 460, cy: rnd() * 380, r: rnd() * 1.6 + 0.4, fill: '#fff' }, svg));
    const ribbons = [0, 1, 2].map((i) => svgEl('path', { fill: i === 1 ? 'url(#au2)' : 'url(#au)', filter: 'url(#blur6)', opacity: 0.9 }, svg));
    svgEl('path', { d: 'M0 470 L90 410 L150 440 L230 380 L320 450 L390 420 L460 455 L460 620 L0 620 Z', fill: '#171415' }, svg);
    svgEl('path', { d: 'M0 520 L460 500 L460 620 L0 620 Z', fill: '#231f20' }, svg);
    return (p) => {
      ribbons.forEach((r, i) => {
        const ph = p * 5 + i * 1.7;
        let top = '', bot = '';
        for (let x = -20; x <= 480; x += 20) {
          const y = 140 + i * 40 + Math.sin(x / 70 + ph) * 34 + Math.sin(x / 31 - ph * 1.3) * 10;
          top += (x === -20 ? 'M' : 'L') + x + ' ' + y.toFixed(1) + ' ';
        }
        for (let x = 480; x >= -20; x -= 20) {
          const y = 300 + i * 30 + Math.sin(x / 80 + ph * 0.8) * 26;
          bot += 'L' + x + ' ' + y.toFixed(1) + ' ';
        }
        r.setAttribute('d', top + bot + 'Z');
      });
      stars.forEach((s, i) => s.setAttribute('opacity', 0.45 + 0.55 * Math.abs(Math.sin(p * 6 + i))));
    };
  }

  function balloons(svg) {
    const defs = svgEl('defs', {}, svg);
    const g = svgEl('linearGradient', { id: 'sky3', x1: 0, y1: 0, x2: 0, y2: 1 }, defs);
    [['0', '#f7e3d7'], ['0.6', '#f2c4b2'], ['1', '#e3a08f']].forEach(([o, c]) => svgEl('stop', { offset: o, 'stop-color': c }, g));
    svgEl('rect', { width: 460, height: 620, fill: 'url(#sky3)' }, svg);
    svgEl('circle', { cx: 120, cy: 470, r: 90, fill: '#fff6ee', opacity: 0.8 }, svg);
    const specs = [
      { x: 130, y: 300, s: 1.0, c1: '#8b0028', c2: '#e8c3cc', sp: 120 },
      { x: 320, y: 210, s: 0.7, c1: '#a7a8ab', c2: '#ffffff', sp: 90 },
      { x: 250, y: 420, s: 0.5, c1: '#b8536f', c2: '#f6f1ec', sp: 70 },
      { x: 60, y: 150, s: 0.42, c1: '#5f6064', c2: '#d9d9db', sp: 60 },
      { x: 400, y: 380, s: 0.35, c1: '#8b0028', c2: '#f6f1ec', sp: 50 },
    ];
    const items = specs.map((b) => {
      const grp = svgEl('g', {}, svg);
      svgEl('path', { d: 'M0 -60 C38 -60 52 -28 46 0 C40 26 14 44 8 56 L-8 56 C-14 44 -40 26 -46 0 C-52 -28 -38 -60 0 -60 Z', fill: b.c1 }, grp);
      svgEl('path', { d: 'M0 -60 C16 -60 20 -28 18 0 C16 26 6 44 4 56 L-4 56 C-6 44 -16 26 -18 0 C-20 -28 -16 -60 0 -60 Z', fill: b.c2, opacity: 0.85 }, grp);
      svgEl('path', { d: 'M-8 56 L-7 70 M8 56 L7 70', stroke: '#2c2829', 'stroke-width': 1.5 }, grp);
      svgEl('rect', { x: -8, y: 70, width: 16, height: 12, rx: 2, fill: '#6b4a3a' }, grp);
      return { grp, b };
    });
    // fairy-chimney hills
    svgEl('path', { d: 'M0 520 C60 470 90 500 120 480 L135 440 L150 482 C200 470 240 500 290 470 L305 430 L322 474 C370 470 420 490 460 470 L460 620 L0 620 Z', fill: '#c27d6b' }, svg);
    svgEl('path', { d: 'M0 560 C100 530 200 560 300 540 C380 528 430 545 460 540 L460 620 L0 620 Z', fill: '#8a4a3d' }, svg);
    return (p) => items.forEach(({ grp, b }, i) => {
      const y = b.y - p * b.sp;
      const x = b.x + Math.sin(p * 3 + i) * 6;
      grp.setAttribute('transform', `translate(${x} ${y}) scale(${b.s})`);
    });
  }

  function paris(svg) {
    const defs = svgEl('defs', {}, svg);
    const g = svgEl('linearGradient', { id: 'sky4', x1: 0, y1: 0, x2: 0, y2: 1 }, defs);
    [['0', '#1b1718'], ['0.6', '#4e0016'], ['1', '#8b0028']].forEach(([o, c]) => svgEl('stop', { offset: o, 'stop-color': c }, g));
    svgEl('rect', { width: 460, height: 620, fill: 'url(#sky4)' }, svg);
    svgEl('circle', { cx: 360, cy: 120, r: 30, fill: '#f6f1ec', opacity: 0.9 }, svg);
    // Eiffel tower silhouette
    const tower = 'M230 120 L236 120 L240 210 L252 300 L266 380 L300 520 L276 520 C266 470 250 445 233 445 C216 445 200 470 190 520 L166 520 L200 380 L214 300 L226 210 Z';
    svgEl('path', { d: tower, fill: '#171415' }, svg);
    svgEl('rect', { x: 205, y: 300, width: 56, height: 6, fill: '#171415' }, svg);
    svgEl('rect', { x: 192, y: 380, width: 82, height: 8, fill: '#171415' }, svg);
    svgEl('path', { d: 'M0 520 L460 520 L460 620 L0 620 Z', fill: '#171415' }, svg);
    const sparkles = [];
    let seed = 3;
    const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
    for (let i = 0; i < 26; i++) {
      const y = 140 + rnd() * 370;
      const spread = (y - 120) / 400 * 60 + 6;
      sparkles.push({ el: svgEl('circle', { cx: 233 + (rnd() - 0.5) * spread * 2, cy: y, r: 2.2, fill: '#fff4e8' }, svg), k: rnd() * 10 });
    }
    // two champagne flutes clinking
    const glass = (dx) => {
      const gg = svgEl('g', {}, svg);
      svgEl('path', { d: 'M-14 0 L14 0 L9 62 C8 72 2 76 0 76 C-2 76 -8 72 -9 62 Z', fill: 'rgba(246,241,236,0.18)', stroke: '#f6f1ec', 'stroke-width': 2 }, gg);
      svgEl('path', { d: 'M-11 22 L11 22 L9 62 C8 70 2 74 0 74 C-2 74 -8 70 -9 62 Z', fill: '#f2c98f', opacity: 0.85 }, gg);
      svgEl('path', { d: 'M0 76 L0 118 M-18 120 L18 120', stroke: '#f6f1ec', 'stroke-width': 2 }, gg);
      return gg;
    };
    const gl = glass(), gr = glass();
    return (p) => {
      sparkles.forEach((s) => s.el.setAttribute('opacity', Math.max(0, Math.sin(p * 14 + s.k))));
      const c = eOut3(clamp(p * 1.6));
      gl.setAttribute('transform', `translate(${lerp(40, 120, c)} 450) rotate(${lerp(-4, 14, c)})`);
      gr.setAttribute('transform', `translate(${lerp(420, 342, c)} 450) rotate(${lerp(4, -14, c)})`);
    };
  }

  function S2(t) {
    const lt = t - 5.0;
    const k = clamp(Math.floor(lt / BEAT_LEN), 0, BEATS.length - 1);
    beats.forEach((b, i) => { b.el.style.display = i === k ? 'block' : 'none'; });
    const b = beats[k];
    const bt = lt - k * BEAT_LEN; // local beat time
    const isFirst = k === 0;
    const isLast = k === BEATS.length - 1;
    const start = isFirst ? 0.25 : 0.0;
    // window: punch-in scale + shade lifting
    const ws = eOutBack(prog(bt, start, start + 0.55));
    const out = isLast ? 0 : eIn3(prog(bt, BEAT_LEN - 0.22, BEAT_LEN));
    b.win.style.transform = `scale(${lerp(0.82, 1, ws) * (1 - out * 0.12)}) translateY(${out * -6}%)`;
    b.win.style.opacity = clamp(ws * 1.5) * (1 - out);
    const sh = eIO3(prog(bt, start + 0.2, start + 0.85));
    b.shade.style.transform = `translateY(${-sh * 102}%)`;
    b.update(prog(bt, 0, BEAT_LEN));
    const tx = start + 0.15;
    rise(b.spans[0], bt, tx, 0.5, isLast ? Infinity : BEAT_LEN - 0.28, 0.25);
    rise(b.spans[1], bt, tx + 0.08, 0.6, isLast ? Infinity : BEAT_LEN - 0.26, 0.25);
    rise(b.spans[2], bt, tx + 0.16, 0.6, isLast ? Infinity : BEAT_LEN - 0.24, 0.25);
    b.bar.style.transform = `scaleX(${eOut3(prog(bt, tx + 0.3, tx + 0.9)) * (1 - out)})`;
  }

  // =====================================================================
  // S3 — route with a plane hopping between destinations
  // =====================================================================
  const CITIES = [
    { n: 'Lisboa', c: 'Portugal' },
    { n: 'Paris', c: 'França' },
    { n: 'Maldivas', c: 'Oceano Índico' },
    { n: 'Tóquio', c: 'Japão' },
    { n: 'Cancún', c: 'México' },
  ];
  const s3 = { svg: $('#s3svg'), spans: $$('#s3 .mask > span'), cities: [] };
  s3.svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
  s3.svg.setAttribute('width', W); s3.svg.setAttribute('height', H);
  const pts = PORTRAIT
    ? [[0.22, 0.36], [0.74, 0.46], [0.30, 0.58], [0.76, 0.70], [0.34, 0.84]]
    : [[0.10, 0.70], [0.30, 0.48], [0.50, 0.72], [0.70, 0.46], [0.90, 0.66]];
  const P = pts.map(([x, y]) => [x * W, y * H]);
  // dotted background grid ("map" texture)
  const dots = svgEl('g', { opacity: 0.18 }, s3.svg);
  const step = U * 2.6;
  for (let y = step; y < H; y += step) for (let x = step; x < W; x += step) {
    const v = Math.sin(x * 0.004 + 1.3) * Math.cos(y * 0.006) + Math.sin(x * 0.011 - y * 0.003);
    if (v > 0.35) svgEl('circle', { cx: x, cy: y, r: U * 0.22, fill: '#a7a8ab' }, dots);
  }
  let d = `M${P[0][0]} ${P[0][1]}`;
  for (let i = 1; i < P.length; i++) {
    const [x0, y0] = P[i - 1], [x1, y1] = P[i];
    const mx = (x0 + x1) / 2, my = (y0 + y1) / 2;
    const lift = PORTRAIT ? (x1 > x0 ? -1 : 1) * W * 0.08 : -H * 0.16;
    const cx = PORTRAIT ? mx + lift * 0 : mx;
    const cy = PORTRAIT ? my - H * 0.05 : my + lift;
    d += ` Q${cx} ${cy} ${x1} ${y1}`;
  }
  const routeBg = svgEl('path', { d, fill: 'none', stroke: 'rgba(167,168,171,0.25)', 'stroke-width': U * 0.25, 'stroke-dasharray': `${U * 0.6} ${U * 0.9}` }, s3.svg);
  const route = svgEl('path', { d, fill: 'none', stroke: '#e8c3cc', 'stroke-width': U * 0.32, 'stroke-linecap': 'round' }, s3.svg);
  const routeLen = route.getTotalLength();
  route.setAttribute('stroke-dasharray', routeLen);
  // cumulative length at each city (sample)
  const cityLen = P.map(([px, py]) => {
    let best = 0, bd = Infinity;
    for (let l = 0; l <= routeLen; l += routeLen / 600) {
      const q = route.getPointAtLength(l);
      const dd = (q.x - px) ** 2 + (q.y - py) ** 2;
      if (dd < bd) { bd = dd; best = l; }
    }
    return best;
  });
  const pins = P.map(([x, y]) => {
    const g = svgEl('g', {}, s3.svg);
    const halo = svgEl('circle', { cx: x, cy: y, r: U * 2.2, fill: 'none', stroke: '#e8c3cc', 'stroke-width': U * 0.18 }, g);
    const dot = svgEl('circle', { cx: x, cy: y, r: U * 0.95, fill: '#8b0028', stroke: '#fff', 'stroke-width': U * 0.3 }, g);
    return { g, halo, dot };
  });
  const cityBox = $('#s3cities');
  CITIES.forEach((c, i) => {
    const el = document.createElement('div');
    el.className = 'city';
    el.innerHTML = `<b>${c.n}</b><i>${c.c}</i>`;
    const below = PORTRAIT ? false : i % 2 === 0;
    el.style.left = (PORTRAIT ? P[i][0] + (P[i][0] > W / 2 ? -U * 0 : 0) : P[i][0]) + 'px';
    el.style.top = (below ? P[i][1] + U * 3.2 : P[i][1] - U * 8.2) + 'px';
    cityBox.appendChild(el);
    s3.cities.push(el);
  });
  const plane = svgEl('g', {}, s3.svg);
  const planeInner = svgEl('g', {}, plane);
  // simple airliner silhouette pointing to +x
  svgEl('path', { d: 'M-22 0 C-22 -3 -18 -4 -12 -4 L18 -4 C26 -4 30 -2 32 0 C30 2 26 4 18 4 L-12 4 C-18 4 -22 3 -22 0 Z M2 -4 L-8 -26 L-2 -26 L14 -4 Z M2 4 L-8 26 L-2 26 L14 4 Z M-16 -4 L-22 -14 L-18 -14 L-10 -4 Z M-16 4 L-22 14 L-18 14 L-10 4 Z', fill: '#fff' }, planeInner);
  planeInner.setAttribute('transform', `scale(${U * 0.11})`);

  function S3(t) {
    const lt = t - 11.6;
    rise(s3.spans[0], lt, 0.25, 0.7);
    rise(s3.spans[1], lt, 0.4, 0.75);
    const p = eIO3(prog(lt, 0.5, 4.5));
    const L = p * routeLen;
    route.setAttribute('stroke-dashoffset', routeLen - L);
    const q = route.getPointAtLength(Math.max(0.01, L));
    const q2 = route.getPointAtLength(Math.min(routeLen, L + 2));
    const ang = Math.atan2(q2.y - q.y, q2.x - q.x) * 180 / Math.PI;
    plane.setAttribute('transform', `translate(${q.x} ${q.y}) rotate(${ang})`);
    plane.setAttribute('opacity', prog(lt, 0.4, 0.7));
    pins.forEach((pn, i) => {
      // pin pops when the plane is near
      const reach = cityLen[i] <= L + 1 ? 1 : 0;
      const tReach = reach ? lt : 0;
      const local = reach ? clamp((L - cityLen[i]) / (routeLen * 0.06)) : 0;
      const s = i === 0 ? eOutBack(prog(lt, 0.3, 0.8)) : eOutBack(local);
      pn.dot.setAttribute('r', U * 0.95 * s);
      pn.halo.setAttribute('r', U * (1 + 3 * local));
      pn.halo.setAttribute('opacity', (1 - local) * (s > 0 ? 1 : 0));
      const el = s3.cities[i];
      el.style.opacity = clamp(s);
      el.style.transform = `translate(-50%, ${(1 - clamp(s)) * U * 2}px)`;
    });
  }

  // =====================================================================
  // S4 — pillars
  // =====================================================================
  const ICONS = {
    curadoria: '<svg viewBox="0 0 48 48" fill="none" stroke="#8b0028" stroke-width="1.6" stroke-linejoin="round"><path d="M14 8h20l8 11-18 21L6 19z"/><path d="M6 19h36M18 8l6 32M30 8l-6 32M14 8l4 11M34 8l-4 11"/></svg>',
    concierge: '<svg viewBox="0 0 48 48" fill="none" stroke="#8b0028" stroke-width="1.6" stroke-linecap="round"><path d="M8 34h32M6 38h36M24 12v4M20 12h8"/><path d="M10 34c0-8 6-16 14-16s14 8 14 16"/></svg>',
    suporte: '<svg viewBox="0 0 48 48" fill="none" stroke="#8b0028" stroke-width="1.6" stroke-linecap="round"><circle cx="24" cy="24" r="16"/><path d="M24 14v10l7 5"/><path d="M24 4v3M24 41v3M4 24h3M41 24h3"/></svg>',
    app: '<svg viewBox="0 0 48 48" fill="none" stroke="#8b0028" stroke-width="1.6" stroke-linecap="round"><rect x="14" y="4" width="20" height="40" rx="4"/><path d="M21 8h6"/><path d="M19 20l4 4 7-8"/><path d="M19 32h10M19 36h6"/></svg>',
  };
  const PILLARS = [
    { k: 'curadoria', h: 'Curadoria', p: 'Cada hotel, passeio e restaurante escolhido a dedo.' },
    { k: 'concierge', h: 'Concierge', p: 'Reservas, mimos e detalhes resolvidos antes de você pedir.' },
    { k: 'suporte', h: 'Suporte 24h', p: 'Em qualquer fuso horário, a gente está com você.' },
    { k: 'app', h: 'Na palma da mão', p: 'Seu roteiro completo no celular, do embarque à volta.' },
  ];
  const grid = $('#s4grid');
  const cards = PILLARS.map((pl, i) => {
    const el = document.createElement('div');
    el.className = 'card';
    el.innerHTML = `<span class="idx">0${i + 1}</span>${ICONS[pl.k]}<div><h3>${pl.h}</h3><p>${pl.p}</p></div>`;
    grid.appendChild(el);
    return el;
  });
  const s4spans = $$('#s4 .mask > span');
  function S4(t) {
    const lt = t - 16.6;
    rise(s4spans[0], lt, 0.3, 0.75);
    rise(s4spans[1], lt, 0.45, 0.8);
    cards.forEach((c, i) => {
      const p = eOut5(prog(lt, 1.0 + i * 0.22, 1.9 + i * 0.22));
      const fromY = 30 * U;
      c.style.transform = `translateY(${(1 - p) * fromY}px) rotate(${(1 - p) * (i % 2 ? 6 : -6)}deg)`;
      c.style.opacity = clamp(p * 1.4);
      const icon = $('svg', c);
      icon.style.transform = `scale(${lerp(0.6, 1, eOutBack(prog(lt, 1.4 + i * 0.22, 2.0 + i * 0.22)))})`;
    });
    const drift = prog(lt, 0, 5) * U * 1.2;
    grid.style.transform = `translateX(${-drift}px)`;
  }

  // =====================================================================
  // S5 — "Viaje …" slot reel
  // =====================================================================
  const WORDS = ['sozinha.', 'a dois.', 'em família.', 'em grupo.', 'a negócios.', 'para dizer sim.', 'do seu jeito.'];
  const reel = $('#s5reel');
  WORDS.forEach((w) => { const d = document.createElement('div'); d.className = 'w'; d.textContent = w; reel.appendChild(d); });
  const s5fixed = $('#s5 .mask > span');
  const s5sub = $('#s5sub');
  const s5slot = $('#s5slot');
  function S5(t) {
    const lt = t - 21.6;
    rise(s5fixed, lt, 0.2, 0.6);
    // each word holds ~0.42s, snaps with an overshoot
    const hold = 0.4;
    let pos = 0;
    for (let i = 1; i < WORDS.length; i++) {
      const a = 0.55 + (i - 1) * hold;
      pos += eOutBack(prog(lt, a, a + 0.28));
    }
    const enter = eOut5(prog(lt, 0.25, 0.75));
    const hW = 13 * U;
    reel.style.transform = `translateY(${-pos * hW + (1 - enter) * hW}px)`;
    // last word gets a gentle scale accent
    const fin = prog(lt, 0.55 + (WORDS.length - 2) * hold, 0.55 + (WORDS.length - 2) * hold + 0.5);
    s5slot.style.transform = `scale(${1 + 0.04 * eOut3(fin)})`;
    const ps = eOut3(prog(lt, 2.6, 3.2));
    s5sub.style.opacity = ps;
    s5sub.style.transform = `translateY(${(1 - ps) * U * 2}px)`;
    s5sub.style.letterSpacing = lerp(0.6, 0.32, ps) + 'em';
  }

  // =====================================================================
  // S6 — credentials
  // =====================================================================
  const laurel = $('#laurel');
  const leafPaths = [];
  (function buildLaurel() {
    // two arcs of leaves around the award text
    for (const side of [-1, 1]) {
      const stem = svgEl('path', { fill: 'none', stroke: '#a7a8ab', 'stroke-width': 2,
        d: side < 0 ? 'M250 234 C110 230 44 170 50 40' : 'M450 234 C590 230 656 170 650 40' }, laurel);
      leafPaths.push({ el: stem, stem: true });
      const n = 9;
      for (let i = 0; i < n; i++) {
        const q = stem.getPointAtLength(stem.getTotalLength() * (0.08 + i * 0.1));
        const q2 = stem.getPointAtLength(stem.getTotalLength() * (0.08 + i * 0.1) + 1);
        const ang = Math.atan2(q2.y - q.y, q2.x - q.x) * 180 / Math.PI;
        for (const o of [-1, 1]) {
          const leaf = svgEl('path', { d: 'M0 0 C6 -9 18 -10 26 0 C18 10 6 9 0 0 Z',
            fill: o < 0 ? '#c9c9cc' : '#8a8b8f',
            transform: `translate(${q.x} ${q.y}) rotate(${ang + o * 38})` }, laurel);
          leafPaths.push({ el: leaf, i, o });
        }
      }
    }
  })();
  const stems = leafPaths.filter((l) => l.stem);
  stems.forEach((s) => { const L = s.el.getTotalLength(); s.L = L; s.el.setAttribute('stroke-dasharray', L); });
  const leaves = leafPaths.filter((l) => !l.stem);
  const st = [$('#st1'), $('#st2')];
  const award = $('#award');
  const awardIn = $('#award .in');
  function S6(t) {
    const lt = t - 25.0;
    [[28, 0.25], [16, 0.45]].forEach(([n, a], i) => {
      const p = eOut5(prog(lt, a, a + 1.3));
      const el = st[i];
      $('.n', el).textContent = Math.round(n * p);
      el.style.opacity = clamp(prog(lt, a, a + 0.3));
      el.style.transform = `translateY(${(1 - eOut3(prog(lt, a, a + 0.6))) * U * 4}px)`;
    });
    const ls = prog(lt, 1.3, 2.3);
    stems.forEach((s) => s.el.setAttribute('stroke-dashoffset', s.L * (1 - eOut3(ls))));
    leaves.forEach((l) => {
      const p = eOutBack(prog(lt, 1.4 + l.i * 0.08, 1.75 + l.i * 0.08));
      l.el.style.opacity = clamp(p);
      l.el.style.transformBox = 'fill-box';
      l.el.style.transformOrigin = '0 50%';
      l.el.style.scale = clamp(p, 0, 1.2);
    });
    const ai = eOut3(prog(lt, 1.7, 2.4));
    awardIn.style.opacity = ai;
    awardIn.style.transform = `scale(${lerp(0.9, 1, ai)})`;
    const push = 1 + 0.03 * prog(lt, 0, 4);
    $('#s6 .center').style.transform = `scale(${push})`;
  }

  // =====================================================================
  // S7 — tagline + logo signature
  // =====================================================================
  const word = $('#s7word');
  // "CARL" + big "A" "V" ligature + "IEIRA" (mirrors the brand wordmark)
  const base = PORTRAIT ? 6.6 * U : 10.5 * U;
  const glyphs = [
    ...'CARL'.split('').map((c) => ({ c, s: 1 })),
    { c: 'A', s: 1.42, ml: -0.02 },
    { c: 'V', s: 1.42, ml: -0.36 },
    ...'IEIRA'.split('').map((c) => ({ c, s: 1 })),
  ];
  const gEls = glyphs.map((g) => {
    const s = document.createElement('span');
    s.textContent = g.c;
    s.style.fontSize = base * g.s + 'px';
    if (g.ml) s.style.marginLeft = g.ml + 'em';
    word.appendChild(s);
    return s;
  });
  word.style.letterSpacing = '0.02em';
  // span the gradient across the whole word (each span samples its own slice);
  // measured lazily on first visible frame, after fonts are ready
  let wordW = 0;
  function measureWord() {
    wordW = word.getBoundingClientRect().width;
    word.style.setProperty('--wordw', wordW + 'px');
    gEls.forEach((s) => { s.style.backgroundPosition = `${-s.offsetLeft}px 0`; });
  }
  const rule = $('#s7rule');
  const tours = $('#s7tours');
  tours.style.width = base * 2.15 + 'px';
  const s7tag = $('#s7tag');
  const s7tagSpans = $$('#s7tag .mask > span');
  const foot = $('#s7foot');
  function S7(t) {
    const lt = t - 29.0;
    if (!wordW) measureWord();
    // tagline
    rise(s7tagSpans[0], lt, 0.2, 0.8, 2.0, 0.45);
    rise(s7tagSpans[1], lt, 0.4, 0.8, 2.08, 0.45);
    // logo
    gEls.forEach((s, i) => {
      const a = 2.35 + i * 0.045;
      const p = eOut5(prog(lt, a, a + 0.9));
      s.style.opacity = clamp(p * 1.3);
      s.style.transform = `translateY(${(1 - p) * 0.5}em)`;
      s.style.filter = `blur(${(1 - p) * 6}px)`;
    });
    const rp = eIO3(prog(lt, 2.9, 3.7));
    rule.style.width = wordW * 1.02 * rp + 'px';
    const tp = eOut3(prog(lt, 3.4, 4.2));
    tours.style.opacity = tp;
    tours.style.transform = `translateY(${(1 - tp) * U * 1.5}px)`;
    tours.style.letterSpacing = '0';
    const fp = eOut3(prog(lt, 4.0, 4.7));
    foot.style.opacity = fp;
    const z = 1 + 0.025 * prog(lt, 2.3, 6);
    $('#s7logo').style.transform = `scale(${z})`;
  }

  const RENDER = { s1: S1, s2: S2, s3: S3, s4: S4, s5: S5, s6: S6, s7: S7 };

  function renderFrame(t) {
    t = clamp(t, 0, DURATION - 1e-6);
    for (const sc of SCENES) {
      const el = document.getElementById(sc.id);
      const on = t >= sc.a && t < sc.b;
      el.style.display = on ? 'block' : 'none';
      if (on) RENDER[sc.id](t);
    }
    renderWipe(t);
  }

  window.DURATION = DURATION;
  window.renderFrame = renderFrame;

  // live preview when opened in a browser without ?render
  if (!qs.has('render')) {
    document.fonts.ready.then(() => {
      const t0 = performance.now();
      const loop = () => { renderFrame(((performance.now() - t0) / 1000) % DURATION); requestAnimationFrame(loop); };
      loop();
    });
  }
})();
