#!/usr/bin/env python3
"""
Genera `etiquetas-nuevos.html`: N QRs CONSECUTIVOS en blanco (solo el # de ítem,
sin nombre ni medida) para pre-imprimir y pegar en piezas que se registrarán
después. Cada QR ya apunta a https://tierramadre.app/product/<n> (misma ruta que
la app), de modo que al escanear el ítem ya recién creado resuelve in-app.

Rango: START..START+COUNT-1  (por defecto 473..572, los 100 siguientes al máximo
actual del inventario de producción, itemId 472).

Mismo formato de tira que `etiquetas-topos.html`: 4 QR por tira (2 · marca · 2).
"""
import html
from pathlib import Path

import segno

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "etiquetas-nuevos.html"
BASE = "https://tierramadre.app/product/"

START = 473
COUNT = 100


def qr_path(item_id: str) -> str:
    qr = segno.make(BASE + item_id, error="m")
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


def cell_html(item_id: str) -> str:
    path_d, size = qr_path(item_id)
    if size != 29:
        raise SystemExit(f"itemId {item_id}: QR {size}x{size}, se esperaba 29x29")
    return (
        '<div class="cell">'
        '<svg height="120" width="120" viewBox="0 0 29 29" role="img">'
        '<path fill="#FFFFFF" d="M0,0 h29v29H0z" shape-rendering="crispEdges"></path>'
        f'<path fill="#000000" d="{path_d}" shape-rendering="crispEdges"></path>'
        "</svg>"
        f'<div class="id">{html.escape(item_id)}</div>'
        "</div>"
    )


def strip_html(four: list) -> str:
    left = "".join(cell_html(i) for i in four[:2])
    right = "".join(cell_html(i) for i in four[2:])
    return (
        '<div class="strip">'
        f'<div class="group">{left}</div>'
        '<div class="brand">Tierra Mädre<small>REGISTRO PENDIENTE</small></div>'
        f'<div class="group">{right}</div>'
        "</div>"
    )


def main():
    ids = [str(n) for n in range(START, START + COUNT)]
    strips = [strip_html(ids[i : i + 4]) for i in range(0, len(ids), 4)]

    doc = f"""<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8" />
<title>QRs nuevos {START}–{START + COUNT - 1} — Tierra Mädre</title>
<style>
  * {{ margin: 0; padding: 0; box-sizing: border-box; }}
  body {{ background: #2b2b2b; font-family: -apple-system, "Segoe UI", Roboto, sans-serif; padding: 24px; }}
  .strip {{
    display: flex; align-items: center; justify-content: space-between;
    background: #fff; padding: 14px 20px; gap: 12px;
    width: max-content; margin: 0 auto 14px;
    page-break-inside: avoid; break-inside: avoid;
  }}
  .group {{ display: flex; gap: 18px; }}
  .cell {{ display: flex; flex-direction: column; align-items: center; width: 150px; }}
  .id {{ font-size: 20px; font-weight: 700; color: #000; margin-top: 4px;
        font-family: ui-monospace, monospace; text-align: center; }}
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
    print(f"OK · {COUNT} QRs ({START}–{START + COUNT - 1}) · {len(strips)} tiras · {OUT}")


if __name__ == "__main__":
    main()
