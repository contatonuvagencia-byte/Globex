# Áudio da vinheta (sintetizado): subida, impacto, brilho e saída.
# 48 kHz estéreo, pico em -6 dBFS (manual: -12 a -6 dB).
# Uso: python3 vinheta_audio.py saida.wav [duracao]
import sys, wave
import numpy as np

SR = 48000
DUR = float(sys.argv[2]) if len(sys.argv) > 2 else 7.0
N = int(SR * DUR)
L = np.zeros(N); R = np.zeros(N)
rng = np.random.default_rng(3)


def add(sig, t, g=1.0, pan=0.0):
    i = int(t * SR)
    if i >= N:
        return
    sig = sig[:N - i]
    L[i:i + len(sig)] += sig * g * (1 - max(0, pan))
    R[i:i + len(sig)] += sig * g * (1 + min(0, pan))


def env(n, a, d):
    t = np.arange(n) / SR
    return np.minimum(t / a, 1) * np.exp(-t / d)


def lp(x, k):
    return np.convolve(x, np.ones(k) / k, 'same')


def sweep(length, up=True):
    n = int(length * SR); t = np.arange(n) / SR
    x = rng.standard_normal(n); out = np.zeros(n); B = 24; b = n // B
    for j in range(B):
        k = int(np.interp(j, [0, B - 1], [90, 2] if up else [2, 90]))
        out[j * b:(j + 1) * b] = lp(x, k)[j * b:(j + 1) * b]
    e = (t / length) ** 2 if up else np.sin(np.linspace(0, np.pi, n)) ** 2
    return out * e


def boom():
    n = int(1.8 * SR); t = np.arange(n) / SR
    f = 38 + 90 * np.exp(-t * 9)
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * env(n, .003, .55)


def pad(freqs, length, a=.02, d=1.8):
    n = int(length * SR); t = np.arange(n) / SR
    s = sum(np.sin(2 * np.pi * f * t) + .3 * np.sin(2 * np.pi * f * 2.003 * t) for f in freqs)
    return s * env(n, a, d)


def bell(f, length=1.2):
    n = int(length * SR); t = np.arange(n) / SR
    return (np.sin(2 * np.pi * f * t) + .4 * np.sin(2 * np.pi * f * 2.76 * t)) * env(n, .002, .35)


add(sweep(0.9, True), 0.0, .55)                                  # subida até o impacto
add(boom(), 0.88, 1.0)
add(lp(rng.standard_normal(int(.5 * SR)), 3) * env(int(.5 * SR), .001, .09), 0.88, .35)
add(pad([220, 277.2, 329.6, 440], 4.5), 0.9, .09)               # acorde de Lá maior
for k, (f, tt) in enumerate([(880, 1.35), (1108.7, 1.5), (1318.5, 1.65), (1760, 1.8)]):
    add(bell(f), tt, .12, pan=(-.4 if k % 2 else .4))            # brilho junto com o nome
add(sweep(0.7, False), 1.3, .25)
for k, tt in enumerate([2.5, 2.62, 2.74, 2.86]):                # tique a cada palavra
    add(bell(1318.5 + k * 110, .4), tt, .05)
add(pad([329.6, 415.3, 493.9, 659.3], 3.0, .3, 2.2), 3.2, .05)
add(sweep(0.9, False), 5.45, .4)                                 # faixas voltando
add(boom()[:int(1.2 * SR)], 5.9, .45)

mix = np.stack([L, R], 1)
f = int(.6 * SR); mix[-f:] *= np.linspace(1, 0, f)[:, None]
mix *= 10 ** (-6 / 20) / np.max(np.abs(mix))                     # pico em -6 dBFS
with wave.open(sys.argv[1], 'wb') as w:
    w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR)
    w.writeframes((mix * 32767).astype('<i2').tobytes())
