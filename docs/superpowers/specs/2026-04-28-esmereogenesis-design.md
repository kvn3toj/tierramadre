# Esmereogénesis — Spec de Diseño (Frontend Prototype)

**Fecha**: 2026-04-28
**Proyecto**: Tierra Madre Studio
**Tipo**: Feature nuevo · Solo UI/UX · Mock data
**Autor**: brainstorming session con Kevin (kvn3toj@gmail.com)

---

## 1. Context — Por qué este feature existe

Tierra Madre vende esmeraldas colombianas de alto valor. El precio puede ser un freno emocional: comprometerse con un objeto físico costoso requiere fricción mental fuerte. La industria estándar resuelve esto con **crédito** (deuda + cuotas + intereses), pero esa lógica contradice la filosofía de Tierra Madre ("Esmeraldas con ADN de Paz", relación consciente con la gema).

**Esmereogénesis** es la propuesta alternativa: un **método de ahorro con propósito**, no un crédito. El usuario no toma la esmeralda y debe pagar; el usuario riega su esmeralda con aportes hasta que cobra vida y la reclama.

La inspiración visual viene del paradigma de las apps de enfoque mental (Forest, Finch, Flora, Plantie): **una entidad viva crece a medida que el usuario le dedica intención**. Aquí adaptamos ese loop al ahorro consciente — cada aporte limpia la esmeralda y hace florecer raíces orgánicas a su alrededor.

**Outcome esperado**: prototipo funcional de frontend (mock data) que demuestre el valor emocional del método antes de invertir en backend financiero.

---

## 2. Decisiones fundacionales (validadas con usuario)

| Dimensión | Decisión |
|---|---|
| Metáfora visual | **Híbrido cristal + raíces orgánicas**. La esmeralda misma evoluciona (sucia→brillante) Y nacen raíces/hojas/partículas a su alrededor. |
| Modelo de plan | **Ritmo sugerido + abono libre**. Usuario elige duración objetivo, sistema sugiere ritmo semanal, pero puede abonar libre. Racha visible. Sin multas. |
| Alcance del prototipo | **Hub + plan individual**. Tres rutas: producto → hub global → jardín de cada plan. Permite múltiples planes simultáneos. |
| Animación de abono | **Cinematográfica tipo Bóveda**. Takeover full-screen de ~7.5s con 7 fases (anticipación→riego→limpieza→floración→ring→partículas→confirmación). Skippable con tap. |
| Cierre 100% | **Ceremonia de Eclosión + CTA Reclamar**. Animación final especial + flow mock "Tu asesor te contactará". El plan queda archivado con sello "Adquirida". |

---

## 3. Principios de diseño

1. **No es deuda — es vivienda**. Vocabulario evita "cuota", "pagar", "deber". Usa "regar", "aporte", "abono", "florecer", "eclosión".
2. **El cristal está vivo**. Cada interacción debe sentirse como cuidar a un ser que responde. Latido sutil en idle, partículas que respiran, glow que pulsa con la racha.
3. **Sin penalización por fallar**. La racha se rompe, pero el progreso permanece. La esmeralda no regresa visualmente, solo deja de florecer raíces nuevas hasta el próximo aporte.
4. **Hub como jardín colectivo**. Cuando el usuario tiene varios planes, el hub muestra todos sus cristales en composición de jardín, no como lista plana.
5. **Ceremonia, no transacción**. El abono es un momento. Reusa el patrón cinematográfico de Bóveda Secreta para mantener consistencia narrativa con otros rituales del producto.

---

## 4. Arquitectura de pantallas

```
/product/:itemId  ──[botón "Esmereogénesis"]──┐
                                              │
                                              ▼
                              /esmereogenesis  (HUB)
                                  │
                                  ├── Lista jardín de planes activos
                                  ├── Total ahorrado global · racha global
                                  ├── Botón "Iniciar nueva Esmereogénesis"
                                  ├── Sección "Adquiridas" (planes 100%)
                                  │
                                  ▼
              /esmereogenesis/:planId  (JARDÍN)
                  │
                  ├── Estado: vacío / activo / completado
                  ├── LivingEmerald (cristal + raíces que evoluciona)
                  ├── ProgressGardenRing (anillo orgánico de progreso)
                  ├── Ritmo + Racha + Próxima sugerencia
                  ├── Botón "Regar mi esmeralda" → triggers AbonoCinematic
                  ├── Historial de aportes (timeline orgánica)
                  └── Estado completado → "Reclamar tu esmeralda"
```

### 4.1 Onboarding (primera vez)

- **Si no hay plan activo**: hub muestra estado vacío con animación de semilla flotante + texto "Tu jardín de esmeraldas espera. Comienza tu primera Esmereogénesis." + CTA hacia el catálogo.
- **Si entra desde producto sin plan creado**: la primera vez que toca el botón "Esmereogénesis" en `/product/:itemId`, se abre **CreationSheet** (BottomSheet inline, no modal full):
  - Selector visual de duración: 3 / 6 / 9 / 12 meses (preview del ritmo semanal calculado live)
  - Texto narrativo: "Tu Esmeralda Venus tomará vida en X meses con aportes semanales de $Y"
  - Botón "Sembrar mi Esmereogénesis" → crea plan, navega a `/esmereogenesis/:planId` con animación inicial de "siembra" (la esmeralda aparece cubierta de tierra)

---

## 5. Data model (mock)

### 5.1 Tipos TypeScript

```typescript
// src/types/esmereogenesis.ts

export type EsmereoState = 'empty' | 'seeded' | 'growing' | 'completed' | 'claimed';

export interface EsmereoPlan {
  id: string;                    // uuid local
  itemId: number;                // referencia a TreasureItem.item
  productSnapshot: {             // congelado al momento de crear
    nombre: string;
    imagen: string;
    precioCOP: number;
    peso: string;
    color: string;
  };
  targetCOP: number;             // = precioCOP al momento de crear
  totalAbonadoCOP: number;
  durationMonths: 3 | 6 | 9 | 12;
  weeklySuggestedCOP: number;    // = targetCOP / (durationMonths * 4)
  createdAt: string;             // ISO
  updatedAt: string;
  completedAt?: string;
  claimedAt?: string;
  state: EsmereoState;
  aportes: Aporte[];
  streak: {
    currentWeeks: number;        // semanas consecutivas con aporte
    longestWeeks: number;
    lastAporteWeekStart: string; // ISO de lunes
  };
}

export interface Aporte {
  id: string;
  planId: string;
  amountCOP: number;
  createdAt: string;
  type: 'suggested' | 'free';    // si fue monto sugerido o libre
}
```

### 5.2 Mock generator

```typescript
// src/data/esmereo-mock.ts

export const seedDemoPlans = (treasureItems: TreasureItem[]): EsmereoPlan[] => {
  // Devuelve 3 planes mock para showcase:
  // 1) Plan recién sembrado (5% progreso, racha 1 semana)
  // 2) Plan en progreso medio (47% progreso, racha 6 semanas)
  // 3) Plan casi completo (92% progreso, racha 14 semanas)
  // Si el usuario no tiene planes en localStorage, ofrece "demo seed".
};

export const simulateAbono = async (
  planId: string,
  amountCOP: number
): Promise<Aporte> => {
  // Delay de 800ms para emular procesamiento
  // Devuelve aporte mock
  // En implementación real, esto sería llamada a API
};
```

### 5.3 Persistencia

- **Hook**: nuevo `useEsmereogenesis()` (Context + Provider).
- **Storage key**: agregar `STORAGE_KEYS.ESMEREO_PLANS = 'tierra-madre-esmereo-plans'` en `src/constants/storage-keys.ts`.
- **Patrón**: useState con init síncrono desde localStorage (consistente con `useCart.ts:23-47`), useEffect para persist.
- **No usar useReducer** (proyecto no lo usa). Composición de useState + funciones helper.

---

## 6. Componentes clave a crear

```
src/components/esmereogenesis/
├── LivingEmerald.tsx               ← Cristal + raíces orgánicas, animado por progreso
├── OrganicRoots.tsx                ← Raíces SVG que florecen incrementalmente
├── ProgressGardenRing.tsx          ← Ring de progreso con textura orgánica (var. de ProgressRing)
├── EsmereoCreationSheet.tsx        ← BottomSheet de creación inicial
├── EsmereoHubGarden.tsx            ← Composición visual de jardín en hub
├── EsmereoPlanCard.tsx             ← Tarjeta de plan en hub (mini esmeralda + ring)
├── AbonoCinematic/
│   ├── AbonoCinematic.tsx          ← Container que orquesta las 7 fases
│   ├── useAbonoSequence.ts         ← Patrón paralelo a useVaultCinematicSequence
│   ├── DropletPhase.tsx            ← Fase de gota dorada
│   ├── WashPhase.tsx               ← Fase de polvo desprendido
│   ├── BloomPhase.tsx              ← Fase de raíces que florecen
│   ├── ParticlesPhase.tsx          ← Fase de partículas doradas ascendentes
│   └── ConfirmationPhase.tsx       ← Fase de confirmación + monto
├── EclosionCeremony.tsx            ← Variante especial cinematic para 100%
├── StreakIndicator.tsx             ← Visualización de racha con llama orgánica
├── AporteHistoryTimeline.tsx       ← Timeline de aportes con metáfora de gotas
├── ClaimSheet.tsx                  ← Sheet "Tu asesor te contactará" (mock)
└── EsmereogenesisCTA.tsx           ← Botón en página producto (variant especial)
```

### 6.1 Componente LivingEmerald (corazón visual)

Estructura de capas (z-index ascendente):

```
1. AmbientGlow            radial gradient esmeralda + halo
2. ParticleField          partículas suaves flotando (Framer Motion)
3. RootsLayer             OrganicRoots component, intensidad = progress%
4. EmeraldCrystal         imagen del producto con filtro CSS dinámico
5. SurfaceDust            overlay de polvo/musgo, opacity = (1 - progress)
6. SpecularHighlights     reflejos de luz (Liquid Glass mixin)
7. SparkleField           sparkles ocasionales si progress > 50%
```

Props:
```typescript
interface LivingEmeraldProps {
  imageSrc: string;
  progress: number;              // 0-1
  state: EsmereoState;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  isPulsing?: boolean;           // true durante idle
  recentAporteAt?: number;       // timestamp para trigger glow
}
```

Comportamientos:
- **Pulse de latido suave** en idle (scale 1→1.02→1, duración 3s, infinite) — usa `motion.pulse` token existente.
- **Glow boost** cuando recibe aporte reciente (últimos 30s) — sombra emerald que crece y decae.
- **Filtros CSS dinámicos** sobre la imagen real del producto:
  - `progress 0%`: `brightness(0.4) saturate(0.3) blur(0.5px)`
  - `progress 100%`: `brightness(1.15) saturate(1.2) contrast(1.1)`
  - Interpolar linealmente entre los dos.

---

## 7. Sistema de animación cinematográfica

### 7.1 AbonoCinematic — secuencia de 7 fases

Reusa el patrón de `useVaultCinematicSequence.ts` (8 fases temporales orquestadas):

```typescript
// useAbonoSequence.ts
type AbonoPhase =
  | 'idle'
  | 'anticipate'    // 0.0-0.5s — pantalla atenúa, esmeralda al centro
  | 'droplet'       // 0.5-1.5s — gota dorada suspendida arriba
  | 'wash'          // 1.5-2.5s — splash + polvo se desprende
  | 'reveal'        // 2.5-4.0s — facetas emergen, brillo aumenta
  | 'bloom'         // 4.0-5.0s — raíces brotan
  | 'progress'      // 5.0-6.0s — ring avanza con count-up del número
  | 'confirm'       // 6.0-7.0s — partículas suben + texto "+$X abonado"
  | 'release';      // 7.0-7.5s — vuelve al jardín, esmeralda más viva
```

**Skippable**: tap en cualquier momento → adelanta a `release` con la animación condensada en 0.6s. No corta abruptamente.

**Audio** (reusar `useVaultAudio` pattern, agregar samples nuevos):
- `gota.mp3` — durante droplet phase
- `wash.mp3` — durante wash phase
- `bloom.mp3` — durante bloom phase
- `chime-confirm.mp3` — al final, breve y luminoso
- Respeta toggle global de sonido (LiquidGlassContext o similar)

**Haptic** (`navigator.vibrate`):
- Tap leve al iniciar (5ms)
- Pulso medio en wash (15ms)
- Pulso fuerte al confirm (25ms)
- Solo si está habilitado y disponible

### 7.2 EclosionCeremony — variante para 100%

Cuando el aporte completa el plan:
- En lugar de `confirm` phase normal, escala a `eclosion` phase de 4s adicionales:
  - Halo dorado expansivo desde el centro
  - Esmeralda asciende 20px, sin tierra residual
  - Raíces florecen en composición simétrica completa
  - Texto "Tu Esmeralda ha cobrado vida" emerge con typewriter
- Después navega a vista de plan completado con CTA "Reclamar tu Esmeralda"

### 7.3 Tokens de motion a reusar

De `src/design-system/tokens/motion.ts`:
- `spring.gentle` — para grow/bloom (stiffness: 200)
- `spring.smooth` — para transiciones de fase
- `pulse` — para latido idle de esmeralda
- `progressRing` — para anillo
- `shimmer` — para sparkles
- `cssTransition.slow` — para crossfades entre estados

De `src/design-system/tokens/gradients.ts`:
- `emeraldGradients.intense` — para halo
- `radialGradients.hoverGlow` — para spotlight
- `meshGradients.emerald` — para fondo del jardín
- `conicGradients.emeraldSpectrum` — para anillo de progreso

---

## 8. Diseño de pantallas

### 8.1 `/esmereogenesis` (HUB)

**Estado vacío** (sin planes):
```
┌─────────────────────────────────────────┐
│  ←  Esmereogénesis              ⚙       │
│                                          │
│           [semilla animada]              │
│                                          │
│       Tu jardín de esmeraldas            │
│             aún no nace.                 │
│                                          │
│   Elige una esmeralda y comienza         │
│      tu primera Esmereogénesis.          │
│                                          │
│        [Explorar catálogo]               │
└─────────────────────────────────────────┘
```

**Estado con planes** (1+):
```
┌─────────────────────────────────────────┐
│  ←  Esmereogénesis              ⚙       │
│                                          │
│   ── Tu jardín ──                        │
│   3 esmeraldas en proceso · 47% global  │
│   🔥 Racha global: 6 semanas             │
│                                          │
│   ┌──────┐  ┌──────┐  ┌──────┐          │
│   │ ◆◇◇  │  │ ◆◆◇  │  │ ◆◆◆  │          │
│   │ Venus│  │Esper.│  │Aurora│          │
│   │ 23%  │  │ 47%  │  │ 92%  │          │
│   └──────┘  └──────┘  └──────┘          │
│                                          │
│   [+ Sembrar nueva Esmereogénesis]      │
│                                          │
│   ── Adquiridas ──                       │
│   ┌──────┐                               │
│   │ ✦◆✦  │  Cleopatra · adquirida       │
│   │ 2026 │  hace 1 mes                   │
│   └──────┘                               │
└─────────────────────────────────────────┘
```

**Composición de jardín**: las cards de planes activos se renderizan con su `LivingEmerald` propio en pequeño, posicionadas en una grid orgánica (no rígida). Cada card lleva al jardín individual al toque.

### 8.2 `/esmereogenesis/:planId` (JARDÍN)

**Layout principal** (estado activo):

```
┌─────────────────────────────────────────┐
│  ←  Esmeralda Venus               ⋯     │
│                                          │
│                                          │
│         [LivingEmerald · grande]         │
│         con ring de progreso             │
│         orgánico envolvente              │
│                                          │
│              47%                         │
│        $1,750,000 / $4,200,000          │
│                                          │
│   ── Ritmo sugerido ──                   │
│   ✨  $175,000 / semana                  │
│   🔥  Racha: 6 semanas                  │
│                                          │
│        [💧 Regar mi esmeralda]          │
│         Aporte sugerido $175,000         │
│         (toca para abono libre)          │
│                                          │
│   ── Tus aportes ──                      │
│   📍 Hoy · $175,000                      │
│   📍 Hace 1 semana · $175,000            │
│   📍 Hace 2 semanas · $250,000           │
│   ... [Ver historial completo]          │
└─────────────────────────────────────────┘
```

**Estado completado**:
```
┌─────────────────────────────────────────┐
│  ←  Esmeralda Venus               ⋯     │
│                                          │
│         [LivingEmerald · estática        │
│          en estado pleno con halo]       │
│                                          │
│        ✦  Tu Esmeralda ha cobrado vida  │
│            Completada en 5 meses         │
│                                          │
│        [Reclamar tu Esmeralda]          │
│                                          │
│   Tu asesor coordinará la entrega        │
└─────────────────────────────────────────┘
```

### 8.3 Botón en `/product/:itemId`

Agregar **EsmereogenesisCTA** en `ProductActions.tsx`, posicionado entre la CTA primaria "Agregar a Selección" y los botones secundarios. Visual:

```
┌────────────────────────────────────┐
│  [Agregar a Selección]             │ ← existente (primary)
│                                     │
│  ╔═══════════════════════════════╗ │
│  ║ ✦ Esmereogénesis             ║ │ ← NUEVO (special variant)
│  ║   Adquiérela ahorrando        ║ │
│  ║   con propósito               ║ │
│  ╚═══════════════════════════════╝ │
│                                     │
│  [Compartir]    [Consultar]        │ ← existentes (secondary)
└────────────────────────────────────┘
```

Estilo:
- Variante propia: borde animado de gradiente esmeralda, fondo glass sutil
- Icono ✦ con animación de breathing (idle pulse)
- Si el usuario ya tiene un plan activo para ESTE producto: el botón cambia a "Continuar Esmereogénesis · 47%" con micro ring inline
- Si lo toca y NO tiene plan: abre **EsmereoCreationSheet** in-page (BottomSheet)
- Si tiene plan: navega directo a `/esmereogenesis/:planId`

---

## 9. Estados y edge cases

| Caso | Comportamiento |
|---|---|
| Usuario sin planes ni storage | Hub muestra empty state. Botón en producto abre creation sheet. |
| Usuario crea plan, vuelve al producto | Botón muestra "Continuar Esmereogénesis · X%" |
| Usuario tiene plan completado | Botón muestra "Reclamada · ver detalles" |
| Usuario tiene 2 planes para mismo producto | No permitido — la creation sheet detecta y redirige al existente |
| Racha rota (>1 semana sin aporte) | Streak resetea a 0 al próximo aporte; sin regresión visual; toast informativo "Tu racha se reinició, pero tu jardín sigue creciendo" |
| Aporte que excede el total restante | Sheet de confirmación: "Esto completará tu Esmereogénesis. ¿Confirmas?" → si sí, dispara EclosionCeremony |
| Animación interrumpida (tap skip) | Se condensa a 0.6s release final con la confirmación visible |
| Audio deshabilitado globalmente | Todas las fases siguen funcionando sin sonido |
| Haptics no disponibles | Silencioso, no error |
| LocalStorage lleno | Try/catch, fallback a sessionStorage, toast advertencia |
| Usuario en /esmereogenesis/:invalidId | Redirect a `/esmereogenesis` con toast "Plan no encontrado" |

---

## 10. Archivos a crear/modificar

### Crear

```
src/types/esmereogenesis.ts
src/data/esmereo-mock.ts

src/contexts/EsmereogenesisContext.tsx

src/pages/esmereogenesis/
├── EsmereogenesisHubPage.tsx
└── EsmereogenesisGardenPage.tsx

src/components/esmereogenesis/
├── EsmereogenesisCTA.tsx
├── LivingEmerald.tsx
├── OrganicRoots.tsx
├── ProgressGardenRing.tsx
├── EsmereoCreationSheet.tsx
├── EsmereoHubGarden.tsx
├── EsmereoPlanCard.tsx
├── StreakIndicator.tsx
├── AporteHistoryTimeline.tsx
├── ClaimSheet.tsx
├── EclosionCeremony.tsx
└── AbonoCinematic/
    ├── AbonoCinematic.tsx
    ├── useAbonoSequence.ts
    ├── DropletPhase.tsx
    ├── WashPhase.tsx
    ├── BloomPhase.tsx
    ├── ParticlesPhase.tsx
    └── ConfirmationPhase.tsx

src/hooks/useEsmereogenesis.ts          ← hook consumer del Context
src/hooks/useAbonoSimulation.ts          ← simula transacción mock con delay
```

### Modificar

| Archivo | Cambio |
|---|---|
| `src/App.tsx` (líneas 31-70 + 119+) | Lazy-load EsmereogenesisHubPage y EsmereogenesisGardenPage; agregar 2 rutas dentro del AppContent autenticado |
| `src/AppShellProviders.tsx:18-34` | Wrap con `<EsmereogenesisProvider>` |
| `src/components/product/ProductActions.tsx` | Insertar `<EsmereogenesisCTA productItem={product} />` entre CTA primaria y secundaria |
| `src/pages/treasure/ProductDetail/ProductDetailPage.tsx` | Pasar el producto completo al ProductActions |
| `src/constants/storage-keys.ts` | Agregar `ESMEREO_PLANS`, `ESMEREO_AUDIO_ENABLED`, `ESMEREO_HAPTIC_ENABLED` |
| `src/locales/es.json` y `en.json` | Strings nuevos para Esmereogénesis |
| `src/contexts/TrackingContext.tsx:42-51` | Agregar eventos: `esmereo_plan_created`, `esmereo_aporte_added`, `esmereo_completed`, `esmereo_claimed` |

---

## 11. Reuso de patrones existentes (NO reinventar)

| Necesidad | Reusar de |
|---|---|
| Tokens de gradiente esmeralda | `src/design-system/tokens/gradients.ts` (emeraldGradients, meshGradients, radialGradients) |
| Spring physics | `src/design-system/tokens/motion.ts` (spring.gentle, spring.smooth) |
| Ring de progreso base | `src/components/gamification/ProgressRing.tsx` (extender con textura) |
| Patrón cinematográfico de fases | `src/components/vault/cinematic/useVaultCinematicSequence.ts` |
| Glow + halo dinámico | `src/components/vault/cinematic/VaultGemPointer.tsx:26,69-72` |
| Full-screen takeover | `src/components/vault/cinematic/VaultInterior.tsx:31-39` con AnimatePresence |
| Liquid glass para cards | `src/design-system/mixins/liquidGlassMixins.ts` |
| Audio sample player | `src/components/vault/audio/useVaultAudio.ts` (extender con samples nuevos) |
| Card compound | `src/design-system/components/Card/Card.tsx` |
| Hero card con imagen producto | Patrón existente en ProductDetailPage |
| Persistencia localStorage | Patrón de `useCart.ts:23-47` (init síncrono + useEffect persist) |
| Notificaciones | `useNotification()` de NotificationContext |
| Tracking analytics | `useTrackingDispatch()` de TrackingContext |
| Currency conversion | `convertPrice()` de CurrencyContext (ya internaliza multiplier) |
| i18n | LanguageContext + locales/{es,en}.json |

---

## 12. Mock data y simulación

### Demo seed

Al primer acceso al hub sin planes, ofrecer:
- Botón "Cargar jardín de demostración" → genera 3 planes con distintos progresos
- Permite al user explorar todos los estados visuales sin tener que crear desde cero
- Se puede borrar desde settings del hub (⚙ icon)

### Simulación de transacción

`useAbonoSimulation.ts`:
1. Optimistic UI: incrementa total localmente
2. Inicia AbonoCinematic
3. Delay de 800ms simulado
4. Devuelve éxito (siempre, en mock)
5. Persiste en localStorage al confirm phase
6. Emite tracking event `esmereo_aporte_added`

Si quisiera simular fallo (para testing futuro):
- Flag `?mockFail=1` en URL → fuerza fallo en cualquier abono
- Muestra estado de error con CTA "Reintentar"

---

## 13. Tracking de eventos

Eventos a emitir vía `useTrackingDispatch().track()`:

```typescript
track('esmereo_plan_created', {
  itemId, durationMonths, weeklySuggestedCOP, totalCOP
});
track('esmereo_aporte_added', {
  planId, amountCOP, type: 'suggested' | 'free', progress, streak
});
track('esmereo_completed', {
  planId, durationDays, totalAportes, longestStreak
});
track('esmereo_claimed', { planId });
track('esmereo_demo_seeded', {});
track('esmereo_animation_skipped', { phase });
```

---

## 14. Accesibilidad

- Todas las animaciones deben respetar `prefers-reduced-motion`:
  - AbonoCinematic se condensa a fade simple de 0.4s
  - Pulses y shimmers se deshabilitan
  - LivingEmerald muestra estado final inmediatamente
- Todos los botones con `aria-label` descriptivo
- Foco visible (outline emerald) en navegación por teclado
- Anuncios via `aria-live="polite"` en cambios de progreso, racha y completado
- Contraste AA mínimo en todos los textos sobre el fondo del jardín
- Bottom sheet de creación con focus trap correcto

---

## 15. Verificación end-to-end

Para validar el feature funciona, ejecutar este flow manual:

1. **Build limpio**: `npm run dev` → abre `http://localhost:3000`
2. **Catálogo → producto**: navegar a un producto cualquiera (`/product/32`)
3. **CTA visible**: confirmar que `<EsmereogenesisCTA>` aparece entre la CTA primaria y secundaria con animación de breathing
4. **Creación**: tap → `EsmereoCreationSheet` se abre con selector de duración
5. **Selector live**: cambiar duración 3→6→9→12 actualiza el monto sugerido en tiempo real
6. **Sembrar**: confirmar siembra → navega a `/esmereogenesis/:planId` con animación inicial
7. **Estado inicial**: la esmeralda aparece cubierta de tierra, ring al 0%, racha 0
8. **Primer abono**: tap "Regar mi esmeralda" → AbonoCinematic se ejecuta (~7.5s)
9. **Validar 7 fases**: anticipate → droplet → wash → reveal → bloom → progress → confirm → release
10. **Skip**: hacer un abono nuevo y tappear pantalla → debe condensarse a release rápido
11. **Persistencia**: refresh de página → estado se preserva
12. **Hub**: navegar a `/esmereogenesis` → ver el plan en el jardín
13. **Multi-plan**: crear segundo plan con otro producto → ver dos cards en el hub
14. **Demo seed**: borrar storage, abrir hub vacío, cargar demo → ver 3 planes con distintos progresos
15. **Eclosión**: forzar plan al 95% (vía dev tools), abonar 5% restante → debe ejecutar EclosionCeremony en lugar de AbonoCinematic normal
16. **Reclamar**: tap "Reclamar tu Esmeralda" → ClaimSheet con texto mock "Tu asesor te contactará"
17. **Sello adquirida**: vuelta al hub → plan aparece en sección "Adquiridas"
18. **Reduced motion**: activar en OS, validar que animaciones se simplifican
19. **Sin audio**: deshabilitar audio en settings, abonar — flow debe funcionar igual
20. **i18n**: cambiar a inglés, validar que strings traducidos están

### Checks técnicos

- `npm run build` debe pasar sin errores TypeScript
- No imports rotos del design-system (todos vía barrel `@/design-system`)
- No hardcoded hex colors (usar tokens)
- No nuevos warnings de console
- Lighthouse: performance >85 en /esmereogenesis (animaciones no deben tankear)

---

## 16. Lo que NO está en este alcance (deferred)

- **Backend financiero real**: integración con pasarela de pago, conciliación bancaria, reportes contables
- **Sistema de recordatorios push**: notificaciones semanales del ritmo
- **Compartir progreso social**: invitar amigos a ver el jardín (Forest-style)
- **Real-world impact**: donación a alguna causa por completar planes (Trees for the Future-style)
- **Reglas automáticas tipo Qapital**: round-up, recurring saves, etc.
- **Múltiples currency**: el prototipo asume COP; en el futuro USD via CurrencyContext
- **Validación de edad/identidad**: el prototipo asume usuario válido
- **Limites de plan máximos** (ej. máximo 5 planes activos)
- **Cancelación de plan**: por ahora sin opción de cancelar (el plan se conserva indefinidamente)

---

## 17. Próximos pasos (post-aprobación de este spec)

1. Crear archivo formal en `docs/superpowers/specs/2026-04-28-esmereogenesis-design.md` (copia de este plan, ya en plan-mode no puedo escribir ahí)
2. Invocar skill `writing-plans` para generar plan de implementación detallado paso-a-paso
3. Implementar en fases:
   - **Fase A**: Tipos + Context + persistencia + mock data
   - **Fase B**: Hub vacío + creación + plan seeded
   - **Fase C**: LivingEmerald + ProgressGardenRing + estados visuales
   - **Fase D**: AbonoCinematic completo (7 fases)
   - **Fase E**: EclosionCeremony + ClaimSheet
   - **Fase F**: CTA en producto + integración + tracking
   - **Fase G**: i18n + a11y + reduced-motion + edge cases
   - **Fase H**: Build/test/QA pasos del checklist § 15

---

## Apéndice — Inspiración referencial

| App | Aprendizaje aplicado |
|---|---|
| Forest | Loop trigger→acción→recompensa con entidad viva; gamificación de hábito; aversión a la pérdida (acá: racha rota sin penalty) |
| Finch | Microinteracciones (head tilting, sparkles); pet-as-metaphor para autocuidado (acá: cristal-as-metaphor para ahorro consciente) |
| Qapital | Goal-based saving; visualización de progreso como entidad orgánica; rules personalizables (deferred) |
| Acorns | Micro-deposits con feedback visual claro; conexión emocional con el ahorro |
| Bóveda Secreta (interno) | Patrón cinematográfico multi-fase reutilizable; ceremonia sobre transacción |

**Sources de investigación**:
- Forest gamification analysis: [Trophy.so case study](https://trophy.so/blog/forest-gamification-case-study), [GoodUX/Appcues breakdown](https://goodux.appcues.com/blog/forests-gamified-focus)
- Fintech gamification patterns: [Yu-kai Chou Top 10 Finance Gamification](https://yukaichou.com/gamification-examples/top-10-finance-apps-for-2017-from-an-octalysis-gamification-perspective/)
- Finch UX teardown: [Medium UX Teardown](https://medium.com/@deepthi.aipm/ux-teardown-finch-self-care-app-18122357fae7), [IXD@Pratt design critique](https://ixd.prattsi.org/2026/02/design-critique-finch-self-care-pet-ios-app/)
- Goal-based savings UI: [Veronica Mesuraca Money Goals](https://www.veronicamesuraca.com/projects/money-goals)

---

**Estado**: Spec finalizado tras 4 rondas de clarificación. Listo para revisión y aprobación.
