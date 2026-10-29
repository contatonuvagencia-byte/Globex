"""Gera os JPEGs finais para o Instagram (JFIF, 4:2:0, sRGB, 1080x1350) a partir dos PNGs renderizados.
Uso: python3 exportar_instagram.py  -> entregas/instagram/<carrossel>/slide-N.jpg"""
from PIL import Image, ImageCms
import glob, os

SRGB = ImageCms.ImageCmsProfile(ImageCms.createProfile('sRGB')).tobytes()
PROJETOS = [('nuv-carrossel-olho-primeiro', 'O que eu olho primeiro'), ('nuv-carrossel-bastidores', 'Bastidores NUV')]

for proj, nome in PROJETOS:
    out = f'entregas/instagram/{nome}'
    os.makedirs(out, exist_ok=True)
    for p in sorted(glob.glob(f'{proj}/out/slide-*.png')):
        im = Image.open(p).convert('RGB').resize((1080, 1350), Image.LANCZOS)
        im.save(f"{out}/{os.path.basename(p).replace('.png', '.jpg')}", 'JPEG', quality=93,
                subsampling='4:2:0', optimize=True, icc_profile=SRGB, dpi=(72, 72))
