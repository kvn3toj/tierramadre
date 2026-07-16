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
