# Renacer — flujo QR aportador/beneficiario (diseño)

**Fecha:** 2026-08-25
**Estado:** diseño — listo para ejecutar Fase 0 (no-code) y planear Fase 1 (app delgada)
**Iniciativa:** REN-1 (Constructor)
**Alcance:** el flujo completo detrás del QR de la campaña Renacer, en dos fases. Este spec
NO es código: es el documento del que una sesión de ejecución construye Fase 0 y Fase 1 sin
reabrir ninguna decisión ya ratificada.
**Autor:** cosmos (arquitectura), como Performer. Perspectivas consultivas incorporadas por
sección: `rachel` (match/turno), `sophia` (consentimiento — **supliendo además la silla Legal
vacía, fuera de su charter**; cada llamado legal de este spec lo dice explícitamente), `kira`
(el fork de copy "¿Quieres ayudar?" / "Recibí una manilla").

**Fuentes normativas (decisiones RATIFICADAS — no se re-litigan aquí):**

- Anima · `Wings/Projects/TierraMadre/decisions/2026-08-21-kit-renacer-definicion-precio-y-alcance.md`
- Anima · `Wings/Projects/TierraMadre/decisions/2026-08-24-renacer-qr-flow-dador-receptor.md`
- Anima · `Wings/Projects/TierraMadre/decisions/2026-08-25-renacer-ux-flujos-aportador-beneficiario.md`
- Anima · `Wings/Projects/TierraMadre/diary/2026-08-25-transcripciones-completas-renacer.md` (contexto)
- `docs/wompi-setup.md` + `docs/superpowers/specs/2026-08-19-wompi-payment-rail-design.md` (el riel de pago)
- `GHL/00-INDICE-Y-MAPA.md` (la maquinaria GHL sobre la que monta Fase 0)
- `ORIGEN/apps/MVP/convex/schema.ts` (solo lectura — vocabulario CoomÜnity a espejar)

---

## 0 · Contexto y el único artefacto irreversible

Tras el terremoto de agosto 2026, la campaña Renacer ya está viva en público (momentum en
redes, una señora aliada, visita de campo en planeación) y **no tiene software detrás de su
QR**. La campaña es existencial para Tierra Mädre y es el embudo de entrada diseñado hacia
CoomÜnity — pero la narrativa pública **abre con el terremoto, nunca con CoomÜnity**
("no es el momento", ratificado 24-08).

**El QR impreso en cada estuche es lo único irreversible de todo el plan.** Los códigos
impresos sobreviven a toda decisión de software (riesgo medido 2026-08-24, de transcripción).
De ahí las dos reglas estructurales de este documento:

1. **La URL del QR se ratifica ANTES de imprimir un solo estuche** (§3.3 — la compuerta).
2. Todo lo demás es re-apuntable por diseño: el QR apunta a una URL nuestra, y lo que esa URL
   sirve cambia por fases sin tocar lo impreso. Textual del taller del 25-08: _"el QR va a ese
   link, sea lo que sea que se ponga en ese link"_.

---

## 1 · La cerca de alcance (LÉELA ANTES DE CONSTRUIR NADA)

La sala cercó esto **dos veces** (24-08 y 25-08). La cerca es un entregable de este spec, no
una sugerencia; una sesión futura que quiera reabrirla debe encontrarla aquí y detenerse.

**Renacer v1 NO incluye:**

- **Ni generaciones, ni economía de tokens, ni ETAPAs.** Textual: _"estamos habilitando un
  salón de community"_ — una antesala, no el juego real.
- **Ni cadenas virales de "paga por adelantado"** (que cada regalado compre para regalar):
  debatido largo el 25-08 y cerrado — _"otra película, otro momento"_. V1 es compra → data →
  luego invitación.
- **Ni matriz PIRP dador↔receptor** (roles que alternan): semilla conceptual de HARMONIA,
  diferida el 24-08. No se construye ahora.
- **Ni calculadora libre de kits**: se propuso y se **rechazó** (_"esa libertad de pensar —
  ahí se nos puede ir todo abajo"_). Son 4 kits fijos, cuadrícula de cuatro, punto (§4.2).
- **Ni catálogo completo de TM**: durante Renacer se venden solo manillas Colombia y dijes
  Colombia (_"esos dos productos, punto y pelota"_, 21-08).
- **Ni "donación" en ningún copy de cara al usuario.** Es una **compra** — TM no es fundación
  (21-08). Regla dura para todo texto de este flujo.

Lo que SÍ aplica de la tesis CoomÜnity: la perfilación (necesidades + capacidades) determina
la calidad del match, y la campaña embuda al producto real después, vía invitaciones
(Fase 3, §8.4) — _"ya jugaste la pruebita… ahora entra el juego real"_.

---

## 2 · Decisiones ratificadas — resumen normativo

| #   | Decisión                                                                                                                                                                 | Fuente           |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------- |
| 1   | **Roles: aportador** (nunca "donante"; reemplaza a dador/comprador hacia afuera) y **beneficiario**                                                                      | 25-08            |
| 2   | **Un código por kit** — ni por manilla, ni global. Si Juan compra 1+100, las 101 manillas llevan el código de Juan. **El código ES la relación aportador↔beneficiarios** | 24-08            |
| 3   | **Web primero, app después**: el QR aterriza en web; la app es el destino, la web la puerta                                                                              | 24-08            |
| 4   | **4 kits fijos: 1+1, 1+5, 1+10, 1+100** — cuadrícula, sin calculadora                                                                                                    | 25-08            |
| 5   | **Pasarela: Wompi** (coherente con solo-Wompi-y-Bre-B del 20-08). Se engancha al riel TM-PAGOS-APP ya vivo — no se inventa otro                                          | 25-08            |
| 6   | **Flujo beneficiario mediado en campo, no self-serve**: gestor comunitario → experiencia → entrega en presencia                                                          | 24/25-08         |
| 7   | **Necesidades ANTES que datos** (orden deliberado de la landing del beneficiario)                                                                                        | 25-08            |
| 8   | **Lista de necesidades abierta / texto libre**, con el video de contexto como encuadre — no categorías forzadas                                                          | 24-08            |
| 9   | **Carnet digital con QR propio y número** ("como la cédula") como incentivo y como identificador de entrega                                                              | 25-08            |
| 10  | **Regla de prioridad: turno** — FIFO dentro de tipo de necesidad (§9)                                                                                                    | 24-08            |
| 11  | **URL: dominio Tierra Mädre con ruta `/renacer`** — se debatió dominio propio (`community/helpme`) y ganó TM                                                             | 25-08            |
| 12  | **Internacional sin envíos, resuelto con narrativa**: la manilla propia del comprador de afuera se redirige a "alguien que te quiera mucho acá en Colombia"              | 25-08            |
| 13  | **Precio kit 1+1: $222.000 manillas / $333.000 dijes**; el kit incluye meditación (club/programa) + lista de música medicina + acceso a la plataforma                    | 21-08            |
| 14  | **Target: colombianos fuera de Colombia** y gente que ama a Colombia; primero a los propios, después a extraños                                                          | 21/24-08         |
| 15  | **Doctrina de tono**: todo lo público centra a los damnificados; abre con el terremoto, nunca con CoomÜnity                                                              | 24-08 (coom-tm2) |
| 16  | **Entrada a CoomÜnity por mérito**: se invita primero a aportadores (hicieron mérito); los beneficiarios no lo han hecho aún                                             | 25-08            |

Si alguna de estas parece equivocada a una sesión futura: se escribe en el Anexo de
Objeciones (§12) y se detiene ahí. No se rediseña alrededor.

---

## 3 · Semántica de códigos, QR y URLs

### 3.1 El código de kit

- **Un código por kit comprado.** Todas las manillas del kit (la propia + las N donadas)
  llevan el mismo código en su estuche. Ejemplo de la sala: código 666 → 10 manillas, 8
  registradas.
- El código es la **relación** aportador↔beneficiarios: quien escanea y se registra con el
  código X queda vinculado al kit X, y por él al aportador de X. No hace falta ninguna tabla
  de "relación" adicional: `kit.codigo` en el registro del beneficiario ES el vínculo.
- Kit distinto → código distinto, incluso del mismo comprador.

**Formato propuesto (se ratifica en la compuerta de §3.3, junto con la URL):**
numérico corto, legible y dictable por teléfono — 3 a 4 dígitos como en los ejemplos de la
sala (666, 111), emitido secuencialmente desde un registro único (§7.3). Sin letras
ambiguas, sin checksums que compliquen el campo. El código va impreso también en texto bajo
el QR (si el QR falla, el beneficiario lo teclea o lo dicta al facilitador).

### 3.2 Los dos QR del sistema

| QR                | Dónde vive                                                                       | URL                                          | Quién lo escanea                                               |
| ----------------- | -------------------------------------------------------------------------------- | -------------------------------------------- | -------------------------------------------------------------- |
| **QR de estuche** | impreso en cada estuche de manilla                                               | `https://tierramadre.app/renacer/k/{codigo}` | el beneficiario (o el aportador con su manilla propia)         |
| **QR de carnet**  | generado en pantalla al completar el registro (§6, paso 6) — digital, no impreso | `https://tierramadre.app/renacer/b/{numero}` | staff/facilitadores en entregas de ayuda ("¿dónde y a quién?") |

El QR de carnet no es bloqueante de imprenta (es digital); el de estuche sí.

### 3.3 🚧 LA COMPUERTA: esquema de URL re-apuntable — ratificar ANTES de imprimir

**Ningún estuche se imprime hasta que Kevin ratifique este bloque tal cual (o su corrección).**
Esto es lo único del plan que no tiene vuelta atrás.

**Propuesta concreta:**

- **Dominio:** `tierramadre.app` — ya es el dominio de producción del proyecto Vercel
  `tierra-madre-studio` (verificado: `CLAUDE.md` § Vercel Deployment y `APP_URL` en el env de
  prod documentado). No se compra dominio nuevo; la decisión 25-08 ya eligió Tierra Mädre
  sobre un dominio propio de campaña.
- **Capa de rutas bajo `/renacer`:**
  - `https://tierramadre.app/renacer` — la puerta: el fork de dos botones
    (_"¿Quieres ayudar?"_ / _"Recibí una manilla — soy beneficiario"_, textual del 24-08).
  - `https://tierramadre.app/renacer/k/{codigo}` — **la URL que se imprime en los QR de
    estuche.** Aterriza directo en el flujo beneficiario con el código ya resuelto.
  - `https://tierramadre.app/renacer/ayudar` — entrada del aportador para RRSS/pauta (no va
    impresa; puede cambiar sin costo).
  - `https://tierramadre.app/renacer/b/{numero}` — el carnet del beneficiario.
- **Capa de re-apuntado:** redirects/rewrites del proyecto Vercel (`vercel.json` de
  `tierra-madre-studio`), que ya sirve ese dominio.
  - **Fase 0:** `/renacer/k/:codigo` → redirect 307 al form GHL con el código en query
    (`?codigo=…` prefill). `/renacer` → landing de campaña (página del funnel GHL o página
    estática en la web TM).
  - **Fase 1:** los mismos paths pasan de redirect a servir la app delgada (rewrite o ruta
    propia). **Lo impreso no cambia jamás; cambia solo el destino del redirect.**
- **Regla de estabilidad:** los paths `/renacer/k/*` y `/renacer/b/*` son **contratos
  permanentes** desde el momento de la ratificación. Se documentan como tales en el
  `vercel.json` con comentario que apunte a este spec.

**Por qué 307 y no una página con JS:** el redirect en el edge no exige que la app cargue,
funciona en cualquier navegador de gama baja en campo, y no deja rastro cacheable de la URL
destino (un 308/301 cachearía el destino de Fase 0 en teléfonos que volverán a escanear en
Fase 1).

---

## 4 · Flujo aportador — end-to-end (ratificado 25-08)

> Copy: carril `kira`. Regla de hierro en cada pantalla: **lenguaje de compra, jamás
> "donación"**; el relato abre por el terremoto y los damnificados, nunca por CoomÜnity.
> Anti-instrumentalismo (Andrés, 25-08): sin matiz esotérico de la esmeralda en la venta —
> la conexión con la piedra vive en la experiencia, no en el copy comercial.

1. **Entrada:** publicación en redes (con pauta) o link enviado por un amigo →
   `tierramadre.app/renacer/ayudar` (o el fork de `/renacer`, botón _"¿Quieres ayudar?"_).
2. **Video de contexto** — el poder de ayudar. (El video está decidido, no producido — abierto
   §11.c.)
3. **Los 4 kits fijos, en cuadrícula: 1+1 · 1+5 · 1+10 · 1+100.** Sin calculadora (cerca §1).
   Precio 1+1: $222.000 manillas / $333.000 dijes (21-08). Los precios de 1+5/1+10/1+100 no
   aparecen ratificados en las decisiones curadas — abierto §11.d, se resuelve antes de
   publicar la cuadrícula.
4. **Checkout: Wompi**, por el riel existente (§5). Captura de datos **obligatoria en el
   checkout** (24-08): nombre, celular, email — el riel ya la exige (§5.2).
5. **Confirmación de compra:** se muestra **el código del kit** — "este código viaja con tus
   manillas; con él vas a ver a quién le llegaron". El código y las instrucciones también van
   por WhatsApp/email (GHL).
6. **Post-pago, dos botones:**
   - **"Estar informado"** — el aportador elige canal: grupo de WhatsApp / newsletter /
     notificaciones.
   - **"Enlistar mis capacidades"** — poner capacidades a disposición (mismo vocabulario que
     el flujo beneficiario, §8.3).
7. **Muro del aliento:** el espejo del muro de desahogo — los aportadores dejan mensajes de
   aliento a los beneficiarios.
8. **Internacional:** sin envíos al exterior, nunca (21-08). Narrativa ratificada 25-08: _"una
   manilla para alguien que te quiera mucho (acá en Colombia) y otra para quien la necesita"_.
   El checkout internacional pide el contacto local del regalo redirigido. **Local:** entrega
   en perímetro urbano de Cali o a un familiar; el costo de envío nacional está sin decidir
   (abierto §11.b).
9. **Visibilidad del aportador sobre sus beneficiarios:** **progreso agregado por defecto**
   ("8 de tus 10 manillas ya fueron registradas"); identidades solo con consentimiento
   explícito del beneficiario (§10.3). La activación en la app es opcional e incentivada
   justamente por esa visibilidad (24-08).

---

## 5 · Enganche al riel de pago (TM-PAGOS-APP) — no se inventa otro

El riel Wompi está **vivo**: cobró por primera vez el 2026-08-23 (echo TM-PAGOS-APP en el
Constructor) y `main` volvió a ser desplegable el 2026-08-24 (entrada superior de
`docs/estado-sesiones.md`). Renacer se monta sobre él.

### 5.1 Qué se reutiliza

- `api/_lib/wompi.ts` — `buildCheckoutUrl()` (Web Checkout firmado) + `fetchTransaction()`.
- `api/wompi-webhook.ts` — checksum + reconsulta de la transacción; nunca confía en el body.
- `convex/ghl.ts` — `createOrder` / `markOrderPaid`.
- El patrón de proxy de confianza de `api/checkout-create-order.ts` (el endpoint guarda
  `ADMIN_SYNC_TOKEN`; la mutation sigue protegida).

**Archivos congelados para REN-1** (dueño: TM-PAGOS-APP / conductor): todo lo anterior. Este
spec no los modifica; si Fase 1 necesita un endpoint propio, se añade UNO nuevo
(`api/renacer-create-order.ts` o equivalente) al lado, sin tocar los existentes.

### 5.2 Datos del comprador: verificado en el código (2026-08-25)

Afirmación del 25-08 en sala: "no estoy seguro de que tengamos acceso a los datos personales
de las personas que nos compran". **Verificado parcialmente por lectura de código
(2026-08-25, método: lectura de `api/checkout-create-order.ts` y `api/_lib/wompi.ts`):**

- El riel propio **captura los datos ANTES de Wompi**: `parseCheckoutBody` exige
  `contact.{celular, full_name, email}` y `createOrder` los persiste en Convex junto a la
  venta. Wompi solo recibe un prefill opcional (`customer-data:*` en la URL del checkout).
- `fetchTransaction()` mapea de la respuesta de Wompi únicamente
  `id/status/reference/amount_in_cents/currency/payment_method_type` — **el riel actual no
  lee ningún dato de comprador DESDE Wompi** (método: lectura del tipo `WompiTransaction` y
  del mapeo, `api/_lib/wompi.ts:130-137`).

**Conclusión de diseño: Renacer NO depende de que Wompi exponga datos del comprador — el
checkout propio los captura y los guarda.** Lo que queda sin verificar (y ya no bloquea):
si el dashboard/API de Wompi además los expone (§11.a).

### 5.3 El filo G3: `skip_limit` — requisito de diseño para Renacer

`api/checkout-create-order.ts` llama `createOrder` con `skip_limit: true` (verificado por
lectura del archivo, línea 112, 2026-08-25): el riel público **no tiene techo de monto**, y
el escudo es Vercel WAF + BotID, no código. Para Renacer esto se convierte en requisito:

- **El checkout Renacer solo acepta los 4 kits fijos.** El servidor valida el kit contra una
  tabla propia de {kitId → precio fijo}; **ningún monto ni cantidad viene del cliente**. Con
  4 SKUs de precio fijo, el problema del monto arbitrario no existe en este flujo — pero solo
  si el endpoint lo hace cumplir, no la UI.
- Prohibido reusar el carrito libre para kits: la cuadrícula de 4 llama a un path de orden
  que no expone `items[]` arbitrarios.

**Estado del canal a hoy (2026-08-25):** `POST /api/checkout-create-order` responde 403 desde
el edge — el WAF mantiene el canal de pago bloqueado a propósito (método: entrada
2026-08-24 18:20 de `docs/estado-sesiones.md`, control con curl tras el deploy hecho por esa
sesión; este spec no lo re-midió). Abrir el canal + cutover a llaves `prod_` son
prerequisitos operativos del lanzamiento aportador y pertenecen a TM-PAGOS-APP, no a REN-1.

---

## 6 · Flujo beneficiario — end-to-end (ratificado 24/25-08)

**Parte operativa (no es software, pero el software la asume):**

1. **Contactar gestores comunitarios** (líderes/amigos con entrada real: Pablo, Michel).
   Enfáticos: sin un insider no pasa nada.
2. **Reunión en territorio → experiencia de activación**: sensorial, emocional, ancestral.
   Mínimo: respiración consciente + escucha (círculo de la palabra — _"la medicina de la
   escucha"_). Facilitadores con selección cuidadosa — consigna: que no sea "manoseo de la
   comunidad".
3. **Entrega de la manilla SOLO en presencia**, al cierre de la experiencia.

**Parte digital (lo que este spec construye):**

4. **Scan del QR de estuche** → `tierramadre.app/renacer/k/{codigo}` → video de contexto
   (bienvenida). Quien llega a `/renacer` sin código toma el botón _"Recibí una manilla —
   soy beneficiario"_ y teclea el código impreso.
5. **Necesidades PRIMERO, datos DESPUÉS** (orden deliberado, no negociable). Lista de
   necesidades **abierta, texto libre**, con el video como encuadre. Cada necesidad: qué
   necesito + por qué importa (mismo par que el vocabulario CoomÜnity, §8.3).
6. **Datos + carnet:** al terminar la lista se piden los datos mínimos con su razón dicha al
   usuario — _"¿dónde te llevamos la ayuda?"_: **login con Google + nombre, ubicación/
   dirección, edad, género** (justificación logística; minimización §10.4). Al completar, se
   arma en pantalla el **carnet digital con su QR propio y su número** (ej. 111) — "como la
   cédula": el incentivo para completar y el identificador para recibir ("¿dónde y a quién?").
7. **Botón opcional "Quiero enlistar mis capacidades"** — narrativa: poner mis capacidades a
   disposición para ayudar a otros.
8. **Mapa de la Tribu:** ver necesidades de otros y **sumarse con "+1"** a una necesidad.
9. **Entorno:** playlists (meditaciones, respiraciones conscientes, música medicina) +
   **muro de desahogo**. Encuadre honesto de la sala: la app sirve, en el fondo, para
   _esperar organizadamente las noticias de la ayuda_ — el diseño no promete más que eso.

> Consentimiento habeas data en el punto de entrega, ANTES del registro digital: §10.1.

---

## 7 · Fase 0 — no-code, esta semana (la campaña no espera al software)

**Principio (TM-24-AGOS, 24-08):** _"pensemos cómo es esto en un formulario de Google… si lo
tenemos plasmado en Excel, plasmarlo bonito en la aplicación es muy fácil"_. Fase 0 es ese
Excel bien diseñado detrás de las URLs definitivas.

### 7.1 Secuencia

1. **Ratificar la compuerta §3.3** (Kevin). Configurar los redirects en `vercel.json` de
   `tierra-madre-studio`. Recién entonces se puede mandar a imprenta.
2. **Landing `/renacer`** con el fork de dos botones — página del funnel GHL o página
   estática en la web TM (decisión de ejecución; ambas viven detrás del redirect, así que es
   reversible).
3. **Flujo beneficiario Fase 0:** form GHL (los forms/funnels se arman en la UI de GHL —
   `GHL/00-INDICE-Y-MAPA.md` marca qué es ✋ manual y qué 🤖 API; los custom fields se crean
   por API). El form respeta el orden ratificado: video embebido → necesidades (texto libre,
   repetible) → datos mínimos → pantalla final con su número asignado. WhatsApp (bot María /
   plantillas Meta) como canal de seguimiento.
4. **Flujo aportador Fase 0:** la cuadrícula de 4 kits en la web TM cobrando por el riel
   Wompi existente (§5), con los kits como productos de precio fijo. Si el canal público
   sigue tras el WAF al momento del lanzamiento, el fallback operativo es el riel del bot
   (`ghl-create-order`, autenticado, que conserva su techo) operado por staff vía WhatsApp.
5. **Emisión de códigos por kit:** manual o script pequeño (§7.3).

### 7.2 Formato de captura — diseñado para no botar nada en Fase 1

Regla: **cada campo del form Fase 0 lleva el nombre del campo Fase 1 que lo va a heredar**
(tabla §8.3). Nada de "luego lo mapeamos": el mapeo ES el diseño del form.

Captura beneficiario (custom fields GHL / columnas de la hoja):

| Campo Fase 0                                                  | Campo Fase 1 (tabla.campo)                                                                   |
| ------------------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| `codigo_kit` (del query param del redirect)                   | `beneficiaries.kitCode`                                                                      |
| `necesidad_texto` (una fila por necesidad)                    | `needs.whatINeed`                                                                            |
| `necesidad_porque`                                            | `needs.whyItMatters`                                                                         |
| `fecha_registro_necesidad` (timestamp, lo pone el sistema)    | `needs.createdAt` — **es el turno FIFO; no se pierde jamás**                                 |
| `nombre` / `email_google` / `ubicacion` / `edad` / `genero`   | `beneficiaries.*`                                                                            |
| `numero_carnet` (asignado secuencial)                         | `beneficiaries.cardNumber`                                                                   |
| `consentimiento_habeas_data` (sí + timestamp + quién asistió) | `beneficiaries.habeasDataAcceptedAt`                                                         |
| `consentimiento_visibilidad_aportador` (default NO)           | `beneficiaries.donorVisibilityConsent`                                                       |
| `capacidad_texto` (opcional, repetible)                       | `capacities.title/description`                                                               |
| `registro_asistido_por` (facilitador, si aplica)              | `beneficiaries.assistedBy` — la mitigación de equidad (§9) queda registrada desde el día uno |

Captura aportador: la que ya exige el riel (`contact.{celular, full_name, email}`) + `kit_tipo`
(1+1/1+5/1+10/1+100), `canal_informado` (whatsapp/newsletter/notificaciones), `capacidad_texto`
opcional, `contacto_regalo_local` (solo internacional).

### 7.3 Registro de códigos (la tabla madre)

Una hoja/tabla única, dueño staff, una fila por kit vendido:

`codigo · kit_tipo · saleId (Convex) · aportador (nombre/contacto) · fecha_pago ·
manillas_total · manillas_registradas · estado (emitido/impreso/entregando/cerrado)`

- El código se emite **al confirmar el pago** (webhook → venta `confirmada`), secuencial
  desde esta tabla. Manual al principio; un script pequeño si el volumen lo pide.
- `manillas_registradas` se actualiza contando registros de beneficiario con ese
  `codigo_kit` — es el dato de la visibilidad agregada del aportador (§4.9).
- Esta tabla es la semilla de `kits` en Fase 1 (§8.3): mismas columnas, mismos nombres.

**Cerca de Fase 0:** este spec NO ejecuta nada de lo anterior — ni config de GHL en vivo, ni
redirects, ni impresión, ni QRs generados. La sesión de ejecución de Fase 0 recibe su propio
hand-off del conductor.

---

## 8 · Fase 1 — la app Renacer delgada

### 8.1 Colocación (decisión C ratificada 24-08 + línea roja Convex)

- App standalone delgada (React/Vite como el resto de la casa), **Convex propio en un team
  sandbox o deployment nuevo**. **Línea roja (convex-load-safety): CERO carga de campaña
  sobre el team Skyline canónico del MVP.** Tampoco sobre `valuable-mule-753` (el Convex de
  producción de TM): la campaña no comparte deployment con el inventario de esmeraldas.
- El MVP CoomÜnity (opción B) queda **vetado para v1**: producto vivo post-GEN0, gates de
  consentimiento beta, y usuarios de campaña contaminarían cohortes GEN (24-08).
- Este spec **no crea** proyectos ni teams de Convex — eso es un acto de la sesión de
  ejecución de Fase 1, con su propio hand-off.

### 8.2 Pantallas

**Beneficiario:** `/renacer/k/{codigo}` → (1) video, (2) composer de necesidades (texto libre,
"agregar otra"), (3) datos + login Google, (4) carnet (QR + número, guardable), (5) mis
capacidades (opcional), (6) mapa de la Tribu (necesidades de otros, botón "+1"), (7) entorno
(playlists + muro de desahogo).

**Aportador:** `/renacer/ayudar` → (1) video, (2) cuadrícula 4 kits, (3) checkout Wompi
(riel §5), (4) confirmación con código de kit, (5) estar informado + capacidades, (6) panel
"mis manillas" (progreso agregado: N registradas de M), (7) muro del aliento.

### 8.3 Modelo de datos — vocabulario CoomÜnity (el export de Fase 3 es un rename, no una migración)

Espejo deliberado de `ORIGEN/apps/MVP/convex/schema.ts` (leído 2026-08-25, solo lectura):

| Tabla Renacer          | Campos clave                                                                                                                                  | Espejo en MVP CoomÜnity                                                                                       |
| ---------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| `beneficiaries`        | `name, email, googleId, ubicacion, edad, genero, kitCode, cardNumber, habeasDataAcceptedAt, donorVisibilityConsent, imageConsent, assistedBy` | `players` (`name, email, googleId, invitationId`)                                                             |
| `kits`                 | `code, tipo (1+1\|1+5\|1+10\|1+100), saleId, aportadorContact, manillasTotal, manillasRegistradas, estado`                                    | no tiene espejo (es la relación de campaña); `saleId` ancla al riel TM                                        |
| `needs`                | `reporterId, whatINeed, whyItMatters, status (open\|resolved), createdAt, supportCount`                                                       | `marketWishlistNeeds` (`reporterId, whatINeed, whyItMatters, status, createdAt`) — mismos nombres a propósito |
| `needSupports`         | `needId, playerId, createdAt` (el "+1" del mapa)                                                                                              | agregación estilo `marketNeeds.requestCount`                                                                  |
| `capacities`           | `providerId, title, description, category?, isActive`                                                                                         | `listings` (`providerId, title, description, category, isActive`)                                             |
| `matches` (Fase 2)     | `needId, providerId, status, matchedAt`                                                                                                       | `marketMatches` (`listingId, consumerId, providerId, status, matchedAt`)                                      |
| `invitations` (Fase 3) | `recipientName, recipientEmail, status (pending\|accepted\|expired), shareToken, invitedBy, sentAt, expiresAt`                                | `invitations` — mismos nombres y estados                                                                      |
| `wallMessages`         | `wall (desahogo\|aliento), authorId, body, createdAt, hiddenAt?`                                                                              | sin espejo directo; moderación mínima (ocultar) desde el día uno                                              |

Reglas heredadas del MVP que se adoptan tal cual:

- **Consentimiento fail-closed**: campo ausente = NO consentido, nunca `!== false` (patrón
  documentado en `invitations.allowProfilingByInvitee` del MVP). Aplica a
  `donorVisibilityConsent` e `imageConsent`.
- `needs.createdAt` es el orden del turno (§9) — se importa desde `fecha_registro_necesidad`
  de Fase 0 sin pérdida.

### 8.4 Fase 2 y 3 (solo dirección, no alcance de este spec)

- **Fase 2:** dashboard de operaciones para soluciones estructurales + despacho por turno;
  visibilidad del aportador según consentimiento.
- **Fase 3:** embudo al MVP CoomÜnity como cohorte GEN vía export/import (la tabla §8.3 hace
  el export un rename). Criterio ratificado 25-08: **se invita primero a aportadores** (mérito
  demostrado); el puente es el **filtro de invitaciones** ("si yo la cago, cago al que me
  invitó"), sobre la maquinaria de consentimiento propia de CoomÜnity.

### 8.5 Re-apuntado

El paso Fase 0 → Fase 1 es UN cambio en `vercel.json`: `/renacer/k/:codigo` deja de
redirigir al form GHL y pasa a servir la app. Los QR impresos no se enteran. La data de
Fase 0 se importa con el mapeo §7.2 **antes** del cambio de redirect, y el form GHL queda
congelado (no borrado) como respaldo.

---

## 9 · Turno: la regla de despacho — carril `rachel`

**Regla ratificada (24-08):** **FIFO dentro de cada tipo de necesidad** — primero en
registrarse, primero servido. Cuando se organiza una solución estructural (ej.: 20 camiones
de trasteo), el despacho sigue el orden de registro (`needs.createdAt`) de las necesidades de
ese tipo. Con la lista abierta (sin categorías forzadas), el "tipo" lo agrupa operaciones al
armar cada solución estructural — el timestamp individual de cada necesidad es lo que hace
ese agrupamiento despachable en orden.

**⚠️ Riesgo de equidad — medido 2026-08-24 (de transcripción, cola ítem 4):** el FIFO
favorece sistemáticamente a los más conectados digitalmente; los más vulnerables (sin
teléfono, sin datos, mayores) se registran de últimos o nunca.

- **Ratificado para v1** con mitigación: **registro asistido en campo** — los facilitadores
  registran en el momento de la entrega a quien no puede hacerlo solo, y el campo
  `assistedBy` (§7.2) lo deja medible: si el % de registros asistidos es bajo en una
  comunidad con baja conectividad, la mitigación no está funcionando.
- **Fecha de revisión:** antes de despachar la **primera solución estructural** (o al cierre
  de la primera visita de campo, lo que ocurra primero) se revisa la distribución de
  `createdAt` vs `assistedBy` y se decide si el FIFO necesita corrección (p. ej. cola por
  comunidad en vez de global).

---

## 10 · Consentimiento y PII — carril `sophia`

> **⚖️ Silla Legal vacía:** todo lo de esta sección que tenga forma de llamado legal está
> marcado **[PENDIENTE revisión legal real — sophia supliendo la silla Legal, fuera de su
> charter]**. Nada de esto es asesoría jurídica; es el diseño que una revisión legal debe
> confirmar o corregir antes del copy público.

1. **Habeas data (Ley 1581 de 2012) en el punto de entrega.** El consentimiento se recoge
   **en presencia**, guiado por el facilitador, ANTES del registro digital: qué datos se
   toman, para qué (logística de ayuda), quién los ve, cómo se borran. Se registra con
   timestamp (`habeasDataAcceptedAt`) y, si el registro fue asistido, quién asistió. En Fase
   0 esto vive como campo del form; el texto exacto del aviso **[PENDIENTE revisión legal
   real — sophia supliendo, fuera de charter]**.
2. **Menores excluidos de imágenes.** Ninguna foto de menores en lo que ven los aportadores
   ni en material de campaña. La instrucción "le tomemos una foto" del 24-08 queda
   condicionada a consentimiento explícito del adulto fotografiado (`imageConsent`,
   fail-closed) — **[PENDIENTE revisión legal real — sophia supliendo, fuera de charter]**.
3. **Visibilidad del aportador: agregado por defecto.** El aportador ve progreso agregado
   ("8 de 10 registradas"); **identidades solo con consentimiento explícito del
   beneficiario** (`donorVisibilityConsent`, default NO, fail-closed). Resuelve el abierto
   del 24-08 ("si queremos que le aparezcan, lo hacemos") del lado conservador.
4. **Minimización de datos:** nombre, ubicación/dirección, edad, género + login Google —
   nada más. Justificación operativa de cada campo: la entrega física de ayuda ("¿dónde te
   llevamos la ayuda?"). Google login: identidad estable sin inventar un sistema de
   contraseñas para población en emergencia. Datos que NO se piden: documento de identidad,
   ingresos, estado del inmueble, composición familiar — si operaciones los llega a
   necesitar para una solución estructural, se piden en ese momento y para ese fin.
5. **Encuadre compra vs donación** (21-08: es compra, TM no es fundación) y el cierre dicho
   en sala **"no es pirámide, es multinivel"** (24-08): ambos son exactamente el tipo de
   frase que una revisión legal tiene que mirar antes de cualquier copy público —
   **[PENDIENTE revisión legal real — sophia supliendo, fuera de charter]**. El spec adopta
   mientras tanto la regla dura: lenguaje de compra en todo lo user-facing, y ninguna
   promesa de retorno o beneficio en cadena (la cerca §1 ya excluye las cadenas).

---

## 11 · Preguntas abiertas — cada una con fecha medida y dueño

| #   | Pregunta                                                              | Estado y método                                                                                                                                                                                                                                                                                                                            | Medido     | Dueño                       |
| --- | --------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------- | --------------------------- |
| a   | ¿Wompi expone los datos personales del comprador (dashboard/API)?     | **Parcialmente resuelta por diseño:** el riel propio captura y guarda el contacto antes de Wompi, así que Renacer no depende de esa exposición (método: lectura de `api/checkout-create-order.ts` y `api/_lib/wompi.ts`, §5.2). Lo que Wompi expone o no en su dashboard sigue **SIN VERIFICAR** — nadie lo ha mirado con acceso al panel. | 2026-08-25 | Kevin (acceso al dashboard) |
| b   | Costo de envío nacional para aportadores locales                      | Sin decisión — contraentrega/interrapidísimo mencionados en sala, nada elegido (método: decisión 25-08, sección "Abiertos nuevos"). Regla vigente 21-08: entrega en perímetro urbano de Cali o familiar; el resto paga aparte.                                                                                                             | 2026-08-25 | Kevin / operaciones         |
| c   | Videos de contexto (landing beneficiario y aportador)                 | Existen como decisión, no como asset — no hay guion aprobado ni pieza producida (método: decisión 25-08).                                                                                                                                                                                                                                  | 2026-08-25 | kira / producción           |
| d   | Precio de los kits 1+5, 1+10 y 1+100                                  | El 1+1 está ratificado ($222.000 manillas / $333.000 dijes, 21-08). Para los otros tres **no aparece precio en ninguna de las tres decisiones curadas** (método: lectura completa de las notas del 21, 24 y 25-08 en Anima). La aritmética "N × precio unitario" es plausible pero NO está ratificada.                                     | 2026-08-25 | Kevin                       |
| e   | Formato exacto del código de kit y arranque de la secuencia           | Propuesto en §3.1; se ratifica junto con la compuerta de URL §3.3.                                                                                                                                                                                                                                                                         | 2026-08-25 | Kevin (misma compuerta)     |
| f   | Apertura del WAF sobre el checkout público + cutover a llaves `prod_` | Prerequisito del lanzamiento aportador; pertenece a TM-PAGOS-APP (compuertas G1–G5), no a REN-1. Estado 403 verificado por la sesión del 2026-08-24 (método: §5.3).                                                                                                                                                                        | 2026-08-25 | conductor / TM-PAGOS-APP    |

---

## 12 · Anexo: Objeciones

Ninguna de las decisiones ratificadas se objeta. Dos observaciones de arquitectura que NO
son objeciones (no piden reabrir nada; refinan la ejecución dentro de lo decidido):

1. (`cosmos`) La "lista de necesidades abierta / texto libre" (24-08) convive con el "turno
   FIFO dentro de tipo de necesidad": sin categorías, el "tipo" solo existe cuando
   operaciones agrupa. §9 lo resuelve sin re-litigar (el timestamp es sagrado; el
   agrupamiento es operativo) — se deja dicho para que la sesión de Fase 2 no lo descubra
   tarde.
2. (`cosmos`) El filo `skip_limit` del riel público no se "arregla" desde REN-1 (archivo
   congelado, dueño TM-PAGOS-APP); REN-1 lo **esquiva por diseño** con los 4 kits de precio
   fijo validados en servidor (§5.3).

---

## 13 · Verificación — método de cada afirmación cargada

Doctrina: toda afirmación negativa lleva el método que la estableció; toda medida lleva fecha.

| Afirmación                                                                                        | Método                                                                                                                                                         |
| ------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| La rama `docs/renacer-qr-flow-spec` y el worktree `renacer-spec` no existían antes de esta sesión | `git branch --list 'docs/renacer*' --all` (vacío) y `git worktree list` (sin `renacer-spec`), 2026-08-25                                                       |
| El riel actual no lee datos de comprador desde Wompi                                              | lectura de `api/_lib/wompi.ts` (mapeo de `fetchTransaction`, líneas 130-137), 2026-08-25                                                                       |
| El riel público no tiene techo de monto (`skip_limit: true`)                                      | lectura de `api/checkout-create-order.ts` línea 112, 2026-08-25                                                                                                |
| El checkout público responde 403 (WAF)                                                            | NO re-medido por esta sesión — reportado por la entrada 2026-08-24 18:20 de `docs/estado-sesiones.md` (esa sesión lo controló con curl tras su deploy)         |
| Los precios de kits 1+5/1+10/1+100 no están ratificados                                           | lectura completa de las decisiones del 21, 24 y 25-08 en Anima, 2026-08-25 — ausencia en las tres                                                              |
| `tierramadre.app` es el dominio de producción del proyecto Vercel                                 | `CLAUDE.md` del repo (§ Vercel Deployment, `APP_URL`) — NO verificado contra el dashboard de Vercel en esta sesión                                             |
| Wompi cobró por primera vez el 08-23 y `main` es desplegable desde el 08-24                       | echos TM-PAGOS-APP del Constructor + entrada superior de `estado-sesiones.md`; afirmaciones de esas sesiones, no re-medidas aquí                               |
| Vocabulario CoomÜnity espejado (§8.3)                                                             | lectura de `ORIGEN/apps/MVP/convex/schema.ts` (tablas `invitations`, `players`, `listings`, `marketMatches`, `marketNeeds`, `marketWishlistNeeds`), 2026-08-25 |
