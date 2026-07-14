#!/usr/bin/env python3
"""
Arma PDFs de las tiras: UNA tira (grupo de 4) por página, SIN hoja de sobra.

Lee los PNG ya generados en etiquetas-tiras/{inventario,nuevos}. Cada página del
PDF es EXACTAMENTE del tamaño de la tira (+ un margen mínimo), a tamaño nativo
(sin reescalar → los módulos del QR quedan nítidos). Así no queda una hoja
gigante con la tira chiquita en el medio: la página ES la tira.

A 300 DPI la tira (~1704 x 480 px) imprime ≈ 144 x 41 mm.

Salida:
  etiquetas-tiras/etiquetas-inventario.pdf
  etiquetas-tiras/etiquetas-nuevos.pdf
"""
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
TIRAS = ROOT / "etiquetas-tiras"

DPI = 300
MARGIN = 18   # px de margen blanco alrededor de la tira


def compose_page(strip_path: Path) -> Image.Image:
    strip = Image.open(strip_path).convert("RGB")
    w, h = strip.size
    page = Image.new("RGB", (w + 2 * MARGIN, h + 2 * MARGIN), "white")
    page.paste(strip, (MARGIN, MARGIN))
    return page


def build_pdf(folder: Path, out: Path):
    files = sorted(folder.glob("tira-*.png"))
    if not files:
        print(f"(sin tiras en {folder})")
        return
    pages = [compose_page(f) for f in files]
    pages[0].save(
        out, "PDF", resolution=DPI, save_all=True, append_images=pages[1:]
    )
    print(f"{out.name}: {len(pages)} páginas → {out}")


def main():
    build_pdf(TIRAS / "inventario", TIRAS / "etiquetas-inventario.pdf")
    build_pdf(TIRAS / "nuevos", TIRAS / "etiquetas-nuevos.pdf")


if __name__ == "__main__":
    main()
