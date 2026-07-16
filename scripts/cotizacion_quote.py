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
