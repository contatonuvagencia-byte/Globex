# Trilha PROVISÓRIA (sintetizada) com batida marcada, sincronizada com os cortes.
# Só é usada quando não existe assets/trilha.mp3.
# Uso: python3 trilha.py saida.wav '{"duration":30,"bpm":120,"cuts":[3,8,15,22,27]}'
import sys, json, wave
import numpy as np

out = sys.argv[1]
P = json.loads(sys.argv[2]) if len(sys.argv) > 2 else {}
DUR, BPM = float(P.get('duration', 30)), float(P.get('bpm', 120))
CUTS = P.get('cuts', [3, 8, 15, 22, 27])
SR = 44100
BEAT = 60 / BPM
N = int(SR * DUR)
mix = np.zeros(N)
rng = np.random.default_rng(11)
REVEAL = CUTS[0]


def add(sig, t, g=1.0):
    i = int(t * SR)
    if i >= N or i < 0:
        return
    sig = sig[: N - i]
    mix[i:i + len(sig)] += sig * g


def env(n, a, d):
    t = np.arange(n) / SR
    return np.minimum(t / a, 1) * np.exp(-t / d)


def lp(x, k):
    return np.convolve(x, np.ones(k) / k, 'same')


def kick():
    n = int(.4 * SR); t = np.arange(n) / SR
    f = 48 + 130 * np.exp(-t * 30)
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * env(n, .002, .14)


def clap():
    n = int(.22 * SR)
    x = rng.standard_normal(n) * env(n, .001, .05)
    return lp(x, 5) - lp(x, 40)


def hat(d=.014):
    n = int(.06 * SR)
    x = rng.standard_normal(n)
    return (x - lp(x, 8)) * env(n, .0005, d)


def saw(f, length, a=.01, d=.3):
    n = int(length * SR); t = np.arange(n) / SR
    return (2 * ((f * t) % 1) - 1) * env(n, a, d)


def sine(f, length, a=.002, d=.08):
    n = int(length * SR); t = np.arange(n) / SR
    return np.sin(2 * np.pi * f * t) * env(n, a, d)


def riser(length):
    n = int(length * SR); t = np.arange(n) / SR
    x = rng.standard_normal(n)
    out = np.zeros(n); blocks = 16; b = n // blocks
    for j in range(blocks):
        k = int(np.interp(j, [0, blocks - 1], [80, 2]))
        out[j * b:(j + 1) * b] = lp(x, k)[j * b:(j + 1) * b]
    return out * (t / length) ** 2


def impact():
    n = int(1.2 * SR)
    return kick()[:n] * 1.2 + np.pad(lp(rng.standard_normal(n), 6) * env(n, .001, .35), (0, 0))[:len(kick())] * 0 + 0


roots = [55.0, 43.65, 65.41, 49.0]          # Am F C G
chords = [[220, 261.6, 329.6], [174.6, 220, 261.6], [261.6, 329.6, 392], [196, 246.9, 293.7]]

for b in range(int(DUR / BEAT)):
    t = b * BEAT
    bar = b // 4
    pre = t < REVEAL
    if pre:
        # gancho: tensão, só chimbal e pad filtrado
        add(hat(), t + BEAT / 2, .12)
        if b % 4 == 0:
            add(sum(lp(saw(f, BEAT * 4, .3, 2.0), 50) for f in chords[0]), t, .05)
        continue
    add(kick(), t, .95)
    if b % 2 == 1:
        add(clap(), t, .38)
    add(hat(), t + BEAT / 2, .2)
    add(hat(.008), t + BEAT / 4, .07); add(hat(.008), t + 3 * BEAT / 4, .07)
    r = roots[bar % 4]
    for k in range(2):
        add(lp(saw(r * 2, BEAT / 2 * .9, .004, .11), 10), t + k * BEAT / 2, .34)
    if b % 4 == 0:
        add(sum(lp(saw(f, BEAT * 4, .2, 1.6), 30) for f in chords[bar % 4]), t, .06)
    if t >= CUTS[1]:
        for k in range(4):
            add(sine(chords[bar % 4][(b + k) % 3] * 2, .12), t + k * BEAT / 4, .08)

# subida até a revelação + impacto
add(riser(REVEAL - 0.4), 0.4, .5)
for c in CUTS:
    n = int(.6 * SR)
    add(lp(rng.standard_normal(n), 3) * env(n, .001, .12), c, .22)
add(kick(), REVEAL, .6)
add(sum(saw(f, 1.6, .002, .5) for f in [110, 164.8, 220]), REVEAL, .05)

mix[-int(1.2 * SR):] *= np.linspace(1, 0, int(1.2 * SR))
mix /= np.max(np.abs(mix)) * 1.12
st = (np.stack([mix, mix], 1) * 32767).astype('<i2')
with wave.open(out, 'wb') as w:
    w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR)
    w.writeframes(st.tobytes())
