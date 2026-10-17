// Roteiro "primeira impressão" — Telas 1, 2 e 3 (sem fundo).
// Reaproveita componentes de scenes_telas4-6.js (edHead, iphone, hand3d, ui, avatar...).

const POSTH = 700;

const avatarE = (s, emoji, bg) => `<div style="width:${s}px;height:${s}px;border-radius:50%;padding:3px;box-sizing:border-box;flex:none;background:conic-gradient(from 200deg,#feda75,#fa7e1e,#d62976,#962fbf,#4f5bd5,#feda75)">
  <div style="width:100%;height:100%;border-radius:50%;border:3px solid #fff;box-sizing:border-box;background:${bg};display:flex;align-items:center;justify-content:center"><img src="${A3(emoji)}" style="width:62%"></div></div>`;

// post do feed com altura fixa (para rolagem precisa)
function igPost({ bg, inner, likes, cap, user = 'suamarca', time = '3 h', av = avatar(50) }) {
  return `<div style="height:${POSTH}px;overflow:hidden;background:#fff;${UI};color:#111">
    <div style="display:flex;align-items:center;gap:14px;height:76px;padding:0 20px">${av}
      <div style="font-weight:600;font-size:21px">${user} <span style="font-weight:400;color:${IG.gray}">· ${time}</span></div>
      <div style="margin-left:auto;font-size:26px;letter-spacing:2px">•••</div></div>
    <div style="height:462px;background:${bg};position:relative;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:12px;overflow:hidden">${inner}</div>
    <div style="display:flex;gap:20px;align-items:center;padding:16px 20px 6px">${ui('heart')}${ui('comment')}${ui('share')}<span style="margin-left:auto">${ui('save')}</span></div>
    <div class="likes" style="font-weight:600;font-size:20px;padding:4px 20px;display:inline-block">${likes}</div>
    <div style="font-size:19.5px;padding:4px 20px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis"><b style="font-weight:600">${user}</b> ${cap}</div>
  </div>`;
}
const tabbarHTML = () => `<div style="position:absolute;left:0;right:0;bottom:0;height:92px;background:#fff;border-top:1px solid ${IG.line};display:flex;justify-content:space-around;align-items:flex-start;padding-top:16px;z-index:10">
  ${ui('home', 32, '#000', 2.1, '#000')}${ui('search', 32)}${ui('plus', 32)}${ui('reels', 32)}<div style="width:32px;height:32px;border-radius:50%;background:${C.navy};border:2px solid #000;box-sizing:border-box"></div></div>`;
function feedPhone(postsHtml, id) {
  return iphone(`
    <svg width="0" height="0" style="position:absolute"><filter id="${id}" x="-5%" y="-20%" width="110%" height="140%"><feGaussianBlur class="vb" stdDeviation="0 0"/></filter></svg>
    <div style="position:absolute;left:0;right:0;top:58px;bottom:92px;overflow:hidden">
      <div class="feed" style="position:absolute;left:0;right:0;top:0;filter:url(#${id})">${postsHtml}</div></div>
    ${tabbarHTML()}`);
}
// mão que arrasta para cima em cada swipe
function swipeHand(t, swipes, { PX, PY, dur = .32, pre = .14, y0 = 330, y1 = -80, x = 110 }) {
  let ty = PY + y0, tx = PX + x, r = 8, hs = 1;
  swipes.forEach((s, i) => {
    if (t >= s - pre && t < s + dur + .06) {
      const k = P(t, s, dur);
      ty = lerp(PY + y0, PY + y1, ease.inOut(k)); tx = PX + x + Math.sin(k * Math.PI) * 18; r = lerp(8, -4, k);
      if (t < s && i > 0) { const kk = P(t, s - pre, pre); ty = lerp(PY + y1, PY + y0, ease.inOut(kk)); hs = lerp(.94, 1, kk); }
    }
  });
  return { tx, ty, r, hs };
}

// =====================================================================
// Tela 1 · Gancho — "Você sabia que já te julgaram hoje?"
// =====================================================================
SCENES['T1_gancho'] = {
  dur: 6.6, bg: 'none', build() {
    const head = edHead({ label: 'PRIMEIRA IMPRESSÃO', parts: ['Você sabia que já te', { mk: 'julgaram' }, 'hoje?'], sub: '(o último é o pior)', size: 86 });
    head.querySelector('.sub').style.cssText += ";font-family:'Titulo',serif;font-style:italic;font-size:44px;color:#313D65";
    const feedPosts = [
      { user: 'cafe.dalu', av: avatarE(50, '2615', '#f3e9dc'), bg: 'linear-gradient(160deg,#e9dccb,#c9b39a)', inner: `<img src="${A3('2615')}" style="width:220px">`, likes: '842 curtidas', cap: 'Nosso cappuccino da semana chegou' },
      { user: 'studio.bia', av: avatarE(50, '1f484', '#f6e3e6'), bg: 'linear-gradient(160deg,#f3d9de,#d9a9b3)', inner: `<img src="${A3('1f484')}" style="width:200px">`, likes: '1.096 curtidas', cap: 'Make leve pro dia a dia, salva!' },
      { user: 'ateliemar', av: avatarE(50, '1f457', '#e3eef6'), bg: 'linear-gradient(160deg,#dbe7f1,#a9c2d8)', inner: `<img src="${A3('1f457')}" style="width:210px">`, likes: '317 curtidas', cap: 'Peça única, feita à mão' },
      { user: 'docesdaju', av: avatarE(50, '1f381', '#fbeede'), bg: 'linear-gradient(160deg,#fbe8d2,#e9b98c)', inner: `<img src="${A3('1f381')}" style="width:210px">`, likes: '2.310 curtidas', cap: 'Kits de presente com 15% até sexta' },
      { user: 'casa.verde', av: avatarE(50, '1fab4', '#e5efe2'), bg: 'linear-gradient(160deg,#e3ecdf,#b5c9ad)', inner: `<img src="${A3('1fab4')}" style="width:220px">`, likes: '588 curtidas', cap: 'Como cuidar da sua primeira planta' },
      { user: 'pe.na.areia', av: avatarE(50, '1f305', '#fde9d6'), bg: 'linear-gradient(180deg,#f9c98b,#e98a6a 60%,#7a5c8f)', inner: `<img src="${A3('1f305')}" style="width:220px">`, likes: '4.120 curtidas', cap: 'Fim de tarde perfeito' },
      { user: 'lojaflor', av: avatarE(50, '1f45c', '#efe6f4'), bg: 'linear-gradient(160deg,#ece1f1,#c3a9d1)', inner: `<img src="${A3('1f45c')}" style="width:210px">`, likes: '731 curtidas', cap: 'Nova coleção de bolsas no ar' },
      { user: 'sabor.caseiro', av: avatarE(50, '1f37d-fe0f', '#f2ece4'), bg: 'linear-gradient(160deg,#efe7dc,#cdbba4)', inner: `<img src="${A3('1f37d-fe0f')}" style="width:210px">`, likes: '1.402 curtidas', cap: 'Cardápio da semana fresquinho' },
      { user: 'fotodani', av: avatarE(50, '1f4f8', '#e6e8ef'), bg: 'linear-gradient(160deg,#d9dde8,#9aa3bd)', inner: `<img src="${A3('1f4f8')}" style="width:210px">`, likes: '960 curtidas', cap: 'Bastidores do ensaio de hoje' },
    ].map(igPost).join('');
    const ph = feedPhone(feedPosts, 'vbT1');
    const HS = 290, hand = hand3d(HS);
    const eyes = img3('1f440', 190);
    const r1 = img3('1f9d0', 170), r2 = img3('1f928', 170);
    const PX = 560, PY = 1230;
    const swipes = [1.0, 1.55, 2.1, 2.65, 3.2, 3.75, 4.3];
    const amt = 640;
    const scrollAt = tt => swipes.reduce((a, s) => a + ease.out(P(tt, s, .34)) * amt, 0);
    return t => {
      const out = ease.inOut(P(t, 6.1, .5)), o = 1 - out;
      animHead(head, t, 360, out);
      // olhos 3D espiando
      const ke = ease.back(P(t, 1.1, .5));
      const look = Math.sin(t * 2.2) > .3 ? 8 : Math.sin(t * 2.2) < -.3 ? -8 : 0;
      put(eyes, { x: 950 + look, y: 112 - out * 70 + Math.sin(t * 3) * 4, s: ke, r: look * .8, o: clamp(ke * 2) * o });
      const kp = ease.out(P(t, .3, .9));
      put(ph, { x: PX, y: PY + (1 - kp) * 320 - out * 70, o: clamp(kp * 2) * o });
      tilt(ph, lerp(-22, -9, ease.inOut(P(t, .3, 2.2))) + Math.sin(t * .9) * 1.5, lerp(10, 5, kp), lerp(-3, -1.5, kp));
      const sc = scrollAt(t), v = Math.abs(sc - scrollAt(t - 1 / 30));
      ph.querySelector('.feed').style.transform = `translateY(${-sc}px)`;
      ph.querySelector('.vb').setAttribute('stdDeviation', `0 ${Math.min(10, v * .12)}`);
      const h = swipeHand(t, swipes, { PX, PY });
      if (t < 1.0) h.ty = PY + 330 + (1 - ease.out(P(t, .7, .3))) * 220;
      const ho = ease.out(P(t, .7, .3)) * (1 - ease.in(P(t, 4.75, .35)));
      putTip(hand, HS, h.tx, h.ty, { s: h.hs, r: h.r, o: ho * o });
      const k1 = ease.back(P(t, 2.2, .5)) * (1 - ease.in(P(t, 4.4, .3)));
      put(r1, { x: 190, y: 1000 + Math.sin(t * 2.5) * 6, s: k1, r: -10, o: clamp(k1 * 2) * o });
      const k2 = ease.back(P(t, 3.3, .5)) * (1 - ease.in(P(t, 5.0, .3)));
      put(r2, { x: 900, y: 1300 + Math.sin(t * 2.2) * 6, s: k2, r: 10, o: clamp(k2 * 2) * o });
    };
  },
};

// perfil do Instagram (reuso nas telas 2)
function profileHTML(followersSpan) {
  const hl = [['2728', 'Novidades'], ['1f6cd-fe0f', 'Loja'], ['1f4ac', 'Dúvidas'], ['1f48c', 'Clientes'], ['1f4c5', 'Entrega']];
  return `<div style="position:absolute;left:0;right:0;top:58px;bottom:0;background:#fff;${UI};color:#000">
      <div style="display:flex;align-items:center;gap:8px;height:64px;padding:0 22px">${ui('lock', 20, '#000', 2.2)}<b style="font-weight:700;font-size:26px">suamarca</b>${ui('chev', 22, '#000', 2.4)}
        <span style="margin-left:auto;display:flex;gap:22px">${ui('plus', 30)}${ui('menu', 30, '#000', 2.2)}</span></div>
      <div style="display:flex;align-items:center;padding:6px 22px 0;gap:26px">${avatar(130)}
        <div style="flex:1;display:flex;justify-content:space-around;text-align:center">
          <div><div style="font-weight:700;font-size:23px">214</div><div style="font-size:17px">publicações</div></div>
          <div class="fol" style="border-radius:12px;padding:2px 4px">${followersSpan}<div style="font-size:17px">seguidores</div></div>
          <div><div style="font-weight:700;font-size:23px">98</div><div style="font-size:17px">seguindo</div></div></div></div>
      <div style="padding:12px 22px 0;font-size:19px;line-height:1.38">
        <div style="font-weight:600">Sua Marca</div><div style="color:${IG.gray}">Loja de roupas</div>
        <div>Moda feminina com propósito<br>Enviamos para todo o Brasil</div>
        <div style="display:inline-flex;align-items:center;gap:6px;color:${IG.link};font-weight:600">${ui('link', 20, IG.link, 2.2)}suamarca.com/links</div></div>
      <div style="display:flex;gap:8px;padding:14px 22px 0">
        <div style="flex:1;height:46px;border-radius:10px;background:${IG.blue};color:#fff;font-weight:600;font-size:19px;display:flex;align-items:center;justify-content:center">Seguir</div>
        <div style="flex:1;height:46px;border-radius:10px;background:${IG.soft};font-weight:600;font-size:19px;display:flex;align-items:center;justify-content:center">Mensagem</div></div>
      <div style="display:flex;gap:18px;padding:18px 22px 0">${hl.map(([e, l]) => `<div style="text-align:center;font-size:15px"><div style="width:74px;height:74px;border-radius:50%;border:2px solid ${IG.line};padding:4px;box-sizing:border-box"><div style="width:100%;height:100%;border-radius:50%;background:${C.off};display:flex;align-items:center;justify-content:center"><img src="${A3(e)}" style="width:42px"></div></div><div style="margin-top:6px">${l}</div></div>`).join('')}</div>
      <div style="display:flex;justify-content:space-around;margin-top:16px;border-top:1px solid ${IG.line};height:54px;align-items:center">${ui('grid', 28, '#000', 1.8)}${ui('reels', 28, IG.gray, 1.8)}${ui('tag', 28, IG.gray, 1.8)}</div>
      <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:3px">${Array.from({ length: 9 }, (_, j) => `<div class="${j === 0 ? 'gp' : ''}">${postTile(j)}</div>`).join('')}</div>
    </div>`;
}
const fmtFollowers = n => (n >= 10000 ? (n / 1000).toFixed(1).replace('.', ',') + ' mil' : Math.round(n).toLocaleString('pt-BR'));

// =====================================================================
// Tela 2 · "10 mil seguidores e 5 curtidas... comprou, né?"
// =====================================================================
SCENES['T2_seguidores_curtidas'] = {
  dur: 7.6, bg: 'none', build() {
    const head = edHead({ label: 'Nº 01', parts: ['“10 mil seguidores e 5 curtidas…', { mk: 'comprou,' }, 'né?”'], size: 76 });
    const post = igPost({ bg: `linear-gradient(160deg,#efe7dc,${C.beige})`, inner: `<img src="${A3('1f457')}" style="width:230px"><span class="serif" style="font-size:44px;color:${C.navy}">Coleção nova</span>`, likes: '5 curtidas', cap: 'Chegou a coleção que vocês pediram!', time: '2 d' });
    const ph = iphone(`
      <div class="prof" style="position:absolute;inset:0;transform-origin:0 0">${profileHTML('<div class="num" style="font-weight:700;font-size:23px">0</div>')}</div>
      <div class="post" style="position:absolute;left:0;right:0;top:0;bottom:0;background:#fff;transform-origin:0 0;z-index:6">
        <div style="position:absolute;left:0;right:0;top:58px;height:64px;display:flex;align-items:center;padding:0 22px;gap:18px;${UI}">${ui('chev', 28, '#000', 2.4).replace('<path', '<path transform="rotate(90 12 12)"')}<b style="font-size:24px;font-weight:700">Publicações</b></div>
        <div style="position:absolute;left:0;right:0;top:122px">${post}</div></div>`);
    const HS = 290, hand = hand3d(HS), rip = ring();
    // anéis de destaque ficam dentro das camadas para acompanhar o zoom
    const mkRing = (layer, color) => { const r = document.createElement('div'); r.style.cssText = `position:absolute;left:0;top:0;border-radius:999px;border:3px solid ${color};box-sizing:border-box;z-index:8;transform-origin:50% 50%`; layer.appendChild(r); return r; };
    const ringA = mkRing(ph.querySelector('.prof'), C.indigo), ringB = mkRing(ph.querySelector('.post'), C.alert);
    const placeRing = (r, el, root, k, padX, padY) => {
      let x = 0, y = 0, n = el; while (n && n !== root) { x += n.offsetLeft; y += n.offsetTop; n = n.offsetParent; }
      r.style.left = x - padX + 'px'; r.style.top = y - padY + 'px';
      r.style.width = el.offsetWidth + padX * 2 + 'px'; r.style.height = el.offsetHeight + padY * 2 + 'px';
      r.style.transform = `scale(${k})`; r.style.opacity = clamp(k * 2);
    };
    const brow = img3('1f928', 200), down = img3('1f4c9', 150), spk = img3('2728', 110);
    const stk = sticker('10,2 mil ≠ 5 curtidas');
    const PX = 540, PY = 1230;
    const absPos = (el, root) => { let x = el.offsetWidth / 2, y = el.offsetHeight / 2, n = el; while (n && n !== root) { x += n.offsetLeft; y += n.offsetTop; n = n.offsetParent; } return [x, y]; };
    return t => {
      const out = ease.inOut(P(t, 7.1, .5)), o = 1 - out;
      animHead(head, t, 340, out);
      const kp = ease.out(P(t, .2, .9));
      put(ph, { x: PX, y: PY + (1 - kp) * 320 - out * 70, o: clamp(kp * 2) * o });
      tilt(ph, lerp(18, 8, ease.inOut(P(t, .2, 2.4))) + Math.sin(t * .8) * 1.4, lerp(10, 5, kp), lerp(3, 1.5, kp));
      const scr = ph.querySelector('.scr');
      const prof = ph.querySelector('.prof'), postL = ph.querySelector('.post');
      // contador de seguidores
      const n = 10200 * ease.out(P(t, .7, 1.4));
      prof.querySelector('.num').textContent = fmtFollowers(n < 10199 ? n : 10200);
      // zoom no número de seguidores e volta
      const fol = prof.querySelector('.fol');
      const [fx, fy] = absPos(fol, prof);
      const kz = ease.inOut(P(t, .8, .9)) * (1 - ease.inOut(P(t, 2.75, .55)));
      const Z1 = 2.4, s1 = lerp(1, Z1, kz);
      const W0 = scr.offsetWidth, H0 = scr.offsetHeight;
      prof.style.transform = `translate(${(W0 / 2 - fx * s1) * kz}px,${(H0 * .42 - fy * s1) * kz}px) scale(${s1})`;
      fol.style.background = kz > .9 && t < 2.8 ? 'rgba(203,197,185,.35)' : 'transparent';
      const fr = fol.getBoundingClientRect();
      const ka = ease.back(P(t, 1.9, .4)) * (1 - ease.in(P(t, 2.7, .2)));
      placeRing(ringA, fol, prof, ka, 8, 6);
      const ksp = ease.back(P(t, 2.0, .4)) * (1 - ease.in(P(t, 2.7, .2)));
      put(spk, { x: fr.right + 30, y: fr.top - 10, s: ksp, r: t * 40, o: clamp(ksp * 2) * o });
      // mão toca no primeiro post da grade
      const gp = prof.querySelector('.gp').getBoundingClientRect();
      const gx = gp.left + gp.width / 2, gy = gp.top + gp.height / 2;
      const kh = ease.inOut(P(t, 3.05, .5));
      const tx = lerp(PX + 300, gx, kh), ty = lerp(PY + 520, gy, kh);
      const ho = ease.out(P(t, 3.0, .2)) * (1 - ease.in(P(t, 3.85, .25)));
      putTip(hand, HS, tx, ty, { s: t > 3.55 && t < 3.72 ? .93 : 1, r: lerp(14, 4, kh), o: ho * o });
      const kr = P(t, 3.6, .5);
      put(rip, { x: gx, y: gy, s: lerp(.3, 1.6, ease.out(kr)), o: (kr > 0 && kr < 1 ? 1 - kr : 0) * o });
      // post abre e câmera aproxima das curtidas
      const kpo = ease.out(P(t, 3.7, .45));
      const likes = postL.querySelector('.likes');
      const [lx, ly] = absPos(likes, postL);
      const kz2 = ease.inOut(P(t, 4.3, .9));
      const Z2 = 2.6, s2 = lerp(1, Z2, kz2);
      postL.style.transform = `translate(${(1 - kpo) * W0 + (W0 * .4 - lx * s2) * kz2}px,${(H0 * .45 - ly * s2) * kz2}px) scale(${s2})`;
      postL.style.visibility = t > 3.65 ? 'visible' : 'hidden';
      const kb = ease.back(P(t, 5.2, .45));
      placeRing(ringB, likes, postL, kb, 2, 4);
      const k1 = ease.back(P(t, 5.4, .5));
      put(brow, { x: 180, y: 980 + Math.sin(t * 2.4) * 6, s: k1, r: -8, o: clamp(k1 * 2) * o });
      const k2 = ease.back(P(t, 5.6, .5));
      put(down, { x: 900, y: 1450 + Math.sin(t * 2) * 6, s: k2, r: 8, o: clamp(k2 * 2) * o });
      const ks = ease.back(P(t, 5.9, .6));
      put(stk, { x: 600, y: 1720 - out * 70, s: ks, r: lerp(-10, -3, clamp(ks)), o: clamp(ks * 2) * o });
    };
  },
};

// =====================================================================
// Tela 3 · "Só tem post de promoção, tá precisando vender, hein?"
// =====================================================================
SCENES['T3_so_promocao'] = {
  dur: 7.4, bg: 'none', build() {
    const head = edHead({ label: 'Nº 02', parts: ['“Só tem post de', { mk: 'promoção,' }, 'tá precisando vender, hein?”'], size: 74 });
    const big = (txt, c, s = 92) => `<span style="${UI};font-weight:700;font-size:${s}px;line-height:.95;color:${c};text-align:center;letter-spacing:-.02em;text-transform:uppercase">${txt}</span>`;
    const promos = [
      { bg: '#E63946', inner: `<img src="${A3('1f3f7-fe0f')}" style="width:150px">${big('50% OFF', '#FFD60A', 120)}`, cap: 'PROMOÇÃO IMPERDÍVEL!!! Corre que acaba hoje', likes: '7 curtidas' },
      { bg: '#FFD60A', inner: `${big('Promoção', '#111', 96)}<img src="${A3('1f4e2')}" style="width:150px">`, cap: 'Só hoje!!! Chama no direct', likes: '4 curtidas' },
      { bg: '#111', inner: `${big('Liquida<br>tudo', '#E63946', 104)}<img src="${A3('1f4b8')}" style="width:140px">`, cap: 'Liquida total, aproveita!!!', likes: '6 curtidas' },
      { bg: '#E63946', inner: `${big('Últimas<br>unidades', '#fff', 88)}<img src="${A3('1f6d2')}" style="width:130px">`, cap: 'ÚLTIMAS UNIDADES, NÃO PERCA', likes: '3 curtidas' },
      { bg: '#FFD60A', inner: `<img src="${A3('1f381')}" style="width:140px">${big('Compre 2<br>leve 3', '#E63946', 86)}`, cap: 'Promoção válida até acabar o estoque!!!', likes: '5 curtidas' },
      { bg: '#E63946', inner: `${big('Frete grátis<br>só hoje', '#FFD60A', 80)}<img src="${A3('1f3f7-fe0f')}" style="width:130px">`, cap: 'FRETE GRÁTIS SÓ HOJE, CORRE', likes: '2 curtidas' },
      { bg: '#111', inner: `${big('Black<br>week', '#FFD60A', 110)}`, cap: 'Mais promoção pra vocês!!!', likes: '4 curtidas' },
    ].map((p, i) => igPost({ ...p, time: `${i + 1} d` })).join('');
    const ph = feedPhone(promos, 'vbT3');
    const HS = 290, hand = hand3d(HS);
    const counter = add(`<div class="sans" style="background:${C.navy};color:${C.off};font-size:34px;padding:16px 30px;border-radius:999px;white-space:nowrap;box-shadow:0 16px 34px rgba(7,26,46,.35)">promoção nº <b class="cn" style="color:${C.beige}">1</b></div>`);
    const grit = img3('1f62c', 180), roll = img3('1f644', 180);
    const stk = sticker('…e cadê o conteúdo?');
    const PX = 540, PY = 1250;
    const swipes = [1.05, 1.65, 2.25, 2.85, 3.45, 4.05];
    const scrollAt = tt => swipes.reduce((a, s) => a + ease.inOut(P(tt, s, .38)) * POSTH, 0);
    return t => {
      const out = ease.inOut(P(t, 6.9, .5)), o = 1 - out;
      animHead(head, t, 350, out);
      const kp = ease.out(P(t, .25, .9));
      put(ph, { x: PX, y: PY + (1 - kp) * 320 - out * 70, o: clamp(kp * 2) * o });
      tilt(ph, lerp(-20, -8, ease.inOut(P(t, .25, 2.2))) + Math.sin(t * .9) * 1.5, lerp(10, 5, kp), lerp(-3, -1.5, kp));
      const sc = scrollAt(t), v = Math.abs(sc - scrollAt(t - 1 / 30));
      ph.querySelector('.feed').style.transform = `translateY(${-sc}px)`;
      ph.querySelector('.vb').setAttribute('stdDeviation', `0 ${Math.min(10, v * .1)}`);
      const h = swipeHand(t, swipes, { PX, PY, dur: .38 });
      if (t < 1.05) h.ty = PY + 330 + (1 - ease.out(P(t, .75, .3))) * 220;
      const ho = ease.out(P(t, .75, .3)) * (1 - ease.in(P(t, 4.55, .35)));
      putTip(hand, HS, h.tx, h.ty, { s: h.hs, r: h.r, o: ho * o });
      // contador de promoções
      const idx = 1 + swipes.filter(s => t >= s + .3).length;
      counter.querySelector('.cn').textContent = idx;
      const lastSw = Math.max(0, ...swipes.filter(s => t >= s + .3).map(s => s + .3));
      const bump = lastSw ? 1 + .18 * Math.exp(-(t - lastSw) * 8) : 1;
      const kc = ease.back(P(t, .9, .5));
      put(counter, { x: 810, y: 700 - out * 70, s: kc * bump, r: 4, o: clamp(kc * 2) * o });
      const k1 = ease.back(P(t, 2.5, .5)) * (1 - ease.in(P(t, 4.2, .3)));
      put(grit, { x: 175, y: 1000 + Math.sin(t * 2.5) * 6, s: k1, r: -10, o: clamp(k1 * 2) * o });
      const k2 = ease.back(P(t, 3.7, .5));
      put(roll, { x: 910, y: 1380 + Math.sin(t * 2.2) * 6, s: k2, r: 10, o: clamp(k2 * 2) * o });
      const ks = ease.back(P(t, 4.7, .6));
      put(stk, { x: 600, y: 1720 - out * 70, s: ks, r: lerp(-10, -3, clamp(ks)), o: clamp(ks * 2) * o });
    };
  },
};
