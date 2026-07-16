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
