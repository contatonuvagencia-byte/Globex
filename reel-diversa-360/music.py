#!/usr/bin/env python3
"""Original score for the reel, synthesized from code (no third-party audio).

Inspirational A-minor progression (Am–F–C–G) at 96 BPM, with an arc locked to the
edit's scene times: soft intro → pulse on the destinations → emotional drop on
"o significado" → rebuild on "o convite" → peak hit on "Obrigado" → resolve on the
end card.

usage: python3 music.py <out.wav> <duration_s> [timeline.json]
"""
import json, sys
import numpy as np
from scipy.signal import butter, sosfilt, fftconvolve

OUT, DUR = sys.argv[1], float(sys.argv[2])
SR = 48000
N = int(DUR * SR) + SR * 3
rng = np.random.default_rng(7)

# scene times (seconds) — from timeline.json when given
S = dict(partida=7.69, destinos=19.1, experiencias=26.71, significado=35.51, convite=47.4,
         brinde=65.04, final=71.82)
if len(sys.argv) > 3:
    tl = json.load(open(sys.argv[3]))
    S.update(tl.get('music', {}))

BPM = 96
BEAT = 60 / BPM
BAR = 4 * BEAT
# Am, F, C, G  (MIDI)
CHORDS = [(57, [57, 60, 64]), (53, [57, 60, 65]), (48, [55, 60, 64]), (55, [55, 59, 62])]
CHORDS_END = [(57, [57, 60, 64]), (53, [57, 60, 65]), (48, [55, 60, 64]), (48, [55, 60, 64])]

hz = lambda m: 440.0 * 2 ** ((m - 69) / 12)
t_all = np.arange(N) / SR
L = np.zeros(N); R = np.zeros(N)          # dry
RL = np.zeros(N); RR = np.zeros(N)        # reverb send


def env_curve(points):
    """Piecewise-linear automation over the whole timeline: [(t, value), ...]."""
    xs, ys = zip(*points)
    return np.interp(t_all, xs, ys)


def lp(x, fc, order=2):
    return sosfilt(butter(order, fc, 'low', fs=SR, output='sos'), x)


def hp(x, fc, order=2):
    return sosfilt(butter(order, fc, 'high', fs=SR, output='sos'), x)


def add(sig, t0, gain=1.0, pan=0.0, send=0.0):
    i = int(t0 * SR)
    if i >= N:
        return
    sig = sig[:N - i]
    gl, gr = np.cos((pan + 1) * np.pi / 4), np.sin((pan + 1) * np.pi / 4)
    L[i:i + len(sig)] += sig * gain * gl
    R[i:i + len(sig)] += sig * gain * gr
    RL[i:i + len(sig)] += sig * gain * gl * send
    RR[i:i + len(sig)] += sig * gain * gr * send


def chord_at(t):
    k = int(t // BAR)
    prog = CHORDS_END if t >= S['final'] else CHORDS
    return prog[k % 4]


# ---------------------------------------------------------------- pad
def pad_voice(f, dur, bright):
    n = int(dur * SR)
    tt = np.arange(n) / SR
    s = np.zeros(n)
    for h, a in enumerate([1, .45, .25, .14, .08, .05], start=1):
        a *= bright ** (h - 1)
        for det in (-0.0018, 0.0018):
            s += a * np.sin(2 * np.pi * f * h * (1 + det) * tt + rng.uniform(0, 6.28))
    att, rel = min(1.0, dur / 3), min(1.4, dur / 2)
    e = np.minimum(1, tt / att) * np.minimum(1, (dur - tt) / rel).clip(0)
    return s * e


pad_level = env_curve([(0, .0), (2, .55), (S['destinos'], .6), (S['significado'], .75), (S['convite'], .7),
                       (S['brinde'] - .2, .8), (S['brinde'], 1.0), (S['final'], .8), (DUR - 1, .55), (DUR + 2, 0)])
pad_bright = env_curve([(0, .55), (S['destinos'], .7), (S['significado'], .6), (S['brinde'], .9), (DUR, .6)])
nbars = int(np.ceil((DUR + 2) / BAR))
for b in range(nbars):
    t0 = b * BAR
    root, tri = chord_at(t0 + 0.01)
    d = BAR + 1.2
    br = float(np.interp(t0, t_all[::SR // 10], pad_bright[::SR // 10]))
    for j, m in enumerate(tri):
        add(pad_voice(hz(m), d, br) * 0.05, t0, pan=(-.35, .0, .35)[j], send=.55)
    # high string-like layer from "o significado" on
    if t0 >= S['significado'] - BAR:
        add(pad_voice(hz(tri[-1] + 12), d, .5) * 0.022, t0, pan=.2, send=.8)
    add(pad_voice(hz(root - 12), d, .4) * 0.035, t0, send=.2)
pad_gain = np.repeat(pad_level[None, :], 1, 0)[0]
L *= pad_gain; R *= pad_gain; RL *= pad_gain; RR *= pad_gain


# ---------------------------------------------------------------- piano arpeggio
def piano(f, dur=2.2):
    n = int(dur * SR)
    tt = np.arange(n) / SR
    s = np.zeros(n)
    for h, (a, tau) in enumerate([(1, 1.1), (.35, .6), (.16, .35), (.07, .2)], start=1):
        s += a * np.sin(2 * np.pi * f * h * tt) * np.exp(-tt / tau)
    s *= np.minimum(1, tt / 0.004)
    return s


piano_density = [(0, BEAT), (S['partida'], BEAT / 2), (S['significado'], BEAT), (S['convite'], BEAT / 2),
                 (S['final'], BEAT)]
t = 0.6
k = 0
while t < DUR - 0.5:
    step = [d for (ts, d) in piano_density if ts <= t][-1]
    root, tri = chord_at(t)
    seq = [tri[0] + 12, tri[1] + 12, tri[2] + 12, tri[1] + 12, tri[2] + 12, tri[0] + 24]
    m = seq[k % len(seq)]
    vel = 0.05 * (0.85 + 0.3 * rng.random())
    if S['brinde'] <= t < S['final']:
        vel *= 1.25
    add(piano(hz(m)) * vel, t, pan=(-.25 if k % 2 else .25), send=.45)
    t += step
    k += 1


# ---------------------------------------------------------------- rhythm section
def kick(depth=1.0):
    n = int(0.5 * SR); tt = np.arange(n) / SR
    f = 45 + 70 * np.exp(-tt / 0.03)
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-tt / 0.18) * depth


def hat():
    n = int(0.08 * SR); tt = np.arange(n) / SR
    return hp(rng.standard_normal(n), 7000) * np.exp(-tt / 0.018)


def bass_note(f, dur):
    n = int(dur * SR); tt = np.arange(n) / SR
    s = np.sin(2 * np.pi * f * tt) + 0.25 * np.sin(4 * np.pi * f * tt)
    return s * np.minimum(1, tt / 0.01) * np.exp(-tt / 0.22)


def in_range(t, ranges):
    return any(a <= t < b for a, b in ranges)


DRUMS = [(S['destinos'], S['significado'] - 0.3), (S['convite'] + BAR * 2, S['final'] - 0.3)]
HATS = [(S['destinos'], S['significado'] - 0.3), (S['convite'] + BAR * 4, S['final'] - 0.3)]
BASS = [(S['destinos'], S['significado'] - 0.3), (S['convite'], S['final'] - 0.3)]
nb = int(DUR / BEAT) + 1
for i in range(nb):
    tb = i * BEAT
    if in_range(tb, DRUMS):
        add(kick(), tb, gain=0.32, send=.05)
    for half in (0, 0.5):
        th = tb + half * BEAT
        if in_range(th, BASS):
            root, _ = chord_at(th)
            add(bass_note(hz(root - 12), BEAT / 2), th, gain=0.11)
    if in_range(tb + BEAT / 2, HATS):
        add(hat(), tb + BEAT / 2, gain=0.05, pan=.3, send=.1)


# ---------------------------------------------------------------- transitions & peak
def riser(dur):
    n = int(dur * SR); tt = np.arange(n) / SR
    s = np.zeros(n)
    for j in range(8):  # brightening noise
        seg = slice(j * n // 8, (j + 1) * n // 8)
        s[seg] = lp(rng.standard_normal(n), min(300 * 1.6 ** j, 12000))[seg]
    return s * (tt / dur) ** 2.2


def boom():
    n = int(3.5 * SR); tt = np.arange(n) / SR
    f = 32 + 60 * np.exp(-tt / 0.06)
    low = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-tt / 0.9)
    air = lp(rng.standard_normal(n), 3000) * np.exp(-tt / 0.5) * 0.25
    return low + air


def swell(dur):  # reverse-cymbal style swell into a hit
    n = int(dur * SR); tt = np.arange(n) / SR
    return hp(rng.standard_normal(n), 3000) * (tt / dur) ** 3


add(riser(1.6) * 0.05, S['destinos'] - 1.6, send=.4)            # into the destinations
add(boom() * 0.25, S['destinos'], send=.4)
add(riser(4.0) * 0.08, S['brinde'] - 4.0, send=.4)              # build into the peak
add(swell(1.2) * 0.06, S['brinde'] - 1.2, pan=.1, send=.5)
add(boom() * 0.55, S['brinde'], send=.6)                        # the toast / Statue
add(boom() * 0.18, S['final'], send=.6)                         # soft landing on the end card

# ---------------------------------------------------------------- reverb + master
ir_n = int(2.8 * SR)
ir_t = np.arange(ir_n) / SR
irL = rng.standard_normal(ir_n) * np.exp(-ir_t / 0.75)
irR = rng.standard_normal(ir_n) * np.exp(-ir_t / 0.75)
irL = lp(irL, 6000); irR = lp(irR, 6000)
irL /= np.sqrt((irL ** 2).sum()); irR /= np.sqrt((irR ** 2).sum())
wetL = fftconvolve(RL, irL)[:N]
wetR = fftconvolve(RR, irR)[:N]
outL = L + wetL * 0.9
outR = R + wetR * 0.9
# gentle master: low cut, fade out, soft clip
outL = hp(outL, 30); outR = hp(outR, 30)
fade = env_curve([(0, 0), (0.8, 1), (DUR - 2.5, 1), (DUR, 0), (DUR + 3, 0)])
outL *= fade; outR *= fade
peak = max(np.abs(outL).max(), np.abs(outR).max())
outL, outR = np.tanh(outL / peak * 1.2) * 0.89, np.tanh(outR / peak * 1.2) * 0.89
n_out = int(DUR * SR)
pcm = (np.stack([outL[:n_out], outR[:n_out]], 1) * 32767).astype('<i2')

import wave
with wave.open(OUT, 'wb') as w:
    w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes(pcm.tobytes())
print('wrote', OUT, round(n_out / SR, 2), 's')
