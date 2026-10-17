// Roteiro "primeira impressão" — Telas 4, 5 e 6 (sem fundo), versão editorial com objetos realistas.
// Usa os utilitários de scenes.js (add, put, ease, P, words, animWords...).

const IG = { blue: '#0095F6', link: '#00376B', gray: '#737373', line: '#DBDBDB', soft: '#EFEFEF' };
const A3 = n => `assets/3d/${n}.webp`;
const UI = "font-family:'UI',sans-serif";

// ---------------- componentes ----------------

// Cabeçalho editorial: cartão "papel" com rótulo, régua, símbolo NUV e manchete em serifa com marca-texto
function edHead({ label, parts, sub = '', size = 82, width = 940 }) {
  const html = parts.map(p => (typeof p === 'string' ? words(p)
    : `<span class="word mk" style="font-style:italic;background-image:linear-gradient(${C.beige},${C.beige});background-repeat:no-repeat;background-position:0 86%;background-size:0% 40%;padding:0 8px;margin:0 -2px">${p.mk}</span>`)).join(' ');
  return add(`<div style="background:${C.off};width:${width}px;padding:38px 58px 50px;box-sizing:border-box;border-radius:40px;
      box-shadow:0 34px 80px rgba(7,26,46,.38),0 8px 18px rgba(7,26,46,.2)">
      <div style="display:flex;align-items:center;gap:20px;margin-bottom:24px">
        <span class="lbl sans" style="background:${C.navy};color:${C.off};font-size:23px;letter-spacing:.22em;padding:11px 22px;border-radius:999px;white-space:nowrap">${label}</span>
        <span class="rule" style="flex:1;height:2px;background:${C.navy};opacity:.22;transform-origin:0 50%"></span>
        <img src="assets/logo/nuv-simbolo-navy.png" style="height:36px;opacity:.9"></div>
      <div class="serif" style="color:${C.navy};font-size:${size}px;line-height:1.07;text-wrap:balance">${html}</div>
      ${sub ? `<div class="sub sans" style="color:${C.indigo};font-size:37px;line-height:1.35;margin-top:22px;text-wrap:balance">${sub}</div>` : ''}
    </div>`);
}
function animHead(el, t, Y, out, t0 = 0) {
  const k = ease.out(P(t, t0, .7));
  put(el, { x: 540, y: Y + (1 - k) * 50 - out * 70, o: clamp(k * 2) * (1 - out) });
  el.style.clipPath = `inset(0 0 ${(1 - k) * 100}% 0 round 40px)`;
  el.querySelector('.rule').style.transform = `scaleX(${ease.inOut(P(t, t0 + .3, .8))})`;
  animWords(el, t, t0 + .25, .055, .5, 34);
  el.querySelectorAll('.mk').forEach(m => { m.style.backgroundSize = `${ease.inOut(P(t, t0 + 1.0, .55)) * 100}% 40%`; });
  const sub = el.querySelector('.sub');
  if (sub) { const ks = ease.out(P(t, t0 + .9, .6)); sub.style.opacity = ks; sub.style.transform = `translateY(${(1 - ks) * 18}px)`; }
}

// Ícones de interface (traço, viewBox 24)
const UIICON = {
  heart: 'M16.8 3.6c-2 0-3.7 1.1-4.8 2.7-1.1-1.6-2.8-2.7-4.8-2.7C4.3 3.6 2 6 2 9c0 5.6 8 10.8 9.6 11.8.2.2.6.2.8 0C14 19.8 22 14.6 22 9c0-3-2.3-5.4-5.2-5.4z',
  comment: 'M20.6 16.6A9.4 9.4 0 1 0 17.4 20l4.1 1.4z',
  share: 'M22 3 9.2 10.2M22 3l-7.2 18-3.4-8.3L3 9.6z',
  save: 'M19.5 21 12 14.4 4.5 21V3h15z',
  home: 'M3 10.5 12 3l9 7.5V21h-6v-6.5H9V21H3z',
  search: 'M10.5 18a7.5 7.5 0 1 0 0-15 7.5 7.5 0 0 0 0 15zM16 16l5.5 5.5',
  plus: 'M5 3h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2zM12 7.5v9M7.5 12h9',
  reels: 'M5 3h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2zM3 8.5h18M8.5 3l3 5.5M14 3l3 5.5M10 12v5.5l4.8-2.75z',
  menu: 'M3 5h18M3 12h18M3 19h18',
  link: 'M10 13.5a4.6 4.6 0 0 0 6.9.5l2.8-2.8a4.6 4.6 0 0 0-6.5-6.5l-1.6 1.6M14 10.5a4.6 4.6 0 0 0-6.9-.5l-2.8 2.8a4.6 4.6 0 0 0 6.5 6.5l1.6-1.6',
  x: 'M6 6l12 12M18 6 6 18',
  chev: 'M6 9l6 6 6-6',
  lock: 'M6 11h12v10H6zM8.5 11V8a3.5 3.5 0 0 1 7 0v3',
  grid: 'M3 3h18v18H3zM9 3v18M15 3v18M3 9h18M3 15h18',
  tag: 'M3 3h18v18H3zM12 12.5a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM6.5 21c.5-3.2 2.8-5 5.5-5s5 1.8 5.5 5',
  addp: 'M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM2 21c0-4 3.1-6.5 7-6.5s7 2.5 7 6.5M19 8v6M16 11h6',
};
const ui = (n, s = 30, c = '#000', sw = 1.9, fill = 'none') =>
  `<svg width="${s}" height="${s}" viewBox="0 0 24 24"><path d="${UIICON[n]}" fill="${fill}" stroke="${c}" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round"/></svg>`;

const STATUS = (dark = false) => {
  const c = dark ? '#fff' : '#000';
  return `<div style="position:absolute;left:0;right:0;top:0;height:58px;z-index:20;display:flex;align-items:center;justify-content:space-between;padding:6px 44px 0 52px;box-sizing:border-box;${UI};font-weight:600;font-size:21px;color:${c}">
    <span>9:41</span>
    <span style="display:flex;gap:8px;align-items:center">
      <svg width="26" height="16" viewBox="0 0 26 16">${[0, 1, 2, 3].map(i => `<rect x="${i * 7}" y="${12 - i * 4}" width="5" height="${4 + i * 4}" rx="1.3" fill="${c}"/>`).join('')}</svg>
      <svg width="24" height="17" viewBox="0 0 24 17"><path d="M12 15.5l3-3.2a4.3 4.3 0 0 0-6 0zM5.2 8.8l2 2.1a6.9 6.9 0 0 1 9.6 0l2-2.1a9.8 9.8 0 0 0-13.6 0zM1.6 5.1l2 2.1a12 12 0 0 1 16.8 0l2-2.1a14.9 14.9 0 0 0-20.8 0z" fill="${c}"/></svg>
      <svg width="38" height="18" viewBox="0 0 38 18"><rect x="1" y="1" width="31" height="16" rx="5" fill="none" stroke="${c}" stroke-opacity=".45" stroke-width="1.6"/><rect x="3.5" y="3.5" width="24" height="11" rx="3" fill="${c}"/><rect x="34" y="6" width="2.6" height="6" rx="1.3" fill="${c}" fill-opacity=".5"/></svg>
    </span></div>`;
};

// iPhone com moldura de titânio, botões laterais, ilha dinâmica e reflexo de vidro
function iphone(inner, { w = 500, h = 1030, dark = false } = {}) {
  const btn = (side, top, hh) => `<div style="position:absolute;${side}:-5px;top:${top}px;width:8px;height:${hh}px;border-radius:4px;background:linear-gradient(90deg,#5d6067,#c9ccd1,#6a6d74)"></div>`;
  return add(`<div style="perspective:2400px"><div class="tilt" style="position:relative;width:${w}px;height:${h}px">
      ${btn('left', 200, 44)}${btn('left', 278, 86)}${btn('left', 382, 86)}${btn('right', 300, 132)}
      <div style="position:absolute;inset:0;border-radius:86px;background:linear-gradient(140deg,#43464d 0%,#c5c8cd 16%,#70737a 34%,#e2e4e7 55%,#5b5e65 78%,#a3a6ac 100%);
        box-shadow:0 80px 130px rgba(7,26,46,.5),0 26px 44px rgba(7,26,46,.35),inset 0 0 0 1px rgba(255,255,255,.25)"></div>
      <div style="position:absolute;inset:6px;border-radius:80px;background:#08090b"></div>
      <div class="scr" style="position:absolute;inset:19px;border-radius:66px;overflow:hidden;background:${dark ? '#000' : '#fff'};isolation:isolate">
        ${inner}
        ${STATUS(dark)}
        <div style="position:absolute;left:50%;top:14px;width:128px;height:38px;margin-left:-64px;border-radius:20px;background:#000;z-index:30"></div>
        <div class="homebar" style="position:absolute;left:50%;bottom:10px;width:170px;height:7px;margin-left:-85px;border-radius:4px;background:#111;z-index:30"></div>
        <div style="position:absolute;inset:0;z-index:40;pointer-events:none;background:linear-gradient(118deg,rgba(255,255,255,.22) 0%,rgba(255,255,255,.06) 26%,rgba(255,255,255,0) 40%)"></div>
      </div></div></div>`);
}
const tilt = (ph, ry, rx, rz = 0) => { ph.querySelector('.tilt').style.transform = `rotateY(${ry}deg) rotateX(${rx}deg) rotateZ(${rz}deg)`; };

// mão 3D: posiciona pela ponta do dedo
const HAND_TIP = [-0.11, -0.42];
function hand3d(size = 300) {
  return add(`<img src="${A3('1f446-1f3fc')}" style="width:${size}px;display:block;filter:drop-shadow(0 30px 28px rgba(7,26,46,.45)) drop-shadow(0 6px 8px rgba(7,26,46,.25))">`);
}
function putTip(el, size, px, py, { s = 1, r = 0, o = 1 } = {}) {
  put(el, { x: px - HAND_TIP[0] * size * s, y: py - HAND_TIP[1] * size * s, s, r, o });
}
const ring = () => add(`<div style="width:110px;height:110px;border-radius:50%;border:5px solid rgba(255,255,255,.95);box-shadow:0 0 24px rgba(0,149,246,.6)"></div>`);
const img3 = (n, s, extra = '') => add(`<img src="${A3(n)}" style="width:${s}px;display:block;filter:drop-shadow(0 22px 24px rgba(7,26,46,.4));${extra}">`);
const sticker = html => add(`<div style="background:${C.beige};color:${C.navy};padding:22px 40px;border-radius:999px;white-space:nowrap;box-shadow:0 20px 40px rgba(7,26,46,.35)" class="serif"><span style="font-size:54px;font-style:italic">${html}</span></div>`);

// avatar com anel de stories
const avatar = (s, ring = true) => `<div style="width:${s}px;height:${s}px;border-radius:50%;padding:${ring ? 3 : 0}px;box-sizing:border-box;background:${ring ? 'conic-gradient(from 200deg,#feda75,#fa7e1e,#d62976,#962fbf,#4f5bd5,#feda75)' : 'none'};flex:none">
  <div style="width:100%;height:100%;border-radius:50%;border:${ring ? 3 : 0}px solid #fff;box-sizing:border-box;background:${C.navy};display:flex;align-items:center;justify-content:center;overflow:hidden">
  <img src="assets/logo/nuv-simbolo-offwhite.png" style="width:72%"></div></div>`;

// thumb de post com aparência de foto/arte
const POSTS = [
  [`linear-gradient(160deg,#3c4a78,${C.navy})`, `<img src="${A3('1f6cd-fe0f')}" style="width:62%">`],
  [`linear-gradient(160deg,#efe7dc,${C.beige})`, `<span class="serif" style="font-size:24px;color:${C.navy}">Novidades</span>`],
  [`linear-gradient(160deg,#d9cbb6,#b9a891)`, `<img src="${A3('1fab4')}" style="width:58%">`],
  [`linear-gradient(160deg,${C.navy},#1a3a5e)`, `<span class="serif" style="font-size:24px;color:${C.off};font-style:italic">Bastidores</span>`],
  [`linear-gradient(160deg,#f3eee8,#e3dbd0)`, `<img src="${A3('2615')}" style="width:56%">`],
  [`linear-gradient(160deg,#4a5687,${C.indigo})`, `<img src="${A3('1f48c')}" style="width:58%">`],
  [`linear-gradient(160deg,#cbbfae,#a99a86)`, `<span class="serif" style="font-size:21px;color:${C.navy}">Antes/depois</span>`],
  [`linear-gradient(160deg,#243b63,${C.navy})`, `<img src="${A3('2728')}" style="width:52%">`],
  [`linear-gradient(160deg,#efe9e1,#d8cfc3)`, `<img src="${A3('1f4c5')}" style="width:54%">`],
];
const postTile = (i, extra = '') => `<div style="aspect-ratio:1;background:${POSTS[i % 9][0]};display:flex;align-items:center;justify-content:center;overflow:hidden;${extra}">${POSTS[i % 9][1]}</div>`;

// =====================================================================
// Tela 4 · "Não vou ler esse textão não"
// =====================================================================
const TEXTAO = `Gente, preciso contar uma coisa que aconteceu essa semana e que mudou completamente a forma como eu enxergo o meu negócio. Tudo começou numa segunda-feira, quando eu acordei mais cedo do que o normal e resolvi rever todas as minhas metas do ano.

Antes de tudo, quero agradecer a cada cliente que confiou no nosso trabalho até aqui. Foram muitos aprendizados, algumas noites sem dormir e muitas planilhas abertas ao mesmo tempo. Quem empreende sabe exatamente do que eu estou falando.

Então, voltando: naquela segunda eu percebi que estava fazendo tudo sozinha, desde o atendimento até a entrega, passando pelo financeiro, pelo estoque, pelas fotos dos produtos e pela criação dos conteúdos. E aí veio a reflexão que eu quero dividir com vocês hoje, mas antes eu preciso explicar o contexto completo, porque sem ele nada vai fazer sentido.

Lá em 2019, quando tudo começou, a gente tinha apenas uma mesa, um computador emprestado e muita vontade. Eu lembro de cada detalhe daquela época, das primeiras vendas, dos primeiros elogios e também das primeiras críticas, que doeram mas me ensinaram demais.

E foi justamente aí que eu entendi uma coisa muito importante sobre o tempo, sobre prioridades e sobre como a gente se cobra para dar conta de absolutamente tudo, todos os dias, sem pausa, sem ajuda e sem planejamento.

Depois disso eu comecei a anotar tudo num caderno: cada tarefa, cada horário, cada pedido, cada mensagem respondida. Foram três semanas assim, e o resultado me assustou bastante, porque eu descobri que passava horas em coisas que não traziam resultado nenhum.

Continua no próximo parágrafo, que é ainda maior que esse...`;

SCENES['T4_textao'] = {
  dur: 6.6, bg: 'none', build() {
    const head = edHead({ label: 'Nº 03', parts: ['“Não vou ler esse', { mk: 'textão' }, 'não”'] });
    const hdr = `<div style="display:flex;align-items:center;gap:14px;height:76px;padding:0 20px">${avatar(50)}
        <div style="${UI};font-weight:600;font-size:21px">suamarca <span style="font-weight:400;color:${IG.gray}">· 2 h</span></div>
        <div style="margin-left:auto;font-size:26px;letter-spacing:2px">•••</div></div>`;
    const actions = `<div style="display:flex;gap:20px;align-items:center;padding:16px 20px 6px">${ui('heart')}${ui('comment')}${ui('share')}<span style="margin-left:auto">${ui('save')}</span></div>`;
    const p1 = `${hdr}
      <div style="height:462px;background:linear-gradient(165deg,#25365c,${C.navy});position:relative;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:18px">
        <span class="sans" style="color:${C.beige};font-size:20px;letter-spacing:.3em">RELATO</span>
        <span class="serif" style="color:${C.off};font-size:62px;text-align:center;line-height:1.05">Leia até<br><i>o final</i></span>
        <span style="position:absolute;bottom:18px;display:flex;gap:7px">${[1, 0, 0, 0, 0].map(a => `<i style="display:block;width:8px;height:8px;border-radius:50%;background:${a ? '#fff' : 'rgba(255,255,255,.4)'}"></i>`).join('')}</span></div>
      ${actions}
      <div style="${UI};font-weight:600;font-size:20px;padding:4px 20px">1.284 curtidas</div>
      <div class="cap" style="${UI};font-size:19.5px;line-height:1.48;padding:4px 20px 0;color:#111;white-space:pre-line"><b style="font-weight:600">suamarca</b> ${TEXTAO}</div>`;
    const p2 = `${hdr}
      <div style="height:462px;background:linear-gradient(160deg,#f2ece4,${C.beige});display:flex;flex-direction:column;align-items:center;justify-content:center;gap:14px">
        <img src="${A3('2728')}" style="width:110px"><span class="serif" style="color:${C.navy};font-size:64px">Direto ao ponto.</span></div>
      ${actions}
      <div style="${UI};font-weight:600;font-size:20px;padding:4px 20px">3.902 curtidas</div>
      <div style="${UI};font-size:19.5px;line-height:1.48;padding:4px 20px;color:#111"><b style="font-weight:600">suamarca</b> 3 dicas rápidas pra hoje. Salva!</div>`;
    const tabbar = `<div style="position:absolute;left:0;right:0;bottom:0;height:92px;background:#fff;border-top:1px solid ${IG.line};display:flex;justify-content:space-around;align-items:flex-start;padding-top:16px;z-index:10">
        ${ui('home', 32, '#000', 2.1, '#000')}${ui('search', 32)}${ui('plus', 32)}${ui('reels', 32)}<div style="width:32px;height:32px;border-radius:50%;background:${C.navy};border:2px solid #000;box-sizing:border-box"></div></div>`;
    const ph = iphone(`
      <svg width="0" height="0" style="position:absolute"><filter id="vblurT4" x="-5%" y="-20%" width="110%" height="140%"><feGaussianBlur class="vb" stdDeviation="0 0"/></filter></svg>
      <div style="position:absolute;left:0;right:0;top:58px;bottom:92px;overflow:hidden">
        <div class="p1" style="position:absolute;left:0;right:0;top:0;filter:url(#vblurT4)">${p1}</div>
        <div class="p2" style="position:absolute;left:0;right:0;top:0;background:#fff">${p2}</div></div>
      ${tabbar}`);
    const HS = 290;
    const hand = hand3d(HS);
    const yawn = img3('1f971', 230);
    const bubble = add(`<div class="sans" style="background:#fff;color:${C.navy};font-size:38px;padding:20px 32px;border-radius:34px 34px 34px 8px;box-shadow:0 18px 40px rgba(7,26,46,.3);white-space:nowrap">zzz… cadê o fim?</div>`);
    const stk = sticker('e foi pro próximo post.');
    const PX = 560, PY = 1205;
    // rolagem acumulada (puramente função do tempo)
    const swipes = [1.15, 1.6, 1.98, 2.3, 2.58];
    const scrollAt = tt => swipes.reduce((acc, s, i) => acc + ease.out(P(tt, s, .32)) * (190 + i * 60), 0);
    return t => {
      const out = ease.inOut(P(t, 6.1, .5)), o = 1 - out;
      animHead(head, t, 330, out);
      const kp = ease.out(P(t, .25, .9));
      put(ph, { x: PX, y: PY + (1 - kp) * 320 - out * 70, o: clamp(kp * 2) * o });
      tilt(ph, lerp(-22, -9, ease.inOut(P(t, .25, 2.2))) + Math.sin(t * .9) * 1.5, lerp(10, 5, kp), lerp(-3, -1.5, kp));
      // feed
      const sc = scrollAt(t), v = Math.abs(sc - scrollAt(t - 1 / 30));
      const skip = ease.inOut(P(t, 3.05, .45));
      const p1 = ph.querySelector('.p1'), p2 = ph.querySelector('.p2');
      p1.style.transform = `translateY(${-sc - skip * 1300}px)`;
      p2.style.transform = `translateY(${(1 - skip) * 1300}px)`;
      p2.style.visibility = skip > 0 ? 'visible' : 'hidden';
      ph.querySelector('.vb').setAttribute('stdDeviation', `0 ${Math.min(9, v * .09 + (skip > 0 && skip < 1 ? 8 : 0))}`);
      // mão: arrasta para cima em cada swipe
      let ty = PY + 330, tx = PX + 110, r = 8, hs = 1;
      let ho = ease.out(P(t, .85, .3)) * (1 - ease.in(P(t, 3.55, .35)));
      swipes.forEach((s, i) => {
        if (t >= s - .12 && t < s + .38) {
          const k = P(t, s, .32);
          ty = lerp(PY + 330, PY - 60, ease.inOut(k)); tx = PX + 110 + Math.sin(k * Math.PI) * 18; r = lerp(8, -4, k);
          if (t < s) { const kk = P(t, s - .12, .12); ty = lerp(PY - 60, PY + 330, ease.inOut(kk)); hs = lerp(.94, 1, kk); if (i === 0) ty = PY + 330; }
        }
      });
      if (t >= 2.9 && t < 3.6) { const k = ease.inOut(P(t, 2.95, .4)); ty = lerp(PY + 380, PY - 260, k); r = lerp(10, -10, k); }
      if (t < 1.15) { ty = PY + 330 + (1 - ease.out(P(t, .85, .3))) * 200; }
      putTip(hand, HS, tx, ty, { s: hs, r, o: ho * o });
      // reação: bocejo + balão
      const ky = ease.back(P(t, 2.15, .5)) * (1 - ease.in(P(t, 3.0, .25)));
      put(yawn, { x: 205, y: 870 + Math.sin(t * 3) * 6, s: ky, r: -8 + Math.sin(t * 2.2) * 4, o: clamp(ky * 2) * o });
      const kb = ease.back(P(t, 2.35, .45)) * (1 - ease.in(P(t, 3.0, .25)));
      put(bubble, { x: 330, y: 700, s: kb, r: -3, o: clamp(kb * 2) * o });
      const ks = ease.back(P(t, 3.55, .6));
      put(stk, { x: 690, y: 1700 - out * 70, s: ks, r: lerp(-10, -3, clamp(ks)), o: clamp(ks * 2) * o });
    };
  },
};

// =====================================================================
// Tela 5 · Link da bio dá erro → fecha o app
// =====================================================================
SCENES['T5_link_bio_erro'] = {
  dur: 7.4, bg: 'none', build() {
    const head = edHead({ label: 'Nº 04', parts: ['Link da bio dá', { mk: 'erro.' }], sub: 'Se o link não funciona, imagina o resto.' });
    const hl = [['2728', 'Novidades'], ['1f6cd-fe0f', 'Loja'], ['1f4ac', 'Dúvidas'], ['1f48c', 'Clientes'], ['1f4c5', 'Entrega']];
    const profile = `
      <div style="position:absolute;left:0;right:0;top:58px;bottom:0;background:#fff;${UI};color:#000">
        <div style="display:flex;align-items:center;gap:8px;height:64px;padding:0 22px">${ui('lock', 20, '#000', 2.2)}<b style="font-weight:700;font-size:26px">suamarca</b>${ui('chev', 22, '#000', 2.4)}
          <span style="margin-left:auto;display:flex;gap:22px">${ui('plus', 30)}${ui('menu', 30, '#000', 2.2)}</span></div>
        <div style="display:flex;align-items:center;padding:6px 22px 0;gap:26px">${avatar(130)}
          <div style="flex:1;display:flex;justify-content:space-around;text-align:center">
            ${[['38', 'publicações'], ['2.418', 'seguidores'], ['312', 'seguindo']].map(([a, b]) => `<div><div style="font-weight:700;font-size:23px">${a}</div><div style="font-size:17px">${b}</div></div>`).join('')}</div></div>
        <div style="padding:12px 22px 0;font-size:19px;line-height:1.38">
          <div style="font-weight:600">Sua Marca</div>
          <div style="color:${IG.gray}">Loja de roupas</div>
          <div>Moda feminina com propósito<br>Enviamos para todo o Brasil</div>
          <div class="lnk" style="display:inline-flex;align-items:center;gap:6px;color:${IG.link};font-weight:600;border-radius:8px;padding:2px 4px;margin-left:-4px">${ui('link', 20, IG.link, 2.2)}suamarca.com/links</div></div>
        <div style="display:flex;gap:8px;padding:14px 22px 0">
          <div style="flex:1;height:46px;border-radius:10px;background:${IG.blue};color:#fff;font-weight:600;font-size:19px;display:flex;align-items:center;justify-content:center">Seguir</div>
          <div style="flex:1;height:46px;border-radius:10px;background:${IG.soft};font-weight:600;font-size:19px;display:flex;align-items:center;justify-content:center">Mensagem</div>
          <div style="width:46px;height:46px;border-radius:10px;background:${IG.soft};display:flex;align-items:center;justify-content:center">${ui('addp', 22, '#000', 2)}</div></div>
        <div style="display:flex;gap:18px;padding:18px 22px 0">${hl.map(([e, l]) => `<div style="text-align:center;font-size:15px"><div style="width:74px;height:74px;border-radius:50%;border:2px solid ${IG.line};padding:4px;box-sizing:border-box"><div style="width:100%;height:100%;border-radius:50%;background:${C.off};display:flex;align-items:center;justify-content:center"><img src="${A3(e)}" style="width:42px"></div></div><div style="margin-top:6px">${l}</div></div>`).join('')}</div>
        <div style="display:flex;justify-content:space-around;margin-top:16px;border-top:1px solid ${IG.line};height:54px;align-items:center">${ui('grid', 28, '#000', 1.8)}${ui('reels', 28, IG.gray, 1.8)}${ui('tag', 28, IG.gray, 1.8)}</div>
        <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:3px">${Array.from({ length: 9 }, (_, j) => postTile(j)).join('')}</div>
      </div>`;
    const browser = `
      <div class="sheet" style="position:absolute;left:0;right:0;top:70px;bottom:0;background:#fff;border-radius:26px 26px 0 0;box-shadow:0 -14px 40px rgba(0,0,0,.25);${UI};z-index:15">
        <div style="display:flex;align-items:center;height:76px;padding:0 22px;border-bottom:1px solid ${IG.line}">${ui('x', 28, '#000', 2.2)}
          <div style="flex:1;text-align:center;line-height:1.2"><div style="font-weight:600;font-size:19px">suamarca.com</div><div style="font-size:15px;color:${IG.gray}">suamarca.com/links</div></div>
          <span style="font-size:24px;letter-spacing:2px">•••</span></div>
        <div style="height:4px;background:${IG.soft}"><div class="bar" style="height:100%;width:0;background:${IG.blue}"></div></div>
        <div class="spinwrap" style="position:absolute;left:0;right:0;top:300px;display:flex;justify-content:center"><div class="spin" style="width:70px;height:70px;border-radius:50%;border:7px solid ${IG.soft};border-top-color:${IG.gray}"></div></div>
        <div class="err" style="position:absolute;left:0;right:0;top:120px;display:flex;flex-direction:column;align-items:center;text-align:center;padding:0 40px">
          <div class="brk" style="position:relative;width:220px;height:220px">
            <img class="la" src="${A3('1f517')}" style="position:absolute;inset:0;width:220px;clip-path:polygon(0 0,58% 0,42% 100%,0 100%)">
            <img class="lb" src="${A3('1f517')}" style="position:absolute;inset:0;width:220px;clip-path:polygon(58% 0,100% 0,100% 100%,42% 100%)"></div>
          <div class="serif" style="font-size:110px;color:${C.navy};line-height:1;margin-top:18px">404</div>
          <div style="font-weight:600;font-size:25px;margin-top:14px">Não foi possível abrir esta página</div>
          <div style="font-size:19px;color:${IG.gray};margin-top:10px;line-height:1.4">O link pode estar quebrado ou a página foi removida.</div>
          <div style="margin-top:28px;border:1.5px solid ${IG.line};border-radius:12px;padding:14px 30px;font-weight:600;font-size:19px">Tentar novamente</div></div>
      </div>`;
    const apps = [['1f4f7', 'Câmera'], ['1f4ac', 'Mensagens'], ['1f4c5', 'Agenda'], ['1f3a7', 'Música'], ['1f6cd-fe0f', 'Loja'], ['1f48c', 'Mail'], ['ig', 'Instagram'], ['1f4da', 'Livros'], ['2601-fe0f', 'Tempo'], ['1fab4', 'Casa'], ['1f525', 'Treino'], ['2615', 'Café']];
    const home = `
      <div class="home" style="position:absolute;inset:0;background:radial-gradient(120% 80% at 30% 10%,#3f4c80 0%,${C.indigo} 35%,${C.navy} 75%,#06182b 100%);${UI}">
        <div style="position:absolute;left:0;right:0;top:96px;display:grid;grid-template-columns:repeat(4,88px);gap:30px 22px;justify-content:center">
          ${apps.map(([e, l]) => `<div class="app-ic${e === 'ig' ? ' target' : ''}" style="text-align:center;color:#fff;font-size:14px">
            <div style="width:88px;height:88px;border-radius:22px;${e === 'ig' ? 'background:radial-gradient(circle at 30% 107%,#fdf497 0%,#fd5949 45%,#d6249f 60%,#285AEB 90%)' : 'background:linear-gradient(160deg,#fbf8f4,#e6dfd5)'};display:flex;align-items:center;justify-content:center;box-shadow:0 6px 14px rgba(0,0,0,.25)">
              ${e === 'ig' ? `<svg width="54" height="54" viewBox="0 0 24 24"><rect x="3" y="3" width="18" height="18" rx="5.5" fill="none" stroke="#fff" stroke-width="2"/><circle cx="12" cy="12" r="4.2" fill="none" stroke="#fff" stroke-width="2"/><circle cx="17.3" cy="6.7" r="1.2" fill="#fff"/></svg>` : `<img src="${A3(e)}" style="width:62px">`}</div>
            <div style="margin-top:7px">${l}</div></div>`).join('')}</div>
        <div style="position:absolute;left:22px;right:22px;bottom:26px;height:118px;border-radius:38px;background:rgba(255,255,255,.18);display:flex;justify-content:space-around;align-items:center">
          ${['1f4ac', '1f4f7', '1f3a7', '1f48c'].map(e => `<div style="width:84px;height:84px;border-radius:21px;background:linear-gradient(160deg,#fbf8f4,#e6dfd5);display:flex;align-items:center;justify-content:center"><img src="${A3(e)}" style="width:58px"></div>`).join('')}</div>
      </div>`;
    const ph = iphone(`${home}<div class="app" style="position:absolute;inset:0;background:#fff;overflow:hidden;transform-origin:50% 50%;z-index:5">${profile}${browser}</div>`);
    const HS = 290, hand = hand3d(HS), rip = ring();
    const meh = img3('1f612', 220);
    const warn = img3('26a0-fe0f', 120);
    const stk = sticker('…e fechou o app.');
    const PX = 540, PY = 1190;
    return t => {
      const out = ease.inOut(P(t, 6.9, .5)), o = 1 - out;
      animHead(head, t, 350, out);
      const kp = ease.out(P(t, .25, .9));
      const shake = t > 2.65 && t < 3.15 ? Math.sin(t * 64) * 10 * (1 - P(t, 2.65, .5)) : 0;
      put(ph, { x: PX + shake, y: PY + (1 - kp) * 320 - out * 70, o: clamp(kp * 2) * o });
      tilt(ph, lerp(18, 8, ease.inOut(P(t, .25, 2.4))) + Math.sin(t * .8) * 1.4, lerp(10, 5, kp), lerp(3, 1.5, kp));
      const app = ph.querySelector('.app'), sheet = ph.querySelector('.sheet');
      // posição do link na tela (coordenadas do palco, medida no próprio layout)
      const lnk = app.querySelector('.lnk');
      const lr = lnk.getBoundingClientRect();
      const lx = lr.left + lr.width * .45, ly = lr.top + lr.height / 2;
      // mão: entra, toca no link
      let tx, ty, hs = 1, r;
      const ka = ease.inOut(P(t, .95, .6));
      tx = lerp(PX + 260, lx, ka); ty = lerp(PY + 420, ly, ka); r = lerp(14, 4, ka);
      if (t > 1.55 && t < 1.75) hs = .93;
      let ho = ease.out(P(t, .9, .3)) * (1 - ease.in(P(t, 1.95, .3)));
      // segundo gesto: deslizar a partir da barra inferior
      if (t > 3.35) {
        const kb = ease.inOut(P(t, 3.6, .55));
        tx = PX + 8; ty = lerp(PY + 505, PY + 120, kb); r = lerp(4, -4, kb);
        ho = ease.out(P(t, 3.35, .25)) * (1 - ease.in(P(t, 4.15, .3)));
        if (t < 3.6) ty = PY + 505 + (1 - ease.out(P(t, 3.35, .25))) * 200;
      }
      putTip(hand, HS, tx, ty, { s: hs, r, o: ho * o });
      const kr = P(t, 1.62, .5);
      put(rip, { x: lx, y: ly, s: lerp(.3, 1.7, ease.out(kr)), o: (kr > 0 && kr < 1 ? 1 - kr : 0) * o });
      lnk.style.background = t > 1.6 && t < 1.9 ? 'rgba(0,55,107,.12)' : 'transparent';
      // navegador interno
      const ks = ease.out(P(t, 1.8, .45));
      sheet.style.transform = `translateY(${(1 - ks) * 1000}px)`;
      sheet.querySelector('.bar').style.width = `${ease.out(P(t, 1.95, 1.2)) * 72}%`;
      sheet.querySelector('.spinwrap').style.opacity = t < 2.6 ? 1 : 0;
      sheet.querySelector('.spin').style.transform = `rotate(${t * 480}deg)`;
      const ke = ease.out(P(t, 2.6, .4));
      const err = sheet.querySelector('.err');
      err.style.opacity = ke; err.style.transform = `translateY(${(1 - ke) * 30}px)`;
      const gap = ke * 22 + (t > 2.7 ? Math.sin(t * 9) * 4 : 0);
      sheet.querySelector('.la').style.transform = `translate(${-gap}px,${gap * .4}px) rotate(${-ke * 8}deg)`;
      sheet.querySelector('.lb').style.transform = `translate(${gap}px,${-gap * .4}px) rotate(${ke * 8}deg)`;
      // app encolhe até o ícone
      const scr = ph.querySelector('.scr'), tg = ph.querySelector('.target');
      const W0 = scr.offsetWidth, H0 = scr.offsetHeight;
      const icx = tg.offsetLeft + tg.parentElement.offsetLeft + 44, icy = tg.offsetTop + tg.parentElement.offsetTop + 44;
      const kc = ease.inOut(P(t, 3.75, .7));
      app.style.transform = `translate(${(icx - W0 / 2) * kc}px,${(icy - H0 / 2) * kc}px) scale(${lerp(1, 88 / W0, kc)},${lerp(1, 88 / H0, kc)})`;
      app.style.borderRadius = `${lerp(60, 90, kc)}px`;
      app.style.opacity = 1 - ease.in(P(t, 4.25, .25));
      ph.querySelectorAll('.app-ic').forEach((ic, j) => {
        const k = ease.back(P(t, 3.9 + (j % 4) * .04 + Math.floor(j / 4) * .05, .5));
        ic.style.transform = `scale(${lerp(.75, 1, clamp(k))})`;
        ic.style.opacity = clamp(.3 + k);
      });
      // reações
      const kw = ease.back(P(t, 2.75, .45)) * (1 - ease.in(P(t, 3.5, .25)));
      put(warn, { x: 860, y: 820, s: kw, r: 10 + Math.sin(t * 6) * 6, o: clamp(kw * 2) * o });
      const km = ease.back(P(t, 3.1, .5)) * (1 - ease.in(P(t, 4.7, .3)));
      put(meh, { x: 190, y: 900 + Math.sin(t * 2.4) * 6, s: km, r: -8, o: clamp(km * 2) * o });
      const kst = ease.back(P(t, 4.55, .6));
      put(stk, { x: 650, y: 1700 - out * 70, s: kst, r: lerp(-10, -3, clamp(kst)), o: clamp(kst * 2) * o });
    };
  },
};

// =====================================================================
// Tela 6 · Fechamento — notebook, café e mãos digitando
// =====================================================================
SCENES['T6_fechamento'] = {
  dur: 8.4, bg: 'none', build() {
    const head = edHead({ label: 'NUV AGÊNCIA', parts: ['Seu cliente decide em', { mk: 'segundos' }, 'se confia em você.'], sub: 'Deixa a NUV cuidar dessa primeira impressão.', size: 78 });
    // teclado em perspectiva
    let keys = '';
    const L = yy => lerp(178, 112, (yy - 466) / 80), R = yy => lerp(722, 788, (yy - 466) / 80);
    const key = (y, yb, a, b) => {
      const x1 = lerp(L(y), R(y), a), x2 = lerp(L(y), R(y), b), x3 = lerp(L(yb), R(yb), b), x4 = lerp(L(yb), R(yb), a);
      return `<path d="M${x1} ${y}L${x2} ${y}L${x3} ${yb}L${x4} ${yb}Z" fill="url(#key)"/>`;
    };
    for (let r = 0; r < 5; r++) {
      const y = 474 + r * 15, yb = y + 11;
      if (r < 4) for (let k = 0; k < 13; k++) keys += key(y, yb, k / 13, (k + 1) / 13 - .012);
      else [[0, .1], [.105, .2], [.205, .3], [.305, .69], [.695, .79], [.795, .89], [.895, 1]].forEach(([a, b]) => { keys += key(y, yb, a, b - .006); });
    }
    const screen = `
      <div class="lscr" style="position:absolute;left:164px;top:52px;width:572px;height:356px;border-radius:6px;overflow:hidden;background:#f7f5f2;${UI}">
        <div style="height:30px;background:#e9e5df;display:flex;align-items:center;gap:7px;padding:0 12px">${['#ff5f57', '#febc2e', '#28c840'].map(c => `<i style="display:block;width:11px;height:11px;border-radius:50%;background:${c}"></i>`).join('')}
          <div style="margin:0 auto;background:#fff;border-radius:6px;width:240px;height:18px;font-size:11px;color:${IG.gray};display:flex;align-items:center;justify-content:center">instagram.com/suamarca</div></div>
        <div style="display:flex;gap:22px;padding:18px 34px 10px;align-items:center">${avatar(86)}
          <div><div style="font-weight:700;font-size:19px">suamarca <span style="display:inline-block;width:16px;height:16px;border-radius:50%;background:${IG.blue};vertical-align:-2px"></span></div>
            <div style="font-size:12px;margin-top:6px;display:flex;gap:14px"><span><b>38</b> posts</span><span><b>2.418</b> seguidores</span></div>
            <div style="font-size:12px;margin-top:6px;color:#333">Moda feminina com propósito · <span style="color:${IG.link};font-weight:600">suamarca.com/links</span></div></div></div>
        <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:4px;padding:6px 34px">${Array.from({ length: 6 }, (_, j) => `<div class="tile" style="transform-origin:50% 50%">${postTile([1, 0, 3, 2, 7, 4][j], 'border-radius:4px')}</div>`).join('')}</div>
        <div class="toast" style="position:absolute;right:14px;top:40px;width:250px;background:rgba(255,255,255,.96);border-radius:14px;box-shadow:0 10px 30px rgba(0,0,0,.2);display:flex;gap:10px;align-items:center;padding:10px 12px">
          <img src="${A3('1f4ac')}" style="width:38px"><div style="font-size:11.5px;line-height:1.3"><b>Nova mensagem</b><br>“Oi! Quero comprar, como faço?”</div></div>
        <svg class="cursor" width="22" height="30" viewBox="0 0 22 30" style="position:absolute;left:0;top:0"><path d="M2 2v22l6-5.5 4 9 4-1.8-4-8.8h8z" fill="#111" stroke="#fff" stroke-width="1.6" stroke-linejoin="round"/></svg>
      </div>`;
    const lap = add(`<div style="position:relative;width:900px;height:640px">
      <img class="plant" src="${A3('1fab4')}" style="position:absolute;left:-30px;top:150px;width:260px;transform-origin:50% 100%;filter:drop-shadow(0 24px 24px rgba(7,26,46,.35))">
      <svg width="900" height="640" viewBox="0 0 900 640" style="position:absolute;left:0;top:0">
        <defs>
          <linearGradient id="lid" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#d9dce0"/><stop offset=".5" stop-color="#b7bbc1"/><stop offset="1" stop-color="#9da1a8"/></linearGradient>
          <linearGradient id="deck" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#e4e6e9"/><stop offset="1" stop-color="#c3c7cc"/></linearGradient>
          <linearGradient id="edge" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#8e9298"/><stop offset=".5" stop-color="#c9ccd1"/><stop offset="1" stop-color="#8e9298"/></linearGradient>
          <linearGradient id="key" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#3a3d44"/><stop offset="1" stop-color="#1f2126"/></linearGradient>
          <radialGradient id="shadow"><stop offset="0" stop-color="#071a2e" stop-opacity=".45"/><stop offset="1" stop-color="#071a2e" stop-opacity="0"/></radialGradient>
        </defs>
        <ellipse cx="450" cy="580" rx="470" ry="48" fill="url(#shadow)"/>
        <rect x="146" y="30" width="608" height="396" rx="22" fill="url(#lid)"/>
        <rect x="152" y="36" width="596" height="384" rx="17" fill="#0d0e11"/>
        <rect x="420" y="36" width="60" height="12" rx="6" fill="#0d0e11"/>
        <rect x="140" y="424" width="620" height="10" rx="3" fill="#6d7178"/>
        <path d="M140 432H760L860 548Q862 556 852 556H48Q38 556 40 548Z" fill="url(#deck)"/>
        <path d="M40 548Q38 556 48 556H852Q862 556 860 548L866 560Q868 572 852 572H48Q32 572 34 560Z" fill="url(#edge)"/>
        <path d="M410 556h80l-6 8h-68z" fill="#8a8e95"/>
        ${keys}
        <path d="M352 552 L548 552 L556 548 L344 548Z" fill="#b9bdc2"/>
      </svg>
      ${screen}
      <div style="position:absolute;left:152px;top:36px;width:596px;height:384px;border-radius:17px;background:linear-gradient(125deg,rgba(255,255,255,.16),rgba(255,255,255,0) 45%);pointer-events:none"></div>
      <img class="hl" src="${A3('1faf3-1f3fc')}" style="position:absolute;left:150px;top:410px;width:250px;transform-origin:70% 40%;filter:drop-shadow(0 22px 18px rgba(7,26,46,.4))">
      <img class="hr" src="${A3('1faf3-1f3fc')}" style="position:absolute;left:500px;top:410px;width:250px;transform-origin:30% 40%;filter:drop-shadow(0 22px 18px rgba(7,26,46,.4))">
      <div style="position:absolute;left:770px;top:340px;width:240px;height:260px">
        <svg width="240" height="200" viewBox="0 0 240 200" style="position:absolute;left:0;top:-130px">
          <filter id="steamBlur"><feGaussianBlur stdDeviation="4"/></filter>
          ${[60, 100, 140].map(x => `<path class="st" pathLength="1" d="M${x} 190 q-22 -36 0 -72 q22 -36 0 -72 q-14 -24 0 -42" fill="none" stroke="#fff" stroke-width="12" stroke-linecap="round" filter="url(#steamBlur)"/>`).join('')}</svg>
        <img src="${A3('2615')}" style="position:absolute;left:0;top:0;width:240px;filter:drop-shadow(0 26px 22px rgba(7,26,46,.4))"></div>
    </div>`);
    const cta = add(`<div class="sans" style="background:${C.navy};color:${C.off};font-size:52px;padding:26px 40px 26px 64px;border-radius:999px;display:flex;align-items:center;gap:24px;white-space:nowrap;box-shadow:0 26px 50px rgba(7,26,46,.4)">
        chama no direct<img class="hh" src="${A3('1f90d')}" style="width:84px;margin:-10px 0"></div>`);
    const spk = img3('2728', 110);
    const hearts = [0, 1, 2].map(() => img3('1f90d', 70));
    return t => {
      const out = ease.inOut(P(t, 7.9, .5)), o = 1 - out;
      animHead(head, t, 380, out);
      const kl = ease.out(P(t, .45, 1.0));
      put(lap, { x: 540, y: 1150 + (1 - kl) * 160 - out * 70, s: lerp(.92, .96, kl) + t * .003, o: clamp(kl * 2) * o });
      // mãos digitando: pequenas batidas alternadas
      const hl = lap.querySelector('.hl'), hr = lap.querySelector('.hr');
      const tap = ph => Math.max(0, Math.sin(ph)) ** 2;
      const on = t > 1.2 && t < 3.9 ? 1 : .25;
      hl.style.transform = `scaleX(-1) translate(${Math.sin(t * 3.1) * 6}px,${-tap(t * 17) * 12 * on}px) rotate(${tap(t * 17) * 3 * on}deg)`;
      hr.style.transform = `translate(${Math.sin(t * 2.7 + 1) * 6}px,${-tap(t * 17 + 1.7) * 12 * on}px) rotate(${-tap(t * 17 + 1.7) * 3 * on}deg)`;
      // tela: posts surgindo, cursor, notificação
      lap.querySelectorAll('.tile').forEach((tl, i) => {
        const k = ease.back(P(t, 1.3 + i * .32, .5));
        tl.style.transform = `scale(${lerp(.4, 1, clamp(k, 0, 1.1))})`; tl.style.opacity = clamp(k * 2);
      });
      const cur = lap.querySelector('.cursor');
      const cp = [[420, 300], [140, 160], [300, 230], [470, 260], [470, 60]];
      const seg = clamp((t - 1.2) / .8, 0, cp.length - 1.001), si = Math.floor(seg), sk = ease.inOut(seg - si);
      cur.style.transform = `translate(${lerp(cp[si][0], cp[si + 1][0], sk)}px,${lerp(cp[si][1], cp[si + 1][1], sk)}px)`;
      const kt = ease.back(P(t, 4.1, .55));
      const toast = lap.querySelector('.toast');
      toast.style.transform = `translateX(${(1 - clamp(kt)) * 300}px)`; toast.style.opacity = clamp(kt * 2);
      // vapor do café
      lap.querySelectorAll('.st').forEach((s, i) => {
        const ph = (t * .45 + i * .33) % 1;
        s.style.strokeDasharray = '.35 1';
        s.style.strokeDashoffset = -ph * .8 + .35;
        s.style.opacity = .5 * Math.sin(ph * Math.PI);
      });
      lap.querySelector('.plant').style.transform = `rotate(${Math.sin(t * 1.2) * 1.5}deg)`;
      // CTA
      const kc = ease.back(P(t, 4.6, .6));
      put(cta, { x: 540, y: 1720 - out * 70, s: kc * (t > 5.4 ? 1 + .025 * Math.sin((t - 5.4) * 5.5) : 1), o: clamp(kc * 2) * o });
      cta.querySelector('.hh').style.transform = `scale(${t > 5.2 ? 1 + .14 * Math.max(0, Math.sin((t - 5.2) * 6.5)) : 1}) rotate(${Math.sin(t * 3) * 6}deg)`;
      const kk = ease.back(P(t, 5.0, .5));
      put(spk, { x: 900, y: 1630, s: kk * (1 + .1 * Math.sin(t * 5)), r: Math.sin(t * 2) * 12, o: clamp(kk * 2) * o });
      hearts.forEach((h, i) => {
        const s = 5.3 + i * .7, lt = t - s, k = clamp(lt / 1.8);
        put(h, { x: 170 + i * 50 + Math.sin(lt * 3.5 + i) * 18, y: 1650 - k * 300, s: ease.back(P(t, s, .4)) * (.8 + i * .15), r: Math.sin(lt * 3) * 14, o: (lt > 0 ? 1 - ease.in(k) : 0) * o });
      });
    };
  },
};
