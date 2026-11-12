#!/usr/bin/env python3
"""Reel "Diversa 360° USA Edition 2026" — CarlAVieira Tours.

Edit decision list anchored to the narration's word timestamps (words.json, from the
original 1.0x narration). The narration is sped up by SPEED, so every anchor is mapped
with T(o) = OFFSET + o / SPEED onto the final timeline.

Steps: cut + grade each take -> assemble (hard cuts / whip pans) -> timeline.json for
the overlay renderer (render_overlay.mjs), which composites graphics + audio.

usage: python3 build.py <bruto.mp4> <narracao.mp3> <workdir> <bruto2.mp4>
"""
import json, os, subprocess, sys

BRUTO, NARR, WORK = sys.argv[1], sys.argv[2], sys.argv[3]
# second batch of takes (Canva Video Export.mp4), referenced with f='b2'
BRUTO2 = sys.argv[4] if len(sys.argv) > 4 else None
os.makedirs(WORK, exist_ok=True)
HERE = os.path.dirname(os.path.abspath(__file__))
SPEED = 1.08
OFFSET = 0.10
TAIL = 0.18
FPS = 30
WHIP = 0.2  # whip-pan transition length

WORDS = json.load(open(os.path.join(HERE, 'words.json')))
T = lambda o: OFFSET + o / SPEED


def at(word, nth=1, lead=0.08):
    """Original-time start of the nth occurrence of a word (prefix match), minus a lead."""
    k = 0
    for w in WORDS:
        if w['w'].strip(' ,.').lower().startswith(word.lower()):
            k += 1
            if k == nth:
                return w['s'] - lead
    raise KeyError(word)


NARR_END = WORDS[-1]['e']
DURATION = round(T(NARR_END) + TAIL, 2)

# Color grades -------------------------------------------------------------
G = {
    # interiors / planning: soft, slightly warm, filmic
    'soft': 'colorbalance=rs=.03:bs=-.03:rm=.03:bm=-.02,eq=contrast=1.04:saturation=0.98:gamma=1.0',
    # California: warm, golden
    'ca': 'colorbalance=rs=.06:gs=.015:bs=-.08:rm=.06:gm=.01:bm=-.06:rh=.05:bh=-.05,eq=contrast=1.07:saturation=1.12:gamma=0.98',
    # New York: cooler, denser
    'ny': 'colorbalance=rs=-.05:bs=.07:rm=-.04:bm=.06:rh=-.02:bh=.03,eq=contrast=1.1:saturation=0.9:brightness=-0.035',
    # restaurant / toast: warm candlelight, deep shadows
    'dine': 'colorbalance=rs=.05:bs=-.05:rm=.05:bm=-.04:rh=.03,eq=contrast=1.1:saturation=1.05:brightness=-0.03:gamma=0.95',
    # NY at dusk/night (Statue of Liberty): deep blue, lifted contrast, darker
    'night': 'colorbalance=rs=-.1:gs=-.03:bs=.14:rm=-.08:gm=-.02:bm=.12:rh=-.04:bh=.06,eq=contrast=1.16:saturation=0.82:brightness=-0.12:gamma=0.92',
}

# Edit decision list -------------------------------------------------------
# (anchor in original narration time, source in-point in bruto (s), playback speed,
#  grade, transition INTO this shot, push-in amount, extra)
# Source windows were checked frame by frame: the packing take (39–74 s) shows a face
# at ~44, 46, 50–51, 60, 69–70 s, so only face-free windows are used.
EDL = [
    # 1 · O SONHO
    dict(a=0.0,               src=1.0,   sp=0.8, g='soft', tr='fade', push=0.06),   # mãos no celular
    dict(a=at('sonho'),       src=28.2,  sp=0.8, g='soft', tr='cut',  push=0.05),   # mapa, aviãozinho, passaporte
    dict(a=at('jornadas'),    src=32.6,  sp=0.8, g='soft', tr='cut',  push=0.05),   # dedo percorrendo o mapa
    # 2 · A PARTIDA
    dict(a=at('Desta'),       src=41.0,  sp=1.0, g='soft', tr='cut',  push=0.04, low=1.35),   # necessaire na mala
    dict(a=at('missão'),      src=55.6,  sp=1.0, g='soft', tr='cut',  push=0.04, low=1.35),   # zíper
    dict(a=at('fronteiras'),  src=61.3,  sp=1.0, g='soft', tr='cut',  push=0.04, low=1.35),   # fechando a tampa
    dict(a=at('descobrir'),   src=71.08, sp=0.75, g='soft', tr='cut', push=0.03, low=1.2),   # erguendo a mala
    dict(a=at('destinos'),    src=15.3,  sp=1.0, g='soft', tr='cut',  push=0.04),   # corredor do aeroporto
    dict(a=at('viver'),       src=2.0,   sp=0.9, g='ca',   tr='cut',  push=0.04, f='b2'),   # janela do avião, asa ao pôr do sol
    # 3 · OS DESTINOS (whip pans between cities, card on each name)
    dict(a=at('Santa'),       src=12.0,  sp=1.0, g='soft', tr='whip', push=0.03, city=('Santa Monica', ''), f='b2'),  # Santa Monica Pier
    dict(a=at('Califórnia'),  src=75.4,  sp=1.0, g='ca',   tr='whip', push=0.03, city=('Califórnia', '')),
    dict(a=at('Los'),         src=161.0, sp=1.0, g='ca',   tr='whip', push=0.03, city=('Los Angeles', '')),
    dict(a=at('Nova'),        src=99.4,  sp=1.0, g='ny',   tr='whip', push=0.05, city=('Nova York', '')),
    # 4 · AS EXPERIÊNCIAS (fast, one per beat)
    dict(a=at('Cada', 1),     src=108.0, sp=1.0, g='ny',   tr='cut',  push=0.04),   # Manhattan Bridge
    dict(a=at('descoberta'),  src=80.2,  sp=1.0, g='ca',   tr='cut',  push=0.03),   # palmeiras girando
    dict(a=at('cada', 2),     src=34.0,  sp=1.0, g='dine', tr='cut',  push=0.03, f='b2'),   # jantar, mãos cortando o prato
    dict(a=at('história'),    src=21.0,  sp=1.0, g='ny',   tr='cut',  push=0.03, f='b2'),   # Times Square
    dict(a=at('cada', 3),     src=44.0,  sp=1.0, g='dine', tr='cut',  push=0.04, f='b2'),   # garfo no prato
    dict(a=at('inspiração'),  src=6.5,   sp=1.0, g='ca',   tr='cut',  push=0.03, f='b2'),   # asa do avião
    # 5 · O SIGNIFICADO (slower, contemplative)
    dict(a=at('Mas'),         src=86.2,  sp=0.7, g='ca',   tr='cut',  push=0.05),   # sol baixo na orla
    dict(a=at('reconhecimento'), src=34.4, sp=0.7, g='soft', tr='cut', push=0.05),  # mão sobre o mapa
    dict(a=at('parcerias'),   src=102.4, sp=0.7, g='ny',   tr='cut',  push=0.05),   # skyline ao entardecer
    dict(a=at('sonhos'),   src=8.6,   sp=0.7, g='ca',   tr='cut',  push=0.05, f='b2'),   # asa sobre as nuvens
    # 6 · O CONVITE
    dict(a=at('Fomos'),       src=111.0, sp=0.9, g='ny',   tr='cut',  push=0.04),   # Manhattan Bridge
    dict(a=at('Top'),         src=18.0,  sp=0.9, g='soft', tr='cut',  push=0.04, card='topseller', f='b2'),  # píer
    dict(a=at('parceiro'),    src=37.0,  sp=1.0, g='dine', tr='cut',  push=0.04, f='b2'),   # prato gourmet
    dict(a=at('clientes'),    src=42.0,  sp=1.0, g='dine', tr='cut',  push=0.03, f='b2'),   # garfo no prato
    dict(a=at('mundo'),       src=16.0,  sp=1.0, g='soft', tr='cut',  push=0.04, f='b2'),   # Santa Monica Pier
    dict(a=at('redescobrir'), src=82.0,  sp=0.9, g='ca',   tr='cut',  push=0.03),
    dict(a=at('Santa', 2),    src=146.4, sp=1.0, g='ca',   tr='whip', push=0.03, city=('Santa Monica', '')),
    dict(a=at('Los', 2),      src=168.2, sp=1.0, g='ca',   tr='whip', push=0.03, city=('Los Angeles', '')),
    dict(a=at('Nova', 3),     src=104.3, sp=1.0, g='ny',   tr='whip', push=0.04, city=('Nova York', '')),
    # 7 · O BRINDE — Estátua, slow rotation, night grade, music peak
    dict(a=at('Obrigado'),    src=30.3,  sp=0.8, g='dine', tr='cut',  push=0.05, low=1.2, f='b2'),   # brinde (topo cortado: garçom ao fundo)
    dict(a=at('sempre'),      src=120.2, sp=0.75, g='night', tr='cut', push=0.09, rot=2.2),
    # 8 · CONVITE PARA ACOMPANHAR — Estátua desacelerando, logos
    dict(a=at('Embarcamos'),  src=134.0, sp=0.6, g='night', tr='cut', push=0.05, rot=-1.2, end=True),
]

for i, s in enumerate(EDL):
    s['t0'] = 0.0 if i == 0 else round(T(s['a']), 3)
for i, s in enumerate(EDL):
    s['t1'] = EDL[i + 1]['t0'] if i + 1 < len(EDL) else DURATION
    s['dur'] = round(s['t1'] - s['t0'], 3)


def render_shot(i, s):
    whip_in = s['tr'] == 'whip'
    whip_out = i + 1 < len(EDL) and EDL[i + 1]['tr'] == 'whip'
    out_len = s['dur']
    src_in = s['src']
    src_len = out_len * s['sp'] + 0.2
    D = out_len
    push, rot = s['push'], s.get('rot', 0)
    zoom = f"(1+{push}*t/{D:.3f})"
    vf = [
        f"setpts=(PTS-STARTPTS)/{s['sp']}",
        f"fps={FPS}",
        # slow push-in, centered (Ken Burns); extra headroom when rotating
        f"scale=w='1080*{zoom}*{1.06 if rot else 1}*{s.get('low', 1)}':h=-2:eval=frame:flags=bicubic",
    ]
    if rot:
        vf.append(f"rotate=a='{rot}*PI/180*t/{D:.3f}':ow=iw:oh=ih:c=black")
    # 'low' = reframe toward the bottom (hands/suitcase), keeping the top of the frame,
    # where the person's head enters in the packing take, out of the picture
    vf.append("crop=1080:1920:(iw-1080)/2:ih-1920" if s.get('low') else "crop=1080:1920")
    # whip pan: fast horizontal scroll + directional blur on the last/first frames
    h = WHIP / 2
    win = []
    if whip_out:
        win.append(f"gte(t,{D - h:.3f})")
    if whip_in:
        win.append(f"lt(t,{h:.3f})")
    if win:
        en = '+'.join(win)
        vf += [f"scroll=h=0.09:enable='{en}'", f"avgblur=sizeX=70:sizeY=2:enable='{en}'"]
    vf += [
        G[s['g']],
        "vignette=PI/5",
        "format=yuv420p",
    ]
    out = os.path.join(WORK, f'shot_{i:02d}.mp4')
    cmd = ['ffmpeg', '-loglevel', 'error', '-y', '-ss', f'{src_in:.3f}', '-t', f'{src_len:.3f}', '-i', BRUTO2 if s.get('f') == 'b2' else BRUTO,
           '-an', '-vf', ','.join(vf), '-t', f'{out_len:.3f}', '-c:v', 'libx264', '-preset', 'fast', '-crf', '12', out]
    subprocess.run(cmd, check=True)
    return out, out_len


shots = []
for i, s in enumerate(EDL):
    path, L = render_shot(i, s)
    shots.append((path, L))
    print(f"shot {i:02d}  {s['t0']:6.2f}–{s['t1']:6.2f}s  src {s['src']:6.2f}s  x{s['sp']}  {s['g']:5s}  {s['tr']}")

# Assemble with the concat demuxer, then a finishing pass (fades + film grain)
lst = os.path.join(WORK, 'shots.txt')
open(lst, 'w').write(''.join(f"file '{p}'\n" for p, _ in shots))
joined = os.path.join(WORK, 'joined.mp4')
subprocess.run(['ffmpeg', '-loglevel', 'error', '-y', '-f', 'concat', '-safe', '0', '-i', lst, '-c', 'copy', joined], check=True)
assembled = os.path.join(WORK, 'assembled.mp4')
cur_len = sum(L for _, L in shots)
subprocess.run(['ffmpeg', '-loglevel', 'error', '-y', '-i', joined, '-vf',
                f"fade=t=in:st=0:d=0.6,fade=t=out:st={DURATION - 0.6:.3f}:d=0.6,noise=alls=5:allf=t,format=yuv420p",
                '-t', f'{DURATION:.3f}', '-r', str(FPS), '-c:v', 'libx264', '-preset', 'medium', '-crf', '13', assembled],
               check=True)
print('assembled ->', assembled, 'len', round(cur_len, 2), 'target', DURATION)

# Subtitles: short lines written from the script, timed by consuming narration words in order
LINES = [
    "Toda grande conquista", "começa com um sonho.", "E algumas jornadas começam", "quando menos esperamos.",
    "Desta vez, nossa missão", "é atravessar fronteiras,", "descobrir novos destinos,", "conhecer pessoas",
    "e viver experiências extraordinárias.",
    "Do charme de Santa Monica", "ao sol da Califórnia,", "passando pela magia de Los Angeles,",
    "até chegar à grandiosidade", "de Nova York.",
    "Cada lugar, uma descoberta.", "Cada encontro, uma história.", "Cada experiência,", "uma nova inspiração.",
    "Mas essa viagem representa", "muito mais do que", "conhecer lugares incríveis.",
    "É o reconhecimento", "de uma trajetória,", "de parcerias construídas", "e de sonhos realizados.",
    "Fomos convidados,", "como agência Top Seller,", "pelo nosso grande parceiro,",
    "que atende tão bem os nossos clientes", "em viagens pelo mundo todo,",
    "para redescobrir", "três destinos marcantes", "nos Estados Unidos:", "Santa Monica, Los Angeles", "e Nova York.",
    "Obrigado, Diversa Turismo,", "sempre na vanguarda", "das boas experiências", "para nossa agência!",
    "Embarcamos dia 15.", "Vamos contar tudo por aqui,", "então nos acompanhem.",
    "Vai ter novidade fresquinha", "direto de lá!",
]
# the narration says "como a agência"; one extra spoken word on that line
EXTRA = {"como agência Top Seller,": 1}
subs, k = [], 0
for line in LINES:
    n = len(line.split()) + EXTRA.get(line, 0)
    ws = WORDS[k:k + n]
    k += n
    subs.append(dict(text=line, t0=round(T(ws[0]['s']) - 0.05, 3), t1=round(T(ws[-1]['e']) + 0.15, 3)))
assert k == len(WORDS), (k, len(WORDS))
for a_, b_ in zip(subs, subs[1:]):
    a_['t1'] = round(min(a_['t1'], b_['t0'] - 0.02), 3)

# a city card may outlive its shot (min 1.7 s) but never overlaps the next card
CITIES = [dict(t0=s['t0'], t1=max(s['t1'], s['t0'] + 1.7), name=s['city'][0], sub=s['city'][1]) for s in EDL if 'city' in s]
for c, n in zip(CITIES, CITIES[1:]):
    c['t1'] = min(c['t1'], n['t0'])

timeline = dict(
    duration=DURATION, fps=FPS, speed=SPEED, offset=OFFSET,
    cities=CITIES,
    topseller=[dict(t0=s['t0'], t1=s['t0'] + 4.2) for s in EDL if s.get('card') == 'topseller'][0],
    end=dict(t0=[s for s in EDL if s.get('end')][0]['t0']),
    subs=subs,
)
json.dump(timeline, open(os.path.join(WORK, 'timeline.json'), 'w'), ensure_ascii=False, indent=1)
print(json.dumps(subs, ensure_ascii=False)[:1500])
