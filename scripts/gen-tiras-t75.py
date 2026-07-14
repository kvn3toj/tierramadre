#!/usr/bin/env python3
"""
Tira de 4 (2 QR · marca · 2 QR, número debajo de cada QR) ADAPTADA al papel
NIIMBOT T12x75 (75mm x 12mm). Mismo diseño de la tira, optimizado a ese tamaño:
en 12mm de alto no cabe el nombre arriba, así que cada celda queda QR + número
(+ medida si existe), y la marca "Tierra Mädre" va al centro.

Lienzo: 75mm x 12mm @ 8 px/mm (203 dpi) = 600 x 96 px.
PDF: una tira por página, página EXACTA de 75x12mm.

Salida:
  etiquetas-t75/inventario/tira-XXX_<ids>.png  + etiquetas-inventario.pdf + .zip
  etiquetas-t75/nuevos/tira-XXX_<ids>.png       + etiquetas-nuevos.pdf    + .zip
  etiquetas-t75/_preview.png
"""
import io
import json
import zipfile
from pathlib import Path

import segno
from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parent.parent
DATA = ROOT / "prod_inventory.json"
OUTDIR = ROOT / "etiquetas-t75"
# URL corta EN MAYÚSCULAS: incluye `HTTPS://` para que TODO escáner la abra como
# URL (sin `https://` algunos la mandan a búsqueda de Google). Las mayúsculas
# activan el modo alfanumérico del QR → sigue siendo v2 (25×25), igual de chico.
# `/P/<id>` resuelve la ruta `/p/:itemId` (React Router no distingue mayúsculas)
# y la reconoce parseTmQr; el itemId se preserva tal cual (no hay ids en minúscula).
BASE = "HTTPS://TIERRAMADRE.APP/P/"

NEW_START, NEW_COUNT = 473, 100

DPMM = 8
W, H = 75 * DPMM, 12 * DPMM        # 600 x 96
DPI = DPMM * 25.4                   # ≈203

FONTS = "/System/Library/Fonts/Supplemental/"


def _f(paths, size):
    for p in paths:
        try:
            return ImageFont.truetype(p, size)
        except OSError:
            continue
    return ImageFont.load_default()


F_ID = _f(["/System/Library/Fonts/Menlo.ttc", FONTS + "Courier New Bold.ttf"], 11)
F_MED = _f([FONTS + "Arial.ttf"], 10)
F_BRAND = _f([FONTS + "Georgia.ttf", FONTS + "Arial.ttf"], 22)
F_BRAND_SM = _f([FONTS + "Arial.ttf"], 8)

# ── Métricas ───────────────────────────────────────────────────────────────────
# La etiqueta es tipo MANCUERNA: dos extremos planos + un puente angosto en el
# medio. Los QR van de a pares en cada extremo plano; la marca va en el puente.
QR_SCALE = 3               # px por módulo (0.375mm @203dpi, alineado a 3 puntos)
QR_QUIET = 1               # quiet zone built-in (1 módulo); el blanco de la
                           # etiqueta + el hueco del par completan la zona.
QR_PX = (25 + 2 * QR_QUIET) * QR_SCALE   # v2 (25 datos) → 81px ≈ 10.1mm
NUM_H = 14                 # banda del número, ARRIBA del QR
PAIR_GAP = 14              # hueco entre los 2 QR de un mismo extremo
BRAND_GAP = 40             # hueco entre cada par y la marca (el puente)
BRAND_TITLE = "Tierra Mädre"
_mdraw = ImageDraw.Draw(Image.new("RGB", (10, 10)))
BRAND_W = int(_mdraw.textlength(BRAND_TITLE, font=F_BRAND))


def _positions():
    """Pares agrupados: [QR QR] ·puente· marca ·puente· [QR QR], centrado."""
    pair_w = 2 * QR_PX + PAIR_GAP
    content = 2 * pair_w + 2 * BRAND_GAP + BRAND_W
    x = (W - content) / 2          # margen exterior simétrico
    qr1 = x; x += QR_PX + PAIR_GAP
    qr2 = x; x += QR_PX + BRAND_GAP
    brand = x; x += BRAND_W + BRAND_GAP
    qr3 = x; x += QR_PX + PAIR_GAP
    qr4 = x
    return [qr1, qr2, brand, qr3, qr4]


def qr_img(item_id: str) -> Image.Image:
    # `HTTPS://TIERRAMADRE.APP/P/<id>` en modo alfanumérico → QR v2 (25 módulos
    # de datos). Se renderiza a 3 px/módulo (0.375 mm = 3 puntos de impresora a
    # 203 dpi, alineado → módulos nítidos) con quiet zone de 1 módulo.
    # micro=False fuerza QR estándar.
    qr = segno.make(BASE + item_id, error="m", micro=False)
    buf = io.BytesIO()
    qr.save(buf, kind="png", scale=QR_SCALE, border=QR_QUIET)
    buf.seek(0)
    im = Image.open(buf).convert("L").point(lambda v: 0 if v < 128 else 255).convert("RGB")
    # Encuadre uniforme: centrar en una caja QR_PX×QR_PX (los ids raros más
    # largos que empujen a v3 se centran igual, sin reescalar los módulos).
    if im.size[0] != QR_PX:
        box = Image.new("RGB", (QR_PX, QR_PX), "white")
        box.paste(im, ((QR_PX - im.size[0]) // 2, (QR_PX - im.size[1]) // 2))
        im = box
    return im


def draw_cell(strip, d, x0, item):
    """item = None (vacía) o {itemId, medida}. Número ARRIBA, QR debajo."""
    if item is None:
        return
    cx = x0 + QR_PX / 2
    # Número (+ medida) en la banda superior.
    iid, med = item["itemId"], item["medida"]
    idw = d.textlength(iid, font=F_ID)
    if med:
        sep = " · "
        sw = d.textlength(sep, font=F_MED)
        mw = d.textlength(med, font=F_MED)
        x = cx - (idw + sw + mw) / 2
        d.text((x, 1), iid, font=F_ID, fill="#000000")
        d.text((x + idw, 2), sep, font=F_MED, fill="#888888")
        d.text((x + idw + sw, 2), med, font=F_MED, fill="#000000")
    else:
        d.text((cx - idw / 2, 1), iid, font=F_ID, fill="#000000")
    # QR debajo del número.
    strip.paste(qr_img(iid), (int(x0), NUM_H))


def draw_brand(d, x0, sub):
    cx = x0 + BRAND_W / 2
    title = "Tierra Mädre"
    tw = d.textlength(title, font=F_BRAND)
    d.text((cx - tw / 2, H / 2 - 20), title, font=F_BRAND, fill="#000000")
    sw = d.textlength(sub, font=F_BRAND_SM)
    d.text((cx - sw / 2, H / 2 + 8), sub, font=F_BRAND_SM, fill="#666666")


def render_strip(four, sub="ETIQUETAS · INVENTARIO"):
    strip = Image.new("RGB", (W, H), "white")
    d = ImageDraw.Draw(strip)
    xq1, xq2, xb, xq3, xq4 = _positions()
    draw_cell(strip, d, xq1, four[0])
    draw_cell(strip, d, xq2, four[1])
    draw_brand(d, xb, sub)
    draw_cell(strip, d, xq3, four[2])
    draw_cell(strip, d, xq4, four[3])
    return strip


def medida_for(row):
    peso = (row.get("peso") or "").strip()
    if peso:
        try:
            if float(peso) != 0:
                return peso
        except ValueError:
            return peso
    return None


def chunk4(items):
    for i in range(0, len(items), 4):
        g = items[i:i + 4]
        while len(g) < 4:
            g.append(None)
        yield i // 4 + 1, g


def ids_tag(g):
    return "-".join(it["itemId"] for it in g if it)


def save_pdf(pngs, out):
    pages = [Image.open(p).convert("RGB") for p in pngs]
    if pages:
        pages[0].save(out, "PDF", resolution=DPI, save_all=True, append_images=pages[1:])


def zip_folder(folder, zip_path):
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
    inv_items = [{"itemId": r["itemId"], "medida": medida_for(r)} for r in rows]

    inv_pngs = []
    for idx, g in chunk4(inv_items):
        p = inv_dir / f"tira-{idx:03d}_{ids_tag(g)}.png"
        render_strip(g).save(p)
        inv_pngs.append(p)
    print(f"inventario: {len(inv_pngs)} tiras → {inv_dir}")

    new_items = [{"itemId": str(n), "medida": None}
                 for n in range(NEW_START, NEW_START + NEW_COUNT)]
    new_pngs = []
    for idx, g in chunk4(new_items):
        p = new_dir / f"tira-{idx:03d}_{ids_tag(g)}.png"
        render_strip(g, sub="REGISTRO PENDIENTE").save(p)
        new_pngs.append(p)
    print(f"nuevos: {len(new_pngs)} tiras → {new_dir}")

    save_pdf(inv_pngs, OUTDIR / "etiquetas-inventario.pdf")
    save_pdf(new_pngs, OUTDIR / "etiquetas-nuevos.pdf")
    zip_folder(inv_dir, OUTDIR / "etiquetas-inventario.zip")
    zip_folder(new_dir, OUTDIR / "etiquetas-nuevos.zip")
    print("PDFs + ZIPs listos.")

    # preview 4x de las primeras 3 tiras de inventario + 1 de nuevos
    imgs = [Image.open(p) for p in inv_pngs[:3]] + [Image.open(new_pngs[0])]
    imgs = [im.resize((W * 2, H * 2), Image.NEAREST) for im in imgs]
    gap = 16
    sheet = Image.new("RGB", (W * 2 + 32, sum(i.height for i in imgs) + gap * (len(imgs) + 1)), "#cccccc")
    yy = gap
    for im in imgs:
        sheet.paste(im, (16, yy)); yy += im.height + gap
    sheet.save(OUTDIR / "_preview.png")
    print("preview →", OUTDIR / "_preview.png")


if __name__ == "__main__":
    main()
