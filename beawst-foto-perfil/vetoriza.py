# Vetoriza o logo da coruja BEAWST (PNG pequeno) e gera a foto de perfil 1080x1080.
# Uso: python3 vetoriza.py   (requer: pip install potracer)
import sys, numpy as np, potrace
from PIL import Image
SRC = '../beawst-video-roi-meta/assets/beawst-logo.png'
im = Image.open(SRC).convert('RGBA')
im = im.crop(im.getbbox())
S = 4
big = im.resize((im.width * S, im.height * S), Image.LANCZOS)
a = np.array(big)[:, :, 3] > 110
bm = potrace.Bitmap(~a)
plist = bm.trace(turdsize=8, alphamax=1.0, opticurve=True, opttolerance=0.2)
def path_d(curve):
    s = curve.start_point; d = [f'M{s.x:.2f},{s.y:.2f}']
    for seg in curve.segments:
        if seg.is_corner: d.append(f'L{seg.c.x:.2f},{seg.c.y:.2f}L{seg.end_point.x:.2f},{seg.end_point.y:.2f}')
        else: d.append(f'C{seg.c1.x:.2f},{seg.c1.y:.2f} {seg.c2.x:.2f},{seg.c2.y:.2f} {seg.end_point.x:.2f},{seg.end_point.y:.2f}')
    return ''.join(d) + 'Z'
d = ''.join(path_d(c) for c in plist)
W, H = big.width, big.height
open('logo-beawst-laranja.svg', 'w').write(f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {W} {H}"><path fill="#C24A0B" fill-rule="evenodd" d="{d}"/></svg>')
print('svg', W, H)
