"""JPEG para Instagram (JFIF, 4:2:0, sRGB, 1080x1350) por carrossel + prévia de cada carrossel."""
from PIL import Image, ImageCms
import glob, os, re
from collections import defaultdict
SRGB = ImageCms.ImageCmsProfile(ImageCms.createProfile('sRGB')).tobytes()
grupos = defaultdict(list)
for p in sorted(glob.glob('out/png/*.png')):
    grupos[re.sub(r'_\d+\.png$', '', os.path.basename(p))].append(p)
for tema, fs in grupos.items():
    os.makedirs(f'out/{tema}', exist_ok=True)
    prev = Image.new('RGB', (len(fs) * 368 - 8, 450), 'white')
    for i, p in enumerate(fs):
        im = Image.open(p).convert('RGB').resize((1080, 1350), Image.LANCZOS)
        im.save(f"out/{tema}/{os.path.basename(p)[:-4]}.jpg", 'JPEG', quality=93, subsampling='4:2:0', optimize=True, icc_profile=SRGB)
        prev.paste(im.resize((360, 450), Image.LANCZOS), (i * 368, 0))
    prev.save(f'out/previa_{tema}.jpg', 'JPEG', quality=90, subsampling='4:2:0', icc_profile=SRGB)
    print(tema, len(fs))
