// Carla Vieira Tours — "Embarque": fast, beat-cut motion piece (120 BPM grid, 0.5 s per beat).
// Every visual is a pure function of time `t`; window.renderFrame(t) draws one frame.

(() => {
  const qs = new URLSearchParams(location.search);
  const W = +qs.get('w') || 1920;
  const H = +qs.get('h') || 1080;
  const PORTRAIT = H > W;
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
  const eOutBack = (p) => { const c = 1.7; return 1 + (c + 1) * Math.pow(p - 1, 3) + c * Math.pow(p - 1, 2); };
  const hash = (a, b = 0) => { const x = Math.sin(a * 127.1 + b * 311.7) * 43758.5453; return x - Math.floor(x); };
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const NS = 'http://www.w3.org/2000/svg';
  const svgEl = (tag, attrs = {}, parent) => {
    const el = document.createElementNS(NS, tag);
    for (const k in attrs) el.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(el);
    return el;
  };
  const div = (cls, html = '', parent) => {
    const d = document.createElement('div');
    if (cls) d.className = cls;
    d.innerHTML = html;
    if (parent) parent.appendChild(d);
    return d;
  };
  function rise(span, t, a, d = 0.6, x = Infinity, d2 = 0.35) {
    const pin = eOut5(prog(t, a, a + d));
    const pout = x === Infinity ? 0 : eIn3(prog(t, x, x + d2));
    span.style.transform = `translateY(${(1 - pin) * 110 - pout * 110}%)`;
  }

  // camera, reset every frame; scenes add to it
  const cam = $('#cam');
  let camS, camX, camY, camR;
  // decaying shake triggered at given impact times
  function shake(t, impacts, amp, dur = 0.28) {
    for (const ti of impacts) {
      const k = t - ti;
      if (k >= 0 && k < dur) {
        const a = amp * Math.pow(1 - k / dur, 2);
        camX += Math.sin(k * 95) * a;
        camY += Math.cos(k * 77) * a * 0.8;
        camR += Math.sin(k * 60) * a * 0.012;
      }
    }
  }

  // ---------- timeline ----------
  const DURATION = 30.0;
  const SCENES = [
    { id: 's1', a: 0, b: 3.5 },
    { id: 's2', a: 3.5, b: 6.0 },
    { id: 's3', a: 6.0, b: 11.0 },
    { id: 's4', a: 11.0, b: 15.0 },
    { id: 's5', a: 15.0, b: 19.0 },
    { id: 's6', a: 19.0, b: 22.5 },
    { id: 's7', a: 22.5, b: 26.4 },
    { id: 's8', a: 25.5, b: 30.0 },
  ];
  const WIPES = [
    { t: 6.0, colors: ['#f6f1ec', '#8b0028'] },
    { t: 11.0, colors: ['#8b0028', '#231f20'] },
    { t: 15.0, colors: ['#e8c3cc', '#8b0028'] },
    { t: 22.5, colors: ['#a7a8ab', '#231f20'] },
  ];
  const WIPE_HALF = 0.3;
  const FLASHES = [3.5, 19.0];

  const wipe = $('#wipe');
  const bands = [0, 1].map(() => div('band', '', wipe));
  function renderWipe(t) {
    const w = WIPES.find((w) => t >= w.t - WIPE_HALF && t <= w.t + WIPE_HALF);
    if (!w) { wipe.style.display = 'none'; return; }
    wipe.style.display = 'block';
    const p = prog(t, w.t - WIPE_HALF, w.t + WIPE_HALF);
    bands.forEach((b, i) => {
      const q = eIO3(clamp(p - i * 0.1 * (1 - p)));
      b.style.background = w.colors[i];
      b.style.transform = `translateX(${lerp(105, -105, q) + (i ? 6 : 0)}%) skewX(-14deg)`;
      b.style.zIndex = i;
    });
  }
  const flash = $('#flash');
  function renderFlash(t) {
    let o = 0;
    for (const f of FLASHES) o = Math.max(o, 1 - Math.abs(t - f) / 0.14);
    flash.style.opacity = clamp(o) * 0.9;
  }

  // =====================================================================
  // S1 — split-flap departure board
  // =====================================================================
  const COLS = 14;
  const CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  const PHASE_A = ['PARIS    14:05', 'MALDIVAS 16:40', 'TÓQUIO   19:15', 'CANCÚN   21:30'];
  const PHASE_B = ['EMBARQUE', 'IMEDIATO', 'PARA O', 'EXTRAORDINÁRIO'].map((s) => {
    const pad = Math.floor((COLS - s.length) / 2);
    return (' '.repeat(pad) + s).padEnd(COLS, ' ');
  });
  const board = $('#board');
  board.style.setProperty('--cw', (PORTRAIT ? 4.75 : 7.4) * U + 'px');
  div('hdr label', '<b>Partidas</b><span>Departures</span>', board);
  const cells = PHASE_A.map((rowA, r) => {
    const row = div('row', '', board);
    return [...Array(COLS)].map((_, c) => {
      const cell = div('cell', '<span></span>', row);
      const jit = hash(r, c);
      return {
        cell, span: $('span', cell), r, c,
        seq: [
          { at: 0.15 + c * 0.035 + r * 0.09, dur: 0.3 + jit * 0.35, ch: rowA[c], hot: c >= 9 },
          { at: 1.6 + c * 0.025 + r * 0.05, dur: 0.2 + jit * 0.25, ch: PHASE_B[r][c], hot: r === 3 },
        ],
      };
    });
  }).flat();
  const tag = div('tag', '<span class="dot"></span><span class="label">Carla Vieira Tours · embarque confirmado</span>', board);

  function S1(t) {
    cells.forEach((k) => {
      let cur = null;
      for (const s of k.seq) if (t >= s.at) cur = s;
      let ch = ' ', flap = 1, hot = false;
      if (cur) {
        const settle = cur.at + cur.dur;
        hot = cur.hot;
        if (t < settle) {
          const n = Math.floor(t * 24);
          ch = CHARS[Math.floor(hash(n, k.r * 31 + k.c) * CHARS.length)];
          flap = 0.35 + 0.65 * Math.abs(Math.cos(t * 24 * Math.PI));
        } else {
          ch = cur.ch;
          flap = 1 - 0.25 * Math.exp(-(t - settle) * 30) * Math.abs(Math.sin((t - settle) * 60));
        }
      }
      k.span.textContent = ch === ' ' ? ' ' : ch;
      k.span.style.transform = `scaleY(${flap})`;
      k.cell.classList.toggle('hot', hot);
    });
    const tp = eOut3(prog(t, 2.5, 2.9));
    tag.style.opacity = tp;
    tag.style.transform = `translateY(${(1 - tp) * U * 2}px)`;
    // slow push, then punch-in toward the last row before the flash cut
    const punch = eIn3(prog(t, 3.05, 3.5));
    camS *= lerp(1, 1.06, prog(t, 0, 3)) * lerp(1, 5, punch);
    camY += -punch * H * 0.35;
  }

  // =====================================================================
  // S2 — slam words, one per beat
  // =====================================================================
  const SLAMS = [
    { w: 'SINTA.', s: 'o sol de Santorini', bg: '#8b0028', fg: '#fff', sub: '#e8c3cc' },
    { w: 'PROVE.', s: 'os sabores de Tóquio', bg: '#f6f1ec', fg: '#231f20', sub: '#8b0028' },
    { w: 'MERGULHE.', s: 'nas águas das Maldivas', bg: '#231f20', fg: '#fff', sub: '#e8c3cc' },
    { w: 'CELEBRE.', s: 'um brinde em Paris', bg: '#8b0028', fg: '#fff', sub: '#e8c3cc' },
    { w: 'VIVA.', s: 'cada segundo da viagem', bg: '#f6f1ec', fg: '#231f20', sub: '#8b0028' },
  ];
  const s2 = $('#s2');
  const slamEls = SLAMS.map((d, i) => {
    const el = div('scene-beat', '', s2);
    Object.assign(el.style, { position: 'absolute', inset: '0', background: d.bg, color: d.fg, display: 'none' });
    const bg = div('bgword', (d.w.replace('.', '') + ' ').repeat(6), el);
    bg.style.color = d.fg;
    const c = div('center', '', el);
    const w = div('word', d.w, c);
    if (PORTRAIT) w.style.fontSize = (d.w.length > 7 ? 10.5 : 13) * U + 'px';
    const sub = div('mask ital sub', `<span>${d.s}</span>`, c);
    sub.style.color = d.sub;
    const num = div('label num', `0${i + 1} / 05`, el);
    num.style.color = d.sub;
    const tick = div('tick', '', el);
    tick.style.background = d.sub;
    return { el, bg, w, sub: $('span', sub), tick };
  });
  function S2(t) {
    const lt = t - 3.5;
    const k = clamp(Math.floor(lt / 0.5), 0, SLAMS.length - 1);
    slamEls.forEach((e, i) => { e.el.style.display = i === k ? 'block' : 'none'; });
    const e = slamEls[k];
    const bt = lt - k * 0.5;
    const p = eOut5(prog(bt, 0, 0.22));
    e.w.style.transform = `scale(${lerp(1.55, 1, p)})`;
    e.w.style.letterSpacing = lerp(0.35, 0.02, p) + 'em';
    e.w.style.opacity = clamp(p * 2);
    e.w.style.filter = `blur(${(1 - p) * 10}px)`;
    rise(e.sub, bt, 0.06, 0.3);
    e.bg.style.transform = `translateY(-50%) translateX(${-(lt * 0.9 + k * 0.17) * W * 0.35}px)`;
    e.tick.style.transform = `scaleX(${(k + prog(bt, 0, 0.5)) / SLAMS.length})`;
    e.tick.style.transformOrigin = 'left';
    camS *= 1 + 0.05 * (1 - eOut3(prog(bt, 0, 0.3)));
  }

  // =====================================================================
  // S3 — passport opens, stamps slam on the beat
  // =====================================================================
  const pp = $('#pp');
  const pl = div('page pl', '', pp);
  const pr = div('page pr', '', pp);
  [pl, pr].forEach((pg) => {
    const g = svgEl('svg', { class: 'guil', viewBox: '0 0 100 100', preserveAspectRatio: 'none' }, pg);
    for (let i = 0; i < 14; i++) {
      let d = '';
      for (let x = 0; x <= 100; x += 2) d += (x ? 'L' : 'M') + x + ' ' + (8 + i * 6.5 + Math.sin(x / 6 + i) * 2.2).toFixed(2) + ' ';
      svgEl('path', { d, fill: 'none', stroke: '#e3cfc6', 'stroke-width': 0.25 }, g);
    }
  });
  div('info', `
    <div class="label k" style="margin-top:0">Passageiro</div><div class="v i">Você</div>
    <div class="label k">Destino</div><div class="v">O Mundo</div>
    <div class="label k">Emitido por</div><div class="v">Carla Vieira Tours</div>`, pl);
  const cover = div('cover', '', pp);
  const front = div('face front', `
    <svg viewBox="0 0 60 60" style="width:calc(var(--u)*9);height:calc(var(--u)*9)" fill="none" stroke="#d9d9db" stroke-width="1.2">
      <circle cx="30" cy="30" r="22"/><ellipse cx="30" cy="30" rx="9" ry="22"/><path d="M8 30h44M11 19h38M11 41h38"/></svg>
    <div class="t1 silver">Passaporte</div><div class="label t2">Carla Vieira Tours</div>`, cover);
  div('face back', '', cover);

  const STAMPS = [
    { x: 0.70, y: 0.27, r: -12, c: '#8b0028', shape: 'circle', a: 'PARIS', b: '12 JUN 2026' },
    { x: 0.87, y: 0.52, r: 9, c: '#231f20', shape: 'rect', a: 'MALDIVAS', b: '03 SET 2026' },
    { x: 0.66, y: 0.74, r: 6, c: '#5f6064', shape: 'oval', a: 'TÓQUIO', b: '21 MAR 2026' },
    { x: 0.30, y: 0.80, r: -8, c: '#8b0028', shape: 'rect', a: 'SANTORINI', b: '08 AGO 2026' },
    { x: 0.88, y: 0.83, r: -16, c: '#4e0016', shape: 'circle', a: 'CANCÚN', b: '15 JAN 2026' },
    { x: 0.12, y: 0.62, r: 14, c: '#5f6064', shape: 'circle', a: 'LISBOA', b: '30 NOV 2026' },
  ];
  const STAMP_T = STAMPS.map((_, i) => 7.5 + i * 0.5);
  const stampSize = (PORTRAIT ? 19 : 19.5) * U;
  const stampEls = STAMPS.map((s, i) => {
    const svg = svgEl('svg', { class: 'stamp', viewBox: '-60 -60 120 120', width: stampSize, height: stampSize }, pp);
    const g = svgEl('g', { fill: 'none', stroke: s.c, 'stroke-width': 2.4 }, svg);
    if (s.shape === 'circle') {
      svgEl('circle', { r: 54 }, g); svgEl('circle', { r: 46, 'stroke-width': 1.2 }, g);
    } else if (s.shape === 'oval') {
      svgEl('ellipse', { rx: 56, ry: 40 }, g); svgEl('ellipse', { rx: 49, ry: 33, 'stroke-width': 1.2 }, g);
    } else {
      svgEl('rect', { x: -56, y: -38, width: 112, height: 76, rx: 6 }, g); svgEl('rect', { x: -50, y: -32, width: 100, height: 64, rx: 3, 'stroke-width': 1.2 }, g);
    }
    svgEl('path', { d: 'M-8 -24 l16 0 M-14 -20 l28 0', 'stroke-width': 1.4 }, g);
    const tx = svgEl('text', { y: 6, 'text-anchor': 'middle', fill: s.c, 'font-family': 'Cinzel', 'font-size': s.a.length > 7 ? 15 : 19, 'letter-spacing': 1 }, svg);
    tx.textContent = s.a;
    const tb = svgEl('text', { y: 24, 'text-anchor': 'middle', fill: s.c, 'font-family': 'Montserrat', 'font-weight': 600, 'font-size': 8, 'letter-spacing': 2 }, svg);
    tb.textContent = s.b;
    // map spread coords to the vertical (stacked pages) layout
    let x = s.x, y = s.y;
    if (PORTRAIT) { const left = s.x < 0.5; x = (s.x % 0.5) * 2; y = (left ? 0 : 0.5) + s.y * 0.5; }
    svg.style.left = `calc(${x * 100}% - ${stampSize / 2}px)`;
    svg.style.top = `calc(${y * 100}% - ${stampSize / 2}px)`;
    svg.style.mixBlendMode = 'multiply';
    return { svg, s };
  });

  function S3(t) {
    const lt = t - 6.0;
    const enter = eOut5(prog(lt, 0.0, 0.55));
    const open = eIO3(prog(lt, 0.75, 1.45));
    const shift = lerp(-75, -50, open);
    const tr = PORTRAIT
      ? `translate(-50%, ${shift}%) translateY(${(1 - enter) * H * 0.6}px) rotate(${(1 - enter) * -10}deg)`
      : `translate(${shift}%, -50%) translateY(${(1 - enter) * H * 0.7}px) rotate(${(1 - enter) * -10}deg)`;
    pp.style.transform = tr + ` scale(${lerp(0.85, 1, enter)})`;
    const ang = open * 180;
    cover.style.transform = PORTRAIT ? `rotateX(${ang}deg)` : `rotateY(${-ang}deg)`;
    pl.style.opacity = ang > 90 ? 1 : 0;
    cover.style.zIndex = ang > 90 ? 0 : 5;
    pl.style.zIndex = 1;
    stampEls.forEach((e, i) => {
      const ti = STAMP_T[i];
      const p = prog(t, ti - 0.12, ti);
      const sc = lerp(2.4, 1, eIn3(p)) * (t >= ti ? 1 + 0.06 * Math.exp(-(t - ti) * 25) : 1);
      e.svg.style.opacity = t < ti - 0.12 ? 0 : t < ti ? p * 0.5 : 0.92;
      e.svg.style.transform = `rotate(${e.s.r}deg) scale(${sc})`;
      e.svg.style.zIndex = 10 + i;
    });
    shake(t, STAMP_T, U * 1.1);
    camS *= lerp(1, 1.08, prog(lt, 1.2, 5));
  }

  // =====================================================================
  // S4 — boarding pass: typed fields, confirmation stamp, tear
  // =====================================================================
  const bp = $('#bp');
  const FIELDS = [
    { k: 'Passageiro', v: 'VOCÊ', at: 0.7 },
    { k: 'Classe', v: 'EXPERIÊNCIA', at: 0.95 },
    { k: 'De', v: 'ROTINA', at: 1.3 },
    { k: 'Para', v: 'SEUS SONHOS', at: 1.55, w: true },
  ];
  const main = div('main', `<div class="band"><span class="b1">Cartão de embarque</span><span class="label b2">Carla Vieira Tours</span></div>
    <div class="fields">${FIELDS.map((f) => `<div class="f"><div class="label k">${f.k}</div><div class="v${f.w ? ' w' : ''}"></div></div>`).join('')}</div>`, bp);
  const stub = div('stub', `<div class="band"><span class="b1">CVT</span><span class="label b2">2026</span></div>
    <div class="fields" style="grid-template-columns:1fr 1fr"><div class="f"><div class="label k">Assento</div><div class="v">Janela</div></div>
    <div class="f"><div class="label k">Portão</div><div class="v">A1</div></div></div>`, bp);
  const bar = svgEl('svg', { class: 'bar', viewBox: '0 0 200 40', preserveAspectRatio: 'none' }, stub);
  let bx = 0, bi = 0;
  while (bx < 200) { const w = 1 + Math.floor(hash(bi++, 3) * 4); if (bi % 2) svgEl('rect', { x: bx, y: 0, width: w, height: 40, fill: '#231f20' }, bar); bx += w; }
  const fieldEls = $$('.main .f .v', bp);
  const confirm = svgEl('svg', { viewBox: '-90 -36 180 72', width: 26 * U, height: 10.4 * U }, main);
  Object.assign(confirm.style, { position: 'absolute', right: '6%', bottom: '10%', mixBlendMode: 'multiply' });
  if (PORTRAIT) Object.assign(confirm.style, { right: '8%', bottom: '6%' });
  svgEl('rect', { x: -86, y: -32, width: 172, height: 64, rx: 6, fill: 'none', stroke: '#8b0028', 'stroke-width': 3 }, confirm);
  const ct = svgEl('text', { y: 10, 'text-anchor': 'middle', fill: '#8b0028', 'font-family': 'Cinzel', 'font-size': 20, 'letter-spacing': 2 }, confirm);
  ct.textContent = 'CONFIRMADO';
  const CONFIRM_T = 13.5;
  const hint = $('#bphint');

  function S4(t) {
    const lt = t - 11.0;
    const enter = eOut5(prog(lt, 0.05, 0.6));
    const tear = eOutBack(prog(lt, 3.0, 3.35));
    const fly = eIn3(prog(lt, 3.45, 3.9));
    bp.style.transform = `translate(-50%, -50%) translateX(${(1 - enter) * W * 0.9}px) rotate(${lerp(9, -2, enter) + tear * -1}deg)`;
    FIELDS.forEach((f, i) => {
      const n = Math.floor(clamp((lt - f.at) * 20, 0, f.v.length));
      const typing = lt >= f.at && n < f.v.length;
      fieldEls[i].innerHTML = f.v.slice(0, n) + (typing ? '<span class="car"></span>' : '');
    });
    const cp = prog(t, CONFIRM_T - 0.12, CONFIRM_T);
    confirm.style.opacity = t < CONFIRM_T - 0.12 ? 0 : t < CONFIRM_T ? cp * 0.5 : 0.9;
    confirm.style.transform = `rotate(-10deg) scale(${lerp(2.3, 1, eIn3(cp))})`;
    shake(t, [CONFIRM_T], U * 1.0);
    bar.style.transformOrigin = 'left';
    bar.style.transform = `scaleX(${eOut3(prog(lt, 1.9, 2.5))})`;
    const off = tear * 6 * U + fly * W;
    stub.style.transform = PORTRAIT
      ? `translateY(${tear * 6 * U + fly * H}px) rotate(${tear * 8 + fly * 25}deg)`
      : `translateX(${off}px) rotate(${tear * 9 + fly * 30}deg)`;
    stub.style.transformOrigin = PORTRAIT ? '0 0' : '0 100%';
    const hp = eOut3(prog(lt, 0.8, 1.3));
    hint.style.opacity = hp;
    camS *= lerp(1, 1.05, prog(lt, 0, 4));
  }

  // =====================================================================
  // S5 — marquee of experiences
  // =====================================================================
  const ROWS = [
    { cls: 'serif', dir: -1, v: 0.11, txt: ['Jantar sob as estrelas', 'Safári ao amanhecer', 'Vinícolas na Toscana', 'Neve em Bariloche'] },
    { cls: 'ital', dir: 1, v: 0.14, txt: ['mergulho com arraias', 'lua de mel nas Maldivas', 'réveillon à beira-mar', 'cerejeiras em Kyoto'] },
    { cls: 'serif out', dir: -1, v: 0.17, txt: ['Pôr do sol em Santorini', 'Aurora boreal', 'Balão na Capadócia', 'Um brinde em Paris'] },
    { cls: 'ital', dir: 1, v: 0.12, txt: ['casamento no exterior', 'viagem em família', 'grupos e eventos', 'roteiros sob medida'] },
    { cls: 'serif', dir: -1, v: 0.15, txt: ['Cruzeiros pelo Mediterrâneo', 'Resorts all inclusive', 'Disney em família', 'Fiordes da Noruega'] },
  ];
  const rowsEl = $('#rows');
  const rowEls = ROWS.map((r) => {
    const once = r.txt.join('<i class="sep">◆</i>') + '<i class="sep">◆</i>';
    return { el: div('r ' + r.cls, once.repeat(4), rowsEl), r };
  });
  const s5card = $('#s5card');
  const s5spans = $$('#s5card .mask > span');
  function S5(t) {
    const lt = t - 15.0;
    rowEls.forEach(({ el, r }, i) => {
      const x = (r.dir < 0 ? -0.05 : -0.35) * W + r.dir * r.v * W * (lt + 0.6) * (1 + 0.6 * (1 - eOut3(prog(lt, 0, 0.8))));
      el.style.transform = `translateX(${x}px)`;
    });
    const cp = eOutBack(prog(lt, 0.45, 0.95));
    s5card.style.transform = `translate(-50%, -50%) scale(${cp}) rotate(${(1 - cp) * 6 - 2}deg)`;
    rise(s5spans[0], lt, 0.75, 0.5);
    rise(s5spans[1], lt, 0.9, 0.55);
    camS *= lerp(1.02, 1.1, prog(lt, 0, 4));
    camR += lerp(0, 1.2, prog(lt, 0, 4));
  }

  // =====================================================================
  // S6 — split-screen credentials
  // =====================================================================
  const PANELS = [
    { n: 28, l: 'anos', s: 'viajando o mundo' },
    { n: 16, l: 'anos', s: 'de agência' },
    { n: null, top: 'Top 12', l: 'Fórum Panrotas 2025', s: 'melhores agências do Brasil' },
  ];
  const panelsEl = $('#panels');
  const panelEls = PANELS.map((p, i) => {
    const el = div('p p' + (i + 1), `<div class="n">${p.top || '0'}</div><div class="label l">${p.l}</div><div class="ital s">${p.s}</div>`, panelsEl);
    return { el, n: $('.n', el), p };
  });
  function S6(t) {
    const lt = t - 19.0;
    panelEls.forEach(({ el, n, p }, i) => {
      const a = i * 0.14;
      const pin = eOut5(prog(lt, a, a + 0.55));
      const pout = eIn3(prog(lt, 3.0 + i * 0.07, 3.4 + i * 0.07));
      const v = (1 - pin) * 100 - pout * 100;
      el.style.transform = PORTRAIT ? `translateX(${i % 2 ? -v : v}%)` : `translateY(${i % 2 ? -v : v}%)`;
      if (p.n) n.textContent = Math.round(p.n * eOut3(prog(lt, a + 0.1, a + 1.2)));
      const inner = eOut3(prog(lt, a + 0.25, a + 0.8));
      [...el.children].forEach((c, j) => {
        c.style.opacity = clamp(prog(lt, a + 0.2 + j * 0.08, a + 0.5 + j * 0.08));
        c.style.transform = `translateY(${(1 - inner) * U * 3}px)`;
      });
    });
  }

  // =====================================================================
  // S7 — rotating globe with orbiting plane and service ring
  // =====================================================================
  const gsvg = $('#globe');
  const gSize = Math.min(W, H) * (PORTRAIT ? 0.82 : 0.6);
  gsvg.setAttribute('viewBox', '-100 -100 200 200');
  Object.assign(gsvg.style, { width: gSize + 'px', height: gSize + 'px', transform: 'translate(-50%, -50%)' });
  const R = 58;
  const gDefs = svgEl('defs', {}, gsvg);
  const glow = svgEl('radialGradient', { id: 'gglow' }, gDefs);
  svgEl('stop', { offset: '0', 'stop-color': '#8b0028', 'stop-opacity': 0.45 }, glow);
  svgEl('stop', { offset: '1', 'stop-color': '#8b0028', 'stop-opacity': 0 }, glow);
  svgEl('circle', { r: 95, fill: 'url(#gglow)' }, gsvg);
  const gWrap = svgEl('g', {}, gsvg);
  svgEl('circle', { r: R, fill: 'rgba(255,255,255,0.03)', stroke: '#d9d9db', 'stroke-width': 0.8 }, gWrap);
  [-40, -20, 0, 20, 40].forEach((lat) => {
    const y = R * Math.sin(lat * Math.PI / 180), rx = R * Math.cos(lat * Math.PI / 180);
    svgEl('ellipse', { cx: 0, cy: y, rx, ry: rx * 0.12, fill: 'none', stroke: 'rgba(217,217,219,0.35)', 'stroke-width': 0.5 }, gWrap);
  });
  const merids = [...Array(6)].map(() => svgEl('ellipse', { cx: 0, cy: 0, ry: R, fill: 'none', stroke: 'rgba(217,217,219,0.5)', 'stroke-width': 0.5 }, gWrap));
  const ringPath = svgEl('path', { id: 'ringp', d: `M0 -80 A80 80 0 1 1 -0.01 -80`, fill: 'none' }, gDefs);
  const ring = svgEl('g', {}, gsvg);
  const rtext = svgEl('text', { fill: '#e8c3cc', 'font-family': 'Montserrat', 'font-weight': 500, 'font-size': 6.4, 'letter-spacing': 3.2 }, ring);
  const tp = svgEl('textPath', { href: '#ringp' }, rtext);
  tp.textContent = 'CURADORIA · CONCIERGE · SUPORTE 24H · ROTEIRO NO APP · CURADORIA · CONCIERGE · SUPORTE 24H · ROTEIRO NO APP ·';
  const orbit = svgEl('g', {}, gsvg);
  svgEl('ellipse', { rx: 70, ry: 22, fill: 'none', stroke: 'rgba(232,195,204,0.35)', 'stroke-width': 0.5, 'stroke-dasharray': '2 2' }, orbit);
  const plane = svgEl('path', { d: 'M-5 0 C-5 -.7 -4 -1 -3 -1 L4 -1 C6 -1 7 -.5 7.5 0 C7 .5 6 1 4 1 L-3 1 C-4 1 -5 .7 -5 0 Z M0 -1 L-2 -6 L-.6 -6 L3 -1 Z M0 1 L-2 6 L-.6 6 L3 1 Z', fill: '#fff' }, orbit);
  const s7spans = $$('#s7 .mask > span');
  function S7(t) {
    const lt = t - 22.5;
    const gin = eOutBack(prog(lt, 0.0, 0.6));
    gsvg.style.transform = `translate(-50%, -50%) scale(${gin})`;
    merids.forEach((m, i) => {
      const ph = lt * 0.9 + (i * Math.PI) / 6;
      m.setAttribute('rx', Math.abs(R * Math.cos(ph)).toFixed(2));
    });
    ring.setAttribute('transform', `rotate(${lt * 28})`);
    rtext.setAttribute('opacity', eOut3(prog(lt, 0.3, 0.9)));
    const a = lt * 2.2;
    const px = 70 * Math.cos(a), py = 22 * Math.sin(a);
    const dx = -70 * Math.sin(a), dy = 22 * Math.cos(a);
    plane.setAttribute('transform', `translate(${px} ${py}) rotate(${Math.atan2(dy, dx) * 180 / Math.PI}) scale(${0.8 + 0.35 * (Math.sin(a) + 1) / 2})`);
    orbit.setAttribute('transform', 'rotate(-18)');
    orbit.setAttribute('opacity', prog(lt, 0.4, 0.8));
    rise(s7spans[0], lt, 0.35, 0.6);
    rise(s7spans[1], lt, 1.0, 0.6);
    camS *= lerp(1, 1.06, prog(lt, 0, 3.5));
  }

  // =====================================================================
  // S8 — iris into the logo signature
  // =====================================================================
  const s8 = $('#s8');
  const word = $('#s8word');
  const base = (PORTRAIT ? 6.6 : 9.6) * U;
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
  let wordW = 0;
  function measureWord() {
    wordW = word.getBoundingClientRect().width;
    word.style.setProperty('--wordw', wordW + 'px');
    gEls.forEach((s) => { s.style.backgroundPosition = `${-s.offsetLeft}px 0`; });
  }
  const rule = $('#s8rule');
  const tours = $('#s8tours');
  tours.style.width = base * 2.15 + 'px';
  const tagSpan = $('#s8 .tagline > span');
  const foot = $('#s8foot');
  if (PORTRAIT) $('#s8 .tagline').style.fontSize = 4.4 * U + 'px';
  function S8(t) {
    const lt = t - 25.5;
    if (!wordW) measureWord();
    const ir = eIO3(prog(lt, 0, 0.75));
    s8.style.clipPath = `circle(${ir * 120}% at 50% 50%)`;
    gEls.forEach((s, i) => {
      const a = 0.45 + i * 0.045;
      const p = eOut5(prog(lt, a, a + 0.8));
      s.style.opacity = clamp(p * 1.3);
      s.style.transform = `translateY(${(1 - p) * 0.5}em)`;
      s.style.filter = `blur(${(1 - p) * 6}px)`;
    });
    rule.style.width = wordW * 1.02 * eIO3(prog(lt, 1.0, 1.7)) + 'px';
    const tp = eOut3(prog(lt, 1.4, 2.1));
    tours.style.opacity = tp;
    tours.style.transform = `translateY(${(1 - tp) * U * 1.5}px)`;
    rise(tagSpan, lt, 1.9, 0.8);
    foot.style.opacity = eOut3(prog(lt, 2.4, 3.0));
    $('#s8logo').style.transform = `scale(${1 + 0.03 * prog(lt, 0.5, 4.5)})`;
  }

  const RENDER = { s1: S1, s2: S2, s3: S3, s4: S4, s5: S5, s6: S6, s7: S7, s8: S8 };

  function renderFrame(t) {
    t = clamp(t, 0, DURATION - 1e-6);
    camS = 1; camX = 0; camY = 0; camR = 0;
    for (const sc of SCENES) {
      const el = document.getElementById(sc.id);
      const on = t >= sc.a && t < sc.b;
      el.style.display = on ? 'block' : 'none';
      if (on) RENDER[sc.id](t);
    }
    cam.style.transform = `translate(${camX}px, ${camY}px) rotate(${camR}deg) scale(${camS})`;
    renderWipe(t);
    renderFlash(t);
  }

  window.DURATION = DURATION;
  window.renderFrame = renderFrame;
  if (!qs.has('render')) {
    document.fonts.ready.then(() => {
      const t0 = performance.now();
      const loop = () => { renderFrame(((performance.now() - t0) / 1000) % DURATION); requestAnimationFrame(loop); };
      loop();
    });
  }
})();
