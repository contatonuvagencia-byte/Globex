// Roteiro "primeira impressão" — Telas 4, 5 e 6 (todas sem fundo).
// Usa os utilitários de scenes.js (add, put, ease, P, svg, cloud...).

const SKIN = '#D8A47F', SKIN_D = '#C08C68';
function rng(seed) { let s = seed; return () => (s = (s * 16807) % 2147483647) / 2147483647; }

// celular genérico: devolve o elemento e a "tela" interna
function phoneEl(inner, w = 520, h = 1000) {
  const el = add(`<div style="width:${w}px;height:${h}px;border-radius:70px;background:${C.ink};padding:16px;box-sizing:border-box;box-shadow:0 40px 90px rgba(7,26,46,.45)">
    <div class="scr" style="position:relative;width:100%;height:100%;border-radius:56px;background:${C.off};overflow:hidden">${inner}
      <div style="position:absolute;left:50%;top:16px;margin-left:-64px;width:128px;height:34px;border-radius:20px;background:${C.ink};z-index:9"></div>
      <div class="homebar" style="position:absolute;left:50%;bottom:14px;margin-left:-80px;width:160px;height:8px;border-radius:4px;background:${C.navy};opacity:.5;z-index:9"></div>
    </div></div>`);
  return el;
}
// dedo: bolinha de toque
const fingerEl = () => add(`<div style="width:104px;height:104px;border-radius:50%;background:rgba(239,234,228,.55);border:5px solid ${C.off};box-shadow:0 8px 24px rgba(7,26,46,.45)"></div>`);

// card de texto com número (padrão das telas)
function numCard(n, mainHtml, subHtml = '') {
  const card = add(`<div class="card shadow" style="background:${C.navy};width:920px;padding:44px 50px 46px 200px;box-sizing:border-box;position:relative;overflow:hidden">
      <div style="position:absolute;right:-50px;bottom:-80px;opacity:.12">${cloud(300, C.beige, 7)}</div>
      <div class="serif" style="color:${C.off};font-size:74px;line-height:1.08">${mainHtml}</div>
      ${subHtml ? `<div class="sans sub" style="color:${C.beige};font-size:40px;line-height:1.3;margin-top:18px">${subHtml}</div>` : ''}
    </div>`);
  const badge = add(`<div class="serif" style="width:132px;height:132px;border-radius:50%;background:${C.beige};color:${C.navy};font-size:92px;display:flex;align-items:center;justify-content:center;line-height:1;box-shadow:0 12px 30px rgba(7,26,46,.35)">${n}</div>`);
  return { card, badge };
}
function animNumCard({ card, badge }, t, Y, out) {
  const kin = ease.out(P(t, 0, .55)), o = 1 - out;
  put(card, { x: 540 - out * 80, y: Y, o: clamp(kin * 3) * o });
  clipX(card, kin);
  const kb = ease.back(P(t, .2, .55));
  const h = card.offsetHeight;
  put(badge, { x: 166 - out * 80, y: Y - h / 2 + 100, s: kb, r: lerp(-30, 0, clamp(kb)), o: clamp(kb * 2) * o });
  animWords(card, t, .35, .06);
  const sub = card.querySelector('.sub');
  if (sub) { const k = ease.out(P(t, .9, .5)); sub.style.opacity = k; sub.style.transform = `translateY(${(1 - k) * 20}px)`; }
}

// ---------- Tela 4 · "Não vou ler esse textão não" ----------
SCENES['T4_textao'] = {
  dur: 6, bg: 'none', build() {
    const nc = numCard(3, words('“Não vou ler esse textão não”'));
    const r = rng(7);
    const lines = Array.from({ length: 70 }, (_, i) =>
      `<div style="height:16px;border-radius:8px;margin:0 0 15px;width:${i % 9 === 8 ? 35 + r() * 25 : 72 + r() * 26}%;background:${C.navy};opacity:${.55 + r() * .25}"></div>`).join('');
    const post = (bg, shape, extra) => `
      <div style="display:flex;align-items:center;gap:16px;padding:0 26px;height:84px">
        <div style="width:58px;height:58px;border-radius:50%;background:${C.navy};display:flex;align-items:center;justify-content:center"><img src="assets/logo/nuv-simbolo-offwhite.png" style="width:42px"></div>
        <div class="sans" style="color:${C.navy};font-size:26px">suamarca</div></div>
      <div style="height:488px;background:${bg};display:flex;align-items:center;justify-content:center">${shape}</div>
      <div style="display:flex;gap:22px;padding:18px 26px 10px">${svg('heart', 40, C.navy)}${svg('chat', 40, C.navy)}${svg('plane', 40, C.navy, 'style="--cut:#EFEAE4;color:#0A2540"')}</div>
      ${extra}`;
    const p1 = post(C.indigo, cloud(300, C.off, 9),
      `<div class="cap" style="padding:8px 26px 0"><div class="sans" style="color:${C.navy};font-size:24px;margin-bottom:14px">suamarca <span style="font-weight:400">Hoje eu quero te contar uma história...</span></div>${lines}</div>`);
    const p2 = post(C.beige, `<div class="serif" style="color:${C.navy};font-size:120px">oi!</div>`,
      `<div style="padding:8px 26px 0"><div class="sans" style="color:${C.navy};font-size:24px">suamarca <span style="font-weight:400">Curto e direto.</span></div></div>`);
    const ph = phoneEl(`<div class="feed" style="position:absolute;left:0;right:0;top:56px">
        <div class="p1" style="position:absolute;left:0;right:0;top:0;height:2400px;overflow:hidden">${p1}</div>
        <div class="p2" style="position:absolute;left:0;right:0;top:0">${p2}</div></div>
      <div class="more" style="position:absolute;left:24px;right:24px;top:56px;bottom:0;pointer-events:none"></div>`);
    const fin = fingerEl();
    const trail = add(`<div style="width:16px;height:260px;border-radius:8px;background:linear-gradient(${C.off},rgba(239,234,228,0))"></div>`);
    const stk = add(`<div class="pill sans shadow" style="background:${C.beige};color:${C.navy};font-size:44px;display:flex;align-items:center;gap:16px">pulou pro próximo <span style="font-size:52px;line-height:0">›</span></div>`);
    const zz = add(`<div class="sans shadow" style="background:${C.off};color:${C.navy};font-size:40px;padding:18px 30px;border-radius:36px 36px 36px 8px">...e era isso?</div>`);
    const PX = 540, PY = 1200;
    return t => {
      const out = ease.inOut(P(t, 5.5, .5)), o = 1 - out;
      animNumCard(nc, t, 420, out);
      const kp = ease.out(P(t, .3, .7));
      put(ph, { x: PX, y: PY + (1 - kp) * 300 - out * 60, o: clamp(kp * 2) * o });
      // rolagem da legenda: dedo arrasta várias vezes cada vez mais rápido
      const feed = ph.querySelector('.feed'), p1 = ph.querySelector('.p1'), p2 = ph.querySelector('.p2');
      const swipes = [1.1, 1.55, 1.9, 2.2, 2.45];
      let scroll = 0, fy = 0, fo = 0;
      swipes.forEach((s, i) => {
        const k = P(t, s, .3);
        scroll += ease.out(k) * (220 + i * 90);
        if (t >= s - .05 && t < s + .32) { fy = lerp(1460, 1060, ease.inOut(k)); fo = 1; }
      });
      // pulo para o próximo post
      const skip = ease.inOut(P(t, 2.95, .5));
      if (t >= 2.8 && t < 3.5) { fy = lerp(1500, 860, ease.inOut(P(t, 2.85, .5))); fo = 1 - P(t, 3.3, .2); }
      if (t > .9 && t < 1.1) { fy = 1460; fo = P(t, .9, .2); }
      p1.scrollTop = 0;
      p1.style.transform = `translateY(${-scroll - skip * 1100}px)`;
      p2.style.transform = `translateY(${(1 - skip) * 1100}px)`;
      p2.style.opacity = skip > 0 ? 1 : 0;
      put(fin, { x: PX + 120, y: fy, o: fo * o, s: fo > 0 ? .92 : 1 });
      put(trail, { x: PX + 120, y: fy + 150, o: fo * .6 * o });
      const kz = ease.back(P(t, 2.1, .4)) * (1 - ease.in(P(t, 2.75, .2)));
      put(zz, { x: 260, y: 900, s: kz, r: -6, o: clamp(kz * 2) * o });
      const ks = ease.back(P(t, 3.45, .55));
      put(stk, { x: 760, y: 1600 - out * 60, s: ks, r: lerp(-12, -4, clamp(ks)), o: clamp(ks * 2) * o });
    };
  },
};

// ---------- Tela 5 · Link da bio dá erro + fecha o app ----------
SCENES['T5_link_bio_erro'] = {
  dur: 7, bg: 'none', build() {
    const nc = numCard(4, words('Link da bio dá erro.'), 'Se o link não funciona, imagina o resto');
    const icons = Array.from({ length: 20 }, (_, j) => `<div class="ic${j === 6 ? ' target' : ''}" style="width:86px;height:86px;border-radius:24px;background:${j === 6 ? C.navy : [C.beige, C.indigo, '#46527d', C.off][j % 4]};opacity:${j === 6 ? 1 : .9};display:flex;align-items:center;justify-content:center">${j === 6 ? '<img src="assets/logo/nuv-simbolo-offwhite.png" style="width:60px">' : ''}</div>`).join('');
    const inner = `
      <div class="home" style="position:absolute;inset:0;background:linear-gradient(160deg,${C.indigo},${C.navy});display:grid;grid-template-columns:repeat(4,86px);gap:30px 22px;padding:110px 30px 0;justify-content:center;align-content:start">${icons}</div>
      <div class="app" style="position:absolute;inset:0;background:${C.off};transform-origin:50% 50%">
        <div style="position:absolute;left:34px;top:90px;display:flex;align-items:center;gap:24px">
          <div style="width:136px;height:136px;border-radius:50%;background:${C.navy};display:flex;align-items:center;justify-content:center;border:5px solid ${C.beige}"><img src="assets/logo/nuv-simbolo-offwhite.png" style="width:98px"></div>
          <div style="display:flex;gap:22px">${['38<br>posts', '2,4 mil<br>seguidores'].map(s => `<div class="sans" style="color:${C.navy};font-size:23px;text-align:center;line-height:1.3">${s}</div>`).join('')}</div></div>
        <div class="sans" style="position:absolute;left:34px;top:250px;color:${C.navy};font-size:30px">Sua Marca</div>
        <div style="position:absolute;left:34px;top:298px;width:380px;height:14px;border-radius:7px;background:${C.beige}"></div>
        <div style="position:absolute;left:34px;top:324px;width:280px;height:14px;border-radius:7px;background:${C.beige}"></div>
        <div class="lnk sans" style="position:absolute;left:34px;top:360px;display:flex;align-items:center;gap:10px;background:${C.indigo};color:${C.off};font-size:27px;padding:12px 24px;border-radius:30px">${svg('linkA', 32, C.off).replace('</svg>', ICON.linkB() + '</svg>')}suamarca.com/links</div>
        <div style="position:absolute;left:34px;right:34px;top:450px;display:grid;grid-template-columns:repeat(3,1fr);gap:8px">${Array.from({ length: 9 }, (_, j) => `<div style="aspect-ratio:1;border-radius:10px;background:${[C.beige, C.indigo, C.navy][j % 3]}"></div>`).join('')}</div>
        <div class="load" style="position:absolute;inset:0;background:rgba(239,234,228,.85);display:flex;align-items:center;justify-content:center">
          <div class="spin" style="width:96px;height:96px;border-radius:50%;border:10px solid ${C.beige};border-top-color:${C.navy}"></div></div>
        <div class="err" style="position:absolute;inset:0;background:#fff;display:flex;flex-direction:column;align-items:center;justify-content:center;padding-bottom:60px">
          <div class="brk" style="position:relative;width:190px;height:190px">
            <div class="ha" style="position:absolute;inset:0">${svg('linkA', 190, C.alert)}</div>
            <div class="hb" style="position:absolute;inset:0">${svg('linkB', 190, C.alert)}</div></div>
          <div class="serif" style="color:${C.alert};font-size:120px;line-height:1;margin-top:26px">404</div>
          <div class="sans" style="color:${C.indigo};font-size:32px;margin-top:14px">página não encontrada</div></div>
      </div>`;
    const ph = phoneEl(inner);
    const fin = fingerEl();
    const ripple = add(`<div style="width:120px;height:120px;border-radius:50%;border:6px solid ${C.off}"></div>`);
    const stk = add(`<div class="pill sans shadow" style="background:${C.alert};color:${C.off};font-size:44px;display:flex;align-items:center;gap:16px">${svg('x', 40, C.off)}fechou o app</div>`);
    const PX = 540, PY = 1240;
    return t => {
      const out = ease.inOut(P(t, 6.5, .5)), o = 1 - out;
      animNumCard(nc, t, 410, out);
      const kp = ease.out(P(t, .3, .7));
      const shake = t > 2.3 && t < 2.8 ? Math.sin(t * 70) * 12 * (1 - P(t, 2.3, .5)) : 0;
      put(ph, { x: PX + shake, y: PY + (1 - kp) * 300 - out * 60, o: clamp(kp * 2) * o });
      // toque no link
      const lx = PX - 260 + 16 + 34 + 150, ly = PY - 500 + 16 + 360 + 28;
      const kf = ease.inOut(P(t, 1.0, .55));
      let fx = lerp(PX + 300, lx, kf), fy = lerp(PY + 380, ly, kf);
      let fo = ease.out(P(t, 1.0, .15)) * (1 - ease.out(P(t, 1.75, .2)));
      // segundo gesto: arrastar pra cima na barra (fechar o app)
      const kc = ease.inOut(P(t, 3.3, .55));
      if (t > 3.1) { fx = PX; fy = lerp(PY + 470, PY + 120, kc); fo = ease.out(P(t, 3.1, .15)) * (1 - ease.out(P(t, 3.85, .2))); }
      put(fin, { x: fx, y: fy, s: t > 1.5 && t < 1.68 ? .85 : 1, o: fo * o });
      const kr = P(t, 1.55, .5);
      put(ripple, { x: lx, y: ly, s: lerp(.4, 2.2, ease.out(kr)), o: (kr > 0 && kr < 1 ? 1 - kr : 0) * o });
      const app = ph.querySelector('.app');
      const load = app.querySelector('.load'), err = app.querySelector('.err');
      load.style.opacity = t > 1.65 && t < 2.3 ? 1 : 0;
      app.querySelector('.spin').style.transform = `rotate(${t * 540}deg)`;
      const ke = ease.out(P(t, 2.25, .3));
      err.style.opacity = ke;
      err.style.transform = `scale(${lerp(1.08, 1, ke)})`;
      const gap = 36 + (t > 2.3 ? Math.sin(t * 10) * 6 : 0);
      app.querySelector('.ha').style.transform = `translate(${gap}px,${-gap}px) rotate(10deg)`;
      app.querySelector('.hb').style.transform = `translate(${-gap}px,${gap}px) rotate(-10deg)`;
      // app encolhe até o ícone na tela inicial
      const target = ph.querySelector('.target');
      const sc = ph.querySelector('.scr');
      const tr = target.getBoundingClientRect(), srr = sc.getBoundingClientRect();
      const tx = (tr.left + tr.width / 2) - (srr.left + srr.width / 2), ty = (tr.top + tr.height / 2) - (srr.top + srr.height / 2);
      const kshr = ease.inOut(P(t, 3.45, .7));
      app.style.transform = `translate(${tx * kshr}px,${ty * kshr - Math.sin(kshr * Math.PI) * 60}px) scale(${lerp(1, 86 / 488, kshr)},${lerp(1, 86 / 968, kshr)})`;
      app.style.borderRadius = `${lerp(0, 120, kshr)}px`;
      app.style.opacity = 1 - ease.in(P(t, 3.9, .3));
      ph.querySelectorAll('.home .ic').forEach((ic, j) => {
        const k = ease.back(P(t, 3.6 + (j % 4) * .03 + Math.floor(j / 4) * .03, .45));
        ic.style.transform = `scale(${lerp(.7, 1, clamp(k))})`;
      });
      const ks = ease.back(P(t, 4.2, .55));
      put(stk, { x: 700, y: 1660 - out * 60, s: ks, r: lerp(-12, -4, clamp(ks)), o: clamp(ks * 2) * o });
    };
  },
};

// ---------- Tela 6 · Fechamento (notebook, café, mãos digitando) ----------
SCENES['T6_fechamento'] = {
  dur: 8, bg: 'none', build() {
    const head = add(`<div class="card shadow" style="background:${C.navy};width:920px;padding:44px 54px 48px;box-sizing:border-box;text-align:center;position:relative;overflow:hidden">
        <div style="position:absolute;right:-60px;bottom:-90px;opacity:.12">${cloud(260, C.beige, 7)}</div>
        <div class="serif" style="color:${C.off};font-size:72px;line-height:1.1;text-wrap:balance">${words('Seu cliente decide em segundos se confia em você.')}</div></div>`);
    const sub = add(`<div class="pill sans shadow" style="background:${C.off};color:${C.navy};font-size:36px;padding:22px 40px">Deixa a NUV cuidar dessa primeira impressão</div>`);
    const fingers = (x, y, flip) => [0, 1, 2, 3].map(i => `<rect class="fg" x="${x + (flip ? -1 : 1) * (i * 30 - 45) - 13}" y="${y - 70 - [0, 10, 6, -6][i]}" width="26" height="78" rx="13" fill="${SKIN}"/>`).join('');
    const hand = (cls, x, y, flip) => `<g class="${cls}">
        <path d="M${x - 70} ${y + 130} L${x - 58} ${y + 30} Q${x} ${y - 10} ${x + 58} ${y + 30} L${x + 70} ${y + 130} Z" fill="${C.indigo}"/>
        <rect x="${x - 62}" y="${y + 18}" width="124" height="22" rx="11" fill="${C.navy}"/>
        ${fingers(x, y, flip)}
        <rect x="${x + (flip ? 52 : -78)}" y="${y - 40}" width="26" height="62" rx="13" fill="${SKIN_D}" transform="rotate(${flip ? -35 : 35} ${x + (flip ? 65 : -65)} ${y})"/>
        <ellipse cx="${x}" cy="${y - 4}" rx="68" ry="44" fill="${SKIN}"/></g>`;
    const lap = add(`<svg width="1000" height="760" viewBox="0 0 1000 760">
        <ellipse cx="470" cy="600" rx="470" ry="40" fill="${C.navy}" opacity=".18"/>
        <rect x="160" y="40" width="620" height="400" rx="26" fill="${C.ink}"/>
        <rect x="180" y="60" width="580" height="356" rx="10" fill="${C.off}"/>
        <g class="ui">
          <rect x="180" y="60" width="580" height="44" fill="${C.beige}"/>
          <circle cx="206" cy="82" r="8" fill="${C.alert}"/><circle cx="230" cy="82" r="8" fill="${C.off}"/><circle cx="254" cy="82" r="8" fill="${C.indigo}"/>
          <circle cx="260" cy="170" r="48" fill="${C.navy}"/>
          <image href="assets/logo/nuv-simbolo-offwhite.png" x="226" y="144" width="68" height="52"/>
          <rect class="tx" x="330" y="140" width="260" height="20" rx="10" fill="${C.navy}"/>
          <rect class="tx" x="330" y="176" width="200" height="14" rx="7" fill="${C.indigo}" opacity=".6"/>
          <rect class="tx" x="330" y="200" width="230" height="14" rx="7" fill="${C.indigo}" opacity=".6"/>
          ${[0, 1, 2, 3, 4, 5].map(j => `<rect class="sq" x="${212 + (j % 3) * 180}" y="${246 + Math.floor(j / 3) * 86}" width="166" height="76" rx="10" fill="${[C.indigo, C.beige, C.navy][j % 3]}"/>`).join('')}
          <rect class="cur" x="592" y="138" width="4" height="26" fill="${C.navy}"/>
        </g>
        <path d="M100 440 H840 L940 520 Q944 540 920 540 H20 Q-4 540 0 520 Z" fill="#b8b1a3"/>
        <path d="M150 452 H790 L850 500 H90 Z" fill="#a39c8e"/>
        ${Array.from({ length: 3 }, (_, rI) => Array.from({ length: 13 }, (_, k) => `<rect x="${130 + rI * 14 + k * 52}" y="${458 + rI * 14}" width="44" height="10" rx="3" fill="#8f887b"/>`).join('')).join('')}
        <rect x="390" y="520" width="160" height="10" rx="5" fill="#8f887b"/>
        ${hand('hl', 330, 560, false)}
        ${hand('hr', 610, 560, true)}
        <g class="mug" transform="translate(860 360)">
          <path class="st" pathLength="1" d="M20 -20 q-14 -24 0 -48 q14 -24 0 -48" fill="none" stroke="${C.off}" stroke-width="7" stroke-linecap="round"/>
          <path class="st" pathLength="1" d="M48 -14 q-14 -24 0 -48 q14 -24 0 -48" fill="none" stroke="${C.off}" stroke-width="7" stroke-linecap="round"/>
          <path class="st" pathLength="1" d="M76 -20 q-14 -24 0 -48 q14 -24 0 -48" fill="none" stroke="${C.off}" stroke-width="7" stroke-linecap="round"/>
          <path d="M96 30 q46 0 46 40 q0 40 -46 40" fill="none" stroke="${C.indigo}" stroke-width="16"/>
          <path d="M0 6 H100 V130 Q100 168 62 168 H38 Q0 168 0 130 Z" fill="${C.indigo}"/>
          <ellipse cx="50" cy="8" rx="50" ry="14" fill="#5a3d2b"/>
          <path d="M0 6 Q50 28 100 6" fill="none" stroke="${C.off}" stroke-width="4" opacity=".5"/>
          <g transform="translate(22 66) scale(.8)" opacity=".9">${ICON.heart().replace('currentColor', C.off)}</g>
          <ellipse cx="50" cy="172" rx="62" ry="10" fill="${C.navy}" opacity=".2"/>
        </g></svg>`);
    const cta = add(`<div class="pill sans shadow" style="background:${C.navy};color:${C.off};font-size:52px;padding:30px 60px;display:flex;align-items:center;gap:22px">${svg('plane', 54, C.beige, 'style="--cut:#0A2540;color:#CBC5B9"')}chama no direct<span class="hh">${svg('heart', 54, '#FFFFFF')}</span></div>`);
    const fh = [0, 1].map(() => add(svg('heart', 56, C.off)));
    return t => {
      const out = ease.inOut(P(t, 7.5, .5)), o = 1 - out;
      const kh = ease.out(P(t, 0, .55));
      put(head, { x: 540, y: 400 - out * 60, o: clamp(kh * 3) * o }); clipX(head, kh);
      animWords(head, t, .3, .06);
      const ks = ease.back(P(t, 1.5, .55));
      put(sub, { x: 540, y: 640 - out * 60, s: ks, o: clamp(ks * 2) * o });
      const kl = ease.out(P(t, .5, .8));
      put(lap, { x: 540, y: 1130 + (1 - kl) * 200 - out * 60, s: .96, o: clamp(kl * 2) * o });
      // mãos digitando
      const typing = t > 1.1;
      lap.querySelectorAll('.hl .fg, .hr .fg').forEach((f, i) => {
        const ph = Math.sin(t * 22 + i * 1.9 + (i > 3 ? 2 : 0));
        f.setAttribute('transform', `translate(0 ${typing ? Math.max(0, ph) * 12 : 0})`);
      });
      lap.querySelector('.hl').setAttribute('transform', `translate(0 ${Math.sin(t * 7) * 4})`);
      lap.querySelector('.hr').setAttribute('transform', `translate(0 ${Math.sin(t * 7 + 2) * 4})`);
      // tela do notebook vai sendo montada
      lap.querySelectorAll('.tx').forEach((r, i) => {
        const k = ease.out(P(t, 1.2 + i * .4, .6));
        r.setAttribute('transform', `scale(${k} 1)`); r.style.transformBox = 'fill-box'; r.style.transformOrigin = '0 50%';
      });
      lap.querySelectorAll('.sq').forEach((r, i) => {
        const k = ease.back(P(t, 2.4 + i * .18, .45));
        r.style.transformBox = 'fill-box'; r.style.transformOrigin = '50% 50%';
        r.setAttribute('transform', `scale(${clamp(k, 0, 1.2)})`);
      });
      const cur = lap.querySelector('.cur');
      const cx = 330 + 260 * ease.out(P(t, 1.2, .6));
      cur.setAttribute('x', cx + 4);
      cur.style.opacity = Math.sin(t * 9) > 0 ? 1 : 0;
      // vapor do café
      lap.querySelectorAll('.st').forEach((s, i) => {
        const ph = (t * .55 + i * .33) % 1;
        s.style.strokeDasharray = '.45 1';
        s.style.strokeDashoffset = -ph * .9 + .45;
        s.style.opacity = .55 * Math.sin(ph * Math.PI);
      });
      const kc = ease.back(P(t, 3.6, .6));
      put(cta, { x: 540, y: 1640 - out * 60, s: kc * (t > 4.4 ? 1 + .03 * Math.sin((t - 4.4) * 6) : 1), o: clamp(kc * 2) * o });
      const hh = cta.querySelector('.hh svg');
      hh.style.transform = `scale(${t > 4.2 ? 1 + .18 * Math.max(0, Math.sin((t - 4.2) * 7)) : 1})`;
      fh.forEach((h, i) => {
        const s = 4.6 + i * .9, lt = t - s, k = clamp(lt / 1.6);
        put(h, { x: 860 + i * 40 + Math.sin(lt * 4 + i) * 16, y: 1580 - k * 260, s: ease.back(P(t, s, .4)) * (.8 + i * .3), o: (lt > 0 ? 1 - ease.in(k) : 0) * o });
      });
    };
  },
};
