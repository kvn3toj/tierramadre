# SPEC — T9.1 Bóveda Secreta: Gate de acceso con ruedas concéntricas

**Fecha:** 22 abril 2026
**Autor:** Kvn3Toj (con asistencia de Claude, brainstorming guiado por `superpowers:brainstorming`)
**Relación con otros specs:** es la primera subentrega de **T9** definida en [`docs/specs/2026-04-22-tareas-mi-tiempo-spec.md`](./2026-04-22-tareas-mi-tiempo-spec.md) sección 3, T9.
**Alcance:** únicamente el **gate de acceso** (lock screen con dos anillos concéntricos arrastrables). Galería de items vault-exclusive, CTA WhatsApp y analytics son subentregas posteriores y requieren sus propios specs.
**Origen del componente:** se porta y adapta [`LockScreen.tsx`](/Users/kevinp/Movies/coomunity-universe/cholqi/src/components/LockScreen.tsx) del proyecto `cholqi` (vive en `coomunity-universe/cholqi`) — el mismo patrón visual de ruedas mayas del Cholq'ij, re-skineado como dial de caja fuerte.

---

## 1. Decisiones de producto (tomadas en brainstorming)

| # | Decisión | Valor elegido |
|---|---|---|
| 1 | Alcance | Solo el **gate**. Unlock redirige a `VaultPage.tsx` actual sin modificarla. |
| 2 | Datos de los anillos | Exterior: **12 símbolos Tierra Mädre**. Interior: **dígitos 0–9**. |
| 3 | Combinación correcta | **Universal hardcoded** + **overrides por embajador** desde Sheet. |
| 4 | Interacción primaria | **Solo drag** (sin botones ± visibles). Keyboard fallback para a11y. |

Cambios sobre la referencia de cholqi:
- Nawales (20) → **12 símbolos TM** (paso 30° en lugar de 18°).
- Tonos mayas 1–13 → **dígitos 0–9** (paso 36° en lugar de 27.7°).
- Paleta ámbar/negro → **acero + dorado + esmeralda reveal** con tokens del design system de TM.
- Añadido: **cooldown** tras 3 intentos fallidos (requerimiento del spec T9 original).
- Añadido: **combinación override por embajador** (spec T9 original habla de "código compartido por admin").

---

## 2. Arquitectura de archivos

```
src/
├── pages/
│   └── VaultPage.tsx                  MODIFICAR — envolver con gate
├── components/vault/                  NUEVO
│   ├── VaultLockScreen.tsx            shell del gate (BG, overlay, layout, botón)
│   ├── VaultDial.tsx                  anillo genérico con drag + snap + spring
│   ├── VaultDialLabel.tsx             label que contrarrota (orientación horizontal)
│   ├── VaultCenter.tsx                hub central con combinación + estado
│   ├── VaultSymbol.tsx                12 símbolos TM como SVG inline
│   └── index.ts                       barrel
├── hooks/
│   └── useVaultUnlock.ts              NUEVO — validación, intentos, cooldown, persistencia
├── config/
│   └── vault.ts                       NUEVO — combinación universal, símbolos, paleta, storage keys
├── types/
│   └── vault.ts                       NUEVO — VaultSymbolId, VaultCombination, AttemptState
└── assets/vault/
    └── bg-vault.webp                  NUEVO asset (opcional — fallback CSS si falta)

api/
└── get-asesores.ts                    MODIFICAR — leer columna vaultCode del Sheet
```

Todo el styling con MUI `sx` + tokens desde `@/design-system` (barrel canónico). Cero Tailwind. Cero hex hardcoded salvo en `src/config/vault.ts` para la paleta específica de la bóveda.

---

## 3. Componentes (API detallada)

### 3.1 `VaultDial`

```tsx
interface VaultDialProps {
  radius: number;                     // distancia del centro al label (px)
  size: number;                       // diámetro del anillo (px)
  items: VaultDialItem[];             // ver tipo abajo
  value: number;                      // índice actualmente seleccionado
  onChange: (index: number) => void;  // se dispara al snap (no en drag continuo)
  disabled?: boolean;                 // pointer-events off, cursor not-allowed
  ariaLabel: string;
}

interface VaultDialItem {
  id: string;
  label: ReactNode;                   // el contenido del label (símbolo o dígito)
  color?: string;                     // color del label
}
```

**Responsabilidad.** Rotación continua con `useMotionValue` + `useSpring` (stiffness 300, damping 28, mass 0.8). Cálculo de ángulo acumulativo con `outerAngle.current` como `useRef<number>` para evitar "long way around" al cruzar ±180°. Al pointer-up, snap al múltiplo más cercano de `360/items.length` y derivación del índice. Responde a teclado (Arrow/Shift+Arrow) cuando tiene focus para a11y.

**No depende de la data de TM** — es reusable para cualquier selector circular futuro.

### 3.2 `VaultDialLabel`

```tsx
interface VaultDialLabelProps {
  item: VaultDialItem;
  index: number;
  totalItems: number;
  radius: number;
  ringRotate: MotionValue<number>;    // spring del dial padre
}
```

**Responsabilidad.** Posicionar el label en `y = -radius` y aplicar contrarrotación con `useTransform(ringRotate, v => -rot - v)` para que el contenido siempre quede vertical. Usa `useId()` para key DOM estable (anti-blinking).

### 3.3 `VaultCenter`

```tsx
interface VaultCenterProps {
  outerSymbol: VaultSymbolMeta;        // nombre, color, svg
  innerDigit: number;                  // 0-9
  state: 'idle' | 'unlocking' | 'error' | 'cooldown';
  cooldownSecondsLeft?: number;        // solo cuando state='cooldown'
}
```

**Responsabilidad.** Hub central de 100×100px (108 en desktop). Renderiza el símbolo + el dígito actual. Cambia visual según `state`:

| state | visual |
|---|---|
| `idle` | Radial gradient dark, borde acero sutil, sin glow. |
| `unlocking` | Glow dorado (`boxShadow: 0 0 50px vaultPalette.goldGlow`), borde dorado al 70%, radial gradient con `goldGlow` interno. Animación `lockGlow` 1s. |
| `error` | Animación `lockShake` 400ms (translateX ±6px), borde rojo 1 frame. |
| `cooldown` | Icono `Lock` grande dorado + contador `mm:ss`, símbolo oculto, borde rojizo `vaultPalette.error`. |

Animaciones CSS `@keyframes` embebidas en el mismo componente (como cholqi). Todas respetan `prefers-reduced-motion`.

### 3.4 `VaultSymbol`

```tsx
interface VaultSymbolProps {
  id: VaultSymbolId;
  size?: number;                       // default 28
  color?: string;                      // default token-based
}
```

**Responsabilidad.** Renderizar uno de los 12 símbolos TM como SVG inline monocromático (`fill="currentColor"`), tintado por `color`. Los 12 paths viven en un `Record<VaultSymbolId, string>` dentro del mismo archivo — no hay dependencias externas.

### 3.5 `VaultLockScreen`

```tsx
interface VaultLockScreenProps {
  onUnlock: (meta: UnlockMeta) => void;
}

type UnlockMeta =
  | { method: 'universal' }
  | { method: 'ambassador'; ambassadorSlug: string };
```

**Responsabilidad.** Orquestador de UI: BG image + overlay + título + descripción + dos `VaultDial` + `VaultCenter` + botón "Abrir". Consume `useVaultUnlock()` para estado y handlers. Dispara `onUnlock` 1.5s después del match (tras glow + fade).

### 3.6 `useVaultUnlock`

```ts
interface UseVaultUnlockReturn {
  outerIdx: number;
  innerIdx: number;
  setOuterIdx: (i: number) => void;
  setInnerIdx: (i: number) => void;

  state: 'idle' | 'unlocking' | 'error' | 'cooldown';
  attemptsLeft: number;               // 3, 2, 1, 0
  cooldownSecondsLeft: number;        // 0 cuando no hay cooldown

  tryUnlock: () => void;
  reset: () => void;                  // solo admin — no expuesto en este sprint
}

function useVaultUnlock(options?: {
  ambassadorCodes?: Map<string, VaultCombination>;
}): UseVaultUnlockReturn;
```

**Responsabilidad.**
1. Inicializar estado desde `localStorage` (synchronous — anti-blinking) con las storage keys.
2. Validar combinación en `tryUnlock`: primero universal, después iterar `ambassadorCodes` si existe.
3. Si match → `setState('unlocking')` + persistir `UNLOCKED=true` + `UNLOCK_METHOD`. El componente padre orquesta el `onUnlock` callback tras la animación.
4. Si miss → `setState('error')`, shake 400ms, `attempts++`. Si `attempts >= 3` → iniciar cooldown 5 min y persistir `COOLDOWN_UNTIL`.
5. Efecto que reloj-tickea el `cooldownSecondsLeft` cada 1s cuando está en cooldown. Al llegar a 0 → reset de attempts + state='idle'.
6. Manejo defensivo de `localStorage` indisponible (Safari private mode) con `try/catch` silencioso — la feature funciona en memoria, sin persistencia.

---

## 4. Configuración: `src/config/vault.ts`

```ts
import { emeraldCore, goldAccent } from '@/design-system';
import type { VaultCombination, VaultSymbolMeta } from '@/types/vault';

export const VAULT_STORAGE = {
  UNLOCKED: 'tm:vault:unlocked',
  ATTEMPTS: 'tm:vault:attempts',
  COOLDOWN_UNTIL: 'tm:vault:cooldown',
  UNLOCK_METHOD: 'tm:vault:method',
} as const;

export const VAULT_CONFIG = {
  MAX_ATTEMPTS: 3,
  COOLDOWN_MS: 5 * 60 * 1000,         // 5 min
  UNLOCK_ANIMATION_MS: 900,           // duración del glow antes de empezar el fade
  FADE_OUT_MS: 600,                   // fade del gate; total unlock→onUnlock = 1500ms
  OUTER_STEPS: 12,
  INNER_STEPS: 10,
  OUTER_RADIUS: 180,
  INNER_RADIUS: 118,
  OUTER_SIZE: 390,
  INNER_SIZE: 264,
  WHEEL_BASE: 440,
} as const;

export const VAULT_UNIVERSAL: VaultCombination = {
  outer: 'esmeralda',
  inner: 7,
};

export const VAULT_SYMBOLS: VaultSymbolMeta[] = [
  { id: 'esmeralda',     name: 'Esmeralda',     color: goldAccent.primary },
  { id: 'sol',           name: 'Sol',           color: '#E5C866' },
  { id: 'luna',          name: 'Luna',          color: '#C0C0C0' },
  { id: 'montana',       name: 'Montaña',       color: emeraldCore.primary },
  { id: 'rio',           name: 'Río',           color: '#4A90E2' },
  { id: 'arbol',         name: 'Árbol',         color: emeraldCore.dark },
  { id: 'ojo',           name: 'Ojo',           color: goldAccent.dark },
  { id: 'estrella',      name: 'Estrella',      color: '#E5C866' },
  { id: 'condor',        name: 'Cóndor',        color: '#8B7355' },
  { id: 'jaguar',        name: 'Jaguar',        color: '#D4AF37' },
  { id: 'espiral',       name: 'Espiral',       color: emeraldCore.light },
  { id: 'corazon_verde', name: 'Corazón Verde', color: emeraldCore.primary },
];

export const vaultPalette = {
  bg: '#0A0604',
  bgOverlay: 'rgba(0, 0, 0, 0.82)',
  steel: '#2E2823',
  steelLight: '#5C5148',
  gold: goldAccent.primary,
  goldGlow: 'rgba(212, 175, 55, 0.55)',
  emerald: emeraldCore.primary,
  error: '#C94C4C',
  textMuted: 'rgba(255, 255, 255, 0.55)',
  textOnGold: '#0A0604',
} as const;
```

---

## 5. Tipos: `src/types/vault.ts`

```ts
export type VaultSymbolId =
  | 'esmeralda' | 'sol' | 'luna' | 'montana' | 'rio' | 'arbol'
  | 'ojo' | 'estrella' | 'condor' | 'jaguar' | 'espiral' | 'corazon_verde';

export interface VaultSymbolMeta {
  id: VaultSymbolId;
  name: string;
  color: string;
}

export interface VaultCombination {
  outer: VaultSymbolId;
  inner: number;                       // 0..9
}

export type VaultState = 'idle' | 'unlocking' | 'error' | 'cooldown';

export type UnlockMethod =
  | { method: 'universal' }
  | { method: 'ambassador'; ambassadorSlug: string };
```

---

## 6. Combinación de embajador (Sheet + API)

### 6.1 Sheet
Agregar columna `vaultCode` en la hoja `asesores` con formato `{symbolId}:{digit}`, por ejemplo `corazon_verde:3`. Filas vacías → sin override (solo funciona la universal para ese embajador).

### 6.2 `api/get-asesores.ts`
Extender el mapeo de cada fila:

```ts
// Pseudo-diff
{
  slug,
  nombre,
  // ...campos existentes...
  vaultCode: row[VAULT_CODE_COLUMN_INDEX] || null,  // 'corazon_verde:3' | null
}
```

### 6.3 Consumo en cliente
Existe `src/hooks/useAsesores.ts` con `interface Asesor { id, name, slug, ... }`. Extender la interface con `vaultCode?: string | null;` y exponer una derivación memoizada:

```ts
function parseVaultCode(raw: string | null): VaultCombination | null {
  if (!raw) return null;
  const [outer, innerStr] = raw.split(':');
  const inner = Number.parseInt(innerStr, 10);
  if (!VAULT_SYMBOLS.some(s => s.id === outer)) return null;
  if (!Number.isInteger(inner) || inner < 0 || inner > 9) return null;
  return { outer: outer as VaultSymbolId, inner };
}

const ambassadorCodes = useMemo(() => {
  const map = new Map<string, VaultCombination>();
  for (const a of asesores) {
    const combo = parseVaultCode(a.vaultCode);
    if (combo) map.set(a.slug, combo);
  }
  return map;
}, [asesores]);
```

`ambassadorCodes` se pasa a `useVaultUnlock({ ambassadorCodes })` en `VaultLockScreen`.

---

## 7. Data flow de un drag + confirm

```
pointer down sobre VaultDial
  ├─ e.currentTarget.setPointerCapture(pointerId)
  ├─ dragging.current = true
  ├─ prev.current = pointerAngle(e)
  └─ clearError()

pointer move (mientras dragging)
  ├─ a = pointerAngle(e)
  ├─ delta = normalize(a - prev.current)       // lleva a [-180, 180]
  ├─ accumulated.current += delta
  ├─ motionValue.set(accumulated.current)      // spring → rotate
  └─ prev.current = a

pointer up / cancel
  ├─ snapped = round(accumulated.current / stepDeg) * stepDeg
  ├─ accumulated.current = snapped
  ├─ motionValue.set(snapped)
  ├─ newIndex = ((round(-snapped / stepDeg)) % N + N) % N
  └─ onChange(newIndex)                        // VaultLockScreen setea outerIdx/innerIdx

tap "Abrir"
  └─ useVaultUnlock.tryUnlock()
     ├─ combo = { outer: SYMBOLS[outerIdx].id, inner: innerIdx }
     ├─ ¿combo === VAULT_UNIVERSAL? ─ sí → UNLOCK('universal')
     ├─ ¿combo ∈ ambassadorCodes? ─ sí → UNLOCK('ambassador', slug)
     └─ no → attempts++ ─ si attempts>=3 → cooldown(5m)

UNLOCK(method, slug?):
  ├─ localStorage.set(UNLOCKED=true, METHOD)
  ├─ state='unlocking'
  ├─ setTimeout(900) → fadeOut=true
  └─ setTimeout(1500) → props.onUnlock({ method, ambassadorSlug? })
```

---

## 8. Error handling

| Escenario | Manejo |
|---|---|
| Combinación incorrecta | Shake 400ms, mensaje "Combinación incorrecta", "{n} intento(s) restante(s)". Los anillos **no** regresan a la posición inicial (el usuario ajusta desde donde está). |
| 3er fallo | Cooldown 5 min. Dials `disabled=true`. Center muestra `Lock` + `mm:ss`. Persistido en `COOLDOWN_UNTIL`. |
| Recarga durante cooldown | `Date.now() < cooldownUntil` → calcula segundos restantes y continúa en estado `cooldown`. |
| `localStorage` no disponible (Safari private mode, iframe) | `try/catch` silencioso en todas las ops. Feature funciona en memoria, unlock no persiste entre recargas. |
| `get-asesores` falla o tarda | `useAsesores` manejo actual; `ambassadorCodes` queda como `new Map()` vacío. Solo funciona la combinación universal. |
| `onUnlock` llamado dos veces por double-tap | Guard `if (state === 'unlocking') return;` en `tryUnlock`. |
| Override malformado en Sheet (ej. `"xyz:15"`) | `parseVaultCode` retorna `null`, el override se descarta silenciosamente. |

---

## 9. Accesibilidad

- **`prefers-reduced-motion: reduce`:**
  - Spring configs se vuelven rígidos (stiffness 520, damping 44, mass 0.35).
  - `lockShake` y `lockGlow` se desactivan (`animation: none`), feedback pasa a cambios de color instantáneos.
- **Keyboard:** cada `VaultDial` es `tabIndex={0}` con `role="slider"`, `aria-valuenow/min/max`, y responde a:
  - `ArrowLeft` / `ArrowRight` → rota ∓ 1 step
  - `Shift + Arrow` → rota ∓ 3 steps (rápido)
  - `Home` / `End` → va al primer/último item
- **ARIA:**
  - Wheel contenedor: `role="img"`, `aria-label="Combinación actual: {símbolo}, {dígito}"`.
  - `aria-live="polite"` con el texto de la combinación actual (cambio hablado al soltar).
  - Botón "Abrir": `aria-disabled` cuando `state !== 'idle'`.
  - En cooldown: `aria-live="assertive"` con "Bloqueado por {mm:ss}".
- **Touch targets:** los anillos tienen `min 44px` de zona drag efectiva (el tamaño mínimo 264 del inner ya lo cumple con creces).
- **Contraste:** símbolos sobre negro 0.82 overlay → todos los colores listados pasan WCAG AA para non-text (3:1 mínimo).

---

## 10. Responsive y performance

- `ResizeObserver` sobre el contenedor de wheel → `scale = Math.min(1, width / 440)`. Mínimo target: 320px (iPhone SE).
- `will-change: transform` en los anillos durante drag (removido al soltar) para hint al GPU.
- `touch-action: none` en anillos para evitar scroll accidental.
- `-webkit-user-select: none` + `-webkit-tap-highlight-color: transparent`.
- BG image con `link rel="preload" as="image"` inyectado al montar el gate.
- SVGs de símbolos inline → cero network requests, cero flicker.
- Anti-blinking (CLAUDE.md):
  - `useState(() => ...)` inicialización síncrona desde `localStorage`.
  - `useId()` en keys de labels.
  - No animaciones de fade entre estados — swaps instantáneos.

Target: **60fps** durante drag en iPhone 12+ Safari (medible con Safari Web Inspector Timeline).

---

## 11. Integración con `VaultPage.tsx`

Cambio mínimo al archivo existente:

```tsx
// Pseudo-diff en src/pages/VaultPage.tsx
const VaultPage: React.FC = () => {
  const [unlocked, setUnlocked] = useState(() => {
    try { return localStorage.getItem(VAULT_STORAGE.UNLOCKED) === 'true'; }
    catch { return false; }
  });

  const handleUnlock = useCallback((meta: UnlockMeta) => {
    setUnlocked(true);
    // TODO(T9.3 analytics): trackear meta.method
  }, []);

  if (!unlocked) {
    return <VaultLockScreen onUnlock={handleUnlock} />;
  }

  // ... contenido actual sin modificar ...
};
```

El contenido existente (placeholder "Próximamente") queda tal cual — T9.2 lo reemplazará con la galería real.

---

## 12. Testing

### 12.1 Unit (Vitest) — `useVaultUnlock.test.ts`
- Match de combinación universal → `state='unlocking'` + `UNLOCKED=true` persistido.
- Match de override de embajador con mock `ambassadorCodes` → `method='ambassador'` + slug correcto.
- 1er fallo → `attemptsLeft=2`, `state='error'`.
- 3er fallo consecutivo → `state='cooldown'` + `COOLDOWN_UNTIL` persistido.
- `tryUnlock` durante cooldown → no-op.
- Cooldown expira → tick lleva `cooldownSecondsLeft` a 0, reset automático a `idle`, attempts=0.
- `localStorage` throwing (mock) → hook funciona en memoria sin crash.

### 12.2 Component (React Testing Library)
- `VaultDial`:
  - Pointer down → move 45° → up: `onChange` llamado con índice +1 o -1 según dirección.
  - `disabled=true`: pointer events no disparan `onChange`.
  - Keyboard: focus + `ArrowRight` → `onChange(+1)`.
- `VaultCenter`:
  - Cada `state` renderiza la variante visual esperada (className/aria-label).
  - `state='cooldown'` con `cooldownSecondsLeft=125` → muestra "02:05".

### 12.3 Visual smoke
`VaultLockScreen` monta sin crash, renderiza 12 símbolos exteriores + 10 dígitos interiores, Center inicial muestra `esmeralda, 0`.

### 12.4 Fuera de alcance
- E2E Playwright del unlock completo — se dejará para T9.2 junto con la galería.
- Tests visuales (snapshot) de la animación — no hay infra de visual regression en el repo.

---

## 13. Criterios de aceptación (PR gate)

- [ ] Entrar a `/vault` sin unlock previo → `VaultLockScreen` ocupa el viewport completo (oculta header/nav).
- [ ] Drag de cada anillo rota con spring suave y hace snap al soltar. No "long way around" de más de 180°.
- [ ] Combinación `esmeralda + 7` → glow dorado → fade → contenido de `VaultPage` actual visible.
- [ ] Override de embajador abre correctamente. **Seed de test:** crear (o usar) cualquier embajador en el Sheet con `vaultCode = "corazon_verde:3"` — no depende de Paola Daza (T5). `tm:vault:method` queda `"ambassador:{slug}"` en localStorage.
- [ ] 3 fallos consecutivos → cooldown 5 min con countdown. Dials `disabled`. Refresh mantiene el cooldown.
- [ ] Unlock persiste entre recargas de `/vault`.
- [ ] iPhone 12+ Safari: 60fps durante drag (verificable con Web Inspector Timeline). Sin flicker de BG ni de símbolos.
- [ ] `prefers-reduced-motion: reduce` respetado (sin shake/glow, feedback por color).
- [ ] Keyboard: focus navegable entre los dos dials + botón, arrows rotan, Enter/Space activa "Abrir".
- [ ] `aria-live` anuncia la combinación actual al snap.
- [ ] `tsc --noEmit` limpio. `npm test` verde para los nuevos tests. `npm run build` sin errores (genera nuevo `APP_VERSION` auto).

---

## 14. Fuera de alcance (T9.2+ — specs futuros)

| Feature | Razón de diferimiento |
|---|---|
| Galería de productos `isVaultExclusive=true` | Requiere modelo de datos del campo en Sheet, filtros, detalle de item exclusivo. Spec propio. |
| CTA WhatsApp con contexto `vault` | Depende de la galería. |
| Analytics (`vault_unlock_success`, `vault_item_viewed`, `vault_contact_initiated`) | Requiere integración con TrackingContext + dashboard admin. |
| Botón "Cerrar bóveda" (re-bloquear manualmente) | Nice-to-have, no bloquea MVP. |
| Reset de attempts por admin | Útil para soporte, pero no MVP. |
| Tutorial/onboarding de cómo girar las ruedas | UX polish; reevaluar tras observar a usuarios reales. |
| Sonido mecánico al snap | Nice-to-have, requiere asset y decisión sobre mute default. |
| Combinación rotativa (cambia por día/semana) | Complejidad de sincronización admin/clientes; si se pide, spec propio. |

---

## 15. Estimación y secuencia de build

| Paso | Tiempo | Depende de |
|---|---|---|
| 1. `src/config/vault.ts` + `src/types/vault.ts` | 1h | — |
| 2. `VaultSymbol` (12 SVG inline) | 2-3h | 1 |
| 3. `VaultDial` + `VaultDialLabel` | 4-5h | 1 |
| 4. `VaultCenter` + animaciones CSS | 2-3h | 1, 2 |
| 5. `useVaultUnlock` + tests unit | 3-4h | 1 |
| 6. `VaultLockScreen` (integración) | 3h | 2, 3, 4, 5 |
| 7. `VaultPage.tsx` gate wrapping | 30min | 6 |
| 8. `get-asesores.ts` + `vaultCode` parsing cliente | 2h | 1 |
| 9. Tests de componente + smoke | 2-3h | 3, 4, 6 |
| 10. Ajuste responsive + a11y + QA device matrix | 3-4h | 6, 7 |
| 11. Asset `bg-vault.webp` (o fallback CSS) | 2h (si se produce) | — |

**Total estimado:** **3 días** de dev + buffer de 1 día para polish visual. Encaja en un sprint semanal.

---

## 16. Riesgos

| Riesgo | Mitigación |
|---|---|
| Drag feel en iPhone no responde como en cholqi (diferente Safari version o device) | Hacer QA físico en device matrix: iPhone 12, 14, 15. Ajustar spring `stiffness`/`damping` si hay jitter. |
| Asset `bg-vault.webp` no llega a tiempo | Fallback CSS ya definido (radial gradient + SVG de remaches). PR mergeable sin el asset final. |
| Equipo pide símbolos distintos después de ver demo | Los 12 símbolos son data-driven en `VAULT_SYMBOLS` → cambio de lista sin tocar lógica. Ordenar los símbolos alfabéticamente en el config para estabilidad visual; si cambia el orden, la combinación universal `esmeralda` sigue siendo por `id`, no por `index`. |
| La columna `vaultCode` del Sheet queda vacía para todos los asesores iniciales | OK — funcionará solo la universal. No bloquea merge. Se agregan códigos cuando Producto decida. |
| Usuarios se frustran sin saber la combinación | Fuera de alcance del spec; admin decide cómo distribuir el código (WhatsApp, DM). |

---

## 17. Siguiente paso

Pasar este spec a `superpowers:writing-plans` para generar el plan de implementación detallado paso-a-paso.

---

_Hecho con amor verde-esmeralda en Colombia 💚 · Tierra Mädre · T9.1_
