"""
Resize JPM icon and splash screen to all required Android densities
and copy them into the correct res/ folders.
Run from: web/android/
"""

import sys, shutil
from pathlib import Path
from PIL import Image

BASE = Path(__file__).parent
RES  = BASE / "app" / "src" / "main" / "res"

ICON_SRC   = Path(r"C:\Users\Joshan\.gemini\antigravity\brain\f3061532-f698-4a28-a008-25856d571be9\jpm_icon_1773016920540.png")
SPLASH_SRC = Path(r"C:\Users\Joshan\.gemini\antigravity\brain\f3061532-f698-4a28-a008-25856d571be9\jpm_splash_1773016934605.png")

# Icon sizes per density: (folder, size_px)
ICON_DENSITIES = [
    ("mipmap-mdpi",    48),
    ("mipmap-hdpi",    72),
    ("mipmap-xhdpi",   96),
    ("mipmap-xxhdpi",  144),
    ("mipmap-xxxhdpi", 192),
]

# Splash sizes per density: (folder, width, height)
SPLASH_DENSITIES = [
    ("drawable",              1080, 1920),
    ("drawable-port-mdpi",    320,  480),
    ("drawable-port-hdpi",    480,  800),
    ("drawable-port-xhdpi",   720,  1280),
    ("drawable-port-xxhdpi",  1080, 1920),
    ("drawable-port-xxxhdpi", 1440, 2560),
    ("drawable-land-mdpi",    480,  320),
    ("drawable-land-hdpi",    800,  480),
    ("drawable-land-xhdpi",   1280, 720),
    ("drawable-land-xxhdpi",  1920, 1080),
    ("drawable-land-xxxhdpi", 2560, 1440),
]

def resize_icon(src: Path, dst: Path, size: int):
    img = Image.open(src).convert("RGBA")
    img = img.resize((size, size), Image.LANCZOS)
    dst.parent.mkdir(parents=True, exist_ok=True)
    img.save(dst, "PNG")
    print(f"  icon → {dst.relative_to(BASE)} ({size}x{size})")

def resize_splash(src: Path, dst: Path, w: int, h: int):
    img = Image.open(src).convert("RGBA")
    # Fit into target dimensions keeping aspect ratio, pad with white
    img.thumbnail((w, h), Image.LANCZOS)
    canvas = Image.new("RGBA", (w, h), (255, 255, 255, 255))
    canvas.paste(img, ((w - img.width)//2, (h - img.height)//2))
    dst.parent.mkdir(parents=True, exist_ok=True)
    canvas.save(dst, "PNG")
    print(f"  splash → {dst.relative_to(BASE)} ({w}x{h})")

print("=== Resizing icons ===")
for folder, size in ICON_DENSITIES:
    for name in ("ic_launcher.png", "ic_launcher_round.png", "ic_launcher_foreground.png"):
        resize_icon(ICON_SRC, RES / folder / name, size)

print("\n=== Resizing splash screens ===")
for folder, w, h in SPLASH_DENSITIES:
    resize_splash(SPLASH_SRC, RES / folder / "splash.png", w, h)

print("\n✅  Done! All assets replaced.")
