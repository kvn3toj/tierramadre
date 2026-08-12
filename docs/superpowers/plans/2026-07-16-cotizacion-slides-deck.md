# Cotización → Google Slides Deck Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let `@Anima_TM_bot` turn a `/cotizacion` estimate into a client-ready, editable Google Slides deck in Drive.

**Architecture:** The bot writes a `quote.json`, shells out to the existing Python renderer (via a `TM_COTIZADOR_BIN` env var, the same pattern as `KINGDOM_MCP_BIN`), and POSTs the resulting `.pptx` to a new bearer-gated `/api/cotizacion-deck`, which uploads it to Drive **with conversion** so it lands as native Slides with editable text boxes. The renderer's design stays in Python because Slides cannot composite photo backgrounds or do the computed layout math.

**Tech Stack:** Python 3.14 (`python-pptx`, `pillow`, `numpy`, `segno`, `pytest`) in `TierraMadre/scripts/venv`; TypeScript ESM + vitest in both repos; Vercel serverless (`@googleapis/drive`).

**Spec:** `TierraMadre/docs/superpowers/specs/2026-07-16-cotizacion-slides-design.md`

## Global Constraints

- **The Soul deck must not shift a single pixel.** `build-cotizacion-pptx.py` with no `--quote` must produce byte-identical geometry to today. Task 1 locks this and every later task must keep it green.
- **The renderer never does money math.** Prices arrive in `quote.json` pre-formatted as strings. Formatting lives in the bot only.
- **Never render a fabricated price.** If any item lacks a price, refuse to render.
- **Two repos, separate commits.** `TierraMadre` (Tasks 1–6) and `anima-bot` (Tasks 7–8). Never stage across repos in one commit.
- **`tierra-madre` bot profile only.** `trinity-mvp` is untouched.
- **The new endpoint is bearer-gated.** Deliberately unlike `/api/media-upload`, which has no auth gate.
- **No font dependency in production.** `python-pptx` writes font _names_ only.
- Python modules use underscores (`cotizacion_quote.py`) so they are importable; only the hyphenated entry script needs `importlib`.
- Spanish for code comments and user-facing strings, matching the existing renderer.

## File Structure

**TierraMadre (Tasks 1–6)**

| File                                        | Responsibility                                                                                     |
| ------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| `scripts/cotizacion_geometria.py` (new)     | Deterministic fingerprint of a `.pptx` — geometry + text + image hashes. Regression harness only.  |
| `scripts/cotizacion_layout.py` (new)        | `verifica(prs)` → list of layout violations. Promoted from a throwaway check to a build assertion. |
| `scripts/cotizacion_quote.py` (new)         | `carga_quote(path)` → `Datos` in the renderer's existing shape. Pure.                              |
| `scripts/cotizacion_fotos.py` (new)         | `elige_encuadre(im)` + `trae_foto(fileId, cache)`.                                                 |
| `scripts/build-cotizacion-pptx.py` (modify) | Gains `--quote/--out/--fotos-cache`; adaptive summary; calls the layout assertion.                 |
| `scripts/tests/conftest.py` (new)           | Loads the hyphenated entry script via `importlib`.                                                 |
| `scripts/tests/test_*.py` (new)             | pytest suites.                                                                                     |
| `api/cotizacion-deck.ts` (new)              | Bearer-gated upload + Drive conversion + idempotent update.                                        |
| `api/_lib/drive-helpers.js` (modify)        | Gains the exported asesor-folder helper.                                                           |
| `tests/cotizacion-deck.test.ts` (new)       | vitest, mocked drive.                                                                              |

**anima-bot (Tasks 7–8)**

| File                                   | Responsibility                                          |
| -------------------------------------- | ------------------------------------------------------- |
| `src/cotizacion/quote.ts` (new)        | `buildQuote(...)` → `QuoteJson`. Pure.                  |
| `src/cotizacion/deck.ts` (new)         | Spawn renderer, POST result, return Slides link.        |
| `src/config.ts` (modify)               | `TM_COTIZADOR_BIN`.                                     |
| `src/telegram/gateway.ts` (modify)     | Wire the deck offer behind the write gate.              |
| `tests/cotizacion/quote.test.ts` (new) | vitest, mirrors `tests/cotizacion/comparables.test.ts`. |

---

### Task 1: Lock the Soul deck with a golden fingerprint

The single highest-risk part of this work is silently regressing a deck that was just hand-polished. Build the net **before** touching the renderer.

We fingerprint the `.pptx` rather than diffing rendered pixels: it is exact, fast, and needs neither LibreOffice nor installed fonts.

**Files:**

- Create: `TierraMadre/scripts/cotizacion_geometria.py`
- Create: `TierraMadre/scripts/tests/conftest.py`
- Create: `TierraMadre/scripts/tests/test_soul_regression.py`
- Create: `TierraMadre/scripts/tests/fixtures/opt/*` (13 photos, 740K, committed)
- Create: `TierraMadre/scripts/tests/golden/soul-geometria.json` (generated)
- Modify: `TierraMadre/.gitignore`

- [ ] **Step 1: Commit the photos as a versioned test fixture**

The renderer reads its photos from `$TM_SCRATCH/opt/`, which today exists only in an ephemeral
scratch folder. The golden test is worthless if it cannot find them, so the fixture becomes
part of the repo. The owner approved this exception on 2026-07-16.

The photos live at the scratch path the controller provides in the dispatch. Copy them in:

```bash
cd /Users/kevinp/Movies/coomunity-universe/TierraMadre
mkdir -p scripts/tests/fixtures/opt
cp <SCRATCH>/opt/* scripts/tests/fixtures/opt/
ls scripts/tests/fixtures/opt | wc -l     # expect 13
du -sh scripts/tests/fixtures/opt         # expect ~740K
```

`.gitignore` excludes photo drops as "large binaries / not source". These are neither — they
are the fixture the deck's regression test is built on. Add an explicit negation near the
existing photo rules, with a comment saying why:

```gitignore
# Las fotos del cotizador SÍ son fuente: son el fixture de la huella dorada que
# protege la lámina Soul. Sin ellas la prueba se salta y protege nada. 740K.
!scripts/tests/fixtures/opt/
!scripts/tests/fixtures/opt/**
```

Verify they are actually stage-able (the negation works only if no parent dir is excluded):

```bash
git add -n scripts/tests/fixtures/opt | head -3
```

Expected: `add 'scripts/tests/fixtures/opt/anillo-1.jpg'` etc. If it prints nothing, the
negation failed — fix it before continuing; a silently-ignored fixture recreates the exact
problem this step exists to solve.

- [ ] **Step 2: Add pytest to the venv**

```bash
cd /Users/kevinp/Movies/coomunity-universe/TierraMadre
scripts/venv/bin/pip install pytest
scripts/venv/bin/python -c "import pytest; print(pytest.__version__)"
```

Expected: a version number prints.

- [ ] **Step 3: Write the fingerprint module**

Create `scripts/cotizacion_geometria.py`:

```python
#!/usr/bin/env python3
"""
Huella determinista de un .pptx: geometría, texto y hash de cada imagen.

Es la red del refactor: la lámina Soul no puede moverse ni un píxel. Se compara
la huella y no el render porque es exacta, no depende de LibreOffice ni de que
Cormorant esté instalada, y señala qué forma se movió en vez de «cambió el 3%».
"""
import hashlib

from pptx import Presentation
from pptx.enum.shapes import MSO_SHAPE_TYPE
from pptx.util import Emu


def _px(v):
    """EMU -> px @96dpi, redondeado: el render trabaja en píxeles enteros"""
    return round(Emu(int(v)).inches * 96, 2)


def huella(path):
    prs = Presentation(path)
    laminas = []
    for s in prs.slides:
        formas = []
        for sh in s.shapes:
            f = {
                "x": _px(sh.left), "y": _px(sh.top),
                "w": _px(sh.width), "h": _px(sh.height),
            }
            if sh.has_text_frame and sh.text_frame.text.strip():
                f["texto"] = sh.text_frame.text
                runs = [r for p in sh.text_frame.paragraphs for r in p.runs]
                if runs:
                    fu = runs[0].font
                    f["fuente"] = fu.name
                    f["tam"] = fu.size.pt if fu.size is not None else None
            if sh.shape_type == MSO_SHAPE_TYPE.PICTURE:
                # el byte de la imagen importa: el encuadre y el blanqueado viven ahí
                f["img"] = hashlib.sha256(sh.image.blob).hexdigest()[:16]
            formas.append(f)
        laminas.append(formas)
    return {"w": _px(prs.slide_width), "h": _px(prs.slide_height), "laminas": laminas}
```

- [ ] **Step 4: Write the conftest that loads the hyphenated entry script**

Create `scripts/tests/conftest.py`:

```python
"""
El script de entrada lleva guiones (build-cotizacion-pptx.py) y no se puede
importar por nombre: se carga por ruta, igual que él mismo carga build-cotizacion.py.
"""
import importlib.util
import os
import sys

RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, RAIZ)

import pytest


def _carga(nombre, archivo):
    spec = importlib.util.spec_from_file_location(nombre, os.path.join(RAIZ, archivo))
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod


@pytest.fixture(scope="session")
def constructor():
    return _carga("constructor", "build-cotizacion-pptx.py")


FIXTURES = os.path.join(os.path.dirname(os.path.abspath(__file__)), "fixtures")


@pytest.fixture(scope="session")
def scratch():
    """
    El TM_SCRATCH con las fotos optimizadas.

    Por defecto apunta a las fotos versionadas en tests/fixtures/opt/, no a un
    scratch efímero: si esto se saltara por falta de fotos, la prueba que
    protege la lámina Soul pasaría en verde sin comprobar nada — que es peor que
    no tenerla. Se puede apuntar a otro sitio con TM_SCRATCH.
    """
    sc = os.environ.get("TM_SCRATCH") or FIXTURES
    if not os.path.isdir(os.path.join(sc, "opt")):
        raise RuntimeError(
            "faltan las fotos en %s/opt: la huella dorada no puede comprobarse" % sc)
    return sc
```

- [ ] **Step 5: Write the failing regression test**

Create `scripts/tests/test_soul_regression.py`:

```python
"""
La lámina Soul es el contrato: el refactor no puede moverla.
"""
import json
import os
import subprocess
import sys

RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ORO = os.path.join(os.path.dirname(os.path.abspath(__file__)), "golden", "soul-geometria.json")


def _construye(scratch, salida):
    env = dict(os.environ, TM_SCRATCH=scratch)
    r = subprocess.run(
        [sys.executable, os.path.join(RAIZ, "build-cotizacion-pptx.py"), "--out", salida],
        env=env, capture_output=True, text=True)
    assert r.returncode == 0, r.stderr
    return salida


def test_soul_no_se_mueve(scratch, tmp_path):
    from cotizacion_geometria import huella
    actual = huella(_construye(scratch, str(tmp_path / "soul.pptx")))
    with open(ORO) as f:
        esperado = json.load(f)
    assert actual == esperado


def test_la_huella_es_determinista(scratch, tmp_path):
    """Sin esto la prueba de arriba no vale: dos construcciones deben coincidir."""
    from cotizacion_geometria import huella
    a = huella(_construye(scratch, str(tmp_path / "a.pptx")))
    b = huella(_construye(scratch, str(tmp_path / "b.pptx")))
    assert a == b
```

- [ ] **Step 6: Run to verify it fails**

```bash
cd /Users/kevinp/Movies/coomunity-universe/TierraMadre
scripts/venv/bin/pytest scripts/tests/test_soul_regression.py -v
```

No `TM_SCRATCH` needed — the conftest defaults to the committed fixture from Step 1.

Expected: FAIL. `test_soul_no_se_mueve` errors on the missing golden file; both may fail because `--out` is not a recognised flag yet.

- [ ] **Step 7: Add the minimal `--out` flag so the build is scriptable**

In `scripts/build-cotizacion-pptx.py`, replace the `main()` definition line and the `SALIDA` use. Find:

```python
def main():
    if not os.path.isdir(OPT):
```

Replace with:

```python
def main(argv=None):
    import argparse
    ap = argparse.ArgumentParser(description="Cotización Soul → .pptx 1080×1920")
    ap.add_argument("--out", default=SALIDA, help="ruta del .pptx de salida")
    args = ap.parse_args(argv)
    if not os.path.isdir(OPT):
```

Then find the save block:

```python
    os.makedirs(os.path.dirname(SALIDA), exist_ok=True)
    prs.save(SALIDA)
    print("→ %s  (%.2f MB, %d láminas, %dx%d px)"
          % (SALIDA, os.path.getsize(SALIDA) / 1024 / 1024, len(prs.slides.__iter__.__self__._sldIdLst), W, H))
```

Replace with:

```python
    os.makedirs(os.path.dirname(os.path.abspath(args.out)), exist_ok=True)
    prs.save(args.out)
    print("→ %s  (%.2f MB, %d láminas, %dx%d px)"
          % (args.out, os.path.getsize(args.out) / 1024 / 1024,
             len(prs.slides.__iter__.__self__._sldIdLst), W, H))
```

- [ ] **Step 8: Generate the golden fingerprint**

Build from the committed fixture, so the golden matches what the test will rebuild:

```bash
cd /Users/kevinp/Movies/coomunity-universe/TierraMadre
mkdir -p scripts/tests/golden
TM_SCRATCH=scripts/tests/fixtures \
  scripts/venv/bin/python scripts/build-cotizacion-pptx.py --out /tmp/soul-oro.pptx
scripts/venv/bin/python -c "
import sys, json; sys.path.insert(0, 'scripts')
from cotizacion_geometria import huella
json.dump(huella('/tmp/soul-oro.pptx'), open('scripts/tests/golden/soul-geometria.json','w'), indent=1, ensure_ascii=False)
print('golden escrito')"
```

- [ ] **Step 9: Run tests to verify they pass**

```bash
scripts/venv/bin/pytest scripts/tests/test_soul_regression.py -v
```

Expected: 2 passed. If `test_la_huella_es_determinista` fails, **stop** — the images are not byte-stable and the golden approach needs a different image comparison. Do not proceed on a flaky net.

- [ ] **Step 10: Prove the net actually catches a regression**

Temporarily change `MARGEN = 88` to `MARGEN = 89` in `scripts/build-cotizacion-pptx.py`, then:

```bash
scripts/venv/bin/pytest scripts/tests/test_soul_regression.py::test_soul_no_se_mueve -v
```

Expected: FAIL. **Revert `MARGEN` to 88** and re-run to confirm it passes again. A golden test that cannot fail is worthless.

- [ ] **Step 11: Commit**

Exact paths only — the working tree carries 14 unrelated modified files. **Never `git add -A`.**

```bash
cd /Users/kevinp/Movies/coomunity-universe/TierraMadre
git add scripts/cotizacion_geometria.py scripts/tests/ scripts/build-cotizacion-pptx.py .gitignore
git status --short --cached      # verify ONLY the files above are staged
git commit -m "test(cotizacion): golden fingerprint locks the Soul deck before refactor"
```

---

### Task 2: Load a quote.json into the renderer

**Interfaces:**

- Consumes: nothing from earlier tasks.
- Produces: `cotizacion_quote.carga_quote(ruta: str) -> Datos`, where `Datos` exposes the attribute names the renderer already reads off the `bc` module: `PRODUCTOS: list[dict]`, `RESUMEN: list[tuple]`, `TOTAL_PLAN: str`, `UNIDADES_PLAN: int`, `FECHA: str`, `QR_URL: str`, `MODULOS: None`.

**Files:**

- Create: `TierraMadre/scripts/cotizacion_quote.py`
- Create: `TierraMadre/scripts/tests/test_cotizacion_quote.py`
- Modify: `TierraMadre/scripts/build-cotizacion-pptx.py`

- [ ] **Step 1: Write the failing test**

Create `scripts/tests/test_cotizacion_quote.py`:

```python
import json

import pytest


def _quote(items=None):
    return {
        "quotationNumber": "TM-2026-0043",
        "cliente": "Cliente Prueba",
        "asesor": {"email": "a@tierramadre.co", "name": "Asesor"},
        "fecha": "16 de julio de 2026",
        "moneda": "COP",
        "qrUrl": "https://tierramadre.app/c/TM-2026-0043",
        "items": items if items is not None else [{
            "itemNumber": 32, "nombre": "Venus",
            "gemas": "Esmeralda F2 · 1,2 Ct", "joya": "Oro 18 k · 3 g",
            "unidades": 1, "unitario": "$7'907.465", "total": "$7'907.465",
            "fotoFileId": "abc123",
        }],
        "total": "$7'907.465",
    }


def _escribe(tmp_path, q):
    p = tmp_path / "quote.json"
    p.write_text(json.dumps(q), encoding="utf-8")
    return str(p)


def test_carga_produce_la_forma_del_render(tmp_path):
    from cotizacion_quote import carga_quote
    d = carga_quote(_escribe(tmp_path, _quote()))
    assert d.TOTAL_PLAN == "$7'907.465"
    assert d.UNIDADES_PLAN == 1
    assert d.FECHA == "16 de julio de 2026"
    assert d.QR_URL == "https://tierramadre.app/c/TM-2026-0043"
    assert d.MODULOS is None
    p = d.PRODUCTOS[0]
    assert p["nombre"] == "Venus"
    assert p["linea"] == "01"
    assert p["opciones"] == []          # el camino «Precio de la pieza»
    assert p["unitario"] == "$7'907.465"
    assert d.RESUMEN == [("Venus", "Esmeralda F2 · 1,2 Ct", 1, "$7'907.465", "$7'907.465")]


def test_unidades_plan_suma_las_unidades(tmp_path):
    from cotizacion_quote import carga_quote
    q = _quote([
        dict(_quote()["items"][0], unidades=3),
        dict(_quote()["items"][0], itemNumber=45, nombre="Esperanza", unidades=2),
    ])
    d = carga_quote(_escribe(tmp_path, q))
    assert d.UNIDADES_PLAN == 5
    assert [p["linea"] for p in d.PRODUCTOS] == ["01", "02"]


def test_rechaza_un_item_sin_precio(tmp_path):
    """Una lámina pulida hace que un número inventado parezca firme."""
    from cotizacion_quote import carga_quote
    q = _quote([dict(_quote()["items"][0], unitario="")])
    with pytest.raises(ValueError, match="sin precio"):
        carga_quote(_escribe(tmp_path, q))


def test_rechaza_una_cotizacion_sin_items(tmp_path):
    from cotizacion_quote import carga_quote
    with pytest.raises(ValueError, match="sin ítems"):
        carga_quote(_escribe(tmp_path, _quote([])))
```

- [ ] **Step 2: Run to verify it fails**

```bash
scripts/venv/bin/pytest scripts/tests/test_cotizacion_quote.py -v
```

Expected: FAIL, `ModuleNotFoundError: No module named 'cotizacion_quote'`.

- [ ] **Step 3: Write the implementation**

Create `scripts/cotizacion_quote.py`:

```python
#!/usr/bin/env python3
"""
quote.json → la forma que ya lee el render.

El render nunca calcula dinero: los precios llegan formateados desde el bot, así
la lámina no puede contradecir al mensaje de Telegram ni a la nota de Anima.

`Datos` imita los nombres que el constructor ya lee del módulo Soul (PRODUCTOS,
RESUMEN, TOTAL_PLAN…), así el constructor no distingue una fuente de la otra.
"""
import json


class Datos:
    def __init__(self, productos, resumen, total, unidades, fecha, qr_url):
        self.PRODUCTOS = productos
        self.RESUMEN = resumen
        self.TOTAL_PLAN = total
        self.UNIDADES_PLAN = unidades
        self.FECHA = fecha
        self.QR_URL = qr_url
        # sin línea de módulos: eso es del plan Soul, no de una cotización suelta
        self.MODULOS = None


def carga_quote(ruta):
    with open(ruta, encoding="utf-8") as f:
        q = json.load(f)

    items = q.get("items") or []
    if not items:
        raise ValueError("cotización sin ítems: no hay nada que cotizar")

    productos, resumen = [], []
    for i, it in enumerate(items, 1):
        if not (it.get("unitario") or "").strip() or not (it.get("total") or "").strip():
            raise ValueError("ítem %r sin precio: no se construye la lámina"
                             % it.get("nombre", it.get("itemNumber")))
        productos.append({
            "key": "item-%s" % it.get("itemNumber", i),
            "linea": "%02d" % i,
            "unidades": it.get("unidades", 1),
            "nombre": it["nombre"],
            "gemas": it.get("gemas", ""),
            "joya": it.get("joya", ""),
            "foto": it.get("fotoFileId") or "",
            "opciones": [],          # el camino «Precio de la pieza» que ya existe
            "unitario": it["unitario"],
            "total": it["total"],
        })
        resumen.append((it["nombre"], it.get("gemas", ""), it.get("unidades", 1),
                        it["unitario"], it["total"]))

    return Datos(
        productos=productos,
        resumen=resumen,
        total=q["total"],
        unidades=sum(it.get("unidades", 1) for it in items),
        fecha=q["fecha"],
        qr_url=q.get("qrUrl", ""),
    )
```

- [ ] **Step 4: Run to verify it passes**

```bash
scripts/venv/bin/pytest scripts/tests/test_cotizacion_quote.py -v
```

Expected: 4 passed.

- [ ] **Step 5: Wire `--quote` into the builder**

In `scripts/build-cotizacion-pptx.py`, inside `main()`, find:

```python
    ap.add_argument("--out", default=SALIDA, help="ruta del .pptx de salida")
    args = ap.parse_args(argv)
```

Replace with:

```python
    ap.add_argument("--out", default=SALIDA, help="ruta del .pptx de salida")
    ap.add_argument("--quote", help="quote.json; sin él se construye el plan Soul")
    args = ap.parse_args(argv)
```

Then find the build block:

```python
    lamina_portada(prs, qr)
    for p in bc.PRODUCTOS:
        lamina_pieza(prs, p, qr)
        if p["key"] == "brazalete":
            lamina_modulos(prs, bc.MODULOS, qr)
    lamina_resumen(prs, qr)
```

Replace with:

```python
    lamina_portada(prs, qr, d)
    for p in d.PRODUCTOS:
        lamina_pieza(prs, p, qr)
        # la línea de módulos es del plan Soul; una cotización suelta no la tiene
        if getattr(d, "MODULOS", None) and p["key"] == "brazalete":
            lamina_modulos(prs, d.MODULOS, qr)
    lamina_resumen(prs, qr, d)
```

Immediately after `args = ap.parse_args(argv)`, add:

```python
    if args.quote:
        from cotizacion_quote import carga_quote
        d = carga_quote(args.quote)
    else:
        d = bc
```

And change the QR line from `qr = qr_png(bc.QR_URL, ...)` to `qr = qr_png(d.QR_URL, ...)`.

- [ ] **Step 6: Thread `d` through the two laminas that read module globals**

`lamina_portada` and `lamina_resumen` currently read `bc.*` directly. Change their signatures and bodies to take the data explicitly. In `lamina_portada`, change `def lamina_portada(prs, qr):` to `def lamina_portada(prs, qr, d):` and replace every `bc.UNIDADES_PLAN`, `bc.TOTAL_PLAN`, `bc.FECHA` with `d.UNIDADES_PLAN`, `d.TOTAL_PLAN`, `d.FECHA`.

In `lamina_resumen`, change `def lamina_resumen(prs, qr):` to `def lamina_resumen(prs, qr, d):` and replace `bc.UNIDADES_PLAN`, `bc.RESUMEN`, `bc.TOTAL_PLAN` with `d.UNIDADES_PLAN`, `d.RESUMEN`, `d.TOTAL_PLAN`.

- [ ] **Step 7: Verify Soul still has not moved**

```bash
scripts/venv/bin/pytest scripts/tests/ -v
```

Expected: all pass, including `test_soul_no_se_mueve`. If it fails, the refactor changed Soul — fix before continuing.

- [ ] **Step 8: Commit**

```bash
git add scripts/cotizacion_quote.py scripts/tests/test_cotizacion_quote.py scripts/build-cotizacion-pptx.py
git commit -m "feat(cotizacion): renderer accepts a quote.json alongside the Soul plan"
```

---

### Task 3: Photo fetch + quality guard

**Interfaces:**

- Consumes: nothing from earlier tasks.
- Produces: `cotizacion_fotos.elige_encuadre(im: PIL.Image) -> "blanquear" | "sangrar"` and `cotizacion_fotos.trae_foto(file_id: str, cache_dir: str, api_base: str) -> str | None` (path to the cached jpg, or `None` when unavailable).

**Files:**

- Create: `TierraMadre/scripts/cotizacion_fotos.py`
- Create: `TierraMadre/scripts/tests/test_cotizacion_fotos.py`

- [ ] **Step 1: Write the failing test**

Create `scripts/tests/test_cotizacion_fotos.py`:

```python
from PIL import Image, ImageDraw


def _foto(fondo, size=(200, 200)):
    im = Image.new("RGB", size, fondo)
    ImageDraw.Draw(im).ellipse((60, 60, 140, 140), fill=(180, 140, 60))
    return im


def test_fondo_casi_blanco_se_blanquea():
    from cotizacion_fotos import elige_encuadre
    # el velo real medido en los JPEG de estudio: 242..255
    assert elige_encuadre(_foto((253, 253, 252))) == "blanquear"


def test_fondo_gris_se_sangra():
    """El canutillo (212,207,201) es la mejor lámina justamente porque sangra:
    flotarlo sobre blanco dibujaría su rectángulo."""
    from cotizacion_fotos import elige_encuadre
    assert elige_encuadre(_foto((212, 207, 201))) == "sangrar"


def test_el_umbral_mira_el_borde_no_el_centro():
    from cotizacion_fotos import elige_encuadre
    im = _foto((255, 255, 255))
    ImageDraw.Draw(im).rectangle((20, 20, 180, 180), fill=(90, 90, 90))
    # el centro es oscuro pero el borde es blanco: se blanquea
    assert elige_encuadre(im) == "blanquear"


def test_sin_foto_devuelve_none(tmp_path):
    from cotizacion_fotos import trae_foto
    assert trae_foto("", str(tmp_path), "https://x") is None
```

- [ ] **Step 2: Run to verify it fails**

```bash
scripts/venv/bin/pytest scripts/tests/test_cotizacion_fotos.py -v
```

Expected: FAIL, `ModuleNotFoundError: No module named 'cotizacion_fotos'`.

- [ ] **Step 3: Write the implementation**

Create `scripts/cotizacion_fotos.py`:

```python
#!/usr/bin/env python3
"""
Trae la foto de un ítem y decide cómo montarla.

Medido el 2026-07-16 sobre las fotos de estudio: el borde del JPEG va de 242 a
255, no de 255. Un fondo casi-blanco se blanquea y flota; uno que no lo es se
sangra, porque flotarlo dibuja su rectángulo contra el lienzo — que es
exactamente por qué la lámina del canutillo (fondo 212) es la mejor del plan.
"""
import os
import urllib.request

UMBRAL_BLANCO = 248


def elige_encuadre(im, umbral=UMBRAL_BLANCO):
    import numpy as np
    a = np.asarray(im.convert("RGB")).astype(int).mean(axis=2)
    borde = np.concatenate([a[0, :], a[-1, :], a[:, 0], a[:, -1]])
    return "blanquear" if borde.mean() >= umbral else "sangrar"


def trae_foto(file_id, cache_dir, api_base, timeout=20):
    """Devuelve la ruta cacheada, o None: sin foto la lámina usa el pergamino."""
    if not file_id:
        return None
    os.makedirs(cache_dir, exist_ok=True)
    destino = os.path.join(cache_dir, "%s.jpg" % file_id)
    if os.path.exists(destino):
        return destino
    url = "%s/api/serve-drive-image?fileId=%s" % (api_base.rstrip("/"), file_id)
    try:
        with urllib.request.urlopen(url, timeout=timeout) as r:
            if r.status != 200:
                return None
            datos = r.read()
    except Exception:
        # una foto que no baja degrada a pergamino; no tumba la cotización
        return None
    with open(destino, "wb") as f:
        f.write(datos)
    return destino
```

- [ ] **Step 4: Run to verify it passes**

```bash
scripts/venv/bin/pytest scripts/tests/test_cotizacion_fotos.py -v
```

Expected: 4 passed.

- [ ] **Step 5: Add a composite invariant test**

The guard is only half the job: the composite must actually come out clean. This asserts the
property that was broken before 2026-07-16 — a photo's 242–255 veil drawing a grey rectangle.

Append to `scripts/tests/test_cotizacion_fotos.py`:

```python
def test_blanquear_deja_las_esquinas_en_blanco_puro(constructor):
    """El velo de 242..255 era lo que dibujaba el rectángulo de cada tesela."""
    import numpy as np
    im = _foto((246, 245, 244))          # velo típico de estudio, por debajo de 250
    limpia = constructor._blanquea_fondo(im)
    a = np.asarray(limpia.convert("RGB")).astype(int).mean(axis=2)
    assert a[0, 0] == 255 and a[-1, -1] == 255


def test_blanquear_no_se_come_la_pieza(constructor):
    """Con tol=16 no debe tocar ni un píxel de la pieza; de 28 en adelante se desborda."""
    import numpy as np
    im = _foto((253, 253, 252))
    antes = np.asarray(im.convert("RGB")).astype(int).mean(axis=2)
    despues = np.asarray(constructor._blanquea_fondo(im).convert("RGB")).astype(int).mean(axis=2)
    comidos = ((antes < 235) & (despues >= 254)).sum()
    assert comidos == 0
```

- [ ] **Step 6: Run to verify the invariant tests pass**

```bash
scripts/venv/bin/pytest scripts/tests/test_cotizacion_fotos.py -v
```

Expected: 6 passed.

- [ ] **Step 7: Wire the photos into the renderer**

Without this the guard is dead code: `compone_foto` resolves photos with `ruta(f)` (a key in the
scratch `opt/` folder), but a quote's `foto` is a **Drive fileId**, so every quoted item would
silently fall through to the pergamino placeholder.

In `scripts/build-cotizacion-pptx.py`, add the flag next to `--quote` in `main()`:

```python
    ap.add_argument("--fotos-cache", default=os.path.join(SCRATCH, "fotos"),
                    help="caché de fotos bajadas de Drive")
```

Add a module-level resolver near `ruta()`:

```python
# Fotos de una cotización: llegan por fileId de Drive, no por clave de opt/.
# El plan Soul sigue resolviendo contra opt/ y no pasa por aquí.
FOTOS_CACHE = None
API_BASE = os.environ.get("TM_API_BASE", "https://tierramadre.app")


def resuelve_foto(p):
    """
    Deja p['foto'] como una ruta usable y decide el encuadre.

    Soul trae claves de opt/ ('brazalete'); una cotización trae fileId. Si la foto
    no baja, se vacía p['foto'] y la lámina cae al pergamino: una foto que falta
    no tumba la cotización.
    """
    from cotizacion_fotos import elige_encuadre, trae_foto
    from PIL import Image
    f = p.get("foto")
    if not f or FOTOS_CACHE is None:
        return p                       # camino Soul: intacto
    ruta_foto = trae_foto(f, FOTOS_CACHE, API_BASE)
    if not ruta_foto:
        p["foto"] = ""
        return p
    p["foto_ruta"] = ruta_foto
    p["sangra"] = elige_encuadre(Image.open(ruta_foto)) == "sangrar"
    return p
```

Teach `ruta()` to honour an already-resolved path. Find:

```python
def ruta(k, ext="jpg"):
    return os.path.join(OPT, "%s.%s" % (k, ext))
```

Replace with:

```python
def ruta(k, ext="jpg"):
    # una foto de cotización ya vive en la caché con su ruta absoluta
    if os.path.isabs(str(k)) and os.path.exists(str(k)):
        return k
    return os.path.join(OPT, "%s.%s" % (k, ext))
```

In `compone_foto`, make the piece use the resolved path. Find:

```python
    f = p.get("foto")
    W_, H_ = int(W), int(FOTO_H)
```

Replace with:

```python
    f = p.get("foto_ruta") or p.get("foto")
    W_, H_ = int(W), int(FOTO_H)
```

Finally, in `main()`, after `d` is loaded, resolve every photo:

```python
    if args.quote:
        globals()["FOTOS_CACHE"] = args.fotos_cache
        for p in d.PRODUCTOS:
            resuelve_foto(p)
```

- [ ] **Step 8: Verify Soul still has not moved**

```bash
scripts/venv/bin/pytest scripts/tests/ -v
```

Expected: all pass. `FOTOS_CACHE` stays `None` on the Soul path, so `resuelve_foto` returns
early and `ruta()` behaves exactly as before — the golden fingerprint proves it.

- [ ] **Step 9: Commit**

```bash
git add scripts/cotizacion_fotos.py scripts/tests/test_cotizacion_fotos.py scripts/build-cotizacion-pptx.py
git commit -m "feat(cotizacion): photo fetch with a measured background quality guard"
```

---

### Task 4: Adaptive summary rows

**Interfaces:**

- Consumes: `Datos.RESUMEN` from Task 2.
- Produces: `build-cotizacion-pptx.alto_fila_resumen(n: int, banda: float) -> float | None` — `None` means the deck cannot fit.

**Files:**

- Modify: `TierraMadre/scripts/build-cotizacion-pptx.py`
- Create: `TierraMadre/scripts/tests/test_resumen_adaptativo.py`

- [ ] **Step 1: Write the failing test**

Create `scripts/tests/test_resumen_adaptativo.py`:

```python
BANDA = 940.0     # PIE_Y - primera fila - cierre; ver ALTO_CIERRE_RESUMEN


def test_cinco_filas_conservan_los_100_de_soul(constructor):
    """El tope de 100 es lo que protege la huella dorada de la lámina Soul."""
    assert constructor.alto_fila_resumen(5, BANDA) == 100


def test_pocas_filas_no_se_estiran(constructor):
    assert constructor.alto_fila_resumen(2, BANDA) == 100


def test_muchas_filas_se_comprimen_hasta_el_piso(constructor):
    alto = constructor.alto_fila_resumen(13, BANDA)
    assert alto is not None
    assert constructor.ALTO_FILA_MIN <= alto < 100


def test_pasado_el_piso_no_cabe(constructor):
    assert constructor.alto_fila_resumen(14, BANDA) is None


def test_cero_items_no_cabe(constructor):
    assert constructor.alto_fila_resumen(0, BANDA) is None
```

- [ ] **Step 2: Run to verify it fails**

```bash
scripts/venv/bin/pytest scripts/tests/test_resumen_adaptativo.py -v
```

Expected: FAIL, `AttributeError: module has no attribute 'alto_fila_resumen'`.

- [ ] **Step 3: Write the implementation**

In `scripts/build-cotizacion-pptx.py`, add next to the other layout constants (after `AIRE_EYEBROW = 32`):

```python
# Filas del resumen. Soul tiene 5 y medían 100; el tope las deja intactas y el
# piso es lo que impide publicar una lámina con las filas encimadas.
ALTO_FILA_MIN = 72       # nombre 34 pt (~39 px a 1,15 em) + subtítulo 13 pt + aire
ALTO_FILA_MAX = 100      # el valor de Soul: no estirar una cotización de 2 ítems
ALTO_CIERRE_RESUMEN = 242   # filete + «Precio Total del Plan» + aclaración
```

And add the function next to `alto_titulo`:

```python
def alto_fila_resumen(n, banda):
    """
    Alto de fila del resumen para n ítems, o None si no cabe.

    El plan Soul trae 5 filas de 100. Con n variable la lámina se desbordaba por
    el pie, así que el alto sale de la banda disponible — pero con tope en 100
    para que Soul no se mueva, y con piso para no encimar el texto.
    """
    if n <= 0:
        return None
    alto = banda / float(n)
    if alto < ALTO_FILA_MIN:
        return None
    return min(alto, ALTO_FILA_MAX)
```

- [ ] **Step 4: Run to verify it passes**

```bash
scripts/venv/bin/pytest scripts/tests/test_resumen_adaptativo.py -v
```

Expected: 5 passed.

- [ ] **Step 5: Use it in `lamina_resumen`**

In `lamina_resumen`, find the loop:

```python
    for n, sub, u, pu, ptot in d.RESUMEN:
```

Immediately before it, add:

```python
    banda = PIE_Y - y - ALTO_CIERRE_RESUMEN
    alto_fila = alto_fila_resumen(len(d.RESUMEN), banda)
    if alto_fila is None:
        raise SystemExit("El resumen no cabe: %d ítems no entran sobre el pie. "
                         "Divide la cotización." % len(d.RESUMEN))
```

Then inside the loop, replace the fixed advance:

```python
        y += 100
```

with:

```python
        y += alto_fila
```

- [ ] **Step 6: Verify Soul still has not moved**

```bash
scripts/venv/bin/pytest scripts/tests/ -v
```

Expected: all pass. `test_soul_no_se_mueve` proves the cap at 100 preserved the Soul geometry exactly.

- [ ] **Step 7: Commit**

```bash
git add scripts/build-cotizacion-pptx.py scripts/tests/test_resumen_adaptativo.py
git commit -m "feat(cotizacion): summary row height adapts to item count, refuses to overflow"
```

---

### Task 5: Promote the layout check to a build assertion

**Interfaces:**

- Consumes: nothing.
- Produces: `cotizacion_layout.verifica(prs: Presentation) -> list[str]` — human-readable violations, empty when clean.

**Files:**

- Create: `TierraMadre/scripts/cotizacion_layout.py`
- Create: `TierraMadre/scripts/tests/test_cotizacion_layout.py`
- Modify: `TierraMadre/scripts/build-cotizacion-pptx.py`

- [ ] **Step 1: Write the failing test**

Create `scripts/tests/test_cotizacion_layout.py`:

```python
from pptx import Presentation
from pptx.util import Emu, Pt


def _px(v):
    return Emu(int(round(v * 9525)))


def _lamina(prs, x, y, w, h, txt):
    s = prs.slides.add_slide(prs.slide_layouts[6])
    tb = s.shapes.add_textbox(_px(x), _px(y), _px(w), _px(h))
    tb.text_frame.text = txt
    return s


def _prs():
    prs = Presentation()
    prs.slide_width, prs.slide_height = _px(1080), _px(1920)
    return prs


def test_una_lamina_limpia_no_reporta_nada():
    from cotizacion_layout import verifica
    prs = _prs()
    _lamina(prs, 88, 1200, 500, 40, "Anillo Nexus")
    assert verifica(prs) == []


def test_detecta_texto_que_cruza_el_pie():
    from cotizacion_layout import verifica
    prs = _prs()
    _lamina(prs, 88, 1700, 500, 60, "se cuela bajo el pie")   # 1700+60 = 1760 > 1737
    problemas = verifica(prs)
    assert len(problemas) == 1
    assert "pie" in problemas[0]


def test_detecta_texto_que_se_sale_del_margen():
    from cotizacion_layout import verifica
    prs = _prs()
    _lamina(prs, 88, 1200, 950, 40, "demasiado ancho")        # 88+950 = 1038 > 992
    assert any("margen" in p for p in verifica(prs))


def test_la_banda_centrada_a_todo_lo_ancho_es_intencional():
    from cotizacion_layout import verifica
    prs = _prs()
    _lamina(prs, 0, 500, 1080, 30, "FOTOGRAFÍA EN PRODUCCIÓN")
    assert verifica(prs) == []
```

- [ ] **Step 2: Run to verify it fails**

```bash
scripts/venv/bin/pytest scripts/tests/test_cotizacion_layout.py -v
```

Expected: FAIL, `ModuleNotFoundError: No module named 'cotizacion_layout'`.

- [ ] **Step 3: Write the implementation**

Create `scripts/cotizacion_layout.py`:

```python
#!/usr/bin/env python3
"""
Ninguna caja de contenido puede cruzar el filete del pie ni salirse del margen.

Con el número de ítems variable, desbordar el pie deja de ser hipotético y pasa
a ser el fallo esperado: por eso esto corre dentro de la construcción y no como
herramienta suelta. Se mide sobre el .pptx, que es exacto, y no sobre el render.
"""
from pptx.util import Emu

PIE_Y, ANCHO, MARGEN = 1738, 1080, 88


def _px(v):
    return Emu(int(v)).inches * 96


def verifica(prs, saltar_primera=True):
    problemas = []
    for i, s in enumerate(prs.slides, 1):
        # la portada no lleva franja de pie: baja hasta el borde a propósito
        portada = saltar_primera and i == 1
        for sh in s.shapes:
            if not sh.has_text_frame or not sh.text_frame.text.strip():
                continue
            txt = sh.text_frame.text.replace("\n", " / ")[:40]
            arriba, alto = _px(sh.top), _px(sh.height)
            if not portada and arriba < PIE_Y and arriba + alto > PIE_Y - 1:
                problemas.append("lámina %d: cruza el pie (fin=%.0f) · %r"
                                 % (i, arriba + alto, txt))
            izq = _px(sh.left)
            # las bandas centradas a todo lo ancho (x=0, w=1080) son intencionales
            if izq >= MARGEN - 1 and izq + _px(sh.width) > ANCHO - MARGEN + 1:
                problemas.append("lámina %d: se sale del margen (der=%.0f) · %r"
                                 % (i, izq + _px(sh.width), txt))
    return problemas
```

- [ ] **Step 4: Run to verify it passes**

```bash
scripts/venv/bin/pytest scripts/tests/test_cotizacion_layout.py -v
```

Expected: 4 passed.

- [ ] **Step 5: Call it from the build, before saving**

In `scripts/build-cotizacion-pptx.py`, find:

```python
    os.makedirs(os.path.dirname(os.path.abspath(args.out)), exist_ok=True)
    prs.save(args.out)
```

Replace with:

```python
    from cotizacion_layout import verifica
    problemas = verifica(prs)
    if problemas:
        # antes de subir, no después: una lámina de cliente no sale con el texto
        # metido bajo el pie
        raise SystemExit("La lámina no cuadra:\n  " + "\n  ".join(problemas))

    os.makedirs(os.path.dirname(os.path.abspath(args.out)), exist_ok=True)
    prs.save(args.out)
```

- [ ] **Step 6: Run the whole suite**

```bash
scripts/venv/bin/pytest scripts/tests/ -v
```

Expected: all pass — the Soul deck builds clean through the new assertion.

- [ ] **Step 7: Commit**

```bash
git add scripts/cotizacion_layout.py scripts/tests/test_cotizacion_layout.py scripts/build-cotizacion-pptx.py
git commit -m "feat(cotizacion): layout check runs as a build assertion, not a dev tool"
```

---

### Task 6: `POST /api/cotizacion-deck`

Uploads the `.pptx` and lets Drive convert it to native Slides. The conversion is the whole point: `requestBody.mimeType` (Slides) differing from `media.mimeType` (pptx) is what yields editable text boxes.

**Interfaces:**

- Consumes: nothing from earlier tasks (the bot calls this in Task 8).
- Produces: `POST /api/cotizacion-deck`, `Authorization: Bearer <ANIMA_BOT_SECRET>`, multipart body with fields `quotationNumber`, `asesorEmail`, `nombre` and file field `deck`. Responds `{ ok: true, data: { fileId, webViewLink } }`.

**Files:**

- Create: `TierraMadre/api/cotizacion-deck.ts`
- Create: `TierraMadre/tests/cotizacion-deck.test.ts`
- Modify: `TierraMadre/api/_lib/drive-helpers.js`

- [ ] **Step 1: Read the existing folder helper — for reference only**

```bash
cd /Users/kevinp/Movies/coomunity-universe/TierraMadre
sed -n '135,240p' api/cotizacion-save.ts
```

You are looking at the private function that walks/creates
`cotizaciones/asesores/{sanitizedEmail}/` inside the shared drive (three `files.list` +
`files.create` pairs, each with `supportsAllDrives: true`). Read it to learn the exact folder
structure and Drive call shape.

**Do NOT modify `api/cotizacion-save.ts`. Do NOT stage it. Do NOT extract from it.**

The original plan moved this helper out of that file. That is now forbidden: the owner has
substantial unfinished work uncommitted in it (new `cantidad`/`descripcion`/`certificadoUrl`/
`numeroCO`/`imagen` fields, products sheet widened `A:H`→`A:M`, for a public `/c/:quotationNumber`
card). Staging that file would sweep a half-built feature into this commit — and `api/` deploys to
Vercel on push to main. The owner chose duplication over that risk on 2026-07-16.

- [ ] **Step 2: Write the helper fresh in `_lib`**

Write a **new** `getAsesorCotizacionesFolder` into `api/_lib/drive-helpers.js`, mirroring the
folder structure you just read, under this exact contract — Task 6's endpoint depends on the name
and argument order:

```js
/**
 * Devuelve el id de cotizaciones/asesores/{email}/ en el Shared Drive, creando
 * lo que falte.
 *
 * DEUDA CONOCIDA: cotizacion-save.ts tiene su propia copia privada de esta
 * lógica. No se extrajo porque ese archivo carga trabajo sin terminar del dueño
 * (la ficha pública /c/:quotationNumber) y comprometerlo lo dejaría a un push de
 * producción. Cuando ese trabajo aterrice, borrar la copia privada y dejar esta.
 *
 * @param {import('@googleapis/drive').drive_v3.Drive} drive
 * @param {string} sharedDriveId
 * @param {string} email
 * @returns {Promise<string>} folderId
 */
export async function getAsesorCotizacionesFolder(drive, sharedDriveId, email) {
  /* … */
}
```

Match the original's behaviour exactly: same folder names, same `sanitizedEmail` derivation, same
`supportsAllDrives: true` on every call, same find-or-create order. A deck must land in the *same*
folder the asesor's quotations already use — if your copy derives a different folder name, decks
silently scatter into a parallel tree.

- [ ] **Step 3: Verify nothing broke**

```bash
cd /Users/kevinp/Movies/coomunity-universe/TierraMadre
npx tsc --noEmit -p tsconfig.json
npm run test:unit
```

Expected: typecheck clean, existing tests pass. `api/cotizacion-save.ts` must be **untouched** —
confirm with `git status --short api/cotizacion-save.ts`, which must still show ` M` (the owner's
pre-existing WIP) and nothing staged.

- [ ] **Step 4: Write the failing test**

Create `tests/cotizacion-deck.test.ts`:

```ts
import { describe, expect, it, vi } from 'vitest';
import { construyeSubida, nombreDeck } from '../api/_lib/deck-upload.js';

describe('nombreDeck', () => {
  it('nombra por número de cotización, para poder deduplicar', () => {
    expect(nombreDeck('TM-2026-0043')).toBe('Cotizacion-TM-2026-0043');
  });
});

describe('construyeSubida', () => {
  const buffer = Buffer.from('fake pptx');

  it('pide a Drive la conversión a Slides nativas', () => {
    const req = construyeSubida('Cotizacion-TM-1', 'folder123', buffer);
    // el mimeType del requestBody distinto al del media es lo que dispara la conversión
    expect(req.requestBody.mimeType).toBe(
      'application/vnd.google-apps.presentation',
    );
    expect(req.media.mimeType).toBe(
      'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    );
    expect(req.requestBody.parents).toEqual(['folder123']);
    expect(req.supportsAllDrives).toBe(true);
  });
});

describe('eligeOperacion', () => {
  it('crea cuando la carpeta no tiene ese deck', () => {
    expect(eligeOperacion([])).toEqual({ tipo: 'crear' });
  });

  it('actualiza cuando ya existe, para que un segundo Sí no duplique', () => {
    expect(eligeOperacion([{ id: 'f1' }])).toEqual({
      tipo: 'actualizar',
      fileId: 'f1',
    });
  });

  it('actualiza el primero si Drive devolviera varios', () => {
    expect(eligeOperacion([{ id: 'f1' }, { id: 'f2' }])).toEqual({
      tipo: 'actualizar',
      fileId: 'f1',
    });
  });
});
```

Import `eligeOperacion` too — line 1 of the file becomes:

```ts
import {
  construyeSubida,
  eligeOperacion,
  nombreDeck,
} from '../api/_lib/deck-upload.js';
```

- [ ] **Step 5: Run to verify it fails**

```bash
npm run test:unit -- tests/cotizacion-deck.test.ts
```

Expected: FAIL, cannot resolve `../api/_lib/deck-upload.js`.

- [ ] **Step 6: Write the pure helper**

Create `api/_lib/deck-upload.js`:

```js
/**
 * Partes puras de la subida del deck, separadas para poder probarlas sin Drive.
 *
 * La conversión a Slides nativas la dispara que el mimeType del requestBody
 * (Slides) sea distinto al del media (pptx). Es lo que deja los cuadros de
 * texto editables, que es el motivo de subir un .pptx y no un PDF.
 */
import { Readable } from 'stream';

export const MIME_SLIDES = 'application/vnd.google-apps.presentation';
export const MIME_PPTX =
  'application/vnd.openxmlformats-officedocument.presentationml.presentation';

/** Nombre estable: es la llave de deduplicación cuando se re-genera la misma cotización. */
export function nombreDeck(quotationNumber) {
  return `Cotizacion-${quotationNumber}`;
}

export function construyeSubida(nombre, folderId, buffer) {
  return {
    requestBody: { name: nombre, mimeType: MIME_SLIDES, parents: [folderId] },
    media: { mimeType: MIME_PPTX, body: Readable.from(buffer) },
    supportsAllDrives: true,
    fields: 'id, webViewLink',
  };
}

/**
 * Crear o actualizar, según lo que ya haya en la carpeta.
 *
 * Un segundo «Sí» debe actualizar el mismo deck y no llenar la carpeta del
 * asesor de duplicados. Separado del handler para poder probarlo sin Drive.
 *
 * @param {Array<{id?: string | null}>} existentes  lo que devolvió files.list
 */
export function eligeOperacion(existentes) {
  const id = existentes?.[0]?.id;
  return id ? { tipo: 'actualizar', fileId: id } : { tipo: 'crear' };
}
```

- [ ] **Step 7: Run to verify it passes**

```bash
npm run test:unit -- tests/cotizacion-deck.test.ts
```

Expected: 2 passed.

- [ ] **Step 8: Write the endpoint**

Create `api/cotizacion-deck.ts`:

```ts
/**
 * Cotización Deck API
 *
 * Sube el .pptx que construye el cotizador y deja que Drive lo convierta a
 * Slides nativas, dentro de la carpeta del asesor que ya usa cotizacion-save.
 *
 * A diferencia de /api/media-upload, este endpoint SÍ lleva puerta: lo llama el
 * bot, y crea archivos en el Shared Drive.
 */
import type { VercelRequest, VercelResponse } from '@vercel/node';
import formidable from 'formidable';
import { readFile } from 'fs/promises';
import { withApiHandler, sendError, sendSuccess } from './_lib/index.js';
import { bearerMatches } from './_lib/bearer.js';
import { getAsesorCotizacionesFolder } from './_lib/drive-helpers.js';
import {
  construyeSubida,
  eligeOperacion,
  nombreDeck,
} from './_lib/deck-upload.js';

export const config = { api: { bodyParser: false } };

export default withApiHandler(
  async (
    req: VercelRequest,
    res: VercelResponse,
    { oauthDrive, sharedDriveId }: any,
  ) => {
    if (
      !bearerMatches(req.headers['authorization'], process.env.ANIMA_BOT_SECRET)
    ) {
      return sendError(res, 401, 'No autorizado');
    }

    const form = formidable({ maxFileSize: 25 * 1024 * 1024 });
    const [fields, files] = await form.parse(req);
    const quotationNumber = String(fields.quotationNumber?.[0] ?? '').trim();
    const asesorEmail = String(fields.asesorEmail?.[0] ?? '').trim();
    const subido = files.deck?.[0];
    if (!quotationNumber || !asesorEmail || !subido) {
      return sendError(res, 400, 'Faltan quotationNumber, asesorEmail o deck');
    }

    const buffer = await readFile(subido.filepath);
    const folderId = await getAsesorCotizacionesFolder(
      oauthDrive,
      sharedDriveId,
      asesorEmail,
    );
    const nombre = nombreDeck(quotationNumber);

    // idempotente: un segundo «Sí» actualiza, no llena la carpeta de duplicados
    const previo = await oauthDrive.files.list({
      q: `name = '${nombre}' and '${folderId}' in parents and trashed = false`,
      fields: 'files(id)',
      supportsAllDrives: true,
      includeItemsFromAllDrives: true,
    });

    const subida = construyeSubida(nombre, folderId, buffer);
    const op = eligeOperacion(previo.data.files ?? []);
    const r =
      op.tipo === 'actualizar'
        ? await oauthDrive.files.update({
            fileId: op.fileId,
            media: subida.media,
            supportsAllDrives: true,
            fields: 'id, webViewLink',
          })
        : await oauthDrive.files.create(subida);

    return sendSuccess(res, {
      fileId: r.data.id,
      webViewLink: r.data.webViewLink,
    });
  },
  {
    methods: ['POST', 'OPTIONS'],
    provideOAuthDrive: true,
    requireDriveId: true,
    errorPrefix: 'CotizacionDeck',
  },
);
```

- [ ] **Step 9: Typecheck and test**

```bash
npx tsc --noEmit -p tsconfig.json
npm run test:unit
```

Expected: clean.

- [ ] **Step 10: Set the secret on Vercel**

The endpoint reads `ANIMA_BOT_SECRET`, the same secret the bot already holds for Convex.

```bash
vercel env add ANIMA_BOT_SECRET production
```

Paste the same value as the bot's `.env`. **Ask the user to run this** — it needs their Vercel session.

- [ ] **Step 11: Commit**

```bash
git add api/cotizacion-deck.ts api/_lib/deck-upload.js api/_lib/drive-helpers.js api/cotizacion-save.ts tests/cotizacion-deck.test.ts
git commit -m "feat(api): bearer-gated cotizacion-deck upload with Drive→Slides conversion"
```

---

### Task 7: `buildQuote` in the bot

**Interfaces:**

- Consumes: `/api/cotizacion-deck`'s field names from Task 6; `quote.json`'s shape from Task 2.
- Produces: `buildQuote(input: QuoteInput): QuoteJson` exported from `src/cotizacion/quote.ts`.

**Files:**

- Create: `anima-bot/src/cotizacion/quote.ts`
- Create: `anima-bot/tests/cotizacion/quote.test.ts`

- [ ] **Step 1: Write the failing test**

Create `anima-bot/tests/cotizacion/quote.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { buildQuote } from '../../src/cotizacion/quote.js';

const item = {
  itemNumber: 32,
  nombre: 'Venus',
  gemas: 'Esmeralda F2 · 1,2 Ct',
  joya: 'Oro 18 k · 3 g',
  unidades: 1,
  unitarioCOP: 7907465,
  fotoFileId: 'abc123',
};

const base = {
  quotationNumber: 'TM-2026-0043',
  cliente: 'Cliente Prueba',
  asesor: { email: 'a@tierramadre.co', name: 'Asesor' },
  fecha: '16 de julio de 2026',
  items: [item],
};

describe('buildQuote', () => {
  it('formatea el dinero al estilo Tierra Mädre', () => {
    // el render nunca calcula ni formatea: el formato vive aquí y sólo aquí
    const q = buildQuote(base);
    expect(q.items[0].unitario).toBe("$7'907.465");
    expect(q.total).toBe("$7'907.465");
  });

  it('multiplica unidades en el total de la línea', () => {
    const q = buildQuote({ ...base, items: [{ ...item, unidades: 3 }] });
    expect(q.items[0].total).toBe("$23'722.395");
  });

  it('suma el total de la cotización sobre todas las líneas', () => {
    const q = buildQuote({
      ...base,
      items: [
        item,
        { ...item, itemNumber: 45, nombre: 'Esperanza', unitarioCOP: 2092535 },
      ],
    });
    expect(q.total).toBe("$10'000.000");
  });

  it('rechaza un ítem sin precio en vez de inventarlo', () => {
    expect(() =>
      buildQuote({ ...base, items: [{ ...item, unitarioCOP: 0 }] }),
    ).toThrow(/sin precio/);
  });

  it('rechaza una cotización sin ítems', () => {
    expect(() => buildQuote({ ...base, items: [] })).toThrow(/sin ítems/);
  });
});
```

- [ ] **Step 2: Run to verify it fails**

```bash
cd /Users/kevinp/Movies/coomunity-universe/anima-bot
npm test -- tests/cotizacion/quote.test.ts
```

Expected: FAIL, cannot resolve `../../src/cotizacion/quote.js`.

- [ ] **Step 3: Write the implementation**

Create `anima-bot/src/cotizacion/quote.ts`:

```ts
/**
 * Arma el quote.json que consume el cotizador (TierraMadre/scripts).
 *
 * El formato del dinero vive aquí y sólo aquí: el render recibe cadenas ya
 * formateadas, así la lámina no puede contradecir al mensaje de Telegram ni a
 * la nota de Anima. Puro y probado, como selectComparables.
 */
export interface QuoteItemInput {
  itemNumber: number;
  nombre: string;
  gemas: string;
  joya: string;
  unidades: number;
  unitarioCOP: number;
  fotoFileId?: string;
}

export interface QuoteInput {
  quotationNumber: string;
  cliente: string;
  asesor: { email: string; name: string };
  fecha: string;
  qrUrl?: string;
  items: QuoteItemInput[];
}

export interface QuoteItemJson {
  itemNumber: number;
  nombre: string;
  gemas: string;
  joya: string;
  unidades: number;
  unitario: string;
  total: string;
  fotoFileId: string;
}

export interface QuoteJson {
  quotationNumber: string;
  cliente: string;
  asesor: { email: string; name: string };
  fecha: string;
  moneda: 'COP';
  qrUrl: string;
  items: QuoteItemJson[];
  total: string;
}

/** $7'907.465 — apóstrofo para millones, punto para miles, como el resto del plan. */
export function formateaCOP(n: number): string {
  const entero = Math.round(n);
  const millones = Math.floor(entero / 1_000_000);
  const resto = entero % 1_000_000;
  const miles = String(resto).padStart(6, '0');
  const conPunto = `${miles.slice(0, 3)}.${miles.slice(3)}`;
  return millones > 0
    ? `$${millones.toLocaleString('es-CO')}'${conPunto}`
    : `$${Number(miles).toLocaleString('es-CO')}`;
}

export function buildQuote(input: QuoteInput): QuoteJson {
  if (!input.items.length)
    throw new Error('cotización sin ítems: no hay nada que cotizar');

  const items = input.items.map((it) => {
    if (!it.unitarioCOP || it.unitarioCOP <= 0) {
      throw new Error(
        `ítem "${it.nombre}" sin precio: no se construye la lámina`,
      );
    }
    const unidades = it.unidades || 1;
    return {
      itemNumber: it.itemNumber,
      nombre: it.nombre,
      gemas: it.gemas,
      joya: it.joya,
      unidades,
      unitario: formateaCOP(it.unitarioCOP),
      total: formateaCOP(it.unitarioCOP * unidades),
      fotoFileId: it.fotoFileId ?? '',
    };
  });

  const total = input.items.reduce(
    (s, it) => s + it.unitarioCOP * (it.unidades || 1),
    0,
  );

  return {
    quotationNumber: input.quotationNumber,
    cliente: input.cliente,
    asesor: input.asesor,
    fecha: input.fecha,
    moneda: 'COP',
    qrUrl: input.qrUrl ?? '',
    items,
    total: formateaCOP(total),
  };
}
```

- [ ] **Step 4: Run to verify it passes**

```bash
npm test -- tests/cotizacion/quote.test.ts
```

Expected: 5 passed. If `formateaCOP` disagrees on a case, fix `formateaCOP` — the expected strings in the test are the contract.

- [ ] **Step 5: Commit**

```bash
cd /Users/kevinp/Movies/coomunity-universe/anima-bot
git add src/cotizacion/quote.ts tests/cotizacion/quote.test.ts
git commit -m "feat(cotizacion): pure buildQuote that formats money for the deck renderer"
```

---

### Task 8: Wire the deck into the bot

**Interfaces:**

- Consumes: `buildQuote` (Task 7), the renderer CLI `--quote/--out/--fotos-cache` (Tasks 2–5), `POST /api/cotizacion-deck` (Task 6).
- Produces: `generaDeck(q: QuoteJson, cfg): Promise<{ fileId: string; webViewLink: string }>`.

**Files:**

- Create: `anima-bot/src/cotizacion/deck.ts`
- Modify: `anima-bot/src/config.ts`
- Modify: `anima-bot/src/telegram/gateway.ts`
- Modify: `anima-bot/.env`

- [ ] **Step 1: Read how the existing `*_BIN` keys are declared**

```bash
cd /Users/kevinp/Movies/coomunity-universe/anima-bot
grep -n "KINGDOM_MCP_BIN\|OBSIDIAN_MCP_BIN\|WHISPER_BIN" src/config.ts
sed -n '175,200p' src/config.ts     # the fsKeys gating block for Fotosíntesis
```

Two patterns to copy exactly rather than invent: how a `*_BIN` path is read and validated, and
how `fsKeys` turns "all these env vars are present" into a feature being on or off.

- [ ] **Step 2: Add the config key, matching those patterns**

Add `cotizadorBin` sourced from `TM_COTIZADOR_BIN`, declared the same way the file already
declares `KINGDOM_MCP_BIN`. Gate the deck feature the same way `fsKeys` gates Fotosíntesis: it
is **off** unless `TM_COTIZADOR_BIN` **and** `TM_API_BASE` **and** `ANIMA_BOT_SECRET` are all
set and non-empty. Do not invent a new gating style — mirror `fsKeys`.

Add a test in `tests/config.deck.test.ts`, mirroring the existing `tests/config.finanzas.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { loadConfig } from '../src/config.js';

const base = {
  /* copy the minimal valid env from tests/config.finanzas.test.ts */
};

describe('deck feature gating', () => {
  it('está apagado sin TM_COTIZADOR_BIN', () => {
    const cfg = loadConfig({ ...base, TM_COTIZADOR_BIN: '' });
    expect(cfg.deck).toBeUndefined();
  });

  it('está encendido con las tres llaves', () => {
    const cfg = loadConfig({
      ...base,
      TM_COTIZADOR_BIN: '/bin/cotizador',
      TM_API_BASE: 'https://tierramadre.app',
      ANIMA_BOT_SECRET: 's3cr3t',
    });
    expect(cfg.deck?.cotizadorBin).toBe('/bin/cotizador');
  });
});
```

Adapt `loadConfig`'s name and signature to whatever `config.ts` actually exports — read it first.

- [ ] **Step 3: Write the deck module**

Create `anima-bot/src/cotizacion/deck.ts`:

```ts
/**
 * Construye el deck y lo publica en Drive.
 *
 * El render vive en Python (TierraMadre/scripts) porque ahí están el compuesto
 * de fotos y el cálculo de la retícula; se invoca por TM_COTIZADOR_BIN, igual
 * que KINGDOM_MCP_BIN y WHISPER_BIN. Orden: render → subir. Si el render falla
 * no hay archivo en Drive; si la subida falla, el .pptx sigue en disco.
 */
import { spawn } from 'child_process';
import { readFile, writeFile, mkdtemp } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';
import type { QuoteJson } from './quote.js';

export interface DeckCfg {
  cotizadorBin: string;
  apiBase: string;
  botSecret: string;
  fotosCache: string;
}

export class DeckError extends Error {}

function corre(bin: string, args: string[]): Promise<void> {
  return new Promise((resolve, reject) => {
    const p = spawn(bin, args, { stdio: ['ignore', 'pipe', 'pipe'] });
    let err = '';
    p.stderr.on('data', (d) => (err += d.toString()));
    p.on('error', (e) =>
      reject(new DeckError(`no se pudo ejecutar el cotizador: ${e.message}`)),
    );
    p.on('close', (code) =>
      code === 0
        ? resolve()
        : // la cola del stderr trae el motivo real: «El resumen no cabe», «sin precio»…
          reject(
            new DeckError(
              `el cotizador falló (${code}): ${err.trim().split('\n').slice(-3).join(' ')}`,
            ),
          ),
    );
  });
}

export async function generaDeck(q: QuoteJson, cfg: DeckCfg) {
  const dir = await mkdtemp(join(tmpdir(), 'tm-deck-'));
  const quotePath = join(dir, 'quote.json');
  const deckPath = join(dir, `${q.quotationNumber}.pptx`);
  await writeFile(quotePath, JSON.stringify(q), 'utf8');

  await corre(cfg.cotizadorBin, [
    '--quote',
    quotePath,
    '--out',
    deckPath,
    '--fotos-cache',
    cfg.fotosCache,
  ]);

  const buffer = await readFile(deckPath);
  const form = new FormData();
  form.append('quotationNumber', q.quotationNumber);
  form.append('asesorEmail', q.asesor.email);
  form.append('nombre', q.cliente);
  form.append('deck', new Blob([buffer]), `${q.quotationNumber}.pptx`);

  const res = await fetch(`${cfg.apiBase}/api/cotizacion-deck`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${cfg.botSecret}` },
    body: form,
  });
  if (!res.ok) {
    // el .pptx sigue en deckPath: el trabajo no se pierde
    throw new DeckError(
      `Drive rechazó el deck (${res.status}). El archivo quedó en ${deckPath}`,
    );
  }
  const j = (await res.json()) as {
    data: { fileId: string; webViewLink: string };
  };
  return j.data;
}
```

- [ ] **Step 4: Make the renderer directly executable**

`TM_COTIZADOR_BIN` must be a single executable. Create `TierraMadre/scripts/cotizador` (chmod +x):

```bash
#!/bin/zsh
# El cotizador con su venv, para que el bot no tenga que conocer rutas de Python.
# TM_SCRATCH trae opt/ (logo, pergamino) que el render necesita.
DIR="${0:a:h}"
exec "$DIR/venv/bin/python" "$DIR/build-cotizacion-pptx.py" "$@"
```

```bash
chmod +x /Users/kevinp/Movies/coomunity-universe/TierraMadre/scripts/cotizador
/Users/kevinp/Movies/coomunity-universe/TierraMadre/scripts/cotizador --help
```

Expected: argparse usage printing `--quote`, `--out`, `--fotos-cache`.

- [ ] **Step 5: Add the env keys**

Append to `anima-bot/.env`:

```
TM_COTIZADOR_BIN=/Users/kevinp/Movies/coomunity-universe/TierraMadre/scripts/cotizador
```

- [ ] **Step 6: Read how an existing write passes the gate**

```bash
cd /Users/kevinp/Movies/coomunity-universe/anima-bot
sed -n '725,760p' src/telegram/gateway.ts     # the /cotizacion command
grep -n "makeCanUseTool\|validateWrite\|write_log" src/daemon.ts src/gate/writeGate.ts | head
```

Read how `/finanzas` or `/guardar` registers a write and how the gate intercepts it. Copy that
mechanism exactly — the deck must go through the **same** path, not a parallel one.

- [ ] **Step 7: Wire the deck offer behind the write gate**

Extend the existing `/cotizacion` flow: once the agent has an estimate, offer to generate the
deck. Creating a Drive file **is a write**, so it goes through the existing gate
(`makeCanUseTool` → Sí/No → `write_log`) exactly like every other write. **Do not bypass the
gate** and do not invent a second confirmation mechanism.

On Sí, call `generaDeck(buildQuote(...), cfg.deck)` and reply with the `webViewLink`. On a
`DeckError`, reply with `err.message` verbatim — it already carries the actionable reason
("El resumen no cabe: 14 ítems…", "ítem X sin precio…", "el archivo quedó en /tmp/…").

Guard the offer on the feature being configured:

```ts
if (!cfg.deck) {
  await ctx.reply(
    'El deck no está configurado en este bot (falta TM_COTIZADOR_BIN).',
  );
  return;
}
```

- [ ] **Step 8: Typecheck and run the suite**

```bash
cd /Users/kevinp/Movies/coomunity-universe/anima-bot
npm run build
npm test
```

Expected: build clean, all tests pass.

- [ ] **Step 9: End-to-end smoke (manual, once)**

Restart the bot and run a real quote:

```bash
launchctl kickstart -k gui/$(id -u)/co.tierramadre.animabot
tail -f ~/Library/Logs/anima-bot.err.log
```

In Telegram: `/cotizacion` for a real item, answer **Sí** to the deck offer, open the returned link. Verify: it opens as **Google Slides** (not a downloaded pptx), the text is **selectable/editable**, the photo rendered, and the total matches the Telegram message.

- [ ] **Step 10: Commit**

```bash
git add src/cotizacion/deck.ts src/config.ts src/telegram/gateway.ts
git commit -m "feat(cotizacion): generate and publish the quote deck to Drive from Telegram"
```

```bash
cd /Users/kevinp/Movies/coomunity-universe/TierraMadre
git add scripts/cotizador
git commit -m "feat(cotizacion): executable entry point for the deck renderer"
```

---

## Verification

- [ ] `cd TierraMadre && scripts/venv/bin/pytest scripts/tests/ -v` — all pass, including `test_soul_no_se_mueve`.
- [ ] `cd TierraMadre && npm run test:unit && npx tsc --noEmit` — clean.
- [ ] `cd anima-bot && npm test && npm run build` — clean.
- [ ] The Soul deck still builds by hand: `scripts/cotizador` with no args writes `docs/Cotizacion-Soul.pptx` unchanged.
- [ ] A real `/cotizacion` produces an editable Slides deck in the asesor's Drive folder.
- [ ] Saying **Sí** twice updates the same file instead of creating a duplicate.
