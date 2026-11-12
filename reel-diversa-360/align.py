#!/usr/bin/env python3
"""Word timings for a new take of the narration when no speech recognizer is available.

The script text is known. Pauses in the audio (silencedetect) are matched to punctuation
in the script, and inside each spoken stretch the words share the time in proportion to
their length in the previous take of the same voice (words-narracao-v2.json), or to
their letter count when the word is new.

usage: python3 align.py <narracao.mp3> <roteiro.txt> <old_words.json> [breaks.txt] > words.json

breaks.txt (optional, checked by ear/energy): one word per pause, in order, the last word
spoken before that pause. Without it the pauses are matched to the text automatically.
"""
import difflib, json, re, subprocess, sys

audio, script, old_path = sys.argv[1:4]
text = re.sub(r'\[[^\]]*\]', ' ', open(script, encoding='utf-8').read())
words = text.split()
old = json.load(open(old_path))

norm = lambda w: re.sub(r'[^\wà-ú]', '', w.lower())
# weight of each word: old duration when the word lines up with the previous take
sm = difflib.SequenceMatcher(a=[norm(w['w']) for w in old], b=[norm(w) for w in words], autojunk=False)
weight = [None] * len(words)
for a, b, n in sm.get_matching_blocks():
    for k in range(n):
        weight[b + k] = max(0.12, old[a + k]['e'] - old[a + k]['s'])
per_char = sum(o['e'] - o['s'] for o in old) / sum(len(norm(o['w'])) for o in old)
weight = [w if w is not None else max(0.15, len(norm(words[i])) * per_char) for i, w in enumerate(weight)]

out = subprocess.run(['ffmpeg', '-i', audio, '-af', 'silencedetect=n=-38dB:d=0.16', '-f', 'null', '-'],
                     capture_output=True, text=True).stderr
v = [float(x) for x in re.findall(r'silence_(?:start|end): ([0-9.]+)', out)]
dur = float(re.search(r'Duration: (\d+):(\d+):([\d.]+)', out).group(3)) + 60 * int(re.search(r'Duration: (\d+):(\d+)', out).group(2))
sil = [(a, b) for a, b in zip(v[0::2], v[1::2]) if b < dur - 0.05]
# a breath shorter than 0.25 s between two pauses is not a phrase: merge the pauses
merged = []
for a, b in sil:
    if merged and a - merged[-1][1] < 0.25:
        merged[-1] = (merged[-1][0], b)
    else:
        merged.append((a, b))
sil = merged
speech_start = 0.0
speech_end = v[-2] if len(v) % 2 == 0 and v[-1] >= dur - 0.05 else dur

# candidate breaks: after any word; punctuation is preferred (index = last word of a phrase)
cands = list(range(len(words) - 1))
punct = lambda i: bool(re.search(r'[,.!?:;…]$', words[i]))
tot_w = sum(weight)
cum_w = [sum(weight[:i + 1]) / tot_w for i in range(len(words))]
spoken = speech_end - speech_start - sum(b - a for a, b in sil)
# DP: assign each pause to one candidate, in order, minimizing the squared mismatch of
# the spoken-time fraction at that pause
frac, acc, prev = [], 0.0, speech_start
for a, b in sil:
    acc += a - prev
    frac.append(acc / spoken)
    prev = b
INF = float('inf')
n, m = len(sil), len(cands)
D = [[INF] * (m + 1) for _ in range(n + 1)]
P = [[None] * (m + 1) for _ in range(n + 1)]
for j in range(m + 1):
    D[0][j] = 0.0
for i in range(1, n + 1):
    for j in range(1, m + 1):
        skip = D[i][j - 1]
        c = cands[j - 1]
        take = D[i - 1][j - 1] + (frac[i - 1] - cum_w[c]) ** 2 + (0 if punct(c) else 0.0006)
        if take <= skip:
            D[i][j], P[i][j] = take, 'take'
        else:
            D[i][j], P[i][j] = skip, 'skip'
assign, i, j = [], n, m
while i > 0:
    if P[i][j] == 'take':
        assign.append(cands[j - 1]); i -= 1
    j -= 1
assign.reverse()
if len(sys.argv) > 4:
    forced = [l.strip() for l in open(sys.argv[4], encoding='utf-8') if l.strip()]
    assert len(forced) == len(sil), (len(forced), len(sil))
    assign, i = [], 0
    for f in forced:
        while norm(words[i]) != norm(f):
            i += 1
        assign.append(i)
        i += 1

res, start_w, t0 = [], 0, speech_start
for k, last in enumerate(assign + [len(words) - 1]):
    t1 = sil[k][0] if k < len(sil) else speech_end
    seg = range(start_w, last + 1)
    W = sum(weight[i] for i in seg)
    t = t0
    for i in seg:
        d = (t1 - t0) * weight[i] / W
        res.append(dict(w=' ' + words[i], s=round(t, 2), e=round(t + d, 2)))
        t += d
    start_w = last + 1
    t0 = sil[k][1] if k < len(sil) else t1
json.dump(res, sys.stdout, ensure_ascii=False)
for k, last in enumerate(assign):
    print(f'pause {sil[k][0]:6.2f}  after "{words[last]}"  (fit {frac[k]:.3f} vs {cum_w[last]:.3f})', file=sys.stderr)
