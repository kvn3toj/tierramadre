# Tracking de inversiones · Mejores prácticas y mejoras de UI

**Tierra Mädre — simulador de crowdfunding con respaldo** · Investigación web, agosto 2026

---

## Lo que dice la industria (síntesis)

**1 · El hero correcto es el estado, no el saldo.** Cuando hay una operación viva, plataformas como Wise ponen de héroe el *estado de lo pendiente* ("tu transferencia va en camino"), no el balance. Nuestro "Hoy recibirías $X" va en esa línea — le falta decir *qué sigue y cuándo*.

**2 · Framing emocional del riesgo.** Los mejores dashboards recontextualizan en vez de asustar: en momentos planos destacan el capital protegido y el progreso hacia la meta, no la cifra fría. Con un piso garantizado del 110%, Tierra Mädre tiene el mejor argumento emocional posible — hay que *dibujarlo*, no solo decirlo.

**3 · Goal gradient: la meta visible acelera el compromiso.** Barras de progreso hacia una meta concreta ("74% del camino al objetivo") activan el efecto goal-gradient; celebrar hitos pequeños libera dopamina y sostiene el interés durante esperas largas.

**4 · Esperas largas = tracker estilo Domino's/Amazon.** Para procesos de semanas o meses, el patrón ganador es el rastreador por etapas con *fecha estimada del siguiente hito* y notificación al cruzarlo. Un tracker que "no se mueve" se percibe como congelado: siempre debe haber un próximo evento anunciado.

**5 · Los inversionistas esperan historial completo y updates predecibles.** En portales de inversión inmobiliaria/alternativa: porcentaje de propiedad, historial de aportes, estado de distribuciones, documentos (certificados, contratos) y comunicación regular — el 38% de las firmas reporta *semanalmente*, y "sin novedades" también es un update. La honestidad ante problemas (qué pasó + qué estamos haciendo) es el mayor generador de confianza.

**6 · Señales de confianza explícitas.** Microcopy que explica el porqué, respaldos verificables a un toque, cero costos ocultos, y fricción deliberada en acciones de alto riesgo (confirmaciones) — la fricción bien puesta *aumenta* la confianza.

**7 · Actividad de mercado como prueba social.** En UX de subastas: contador de seguidores/watchlist, actividad de pujas y cuenta regresiva a la próxima subasta crean anticipación y demanda percibida. Ya mostramos coleccionistas y pujas; falta el countdown.

**8 · Accesibilidad e independencia del color** (icono + texto junto a cada estado), revelación progresiva (esencial primero, detalle bajo demanda) y carga instantánea sin saltos. El DS3 ya exige casi todo esto.

---

## Mejoras priorizadas para nuestra UI

### Quick wins (en el simulador, 1–2 días)

**A. Piso garantizado dibujado en la gráfica.** Banda sombreada bajo la línea del 110% con etiqueta "tu capital protegido". El argumento comercial #1, hoy invisible en el chart. *(práctica 2)*

**B. Barra "camino al objetivo" bajo el número grande.** Un meter fino: avalúo → reserva → objetivo, con el punto actual. Micro-celebración (pulso + mensaje del ticker) al cruzar la reserva. *(práctica 3)*

**C. Próximo hito con fecha estimada.** Bajo el stepper: "Siguiente: Subasta 2 · ~3 semanas" y countdown en días cuando falte poco. Nada de esperas mudas. *(prácticas 1 y 4)*

**D. Historial completo en una hoja (sheet DS3).** El ticker muestra el último evento; al tocarlo se abre el historial completo con fechas — los inversionistas esperan poder auditar todo. *(práctica 5)*

**E. Chips de respaldo verificables.** Fila compacta: `GIA ✓ · Avalúo USA ✓ · Seguro 110% ✓ · Gema física`. Cada chip abre una línea de detalle (en el real: el documento). *(práctica 6)*

### Segunda ola (simulador o inicio del real)

**F. "¿Cómo se calcula?" bajo demanda.** El desglose del pago (precio − comisión − participación 50%) que quitamos por minimalismo vuelve como sheet opcional — revelación progresiva, no ruido. *(prácticas 6 y 8)*

**G. Benchmark contextual.** Una línea: "tu +21% vs ~10% de un CDT en el mismo periodo" — hace tangible el rendimiento para el NSE alto no-financiero. *(práctica 2)*

**H. Mi historial de aportes.** Vista "mi dinero": aportado → ganancia proyectada → pago → aporte social, con fechas. *(práctica 5)*

### Para el sistema real (backlog)

**I. Update semanal garantizado**, incluso sin novedades ("La pieza sigue en catálogo · 41 coleccionistas · próxima subasta 12 mar"). La cadencia predecible es confianza. *(práctica 5)*

**J. Notificaciones opt-in por hito** (nueva puja, subasta programada, adjudicación, pago) con control fino. *(práctica 6)*

**K. Documentos descargables** por lote: certificado GIA, avalúo, contrato, comprobante de pago. *(práctica 5)*

**L. Confirmación con fricción deliberada al invertir** (resumen + piso + plazo máximo antes de firmar). *(práctica 6)*

---

*Fuentes principales: Lollypop — Investment Dashboard UX (2026) · Eleken — Fintech UX Best Practices (2026) · Masterly — Fintech Dashboard Patterns (Ramp, Mercury, Wise, Stripe) · Agora — Real Estate Investor Relations · BricxLabs — Progress Bar UX · Circuit Auction — Online Bidding Best Practices.*
