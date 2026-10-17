// Cenas de motion do Reels "5 coisas que me fariam comprar de você" — NUV Agência.
// Cada cena é determinística: frame(t) desenha o estado no tempo t (segundos).
// render.mjs chama setup(id) e depois frame(t) quadro a quadro.

const W = 1080, H = 1920;
const C = { off: '#EFEAE4', beige: '#CBC5B9', navy: '#0A2540', indigo: '#313D65', ink: '#071a2e', alert: '#B5523B' };
const stage = document.getElementById('stage');

// ---------- utilidades de tempo ----------
const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const lerp = (a, b, k) => a + (b - a) * k;
const P = (t, start, dur) => clamp((t - start) / dur);
const ease = {
  out: x => 1 - Math.pow(1 - x, 3),
  in: x => x * x * x,
  inOut: x => (x < .5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2),
  back: x => { const c1 = 1.9, c3 = c1 + 1; return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2); },
  elastic: x => (x === 0 ? 0 : x === 1 ? 1 : Math.pow(2, -10 * x) * Math.sin((x * 10 - .75) * (2 * Math.PI) / 3) + 1),
};
// entra em [s, s+d], sai em [e, e+de]
const env = (t, s, d, e = 1e9, de = .4, fi = ease.out, fo = ease.in) =>
  (t < e ? fi(P(t, s, d)) : 1 - fo(P(t, e, de)));

// ---------- utilidades de DOM ----------
function add(html, css = {}, parent = stage) {
  const d = document.createElement('div');
  d.className = 'abs';
  d.innerHTML = html;
  Object.assign(d.style, css);
  parent.appendChild(d);
  return d;
}
// posiciona pelo centro
function put(el, { x = 0, y = 0, s = 1, sx = 1, sy = 1, r = 0, o = 1, blur = 0 } = {}) {
  el.style.transform = `translate(${x}px,${y}px) translate(-50%,-50%) rotate(${r}deg) scale(${s * sx},${s * sy})`;
  el.style.opacity = o;
  el.style.filter = blur > 0.05 ? `blur(${blur}px)` : '';
}
function words(text, cls = '') {
  return text.split(' ').map(w => `<span class="word ${cls}">${w}</span>`).join(' ');
}
// anima palavras: sobem e aparecem em sequência
function animWords(el, t, start, stagger = .07, dur = .45, dy = 40) {
  el.querySelectorAll('.word').forEach((w, i) => {
    const k = ease.out(P(t, start + i * stagger, dur));
    w.style.opacity = k;
    w.style.transform = `translateY(${(1 - k) * dy}px)`;
  });
}
const clipX = (el, k, fromRight = false) => {
  el.style.clipPath = fromRight ? `inset(0 0 0 ${(1 - k) * 100}%)` : `inset(0 ${(1 - k) * 100}% 0 0)`;
};

// ---------- ícones (viewBox 24) ----------
const ICON = {
  gear: () => {
    let teeth = '';
    for (let i = 0; i < 8; i++) teeth += `<rect x="10.4" y="1.2" width="3.2" height="4.4" rx="1" transform="rotate(${i * 45} 12 12)" fill="currentColor"/>`;
    return `${teeth}<circle cx="12" cy="12" r="7" fill="currentColor"/><circle cx="12" cy="12" r="2.8" fill="var(--hole,#0A2540)"/>`;
  },
  clock: () => `<circle cx="12" cy="12" r="9.5" fill="none" stroke="currentColor" stroke-width="2.2"/>
    <g class="hand-m"><path d="M12 12V6.2" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/></g>
    <g class="hand-h"><path d="M12 12h3.6" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/></g>`,
  tag: () => `<path d="M2.8 12.2V3.8c0-.6.4-1 1-1h8.4l9 9-9.4 9.4z" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linejoin="round"/>
    <circle cx="7.6" cy="7.6" r="1.7" fill="currentColor"/>`,
  star: () => `<path d="M12 2.2l2.95 6.2 6.8.85-5 4.7 1.28 6.75L12 17.4l-6.03 3.3 1.28-6.75-5-4.7 6.8-.85z" fill="currentColor"/>`,
  bookmarkO: () => `<path class="bm" pathLength="1" d="M6 2.8h12v18.4l-6-4.6-6 4.6z" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>`,
  bookmarkF: () => `<path d="M6 2.8h12v18.4l-6-4.6-6 4.6z" fill="currentColor"/>`,
  plane: () => `<path d="M21.5 2.5 2.8 9.6l7.4 3.3 3.3 7.4z" fill="currentColor"/><path d="M21.5 2.5 10.2 12.9" stroke="var(--cut,#EFEAE4)" stroke-width="1.6"/>`,
  linkA: () => `<path d="M10 13.4a4.6 4.6 0 0 0 6.9.5l2.8-2.8a4.6 4.6 0 0 0-6.5-6.5l-1.6 1.6" fill="none" stroke="currentColor" stroke-width="2.3" stroke-linecap="round"/>`,
  linkB: () => `<path d="M14 10.6a4.6 4.6 0 0 0-6.9-.5l-2.8 2.8a4.6 4.6 0 0 0 6.5 6.5l1.6-1.6" fill="none" stroke="currentColor" stroke-width="2.3" stroke-linecap="round"/>`,
  check: () => `<path class="ck" pathLength="1" d="M5 12.6l4.4 4.4L19.2 7.2" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>`,
  x: () => `<path d="M6.5 6.5l11 11M17.5 6.5l-11 11" stroke="currentColor" stroke-width="3" stroke-linecap="round"/>`,
  heart: () => `<path d="M12 21s-7.6-4.6-9.6-9.4C.9 8 3.3 4.4 7 4.4c2.1 0 3.6 1.1 5 3 1.4-1.9 2.9-3 5-3 3.7 0 6.1 3.6 4.6 7.2C19.6 16.4 12 21 12 21z" fill="currentColor"/>`,
  person: () => `<circle cx="12" cy="8.2" r="4.3" fill="currentColor"/><path d="M3.6 21.5c0-4.6 3.8-7.6 8.4-7.6s8.4 3 8.4 7.6z" fill="currentColor"/>`,
  play: () => `<path d="M8.5 5.2v13.6L19.4 12z" fill="currentColor"/>`,
  chat: () => `<path d="M4 4.5h16c.8 0 1.5.7 1.5 1.5v10c0 .8-.7 1.5-1.5 1.5H10l-5 4v-4H4c-.8 0-1.5-.7-1.5-1.5V6c0-.8.7-1.5 1.5-1.5z" fill="currentColor"/>`,
  globe: () => `<circle cx="12" cy="12" r="9.3" fill="none" stroke="currentColor" stroke-width="2"/><path d="M2.7 12h18.6M12 2.7c2.6 2.6 3.8 5.6 3.8 9.3s-1.2 6.7-3.8 9.3c-2.6-2.6-3.8-5.6-3.8-9.3S9.4 5.3 12 2.7z" fill="none" stroke="currentColor" stroke-width="2"/>`,
  bag: () => `<path d="M4.5 8h15l-1.2 13H5.7z" fill="currentColor"/><path d="M8.5 10V6.5a3.5 3.5 0 0 1 7 0V10" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>`,
};
const svg = (name, size, color, extra = '') =>
  `<svg width="${size}" height="${size}" viewBox="0 0 24 24" style="color:${color}" ${extra}>${ICON[name]()}</svg>`;

// nuvem (mesma linguagem do símbolo NUV), viewBox 200x130
const CLOUD_D = 'M46 116C20 116 6 98 8 80c2-18 18-30 38-28 0-26 22-44 48-43 22 1 38 15 43 33 14-9 34-8 46 6 13 15 12 40-4 55-8 7-18 13-30 13z';
const cloud = (w, color, sw = 6, fill = 'none') =>
  `<svg width="${w}" height="${w * .65}" viewBox="0 0 200 130"><path class="cl" pathLength="1" d="${CLOUD_D}" fill="${fill}" stroke="${color}" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
const drawPath = (el, k, sel = 'path') => {
  el.querySelectorAll(sel).forEach(p => { p.style.strokeDasharray = 1; p.style.strokeDashoffset = 1 - k; });
};

// estrelinhas / brilhos
const sparkle = (size, color) =>
  `<svg width="${size}" height="${size}" viewBox="0 0 24 24"><path d="M12 0c.9 6.3 5.7 11.1 12 12-6.3.9-11.1 5.7-12 12-.9-6.3-5.7-11.1-12-12C6.3 11.1 11.1 6.3 12 0z" fill="${color}"/></svg>`;

// nuvens de fundo flutuando
function bgClouds(color, alpha, list) {
  const els = list.map(c => add(cloud(c.w, color, 5), { opacity: alpha }));
  return t => els.forEach((e, i) => {
    const c = list[i];
    put(e, { x: c.x + Math.sin(t * .6 + i) * 18 + t * c.v, y: c.y + Math.cos(t * .5 + i * 2) * 10, o: alpha });
  });
}

// =====================================================================
// CENAS
// =====================================================================
const SCENES = {};

// ---------- 00 · Capa / abertura (com fundo) ----------
SCENES['00_abertura_capa'] = {
  dur: 4, bg: 'navy', build() {
    const clouds = bgClouds(C.beige, .12, [
      { x: 150, y: 330, w: 300, v: 8 }, { x: 930, y: 520, w: 260, v: -6 },
      { x: 120, y: 1500, w: 340, v: 6 }, { x: 900, y: 1650, w: 420, v: -8 },
    ]);
    const tag = add(`<div class="pill sans" style="background:${C.beige};color:${C.navy};font-size:38px;letter-spacing:.12em">INSTAGRAM QUE VENDE</div>`);
    const big = add(`<div class="serif" style="color:${C.off};font-size:240px;line-height:1">5 coisas</div>`);
    const line = add(`<svg width="640" height="40" viewBox="0 0 640 40"><path pathLength="1" d="M10 28C160 6 420 4 630 22" fill="none" stroke="${C.beige}" stroke-width="12" stroke-linecap="round"/></svg>`);
    const sub = add(`<div class="sans" style="color:${C.off};font-size:62px;text-align:center;line-height:1.35;width:900px">${words('que me fariam')}<br>${words('comprar de você')}</div>`);
    const sub2 = add(`<div class="pill sans" style="background:${C.off};color:${C.navy};font-size:62px;padding:22px 54px">sem pensar duas vezes</div>`);
    const dots = [1, 2, 3, 4, 5].map(n => add(`<div class="serif" style="width:110px;height:110px;border-radius:50%;border:4px solid ${C.beige};color:${C.beige};font-size:62px;display:flex;align-items:center;justify-content:center">${n}</div>`));
    return t => {
      clouds(t);
      const fl = Math.sin(t * 1.6) * 6;
      const kt = ease.back(P(t, .1, .55));
      put(tag, { x: 540, y: 560 + fl, s: kt, o: clamp(kt) });
      const kb = ease.back(P(t, .3, .7));
      put(big, { x: 540, y: 790 + fl, s: lerp(.4, 1, kb), o: clamp(kb * 1.5), blur: (1 - clamp(kb)) * 12 });
      put(line, { x: 540, y: 950 + fl });
      drawPath(line, ease.inOut(P(t, .8, .6)));
      put(sub, { x: 540, y: 1090 + fl });
      animWords(sub, t, 1.0, .08);
      const k2 = ease.back(P(t, 1.6, .6));
      put(sub2, { x: 540, y: 1260 + fl, s: lerp(.6, 1, k2), r: lerp(-8, -2, k2), o: clamp(k2 * 2) });
      dots.forEach((d, i) => {
        const k = ease.back(P(t, 2.1 + i * .12, .5));
        put(d, { x: 540 + (i - 2) * 150, y: 1460 + fl + Math.sin(t * 3 + i) * 4, s: k, o: clamp(k * 2) });
      });
    };
  },
};

// ---------- 01 · Gancho (sem fundo) ----------
SCENES['01_gancho_texto'] = {
  dur: 4.6, bg: 'none', build() {
    const sh = 'text-shadow:0 4px 22px rgba(7,26,46,.65),0 2px 4px rgba(7,26,46,.5)';
    const l1 = add(`<div class="sans" style="color:${C.off};font-size:60px;${sh};white-space:nowrap">${words('Se você fizesse essas coisas')}</div>`);
    const l2 = add(`<div class="sans" style="color:${C.off};font-size:60px;${sh};white-space:nowrap">${words('no Instagram,')}</div>`);
    const card = add(`<div class="card shadow serif" style="background:${C.navy};color:${C.off};font-size:88px;padding:24px 50px 36px;white-space:nowrap">eu ia comprar de você</div>`);
    const pill = add(`<div class="pill sans shadow" style="background:${C.beige};color:${C.navy};font-size:52px">sem pensar duas vezes</div>`);
    return t => {
      const out = ease.in(P(t, 4.05, .5));
      const oy = -60 * out, oo = 1 - out;
      put(l1, { x: 540, y: 420 + oy, o: oo }); animWords(l1, t, .05, .07);
      put(l2, { x: 540, y: 505 + oy, o: oo }); animWords(l2, t, .4, .07);
      const kc = ease.out(P(t, 1.0, .55));
      put(card, { x: 540, y: 650 + oy, o: oo * clamp(kc * 3), s: lerp(.92, 1, kc) }); clipX(card, kc);
      const kp = ease.back(P(t, 1.9, .55));
      put(pill, { x: 610, y: 800 + oy, s: kp, r: lerp(-14, -3, clamp(kp)), o: oo * clamp(kp * 2) });
    };
  },
};

// ---------- 02..06 · Títulos das dicas (sem fundo) ----------
const DICAS = [
  ['Mostre quem está por trás', 'rosto, equipe e quem atende'],
  ['Mostre o produto na vida real', 'gente usando de verdade'],
  ['Responda as dúvidas no feed', 'processo, prazo e preço'],
  ['Mostre o feedback dos clientes', 'prova social vende'],
  ['Deixe o link da bio funcionando', 'WhatsApp, site, loja'],
];
DICAS.forEach(([title, sub], i) => {
  SCENES[`0${i + 2}_dica${i + 1}_titulo`] = {
    dur: 3.6, bg: 'none', build() {
      const card = add(`<div class="card shadow" style="background:${C.navy};width:920px;height:330px;position:relative;overflow:hidden">
          <div class="cl-deco" style="position:absolute;right:-40px;bottom:-70px;opacity:.13">${cloud(330, C.beige, 7)}</div>
        </div>`);
      const num = add(`<div class="serif" style="color:${C.beige};font-size:210px;line-height:1">0${i + 1}</div>`);
      const bar = add(`<div style="width:5px;height:210px;background:${C.beige};border-radius:4px;opacity:.6"></div>`);
      const lab = add(`<div class="sans" style="color:${C.beige};font-size:28px;letter-spacing:.22em;width:560px">DICA ${i + 1} DE 5</div>`);
      const ttl = add(`<div class="sans" style="color:${C.off};font-size:54px;line-height:1.22;width:560px">${words(title)}</div>`);
      const sb = add(`<div class="sans" style="color:${C.beige};font-size:32px;font-weight:400;width:560px">${sub}</div>`);
      const dots = [0, 1, 2, 3, 4].map(j => add(`<div style="height:16px;border-radius:9px;background:${j === i ? C.off : C.beige};box-shadow:0 2px 10px rgba(7,26,46,.4)"></div>`));
      const Y = 420;
      return t => {
        const kin = ease.out(P(t, 0, .55));
        const kout = ease.inOut(P(t, 3.05, .5));
        const o = 1 - kout;
        put(card, { x: 540 - kout * 80, y: Y, o: clamp(kin * 3) * o });
        clipX(card, kin);
        const kn = ease.back(P(t, .25, .6));
        put(num, { x: 205 - kout * 80, y: Y + (1 - clamp(kn)) * 80, s: lerp(.6, 1, kn), o: clamp(kn * 2) * o });
        put(bar, { x: 330 - kout * 80, y: Y, sy: ease.out(P(t, .35, .5)), o });
        put(lab, { x: 640 - kout * 80, y: Y - 105, o: ease.out(P(t, .45, .4)) * o });
        put(ttl, { x: 640 - kout * 80, y: Y + 5, o });
        animWords(ttl, t, .5, .06);
        put(sb, { x: 640 - kout * 80, y: Y + 115, o: ease.out(P(t, 1.0, .5)) * o });
        dots.forEach((d, j) => {
          const k = ease.out(P(t, .7 + j * .05, .4));
          const w = j === i ? 70 : 16;
          d.style.width = w + 'px';
          put(d, { x: 540 + (j - 2) * 46 + (j > i ? 27 : j < i ? -27 : 0), y: Y + 215, o: k * o });
        });
      };
    },
  };
});

// ---------- 07 · Dica 1 — equipe (com fundo) ----------
SCENES['07_dica1_equipe'] = {
  dur: 6, bg: 'off', build() {
    const clouds = bgClouds(C.beige, .55, [{ x: 140, y: 1700, w: 300, v: 5 }, { x: 960, y: 260, w: 240, v: -5 }]);
    const ttl = add(`<div class="serif" style="color:${C.navy};font-size:104px;white-space:nowrap">${words('Quem está por trás?')}</div>`);
    const sub = add(`<div class="sans" style="color:${C.indigo};font-size:44px;white-space:nowrap">eu quero ver você e a sua equipe</div>`);
    const big = add(cloud(960, C.navy, 7));
    const people = [
      { x: 290, y: 1060, bg: C.indigo, fg: C.off, lab: 'Fundadora' },
      { x: 540, y: 960, bg: C.navy, fg: C.off, lab: 'Equipe' },
      { x: 790, y: 1060, bg: C.beige, fg: C.navy, lab: 'Atendimento' },
    ].map(p => ({
      ...p,
      av: add(`<div style="width:240px;height:240px;border-radius:50%;background:${p.bg};display:flex;align-items:flex-end;justify-content:center;overflow:hidden;border:8px solid ${C.off};box-shadow:0 18px 40px rgba(7,26,46,.25)">${svg('person', 200, p.fg, 'style="margin-bottom:-26px;color:' + p.fg + '"')}</div>`),
      chip: add(`<div class="pill sans" style="background:${C.navy};color:${C.off};font-size:34px;padding:14px 32px">${p.lab}</div>`),
    }));
    const bub = add(`<div class="sans shadow" style="background:${C.indigo};color:${C.off};font-size:44px;padding:30px 44px;border-radius:44px 44px 44px 10px;white-space:nowrap;position:relative">
        <span class="typing" style="display:inline-flex;gap:12px">${[0, 1, 2].map(() => '<i style="display:block;width:18px;height:18px;border-radius:50%;background:#EFEAE4"></i>').join('')}</span>
        <span class="msg">Oi! Sou eu que vou te atender.</span></div>`);
    const heart = add(svg('heart', 110, C.indigo));
    const spark = [add(sparkle(60, C.indigo)), add(sparkle(40, C.navy)), add(sparkle(50, C.beige))];
    return t => {
      clouds(t);
      put(ttl, { x: 540, y: 400 }); animWords(ttl, t, .1, .09, .5, 50);
      put(sub, { x: 540, y: 510, o: ease.out(P(t, .6, .5)) });
      put(big, { x: 540, y: 1010 });
      drawPath(big, ease.inOut(P(t, .5, 1.3)));
      people.forEach((p, i) => {
        const k = ease.back(P(t, .7 + i * .2, .6));
        const fl = Math.sin(t * 1.8 + i * 1.7) * 8;
        put(p.av, { x: p.x, y: p.y + fl, s: k, o: clamp(k * 2) });
        const kc = ease.back(P(t, 1.3 + i * .15, .5));
        put(p.chip, { x: p.x, y: p.y + 165 + fl, s: kc, o: clamp(kc * 2) });
      });
      const kb = ease.back(P(t, 2.2, .5));
      put(bub, { x: 540, y: 1450, s: kb, o: clamp(kb * 2) });
      const typing = bub.querySelector('.typing'), msg = bub.querySelector('.msg');
      const showMsg = t > 3.0;
      typing.style.display = showMsg ? 'none' : 'inline-flex';
      msg.style.display = showMsg ? 'inline' : 'none';
      typing.querySelectorAll('i').forEach((d, j) => { d.style.transform = `translateY(${Math.sin(t * 9 - j) * 6}px)`; });
      const kh = ease.back(P(t, 3.3, .5));
      put(heart, { x: 860, y: 780, s: kh * (1 + .08 * Math.sin(t * 8)), r: 12, o: clamp(kh * 2) });
      [[210, 820, 3.5], [900, 1270, 3.7], [190, 1330, 3.9]].forEach(([x, y, s], j) => {
        const k = ease.back(P(t, s, .5));
        put(spark[j], { x, y, s: k * (1 + .15 * Math.sin(t * 5 + j)), r: t * 40, o: clamp(k * 2) });
      });
    };
  },
};

// ---------- 08 · Dica 2 — produto na vida real (com fundo) ----------
const bottle = (w, tilt = 0) => `<svg width="${w}" height="${w * 1.9}" viewBox="0 0 100 190" style="transform:rotate(${tilt}deg)">
  <rect x="34" y="4" width="32" height="34" rx="6" fill="${C.navy}"/>
  <rect x="40" y="36" width="20" height="14" fill="${C.ink}"/>
  <rect x="14" y="48" width="72" height="138" rx="22" fill="${C.indigo}"/>
  <rect x="24" y="92" width="52" height="56" rx="8" fill="${C.beige}"/>
  <rect x="32" y="104" width="36" height="6" rx="3" fill="${C.navy}"/><rect x="32" y="118" width="26" height="5" rx="2.5" fill="${C.navy}" opacity=".6"/>
  <rect x="24" y="60" width="10" height="24" rx="5" fill="#fff" opacity=".25"/></svg>`;
SCENES['08_dica2_vida_real'] = {
  dur: 6, bg: 'navy', build() {
    const clouds = bgClouds(C.beige, .1, [{ x: 140, y: 300, w: 260, v: 6 }, { x: 960, y: 1700, w: 320, v: -5 }]);
    const ttl = add(`<div class="serif" style="color:${C.off};font-size:100px;white-space:nowrap">${words('Mostre na vida real')}</div>`);
    const sub = add(`<div class="sans" style="color:${C.beige};font-size:44px;white-space:nowrap">não só a foto bonitinha</div>`);
    // cartão esquerdo: foto de catálogo
    const L = add(`<div class="card" style="width:420px;height:600px;background:${C.off};position:relative;overflow:hidden">
        <div style="position:absolute;left:50%;top:430px;width:250px;height:60px;margin-left:-125px;border-radius:50%;background:${C.beige}"></div>
        <div style="position:absolute;left:50%;top:110px;margin-left:-70px">${bottle(140)}</div>
        <div class="sans" style="position:absolute;bottom:34px;width:100%;text-align:center;color:${C.navy};font-size:34px">Foto de catálogo</div></div>`);
    const stamp = add(`<div style="width:150px;height:150px;border-radius:50%;background:${C.alert};display:flex;align-items:center;justify-content:center;box-shadow:0 14px 30px rgba(0,0,0,.3)">${svg('x', 90, C.off)}</div>`);
    // cartão direito: uso real em vídeo
    const R = add(`<div class="card" style="width:420px;height:600px;background:${C.indigo};position:relative;overflow:hidden;border:6px solid ${C.beige}">
        <div style="position:absolute;left:28px;top:26px;display:flex;align-items:center;gap:10px"><i class="rec" style="display:block;width:22px;height:22px;border-radius:50%;background:${C.alert}"></i><span class="sans" style="color:${C.off};font-size:26px">REC</span></div>
        <div style="position:absolute;left:44px;top:250px;opacity:.95">${svg('person', 200, C.beige)}</div>
        <div class="rb" style="position:absolute;left:210px;top:150px">${bottle(110, 0)}</div>
        <div class="drops" style="position:absolute;left:150px;top:380px">${[0, 1, 2].map(j => `<i style="position:absolute;left:${j * 26}px;display:block;width:16px;height:22px;border-radius:50% 50% 50% 50%/60% 60% 40% 40%;background:${C.off}"></i>`).join('')}</div>
        <div style="position:absolute;left:28px;right:28px;bottom:84px;height:8px;border-radius:4px;background:rgba(239,234,228,.25)"><div class="prog" style="height:100%;border-radius:4px;background:${C.off};width:0"></div></div>
        <div class="sans" style="position:absolute;bottom:22px;width:100%;text-align:center;color:${C.off};font-size:34px">Uso real</div></div>`);
    const play = add(`<div style="width:120px;height:120px;border-radius:50%;background:rgba(239,234,228,.92);display:flex;align-items:center;justify-content:center">${svg('play', 64, C.navy)}</div>`);
    const ok = add(`<div style="width:150px;height:150px;border-radius:50%;background:${C.beige};display:flex;align-items:center;justify-content:center;box-shadow:0 14px 30px rgba(0,0,0,.3)">${svg('check', 90, C.navy)}</div>`);
    const cap = add(`<div class="pill sans shadow" style="background:${C.off};color:${C.navy};font-size:46px;padding:24px 50px">Mostre alguém usando de verdade</div>`);
    return t => {
      clouds(t);
      put(ttl, { x: 540, y: 380 }); animWords(ttl, t, .1, .09, .5, 50);
      put(sub, { x: 540, y: 490, o: ease.out(P(t, .6, .5)) });
      const kl = ease.out(P(t, .5, .6)), kr = ease.out(P(t, .8, .6));
      const loseL = ease.inOut(P(t, 2.2, .6));
      put(L, { x: 300, y: 1060 + (1 - kl) * 300, o: kl * lerp(1, .55, loseL), s: lerp(1, .9, loseL), r: lerp(0, -4, loseL) });
      L.style.filter = `grayscale(${loseL})`;
      const ks = ease.back(P(t, 2.0, .45));
      put(stamp, { x: 440, y: 800, s: ks * lerp(1.6, 1, clamp(ks)), r: -12, o: clamp(ks * 2) });
      const win = ease.back(P(t, 2.7, .6));
      put(R, { x: 780, y: 1060 + (1 - kr) * 300, o: kr, s: lerp(1, 1.08, clamp(win)), r: lerp(0, 3, clamp(win)) });
      const playing = t > 1.6;
      R.querySelector('.rec').style.opacity = playing ? (Math.sin(t * 8) > 0 ? 1 : .2) : .2;
      R.querySelector('.prog').style.width = `${clamp((t - 1.6) / 4) * 100}%`;
      const tilt = playing ? -28 * ease.inOut(clamp((Math.sin((t - 1.6) * 2.4 - 1.57) + 1) / 2)) : 0;
      R.querySelector('.rb').style.transform = `rotate(${tilt}deg)`;
      R.querySelectorAll('.drops i').forEach((d, j) => {
        const ph = ((t - 1.6) * 1.2 + j * .33) % 1;
        d.style.opacity = playing ? (1 - ph) : 0;
        d.style.transform = `translateY(${ph * 80}px)`;
      });
      const kp = ease.out(P(t, 1.1, .4)) * (1 - ease.in(P(t, 1.45, .3)));
      put(play, { x: 780, y: 1040, s: lerp(.6, 1, kp) + (t > 1.45 ? .4 * P(t, 1.45, .3) : 0), o: kp });
      const ko = ease.back(P(t, 3.0, .5));
      put(ok, { x: 920, y: 800, s: ko, r: 8, o: clamp(ko * 2) });
      drawPath(ok, ease.out(P(t, 3.2, .4)), '.ck');
      const kc = ease.back(P(t, 3.6, .55));
      put(cap, { x: 540, y: 1520, s: kc, o: clamp(kc * 2) });
    };
  },
};

// ---------- 09 · Dica 3 — vergonha do direct (sem fundo) ----------
SCENES['09_dica3_vergonha_direct'] = {
  dur: 4.2, bg: 'none', build() {
    const head = add(`<div class="pill sans shadow" style="background:${C.navy};color:${C.off};font-size:34px;display:flex;align-items:center;gap:16px;padding:16px 34px">${svg('plane', 40, C.beige, 'style="--cut:#0A2540;color:#CBC5B9"')}Direct</div>`);
    const bub = add(`<div class="sans shadow" style="background:${C.off};color:${C.navy};font-size:46px;line-height:1.3;padding:34px 48px;border-radius:48px 48px 12px 48px;width:640px">
        <span class="typing" style="display:inline-flex;gap:12px">${[0, 1, 2].map(() => '<i style="display:block;width:20px;height:20px;border-radius:50%;background:#313D65"></i>').join('')}</span>
        <span class="msg">${words('oi, queria saber quanto custa... ah, deixa pra lá')}</span></div>`);
    const stk = add(`<div class="pill sans shadow" style="background:${C.beige};color:${C.navy};font-size:44px">o seu feed pode responder antes</div>`);
    return t => {
      const out = ease.in(P(t, 3.7, .45)), o = 1 - out;
      const kh = ease.back(P(t, .05, .45));
      put(head, { x: 350, y: 1080 - out * 40, s: kh, o: clamp(kh * 2) * o });
      const kb = ease.back(P(t, .25, .5));
      const shake = t > 2.0 && t < 2.5 ? Math.sin(t * 60) * 8 * (1 - P(t, 2.0, .5)) : 0;
      put(bub, { x: 560 + shake, y: 1250 - out * 40, s: kb, o: clamp(kb * 2) * o });
      const typing = bub.querySelector('.typing'), msg = bub.querySelector('.msg');
      typing.style.display = t > 1.0 ? 'none' : 'inline-flex';
      msg.style.display = t > 1.0 ? 'inline' : 'none';
      typing.querySelectorAll('i').forEach((d, j) => { d.style.transform = `translateY(${Math.sin(t * 9 - j) * 6}px)`; });
      animWords(msg, t, 1.0, .06, .35, 20);
      const ks = ease.back(P(t, 2.4, .55));
      put(stk, { x: 560, y: 1450 - out * 40, s: ks, r: lerp(-12, -3, clamp(ks)), o: clamp(ks * 2) * o });
    };
  },
};

// ---------- 10 · Dica 3 — cards de dúvidas (sem fundo) ----------
SCENES['10_dica3_cards_duvidas'] = {
  dur: 7, bg: 'none', build() {
    const head = add(`<div class="pill sans shadow" style="background:${C.navy};color:${C.off};font-size:40px;padding:20px 44px">Posts que respondem:</div>`);
    const items = [['gear', 'Como funciona o processo?'], ['clock', 'Quanto tempo demora?'], ['tag', 'Quanto custa, mais ou menos?']];
    const cards = items.map(([ic, txt]) => add(`<div class="card shadow" style="width:900px;height:170px;background:${C.off};display:flex;align-items:center;gap:34px;padding:0 34px;box-sizing:border-box">
        <div class="ic" style="flex:none;width:112px;height:112px;border-radius:50%;background:${C.navy};display:flex;align-items:center;justify-content:center">${svg(ic, 64, C.beige, 'style="--hole:#0A2540;color:#CBC5B9"')}</div>
        <div class="sans" style="flex:1;color:${C.navy};font-size:44px">${txt}</div>
        <div class="tick" style="flex:none;width:76px;height:76px;border-radius:50%;background:${C.beige};display:flex;align-items:center;justify-content:center">${svg('check', 46, C.navy)}</div></div>`));
    const starts = [.5, 2.0, 3.5];
    return t => {
      const out = ease.inOut(P(t, 6.4, .5)), o = 1 - out;
      const kh = ease.back(P(t, .1, .5));
      put(head, { x: 540, y: 430, s: kh, o: clamp(kh * 2) * o });
      cards.forEach((c, i) => {
        const s = starts[i];
        const k = ease.back(P(t, s, .65));
        put(c, { x: 540 + (1 - k) * 900 - out * 200 * (i + 1) * .3, y: 620 + i * 210, o: clamp(P(t, s, .25)) * o, r: (1 - clamp(k)) * 6 });
        const ic = c.querySelector('svg');
        const lt = Math.max(0, t - s);
        if (i === 0) ic.style.transform = `rotate(${lt * 120}deg)`;
        if (i === 1) {
          c.querySelector('.hand-m').style.transform = `rotate(${lt * 360}deg)`; c.querySelector('.hand-m').style.transformOrigin = '12px 12px';
          c.querySelector('.hand-h').style.transform = `rotate(${lt * 30}deg)`; c.querySelector('.hand-h').style.transformOrigin = '12px 12px';
        }
        if (i === 2) { ic.style.transform = `rotate(${Math.sin(lt * 5) * 14 * Math.exp(-lt * .6)}deg)`; ic.style.transformOrigin = '30% 30%'; }
        const kt = ease.back(P(t, s + .7, .4));
        const tick = c.querySelector('.tick');
        tick.style.transform = `scale(${kt})`;
        drawPath(tick, ease.out(P(t, s + .8, .35)), '.ck');
      });
    };
  },
};

// ---------- 11 · Dica 4 — feedbacks (sem fundo) ----------
SCENES['11_dica4_feedbacks'] = {
  dur: 6.5, bg: 'none', build() {
    const revs = [
      { x: 470, y: 560, r: -3, ini: 'A', name: 'Ana C.', txt: 'Me ajudou demais na rotina!', s: .2 },
      { x: 610, y: 860, r: 2.5, ini: 'B', name: 'Bruno M.', txt: 'Comprei só pelos comentários.', s: 1.1 },
      { x: 480, y: 1160, r: -1.5, ini: 'C', name: 'Carla S.', txt: 'Atendimento impecável, recomendo!', s: 2.0 },
    ].map((v, i) => ({
      ...v,
      el: add(`<div class="card shadow" style="width:720px;background:${C.off};padding:30px 38px;box-sizing:border-box">
          <div style="display:flex;align-items:center;gap:22px">
            <div class="serif" style="width:86px;height:86px;border-radius:50%;background:${[C.indigo, C.navy, C.beige][i]};color:${i === 2 ? C.navy : C.off};font-size:50px;display:flex;align-items:center;justify-content:center">${v.ini}</div>
            <div><div class="sans" style="color:${C.navy};font-size:34px">${v.name}</div>
              <div class="stars" style="display:flex;gap:6px;margin-top:8px">${[0, 1, 2, 3, 4].map(() => `<span style="display:block">${svg('star', 40, '#E2A93B')}</span>`).join('')}</div></div>
          </div>
          <div class="sans" style="color:${C.indigo};font-size:42px;margin-top:22px;line-height:1.3">“${v.txt}”</div></div>`),
    }));
    const hearts = [0, 1, 2, 3, 4, 5].map(i => add(svg('heart', 50 + (i % 3) * 16, [C.indigo, C.beige, C.navy][i % 3])));
    return t => {
      const out = ease.inOut(P(t, 5.9, .5)), o = 1 - out;
      revs.forEach((v, i) => {
        const k = ease.back(P(t, v.s, .6));
        const fl = Math.sin(t * 1.5 + i * 2) * 6;
        put(v.el, { x: v.x, y: v.y + fl - out * 60, s: lerp(.5, 1, k), r: v.r + (1 - clamp(k)) * 10, o: clamp(k * 2) * o });
        v.el.querySelectorAll('.stars span').forEach((st, j) => {
          const ks = ease.back(P(t, v.s + .35 + j * .09, .35));
          st.style.transform = `scale(${ks})`;
        });
      });
      hearts.forEach((h, i) => {
        const s = .9 + i * .55, lt = t - s;
        const k = clamp(lt / 1.8);
        const x = [880, 200, 920, 230, 860, 180][i] + Math.sin(lt * 4 + i) * 20;
        put(h, { x, y: [700, 900, 1050, 600, 1300, 1250][i] - k * 260, s: ease.back(P(t, s, .4)), r: Math.sin(lt * 3) * 15, o: (lt > 0 ? 1 - ease.in(k) : 0) * o });
      });
    };
  },
};

// ---------- 12 · Dica 5 — link da bio (com fundo) ----------
SCENES['12_dica5_link_bio'] = {
  dur: 7.5, bg: 'navy', build() {
    const clouds = bgClouds(C.beige, .1, [{ x: 120, y: 760, w: 240, v: 4 }, { x: 980, y: 1400, w: 260, v: -4 }]);
    const caps = ['Clicou no link da bio...', '...e não funciona?', 'Link funcionando = venda!'].map(s =>
      add(`<div class="serif" style="color:${C.off};font-size:86px;white-space:nowrap">${s}</div>`));
    const phone = add(`<div style="width:560px;height:1060px;border-radius:72px;background:${C.ink};padding:18px;box-sizing:border-box;box-shadow:0 40px 90px rgba(0,0,0,.45)">
      <div class="scr" style="position:relative;width:100%;height:100%;border-radius:56px;background:${C.off};overflow:hidden">
        <div style="position:absolute;left:50%;top:18px;margin-left:-70px;width:140px;height:36px;border-radius:20px;background:${C.ink}"></div>
        <div style="position:absolute;left:40px;top:96px;display:flex;align-items:center;gap:26px">
          <div style="width:150px;height:150px;border-radius:50%;background:${C.navy};display:flex;align-items:center;justify-content:center;border:5px solid ${C.beige}"><img src="assets/logo/nuv-simbolo-offwhite.png" style="width:110px"></div>
          <div style="display:flex;gap:26px">${['42<br>posts', '3,2 mil<br>seguidores'].map(s => `<div class="sans" style="color:${C.navy};font-size:24px;text-align:center;line-height:1.3">${s}</div>`).join('')}</div></div>
        <div class="sans" style="position:absolute;left:40px;top:272px;color:${C.navy};font-size:32px">Sua Marca</div>
        <div style="position:absolute;left:40px;top:322px;width:400px;height:14px;border-radius:7px;background:${C.beige}"></div>
        <div style="position:absolute;left:40px;top:350px;width:300px;height:14px;border-radius:7px;background:${C.beige}"></div>
        <div class="lnk sans" style="position:absolute;left:40px;top:388px;display:flex;align-items:center;gap:10px;background:${C.indigo};color:${C.off};font-size:28px;padding:12px 24px;border-radius:30px">${svg('linkA', 34, C.off).replace('</svg>', ICON.linkB() + '</svg>')}suamarca.com/links</div>
        <div style="position:absolute;left:40px;right:40px;top:480px;display:grid;grid-template-columns:repeat(3,1fr);gap:8px">${Array.from({ length: 9 }, (_, j) => `<div style="aspect-ratio:1;border-radius:10px;background:${[C.beige, C.indigo, C.navy][j % 3]};opacity:${j % 3 === 0 ? 1 : .85}"></div>`).join('')}</div>
        <div class="sheet" style="position:absolute;left:0;right:0;bottom:0;height:680px;background:#fff;border-radius:48px 48px 0 0;box-shadow:0 -10px 40px rgba(7,26,46,.25)">
          <div class="err" style="position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;padding-top:90px">
            <div class="brk" style="position:relative;width:200px;height:200px">
              <div class="ha" style="position:absolute;inset:0">${svg('linkA', 200, C.alert)}</div>
              <div class="hb" style="position:absolute;inset:0">${svg('linkB', 200, C.alert)}</div></div>
            <div class="sans" style="color:${C.alert};font-size:40px;margin-top:40px">Ops! Link quebrado</div>
            <div class="sans" style="color:${C.indigo};font-size:28px;font-weight:400;margin-top:14px">Erro 404 · página não encontrada</div></div>
          <div class="ok" style="position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;padding-top:60px;gap:26px">
            ${[['chat', 'WhatsApp'], ['globe', 'Site'], ['bag', 'Loja']].map(([ic, l]) => `<div class="btn sans" style="width:420px;height:120px;border-radius:30px;background:${C.navy};color:${C.off};font-size:38px;display:flex;align-items:center;gap:26px;padding-left:44px;box-sizing:border-box">${svg(ic, 52, C.beige)}${l}</div>`).join('')}
          </div></div>
      </div></div>`);
    const finger = add(`<div style="width:110px;height:110px;border-radius:50%;background:rgba(239,234,228,.55);border:5px solid ${C.off};box-shadow:0 8px 24px rgba(0,0,0,.35)"></div>`);
    const ripple = add(`<div style="width:120px;height:120px;border-radius:50%;border:6px solid ${C.off}"></div>`);
    const badge = add(`<div style="width:170px;height:170px;border-radius:50%;background:${C.beige};display:flex;align-items:center;justify-content:center;box-shadow:0 14px 34px rgba(0,0,0,.35)">${svg('check', 100, C.navy)}</div>`);
    const spk = [0, 1, 2].map(i => add(sparkle([70, 46, 56][i], [C.beige, C.off, C.beige][i])));
    const PX = 540, PY = 1080;
    return t => {
      clouds(t);
      // legenda que troca
      const ci = t < 1.9 ? 0 : t < 4.0 ? 1 : 2, cs = [0, 1.9, 4.0][ci];
      caps.forEach((c, i) => {
        const k = i === ci ? ease.back(P(t, cs + .05, .5)) : 0;
        put(c, { x: 540, y: 330, s: lerp(.7, 1, clamp(k)), o: clamp(k * 2) });
      });
      const kp = ease.out(P(t, 0, .7));
      const shake = t > 2.0 && t < 2.6 ? Math.sin(t * 70) * 14 * (1 - P(t, 2.0, .6)) : 0;
      put(phone, { x: PX + shake, y: PY + (1 - kp) * 900 });
      // dedo vai até o link e toca
      const kf = ease.inOut(P(t, .8, .6)), fo = ease.out(P(t, .8, .2)) * (1 - ease.out(P(t, 1.6, .3)));
      const lx = PX - 280 + 18 + 40 + 150, ly = PY - 530 + 18 + 388 + 30;
      put(finger, { x: lerp(860, lx, kf), y: lerp(1500, ly, kf), s: t > 1.35 && t < 1.55 ? .85 : 1, o: fo });
      const kr = P(t, 1.4, .5);
      put(ripple, { x: lx, y: ly, s: lerp(.4, 2.2, ease.out(kr)), o: kr > 0 && kr < 1 ? 1 - kr : 0 });
      // folha que sobe
      const sheet = phone.querySelector('.sheet');
      const ks = ease.out(P(t, 1.6, .45));
      sheet.style.transform = `translateY(${(1 - ks) * 700}px)`;
      const fix = ease.inOut(P(t, 3.4, .6));
      const err = sheet.querySelector('.err'), ok = sheet.querySelector('.ok');
      const gap = (1 - fix) * 46 + (t > 1.9 && t < 3.4 ? Math.sin(t * 9) * 6 : 0);
      sheet.querySelector('.ha').style.transform = `translate(${gap}px,${-gap}px) rotate(${(1 - fix) * 10}deg)`;
      sheet.querySelector('.hb').style.transform = `translate(${-gap}px,${gap}px) rotate(${(1 - fix) * -10}deg)`;
      sheet.querySelectorAll('.brk path').forEach(p => { p.setAttribute('stroke', fix > .5 ? C.indigo : C.alert); });
      const sw = ease.inOut(P(t, 4.0, .4));
      err.style.opacity = 1 - sw;
      err.style.transform = `translateY(${-sw * 80}px)`;
      ok.style.opacity = sw;
      ok.querySelectorAll('.btn').forEach((b, j) => {
        const kb = ease.back(P(t, 4.1 + j * .18, .5));
        b.style.transform = `translateX(${(1 - kb) * 500}px)`;
      });
      const kbd = ease.back(P(t, 4.6, .5));
      put(badge, { x: PX + 250, y: PY - 470, s: kbd, r: 8, o: clamp(kbd * 2) });
      drawPath(badge, ease.out(P(t, 4.75, .35)), '.ck');
      [[PX - 330, PY - 300, 5.0], [PX + 330, PY + 120, 5.15], [PX - 310, PY + 420, 5.3]].forEach(([x, y, s], j) => {
        const k = ease.back(P(t, s, .5));
        put(spk[j], { x, y, s: k * (1 + .15 * Math.sin(t * 5 + j)), r: t * 50, o: clamp(k * 2) });
      });
    };
  },
};

// ---------- 13 · Salva esse vídeo (sem fundo) ----------
SCENES['13_salva_esse_video'] = {
  dur: 3.8, bg: 'none', build() {
    const card = add(`<div class="card shadow" style="background:${C.navy};width:840px;height:250px"></div>`);
    const bmO = add(svg('bookmarkO', 150, C.beige));
    const bmF = add(svg('bookmarkF', 150, C.beige));
    const ttl = add(`<div class="serif" style="color:${C.off};font-size:82px;white-space:nowrap">Salva esse vídeo</div>`);
    const sub = add(`<div class="sans" style="color:${C.beige};font-size:32px;white-space:nowrap">pra aplicar no perfil da sua marca</div>`);
    const rays = [0, 1, 2, 3, 4, 5].map(() => add(`<div style="width:10px;height:34px;border-radius:5px;background:${C.beige}"></div>`));
    const Y = 1250, BX = 250;
    return t => {
      const out = ease.inOut(P(t, 3.3, .45)), o = 1 - out;
      const kc = ease.back(P(t, 0, .55));
      put(card, { x: 540, y: Y, s: lerp(.7, 1, kc), o: clamp(kc * 2) * o });
      put(bmO, { x: BX, y: Y, o: o * clamp(kc * 2) });
      drawPath(bmO, ease.inOut(P(t, .25, .6)), '.bm');
      const kf = ease.elastic(P(t, .9, .9));
      put(bmF, { x: BX, y: Y, s: kf, o: (t > .9 ? 1 : 0) * o });
      rays.forEach((r, i) => {
        const a = -90 + (i - 2.5) * 32, kr = P(t, 1.0, .5);
        const d = lerp(90, 150, ease.out(kr));
        put(r, { x: BX + Math.cos(a * Math.PI / 180) * d, y: Y - 10 + Math.sin(a * Math.PI / 180) * d, r: a + 90, o: kr > 0 && kr < 1 ? 1 - kr : 0 });
      });
      const kt = ease.out(P(t, .35, .5));
      put(ttl, { x: 640 + (1 - kt) * 40, y: Y - 30, o: kt * o });
      put(sub, { x: 640 + (1 - kt) * 40, y: Y + 60, o: ease.out(P(t, .6, .5)) * o });
    };
  },
};

// ---------- 14 · Chama no direct (sem fundo) ----------
SCENES['14_chama_no_direct'] = {
  dur: 4, bg: 'none', build() {
    const pill = add(`<div class="pill sans shadow" style="background:${C.off};color:${C.navy};font-size:56px;padding:34px 60px 34px 170px">Chama a gente no direct</div>`);
    const plane = add(svg('plane', 80, C.navy, 'style="--cut:#EFEAE4;color:#0A2540"'));
    const trail = add(`<svg width="420" height="60" viewBox="0 0 420 60"><path pathLength="1" d="M0 50C120 50 220 10 410 30" fill="none" stroke="${C.beige}" stroke-width="6" stroke-dasharray=".04 .03" stroke-linecap="round"/></svg>`);
    const sub = add(`<div class="pill sans shadow" style="background:${C.navy};color:${C.beige};font-size:38px;padding:16px 38px">ou no link da bio</div>`);
    const Y = 1250;
    return t => {
      const out = ease.inOut(P(t, 3.5, .45)), o = 1 - out;
      const kp = ease.back(P(t, .1, .55));
      put(pill, { x: 540, y: Y, s: kp, o: clamp(kp * 2) * o });
      const kf = ease.out(P(t, .3, .8));
      const px = lerp(-80, 150, kf), py = Y + Math.sin(kf * Math.PI) * -60;
      put(plane, { x: px, y: py + Math.sin(t * 4) * 4, r: lerp(25, 0, kf), o: clamp(P(t, .3, .1)) * o });
      put(trail, { x: px - 230, y: py + 10, o: (1 - P(t, .9, .5)) * clamp(P(t, .35, .1)) * o });
      const ks = ease.back(P(t, 1.0, .5));
      put(sub, { x: 560, y: Y + 150, s: ks, r: -2, o: clamp(ks * 2) * o });
      // pulso suave para chamar atenção
      if (t > 1.6 && t < 3.5) put(pill, { x: 540, y: Y, s: 1 + .03 * Math.sin((t - 1.6) * 6), o });
    };
  },
};

// ---------- 15 · Encerramento com logo (com fundo) ----------
SCENES['15_encerramento_logo'] = {
  dur: 5, bg: 'off', build() {
    const clouds = bgClouds(C.beige, .7, [{ x: 150, y: 300, w: 260, v: 5 }, { x: 950, y: 1650, w: 300, v: -5 }, { x: 940, y: 420, w: 160, v: -3 }]);
    const q = add(`<div class="serif" style="color:${C.navy};font-size:92px;line-height:1.1;text-align:center;width:900px">${words('Quer que a gente faça isso por você?')}</div>`);
    const logo = add(`<img src="assets/logo/nuv-agencia-indigo.png" style="width:640px;display:block">`);
    const btn = add(`<div class="pill sans shadow" style="background:${C.navy};color:${C.off};font-size:50px;padding:30px 60px;display:flex;align-items:center;gap:22px">${svg('plane', 54, C.beige, 'style="--cut:#0A2540;color:#CBC5B9"')}Chama no direct</div>`);
    return t => {
      clouds(t);
      put(q, { x: 540, y: 500 }); animWords(q, t, .1, .08, .5, 50);
      const kl = ease.out(P(t, .7, .9));
      put(logo, { x: 540, y: 1020 + Math.sin(t * 1.5) * 6, s: lerp(.8, 1, kl), o: kl, blur: (1 - kl) * 16 });
      const kb = ease.back(P(t, 1.7, .55));
      put(btn, { x: 540, y: 1480, s: kb * (t > 2.4 ? 1 + .03 * Math.sin((t - 2.4) * 6) : 1), o: clamp(kb * 2) });
    };
  },
};

// ---------- API usada pelo render.mjs ----------
let current = null;
window.SCENES = SCENES;
window.setup = id => {
  const sc = SCENES[id];
  stage.innerHTML = '';
  stage.className = sc.bg === 'none' ? '' : 'bg-' + sc.bg;
  current = sc.build();
  current(0);
  return { dur: sc.dur, alpha: sc.bg === 'none' };
};
window.frame = t => current(t);
window.ready = async () => {
  await Promise.all(["400 40px Titulo", "italic 400 40px Titulo", "400 40px Comfortaa", "700 40px Comfortaa", "400 40px UI", "600 40px UI", "700 40px UI"].map(f => document.fonts.load(f, 'Aá')));
  await document.fonts.ready;
  await Promise.all([...document.images].map(i => (i.complete ? 0 : new Promise(r => { i.onload = i.onerror = r; }))));
};
