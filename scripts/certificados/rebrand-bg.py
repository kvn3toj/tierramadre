#!/usr/bin/env python3
"""
Re-brand a certificate artwork with the 2026 lockup.

The logo is baked into the JPEG backgrounds under public/assets/certificados/.
For a given preset this script:
  1. masks the old logo (symbol + wordmark + tagline) and inpaints each row
     from its nearest unmasked neighbours, so the paper texture around it is
     preserved instead of being flattened to a swatch;
  2. rasterizes docs/brand/renovacion-2026/tierra-madre-lockup-vertical.svg
     (the vector master) in the certificate's own ink colour and composites it
     at the same width and centre the old block occupied.

Run it against the ORIGINAL artwork from git (the presets measure that one):
    git show 03a31e9:public/assets/certificados/bg_origen.jpg > /tmp/bg.jpg
    python3 scripts/certificados/rebrand-bg.py origen /tmp/bg.jpg

    git show 03a31e9:public/assets/certificados/bg_embajador.jpg > /tmp/bg.jpg
    python3 scripts/certificados/rebrand-bg.py embajador /tmp/bg.jpg

Output filenames carry the brand generation on purpose: /assets is served
with a one-year immutable cache, so an overwrite under the old name would stay
invisible to browsers that cached it. A new artwork generation gets a NEW name
(and certTemplates.ts follows).

Requires: Pillow, numpy, ImageMagick (`magick`) for the SVG rasterization.
"""
from __future__ import annotations

import subprocess
import sys
import tempfile
from dataclasses import dataclass
from pathlib import Path
from typing import Callable

import numpy as np
from PIL import Image, ImageFilter

ROOT = Path(__file__).resolve().parents[2]
ASSETS = ROOT / "public/assets/certificados"
LOCKUP_SVG = ROOT / "docs/brand/renovacion-2026/tierra-madre-lockup-vertical.svg"

Box = tuple[int, int, int, int]  # x0, y0, x1, y1


@dataclass(frozen=True)
class Preset:
    out: str
    """ink colour of the new lockup (sampled from the old logo pixels)"""
    color: str
    """search box around the old logo, with margin"""
    box: Box
    """tight bbox of the old symbol+wordmark+tagline"""
    content: Box
    """which pixels inside `box` are the old logo's ink"""
    is_ink: Callable[[np.ndarray], np.ndarray]


def _green(rgb: np.ndarray) -> np.ndarray:
    r, g, b = (rgb[..., i].astype(int) for i in range(3))
    return (g > r + 18) & (g > b + 10) & (r < 200)


def _burgundy(rgb: np.ndarray) -> np.ndarray:
    r, g, b = (rgb[..., i].astype(int) for i in range(3))
    return (r > 90) & (r > g + 40) & (r > b + 30) & (g < 140)


PRESETS: dict[str, Preset] = {
    # 2160×3840 portrait. Old logo dominant pixel (0,89,54).
    "origen": Preset(
        out="bg_origen-2026.jpg",
        color="#005936",
        box=(900, 250, 1700, 690),
        content=(933, 283, 1669, 655),
        is_ink=_green,
    ),
    # 3168×2446 landscape. Old logo dominant pixel (155,41,31).
    "embajador": Preset(
        out="bg_embajador-2026.jpg",
        color="#9B291F",
        box=(1800, 300, 2430, 660),
        content=(1856, 352, 2375, 614),
        is_ink=_burgundy,
    ),
}


def inpaint_rows(img: np.ndarray, mask: np.ndarray, box: Box) -> None:
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


def main(preset: Preset, src: Path) -> None:
    im = Image.open(src).convert("RGB")
    arr = np.array(im)

    x0, y0, x1, y1 = preset.box
    mask = np.zeros(arr.shape[:2], dtype=bool)
    mask[y0:y1, x0:x1] = preset.is_ink(arr[y0:y1, x0:x1])
    # Dilate so the anti-aliased halo around the glyphs goes too.
    mask_img = Image.fromarray((mask * 255).astype(np.uint8)).filter(ImageFilter.MaxFilter(7))
    mask = np.array(mask_img) > 0
    print(f"masking {int(mask.sum())} px of old logo")
    inpaint_rows(arr, mask, preset.box)

    # Soften the seam only inside the mask so interpolation banding never reads
    # as vertical streaks.
    filled = Image.fromarray(arr)
    blurred = filled.filter(ImageFilter.GaussianBlur(2))
    arr = np.where(mask[..., None], np.array(blurred), np.array(filled))

    cx0, cy0, cx1, cy1 = preset.content
    width = cx1 - cx0
    lockup = rasterize_lockup(width, preset.color)
    left = cx0
    top = round((cy0 + cy1) / 2 - lockup.height / 2)
    out = Image.fromarray(arr)
    out.paste(lockup, (left, top), lockup)
    print(f"lockup {lockup.width}×{lockup.height} at ({left},{top})")

    dest = ASSETS / preset.out
    out.save(dest, quality=92, subsampling=0, optimize=True)
    print(f"wrote {dest.relative_to(ROOT)} ({dest.stat().st_size // 1024} KiB)")


if __name__ == "__main__":
    if len(sys.argv) != 3 or sys.argv[1] not in PRESETS:
        sys.exit(f"usage: rebrand-bg.py <{'|'.join(PRESETS)}> <original.jpg>")
    main(PRESETS[sys.argv[1]], Path(sys.argv[2]))
