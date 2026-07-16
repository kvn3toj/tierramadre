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
