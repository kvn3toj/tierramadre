# Cotizaciones a nombre libre + acceso de invitado sin PIN

**Fecha:** 2026-07-14
**Estado:** Aprobado (diseño) — pendiente plan de implementación

## Problema

Dos fricciones que hoy hacen sentir que un cliente debe estar "registrado" para
recibir una cotización o acceder a la app:

1. **Cotizaciones**: el campo "Nombre del Cliente" ya es de texto libre
   (`freeSolo`), pero muestra una advertencia amarilla ("Este cliente no tiene
   una invitación activa"), borde de alerta y tooltip de desajuste cuando el
   nombre no coincide con un invitado. Esto simula un requisito que no existe.
2. **Acceso de invitado**: el link `/invite/:shortCode` valida y luego exige un
   **PIN de 4 dígitos** que el asesor debe compartir por separado. El asesor
   quiere que solo el link (generado por su generador de invitaciones ya
   establecido) otorgue acceso.

## Objetivo

- Poder cotizar a nombre de **cualquier persona**, esté o no registrada/invitada,
  sin ninguna señal de "requiere invitación".
- Que **abrir el link** de invitación otorgue acceso de invitado de inmediato,
  **sin código de acceso / PIN**.

## Decisiones de alcance (confirmadas con el usuario)

- **PIN**: quitar el gate del lado del invitado y ocultarlo en el generador del
  asesor. El backend sigue generando el campo `pin` pero queda **inactivo** →
  rollback = revertir solo los archivos de frontend. No se tocan Sheets ni
  endpoints.
- **Advertencia de cotización**: quitar solo la advertencia. Se conservan las
  sugerencias de invitados/clientes recientes como conveniencia. Los reportes de
  desajuste (`ClientMismatchReport` / `cotizacion-reports`) quedan en código pero
  dejan de dispararse por advertencia — sin cambios de backend.

## Diseño

### Bloque 1 — Cotizaciones a nombre de cualquier persona

**Archivo:** `src/components/cotizacion/form/ClientInfoSection.tsx`

- Eliminar el `useMemo` de `validationStatus` (tipo `GuestValidationStatus`) y
  todo lo que depende de él:
  - El icono `AlertTriangle` en el `endAdornment`.
  - El borde amarillo condicional (`warningColor`) en `MuiOutlinedInput-root`.
  - El `helperText` de _"Este cliente no tiene una invitación activa"_ y el
    `FormHelperTextProps` con color de warning.
  - El `Tooltip` de desajuste.
- **Conservar** el `Autocomplete` con `combinedOptions` (invitados + clientes
  recientes) como atajo.
- El `helperText` queda solo con:
  - Validación de longitud mínima (≥3 caracteres), que ya existe.
  - Texto neutro cuando hay sugerencias (p. ej. _"Sugerencias disponibles"_).
- Quitar imports que queden sin uso (`AlertTriangle`, `Tooltip`,
  `GuestValidationStatus`, `warningColor`) si dejan de usarse.

**Resultado:** escribir cualquier nombre + teléfono/email/documento y
generar/enviar la cotización es un flujo normal, sin señales de "requiere
invitación".

### Bloque 2 — El link solo (sin PIN) da acceso de invitado

**Archivo:** `src/pages/InvitationPage.tsx`

- En el `useEffect` de validación (`validate()`), cuando `result.isValid`, en
  lugar de terminar en `setStatus('pin')`, **siempre** ejecutar la activación de
  sesión de invitado.
- Extraer el bloque que hoy corre en la rama "ya verificado" (`loginAsGuest()` +
  escritura de `sessionStorage`/`localStorage` con `INVITATION_STORAGE_KEYS` +
  `sessionStorage.removeItem('treasure-filters')` + `setStatus('valid')`) a un
  helper reutilizable, p. ej. `activateGuestSession(resolved…)`, y llamarlo tanto
  en la rama previa como en la nueva ruta directa.
- Retirar del render la pantalla de PIN (`status === 'pin'`) y el código asociado
  que quede muerto: `handlePinSubmit`, el input de dígitos (`PinDigitInput`), y
  los estados de PIN (`pinValue`, `pinError`, `pinAttempts`, `isLockedOut`, etc.)
  en la medida en que dejen de referenciarse. Mantener el resto de estados
  (`status: 'valid' | 'expired' | 'error' | 'loading'`).

**Resultado:** abrir `/invite/:shortCode` (o `/g/:shortCode`) → acceso de
invitado inmediato, respetando el `pricingMode`, `guestCurrencyMode` y
`guestMultiplier` que el asesor asignó a la invitación.

### Bloque 3 — El generador del asesor deja de mostrar/compartir PIN

**Archivo:** `src/components/invitation/InvitationGenerator.tsx`

- Ocultar la barra de PIN (bloque `lastInvitation.pin && …`, ~línea 782) y el
  texto _"comparte el PIN por separado"_ (`inv.sharePinSeparately`).
- En el mensaje de compartir por WhatsApp, quitar `pinLine` — el `shareBody`
  incluye solo el nombre y el link, sin PIN.
- Quitar estados/handlers de PIN que queden sin uso (`copiedPin`,
  `handleCopyPin`) si dejan de referenciarse.

**Backend intacto:** `api/invitations.ts` sigue generando `pin` (queda inactivo).
No se tocan columnas de Sheets ni el endpoint `verify-pin`.

## Nota de seguridad

Sin PIN, cualquiera que reciba o reenvíe el link entra como invitado y verá
precios si la invitación es "con precios" (`pricingMode: with_prices`). El binding
de dispositivo/IP deja de aplicar en la práctica. Es una decisión explícita del
usuario y es reversible revirtiendo los tres archivos de frontend.

## Fuera de alcance

- Eliminación de la generación/verificación de PIN en backend.
- Cambios en Google Sheets, endpoints o migraciones.
- Eliminación del código de `ClientMismatchReport` / `cotizacion-reports`.

## Verificación

- Cotización: escribir un nombre nuevo (no invitado) → sin advertencia amarilla,
  sin triángulo, sin tooltip; se puede generar y compartir el PDF.
- Invitación: abrir un link válido → acceso de invitado directo, sin pantalla de
  PIN; precios/moneda coherentes con la invitación.
- Generador: crear una invitación → no aparece PIN en la UI; el texto de compartir
  no contiene PIN.
- Rollback: revertir los tres archivos de frontend restaura el comportamiento con
  PIN.
