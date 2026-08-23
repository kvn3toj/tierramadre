#!/usr/bin/env python3
"""
Exporta cada TIRA (grupo de 4 etiquetas) como un PNG individual, para imprimir
una línea de 4 a la vez. Cada archivo trae exactamente: 2 QR · marca · 2 QR,
mismo diseño de la hoja combinada.

Salida:
  etiquetas-tiras/inventario/tira-XXX_<ids>.png   — inventario real
  etiquetas-tiras/nuevos/tira-XXX_<ids>.png        — 100 QRs nuevos 473..572
  + un .zip por carpeta

Medida (réplica del EtiquetasPage, con fix): se muestra el `peso` SOLO si es
no vacío y distinto de 0. El peso 0/"" ya no aparece como "· 0" — para los topos
la medida real vive en el nombre ("4mm", "5mm", …).

QR idéntico a la app: segno error="m" (v3, 29x29) → https://tierramadre.app/product/<id>
"""
import io
import json
import zipfile
from pathlib import Path

import segno
from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parent.parent
DATA = ROOT / "prod_inventory.json"
OUTDIR = ROOT / "etiquetas-tiras"
BASE = "https://tierramadre.app/product/"

NEW_START, NEW_COUNT = 473, 100

# ── Tipografías ────────────────────────────────────────────────────────────────
FONTS = "/System/Library/Fonts/Supplemental/"


def _font(paths, size):
    for p in paths:
        try:
            return ImageFont.truetype(p, size)
        except OSError:
            continue
    return ImageFont.load_default()


F_NAME = _font([FONTS + "Arial.ttf"], 28)
F_ID = _font(["/System/Library/Fonts/Menlo.ttc", FONTS + "Courier New Bold.ttf"], 26)
F_MED = _font([FONTS + "Arial.ttf"], 24)
F_BRAND = _font([FONTS + "Georgia.ttf", FONTS + "Arial.ttf"], 44)
F_BRAND_SM = _font([FONTS + "Arial.ttf"], 15)

# ── Métricas de layout ─────────────────────────────────────────────────────────
QR_MODULE_PX = 8
QR_QUIET = 4
QR_PX = (29 + 2 * QR_QUIET) * QR_MODULE_PX      # 296
CELL_W = 300
NAME_LH = 34
NAME_LINES = 2
GAP = 12
ID_H = 40
CELL_H = NAME_LINES * NAME_LH + GAP + QR_PX + GAP + ID_H

PAD = 36
PAD_V = 30
GAP_CELL = 26
BRAND_GAP = 30
BRAND_W = 320
STRIP_W = PAD * 2 + CELL_W * 4 + GAP_CELL * 2 + BRAND_GAP * 2 + BRAND_W
STRIP_H = CELL_H + PAD_V * 2


def qr_image(item_id: str) -> Image.Image:
    qr = segno.make(BASE + item_id, error="m")
    if qr.symbol_size(border=0)[0] != 29:
        raise SystemExit(f"itemId {item_id}: no es 29x29")
    buf = io.BytesIO()
    qr.save(buf, kind="png", scale=QR_MODULE_PX, border=QR_QUIET)
    buf.seek(0)
    return Image.open(buf).convert("L").point(lambda v: 0 if v < 128 else 255).convert("RGB")


def wrap(draw, text, font, max_w, max_lines=NAME_LINES):
    words = text.split()
    lines, cur = [], ""
    for w in words:
        trial = (cur + " " + w).strip()
        if draw.textlength(trial, font=font) <= max_w or not cur:
            cur = trial
        else:
            lines.append(cur)
            cur = w
            if len(lines) == max_lines:
                break
    if cur and len(lines) < max_lines:
        lines.append(cur)
    # Compare CONTENT, not length: text.split() collapses double spaces and
    # newlines, so a name carrying either (many do, inherited from the legacy
    # sheet) came out shorter than the original and got an "…" appended
    # without a single word having been dropped.
    if " ".join(lines) != " ".join(text.split()):
        while lines and draw.textlength(lines[-1] + "…", font=font) > max_w:
            lines[-1] = lines[-1][:-1]
        lines[-1] = lines[-1].rstrip() + "…"
    return lines[:max_lines]


def draw_cell(strip: Image.Image, x0: int, item):
    """item = None (celda vacía) o dict {itemId, nombre, medida}."""
    if item is None:
        return
    d = ImageDraw.Draw(strip)
    cx = x0 + CELL_W / 2
    y = PAD_V

    # Nombre (hasta 2 líneas, ancladas abajo del bloque de nombre)
    lines = wrap(d, item["nombre"], F_NAME, CELL_W - 12) if item["nombre"] else []
    block_top = y + (NAME_LINES - len(lines)) * NAME_LH
    for i, ln in enumerate(lines):
        w = d.textlength(ln, font=F_NAME)
        d.text((cx - w / 2, block_top + i * NAME_LH), ln, font=F_NAME, fill="#000000")
    y += NAME_LINES * NAME_LH + GAP

    # QR
    qr = qr_image(item["itemId"])
    strip.paste(qr, (int(cx - QR_PX / 2), int(y)))
    y += QR_PX + GAP

    # ID · medida
    id_txt = item["itemId"]
    med = item["medida"]
    id_w = d.textlength(id_txt, font=F_ID)
    if med:
        sep = "   ·   "
        sep_w = d.textlength(sep, font=F_MED)
        med_w = d.textlength(med, font=F_MED)
        total = id_w + sep_w + med_w
        x = cx - total / 2
        d.text((x, y + 2), id_txt, font=F_ID, fill="#000000")
        x += id_w
        d.text((x, y + 4), sep, font=F_MED, fill="#777777")
        x += sep_w
        d.text((x, y + 4), med, font=F_MED, fill="#000000")
    else:
        d.text((cx - id_w / 2, y + 2), id_txt, font=F_ID, fill="#000000")


def draw_brand(strip: Image.Image, x0: int, sub: str):
    d = ImageDraw.Draw(strip)
    cx = x0 + BRAND_W / 2
    title = "Tierra Mädre"
    tw = d.textlength(title, font=F_BRAND)
    ty = STRIP_H / 2 - 30
    d.text((cx - tw / 2, ty), title, font=F_BRAND, fill="#000000")
    ssw = d.textlength(sub, font=F_BRAND_SM)
    d.text((cx - ssw / 2, ty + 52), sub, font=F_BRAND_SM, fill="#666666")


def render_strip(four: list, sub: str = "ETIQUETAS · INVENTARIO") -> Image.Image:
    strip = Image.new("RGB", (STRIP_W, STRIP_H), "white")
    xs = [
        PAD,
        PAD + CELL_W + GAP_CELL,
    ]
    brand_x = PAD + CELL_W * 2 + GAP_CELL + BRAND_GAP
    xs += [
        brand_x + BRAND_W + BRAND_GAP,
        brand_x + BRAND_W + BRAND_GAP + CELL_W + GAP_CELL,
    ]
    draw_cell(strip, xs[0], four[0])
    draw_cell(strip, xs[1], four[1])
    draw_brand(strip, brand_x, sub)
    draw_cell(strip, xs[2], four[2])
    draw_cell(strip, xs[3], four[3])
    return strip


# ── Datos ──────────────────────────────────────────────────────────────────────
def medida_for(row: dict):
    peso = (row.get("peso") or "").strip()
    if peso:
        try:
            if float(peso) != 0:
                return peso
        except ValueError:
            return peso  # peso no numérico → mostrarlo tal cual
    return None  # peso vacío o 0 → sin medida (la medida real va en el nombre)


def item_of(row: dict):
    return {
        "itemId": row["itemId"],
        "nombre": (row.get("nombre") or "").strip() or None,
        "medida": medida_for(row),
    }


def chunk4(items):
    for i in range(0, len(items), 4):
        g = items[i : i + 4]
        while len(g) < 4:
            g.append(None)
        yield i // 4 + 1, g


def zip_folder(folder: Path, zip_path: Path):
    with zipfile.ZipFile(zip_path, "w", zipfile.ZIP_DEFLATED) as z:
        for p in sorted(folder.glob("*.png")):
            z.write(p, p.name)


def ids_tag(group):
    return "-".join(it["itemId"] for it in group if it)


def main():
    inv_dir = OUTDIR / "inventario"
    new_dir = OUTDIR / "nuevos"
    inv_dir.mkdir(parents=True, exist_ok=True)
    new_dir.mkdir(parents=True, exist_ok=True)

    # Inventario
    rows = json.loads(DATA.read_text())

    def sort_key(r):
        try:
            return (0, int(r["itemId"]))
        except (ValueError, TypeError):
            return (1, r["itemId"])

    rows.sort(key=sort_key)
    inv_items = [item_of(r) for r in rows]
    n_inv = 0
    for idx, g in chunk4(inv_items):
        render_strip(g).save(inv_dir / f"tira-{idx:03d}_{ids_tag(g)}.png")
        n_inv += 1
    print(f"inventario: {n_inv} tiras → {inv_dir}")

    # Nuevos (solo número)
    new_items = [{"itemId": str(n), "nombre": None, "medida": None}
                 for n in range(NEW_START, NEW_START + NEW_COUNT)]
    n_new = 0
    for idx, g in chunk4(new_items):
        render_strip(g, sub="REGISTRO PENDIENTE").save(
            new_dir / f"tira-{idx:03d}_{ids_tag(g)}.png"
        )
        n_new += 1
    print(f"nuevos: {n_new} tiras → {new_dir}")

    zip_folder(inv_dir, OUTDIR / "etiquetas-inventario-tiras.zip")
    zip_folder(new_dir, OUTDIR / "etiquetas-nuevos-tiras.zip")
    print("ZIPs listos.")


if __name__ == "__main__":
    main()
