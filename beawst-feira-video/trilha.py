# Gera a trilha (120 BPM) sincronizada com os cortes do video.html.
# Uso: python3 trilha.py out/trilha.wav
import sys, wave
import numpy as np

SR, DUR, BPM = 44100, 25.0, 120
BEAT = 60 / BPM
N = int(SR * DUR)
mix = np.zeros(N)
rng = np.random.default_rng(7)
CUTS = [3, 6, 9, 12, 17, 21]


def add(sig, t, gain=1.0):
    i = int(t * SR)
    if i >= N:
        return
    sig = sig[: N - i]
    mix[i:i + len(sig)] += sig * gain


def env(n, a, d):
    t = np.arange(n) / SR
    return np.minimum(t / a, 1) * np.exp(-t / d)


def kick():
    n = int(.45 * SR); t = np.arange(n) / SR
    f = 45 + 120 * np.exp(-t * 28)
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * env(n, .002, .16)


def clap():
    n = int(.25 * SR)
    x = rng.standard_normal(n) * env(n, .001, .06)
    return np.convolve(x, np.ones(6) / 6, 'same') - np.convolve(x, np.ones(40) / 40, 'same')


def hat():
    n = int(.06 * SR)
    x = rng.standard_normal(n)
    x = x - np.convolve(x, np.ones(8) / 8, 'same')
    return x * env(n, .0005, .015)


def tone(freq, length, wave_='saw', a=.01, d=.3):
    n = int(length * SR); t = np.arange(n) / SR
    ph = (freq * t) % 1
    s = 2 * ph - 1 if wave_ == 'saw' else np.sin(2 * np.pi * freq * t)
    return s * env(n, a, d)


def lowpass(x, k):
    return np.convolve(x, np.ones(k) / k, 'same')


def whoosh(length=.6, up=True):
    n = int(length * SR)
    x = rng.standard_normal(n)
    out = np.zeros(n); seg = n // 12
    for j in range(12):  # varredura de filtro em blocos
        k = int(np.interp(j, [0, 11], [60, 3] if up else [3, 60]))
        out[j * seg:(j + 1) * seg] = lowpass(x, k)[j * seg:(j + 1) * seg]
    e = np.sin(np.linspace(0, np.pi, n)) ** 2
    return out * e


# progressão: Am - F - C - G (raízes do baixo)
roots = [55.0, 43.65, 65.41, 49.0]
chords = [[220, 261.6, 329.6], [174.6, 220, 261.6], [261.6, 329.6, 392], [196, 246.9, 293.7]]

nbeats = int(DUR / BEAT)
for b in range(nbeats):
    t = b * BEAT
    bar = b // 4
    intro = t < 1.0
    if not intro:
        add(kick(), t, .9)
        if b % 2 == 1:
            add(clap(), t, .35)
    add(hat(), t + BEAT / 2, .18)
    if t > 3:
        add(hat(), t + BEAT / 4, .08); add(hat(), t + 3 * BEAT / 4, .08)
    # baixo em colcheias
    r = roots[bar % 4]
    for k in range(2):
        add(lowpass(tone(r * 2, BEAT / 2 * .9, 'saw', .005, .12), 12), t + k * BEAT / 2, .32)
    # pad a cada compasso
    if b % 4 == 0:
        pad = sum(lowpass(tone(f, BEAT * 4, 'saw', .25, 1.6), 30) for f in chords[bar % 4])
        add(pad, t, .06)
    # arpejo a partir de S4
    if t >= 9:
        for k in range(4):
            f = chords[bar % 4][(b + k) % 3] * 2
            add(tone(f, .12, 'sine', .002, .06), t + k * BEAT / 4, .1)

# impactos e transições
add(kick(), 1.2, .9)
add(lowpass(rng.standard_normal(int(.5 * SR)) * env(int(.5 * SR), .001, .12), 4), 1.2, .25)
for c in CUTS:
    add(whoosh(.56), c - .28, .5)
# riser antes do CTA
add(whoosh(2.0, True), 19.0, .35)

# fade final
f = int(1.6 * SR)
mix[-f:] *= np.linspace(1, 0, f)
mix /= np.max(np.abs(mix)) * 1.12
stereo = np.stack([mix, mix], 1)
with wave.open(sys.argv[1] if len(sys.argv) > 1 else 'out/trilha.wav', 'wb') as w:
    w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR)
    w.writeframes((stereo * 32767).astype('<i2').tobytes())
