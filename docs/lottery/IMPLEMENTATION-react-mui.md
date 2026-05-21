# Implementation Spec — Lottery (React 18 + MUI v6)

**Stack base:** Tierra Madre Studio (`CLAUDE.md`)
**New module:** `src/components/Lottery/`
**Branch sugerida:** `feature/lottery-mvp`

---

## 1. Estructura de archivos

```
src/
├── components/
│   └── Lottery/
│       ├── index.ts                  # barrel
│       ├── LotteryPage.tsx           # /rifa/:slug — landing pública
│       ├── LotteryAdminPage.tsx      # /admin/lottery — listing
│       ├── LotteryAdminEditor.tsx    # /admin/lottery/new, /:slug/edit
│       ├── LotteryAdminDraw.tsx      # /admin/lottery/:slug/draw
│       ├── components/
│       │   ├── LotteryHero.tsx
│       │   ├── NumberGrid.tsx
│       │   ├── NumberTile.tsx
│       │   ├── ReservationDrawer.tsx
│       │   ├── PaymentInstructions.tsx
│       │   ├── ReceiptUploader.tsx
│       │   ├── CountdownClock.tsx
│       │   ├── LegendBar.tsx
│       │   └── DrawAnimation.tsx
│       ├── hooks/
│       │   ├── useLotteryGrid.ts     # fetch + polling 10s
│       │   ├── useReservation.ts     # state + timer
│       │   ├── useReceiptUpload.ts   # upload + compress
│       │   ├── useDrawWinner.ts      # admin
│       │   └── useGridLayout.ts      # cols/tile size responsive
│       ├── types.ts
│       └── i18n.ts                   # keys ES/EN
├── pages/
│   └── (no cambios — montado en App.tsx routes)
├── locales/
│   ├── lottery.es.json
│   └── lottery.en.json
└── App.tsx                           # ← agregar rutas
```

## 2. Routing (React Router 7.9)

Agregar en `App.tsx`:

```tsx
<Route path="/rifa/:slug" element={<LotteryPage />} />
<Route path="/admin/lottery" element={<LotteryAdminPage />} />
<Route path="/admin/lottery/new" element={<LotteryAdminEditor />} />
<Route path="/admin/lottery/:slug" element={<LotteryAdminEditor />} />
<Route path="/admin/lottery/:slug/draw" element={<LotteryAdminDraw />} />
```

Las rutas `/admin/*` ya están detrás de `<RequireAuth role="admin">`. Reusar.

## 3. Types (resumen)

```ts
// src/components/Lottery/types.ts

export type NumberStatus = 'available' | 'reserved' | 'pending_review' | 'sold' | 'winner';

export interface LotteryConfig {
  id: string;
  slug: string;
  title: { es: string; en: string };
  prizeProductId: string;
  gridSize: number;          // 5..9999
  pricePerNumberCOP: number;
  pricePerNumberUSD?: number;
  drawAt: string;            // ISO
  status: 'draft' | 'live' | 'closed' | 'cancelled';
  paymentAccounts: PaymentAccount[];
  winnerNumber?: number;
  winnerSeed?: string;
  showInitialsPublic: boolean;
  reservationTimeoutMinutes: number;  // default 30
  createdAt: string;
  createdBy: string;
}

export interface PaymentAccount {
  type: 'nequi' | 'bancolombia' | 'pse' | 'other';
  account: string;
  holder: string;
  qrUrl?: string;
}

export interface LotteryTicket {
  ticketId: string;
  lotterySlug: string;
  number: number;
  status: NumberStatus;
  buyerName?: string;
  buyerEmail?: string;
  buyerWhatsapp?: string;
  reservedAt?: string;
  reservedUntil?: string;
  receiptDriveId?: string;
  approvedAt?: string;
  approvedBy?: string;
  rejectionReason?: string;
  initialsPublic?: string;
  locale: 'es' | 'en';
}

export interface PublicLotteryView {
  config: Omit<LotteryConfig, 'createdBy'>;
  numbers: Array<{
    n: number;
    status: 'available' | 'reserved' | 'sold' | 'winner';
    initials?: string;
  }>;
  soldCount: number;
  serverNow: string;  // para sincronizar timers
}
```

## 4. API endpoints (Vercel serverless)

Crear bajo `api/`:

### 4.1 `api/lottery-public.js`
```
GET /api/lottery-public?slug=venus-mayo-2026
→ PublicLotteryView (sin datos personales completos)
Cache: s-maxage=8, stale-while-revalidate=15
```

### 4.2 `api/lottery-reserve.js`
```
POST /api/lottery-reserve
body: { slug, number, buyerName, buyerEmail, buyerWhatsapp, locale }
→ { ticketId, reservedUntil } | { error: 'CONFLICT' | 'ACTIVE_RESERVATION' }
```
**Idempotencia (R6):** lock optimista vía Sheets `ticketId` único + check `WHERE number=? AND status='available'`.

### 4.3 `api/lottery-upload-receipt.js`
```
POST /api/lottery-upload-receipt  (multipart/form-data)
fields: ticketId, file
→ { receiptDriveId, status: 'pending_review' }
```
Reutiliza la misma lógica de `media-upload` con folder `Drive/lotteries/{slug}/comprobantes/`.

### 4.4 `api/lottery-admin-list.js`
```
GET /api/lottery-admin-list  (auth admin)
→ Array<LotteryConfig & { ticketsBreakdown }>
```

### 4.5 `api/lottery-admin-approve.js`
```
POST /api/lottery-admin-approve  (auth admin)
body: { ticketId, action: 'approve' | 'reject', reason? }
→ { ok }
side effects: send email via Resend
```

### 4.6 `api/lottery-draw.js`
```
POST /api/lottery-draw  (auth admin)
body: { slug }
→ { winnerNumber, seed, soldSnapshot }
side effects: emails (winner + admin), sheet update
```

## 5. Persistencia (Google Sheets)

### Spreadsheet ID env var
```
LOTTERY_SPREADSHEET_ID=xxx
```

Sheets:
- `lotteries` (1 fila por rifa) — schema en PRD §12.
- `lottery_tickets_{slug}` — generada al crear la rifa, con N filas pre-asignadas (1..gridSize) en estado `available`.

> **Por qué pre-asignar:** evita race conditions al crear la fila. La operación de reserva es UPDATE, no INSERT. Lock optimista con `If-Match` sobre el `version` column.

### Drive layout
```
tm-studio (Shared Drive)
└─ lotteries/
   └─ {slug}/
      ├─ portada.jpg
      ├─ comprobantes/
      │   └─ {ticketId}.{ext}
      └─ draws/
          └─ {timestamp}-{seed}.json   ← snapshot del draw
```

## 6. Hooks clave (firmas)

```ts
// useLotteryGrid.ts
export function useLotteryGrid(slug: string) {
  // SWR-style polling cada 10s
  // Cache sincrónica desde localStorage para evitar blink (regla CLAUDE.md)
  return { config, numbers, soldCount, serverNow, isLoading, refetch };
}

// useReservation.ts
export function useReservation(slug: string) {
  // Persiste en localStorage 'lottery:{slug}:reservation'
  // Sincroniza timer con servidor en cada poll
  // Auto-expire client-side cuando expiresAt pasa
  return { reservation, reserve, cancel, secondsRemaining };
}

// useReceiptUpload.ts
export function useReceiptUpload(ticketId: string) {
  // Comprime con browser-image-compression (target 1MB)
  // Multipart upload con progress
  return { upload, progress, status, error };
}

// useGridLayout.ts
export function useGridLayout(size: number, mode: 'roomy' | 'compact') {
  // Devuelve { cols, tilePx, useCompactRender }
  // Reactivo a window resize (ResizeObserver del container)
  return { cols, tilePx, useCompactRender };
}
```

## 7. Componentes — notas de implementación

### `<NumberGrid />`
- **Virtualización condicional:** si `gridSize > 500` usar `react-window` o un IntersectionObserver para renderizar solo visibles. Bajo 500 el render directo está bien.
- **Memo agresivo:** `<NumberTile />` envuelto en `React.memo` con shallow compare por `n + status + initials`.
- **No re-render del grid** cuando solo cambia el timer del usuario — el timer vive en una capa separada (`<TimerOverlay />`).

### `<ReservationDrawer />`
- Usar `Drawer anchor="bottom"` en mobile (`useMediaQuery(below md)`), `Dialog` en desktop. Coherente con la migración Dialog→Drawer documentada en la memoria del proyecto.
- Submit usa el patrón existente `<LoadingButton>` con dot pulse.

### `<PaymentInstructions />`
- Tabs: `<Tabs variant="standard" />` MUI v6.
- QR generado server-side en build de la rifa (no librería en cliente para no bloar).
- `<CountdownClock />` con `requestAnimationFrame` throttled a 1 update/sec, no `setInterval` en cada componente.

### `<ReceiptUploader />`
- Reusar `useDriveUpload` existente del módulo `MediaManager`.
- Compresión cliente con `browser-image-compression` (npm install).
- Estados: `idle | selecting | compressing | uploading | success | error`.

### `<CountdownClock />`
- Diff con `serverNow` recibido del último poll para evitar clock skew.
- Color cambia con thresholds (10min, 5min) — mover a token CSS, no inline.

### `<DrawAnimation />`
- Solo se monta en la admin draw page.
- Animación: 1) dim a 30% el grid completo (200ms), 2) shuffle visual de 800ms con random highlight, 3) lock en winner con goldAccent glow.
- Respeta `prefers-reduced-motion` → fade simple sin shuffle.

## 8. i18n

```json
// src/locales/lottery.es.json + lottery.en.json
{
  "lottery": {
    "hero.title": "Rifa de {{prize}}",
    "hero.cta": "Ver números",
    "counter.sold": "{{sold}} de {{total}} vendidos",
    "tile.aria.available": "Número {{n}}, disponible",
    "tile.aria.reserved": "Número {{n}}, reservado",
    "tile.aria.mine": "Número {{n}}, reservado por ti",
    "tile.aria.sold": "Número {{n}}, vendido",
    "tile.aria.winner": "Número {{n}}, ganador",
    "modal.reserve.title": "Reservar #{{n}}",
    "modal.reserve.cta": "Reservar y ver datos de pago",
    "modal.tip": "Si no completas el pago en {{minutes}} min, el número vuelve a disponible.",
    "payment.timer": "Tiempo restante",
    "upload.dropzone": "Arrastra el comprobante aquí",
    "upload.constraints": "JPG · PNG · HEIC · PDF · máx 10MB",
    "upload.cta": "Confirmar y enviar a revisión",
    "draw.winner": "¡El número {{n}} ganó!"
  }
}
```

Cargar en el `LanguageContext` existente.

## 9. Email templates (Resend)

Cuatro nuevos:

| Template ID | Trigger | Variables |
|---|---|---|
| `lottery-reserved` | Post-reservación | name, number, expiresAt, paymentAccounts |
| `lottery-reminder-25min` | 5 min antes de expirar (cron) | name, number, secondsLeft |
| `lottery-approved` | Admin aprueba pago | name, number, drawAt |
| `lottery-rejected` | Admin rechaza pago | name, number, reason |
| `lottery-winner` | Sorteo ejecutado | name, number, prize, nextSteps |
| `lottery-loser` | Sorteo ejecutado (al resto) | name, number, winnerNumber |

Storage: `api/_lib/templates/lottery-*.tsx` (similar al patrón actual de templates en TM).

## 10. Performance budget

| Métrica | Target |
|---|---|
| First Contentful Paint | <1.2s en 4G |
| Time to Interactive | <2.5s |
| Render del grid 100 nums | <50ms |
| Render del grid 1000 nums (compact) | <250ms (con virtualización) |
| Lighthouse Performance | ≥85 mobile / ≥95 desktop |
| Bundle size añadido | <40KB gzipped (ex Framer Motion ya cargado) |

## 11. Testing manual checklist

- [ ] Crear rifa de 100 números, ver grid público
- [ ] Reservar #42, ver timer, esperar 30 min → vuelve a disponible
- [ ] Reservar #42 en pestaña A; intentar reservar #42 en pestaña B → error CONFLICT
- [ ] Subir screenshot >10MB → error claro
- [ ] Subir screenshot HEIC → se acepta y convierte
- [ ] Admin aprueba → estado `sold`, email recibido
- [ ] Admin rechaza con razón → estado `available`, email recibido
- [ ] Ejecutar sorteo con 50 vendidos → ganador único, seed visible
- [ ] Toggle ES/EN → todo el texto cambia, ARIA labels también
- [ ] Light/dark → contraste verificado en todos los estados del tile
- [ ] Mobile 375px → modal Drawer abre, teclado no rompe layout
- [ ] Grid 1000 en compact → scroll fluido, no blink

## 12. Riesgos técnicos & mitigaciones

| Riesgo | Mitigación |
|---|---|
| Polling cada 10s × 1000 usuarios = 100req/s | Caché HTTP `s-maxage=8` + payload diff (solo cambios). |
| Timer client manipulado | Server es fuente de verdad — endpoint `lottery-public` recalcula `serverNow`. |
| Sheets concurrency | Append-only para tickets es viable; UPDATE de status con check de `version` column. Si choca → reintentar 1 vez. |
| Comprobante con PII expuesto | Drive folder con permisos service-account-only; admin proxy la imagen vía endpoint, nunca link directo. |
| Drive folder sobrecargada | Tasks de limpieza post-180-días via cron (`api/lottery-cleanup`). |

## 13. Out of scope (V2+)

- Carrito multinúmero (pagar 5 de una sola vez).
- Pasarela Wompi/MercadoPago.
- Live stream del draw.
- Programa de referidos.
- App nativa.

---

**Tiempo estimado de implementación:** 4 semanas con 1 dev frontend + 1 dev backend (medio tiempo).
