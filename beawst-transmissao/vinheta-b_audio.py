# Áudio da vinheta B "Conexões" (sintetizado): dedilhado a cada rota, brilho na convergência,
# acorde no logo e saída. 48 kHz estéreo, pico em -6 dBFS.
# Uso: python3 vinheta-b_audio.py saida.wav [duracao]
import sys, wave
import numpy as np

SR = 48000
DUR = float(sys.argv[2]) if len(sys.argv) > 2 else 6.0
N = int(SR * DUR)
L = np.zeros(N); R = np.zeros(N)
rng = np.random.default_rng(9)


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


def pluck(f, length=1.0):
    # Karplus-Strong simples
    n = int(length * SR); p = int(SR / f)
    buf = rng.uniform(-1, 1, p); out = np.zeros(n)
    for i in range(n):
        out[i] = buf[i % p]
        buf[i % p] = 0.996 * 0.5 * (buf[i % p] + buf[(i + 1) % p])
    return out


def bell(f, length=1.5):
    n = int(length * SR); t = np.arange(n) / SR
    return (np.sin(2 * np.pi * f * t) + .35 * np.sin(2 * np.pi * f * 2.76 * t)) * env(n, .002, .5)


def pad(freqs, length, a=.4, d=2.0):
    n = int(length * SR); t = np.arange(n) / SR
    return sum(np.sin(2 * np.pi * f * t) + .25 * np.sin(2 * np.pi * f * 2.002 * t) for f in freqs) * env(n, a, d)


def swoosh(length, up=True):
    n = int(length * SR); x = rng.standard_normal(n); out = np.zeros(n); B = 20; b = n // B
    for j in range(B):
        k = int(np.interp(j, [0, B - 1], [70, 3] if up else [3, 70]))
        out[j * b:(j + 1) * b] = np.convolve(x, np.ones(k) / k, 'same')[j * b:(j + 1) * b]
    return out * np.sin(np.linspace(0, np.pi, n)) ** 2


def kick():
    n = int(.6 * SR); t = np.arange(n) / SR
    return np.sin(2 * np.pi * np.cumsum(50 + 100 * np.exp(-t * 25)) / SR) * env(n, .002, .2)


notas = [587.3, 659.3, 739.9, 880.0, 987.8, 1174.7]          # Ré maior pentatônica
for k, f in enumerate(notas):
    add(pluck(f, 1.2), 0.25 + k * 0.16, .35, pan=(-.5 + k * .2))  # uma nota por rota
add(pad([293.7, 369.9, 440], 2.2, .5, 1.5), 0.2, .05)
add(swoosh(0.6, True), 1.9, .3)                                  # convergência
add(kick(), 2.45, .7)
add(pad([293.7, 369.9, 440, 587.3], 3.2, .02, 1.8), 2.45, .09)   # acorde no logo
for k, f in enumerate([1174.7, 1480, 1760]):
    add(bell(f), 2.5 + k * .09, .1, pan=(-.3 + k * .3))
for k in range(5):
    add(pluck(notas[k], .6), 3.05 + k * 0.1, .12)                 # palavras da frase
add(swoosh(0.8, True), 4.6, .35)                                 # círculo roxo
add(kick(), 5.45, .45)

mix = np.stack([L, R], 1)
f = int(.5 * SR); mix[-f:] *= np.linspace(1, 0, f)[:, None]
mix *= 10 ** (-6 / 20) / np.max(np.abs(mix))
with wave.open(sys.argv[1], 'wb') as w:
    w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR)
    w.writeframes((mix * 32767).astype('<i2').tobytes())
