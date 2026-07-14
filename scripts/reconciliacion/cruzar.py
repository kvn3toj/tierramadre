#!/usr/bin/env python3
"""
Fase 1 — Reconciliación de inventario (SOLO LECTURA)
Task 2: Cruce de identidad por número de ítem + nombre correcto.

Consume: out/{modelo,convex_items,convex_lotes,legacy,sot}.json (Task 1)
Produce: out/identidad.json, out/metricas.json

Regla de nombre del Modelo (el bug del mapa preliminar era comparar solo
`nombreLote` contra `convex.nombre`; el nombre real del ítem del Modelo es
la combinación de columna D (Producto/corte) + columna F (Nombre lote)):

    nombreItem = (corte + ' ' + nombreLote).strip()

Clasificación (Modelo <-> Convex ÚNICAMENTE; legacy/sot son columnas
informativas, no participan en `clase`):

    - colision           : número duplicado DENTRO de la misma fuente
                            (modelo o convex_items), detectado ANTES del
                            cruce principal.
    - coincide           : ambos (Modelo+Convex) presentes, similitud >= 0.72
    - diverge-nombre      : ambos presentes, similitud < 0.72
    - falta-en-convex     : solo Modelo
    - falta-en-modelo     : solo Convex
"""
import json
import unicodedata
from collections import Counter
from difflib import SequenceMatcher

O = 'scripts/reconciliacion/out'
UMBRAL = 0.72


def L(n):
    return json.load(open(f'{O}/{n}.json'))


def acc(s):
    """Quita acentos y normaliza para comparar nombres sin ruido de tildes/case."""
    return ''.join(
        c for c in unicodedata.normalize('NFD', s or '')
        if unicodedata.category(c) != 'Mn'
    ).lower().strip()


def sim(a, b):
    return SequenceMatcher(None, acc(a), acc(b)).ratio()


def main():
    modelo_rows = L('modelo')
    convex_rows = L('convex_items')
    legacy_doc = L('legacy')
    # sot.json es {'success': False, 'error': ...} — fuente vacía esta fase.
    legacy_rows = legacy_doc.get('treasure', []) if isinstance(legacy_doc, dict) else []

    # --- Detección de colisión: números duplicados DENTRO de una misma fuente ---
    modelo_items_all = [m['item'] for m in modelo_rows if m.get('item')]
    convex_items_all = [str(c['itemId']) for c in convex_rows if c.get('itemId')]

    modelo_counts = Counter(modelo_items_all)
    convex_counts = Counter(convex_items_all)

    dup_en_modelo = {n for n, cnt in modelo_counts.items() if cnt > 1}
    dup_en_convex = {n for n, cnt in convex_counts.items() if cnt > 1}
    numeros_colision = dup_en_modelo | dup_en_convex

    # --- Índices por número (última ocurrencia gana para el "detalle" mostrado;
    #     la clase 'colision' ya marca que ese número no es confiable) ---
    modelo = {m['item']: m for m in modelo_rows if m.get('item')}
    ci = {str(c['itemId']): c for c in convex_rows if c.get('itemId')}
    legacy_by_item = {}
    for row in legacy_rows:
        if row.get('item') is not None:
            legacy_by_item[str(row['item'])] = row

    universo = sorted(set(modelo) | set(ci), key=lambda v: (len(v), v))

    identidad = []
    for n in universo:
        m = modelo.get(n)
        c = ci.get(n)
        lg = legacy_by_item.get(n)

        if n in numeros_colision:
            fuentes_dup = []
            if n in dup_en_modelo:
                fuentes_dup.append('modelo')
            if n in dup_en_convex:
                fuentes_dup.append('convex_items')
            clase = 'colision'
            s = None
        elif m and c:
            nombre_modelo = f"{m['corte']} {m['nombreLote']}".strip()
            s = sim(nombre_modelo, c.get('nombre', ''))
            clase = 'coincide' if s >= UMBRAL else 'diverge-nombre'
        elif m:
            clase, s = 'falta-en-convex', None
        else:
            clase, s = 'falta-en-modelo', None

        entry = {
            'item': n,
            'modelo': {
                'codigo': m['codigo'],
                'nombre': f"{m['corte']} {m['nombreLote']}".strip(),
                'costo': m['costo'],
            } if m else None,
            'convex': {
                'itemId': c['itemId'],
                'nombre': c.get('nombre'),
                'loteId': c.get('loteId'),
                'costo': c.get('costoBaseCOP'),
            } if c else None,
            'legacy': {
                'item': lg['item'],
                'nombre': lg.get('nombre'),
                'estado': lg.get('estado'),
                'precioCOP': lg.get('precioCOP'),
            } if lg else None,
            'sot': None,
            'clase': clase,
            'similitudNombre': round(s, 2) if s is not None else None,
        }
        if n in numeros_colision:
            entry['colisionEn'] = fuentes_dup
        identidad.append(entry)

    metricas = dict(Counter(x['clase'] for x in identidad))
    for k in ('coincide', 'diverge-nombre', 'falta-en-convex', 'falta-en-modelo', 'colision'):
        metricas.setdefault(k, 0)

    json.dump(identidad, open(f'{O}/identidad.json', 'w'), ensure_ascii=False, indent=1)
    json.dump(metricas, open(f'{O}/metricas.json', 'w'), ensure_ascii=False, indent=1)

    # --- Verificación / cuadre de conteos ---
    union_n = len(universo)
    suma_clases = sum(metricas.values())
    print('identidad:', len(identidad), '| union números modelo∪convex:', union_n)
    print('métricas:', metricas)
    print('suma clases == len(identidad)?', suma_clases == len(identidad), f'({suma_clases} vs {len(identidad)})')
    print('len(identidad) == union?', len(identidad) == union_n)
    print('colisiones:', sorted(numeros_colision) if numeros_colision else '(ninguna)')
    print('sot: fuente vacía esta fase (endpoint 401 en Task 1) -> sot=None en todas las entradas')


if __name__ == '__main__':
    main()
