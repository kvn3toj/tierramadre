from PIL import Image, ImageDraw


def _foto(fondo, size=(200, 200)):
    im = Image.new("RGB", size, fondo)
    ImageDraw.Draw(im).ellipse((60, 60, 140, 140), fill=(180, 140, 60))
    return im


def test_fondo_casi_blanco_se_blanquea():
    from cotizacion_fotos import elige_encuadre
    # el velo real medido en los JPEG de estudio: 242..255
    assert elige_encuadre(_foto((253, 253, 252))) == "blanquear"


def test_fondo_gris_se_sangra():
    """El canutillo (212,207,201) es la mejor lámina justamente porque sangra:
    flotarlo sobre blanco dibujaría su rectángulo."""
    from cotizacion_fotos import elige_encuadre
    assert elige_encuadre(_foto((212, 207, 201))) == "sangrar"


def test_el_umbral_mira_el_borde_no_el_centro():
    from cotizacion_fotos import elige_encuadre
    im = _foto((255, 255, 255))
    ImageDraw.Draw(im).rectangle((20, 20, 180, 180), fill=(90, 90, 90))
    # el centro es oscuro pero el borde es blanco: se blanquea
    assert elige_encuadre(im) == "blanquear"


def test_sin_foto_devuelve_none(tmp_path):
    from cotizacion_fotos import trae_foto
    assert trae_foto("", str(tmp_path), "https://x") is None


def test_blanquear_deja_las_esquinas_en_blanco_puro(constructor):
    """El velo de 242..255 era lo que dibujaba el rectángulo de cada tesela."""
    import numpy as np
    im = _foto((246, 245, 244))          # velo típico de estudio, por debajo de 250
    limpia = constructor._blanquea_fondo(im)
    a = np.asarray(limpia.convert("RGB")).astype(int).mean(axis=2)
    assert a[0, 0] == 255 and a[-1, -1] == 255


def test_blanquear_no_se_come_la_pieza(constructor):
    """Con tol=16 no debe tocar ni un píxel de la pieza; de 28 en adelante se desborda."""
    import numpy as np
    im = _foto((253, 253, 252))
    antes = np.asarray(im.convert("RGB")).astype(int).mean(axis=2)
    despues = np.asarray(constructor._blanquea_fondo(im).convert("RGB")).astype(int).mean(axis=2)
    comidos = ((antes < 235) & (despues >= 254)).sum()
    assert comidos == 0
