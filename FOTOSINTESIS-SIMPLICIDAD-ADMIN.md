# Fotosíntesis — Patrón de simplicidad admin

**Cómo hacer que los admins editen y registren más simple.** 2026-07-17
Complementa la crítica de `Captura de lote` y los dos mockups v2 (`captura-v2`, `nueva-venta-v2`).

> Mi Perfil (usuario) vive en Quiet Emerald, densidad **comfortable**.
> Fotosíntesis (admin) vive en Foto, densidad **dense**, teclado primero.
> Son dos tiers del mismo DS3 — no dos sistemas.

---

## Los 5 movimientos (el patrón reutilizable)

Cada pantalla de captura/edición de Fotosíntesis se arregla con los mismos cinco movimientos. No hay que inventar nada nuevo por pantalla — se aplica esto.

1. **El objeto de la tarea es el héroe.** Lo primero y más grande es *lo que el admin manipula* (los ítems del lote, las piezas de la venta, la ficha de la piedra) — no una tarjeta de estado ni un anillo de progreso. El estado se demota a un riel o una barra delgada.
2. **La data se edita en línea, con afordancia obvia.** Nada de `0%` / `$0` como texto plano. Cada valor editable es un campo con fondo inset, borde, y stepper (±) cuando aplica. Se ve editable de un vistazo. Mono tabular para números.
3. **Un toque para el paso difícil.** Todo flujo tiene un paso que cuesta (repartir 100%, poner precios, elegir comprador). Dale un atajo: «Repartir equitativo / por costo», «Escanear para agregar», «Precio sugerido». El admin arranca de un estado útil y ajusta a mano.
4. **La acción primaria depende del estado.** Un solo botón primario (con bisel esmeralda) que *enseña el flujo*: mientras falta algo, guía o está apagado con un porqué en lenguaje plano; cuando está completo, se ilumina («Cerrar lote y publicar», «Registrar venta»). Siempre un checklist de una línea al lado («Comprador ✓ · 2 piezas ✓ · total ✓»).
5. **Denso, contenido, teclado primero.** Tema Foto, densidad dense, contenido a `--maxw`, **barra contenida**. Atajos visibles en el riel (`⌘↵` guardar y seguir, `⌘K` buscar, `⌘E` repartir). Sin duplicar meta entre header y riel.

---

## Mapa pantalla por pantalla

Aplicación concreta del patrón a cada pantalla admin. ✅ = ya con mockup v2.

| Pantalla | Objeto héroe | Edición en línea | Toque para lo difícil | Primaria por estado |
|---|---|---|---|---|
| **Captura de lote** ✅ | Los ítems del lote (columna principal) | % preponderancia + precio, con steppers | «Repartir equitativo / por costo» + barra de reparto viva | «Cerrar lote y publicar» se ilumina al 100% |
| **Nueva venta** ✅ | Las piezas de la venta + total | Precio por línea + descuento % / monto | Escanear QR / `⌘K` para agregar; comprador de 1 clic | «Registrar venta» al tener comprador + ≥1 pieza + total |
| **Nueva piedra / registrar** | La ficha (foto + campos clave) | Nombre, peso, corte, precio en un form de una columna | Autonombre (IA existente), «duplicar de la anterior», OCR de etiqueta | «Guardar y siguiente» (`⌘↵`) para tanda rápida |
| **Lote list / Inicio** | La tabla de lotes/piedras | Estado (chip) editable en fila; precio inline en hover | Filtros segmentados (TODO/DISPONIBLES/…) + búsqueda `⌘K` | «+ Nueva piedra» / «+ Nuevo lote» fijo arriba-derecha |
| **Ventas list** | La tabla de ventas | — (lectura); acciones por fila | Filtro por asesor / fecha; buscar | «+ Nueva venta» |
| **Directorio** | Las tarjetas de asesor | Multiplicador (x1.0…) editable en línea | Buscar + filtro por ciudad/estado | «+ Invitar asesor» |
| **Movimientos con asesores** | La lista de movimientos | Estado editable (entregado/devuelto) | Escanear pieza para mover | «Registrar movimiento» |
| **Escanear QR** | La cámara / resultado | — | El escaneo ES el atajo; resultado abre la ficha editable | «Ir a la pieza» / «Agregar a venta» |
| **Certificados** | El certificado en preview | Campos del certificado inline | Plantilla + autollenado desde la ficha | «Generar certificado» |

---

## Reglas transversales de densidad admin

- **Fila, no tarjeta**, para listas largas (inventario, ventas, movimientos): alto de fila ~44–52px, hairline entre filas, hover sutil, número mono a la izquierda. La tarjeta se reserva para el objeto en foco.
- **El riel derecho nunca duplica el header.** Riel = resumen/acción/atajos. Si no aporta, no hay riel (una sola columna centrada).
- **Cero relleno de color en tiles de stat.** Números mono, un acento esmeralda para la métrica clave, estado por punto+etiqueta. (El morado del dashboard actual desaparece.)
- **Estados de datos siempre**: cargando (skeleton que calca la fila), vacío («Aún no hay piezas — escanea la primera»), error (causa + reintentar).
- **Teclado primero**: toda acción frecuente tiene atajo y se muestra; Tab recorre los campos en orden visual; `⌘↵` guarda-y-sigue en toda captura repetitiva.
- **Contraste AA**: warning `#8A5F1B`, danger `#B33A2F` (light) — nunca gold neón sobre blanco.

---

## Secuencia

Encaja como track explícito de **Ola 1** (ver `DS3-DOS-OLAS-PLAN.md`), después del layout/barra:

1. Componentes que estos flujos necesitan: `Field`/`TextField`, `SegmentedControl`, `Table/Row`, `Sheet`, `EmptyState` — ya en el catálogo, se construyen aquí primero porque el admin los usa más.
2. Aplicar el patrón: Captura de lote → Nueva venta → Nueva piedra → listas → resto.
3. Cada pantalla pasa el checklist de crítica (objeto-héroe · data editable · toque para lo difícil · primaria por estado · denso+contenido).

*Dos flujos ya están dibujados (v2). El resto sigue el mismo molde — puedo dibujar cualquiera antes de construir, o pasamos a implementar el patrón empezando por Captura de lote.*
