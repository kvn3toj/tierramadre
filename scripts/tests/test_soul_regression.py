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
