# Design System — Lottery Landing

**Project:** Tierra Madre Lottery
**Style:** Editorial luxury · Generous whitespace · Tactile grid
**Brand alignment:** Override del recommendation default (sky blue) → emerald + gold de TM.

---

## 1. Filosofía visual

> "Una rifa de esmeraldas no se ve como una rifa de bingo. Se ve como un evento de subasta."

- **Tipografía editorial** (Playfair Display) para títulos / **sans neutra** (Inter) para UI.
- **Grid de números como protagonista**, no como tabla relegada.
- **Verde esmeralda + dorado** como marcadores de estado, nunca decoración gratuita.
- **Reducción radical de adornos**: cada animación tiene un job-to-be-done (escasez, feedback, transición de estado).
- **Mobile-first**: todo se diseña primero para 375px, luego escala.

## 2. Tokens (heredados del DS de TM)

Importar siempre desde `@/design-system`:

```ts
import {
  emeraldCore,        // #0E5E47
  emeraldDark,        // #083A2E
  emeraldLight,       // #1E8568
  goldAccent,         // #C9A24A
  goldDeep,           // #8C6A1E
  emeraldAlpha,
  goldAlpha,
  whiteAlpha,
  blackAlpha,
  cssTransition,
  blurValues,
} from '@/design-system';
```

### Paleta específica de la lottery (extiende los tokens existentes)

| Rol | Light mode | Dark mode | Token |
|---|---|---|---|
| Background page | `#FAF8F3` (paper warm) | `#0A0E0C` (verde-negro) | `bgPage` |
| Surface card | `#FFFFFF` | `#101715` | `bgSurface` |
| Number — available | `#FFFFFF` border `#E5DFCF` | `#1A2220` border `whiteAlpha(0.08)` | — |
| Number — hover | `bg emeraldAlpha(0.08)` border `emeraldCore` | `bg emeraldAlpha(0.15)` border `emeraldLight` | — |
| Number — reserved (mine) | `bg emeraldCore` text white border `goldAccent` | igual | `--state-mine` |
| Number — reserved (other) | `bg #F5EFE0` text `#8C6A1E` | `bg goldAlpha(0.18)` text `goldAccent` | `--state-reserved` |
| Number — sold | `bg emeraldDark` text `goldAccent` | igual | `--state-sold` |
| Number — winner | `bg goldAccent` text `emeraldDark` con halo | igual + glow | `--state-winner` |

> **Nota crítica:** "reserved (other)" usa dorado tenue, NO gris. El gris en una rifa lee como "muerto" y baja la sensación de momentum. Dorado tenue = "alguien lo tiene en la mano ahora mismo" → empuja al usuario a moverse.

## 3. Tipografía

```css
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Playfair+Display:wght@500;600;700&display=swap');

--font-display: 'Playfair Display', Georgia, serif;  /* títulos editoriales */
--font-body:    'Inter', -apple-system, system-ui, sans-serif;
--font-num:     'Inter', sans-serif;  /* tabular-nums activo */
```

### Escala

| Token | Mobile | Desktop | Uso |
|---|---|---|---|
| `display-xl` | 48/52 | 88/96 | Hero "RIFA" |
| `display-lg` | 36/40 | 64/68 | Premio name |
| `h1` | 28/34 | 40/48 | Sección |
| `h2` | 22/28 | 28/34 | Subsección |
| `body-lg` | 17/26 | 18/28 | Lead paragraph |
| `body` | 15/22 | 16/24 | Default |
| `caption` | 13/18 | 13/18 | Meta info |
| `number-tile` | 24/24 | 28/28 | Número en grid (medium) |

> Body 16px en desktop, **17px en mobile** — menos cansancio en pantallas chicas.
> `font-feature-settings: "tnum"` siempre que se rendericen números (timer, montos, grid).

## 4. Sistema del grid de números

### 4.1 Algoritmo de tamaño de tile (responsive)

```
viewport_w = window.innerWidth - container_padding
gap = 8px (mobile), 12px (desktop)
target_tile_min = 56px (mobile), 64px (desktop)

cols_max = Math.floor((viewport_w + gap) / (target_tile_min + gap))
cols = clamp(min_cols, cols_max, max_cols_by_grid_size)
tile_size = (viewport_w - (cols - 1) * gap) / cols
```

| Grid size | Mobile cols | Desktop cols | Tile aprox |
|---|---|---|---|
| 1-10 | 5 | 10 | 64-80px |
| 1-25 | 5 | 8 | 56-72px |
| 1-50 | 5 | 10 | 56-72px |
| 1-100 | 5 | 10 | 56-72px |
| 1-500 | 6 | 20 | 48-64px |
| 1-1000 | 8 | 25 | 36-48px (modo "compact") |

### 4.2 Modos de visualización

- **Roomy** (default): tile 56-72px, número visible siempre.
- **Compact** (1-1000): tile 36-48px, número con `font-size: 12px`.
- **Heatmap**: vista admin que pinta densidad de actividad por bloque de 10. No para público.

### 4.3 Estados del tile (anatomía)

```
┌──────────────┐
│              │  ← background según estado
│      42      │  ← número, font-num, weight 600
│              │
│   ★ (icon)   │  ← OPCIONAL: estrella si winner; reloj si reserved-mine
└──────────────┘
   border 1px      ← cambia con estado
   radius 12px
   shadow optional sólo en hover/mine
```

### 4.4 Interacciones

| Evento | Reacción | Tiempo |
|---|---|---|
| `hover` available | Lift -2px translateY, border emerald, shadow soft | 150ms |
| `tap` available | Scale 0.96 inmediato, abre modal de reserva | 100ms |
| `tap` reserved-other | Toast "Este número está siendo reservado" + shake (translate ±2px ×3) | 300ms |
| `tap` sold | Toast "Vendido. Mira los disponibles" + auto-scroll a uno random | 400ms |
| Cambio remoto a sold | Fade del color anterior al nuevo (200ms) — sin layout shift | 200ms |
| Reveal del ganador | Sequence: dim todos al 30%, ganador escala 1.15 + glow goldAccent | 1200ms total |

> **Anti-blink rule (TM standard):** las imágenes del premio en el hero usan `aspect-ratio` reservado y `useId()` por instancia, según `CLAUDE.md` del proyecto.

## 5. Componentes

### 5.1 `<NumberTile />`

```tsx
type Status = 'available' | 'reserved-mine' | 'reserved-other' | 'sold' | 'winner';

interface Props {
  number: number;
  status: Status;
  size?: 'compact' | 'roomy';
  onClick?: () => void;
  initials?: string;     // mostrar pequeñas en sold (toggle por config rifa)
  ariaLabel?: string;    // overrides default "Número 42, disponible"
}
```

Reglas:

- `cursor: pointer` solo en `available`.
- Tabindex 0 cuando `available`, -1 en otros estados.
- `aria-pressed` true en `reserved-mine`.
- En `winner`, `aria-label="Número 42, ganador"` + animación `prefers-reduced-motion`-aware.

### 5.2 `<ReservationModal />`

Layout:

```
┌─────────────────────────────────────────┐
│ ✕                                       │ ← close
│                                         │
│ Reservar #42                            │ ← display-lg
│ $50.000 COP · 30 min para confirmar     │ ← caption
│                                         │
│ [Nombre completo]                       │
│ [WhatsApp con código país]              │
│ [Email]                                 │
│ [ ] Acepto términos y privacidad        │
│                                         │
│ [ Reservar y ver datos de pago →  ]    │ ← CTA primary
│                                         │
│ Si no completas el pago en 30 min,      │ ← microcopy
│ tu número vuelve a disponible.          │
└─────────────────────────────────────────┘
```

- **Mobile**: bottom sheet (Drawer anchor="bottom") full-width, no Dialog. **Razón:** según memoria del proyecto, los Dialog en TM se migraron a Drawer por accesibilidad táctil. Mismo patrón aquí.
- Submit deshabilitado hasta validación (rule de UX `loading-buttons`).
- Loading state con dot pulse, no spinner — coherente con TM.

### 5.3 `<PaymentInstructions />`

Vista post-reserva. Tres tabs si hay múltiples cuentas:

```
[ Nequi ]  [ Bancolombia ]  [ PSE ]
─────────────────────────────────────
QR grande (200x200)
Cuenta: 300 123 4567   [ Copiar ]
Titular: Tierra Madre S.A.S.
Monto: $50.000 COP

⏱ Tiempo restante: 28:43

[ Ya pagué — Subir comprobante → ]
```

- Timer en `tabular-nums` para que no haga jitter al cambiar.
- **Color del timer**:
  - `> 10 min`: emeraldCore.
  - `5-10 min`: goldAccent.
  - `< 5 min`: rojo `#C0392B` + pulse de borde 1Hz.
- Botón "Copiar" con feedback visual (check icon ×800ms) + `navigator.clipboard.writeText`.

### 5.4 `<ReceiptUploader />`

Drag & drop zone:

```
┌──────────────────────────────────────┐
│                                      │
│       (icon: cloud upload)           │
│                                      │
│   Arrastra el comprobante aquí       │
│   o haz click para seleccionar       │
│                                      │
│   JPG · PNG · HEIC · PDF · max 10MB  │
│                                      │
└──────────────────────────────────────┘
```

- Acepta `accept="image/*,.pdf,.heic"`.
- Compresión cliente con `browser-image-compression` antes del upload (target 1MB).
- Preview con thumbnail después de seleccionar.
- Estado: idle → selected → uploading (progress bar) → success → review-pending.
- Error: claridad sobre qué pasó (red de pez chiquito), no un genérico.

### 5.5 `<LotteryHero />`

```
┌───────────────────────────────────────────────────────┐
│                                                       │
│  Imagen del premio                  RIFA #07 · MAYO   │
│  (16:9 desktop, 4:5 mobile)                           │
│                                       Esmeralda       │
│                                       Venus           │
│                                       1.85 ct         │
│                                       $X.XXX.XXX COP  │
│                                                       │
│                                       [ Ver grid ↓ ]  │
└───────────────────────────────────────────────────────┘
```

- Imagen con `<ProgressiveImage>` (componente existente en TM).
- Counter "23/100 vendidos" con barra emerald que se llena.
- Countdown a la fecha de sorteo: `D · H · M`.

## 6. Layout / page structure

```
[Sticky header bilingüe]
[LotteryHero — premio + counter + countdown]
[Grid principal — 5/10 cols según viewport]
[CTA flotante en mobile cuando hay reserva activa]
[Trust strip: "Más de 200 rifas · 0 disputas"]
[FAQ — qué pasa si pago tarde, cómo se sortea, etc.]
[Footer TM]
```

## 7. Motion (Framer Motion)

```ts
const tileVariants = {
  initial: { opacity: 0, y: 8 },
  enter: (i: number) => ({
    opacity: 1, y: 0,
    transition: { delay: Math.min(i * 0.005, 0.3), duration: 0.25 }
  }),
  hover: { y: -2, transition: { duration: 0.15 } },
  tap: { scale: 0.96 }
};
```

Reglas:

- Stagger acotado a `delay <= 300ms` total — no querés que la última fila aparezca después de 5s en grids de 1000.
- Respetar `prefers-reduced-motion`: si activo, todas las animaciones se reducen a opacity-only en 100ms.

## 8. Accesibilidad (WCAG AA)

| Item | Verificación |
|---|---|
| Contraste texto/fondo | ≥4.5:1 en todos los estados, en light y dark |
| Touch target | Tile ≥44×44px (en compact 1-1000 hacemos exception con tap-area extendida invisible) |
| Focus visible | Ring `2px solid emeraldCore` + offset 2px |
| Tab order | Header → Hero CTA → Grid (linear) → Footer |
| Screen reader | Cada tile anuncia "Número X, [estado]". Grid tiene `role="grid"` y filas `role="row"`. |
| Reduced motion | Respeta `prefers-reduced-motion: reduce` |
| Form labels | `<label for>` explícito, no placeholders |
| Error feedback | `aria-live="polite"` para toasts, `aria-live="assertive"` solo en errores que rompen el flujo |
| Idioma | `<html lang>` cambia con el toggle. Atributos en español/inglés. |

## 9. Anti-patrones (lo que NO hacemos)

- ❌ Confeti automático al reservar (parece spammy en una marca premium).
- ❌ Gris para "reservado por otro" (parece abandonado, perdemos sensación de momentum).
- ❌ Modal con scroll interno en mobile cuando los inputs tienen teclado abierto.
- ❌ Mostrar email/teléfono completo del comprador en el grid público.
- ❌ Animaciones de >300ms para state transitions del tile.
- ❌ Botón "Pagar ahora" — confunde porque sugiere pasarela. Usar "Reservar" + paso siguiente.
- ❌ Fondo con patrón de monedas/dinero/dollar signs.
- ❌ Emojis como icons (regla TM + regla UI Pro Max). Usar Heroicons o Material Symbols.

## 10. Bilingüe (i18n keys mínimas)

```json
{
  "lottery.hero.title": "Rifa de {{prize}}",
  "lottery.hero.cta": "Ver números",
  "lottery.counter.sold": "{{sold}} de {{total}} vendidos",
  "lottery.countdown.label": "Sorteo en",
  "lottery.tile.aria.available": "Número {{n}}, disponible",
  "lottery.tile.aria.sold": "Número {{n}}, vendido",
  "lottery.tile.aria.mine": "Número {{n}}, reservado por ti",
  "lottery.tile.aria.other": "Número {{n}}, reservado por otra persona",
  "lottery.tile.aria.winner": "Número {{n}}, ganador",
  "lottery.modal.reserve.title": "Reservar #{{n}}",
  "lottery.modal.reserve.cta": "Reservar y ver datos de pago",
  "lottery.modal.timer.tip": "Si no completas el pago en {{minutes}} min, el número vuelve a disponible.",
  "lottery.payment.copy": "Copiar",
  "lottery.payment.copied": "Copiado",
  "lottery.upload.dropzone": "Arrastra el comprobante aquí o haz click",
  "lottery.upload.constraints": "JPG · PNG · HEIC · PDF · máx 10MB",
  "lottery.toast.taken": "Este número fue reservado en este momento",
  "lottery.toast.suggest": "Prueba con #{{a}}, #{{b}} o #{{c}}",
  "lottery.draw.winner": "¡El número {{n}} ganó!"
}
```

## 11. Pre-delivery checklist

Antes de marcar el feature como done:

- [ ] Sin emojis como iconos
- [ ] `cursor: pointer` solo donde corresponde
- [ ] Hover states con transición 150-300ms
- [ ] Light mode: contrast ≥4.5:1 verificado con DevTools
- [ ] Dark mode idem
- [ ] Focus visible en grid y modales
- [ ] `prefers-reduced-motion` respetado
- [ ] Mobile 375px sin scroll horizontal
- [ ] Probado en 375 / 414 / 768 / 1024 / 1440
- [ ] Lighthouse Performance ≥85 en mobile
- [ ] Sin layout shift en cambios de estado del tile
- [ ] Timer no causa re-render del grid completo (memo)
- [ ] Reservation modal funciona con teclado abierto en mobile
- [ ] Iniciales públicas, datos personales nunca en payload del cliente
