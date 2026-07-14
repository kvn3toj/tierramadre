#!/usr/bin/env python3
"""
Genera `etiquetas-topos.html`: TODAS las etiquetas del inventario (misma lista
que /admin/products/etiquetas, pestaña "Todo"), en orden numérico por itemId,
agrupadas de a 4 por tira (2 QR · marca · 2 QR) — el mismo formato de la tira de
topos existente, ahora "con la medida" junto al número.

Cada QR codifica  https://tierramadre.app/product/<itemId>  (idéntico a la app:
segno error="m" => versión 3, 29x29, mismos módulos que qrcode.react level="M",
de modo que el QR escaneado resuelve in-app).

La "medida" replica el `pesoLineFor` del EtiquetasPage:
  - si hay `peso` no vacío -> peso
  - si no y es insumo     -> categoria · x{cantidad}
  - si no                 -> (sin medida)
"""
import json
import html
from pathlib import Path

import segno

ROOT = Path(__file__).resolve().parent.parent
DATA = ROOT / "prod_inventory.json"
OUT = ROOT / "etiquetas-topos.html"
BASE = "https://tierramadre.app/product/"


def kind_of(row: dict) -> str:
    return "insumo" if row.get("tipo") == "insumo" else "producto"


def medida_for(row: dict, kind: str):
    """Medida = peso SOLO si es no vacío y distinto de 0 (el peso 0/"" ya no se
    muestra como "· 0"; para insumos/topos la medida real vive en el nombre)."""
    peso = (row.get("peso") or "").strip()
    if peso:
        try:
            if float(peso) != 0:
                return peso
        except ValueError:
            return peso  # peso no numérico → mostrarlo tal cual
    return None


def qr_path(item_id: str) -> str:
    """Path SVG (formato run-length horizontal, igual que qrcode.react) para un
    símbolo 29x29 level-M. Devuelve solo el atributo `d` de los módulos negros."""
    qr = segno.make(BASE + item_id, error="m")
    # matrix: filas de 0/1 sin borde. Verificamos que sea 29x29 (versión 3).
    matrix = list(qr.matrix)
    segs = []
    for y, row in enumerate(matrix):
        x = 0
        n = len(row)
        while x < n:
            if row[x]:
                run = 1
                while x + run < n and row[x + run]:
                    run += 1
                segs.append(f"M{x} {y}h{run}v1H{x}z")
                x += run
            else:
                x += 1
    return "".join(segs), len(matrix)


def cell_html(row: dict) -> str:
    item_id = row["itemId"]
    nombre = (row.get("nombre") or "").strip() or f"Ítem {item_id}"
    kind = kind_of(row)
    medida = medida_for(row, kind)
    path_d, size = qr_path(item_id)
    if size != 29:
        # No debería pasar para esta URL, pero lo dejamos explícito.
        raise SystemExit(f"itemId {item_id}: QR {size}x{size}, se esperaba 29x29")

    id_line = html.escape(item_id)
    if medida:
        id_line += ' · <span class="med">' + html.escape(medida) + "</span>"

    return (
        '<div class="cell">'
        f'<div class="name">{html.escape(nombre)}</div>'
        '<svg height="120" width="120" viewBox="0 0 29 29" role="img">'
        '<path fill="#FFFFFF" d="M0,0 h29v29H0z" shape-rendering="crispEdges"></path>'
        f'<path fill="#000000" d="{path_d}" shape-rendering="crispEdges"></path>'
        "</svg>"
        f'<div class="id">{id_line}</div>'
        "</div>"
    )


def strip_html(four: list) -> str:
    left = "".join(cell_html(r) for r in four[:2])
    right = "".join(cell_html(r) for r in four[2:])
    return (
        '<div class="strip">'
        f'<div class="group">{left}</div>'
        '<div class="brand">Tierra Mädre<small>ETIQUETAS · INVENTARIO</small></div>'
        f'<div class="group">{right}</div>'
        "</div>"
    )


def main():
    rows = json.loads(DATA.read_text())
    # El query ya devuelve orden numérico por itemId; lo reafirmamos.
    def sort_key(r):
        try:
            return (0, int(r["itemId"]))
        except (ValueError, TypeError):
            return (1, r["itemId"])

    rows.sort(key=sort_key)

    strips = []
    for i in range(0, len(rows), 4):
        strips.append(strip_html(rows[i : i + 4]))

    doc = f"""<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8" />
<title>Etiquetas Inventario — Tierra Mädre ({len(rows)} ítems)</title>
<style>
  * {{ margin: 0; padding: 0; box-sizing: border-box; }}
  body {{ background: #2b2b2b; font-family: -apple-system, "Segoe UI", Roboto, sans-serif; padding: 24px; }}
  /* Landscape strip: 2 QR · marca · 2 QR */
  .strip {{
    display: flex; align-items: center; justify-content: space-between;
    background: #fff; padding: 14px 20px; gap: 12px;
    width: max-content; margin: 0 auto 14px;
    page-break-inside: avoid; break-inside: avoid;
  }}
  .group {{ display: flex; gap: 18px; }}
  .cell {{ display: flex; flex-direction: column; align-items: center; width: 150px; }}
  .name {{ font-size: 15px; font-weight: 500; color: #000; margin-bottom: 4px; text-align: center;
          line-height: 1.15; min-height: 34px; display: flex; align-items: flex-end; }}
  .id {{ font-size: 12px; color: #333; margin-top: 3px; font-family: ui-monospace, monospace; text-align: center; }}
  .id .med {{ color: #000; font-family: -apple-system, "Segoe UI", Roboto, sans-serif; }}
  .brand {{ font-size: 26px; font-weight: 400; color: #000; padding: 0 24px; white-space: nowrap; text-align: center; }}
  .brand small {{ display:block; font-size: 10px; text-align:center; color:#555; margin-top:4px; letter-spacing:.08em; }}
  @media print {{
    body {{ background: #fff; padding: 0; }}
    .strip {{ margin: 0 auto; }}
    @page {{ size: landscape; margin: 6mm; }}
  }}
</style>
</head>
<body>
{chr(10).join(strips)}
</body>
</html>
"""
    OUT.write_text(doc)
    print(f"OK · {len(rows)} ítems · {len(strips)} tiras · {OUT}")


if __name__ == "__main__":
    main()
