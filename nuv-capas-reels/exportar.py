"""JPEG 1080x1920 (JFIF, 4:2:0, sRGB) + prévia da grade do perfil (recorte central 3:4) e da tela cheia."""
from PIL import Image, ImageCms
import glob, os
SRGB = ImageCms.ImageCmsProfile(ImageCms.createProfile('sRGB')).tobytes()
fs = sorted(glob.glob('out/png/*.png')); os.makedirs('out/instagram', exist_ok=True)
rows = (len(fs) + 2) // 3
grade = Image.new('RGB', (3 * 360 + 8, rows * 480 + (rows - 1) * 4), 'white')
cheia = Image.new('RGB', (len(fs) * 304 - 4, 533), 'white')
for i, p in enumerate(fs):
    im = Image.open(p).convert('RGB').resize((1080, 1920), Image.LANCZOS)
    im.save('out/instagram/' + os.path.basename(p)[:-4] + '.jpg', 'JPEG', quality=93, subsampling='4:2:0', optimize=True, icc_profile=SRGB)
    grade.paste(im.crop((0, 240, 1080, 1680)).resize((360, 480), Image.LANCZOS), ((i % 3) * 364, (i // 3) * 484))
    cheia.paste(im.resize((300, 533), Image.LANCZOS), (i * 304, 0))
grade.save('out/previa-grade.jpg', 'JPEG', quality=92, icc_profile=SRGB)
cheia.save('out/previa-tela-cheia.jpg', 'JPEG', quality=92, icc_profile=SRGB)
