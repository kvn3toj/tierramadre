# Bóveda Secreta · Rediseño Cinematográfico

**Fecha:** 2026-04-22
**Estado:** Diseño aprobado — pendiente de plan de implementación
**Scope:** Rediseño visual + motion de `src/components/vault/*` manteniendo la lógica de unlock existente

---

## 1 · Contexto

La Bóveda Secreta (T9, commit `594f01d`) es la pantalla-gate que protege el acceso al catálogo de esmeraldas de Tierra Madre. Hoy presenta dos ruedas concéntricas (12 símbolos + 10 dígitos), un puntero dorado superior y un fondo radial oscuro. Es funcional y tiene personalidad, pero se siente más como "candado de caja elegante" que como **bóveda de banco de película**.

Este rediseño eleva la estética a territorio cinematográfico de joyero de alta costura — *Mission Impossible* con paleta Tierra Madre, no *Die Hard* metálico. La mecánica de dos capas (símbolo exterior + dígito interior) se conserva porque aporta:

- Dos factores de seguridad en el gate
- El impacto visual de un mecanismo analógico girando
- Compatibilidad completa con los códigos de asesor ya emitidos

## 2 · Estado actual

**Archivos existentes (no se renombran):**

- `src/components/vault/VaultLockScreen.tsx` — orquestador de la pantalla
- `src/components/vault/VaultDial.tsx` — dial rotatorio genérico (drag + keyboard)
- `src/components/vault/VaultCenter.tsx` — hub central con estado
- `src/components/vault/VaultSymbol.tsx` — renderer de íconos de símbolo
- `src/components/vault/VaultDialLabel.tsx` — wrapper de label en radio
- `src/config/vault.ts` — config, símbolos, paleta legacy
- `src/hooks/useVaultUnlock.ts` — state machine idle/unlocking/error/cooldown
- `src/pages/VaultPage.tsx` — page que monta el lockscreen

**Qué se preserva sin cambios:**

- API pública de `VaultLockScreen` (`onUnlock`, `ambassadorCodes`)
- Contrato de `useVaultUnlock` (state, attemptsLeft, cooldownSecondsLeft, tryUnlock)
- `VAULT_SYMBOLS` (12 símbolos: Esmeralda, Sol, Luna, Montaña, Río, Árbol, Ojo, Estrella, Cóndor, Jaguar, Espiral, Corazón Verde)
- `VAULT_UNIVERSAL = { outer: 'esmeralda', inner: 7 }`
- Storage keys y retries/cooldown (3 intentos, 5 min)

## 3 · Decisiones de diseño aprobadas

| # | Pregunta | Decisión |
|---|---|---|
| 1 | Tono cinematográfico | **D · Tech Moderno** con paleta Tierra Madre (no cian) |
| 2 | Anatomía | **V1 · Relojería refinada**, variante **A (textos derechos) + foco suave de C** |
| 3 | Mecánica | **Dos ruedas concéntricas** preservadas (dos factores, impacto analógico) |
| 4 | Secuencia de apertura | **C · Inmersión total** — 5 fases en 2400 ms, 12 principios de interaction-design |
| 5 | Sonido | **OFF por default**, toggle persistente en localStorage |
| 6 | Reduced-motion | **Modo silencioso completo** — 900–1100 ms sin 3D |

## 4 · Estética

### 4.1 Paleta

Se añade un subconjunto de tokens específicos para la bóveda en `src/design-system/tokens/vault-cinema.ts`, expuestos desde el barrel `src/design-system/index.ts`:

```ts
export const vaultCinema = {
  // Fondos
  ink: '#000000',
  nightDeep: '#030808',
  nightShadow: '#0a1a14',
  nightHint: '#152820',

  // Metal
  goldAged: '#8a7329',      // oro envejecido (bordes, ticks)
  champagne: '#c9a961',     // hairline / maker's mark
  champagneBright: '#dfc383', // dígitos activos / centro

  // Gema
  emerald: '#00AE7A',       // TM emerald base
  emeraldLight: '#4de0b0',  // highlight / active symbol

  // Error
  coral: '#C94C4C',         // failure accent (lerpeado desde emerald)

  // Interior revelado
  interiorWarm: 'rgba(255, 200, 120, 0.6)',
  interiorMid: 'rgba(120, 70, 30, 0.4)',
} as const;
```

La `vaultPalette` existente en `src/config/vault.ts` se mantiene como shim de compatibilidad pero se marca `@deprecated`, redirigiendo a los nuevos tokens.

### 4.2 Tipografía

- **Playfair Display** para todos los textos de la bóveda (símbolos, dígitos, centro, maker's mark)
- **DM Sans** solo para metadata secundaria (counter de cooldown, timing labels internos)
- Jerarquía del centro:
  - Símbolo actual: Playfair italic 11px, letter-spacing 0.3em, uppercase, emerald-light
  - Separador: línea hairline 20×1px con fade a champagne
  - Dígito actual: Playfair regular 34–42px (responsive), champagne-bright
  - Maker's mark: Playfair 8–9px, letter-spacing 0.5em, uppercase, champagne 0.4

### 4.3 Anatomía (V1 Relojería · A + foco)

**Estructura de capas (z-index ascendente):**

1. Fondo radial `#152820 → #0a1a14 → #000` con `inset shadow` + drop shadow
2. Anillo exterior hairline `border 1px rgba(201,169,97,0.18)` inset 5%
3. 12 símbolos: labels verticales (no rotan con el anillo), fuente Playfair italic
4. Anillo interior hairline `border 1px rgba(201,169,97,0.28)` + fill radial muy sutil
5. 10 dígitos: labels verticales, Playfair regular
6. Hub central: sin caja, solo tipografía (símbolo + separador + dígito)
7. Puntero superior: hairline 1×20px + gema esmeralda de 7×7px rotada 45°
8. Maker's mark: "Tierra Madre" o "Esencia · Poder" en footer dorado tenue
9. Gema esmeralda del puntero (capa más alta)

**Efecto foco (stagger de opacidad):**

- Símbolo/dígito activo: opacity 1.0, color full, 14px / 20px
- Vecinos directos (±1 step): opacity 0.6
- Resto: opacity 0.28

Esto se aplica dinámicamente según el índice seleccionado vs la posición. Se calcula en cada renderLabel.

## 5 · Motion

### 5.1 Vocabulario de curvas

```ts
// src/design-system/tokens/vault-motion.ts
export const vaultEasing = {
  silk:       'cubic-bezier(0.22, 1, 0.36, 1)',       // entradas elegantes
  weight:     'cubic-bezier(0.33, 0.1, 0.25, 1)',     // swing con masa
  anticipate: 'cubic-bezier(0.68, -0.55, 0.27, 1.55)', // undershoot
  breath:     'cubic-bezier(0.42, 0, 0.58, 1)',       // loops idle
} as const;
```

Cuatro curvas. Cualquier nueva animación debe usar una de estas — no se inventan bezier sueltos.

### 5.2 Estado Idle (el objeto vivo antes de tocar)

Todas estas animaciones se pausan cuando `document.visibilityState === 'hidden'` y cuando `prefers-reduced-motion: reduce`.

| # | Elemento | Animación | Duración |
|---|---|---|---|
| 1 | Gema del puntero (heartbeat) | `box-shadow 8→16→8px`, `scale 1→1.08→1` | 2800 ms loop · `breath` |
| 2 | Hub central (respiración) | `scale 1→1.004→1` | 3200 ms loop · `breath` |
| 3 | Anillo exterior (shimmer) | `linear-gradient(110deg, transparent, champagne 0.35, transparent)` barrido | Cada 8 s ±1.5 s aleatorio · 1200 ms |
| 4 | Gema del puntero (oil slick) | Hue-rotate 0→8→0° del gradient interno | 20 s loop · `breath` |

### 5.3 Secuencia de unlock (éxito · 2400 ms)

State machine: `useVaultUnlock.state` pasa por `idle → unlocking → unlocked`. El componente visual consume cada cambio y dispara la fase correspondiente.

| Fase | Rango | Qué pasa | Easing | Duración |
|---|---|---|---|---|
| **Anticipate** | 0–80 ms | Ambos anillos recogen −3° inward (outer ⟲ izquierda, inner ⟳ derecha) | `anticipate` | 80 ms |
| **Confirm** | 80–400 ms | Gema pulse `scale 1→1.4→1`; centro text-shadow emerald; brightness anillos 1.15; haptic `vibrate(10)` mobile | `spring(400, 15)` | 320 ms |
| **Release** | 400–900 ms | 4 hairlines doradas `width 0→46%` desde centro hacia cardinales N→E→S→W con **stagger 40 ms**; al llegar cada línea emerge su micro-esmeralda con spring overshoot; anillos `rotate −2°` releasing tension | `silk` · `spring(500, 18)` para gemas | 320 ms + stagger |
| **Swing** | 900–1680 ms | Puerta entera `perspective(1200px) rotateY(0→62deg)`; gradient dinámico oscurece el lado de fuga; fondo hace paralaje `translateX 12px` hint de profundidad | `weight` | 690 ms |
| **Reveal** | 1680–2200 ms | Interior ámbar fade-in `opacity 0→1`, `scale 0.85→1.08` | `silk` | 400 ms |
| **Dolly** | 2100–2400 ms | Contenedor `scale→1.06`, `opacity 1→0`, `filter blur(0→4px)`; `onUnlock` dispara a 2200 ms (200 ms overlap con la vista siguiente) | `ease-in` | 300 ms |

**Orquestación:** Framer Motion `useAnimate()` con una timeline secuencial. Cada fase expone un `onComplete` que avanza al siguiente timer. El `onUnlock` del prop se llama a 2200 ms.

### 5.4 Secuencia de failure (~1200 ms)

Se dispara cuando `useVaultUnlock.state` transiciona a `error`.

| # | Rango | Qué pasa | Easing |
|---|---|---|---|
| F1 | 0–600 ms | **Shake con peso diferencial**: inner `translateX(0,−8,8,−6,6,−3,3,0)`; outer el mismo shake con **60 ms de retraso** y **70% amplitud** | `spring(800, 10)` |
| F2 | 0–300 ms | **Color lerp de gema**: emerald → coral vía HSL (H 155→0, S/L constantes), luego vuelve a emerald en 1200 ms | `silk` |
| F3 | 600–900 ms | Anillos quedan desencajados: outer **−4°** off, inner **+6°** off; luego spring-back a posición válida | `weight` · 400 ms |
| F4 | 700–1000 ms | Mensaje "N intentos restantes" aparece debajo: `translateY(12→0)` + `opacity(0→1)` | `silk` · 200 ms |

### 5.5 Cooldown (tras 3 intentos fallidos)

- Gema del puntero: `opacity → 0.3`, sin breath, color gris
- Anillos: `filter: brightness(0.4)`, no interactivos (`inert`, `aria-disabled="true"`)
- Counter visible: "Intenta en {MM:SS}", tabular-nums, DM Sans 13px, champagne 0.7
- Cada segundo el counter hace `scale 1→1.03→1` en 240 ms `silk` (pulso muy sutil)
- Al expirar: fade del counter + restore de brightness + restore de gema (800 ms `silk`)

## 6 · Accesibilidad

### 6.1 Reduced-motion mode

Cuando `window.matchMedia('(prefers-reduced-motion: reduce)').matches`:

- **Todas las animaciones 3D desactivadas** (no `rotateY`, no `perspective`)
- **Idle loops completamente apagados** (gema estática, hub estático, sin shimmer, sin oil slick)
- **Unlock sequence colapsa a**:
  - Confirm: cross-fade del color del centro (200 ms)
  - Release: las 4 micro-esmeraldas aparecen simultáneas con fade (300 ms)
  - Swing: cross-fade de puerta a interior ámbar (400 ms, sin rotateY)
  - Reveal: fade out directo (200 ms)
  - **Total: 1100 ms**
- **Failure colapsa a**: color lerp + mensaje inline, sin shake

### 6.2 Focus management

1. Al presionar "Abrir": `document.activeElement.blur()` para evitar flicker de focus ring durante secuencia
2. Durante la secuencia: contenedor raíz con `aria-hidden="true"` + `inert` attribute; focus trap desactivado
3. Al terminar (crossfade completo): `focus()` programático al primer `<h1 tabindex="-1">` de la vista destino
4. Cooldown: focus lock al counter con `aria-live="polite"` (updates cada 1 s, no cada frame)

### 6.3 Screen reader announcements

- Al iniciar unlock: `aria-live="polite"` → "Abriendo bóveda"
- Al completar: `aria-live="assertive"` → "Bóveda abierta. Catálogo disponible"
- Al fallar: `aria-live="polite"` → "Combinación incorrecta. {N} intentos restantes"
- Al entrar cooldown: `aria-live="assertive"` → "Demasiados intentos. Bóveda bloqueada 5 minutos"

### 6.4 Touch targets y haptics

- Dials con touch target ≥ 44×44 px (hit area extendida vía pseudo-element, no tamaño visual)
- `navigator.vibrate(10)` en confirm (si disponible)
- `navigator.vibrate([30, 40, 30])` en failure
- Audio: solo se reproduce si `prefers-reduced-motion: no-preference`

## 7 · Sistema de audio (opcional)

**Default:** OFF. Toggle persistente en `localStorage.tm:vault:audio` (`'on' | 'off'`). Botón de toggle mostrado debajo del botón "Abrir" (icono de speaker).

**Samples (≤30 KB cada uno, AAC o MP3, mono 22050 Hz):**

| Sample | Cuándo | Volumen |
|---|---|---|
| `click-suizo.mp3` | Confirm (80 ms in) | 0.35 |
| `thunk-mecanico.mp3` | Release (400 ms in) | 0.40 |
| `crujido-swing.mp3` | Swing (900 ms in) | 0.45 |
| `pad-reveal.mp3` | Reveal (1680 ms in, fade in 500 ms) | 0.30 |
| `shake-error.mp3` | Failure (opcional, 0 ms) | 0.35 |

**Implementación:** Web Audio API con `AudioContext` lazy (se crea en el primer unlock attempt si audio está ON). Buffers decodificados una sola vez y cacheados en un `useRef(Map)`. Nunca se descarga audio si el usuario no lo activó.

## 8 · Arquitectura de componentes

### 8.1 Nuevos archivos

```
src/design-system/tokens/
├── vault-cinema.ts         # paleta + tipografía tokens
└── vault-motion.ts         # easing + durations

src/components/vault/
├── cinematic/
│   ├── VaultDoorFrame.tsx          # fondo radial + hairlines + maker's mark + idle breath
│   ├── VaultGemPointer.tsx         # gema esmeralda superior + heartbeat + oil slick
│   ├── VaultCardinalRelease.tsx    # las 4 hairlines + micro-esmeraldas (stagger)
│   ├── VaultInterior.tsx           # reveal ámbar interior
│   └── useVaultCinematicSequence.ts # orquesta las 5 fases con framer-motion
└── audio/
    ├── useVaultAudio.ts            # lazy AudioContext + buffer cache + toggle
    └── samples/                    # 5 archivos mp3

src/hooks/
└── useVaultReducedMotion.ts        # hook para modo silencioso
```

### 8.2 Archivos modificados

- `VaultLockScreen.tsx`: consume los nuevos componentes cinematográficos; orquesta secuencia via `useVaultCinematicSequence`; añade toggle de audio; ajusta estructura de layout
- `VaultDial.tsx`: añade prop `focusMode` (boolean) que aplica la lógica de stagger de opacidad en renderLabel; añade `onRotationChange` para permitir el anticipate
- `VaultDialLabel.tsx`: acepta prop `opacity` (derivada del foco) y aplica Playfair siempre vertical (no rota con el ring)
- `VaultCenter.tsx`: rediseñado con tipografía Playfair monumental + línea separadora + maker's mark; sin caja
- `VaultSymbol.tsx`: no se usa en el rediseño (se mantiene por si otros consumidores lo importan); se añade `@deprecated` y se exporta como shim
- `config/vault.ts`: `vaultPalette` marcado `@deprecated` con shim a `vaultCinema`

### 8.3 Contrato de `useVaultCinematicSequence`

```ts
export interface VaultCinematicSequenceOptions {
  state: 'idle' | 'unlocking' | 'error' | 'cooldown' | 'unlocked';
  reducedMotion: boolean;
  onSequenceComplete: () => void; // equivalente a onUnlock después del crossfade
}

export interface VaultCinematicSequenceReturn {
  phase: 'idle' | 'anticipate' | 'confirm' | 'release' | 'swing' | 'reveal' | 'dolly' | 'failure';
  progress: number; // 0–1 dentro de la fase actual
  scope: React.RefObject<HTMLElement>; // para useAnimate
}
```

## 9 · Performance targets

- **60 fps en iPhone 12 baseline** (Safari iOS) durante toda la secuencia
- Solo `transform`, `opacity`, `filter` en animaciones (GPU-compositable)
- `will-change: transform` aplicado a anillos **solo durante swing** (set en `anticipate`, unset después de `dolly`)
- SVG (no PNG) para gemas, hairlines, maker's mark
- Idle loops pausados si `document.visibilityState === 'hidden'` (suscripción al event)
- Debounce de `tryUnlock`: mínimo 800 ms entre intentos
- Audio samples ≤30 KB cada uno, decode una sola vez

**Lighthouse targets:**

- Performance ≥ 95 (página VaultPage)
- Animation smoothness (CLS proxy) ≥ 95
- No layout shift durante toda la secuencia (validar con `web-vitals` lib)

## 10 · Testing plan

### 10.1 Manual (golden path)

1. Abrir `/vault` en Chrome desktop → idle breath visible en gema del puntero
2. Insertar combinación universal (Esmeralda · 7) → anticipate + confirm + release + swing + reveal secuencia completa de 2400 ms
3. Insertar combinación incorrecta → shake diferencial + color lerp + desajuste + mensaje
4. 3 intentos fallidos → cooldown con counter
5. Cooldown expira → restore completo

### 10.2 Manual (accesibilidad)

1. macOS Reduce Motion ON → secuencia colapsa a 1100 ms, sin 3D, sin breath loops
2. VoiceOver ON → anuncios en cada transición de estado
3. Navegación solo por teclado → focus llega al dial, Arrow keys funcionan, Enter confirma, focus se va al destino después del unlock
4. iPhone 12 Safari → haptics disparan, 60 fps sostenidos, audio opcional funciona con toggle

### 10.3 Visual regression

- Snapshot de VaultLockScreen en 3 estados (idle, error con 2 attempts left, cooldown)
- Snapshot en dark + light (si aplica — la bóveda es dark-only)
- Mobile 375px + tablet 768px + desktop 1440px

### 10.4 Codes de asesor

- Regresión: los códigos de asesor existentes (ambassadorCodes Map) siguen funcionando idénticos tras el rediseño
- No se introducen nuevos tipos ni se modifica el shape de `UnlockMethod`

## 11 · Scope explícito — qué NO incluye este rediseño

Para evitar scope creep durante la implementación:

- ❌ **No se cambia** la lógica de `useVaultUnlock` ni los storage keys
- ❌ **No se agregan** nuevos símbolos ni códigos universales
- ❌ **No se rediseña** la página post-unlock (VaultPage)
- ❌ **No se agrega** biometric unlock, sólo el rediseño del combinador
- ❌ **No se construye** un sistema de sonido general para otras partes del app — es local a la bóveda
- ❌ **No se rediseña** el botón "Abrir" más allá de ajustarlo al nuevo vocabulario (pequeño ajuste de paleta y tipografía, no componente nuevo)
- ❌ **No se introduce** una librería nueva de audio (Web Audio API nativa)
- ❌ **No se soportan** navegadores sin `perspective` 3D (todos los modernos lo tienen; si por algún motivo no está, el modo reduced-motion hace fallback)

## 12 · Riesgos conocidos

| Riesgo | Mitigación |
|---|---|
| Secuencia 2400 ms se siente larga en uso repetido | Añadir opción "skip animation" en localStorage después del primer unlock exitoso (fuera de este spec, para iteración 2) |
| `rotateY(62deg)` + backface-visibility puede causar artefactos en Safari iOS antiguo | Testear en iOS 15+ baseline; fallback automático a reduced-motion mode si se detecta glitch |
| Audio samples pueden no descargarse en redes lentas | Lazy load bajo demanda (solo si usuario activa audio); fallback silencioso si falla el fetch |
| `will-change: transform` permanente puede crear leaks de memoria GPU | Siempre unset después de la secuencia; confirmar con devtools memory profiler |
| El shimmer cada 8 s puede resultar distracting | Hacer el `linear-gradient` muy sutil (champagne 0.35 max); si en testing se percibe molesto, bajar a 0.2 |

## 13 · Referencias visuales y contexto cinematográfico

- *Ocean's Eleven* (2001) — Bellagio vault: proporción del hub central y manija grande
- *Mission Impossible: Rogue Nation* — vault CIA: idle breath de los mecanismos, pulsos sutiles
- *Skyfall* — shimmer del metal bajo luz de joyería
- Referencias mecánicas: Patek Philippe calibre 89 (carátula parcial), Vacheron Constantin (oil slick en esmalte)

---

**Aprobación:** Kevin — 2026-04-22
**Próximo paso:** plan de implementación via `writing-plans`
