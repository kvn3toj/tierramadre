#!/usr/bin/env python3
"""
Re-brand the Origen certificate artwork with the 2026 lockup.

The logo is baked into the Origen artwork under public/assets/certificados/. This script:
  1. masks the old green logo (symbol + wordmark + tagline) and inpaints each
     row from its nearest unmasked neighbours, so the cream paper texture
     around it is preserved instead of being flattened to a swatch;
  2. rasterizes docs/brand/renovacion-2026/tierra-madre-lockup-vertical.svg
     (the vector master) in the certificate's dark green and composites it at
     the same width and centre the old block occupied.

Idempotent on the already-rebranded artwork only if the old block is still
present; run it against the ORIGINAL (git) artwork:
    git show 03a31e9:public/assets/certificados/bg_origen.jpg > /tmp/bg_orig.jpg
    python3 scripts/certificados/rebrand-bg-origen.py /tmp/bg_orig.jpg

Requires: Pillow, numpy, ImageMagick (`magick`) for the SVG rasterization.
"""
from __future__ import annotations

import subprocess
import sys
import tempfile
from pathlib import Path

import numpy as np
from PIL import Image, ImageFilter

ROOT = Path(__file__).resolve().parents[2]
# Versioned filename: /assets is served immutable for a year, so an overwrite
# under the old name would stay invisible to browsers that cached it. A new
# artwork generation gets a NEW name (and certTemplates.ts follows).
BG_OUT = ROOT / "public/assets/certificados/bg_origen-2026.jpg"
LOCKUP_SVG = ROOT / "docs/brand/renovacion-2026/tierra-madre-lockup-vertical.svg"

# Certificate green, sampled from the old logo pixels (dominant (0,89,54)).
CERT_GREEN = "#005936"

# Old logo block, measured on the 2160×3840 artwork (green-pixel bbox + margin).
OLD_BOX = (900, 250, 1700, 690)  # x0, y0, x1, y1
OLD_CONTENT = (933, 283, 1669, 655)  # tight bbox of the old symbol+wordmark+tagline


def is_logo_ink(rgb: np.ndarray) -> np.ndarray:
    """Green-ish, non-cream pixels inside the search box."""
    r, g, b = rgb[..., 0].astype(int), rgb[..., 1].astype(int), rgb[..., 2].astype(int)
    return (g > r + 18) & (g > b + 10) & (r < 200)


def inpaint_rows(img: np.ndarray, mask: np.ndarray, box: tuple[int, int, int, int]) -> None:
    """For every masked pixel, linearly interpolate between the nearest unmasked
    pixels to its left and right on the same row (in place)."""
    x0, y0, x1, y1 = box
    for y in range(y0, y1):
        row_mask = mask[y, x0:x1]
        if not row_mask.any():
            continue
        xs = np.arange(x0, x1)
        good = xs[~row_mask]
        bad = xs[row_mask]
        for c in range(3):
            img[y, bad, c] = np.interp(bad, good, img[y, good, c])


def rasterize_lockup(width_px: int, color: str) -> Image.Image:
    svg = LOCKUP_SVG.read_text().replace("currentColor", color)
    with tempfile.TemporaryDirectory() as td:
        svg_path = Path(td) / "lockup.svg"
        png_path = Path(td) / "lockup.png"
        svg_path.write_text(svg)
        # Render oversized then downsample for clean anti-aliased edges.
        subprocess.run(
            ["magick", "-background", "none", "-density", "600", str(svg_path), str(png_path)],
            check=True,
        )
        big = Image.open(png_path).convert("RGBA")
    scale = width_px / big.width
    return big.resize((width_px, round(big.height * scale)), Image.LANCZOS)


def main(src: Path) -> None:
    im = Image.open(src).convert("RGB")
    arr = np.array(im)

    x0, y0, x1, y1 = OLD_BOX
    mask = np.zeros(arr.shape[:2], dtype=bool)
    mask[y0:y1, x0:x1] = is_logo_ink(arr[y0:y1, x0:x1])
    # Dilate so the anti-aliased halo around the glyphs goes too.
    mask_img = Image.fromarray((mask * 255).astype(np.uint8)).filter(ImageFilter.MaxFilter(7))
    mask = np.array(mask_img) > 0
    print(f"masking {int(mask.sum())} px of old logo")
    inpaint_rows(arr, mask, OLD_BOX)

    # Soften the seam only inside the mask so interpolation banding never reads
    # as vertical streaks.
    filled = Image.fromarray(arr)
    blurred = filled.filter(ImageFilter.GaussianBlur(2))
    arr = np.where(mask[..., None], np.array(blurred), np.array(filled))

    cx0, cy0, cx1, cy1 = OLD_CONTENT
    width = cx1 - cx0
    lockup = rasterize_lockup(width, CERT_GREEN)
    left = cx0
    top = round((cy0 + cy1) / 2 - lockup.height / 2)
    out = Image.fromarray(arr)
    out.paste(lockup, (left, top), lockup)
    print(f"lockup {lockup.width}×{lockup.height} at ({left},{top})")

    out.save(BG_OUT, quality=92, subsampling=0, optimize=True)
    print(f"wrote {BG_OUT.relative_to(ROOT)} ({BG_OUT.stat().st_size // 1024} KiB)")


if __name__ == "__main__":
    main(Path(sys.argv[1]) if len(sys.argv) > 1 else BG_OUT)
