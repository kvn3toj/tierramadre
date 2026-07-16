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
    prs.slides.add_slide(prs.slide_layouts[6])  # portada: la lámina 1 no lleva pie, así que la de prueba va en la 2
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
