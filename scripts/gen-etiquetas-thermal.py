#!/usr/bin/env python3
"""
Etiquetas para papel térmico NIIMBOT T12x40 (40mm x 12mm), UNA por ítem.

Lienzo: 40mm x 12mm @ 8 px/mm (203 dpi NIIMBOT) = 320 x 96 px.
Layout horizontal (cabe en 12mm de alto y deja el QR grande/escaneable):
   [ QR ]  462 · 0.47
           Topos Redondos 2mm
           plata (par)

Salida:
  etiquetas-thermal/inventario/<id>.png   + etiquetas-inventario.pdf
  etiquetas-thermal/nuevos/<id>.png        + etiquetas-nuevos.pdf   (solo número)
  + un .zip por carpeta y un _preview.png ampliado
"""
import io
import json
import zipfile
from pathlib import Path

import segno
from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parent.parent
DATA = ROOT / "prod_inventory.json"
OUTDIR = ROOT / "etiquetas-thermal"
BASE = "https://tierramadre.app/product/"

NEW_START, NEW_COUNT = 473, 100

DPMM = 8
W, H = 40 * DPMM, 12 * DPMM        # 320 x 96
DPI = DPMM * 25.4                   # ≈203

FONTS = "/System/Library/Fonts/Supplemental/"


def _f(paths, size):
    for p in paths:
        try:
            return ImageFont.truetype(p, size)
        except OSError:
            continue
    return ImageFont.load_default()


F_ID = _f(["/System/Library/Fonts/Menlo.ttc", FONTS + "Courier New Bold.ttf"], 26)
F_MED = _f([FONTS + "Arial.ttf"], 20)
F_NAME = _f([FONTS + "Arial.ttf"], 17)
F_BIG = _f(["/System/Library/Fonts/Menlo.ttc", FONTS + "Courier New Bold.ttf"], 46)


def qr_img(item_id: str, px: int) -> Image.Image:
    qr = segno.make(BASE + item_id, error="m")
    mods = qr.symbol_size(border=0)[0]  # 29
    quiet = 2
    scale = max(1, px // (mods + 2 * quiet))
    buf = io.BytesIO()
    qr.save(buf, kind="png", scale=scale, border=quiet)
    buf.seek(0)
    return Image.open(buf).convert("L").point(lambda v: 0 if v < 128 else 255).convert("RGB")


def wrap(d, text, font, max_w, max_lines=2):
    words, lines, cur = text.split(), [], ""
    for w in words:
        t = (cur + " " + w).strip()
        if d.textlength(t, font=font) <= max_w or not cur:
            cur = t
        else:
            lines.append(cur); cur = w
            if len(lines) == max_lines:
                break
    if cur and len(lines) < max_lines:
        lines.append(cur)
    # Compare CONTENT, not length: text.split() collapses double spaces and
    # newlines, so a name carrying either (many do, inherited from the legacy
    # sheet) came out shorter than the original and got an "…" appended
    # without a single word having been dropped.
    if " ".join(lines) != " ".join(text.split()):
        while lines and d.textlength(lines[-1] + "…", font=font) > max_w:
            lines[-1] = lines[-1][:-1]
        lines[-1] = lines[-1].rstrip() + "…"
    return lines[:max_lines]


def make(item_id: str, nombre: str | None, medida: str | None) -> Image.Image:
    img = Image.new("RGB", (W, H), "white")
    d = ImageDraw.Draw(img)

    qpx = H - 4
    qr = qr_img(item_id, qpx)
    qw, qh = qr.size
    img.paste(qr, (2, (H - qh) // 2))

    tx = qw + 8
    tw = W - tx - 4

    if not nombre and not medida:
        # Solo número: grande y centrado en el área de texto.
        nw = d.textlength(item_id, font=F_BIG)
        d.text((tx + (tw - nw) / 2, (H - 46) / 2 - 2), item_id, font=F_BIG, fill="#000000")
        return img

    # Línea 1: "ID · medida"
    y = 6
    if medida:
        idw = d.textlength(item_id, font=F_ID)
        d.text((tx, y), item_id, font=F_ID, fill="#000000")
        sep = "  ·  "
        sw = d.textlength(sep, font=F_MED)
        d.text((tx + idw, y + 3), sep, font=F_MED, fill="#777777")
        d.text((tx + idw + sw, y + 3), medida, font=F_MED, fill="#000000")
    else:
        d.text((tx, y), item_id, font=F_ID, fill="#000000")
    y += 28

    # Nombre (hasta 2 líneas)
    if nombre:
        for ln in wrap(d, nombre, F_NAME, tw, max_lines=2):
            d.text((tx, y), ln, font=F_NAME, fill="#000000")
            y += 18
    return img


def medida_for(row: dict):
    peso = (row.get("peso") or "").strip()
    if peso:
        try:
            if float(peso) != 0:
                return peso
        except ValueError:
            return peso
    return None


def save_pdf(pngs, out: Path):
    pages = [Image.open(p).convert("RGB") for p in pngs]
    if not pages:
        return
    pages[0].save(out, "PDF", resolution=DPI, save_all=True, append_images=pages[1:])


def zip_folder(folder: Path, zip_path: Path):
    with zipfile.ZipFile(zip_path, "w", zipfile.ZIP_DEFLATED) as z:
        for p in sorted(folder.glob("*.png")):
            z.write(p, p.name)


def main():
    inv_dir = OUTDIR / "inventario"
    new_dir = OUTDIR / "nuevos"
    inv_dir.mkdir(parents=True, exist_ok=True)
    new_dir.mkdir(parents=True, exist_ok=True)

    rows = json.loads(DATA.read_text())

    def sk(r):
        try:
            return (0, int(r["itemId"]))
        except (ValueError, TypeError):
            return (1, r["itemId"])

    rows.sort(key=sk)

    inv_pngs = []
    for r in rows:
        iid = r["itemId"]
        nombre = (r.get("nombre") or "").strip() or None
        p = inv_dir / f"{iid}.png"
        make(iid, nombre, medida_for(r)).save(p)
        inv_pngs.append(p)
    print(f"inventario: {len(inv_pngs)} etiquetas → {inv_dir}")

    new_pngs = []
    for n in range(NEW_START, NEW_START + NEW_COUNT):
        iid = str(n)
        p = new_dir / f"{iid}.png"
        make(iid, None, None).save(p)
        new_pngs.append(p)
    print(f"nuevos: {len(new_pngs)} etiquetas → {new_dir}")

    save_pdf(inv_pngs, OUTDIR / "etiquetas-inventario.pdf")
    save_pdf(new_pngs, OUTDIR / "etiquetas-nuevos.pdf")
    zip_folder(inv_dir, OUTDIR / "etiquetas-inventario.zip")
    zip_folder(new_dir, OUTDIR / "etiquetas-nuevos.zip")
    print("PDFs + ZIPs listos.")

    # Preview ampliado (6x) de algunas etiquetas
    sample_ids = ["462", "467", "451", "1", "473"]
    by_id = {r["itemId"]: r for r in rows}
    imgs = []
    for iid in sample_ids:
        if iid in by_id:
            r = by_id[iid]
            im = make(iid, (r.get("nombre") or "").strip() or None, medida_for(r))
        else:
            im = make(iid, None, None)
        imgs.append(im.resize((W * 6, H * 6), Image.NEAREST))
    gap = 24
    sheet = Image.new("RGB", (W * 6 + 40, sum(i.height for i in imgs) + gap * (len(imgs) + 1)), "#cccccc")
    yy = gap
    for im in imgs:
        sheet.paste(im, (20, yy)); yy += im.height + gap
    sheet.save(OUTDIR / "_preview.png")
    print("preview →", OUTDIR / "_preview.png")


if __name__ == "__main__":
    main()
