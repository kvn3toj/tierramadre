# Tierra Mädre · Quiet Emerald — mockups

**Proposal only.** Standalone HTML/CSS mockups. Nothing here is app code and none of
`src/` is touched. Open the files directly in a browser (no build, no server).

```
mockups/
  index.html            Cover + the phase roadmap (start here)
  design-system.html    Fase 0 — the full design system, 13 sections, light + dark
  css/
    tokens.css          The token contract (3 tiers: reference → semantic → component)
    base.css            Reset, type roles, focus, grain, reduced-motion
    screens.css         Phone frame + shared mobile screen components (Fases 1–3)
    admin.css           Desktop shell (topbar + rail) + data components (Fases 4–5)
  screens/
    Fase 1  inicio · catalogo · busqueda · ficha · boveda · perfil · cotizacion · acceso
    Fase 2  cotizar · recibos · simulador · solicitudes
    Fase 3  embajador-perfil · embajador-pieza · invitacion
    Fase 4  fotosintesis-{tablero,lotes,captura,venta,certificado}
    Fase 5  admin-{analytics,productos,valuacion,esmereogenesis,feedback} · proveedor
```

## The system in one breath

Editorial quiet-luxury: **one saturated color** (the brand emerald), cool grayscale
everywhere else, **Cormorant / Hanken Grotesk / DM Mono**, flat opaque surfaces with
hairlines (no gold, no glass, shadow only on floating overlays), light + dark.

Each `design-system.html` section is grounded in two research passes against the best
real systems (Radix, Material 3, Apple HIG, Linear, Vercel, Stripe, Aesop, Vaul, Sonner,
Carbon, Polaris, Spectrum): §00 anti-slop ledger · §01 principios · §02 token architecture ·
§03 color + contrast ledger · §04 typography · §05 space & grid · §06 elevation & motion ·
§07 components · §08 data & analytics · §09 iconography & imagery · §10 voice & content ·
§11 engineering & governance · §12 steal list.

Use the top-right toggles to flip **Claro/Oscuro** and **Reduce motion**.

## Program (mockups first, then migrate)

| Phase | Scope                                                                                                  | Status    |
| ----- | ------------------------------------------------------------------------------------------------------ | --------- |
| 0     | Design system                                                                                          | In review |
| 1     | Customer app — Inicio · Catálogo · Búsqueda · Ficha · Bóveda · Perfil · Acceso · Cotización            | In review |
| 2     | Cotizaciones & cuentas — cotizar · recibos · simulador · solicitudes                                   | In review |
| 3     | Embajadores — perfil · pieza · invitación                                                              | In review |
| 4     | Fotosíntesis (operations, desktop) — tablero · lotes · captura · venta · certificado                   | In review |
| 5     | Provider & admin (desktop) — analítica · productos · valuación · esmereogénesis · feedback · proveedor | In review |

Once the mockups are approved per phase, they map 1:1 onto the React migration: `tokens.css`
mirrors the intended `src/design-system/tokens/quiet-emerald.ts`, and every component maps to
its `src/` counterpart. The values are the same authoritative hexes already committed to the
three redesigned core screens.
