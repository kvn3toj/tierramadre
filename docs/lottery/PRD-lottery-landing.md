# PRD — Tierra Madre Lottery / Rifa de Esmeraldas

**Status:** Draft v1.0
**Owner:** Kevin (kvn3toj@gmail.com)
**Audience:** Diseño · Frontend · Backend · Operación TM
**Date:** 2026-05-04
**Module:** `src/components/Lottery/` (parte del monorepo Tierra Madre)

---

## 1. Resumen ejecutivo

Tierra Madre va a ofrecer rifas/sorteos de piezas de su catálogo (esmeraldas, joyas o experiencias) mediante un grid de números reservables. El usuario elige un número (1-N), lo reserva por 30 minutos, sube el comprobante de pago y un administrador lo valida manualmente. La landing muestra en tiempo cuasi-real qué números están disponibles, reservados y vendidos.

Es un **canal de venta complementario** al catálogo principal: convierte stock difícil de mover (piezas pequeñas, lotes mixtos) en eventos de adquisición con urgencia social y precio fijo por ticket.

## 2. Problema

| Stakeholder | Problema actual |
|---|---|
| **TM (negocio)** | Stock de baja rotación (ítems <$200 USD) requiere mucho esfuerzo de venta 1:1 vs. su margen. No hay un mecanismo para activar comunidad y mover inventario en horas. |
| **Asesores** | No tienen un activador de urgencia/escasez con precio cerrado para promover en stories y WhatsApp. |
| **Cliente** | Quiere participar de la marca con un ticket de baja entrada; el catálogo regular tiene un AOV alto que excluye al curioso. |

## 3. Goals & Non-goals

### Goals (MVP — 4 semanas)

1. Permitir a un admin **crear una rifa** definiendo: pieza/premio, tamaño del grid (1-10 / 1-100 / 1-1000), precio por número, fecha del sorteo, cuentas de pago.
2. Permitir al usuario **reservar un número** del grid en una sesión bilingüe (ES/EN).
3. **Timer de 30 min** en cada reserva: si el comprobante no se sube/aprueba, el número vuelve a disponible.
4. **Upload de screenshot** del pago a Drive con validación de tipo/tamaño y referencia al número.
5. **Vista pública** del grid con estados: disponible / reservado (con timer) / vendido.
6. **Admin panel** para aprobar/rechazar pagos, ver participantes, exportar lista, y disparar el sorteo.
7. **Notificaciones por email** al usuario (reserva confirmada, pago aprobado, ganador) vía Resend.

### Non-goals (Fase 1)

- Pasarela de pago automatizada (Wompi/MercadoPago) — solo screenshot manual.
- Múltiples números por usuario en una sola transacción (un número = una transacción).
- Validación OCR del comprobante.
- Programa de referidos / multiplicador de probabilidades.
- Live draw en video / streaming embebido.
- Reembolsos automáticos.

## 4. User stories

### 4.1 Cliente final (público)

```
Como visitante de la landing
Quiero ver qué números están disponibles y cuánto cuesta cada uno
Para decidir si participo y cuál número elijo

Como participante
Quiero reservar mi número con un click
Para asegurarlo mientras realizo el pago en mi banco

Como participante con timer corriendo
Quiero ver claramente cuánto tiempo me queda
Para no perder la reserva por descuido

Como participante que ya pagó
Quiero subir el screenshot y recibir confirmación inmediata
Para tener tranquilidad de que mi número quedó asegurado

Como participante después del sorteo
Quiero saber si gané sin tener que preguntar
Para no estar pendiente del WhatsApp del asesor
```

### 4.2 Admin / Operación

```
Como admin
Quiero crear una nueva rifa eligiendo el premio del catálogo y el tamaño del grid
Para lanzar un evento en menos de 5 minutos

Como admin
Quiero ver los pagos pendientes con su screenshot adjunto
Para aprobar o rechazar en bulk

Como admin
Quiero hacer el sorteo aleatorio entre los números vendidos
Para generar el ganador con un proceso transparente y registrable

Como admin
Quiero exportar la lista de participantes
Para tener trazabilidad fiscal/contable
```

## 5. Flujos principales

### 5.1 Flujo de compra (happy path)

```
1. Usuario llega a /rifa/{slug}
2. Ve premio + grid + contador "23 de 100 vendidos"
3. Hace tap en un número disponible (#42)
4. Modal: "Reservar #42 — $50.000 COP por 30 min"
   - Captura: nombre, WhatsApp, email
   - CTA: "Reservar y obtener datos de pago"
5. Sistema crea reserva (status: pending_payment), inicia timer
6. Pantalla de pago muestra:
   - Datos bancarios (Nequi/Bancolombia/PSE)
   - QR de Nequi
   - Botón "Copiar cuenta"
   - Timer en vivo
7. Usuario paga en su app bancaria
8. Vuelve a la landing, sube screenshot
9. Estado cambia a "pending_review" — número se muestra como reservado oscuro
10. Admin aprueba en panel
11. Email al usuario: "Tu número #42 está confirmado"
12. Estado público del número: vendido (con iniciales del comprador opcionales)
```

### 5.2 Flujo de reserva expirada

```
1. Usuario reserva #42, no sube comprobante
2. Timer llega a 0
3. Reserva expira (cron / lazy check al render)
4. Número vuelve a disponible
5. Email al usuario: "Tu reserva expiró, puedes intentar de nuevo"
```

### 5.3 Flujo admin (crear rifa)

```
1. Admin entra a /admin/lottery/new
2. Selecciona pieza del catálogo TM (autocompletado desde Sheets)
3. Configura:
   - Tamaño del grid: [10, 50, 100, 500, 1000] o custom
   - Precio por número (COP/USD)
   - Fecha y hora del sorteo
   - Cuentas de pago (Nequi/Bancolombia/PSE) reutilizables
   - Slug público (ej: `venus-mayo-2026`)
   - Imágenes (heredadas del producto + extras)
4. Preview en tiempo real
5. Publish → genera URL pública
```

### 5.4 Flujo del sorteo

```
1. Admin abre /admin/lottery/{slug}/draw
2. Sistema muestra: "85 de 100 vendidos"
3. Botón "Generar ganador"
4. Animación de grid (visible para audiencia si proyecta)
5. Sistema usa Math.random() seeded con timestamp + hash bloqueado al hacer click
6. Resultado se almacena con seed para auditoría
7. Email al ganador + email al admin
8. La landing muestra status: closed con #ganador destacado
```

## 6. Reglas de negocio

| Regla | Detalle |
|---|---|
| **R1. Reserva única activa** | Un email puede tener máximo 1 reserva pendiente a la vez. Para reservar otro debe completar o cancelar la actual. |
| **R2. Timer de 30 min** | Hardcoded en MVP. Configurable en V2. |
| **R3. Una rifa = un grid** | No hay multi-grid en una sola rifa. |
| **R4. Tamaños recomendados** | 10, 25, 50, 100, 500, 1000. Custom permitido pero validado (rango 5-9999). |
| **R5. Precio fijo** | Todos los números de una rifa cuestan lo mismo. No hay tiers. |
| **R6. Idempotencia** | Si dos usuarios tocan el mismo número en <500ms, gana el primero en llegar al servidor. El segundo recibe error y sugerencia de números cercanos. |
| **R7. Comprobante** | JPG/PNG/HEIC/PDF, max 10MB. Almacenado en `Drive/lotteries/{slug}/comprobantes/{ticketId}.{ext}`. |
| **R8. Privacidad** | Iniciales públicas, email/teléfono ocultos. Solo admin ve datos completos. |
| **R9. Sorteo auditable** | Seed visible post-sorteo, junto con la lista de números vendidos al momento del draw. |
| **R10. Estado terminal** | Una vez ejecutado el sorteo, ningún número puede cambiar de estado. La landing pasa a modo "histórica". |

## 7. Estados de un número

```
       ┌──────────────┐
       │  AVAILABLE   │ ◄──── (default) / (reserva expirada)
       └──────┬───────┘
              │ user reserva
              ▼
       ┌──────────────┐
       │  RESERVED    │ ◄──── timer corriendo (30min)
       └──┬─────────┬─┘
   timer  │         │ usuario sube comprobante
   expira │         ▼
          │  ┌──────────────────┐
          │  │ PENDING_REVIEW   │ ◄──── admin debe aprobar
          │  └──┬────────────┬──┘
          │     │            │ admin rechaza
          │     │            ▼
          │     │     ┌─────────────┐
          │     │     │  AVAILABLE  │ (vuelve)
          │     │     └─────────────┘
          │     │ admin aprueba
          │     ▼
          │  ┌──────────────┐
          │  │     SOLD     │  (terminal hasta el sorteo)
          │  └──────┬───────┘
          │         │ sorteo ejecutado
          │         ▼
          │  ┌──────────────┐
          │  │ SOLD/WINNER  │  (1 número)
          │  └──────────────┘
          │
          ▼
   AVAILABLE
```

## 8. Métricas de éxito

### Producto (medibles desde el día 1)

| Métrica | Definición | Target MVP |
|---|---|---|
| **Sell-through rate** | % de números vendidos antes del sorteo | >70% |
| **Time to first reservation** | Minutos entre publish y primera reserva | <60 min |
| **Reserva → pago confirmado** | % que sube comprobante dentro del timer | >50% |
| **Pago → aprobación** | Tiempo medio de admin para aprobar | <2h |
| **Repetición** | % de compradores que vuelven en otra rifa | >25% |

### Tech

| Métrica | Target |
|---|---|
| **TTFB** del grid | <300ms |
| **Render del grid 100 números** | <16ms (60fps) |
| **Conflict rate** (R6) | <0.5% de reservas |

## 9. Edge cases & errores

| Caso | Manejo |
|---|---|
| Usuario cierra la pestaña con timer activo | Reserva sigue activa hasta expirar. Email de recordatorio a los 25 min. |
| Dos usuarios tap simultáneo al mismo número | Primer commit gana. Segundo ve toast "Lo sentimos, ese número fue reservado en este momento" + sugerencia de 3 números aleatorios disponibles. |
| Usuario sube comprobante de OTRO número | Admin lo detecta al revisar y rechaza con razón "comprobante no corresponde". |
| Sorteo con <50% vendido | Admin decide: (a) postergar fecha, (b) ejecutar igual, (c) cancelar y reembolsar. UI debe permitir las 3 acciones. |
| Comprobante > 10MB | Cliente comprime con `browser-image-compression` antes de subir. Si falla → mensaje claro. |
| Ganador no responde en 7 días | Re-sorteo entre los demás vendidos. Marcar el primer ganador como "no_claim". |
| Admin rechaza pago | Email al usuario con razón. Reserva vuelve a available. |
| Cambio de número de cuenta de TM | Actualizar en admin no afecta rifas en curso. Las reservas activas conservan los datos al momento de reservar. |

## 10. Stack & dependencias

| Capa | Tecnología | Notas |
|---|---|---|
| **Frontend** | React 18 + TypeScript 5.6 + MUI v6 + Framer Motion | Reusa design system TM (`emeraldCore`, `goldAccent`) |
| **Routing** | React Router 7.9 | Nuevas rutas: `/rifa/:slug`, `/admin/lottery`, `/admin/lottery/new`, `/admin/lottery/:slug` |
| **Persistencia** | Google Sheets (data) + Drive (comprobantes) | Spreadsheet `lotteries` + 1 sheet por rifa |
| **API** | Vercel Serverless | 6 endpoints nuevos (ver §11) |
| **Email** | Resend (ya integrado) | 4 templates nuevos |
| **Realtime** | Polling cada 10s en grid público | WebSocket es overkill en MVP |
| **i18n** | `src/locales/lottery.{es,en}.json` | Coherente con TM |

## 11. API endpoints nuevos

```
POST  /api/lottery-create           Admin crea rifa
GET   /api/lottery-public/:slug     Grid público + estados
POST  /api/lottery-reserve          Crea reserva (idempotente)
POST  /api/lottery-upload-receipt   Sube comprobante a Drive
GET   /api/lottery-admin-list       Admin: rifas + métricas
POST  /api/lottery-admin-approve    Admin: aprueba/rechaza pago
POST  /api/lottery-draw             Admin: ejecuta sorteo
```

## 12. Schema (Sheets)

### Sheet `lotteries`
```
id | slug | title_es | title_en | prize_product_id | grid_size | price_cop | price_usd
   | currency_default | accounts_json | draw_at | status | created_at | created_by
   | winner_number | winner_seed | winner_email
```

### Sheet `lottery_tickets` (1 por rifa, dinámica)
```
ticket_id | lottery_slug | number | status | buyer_name | buyer_email | buyer_whatsapp
         | reserved_at | reserved_until | receipt_drive_id | approved_at | approved_by
         | rejection_reason | initials_public | locale
```

## 13. Análisis de riesgos

| Riesgo | Probabilidad | Impacto | Mitigación |
|---|---|---|---|
| Race condition en reserva | Media | Alto | Append-only en Sheets con check de número antes del commit (lock optimista). |
| Comprobantes falsos | Media | Alto | Admin valida 1:1 contra extracto bancario. V2: integración con extracto. |
| Drive llena cuota | Baja | Medio | Cleanup automático de comprobantes >180 días post-sorteo. |
| Timer client-side manipulado | Alta | Bajo | Server es fuente de verdad. Cliente solo muestra. |
| Sorteo cuestionado | Media | Alto | Seed visible + lista de números vendidos congelada al draw. |
| Latencia del polling en 1000 números | Media | Medio | Diff payload (solo cambios desde X). |

## 14. Acceptance criteria (MVP)

```
✓ Admin puede crear una rifa de 100 números en <5 min sin asistencia
✓ Visitante puede reservar un número y ver el timer dentro de 3 segundos
✓ Upload de comprobante <5MB completa en <8s en 4G
✓ Grid público se actualiza con cambios de admin en <15s
✓ Light + dark mode 100% legibles (contrast ratio ≥4.5:1)
✓ ES y EN intercambiables sin recargar
✓ Mobile-first: probado en 375px, 414px, 768px
✓ Lighthouse Performance >85 en mobile
✓ Sorteo deja registro auditable (seed + timestamp + lista)
✓ 0 datos personales filtrados en el grid público (solo iniciales)
```

## 15. Roadmap

| Fase | Duración | Entregables |
|---|---|---|
| **F1 — MVP** | 4 sem | Lo descrito arriba. 1 rifa activa a la vez. |
| **F2 — Multi-rifa** | 2 sem | Múltiples rifas en paralelo, listing público `/rifas`. |
| **F3 — Pasarela** | 3 sem | Wompi/MercadoPago. Mantiene screenshot como fallback. |
| **F4 — Multinúmero** | 2 sem | Carrito con descuento por volumen (5+10%, 10+15%). |
| **F5 — Live draw** | 4 sem | Página dedicada con countdown y animación 3D del ganador. |

## 16. Open questions

1. ¿La rifa muestra el premio con su precio del catálogo o sólo "Premio: Esmeralda 1.5ct"?
2. ¿Se admiten números reservados por asesor (offline) que el admin marca manualmente?
3. ¿Qué pasa si un comprador es de otro país y paga en USD?
4. ¿El ganador recibe el premio físico (envío) o se invita a recogerlo en showroom?
5. ¿El admin puede reservar números de prueba sin contar para el sorteo (status="reserved_admin")?

---

**Próximos pasos:** Diseño visual + prototipo HTML interactivo para validar el grid de 1-100 antes de implementar en React + MUI.
