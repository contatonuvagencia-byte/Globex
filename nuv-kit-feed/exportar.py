"""JPEG para Instagram (JFIF, 4:2:0, sRGB, 1080x1350) + grade de prévia do feed."""
from PIL import Image, ImageCms
import glob, os
SRGB = ImageCms.ImageCmsProfile(ImageCms.createProfile('sRGB')).tobytes()
fs = sorted(glob.glob('out/*.png'))
os.makedirs('out/instagram', exist_ok=True)
rows = (len(fs) + 2) // 3
grid = Image.new('RGB', (3 * 360 + 2 * 8, rows * 450 + (rows - 1) * 8), 'white')
for i, p in enumerate(fs):
    im = Image.open(p).convert('RGB').resize((1080, 1350), Image.LANCZOS)
    im.save('out/instagram/' + os.path.basename(p)[:-4] + '.jpg', 'JPEG', quality=93, subsampling='4:2:0', optimize=True, icc_profile=SRGB)
    grid.paste(im.resize((360, 450), Image.LANCZOS), ((i % 3) * 368, (i // 3) * 458))
grid.save('out/previa-feed.jpg', 'JPEG', quality=92, subsampling='4:2:0', icc_profile=SRGB)
