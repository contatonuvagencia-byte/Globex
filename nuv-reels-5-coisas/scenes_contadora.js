// Animação "a contadora": o que é óbvio pra você vira conteúdo que salva o seu cliente.
// Linha do feed NUV: Inter Tight Black minúscula + itálico leve, Comfortaa no apoio, cores da marca.

const TT = (size, color, extra = '') => `font-family:'Tight',sans-serif;font-weight:900;text-transform:lowercase;letter-spacing:-.055em;word-spacing:.12em;line-height:.92;font-size:${size}px;color:${color};${extra}`;
const TI = `font-family:'TightI',sans-serif;font-style:italic;font-weight:300;letter-spacing:-.04em`;
SCENES['C1_contadora'] = {
  dur: 19, bg: 'off', build() {
    // fundos que entram de baixo pra cima a cada cena
    const BG = [[0, C.navy], [3.3, C.off], [8.2, C.navy], [10.8, C.off], [14.6, C.indigo]].map(([s, c]) => ({ s, el: add(`<div style="width:1080px;height:1920px;background:${c}"></div>`) }));
    const mini = (txt, c) => add(`<div class="sans" style="font-size:24px;letter-spacing:.2em;text-transform:uppercase;color:${c}">${txt}</div>`);

    // ---- cena 1 · imagina uma contadora
    const t1 = add(`<div style="${TT(150, C.off)};width:940px">imagina uma<br><span style="${TI}">contadora.</span></div>`);
    const ct = img3('1f469-1f3fd-200d-1f4bc', 440);
    const calc = img3('1f9fe', 150);

    // ---- cena 2 · a fala dela
    const bub = add(`<div style="width:900px;background:#fff;border-radius:46px 46px 46px 12px;padding:44px 50px;box-shadow:0 26px 60px rgba(10,37,64,.2)">
      <div class="sans" style="font-size:22px;letter-spacing:.18em;color:${C.indigo};text-transform:uppercase;margin-bottom:14px">a contadora</div>
      <div class="ty" style="display:flex;gap:12px">${[0, 1, 2].map(() => `<i style="display:block;width:20px;height:20px;border-radius:50%;background:${C.indigo}"></i>`).join('')}</div>
      <div class="tx" style="${TT(66, C.navy, 'line-height:1.05;letter-spacing:-.045em')}"></div></div>`);
    const FALA = '“nossa, todo mês alguém me pergunta se pode misturar a conta pessoal com a da empresa.”';
    const months = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'].map(m =>
      add(`<div class="sans" style="font-weight:700;font-size:30px;padding:12px 24px;border-radius:999px;background:${C.navy};color:${C.off}">${m}</div>`));
    const lab2 = mini('todo mês, a mesma dúvida', C.navy);

    // ---- cena 3 · pra ela é bobeira
    const t3 = add(`<div style="${TT(170, C.off)};width:940px">pra ela,<br>é <span style="${TI}">bobeira.</span></div>`);
    const shrug = img3('1f937-200d-2640-fe0f', 300);

    // ---- cena 4 · pro pequeno negócio
    const t4 = add(`<div style="${TT(104, C.navy)};width:940px">mas pra quem tem um <span style="${TI}">negócio pequeno…</span></div>`);
    const card = (lab, bg, fg, emoji) => add(`<div style="width:560px;height:340px;border-radius:34px;background:${bg};color:${fg};padding:38px 42px;position:relative;box-shadow:0 30px 60px rgba(10,37,64,.25)">
      <div style="width:84px;height:62px;border-radius:12px;background:linear-gradient(135deg,#d9c9a3,#b49a63)"></div>
      <div class="sans" style="position:absolute;left:42px;bottom:40px;font-weight:700;font-size:44px;letter-spacing:.06em">${lab}</div>
      <img src="${A3(emoji)}" style="position:absolute;right:30px;top:26px;width:110px"></div>`);
    const cP = card('PESSOAL', C.beige, C.navy, '1f4b3'), cE = card('EMPRESA', C.navy, C.off, '1f9fe');
    const line = add(`<div style="width:8px;height:780px;border-radius:4px;background:${C.indigo}"></div>`);
    const boom = img3('1f92f', 190);
    const lab4 = mini('cada dinheiro no seu lugar', C.navy);

    // ---- cena 5 · vira um vídeo que salva
    const t5 = add(`<div style="${TT(98, C.off)};width:940px">vira um vídeo que <span style="${TI}">salva gente</span> de dor de cabeça.</div>`);
    const ph = iphone(`<div style="position:absolute;inset:0;background:${C.navy}">
        <div style="position:absolute;left:40px;right:110px;top:150px;${TT(50, C.off, 'line-height:1.02')}">pode misturar a conta pessoal com a <span style="${TI}">da empresa?</span></div>
        <img src="${A3('1f469-1f3fd-200d-1f4bc')}" style="position:absolute;left:40px;bottom:120px;width:230px">
        <div style="position:absolute;right:30px;bottom:170px;display:flex;flex-direction:column;align-items:center;gap:30px;color:#fff;font-family:'UI';font-weight:600;font-size:20px">
          ${ui('heart', 44, '#fff', 2)}<span>4.812</span>${ui('comment', 44, '#fff', 2)}<span>317</span>
          <span class="sv" style="display:block">${ui('save', 46, '#fff', 2)}</span><span class="svn">0</span></div></div>`, { w: 470, h: 960, dark: true });
    const bm = img3('1f516', 170);

    return t => {
      BG.forEach(({ s, el }) => { const k = ease.inOut(P(t, s, .55)); put(el, { x: 540, y: 960 + (1 - k) * 1920, o: t >= s ? 1 : 0 }); });
      const vis = (a, b) => (t >= a && t < b ? 1 : 0);
      const out = (b) => 1 - ease.in(P(t, b - .35, .35));

      // cena 1
      const k1 = ease.out(P(t, .2, .7)), o1 = vis(0, 3.4) * out(3.4);
      put(t1, { x: 540, y: 520 + (1 - k1) * 60, o: k1 * o1 });
      const kc = ease.back(P(t, .6, .7));
      put(ct, { x: 540, y: 1180 + Math.sin(t * 2) * 10, s: kc, o: clamp(kc * 2) * o1 });
      const kq = ease.back(P(t, 1.2, .5));
      put(calc, { x: 830, y: 960 + Math.sin(t * 2.6) * 12, s: kq, r: 12, o: clamp(kq * 2) * o1 });

      // cena 2
      const o2 = vis(3.3, 8.4) * out(8.4), kb = ease.back(P(t, 3.7, .55));
      put(bub, { x: 540, y: 820, s: kb, o: clamp(kb * 2) * o2 });
      const typing = t < 4.5;
      bub.querySelector('.ty').style.display = typing ? 'flex' : 'none';
      bub.querySelectorAll('.ty i').forEach((d, j) => { d.style.transform = `translateY(${Math.sin(t * 9 - j) * 6}px)`; });
      const n = Math.round(FALA.length * clamp((t - 4.5) / 2.2));
      bub.querySelector('.tx').textContent = typing ? '' : FALA.slice(0, n);
      months.forEach((m, i) => {
        const k = ease.back(P(t, 5 + i * .16, .4)), a = (i / 12) * Math.PI * 2;
        const x = 540 + Math.cos(a) * 380, y = 1420 + Math.sin(a) * 200;
        put(m, { x, y: y + Math.sin(t * 2 + i) * 6, s: k, r: Math.sin(i) * 8, o: clamp(k * 2) * o2 });
      });
      put(lab2, { x: 540, y: 420, o: ease.out(P(t, 4, .5)) * o2 });

      // cena 3
      const o3 = vis(8.2, 11) * out(11), k3 = ease.out(P(t, 8.5, .6));
      put(t3, { x: 540, y: 760 + (1 - k3) * 60, o: k3 * o3 });
      const ks = ease.back(P(t, 9.0, .6));
      put(shrug, { x: 760, y: 1240 + Math.sin(t * 3) * 8, s: ks, r: Math.sin(t * 2) * 6, o: clamp(ks * 2) * o3 });

      // cena 4
      const o4 = vis(10.8, 14.8) * out(14.8), k4 = ease.out(P(t, 11.1, .6));
      put(t4, { x: 540, y: 470 + (1 - k4) * 50, o: k4 * o4 });
      const kin = ease.back(P(t, 11.5, .6)), sep = ease.inOut(P(t, 12.6, .8));
      const shake = t > 11.9 && t < 12.6 ? Math.sin(t * 40) * 10 : 0;
      put(cP, { x: lerp(540, 300, sep) + shake, y: lerp(1150, 1000, sep), r: lerp(-8, -4, sep), s: kin * lerp(1, .82, sep), o: clamp(kin * 2) * o4 });
      put(cE, { x: lerp(560, 780, sep) - shake, y: lerp(1190, 1340, sep), r: lerp(6, 4, sep), s: kin * lerp(1, .82, sep), o: clamp(kin * 2) * o4 });
      put(line, { x: 540, y: 1170, sy: ease.out(P(t, 12.9, .5)), o: o4 });
      const kbm = ease.back(P(t, 11.9, .4)) * (1 - ease.in(P(t, 12.6, .25)));
      put(boom, { x: 880, y: 820, s: kbm, o: clamp(kbm * 2) * o4 });
      put(lab4, { x: 540, y: 1660, o: ease.out(P(t, 13.2, .5)) * o4 });

      // cena 5
      const o5 = vis(14.6, 19), k5 = ease.out(P(t, 14.9, .6));
      put(t5, { x: 540, y: 420 + (1 - k5) * 50, o: k5 * o5 });
      const kp = ease.out(P(t, 15.2, .8));
      put(ph, { x: 540, y: 1220 + (1 - kp) * 500, o: clamp(kp * 2) * o5 });
      tilt(ph, Math.sin(t * .8) * 4, 4, -2);
      const ksv = clamp((t - 16.3) / 2);
      ph.querySelector('.svn').textContent = (Math.round(ease.out(ksv) * 2300)).toLocaleString('pt-BR');
      const pulse = t > 16.3 ? 1 + .25 * Math.max(0, Math.sin((t - 16.3) * 8)) * Math.exp(-(t - 16.3) * .8) : 1;
      ph.querySelector('.sv').style.transform = `scale(${pulse})`;
      const kbk = ease.back(P(t, 16.4, .5));
      put(bm, { x: 860, y: 1000 + Math.sin(t * 3) * 10, s: kbk, r: 10, o: clamp(kbk * 2) * o5 });
    };
  },
};
