#!/usr/bin/env python3
"""White transparent versions of the logos for the overlay (assets/logo-*.png).

Carla Vieira and Diversa Turismo come on a white background: alpha = distance from white.
Diversa 360 comes white on black: alpha = luminance.
"""
import os
from PIL import Image, ImageOps, ImageChops

HERE = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.join(HERE, 'assets', 'logos-src')


def to_white(img, on_black=False, gain=1.0):
    g = ImageOps.grayscale(img.convert('RGB'))
    if not on_black:
        # darkest channel tells how far a pixel is from white (keeps the blue/wine strokes solid)
        r, gg, b = img.convert('RGB').split()
        g = ImageOps.invert(ImageChops.darker(ImageChops.darker(r, gg), b))
    a = g.point(lambda v: 0 if v < 18 else min(255, int((v - 18) * 255 / (255 - 18) * gain)))
    out = Image.new('RGBA', img.size, (255, 255, 255, 0))
    out.putalpha(a)
    return out.crop(a.getbbox())


def diversa_turismo(img, gain=1.5):
    """Teal bubbles become translucent white so the navy 'd' still reads on top of them."""
    img = img.convert('RGB')
    w = to_white(img, False, gain)
    box = ImageOps.invert(ImageChops.darker(ImageChops.darker(*img.split()[:2]), img.split()[2])).point(
        lambda v: 0 if v < 18 else 1).getbbox()
    rgb = img.crop(w.getbbox() and box)
    a = w.getchannel('A')
    px_a, px = a.load(), rgb.load()
    for y in range(a.height):
        for x in range(a.width):
            r, g, b = px[x, y]
            # bubble teal has a high green channel and is fairly saturated; letters are darker blue
            if x < 140 and g >= 140 and b - r > 80:  # bubbles sit left of the "i"
                k = min(1.0, (g - 140) / 18)
                px_a[x, y] = int(px_a[x, y] * (1 - 0.55 * k))
    w.putalpha(a)
    return w


for name, src, black, gain in [('carlavieira', 'carlavieira.jpg', False, 2.4),
                               ('diversa-360', 'diversa-360.jpg', True, 1.15)]:
    im = Image.open(os.path.join(SRC, src))
    w = to_white(im, black, gain)
    w.save(os.path.join(HERE, 'assets', f'logo-{name}.png'))
    print(name, w.size)

w = diversa_turismo(Image.open(os.path.join(SRC, 'diversa-turismo.jpg')))
w.save(os.path.join(HERE, 'assets', 'logo-diversa-turismo.png'))
print('diversa-turismo', w.size)
