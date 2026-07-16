#!/usr/bin/env python3
"""
Genera docs/cotizacion-soul.html — cotización Soul en cards 1080x1920.

Todo lo editable vive en este archivo: la URL del QR, los precios, las opciones
y qué opción va marcada como recomendada. Para regenerar:

    scripts/venv/bin/python scripts/build-cotizacion.py      (o cualquier python con segno + pillow)

Fuentes de datos:
  - precios: hoja B2B «Producción» + «Inventario» (vía el artifact de la cotización)
  - fotos y logo: extraídos del deck «Cotización Soul» (Google Slides)
  - sellos: public/certification-logo-{1,2,3}.png
"""

import base64
import json
import os
import sys

# ─────────────────────────────────────────────────────────────────────────────
# EDITABLE · destino del QR
# ─────────────────────────────────────────────────────────────────────────────
QR_URL = "https://tierramadre.app/cotizacion-soul.html"

FECHA = "16 de julio de 2026"
UNIDADES_PLAN = "240"
TOTAL_PLAN = "$650’778.130"

# Copy de la carátula y del cierre del plan Soul. Una cotización de cliente no
# lee estas constantes: trae las suyas propias (ver cotizacion_quote.Datos),
# para que build-cotizacion-pptx.py nunca tenga que decidir con un `if` si está
# armando el plan Soul o la cotización de un cliente — sólo lee `d.ALGO`.
EYEBROW_PORTADA = "Subastas con Propósito"
TITULO_PORTADA = "Cotización\nSoul"
SUBTITULO_PORTADA = "Plan de producción · %s unidades" % UNIDADES_PLAN
TITULO_RESUMEN = "Resumen\ndel Plan"
NOTA_RESUMEN = ("%s unidades · una opción por línea. Las alternativas de cada "
                "pieza no se suman." % UNIDADES_PLAN)
# Verdadero sólo para el plan Soul: es el único que trae módulos por chakra.
# Una cotización de cliente sin módulos no puede repetir esta frase — sería una
# afirmación falsa sobre el alcance de lo cotizado.
CIERRE_NOTA = ("Incluye la base y los módulos por chakra de la Línea 01. "
               "Las alternativas de cada pieza son excluyentes: no se suman.")

# ─────────────────────────────────────────────────────────────────────────────
# Rutas
# ─────────────────────────────────────────────────────────────────────────────
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SCRATCH = os.environ.get("TM_SCRATCH", "")
OPT = os.path.join(SCRATCH, "opt")          # fotos ya optimizadas del deck

# Vive en public/ para que Vite lo sirva en la raíz y el QR resuelva.
# Ojo: public/ es estático y sin autenticación — «solo con el link» aquí
# significa no listado (noindex), no protegido. Cualquiera con la URL lo abre.
SALIDA = os.path.join(ROOT, "public", "cotizacion-soul.html")

# ─────────────────────────────────────────────────────────────────────────────
# EDITABLE · productos
#   unitario/total = precio final por unidad y por la línea completa
#   opciones: la marcada recomendada=True es la del plan
# ─────────────────────────────────────────────────────────────────────────────
PRODUCTOS = [
    dict(
        key="brazalete", linea="01", foto="brazalete",
        nombre="Brazalete Modular\n5 Chakras",
        descripcion="Pieza modular en cuero natural café. Una base fija más un broche de gema por chakra.",
        gemas="Granate 2 mm · chakra Raíz, en contenedor con baño en oro",
        joya="Broche en baño de oro con grabado SOUL · cuero natural café",
        unidades="200", unitario="$1’052.007", total="$210’401.480",
        opciones=[
            dict(nombre="Acabado Baño en Oro", sub="El baño de la base, sin capas adicionales",
                 unitario="$1’052.007", total="$210’401.480", recomendada=True),
            dict(nombre="Acabado + 3 Baños en Oro", sub="Tres capas adicionales de baño",
                 unitario="$1’148.593", total="$229’718.554"),
            dict(nombre="Acabado Enchape en Oro", sub="Enchape en lugar de baño",
                 unitario="$1’245.178", total="$249’035.627"),
        ],
        razon="El baño de la base y el grabado SOUL ya van incluidos, sin sumar costo de capas.",
        nota="Precio de la línea completa: incluye la base ($775.609 por unidad) y los módulos por chakra.",
    ),
    dict(
        key="nexus", linea="03", foto="trio",
        nombre="Anillo Nexus",
        descripcion="Lote Color Esperanza. Montura solitario con esmeralda colombiana de Chivor.",
        gemas="Esmeralda F2 · Fina Sublime Verde Chivor · lote de 11 gemas / 14,57 Ct",
        joya="Montura solitario en Oro 18 k · 3 g",
        unidades="10", unitario="$7’907.465", total="$79’074.650",
        opciones=[
            dict(nombre="Esmeralda F2 Verde Chivor", sub="Lote Color Esperanza · 11 gemas",
                 unitario="$7’907.465", total="$79’074.650", recomendada=True),
            dict(nombre="Esmeralda Premium 1 Ct", sub="Gema premium de 1 Ct por anillo",
                 unitario="$12’620.636", total="$126’206.358"),
        ],
        razon="Es la opción del plan: aprovecha el lote Color Esperanza completo y mantiene la inversión de la línea en su punto más eficiente.",
    ),
    dict(
        key="canutillo", linea="04", foto="canutillo", sangra=True,
        nombre="Dije Canutillo Master\nmás cadena tipo Cartier",
        descripcion="Canutillo de esmeralda en barra tubular montado en dije de oro con grabado, sobre cadena tipo Cartier.",
        gemas="Canutillo Comercial Fino · 1,5 cm · 3 Ct",
        joya="Dije en Oro 18 k · 3,4 g · con grabado · cadena tipo Cartier",
        unidades="10", unitario="$8’376.733", total="$83’767.333",
        opciones=[
            dict(nombre="Canutillo Comercial Fino", sub="3 Ct · desde 1,5 cm",
                 unitario="$8’376.733", total="$83’767.333", recomendada=True),
            dict(nombre="Canutillo mejor calidad", sub="Mismo peso de 3 Ct, mejor calidad",
                 unitario="$12’035.270", total="$120’352.700"),
        ],
        razon="Es la opción del plan: mismo dije de oro y mismo peso de gema, con la inversión de la línea contenida.",
    ),
    dict(
        key="infinito", linea="05", foto="pulsera",
        nombre="Pulsera Infinito\n(Tennis)",
        descripcion="Carril de esmeraldas redondas calibradas sobre joya en oro 18 k, con grabado en el broche.",
        gemas="80 esmeraldas redondas · Comercial Fina · 1,5 mm",
        joya="Joya en Oro 18 k · 3,4 g · grabado en el broche",
        unidades="10", unitario="$21’108.441", total="$211’084.407",
        opciones=[
            dict(nombre="Comercial Fina · 1,5 mm", sub="80 esmeraldas redondas · joya 3,4 g Oro 18 k",
                 unitario="$21’108.441", total="$211’084.407", recomendada=True),
            dict(nombre="Fina Esencial · 3 mm", sub="57 esmeraldas redondas · joya 13 g Oro 18 k",
                 unitario="$88’523.075", total="$885’230.749"),
            dict(nombre="Cuadradas · 3 mm", sub="28 gemas · 14 Ct · joya 24 g Oro 18 k",
                 unitario="$123’962.099", total="$1.239’620.993"),
        ],
        razon="Es la opción del plan. Subir a 3 mm multiplica la gema por más de cuatro veces y lleva la línea por encima de los $885 millones.",
    ),
    # Trinity cierra el recorrido, igual que en el deck de origen (lámina 7).
    dict(
        # NO INVENTAR: la única fuente de Trinity es la hoja de costos, que dice
        # «Montura Trinity Oro 18 K · solitario · 3,5 g» + «Moléculas de Luz (acento)».
        # No existe foto ni lámina de Trinity en ninguno de los dos decks:
        # foto="" es deliberado y cae en la lámina de pergamino.
        key="trinity", linea="06", foto="",
        nombre="Anillo Trinity",
        descripcion="Montura solitario en oro 18 k con acento «Moléculas de Luz».",
        gemas="Acento «Moléculas de Luz»",
        joya="Montura solitario en Oro 18 k · 3,5 g",
        unidades="10", unitario="$6’645.026", total="$66’450.260",
    ),
]

# Módulos del brazalete (se suman a la base, no son alternativas)
MODULOS = dict(
    linea="02", foto="rejilla",
    nombre="Módulos para\nBrazalete Chakra",
    descripcion="Insumos por chakra. Cada módulo se suma a la base del brazalete.",
    filas=[
        dict(nombre="Esmeralda 2 mm", sub="Corazón · verde", cant="× 40", unitario="$365.854", total="$14’634.146"),
        dict(nombre="Cornalina 2 mm", sub="Sacro · naranja", cant="× 120", unitario="$92.683", total="$11’121.951"),
        dict(nombre="Citrino 2 mm", sub="Plexo · amarillo", cant="× 60", unitario="$226.829", total="$13’609.756"),
        dict(nombre="Zafiro 2 mm", sub="Garganta · azul", cant="× 20", unitario="$507.317", total="$10’146.341"),
    ],
    total="$49’512.195",
    aclaracion="Ya incluido en el precio de la Línea 01. No se suma aparte.",
)

# Acabado del brazalete (alternativas sobre la línea completa de 200 u)
ACABADOS = dict(
    linea="03", foto="brazalete",
    nombre="Brazalete 5 Chakras\nAcabado en Oro",
    descripcion="Sobre la línea completa de 200 unidades, base y módulos incluidos.",
    opciones=[
        dict(nombre="Acabado Baño en Oro", sub="El baño de la base, sin capas adicionales",
             unitario="$1’052.007", total="$210’401.480", recomendada=True),
        dict(nombre="Acabado + 3 Baños en Oro", sub="Tres capas adicionales de baño",
             unitario="$1’148.593", total="$229’718.554"),
        dict(nombre="Acabado Enchape en Oro", sub="Enchape en lugar de baño",
             unitario="$1’245.178", total="$249’035.627"),
    ],
    razon="Es el acabado del plan: el baño de la base y el grabado SOUL ya van incluidos, sin sumar costo de capas.",
)

RESUMEN = [
    ("Brazalete Modular 5 Chakras", "Acabado Baño en Oro", "200", "$1’052.007", "$210’401.480"),
    ("Anillo Nexus", "Esmeralda F2 Verde Chivor", "10", "$7’907.465", "$79’074.650"),
    ("Dije Canutillo Master", "Canutillo Comercial Fino · cadena tipo Cartier", "10", "$8’376.733", "$83’767.333"),
    ("Pulsera Infinito (Tennis)", "Comercial Fina · 1,5 mm", "10", "$21’108.441", "$211’084.407"),
    ("Anillo Trinity", "Moléculas de Luz", "10", "$6’645.026", "$66’450.260"),
]


# ─────────────────────────────────────────────────────────────────────────────
# Assets
# ─────────────────────────────────────────────────────────────────────────────
def uri(path, mime):
    with open(path, "rb") as f:
        return "data:%s;base64,%s" % (mime, base64.b64encode(f.read()).decode())


def cargar_assets():
    a = {}
    if not os.path.isdir(OPT):
        sys.exit("No encuentro las fotos optimizadas en %s (define TM_SCRATCH)" % OPT)
    for k in ("logo",):
        a[k] = uri(os.path.join(OPT, k + ".png"), "image/png")
    for k in ("pergamino", "portada", "brazalete", "canutillo", "pulsera",
              "mod-esmeralda", "mod-cornalina", "mod-citrino", "mod-zafiro",
              "anillo-1", "anillo-2", "anillo-3"):
        a[k] = uri(os.path.join(OPT, k + ".jpg"), "image/jpeg")
    for i in (1, 2, 3):
        a["sello%d" % i] = uri(os.path.join(ROOT, "public", "certification-logo-%d.png" % i), "image/png")
    a["cormorant"] = uri(os.path.join(SCRATCH, "cormorant.woff2"), "font/woff2")
    a["montserrat"] = uri(os.path.join(SCRATCH, "montserrat.woff2"), "font/woff2")
    return a


def qr_svg(url):
    """QR como <svg> inline, en vino sobre transparente."""
    import io

    import segno
    q = segno.make(url, error="m")
    buf = io.BytesIO()
    # omitsize=True → el SVG sale con viewBox y escala al marco; con width/height
    # fijos el QR se queda diminuto en la esquina.
    q.save(buf, kind="svg", scale=1, border=0, dark="#6e1d18", light=None,
           svgclass=None, lineclass=None, xmldecl=False, svgns=True, omitsize=True)
    return buf.getvalue().decode("utf-8")


# ─────────────────────────────────────────────────────────────────────────────
# Fragmentos
# ─────────────────────────────────────────────────────────────────────────────
def sellos_html():
    return (
        '<div class="sellos" role="img" aria-label="Certificados de origen: '
        'geográfico de las montañas de Boyacá, consciente y social de 1200 familias mineras, '
        'y natural no hecha en laboratorio">'
        '<i class="sello s1"></i><i class="sello s2"></i><i class="sello s3"></i>'
        "</div>"
    )


def qr_html(qr):
    return ('<div class="qr"><div class="qr-marco">%s</div>'
            '<span class="qr-pie">Ficha completa</span></div>' % qr)


def pie_html():
    return ('<footer class="pie"><i class="logo"></i>'
            '<span class="pie-nota">Valores en pesos colombianos · %s</span></footer>'
            '<div class="barra"></div>' % FECHA)


def foto_html(foto, sangra=False):
    if sangra:
        # toma editorial pensada para sangrar (fondo gris, cadenas que salen del cuadro):
        # llena el marco en vez de dejar bandas blancas alrededor
        return '<div class="foto sangra"><i class="ph img-%s"></i></div>' % foto
    if foto == "rejilla":
        return ('<div class="foto rejilla">'
                '<i class="ph img-mod-citrino"></i><i class="ph img-mod-cornalina"></i>'
                '<i class="ph img-mod-esmeralda"></i><i class="ph img-mod-zafiro"></i></div>')
    if foto == "trio":
        return ('<div class="foto trio">'
                '<i class="ph img-anillo-1"></i><i class="ph img-anillo-2"></i>'
                '<i class="ph img-anillo-3"></i></div>')
    if not foto:
        # sin fotografía en el deck: lámina de textura, no un hueco roto
        return ('<div class="foto lamina"><i class="lamina-bg img-pergamino"></i>'
                '<i class="lamina-logo"></i>'
                '<span class="lamina-nota">Fotografía en producción</span></div>')
    return '<div class="foto"><i class="ph img-%s"></i></div>' % foto


def esc(s):
    return s.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")


def nombre_html(n):
    return "<br>".join(esc(p) for p in n.split("\n"))


# ─────────────────────────────────────────────────────────────────────────────
# Cards
# ─────────────────────────────────────────────────────────────────────────────
def card_portada(qr):
    return f"""
<section class="card portada">
  <i class="portada-bg img-portada"></i>
  <div class="portada-velo"></div>
  <div class="portada-cuerpo">
    <i class="logo logo-claro"></i>
    <p class="eyebrow oro">Subastas con Propósito</p>
    <h1>Cotización<br>Soul</h1>
    <p class="portada-sub">Plan de producción · {UNIDADES_PLAN} unidades</p>
    <div class="portada-total">
      <p class="eyebrow oro">Precio Total del Plan</p>
      <p class="portada-cifra">{TOTAL_PLAN}</p>
    </div>
    <p class="portada-meta">Valores en pesos colombianos (COP) · {FECHA}</p>
  </div>
  {qr_html(qr)}
</section>"""


def filas_opciones(opciones):
    filas = []
    for o in opciones:
        rec = o.get("recomendada")
        filas.append(f"""
        <li class="opcion{' es-rec' if rec else ''}">
          {'<span class="rec">Recomendada</span>' if rec else ''}
          <div class="opcion-id">
            <p class="opcion-nombre">{esc(o['nombre'])}</p>
            <p class="opcion-sub">{esc(o['sub'])}</p>
          </div>
          <div class="opcion-precios">
            <p class="opcion-u"><span>Unidad</span>{o['unitario']}</p>
            <p class="opcion-t"><span>Total</span>{o['total']}</p>
          </div>
        </li>""")
    return "".join(filas)


def card_producto(p, qr):
    """Una sola card por pieza: ficha + opciones + recomendación."""
    nota = ('<p class="nota">%s</p>' % esc(p["nota"])) if p.get("nota") else ""

    if p.get("opciones"):
        precio = f"""
    <p class="eyebrow rot-op">Opciones</p>
    <ul class="opciones">{filas_opciones(p['opciones'])}</ul>"""
        razon = ('<p class="razon"><span>Por qué la recomendamos</span>%s</p>'
                 % esc(p["razon"])) if p.get("razon") else ""
    else:
        precio = f"""
    <div class="precio-unico">
      <div><p class="eyebrow">Precio por Unidad</p><p class="unitario-cifra">{p['unitario']}</p></div>
      <div><p class="eyebrow">Precio Total</p><p class="total-cifra">{p['total']}</p></div>
    </div>"""
        razon = ""

    return f"""
<section class="card">
  {foto_html(p['foto'], p.get('sangra'))}
  <div class="cuerpo">
    <p class="eyebrow">Línea {p['linea']} · {p['unidades']} unidades</p>
    <div class="reja">
      <div class="col-izq">
        <h2>{nombre_html(p['nombre'])}</h2>
        <p class="desc">{esc(p['descripcion'])}</p>
        <dl class="ficha">
          <dt>Gemas</dt><dd>{esc(p['gemas'])}</dd>
          <dt>Joya</dt><dd>{esc(p['joya'])}</dd>
          <dt>Cantidad</dt><dd class="cant">{p['unidades']} unidades</dd>
        </dl>
      </div>
      <div class="col-der">
        {sellos_html()}
        {qr_html(qr)}
      </div>
    </div>
    {precio}
    {razon}
    {nota}
  </div>
  {pie_html()}
</section>"""


def card_opciones(p, qr):
    filas = []
    for o in p["opciones"]:
        rec = o.get("recomendada")
        filas.append(f"""
        <li class="opcion{' es-rec' if rec else ''}">
          {'<span class="rec">Recomendada</span>' if rec else ''}
          <div class="opcion-id">
            <p class="opcion-nombre">{esc(o['nombre'])}</p>
            <p class="opcion-sub">{esc(o['sub'])}</p>
          </div>
          <div class="opcion-precios">
            <p class="opcion-u"><span>Unidad</span>{o['unitario']}</p>
            <p class="opcion-t"><span>Total</span>{o['total']}</p>
          </div>
        </li>""")
    razon = ('<p class="razon"><span>Por qué la recomendamos</span>%s</p>' % esc(p["razon"])) if p.get("razon") else ""
    return f"""
<section class="card card-opciones">
  {foto_html(p['foto'])}
  <div class="cuerpo">
    <p class="eyebrow">Línea {p['linea']} · Opciones</p>
    <h2 class="h2-op">{nombre_html(p['nombre'])}</h2>
    <p class="desc desc-op">{esc(p['descripcion'])}</p>
    <ul class="opciones">{''.join(filas)}</ul>
    {razon}
    <div class="op-cierre">{sellos_html()}{qr_html(qr)}</div>
  </div>
  {pie_html()}
</section>"""


def card_modulos(m, qr):
    filas = "".join(f"""
      <li class="opcion">
        <div class="opcion-id">
          <p class="opcion-nombre">{esc(f['nombre'])} <em>{f['cant']}</em></p>
          <p class="opcion-sub">{esc(f['sub'])}</p>
        </div>
        <div class="opcion-precios">
          <p class="opcion-u"><span>Unidad</span>{f['unitario']}</p>
          <p class="opcion-t"><span>Total</span>{f['total']}</p>
        </div>
      </li>""" for f in m["filas"])
    return f"""
<section class="card card-opciones">
  {foto_html(m['foto'])}
  <div class="cuerpo">
    <p class="eyebrow">Línea {m['linea']} · Composición</p>
    <h2 class="h2-op">{nombre_html(m['nombre'])}</h2>
    <p class="desc desc-op">{esc(m['descripcion'])}</p>
    <ul class="opciones">{filas}</ul>
    <div class="suma">
      <p class="eyebrow">Precio Total · módulos</p>
      <p class="suma-cifra">{m['total']}</p>
    </div>
    <div class="op-cierre">{sellos_html()}{qr_html(qr)}</div>
  </div>
  {pie_html()}
</section>"""


def card_resumen(qr):
    filas = "".join(f"""
      <li class="opcion">
        <div class="opcion-id">
          <p class="opcion-nombre">{esc(n)}</p>
          <p class="opcion-sub">{esc(s)} · {u} unidades</p>
        </div>
        <div class="opcion-precios">
          <p class="opcion-u"><span>Unidad</span>{pu}</p>
          <p class="opcion-t"><span>Total</span>{pt}</p>
        </div>
      </li>""" for n, s, u, pu, pt in RESUMEN)
    return f"""
<section class="card card-resumen">
  <div class="cuerpo">
    <p class="eyebrow">Cierre</p>
    <h2 class="h2-op">Resumen<br>del Plan</h2>
    <p class="desc desc-op">{UNIDADES_PLAN} unidades · una opción por línea. Las alternativas de cada producto no se suman.</p>
    <ul class="opciones">{filas}</ul>
    <div class="suma suma-grande">
      <p class="eyebrow">Precio Total del Plan</p>
      <p class="suma-cifra">{TOTAL_PLAN}</p>
    </div>
    <div class="op-cierre">{sellos_html()}{qr_html(qr)}</div>
  </div>
  {pie_html()}
</section>"""


# ─────────────────────────────────────────────────────────────────────────────
# Build
# ─────────────────────────────────────────────────────────────────────────────
def main():
    a = cargar_assets()
    qr = qr_svg(QR_URL)

    # Una card por pieza (las opciones van dentro, no en una card aparte).
    # La de módulos se queda suelta: es el desglose de la composición, no una alternativa.
    cards = [card_portada(qr)]
    for p in PRODUCTOS:
        cards.append(card_producto(p, qr))
        if p["key"] == "brazalete":
            cards.append(card_modulos(MODULOS, qr))
    cards.append(card_resumen(qr))

    css_tpl = open(os.path.join(ROOT, "scripts", "cotizacion.css"), encoding="utf-8").read()
    media = "\n".join(
        ".img-%s{background-image:url(%s)}" % (k, v)
        for k, v in a.items() if k not in ("cormorant", "montserrat", "logo", "sello1", "sello2", "sello3")
    )
    media += "\n.logo,.lamina-logo{background-image:url(%s)}" % a["logo"]
    for i in (1, 2, 3):
        media += "\n.sello.s%d{background-image:url(%s)}" % (i, a["sello%d" % i])
    fuentes = (
        "@font-face{font-family:'Cormorant';src:url(%s) format('woff2');font-weight:300 700;font-style:normal;font-display:block}\n"
        "@font-face{font-family:'Montserrat';src:url(%s) format('woff2');font-weight:100 900;font-style:normal;font-display:block}"
        % (a["cormorant"], a["montserrat"])
    )

    html = f"""<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex, nofollow">
<title>Cotización Soul · Tierra Mädre</title>
<style>
{fuentes}
{css_tpl}
/* ---- media incrustada ---- */
{media}
</style>
</head>
<body>
<div class="hoja">
{''.join(cards)}
</div>
</body>
</html>
"""
    with open(SALIDA, "w", encoding="utf-8") as f:
        f.write(html)
    print("→ %s  (%.2f MB, %d cards)" % (SALIDA, os.path.getsize(SALIDA) / 1024 / 1024, len(cards)))
    print("  QR → %s" % QR_URL)


if __name__ == "__main__":
    main()
