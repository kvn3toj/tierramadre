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
