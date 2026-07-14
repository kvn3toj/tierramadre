# Reconciliación · Fase 1 — Mapa refinado + validación (SOLO LECTURA) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Producir la **tabla de identidad de inventario** que cruza, ítem por ítem, las 4 fuentes (Modelo_fijacion_precios ↔ Convex ↔ SOT fotosíntesis ↔ legacy) con las columnas correctas, clasificar la divergencia REAL, y dejar un artefacto de validación para el dueño — cerrando la decisión pivote §4 del diseño.

**Architecture:** Fase de análisis **100% solo-lectura**. Scripts `tsx`/Python que descargan cada fuente a JSON normalizado, un cruce que empareja por número de ítem + similitud de nombre (con las columnas correctas), y salidas: un `identidad.json` + una hoja/nota de revisión + métricas de divergencia. **Ninguna escritura a Convex, Sheets ni producción.**

**Tech Stack:** `tsx`, `convex/browser` (o `convex run --prod`), Python 3 + `openpyxl`, Google Drive MCP (para el xlsx del Modelo), el endpoint `get-treasure-sheets` (legacy) y `get-inventory-rows` (SOT).

## Global Constraints

- **SOLO LECTURA.** Ninguna tarea escribe en Convex, Sheets, ni despliega nada. Si una tarea "necesitaría" escribir, es un error del plan — reportar, no escribir.
- **Fuentes (exactas):**
  - Modelo_fijacion_precios: Drive fileId `1Sew9neqDSjXFvlPY4F9wAiJOj5gs_LIA`, hoja `Inventario`. Columnas: A=`Código`(lote), C=`# Ítem`, D=`Producto / corte`, E=`Unid.`, F=`Nombre lote`, I=`Calidad`, K=`Costo compra`.
  - Convex PROD: deployment `wonderful-tortoise-984`. Queries: `lotItems:search {minCantidad:0}` (ítems), `lots:list {}` (lotes). Vía `npx convex run --prod <q>` o `ConvexHttpClient(https://wonderful-tortoise-984.convex.cloud)`.
  - Legacy (fuente del pull): `GET https://tierramadre.app/api/get-treasure-sheets` → `.treasure[]` (clave del ítem: `item`).
  - SOT fotosíntesis: `GET https://tierramadre.app/api/get-inventory-rows` (verificar el shape en Task 1).
- **Números:** normalizar el `# Ítem` del Modelo (viene como float → quitar `.0`; conservar sub-códigos tipo `93A`, `495B`).
- **Matching de ítem = por número**; el nombre real del ítem en el Modelo es `Producto / corte` (col D) **combinado con** `Nombre lote` (col F) — NO usar solo F (ese fue el bug del mapa preliminar).
- Salidas a `scripts/reconciliacion/out/` (git-ignored); no commitear datos crudos de inventario.
- Verificación de cada tarea = **cuadres de conteo** (las sumas de las categorías = total de cada fuente); una discrepancia de conteo es un fallo de tarea.

---

### Task 1: Descargar y normalizar las 4 fuentes

**Files:**

- Create: `scripts/reconciliacion/fetch.ts` (Convex + endpoints)
- Create: `scripts/reconciliacion/parse-modelo.py` (xlsx → JSON)
- Create: `scripts/reconciliacion/.gitignore` (`out/`)
- Output: `out/{modelo,convex_items,convex_lotes,legacy,sot}.json`

**Interfaces:**

- Produces normalized rows:
  - `modelo[]`: `{codigo, item, corte, unid, nombreLote, calidad, costo}` (item normalizado sin `.0`)
  - `convexItems[]`: `{itemId, nombre, loteId, costoBaseCOP, estado}`
  - `convexLotes[]`: `{loteId, nombre, estado, costoTotalCOP, unidades}`
  - `legacy[]`: `{item, nombre, ...}` (tal cual del endpoint)
  - `sot[]`: shape verificado en este task

- [ ] **Step 1: Descargar el xlsx del Modelo y parsear la hoja `Inventario`**

Usar el Google Drive MCP (`download_file_content` fileId `1Sew9neqDSjXFvlPY4F9wAiJOj5gs_LIA`, exportMimeType `text/csv` → devuelve el xlsx en base64 dentro de `.content`). Decodificar y parsear con `openpyxl`:

```python
# scripts/reconciliacion/parse-modelo.py
import openpyxl, json, sys
wb = openpyxl.load_workbook(sys.argv[1], data_only=True)  # sheet.xlsx
ws = wb['Inventario']
def fixnum(v):
    v = str(v).strip() if v is not None else ''
    return v[:-2] if v.endswith('.0') else v
rows = []
for r in range(2, ws.max_row + 1):
    cod, item = ws.cell(r,1).value, ws.cell(r,3).value
    if cod is None and item is None: continue
    rows.append({
        'codigo': str(cod).strip() if cod else '',
        'item': fixnum(item),
        'corte': str(ws.cell(r,4).value or '').strip(),
        'unid': ws.cell(r,5).value,
        'nombreLote': str(ws.cell(r,6).value or '').strip(),
        'calidad': str(ws.cell(r,9).value or '').strip(),
        'costo': ws.cell(r,11).value,
    })
json.dump(rows, open('out/modelo.json','w'), ensure_ascii=False, indent=0)
print('modelo rows:', len(rows), '| con item#:', sum(1 for x in rows if x['item']))
```

- [ ] **Step 2: Descargar Convex (prod) + endpoints legacy/SOT**

```ts
// scripts/reconciliacion/fetch.ts  — SOLO LECTURA
import { ConvexHttpClient } from 'convex/browser';
import { writeFileSync, mkdirSync } from 'node:fs';
mkdirSync('scripts/reconciliacion/out', { recursive: true });
const OUT = 'scripts/reconciliacion/out';
const cx = new ConvexHttpClient('https://wonderful-tortoise-984.convex.cloud');
const items = await cx.query(
  'lotItems:search' as never,
  { minCantidad: 0 } as never,
);
const lots = await cx.query('lots:list' as never, {} as never);
writeFileSync(`${OUT}/convex_items.json`, JSON.stringify(items));
writeFileSync(`${OUT}/convex_lotes.json`, JSON.stringify(lots));
for (const [name, url] of [
  ['legacy', 'get-treasure-sheets'],
  ['sot', 'get-inventory-rows'],
] as const) {
  const res = await fetch(`https://tierramadre.app/api/${url}`);
  const body = await res.json();
  writeFileSync(`${OUT}/${name}.json`, JSON.stringify(body));
  console.log(name, res.status, Object.keys(body));
}
console.log(
  'convex items',
  (items as unknown[]).length,
  'lotes',
  (lots as unknown[]).length,
);
```

Run: `cd TierraMadre && npx tsx scripts/reconciliacion/fetch.ts`
Inspeccionar la salida `sot`/`legacy` para confirmar la clave del número de ítem (documentarla en el reporte). Si `get-inventory-rows` no existe o no expone el SOT, reportarlo (DONE_WITH_CONCERNS) — el SOT puede derivarse de Convex (es su mirror) para esta fase.

- [ ] **Step 3: Verificación de conteos**

Run: cargar cada JSON y `console.log` de la cantidad de filas. Esperado: `modelo ~203`, `convex_items ~117`, `convex_lotes ~43`, `legacy ~347`, `sot` (documentar). Cuadrar contra lo esperado; una diferencia grande = revisar el fetch.

- [ ] **Step 4: Commit**

```bash
git add scripts/reconciliacion/fetch.ts scripts/reconciliacion/parse-modelo.py scripts/reconciliacion/.gitignore
git commit -m "recon(fase1): read-only fetch + parse de las 4 fuentes de inventario"
```

---

### Task 2: Cruce de identidad (por número + nombre correcto)

**Files:**

- Create: `scripts/reconciliacion/cruzar.py`
- Output: `out/identidad.json`, `out/metricas.json`

**Interfaces:**

- Consumes: `out/{modelo,convex_items,convex_lotes,legacy,sot}.json` (Task 1)
- Produces: `identidad[]` = por cada número de ítem visto en cualquier fuente:
  `{ item, modelo:{codigo,nombre,costo}|null, convex:{itemId,nombre,loteId,costo}|null, legacy:{...}|null, sot:{...}|null, clase, similitudNombre }`
  donde `clase` ∈ `coincide` | `diverge-nombre` | `falta-en-convex` | `falta-en-modelo` | `colision`.
- `metricas.json`: conteos por clase (el número que **cierra §4**).

- [ ] **Step 1: Implementar el cruce con las columnas correctas**

Regla de nombre del Modelo: `nombreItem = (corte + ' ' + nombreLote).strip()` para comparar contra `convex.nombre` (similitud con `difflib.SequenceMatcher` sobre nombres sin acentos). Clasificar:

- ambos (Modelo+Convex), similitud ≥ 0.72 → `coincide`
- ambos, similitud < 0.72 → `diverge-nombre` (candidato a validación)
- solo Modelo → `falta-en-convex`
- solo Convex → `falta-en-modelo`
- (marcar `colision` si dos ítems distintos reclaman el mismo número entre fuentes)

```python
# scripts/reconciliacion/cruzar.py
import json, unicodedata
from difflib import SequenceMatcher
O='scripts/reconciliacion/out'
def L(n): return json.load(open(f'{O}/{n}.json'))
modelo={m['item']:m for m in L('modelo') if m['item']}
ci={str(i['itemId']):i for i in L('convex_items') if i.get('itemId')}
def acc(s): return ''.join(c for c in unicodedata.normalize('NFD', s or '') if unicodedata.category(c)!='Mn').lower().strip()
def sim(a,b): return SequenceMatcher(None, acc(a), acc(b)).ratio()
ident=[]
for n in sorted(set(modelo)|set(ci), key=lambda v:(len(v),v)):
    m=modelo.get(n); c=ci.get(n)
    if m and c:
        nm=f"{m['corte']} {m['nombreLote']}".strip()
        s=sim(nm, c.get('nombre',''))
        clase='coincide' if s>=0.72 else 'diverge-nombre'
    elif m: clase, s='falta-en-convex', None
    else: clase, s='falta-en-modelo', None
    ident.append({'item':n,
        'modelo':{'codigo':m['codigo'],'nombre':f"{m['corte']} {m['nombreLote']}".strip(),'costo':m['costo']} if m else None,
        'convex':{'itemId':c['itemId'],'nombre':c.get('nombre'),'loteId':c.get('loteId'),'costo':c.get('costoBaseCOP')} if c else None,
        'clase':clase, 'similitudNombre':round(s,2) if s is not None else None})
from collections import Counter
met=dict(Counter(x['clase'] for x in ident))
json.dump(ident, open(f'{O}/identidad.json','w'), ensure_ascii=False, indent=1)
json.dump(met, open(f'{O}/metricas.json','w'), ensure_ascii=False, indent=1)
print('identidad:', len(ident), '| métricas:', met)
```

- [ ] **Step 2: Ejecutar + cuadre**

Run: `python3 scripts/reconciliacion/cruzar.py`
Verificar: `len(identidad) == |union de números|`; la suma de las clases == `len(identidad)`. Comparar `diverge-nombre` contra el mapa preliminar (56) — se espera **menos** ahora que se usan las columnas correctas; documentar el nuevo número (es lo que cierra §4).

- [ ] **Step 3: Commit**

```bash
git add scripts/reconciliacion/cruzar.py
git commit -m "recon(fase1): cruce de identidad con columnas correctas + métricas de divergencia"
```

---

### Task 3: Artefacto de validación para el dueño

**Files:**

- Create: `scripts/reconciliacion/validar.py`
- Output: `out/validacion.csv`, `out/validacion.md`

**Interfaces:**

- Consumes: `out/identidad.json`
- Produces: un CSV/MD **solo con los casos que requieren decisión humana** (`diverge-nombre`, `falta-en-convex`, `falta-en-modelo`, `colision`), con columnas: `# | Modelo (nombre/lote/costo) | Convex (nombre/lote/costo) | clase | DECISIÓN (col vacía para el dueño)`. Los `coincide` van en un anexo resumido (no requieren revisión).

- [ ] **Step 1: Generar el CSV/MD de validación**

Ordenar por clase y número. En `validacion.md`, una tabla por clase, encabezada con qué debe decidir el dueño (p. ej. para `diverge-nombre`: "¿es el mismo ítem con distinto nombre, o son dos ítems distintos?"). Incluir los datos sucios del Modelo (fechas en `nombreLote`) marcados como `⚠️ dato sucio en hoja`.

```python
# scripts/reconciliacion/validar.py
import json, csv
O='scripts/reconciliacion/out'
ident=json.load(open(f'{O}/identidad.json'))
review=[x for x in ident if x['clase']!='coincide']
with open(f'{O}/validacion.csv','w',newline='') as f:
    w=csv.writer(f); w.writerow(['item','clase','modelo_nombre','modelo_lote','modelo_costo','convex_nombre','convex_lote','convex_costo','DECISION'])
    for x in sorted(review, key=lambda r:(r['clase'], len(r['item']), r['item'])):
        m=x['modelo'] or {}; c=x['convex'] or {}
        w.writerow([x['item'], x['clase'], m.get('nombre',''), m.get('codigo',''), m.get('costo',''), c.get('nombre',''), c.get('loteId',''), c.get('costo',''), ''])
print('casos a validar:', len(review), '/', len(ident))
```

- [ ] **Step 2: Verificar**

Run: `python3 scripts/reconciliacion/validar.py`
Abrir `out/validacion.csv` y confirmar que solo contiene casos no-`coincide` y que las columnas cuadran con `identidad.json`. Confirmar que `casos a validar + coincide == total`.

- [ ] **Step 3: Commit**

```bash
git add scripts/reconciliacion/validar.py
git commit -m "recon(fase1): artefacto de validación humana (CSV/MD de casos dudosos)"
```

---

### Task 4: Reporte de Fase 1 + cierre de la decisión pivote

**Files:**

- Create: `docs/superpowers/reconciliacion/fase1-reporte.md`
- Anima: nota `2026-07-14-mapa-reconciliacion-hoja-convex.md` (actualizar con los números refinados)

**Interfaces:**

- Consumes: `out/metricas.json`, `out/validacion.*`
- Produces: el reporte con: divergencia REAL (por clase), cuántos casos requieren validación, los datos sucios detectados, y **la recomendación cerrada sobre §4** (renumerar vs mapear) basada en el número real.

- [ ] **Step 1: Escribir el reporte**

Estructura: (1) fuentes y conteos; (2) métricas de divergencia refinadas vs el mapa preliminar; (3) resumen de casos a validar; (4) datos sucios de la hoja; (5) **recomendación §4** con criterio explícito: si `diverge-nombre` (real, tras validar) es "poco" (p. ej. ≤ ~15 ítems y ≤ ~3 lotes) → renumerar es viable; si es "mucho" → mapear sin renumerar. (6) qué desbloquea la Fase 2.

- [ ] **Step 2: Actualizar la nota de Anima**

Vía Obsidian MCP: añadir a `[[2026-07-14-mapa-reconciliacion-hoja-convex]]` una sección "Refinado (Fase 1)" con los números correctos, notando que el mapa preliminar sobre-estimó por comparar columnas distintas.

- [ ] **Step 3: Presentar al dueño para cerrar §4**

Reportar los números y pedir la decisión final de §4 (renumerar vs mapear). **No** iniciar la Fase 2 hasta que el dueño decida.

- [ ] **Step 4: Commit**

```bash
git add docs/superpowers/reconciliacion/fase1-reporte.md
git commit -m "recon(fase1): reporte + recomendación para cerrar decisión pivote §4"
```

---

## Self-Review notes

- **Cobertura del spec (Fase 1):** mapa refinado con columnas correctas (Task 2) · las 4 fuentes (Task 1) · validación humana (Task 3) · métricas que cierran §4 (Task 4). El spec pedía exactamente estos entregables.
- **Solo-lectura:** ninguna tarea escribe a Convex/Sheets/prod; solo lee endpoints y queries, y escribe JSON/CSV/MD locales (git-ignored los datos crudos).
- **Tipos/nombres consistentes:** `identidad[]`/`metricas.json` producidos en Task 2 y consumidos en Task 3-4; la regla de nombre del Modelo (`corte + nombreLote`) es la misma en Task 2.
- **Decisión abierta:** §4 (renumerar vs mapear) se cierra al final de esta fase con datos — es el propósito de la fase, no una omisión.

## Nota de contexto (2026-07-14) — recencia del Modelo

El dueño confirmó que **`Modelo_fijacion_precios` es la fuente MÁS actualizada** (incluye los cambios de ayer, hoy y esta semana; Convex/SOT van detrás). Implicaciones para Fase 1 y §4:

- Los `falta-en-convex` (ítems en el Modelo sin equivalente en Convex) son, en gran parte, **actualizaciones recientes que faltan por importar** — no "ruido". Priorizarlos en el reporte.
- En `diverge-nombre`/costo de ítems **recientes**, el valor del **Modelo se asume canónico** (es más nuevo) salvo que la validación del dueño diga lo contrario.
- Esto **refuerza** que el Modelo mande en el contenido (costos/nombres/altas recientes); la decisión §4 sigue siendo solo sobre **si además se renumera** Convex a los números del Modelo (alto riesgo, QR) o se **mapea** manteniendo los itemId de Convex.
- Task 4 debe separar la métrica de divergencia en **"reciente" (esta semana)** vs **"histórica"**, porque la reciente casi seguro se resuelve a favor del Modelo, y la histórica es la que realmente decide §4.
