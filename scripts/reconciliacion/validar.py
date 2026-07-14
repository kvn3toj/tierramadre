#!/usr/bin/env python3
"""
Fase 1 — Task 3: Artefacto de validación humana.

SOLO LECTURA. Lee out/identidad.json (producido por Task 2) y escribe:
  - out/validacion.csv  — solo los casos que requieren decisión humana
                           (diverge-nombre, falta-en-convex, falta-en-modelo, colision)
  - out/validacion.md   — versión legible, una tabla por clase, con la
                           instrucción de qué debe decidir el dueño.

No hace red, no toca Convex/Sheets, no escribe fuera de out/.
"""
import csv
import json
import re

O = 'scripts/reconciliacion/out'

# Detecta fechas/datetimes colados por error en la columna de nombre del Modelo,
# p.ej. "Lágrima 2026-03-03 00:00:00". Evita falsos positivos como
# "chatones mariposa" (abreviaturas de mes NO deben disparar esto).
DATE_RE = re.compile(
    r'\b\d{4}-\d{2}-\d{2}(?:[ T]\d{2}:\d{2}:\d{2})?\b'   # 2026-03-03[ 00:00:00]
    r'|\b\d{1,2}[/-]\d{1,2}[/-]\d{2,4}\b'                 # 03/03/2026, 3-3-26, etc.
)

CLASS_ORDER = ['diverge-nombre', 'falta-en-convex', 'falta-en-modelo', 'colision']

CLASS_INSTRUCTIONS = {
    'diverge-nombre': (
        '¿Es el MISMO ítem físico con distinto nombre, o son DOS ítems distintos '
        'que comparten número? (El Modelo es la fuente más nueva.)'
    ),
    'falta-en-convex': (
        'Ítem documentado en el Modelo, SIN equivalente en Convex. ¿Es un alta '
        'reciente por importar, o ruido? (Contexto: el Modelo trae los cambios de '
        'esta semana.)'
    ),
    'falta-en-modelo': (
        'Ítem en Convex, ausente del Modelo. ¿Qué es — venta vieja, ítem retirado, '
        'o falta documentarlo en el Modelo?'
    ),
    'colision': 'Ninguna colisión detectada.',
}

CLASS_LABEL = {
    'diverge-nombre': 'Diverge nombre',
    'falta-en-convex': 'Falta en Convex',
    'falta-en-modelo': 'Falta en Modelo',
    'colision': 'Colisión',
}


def sort_key(row_or_item):
    # numérico-aware: agrupa por longitud del literal de item y luego alfabético,
    # así "93A" ordena cerca de "93" en vez de irse al final tras "9".
    item = row_or_item['item'] if isinstance(row_or_item, dict) else row_or_item
    return (len(item), item)


def is_dirty(modelo):
    """Detecta fecha/datetime colada en nombreLote o en el código del Modelo."""
    if not modelo:
        return False
    for field in ('nombre', 'codigo'):
        val = modelo.get(field) or ''
        if DATE_RE.search(str(val)):
            return True
    return False


def fmt(v):
    return '' if v is None else v


def build_row(x):
    m = x['modelo'] or {}
    c = x['convex'] or {}
    dirty = '⚠️ fecha en columna nombre' if is_dirty(x['modelo']) else ''
    similitud = x['similitudNombre'] if x['clase'] == 'diverge-nombre' else ''
    return {
        'item': x['item'],
        'clase': x['clase'],
        'modelo_nombre': fmt(m.get('nombre')),
        'modelo_lote': fmt(m.get('codigo')),
        'modelo_costo': fmt(m.get('costo')),
        'convex_nombre': fmt(c.get('nombre')),
        'convex_lote': fmt(c.get('loteId')),
        'convex_costo': fmt(c.get('costo')),
        'similitud': fmt(similitud),
        'dato_sucio': dirty,
        'DECISION': '',
    }


def write_csv(rows, path):
    fieldnames = [
        'item', 'clase', 'modelo_nombre', 'modelo_lote', 'modelo_costo',
        'convex_nombre', 'convex_lote', 'convex_costo', 'similitud',
        'dato_sucio', 'DECISION',
    ]
    with open(path, 'w', newline='', encoding='utf-8') as f:
        w = csv.DictWriter(f, fieldnames=fieldnames)
        w.writeheader()
        for r in rows:
            w.writerow(r)


def md_table(rows, columns):
    """columns: list of (header, key)"""
    lines = []
    lines.append('| ' + ' | '.join(h for h, _ in columns) + ' |')
    lines.append('|' + '|'.join(['---'] * len(columns)) + '|')
    for r in rows:
        cells = []
        for _, key in columns:
            val = r.get(key, '')
            val = '' if val is None else str(val)
            val = val.replace('|', '\\|').replace('\n', ' ')
            cells.append(val)
        lines.append('| ' + ' | '.join(cells) + ' |')
    return '\n'.join(lines)


def write_md(rows_by_class, coincide_items, counts, total, dirty_count, path):
    total_review = sum(counts.values())
    lines = []
    lines.append('# Validación humana — Fase 1 Reconciliación de Inventario')
    lines.append('')
    lines.append(
        f'**Casos a validar: {total_review} / {total} ítems totales.** '
        f'Los {len(coincide_items)} casos `coincide` no requieren revisión '
        '(Modelo y Convex ya concuerdan) — ver anexo al final.'
    )
    lines.append('')
    lines.append('## Resumen por clase')
    lines.append('')
    lines.append('| Clase | Casos |')
    lines.append('|---|---|')
    for cls in CLASS_ORDER:
        lines.append(f'| {CLASS_LABEL[cls]} (`{cls}`) | {counts.get(cls, 0)} |')
    lines.append(f'| **Total a validar** | **{total_review}** |')
    lines.append(f'| `coincide` (sin revisión) | {len(coincide_items)} |')
    lines.append('')
    if dirty_count:
        lines.append(
            f'⚠️ **{dirty_count} filas** tienen una fecha/datetime colada por error '
            'en la columna de nombre del Modelo (columna `nombreLote`), marcadas '
            'abajo con ⚠️. El nombre real de la pieza para esos ítems no se puede '
            'confirmar solo con el Modelo — revisar la hoja de origen.'
        )
        lines.append('')

    for cls in CLASS_ORDER:
        rows = rows_by_class.get(cls, [])
        lines.append(f'## {CLASS_LABEL[cls]} (`{cls}`) — {len(rows)} casos')
        lines.append('')
        lines.append(f'**Qué decidir:** {CLASS_INSTRUCTIONS[cls]}')
        lines.append('')
        if not rows:
            continue
        if cls == 'diverge-nombre':
            columns = [
                ('item', 'item'),
                ('Modelo — nombre', 'modelo_nombre'),
                ('Convex — nombre', 'convex_nombre'),
                ('similitud', 'similitud'),
                ('Modelo — lote', 'modelo_lote'),
                ('Modelo — costo', 'modelo_costo'),
                ('Convex — lote', 'convex_lote'),
                ('Convex — costo', 'convex_costo'),
                ('dato sucio', 'dato_sucio'),
                ('DECISIÓN', 'DECISION'),
            ]
        elif cls == 'falta-en-convex':
            columns = [
                ('item', 'item'),
                ('Modelo — nombre', 'modelo_nombre'),
                ('Modelo — lote', 'modelo_lote'),
                ('Modelo — costo', 'modelo_costo'),
                ('dato sucio', 'dato_sucio'),
                ('DECISIÓN', 'DECISION'),
            ]
        elif cls == 'falta-en-modelo':
            columns = [
                ('item', 'item'),
                ('Convex — nombre', 'convex_nombre'),
                ('Convex — lote', 'convex_lote'),
                ('Convex — costo', 'convex_costo'),
                ('DECISIÓN', 'DECISION'),
            ]
        else:
            columns = [
                ('item', 'item'), ('clase', 'clase'), ('DECISIÓN', 'DECISION'),
            ]
        lines.append(md_table(rows, columns))
        lines.append('')

    lines.append('## Anexo — `coincide` (sin revisión, 41 ítems)')
    lines.append('')
    lines.append(
        '<details><summary>Ver lista de ítems (' + str(len(coincide_items)) + ')</summary>'
    )
    lines.append('')
    lines.append(', '.join(coincide_items))
    lines.append('')
    lines.append('</details>')
    lines.append('')

    with open(path, 'w', encoding='utf-8') as f:
        f.write('\n'.join(lines))


def main():
    ident = json.load(open(f'{O}/identidad.json', encoding='utf-8'))
    review = [x for x in ident if x['clase'] != 'coincide']
    coincide = [x for x in ident if x['clase'] == 'coincide']

    review_sorted = sorted(review, key=lambda x: (x['clase'], sort_key(x)))
    rows = [build_row(x) for x in review_sorted]

    write_csv(rows, f'{O}/validacion.csv')

    rows_by_class = {}
    for r in rows:
        rows_by_class.setdefault(r['clase'], []).append(r)
    for cls in rows_by_class:
        rows_by_class[cls].sort(key=sort_key)

    counts = {cls: len(rows_by_class.get(cls, [])) for cls in CLASS_ORDER}
    dirty_count = sum(1 for r in rows if r['dato_sucio'])

    coincide_items = sorted((x['item'] for x in coincide), key=sort_key)

    write_md(rows_by_class, coincide_items, counts, len(ident), dirty_count, f'{O}/validacion.md')

    print(f"casos a validar: {len(review)} + coincide: {len(coincide)} == total: {len(ident)} "
          f"-> {len(review) + len(coincide) == len(ident)}")
    for cls in CLASS_ORDER:
        print(f"  {cls}: {counts.get(cls, 0)}")
    print(f"filas con dato sucio (fecha en nombre): {dirty_count}")


if __name__ == '__main__':
    main()
