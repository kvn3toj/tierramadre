# Create Invitation Page (`/invitaciones/nueva`) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the legacy `InvitationGenerator` MUI Dialog with a dedicated, brand-coherent full page at `/invitaciones/nueva` that preserves every existing capability (name, email/phone, pricing toggle, currency, multiplier, generate, copy, share, QR, PIN, "nuevo enlace") while redistributing controls into spacious sections matching the rest of the app.

**Architecture:**

- New lazy route `/invitaciones/nueva` rendered by `CreateInvitationPage` (single-file page component) under `StaffRoute`. Internal local-state form, single source of truth for form values, two-phase render (`!lastInvitation` → form, `lastInvitation` → success block) using `framer-motion AnimatePresence`. The existing `useInvitation()` hook is reused unchanged. Live preview is a sub-component (`GuestPreview`) that re-renders from form state in real time and becomes a sticky right-rail on `md+` viewports. Section primitives (`SectionCard`, `SectionLabel`) live inside the same file (file-local, not exported) to keep the surface DRY without spawning premature abstractions.
- The `IOSMoreSheet` "Invitar" tile drops the modal `<InvitationGenerator>` JSX entirely and instead calls `navigate('/invitaciones/nueva')` from its existing `handleToolClick` switch (`tool.action === 'invitation'`).
- The legacy `InvitationGenerator.tsx` file is deleted; the `src/components/invitation/index.ts` barrel keeps `InvitationBanner` only and adds a one-line breadcrumb comment pointing at the new page.

**Tech Stack:** React 18 + TypeScript 5.6, Material-UI v6, React Router 7, Framer Motion 12, `qrcode.react`, design-system barrel (`@/design-system`), `Breadcrumbs` shared component, `useInvitation` hook (existing).

---

## File Structure

**Create:**

- `src/pages/invitations/CreateInvitationPage.tsx` — full page (form + success + preview + section primitives)
- `src/pages/invitations/index.ts` — barrel exporting `CreateInvitationPage` for cleaner imports

**Modify:**

- `src/App.tsx` — add `lazyWithRetry` import for `CreateInvitationPage` and a `<Route path="/invitaciones/nueva" element={<StaffRoute>…</StaffRoute>} />` block alongside other staff routes
- `src/components/ios/IOSMoreSheet.tsx` — strip `InvitationGenerator` import, remove the `<InvitationGenerator open={…}>` render, drop the `invitationOpen` state, and route `tool.action === 'invitation'` through `navigate('/invitaciones/nueva')`
- `src/components/invitation/index.ts` — remove the `InvitationGenerator` re-export and add a 3-line comment redirecting to the new page
- `src/locales/es.ts` — add 13 spec-required keys under `tools.invitation` (`pageTitle`, `breadcrumb`, `heroValidityChip`, `sectionGuestTitle`, `sectionGuestHelper`, `sectionPricingTitle`, `sectionPricingHelper`, `showPricesOnHelper`, `showPricesOffHelper`, `previewHeader`, `previewHelper`, `previewGreeting`, `previewSubGreeting`, `previewProductName`, `previewProductMeta`, `previewPriceOnRequest`, `createAnother`, `backToProfile`)
- `src/locales/en.ts`, `src/locales/fr.ts`, `src/locales/it.ts`, `src/locales/pt.ts`, `src/locales/zh.ts` — same key set, translated

**Delete:**

- `src/components/invitation/InvitationGenerator.tsx`

**Tests:** No automated test suite is configured for UI pages in this repo. Verification is `tsc --noEmit` + `npm run build` + manual smoke against acceptance criteria. Each task that produces visible UI ends with a manual smoke step against the dev server.

---

## Task 1: Scaffold the page file, barrel, and route

**Files:**

- Create: `src/pages/invitations/CreateInvitationPage.tsx`
- Create: `src/pages/invitations/index.ts`
- Modify: `src/App.tsx`

- [ ] **Step 1: Create the page file with a placeholder body**

```tsx
// src/pages/invitations/CreateInvitationPage.tsx
import { Box, Typography } from "@mui/material";
import { primitiveSpacing as spacing } from "../../design-system";

export default function CreateInvitationPage() {
  return (
    <Box
      sx={{ maxWidth: 960, mx: "auto", px: { xs: 2, sm: 3 }, pt: 1.5, pb: 12 }}
    >
      <Typography variant="h1" sx={{ fontSize: 28, fontWeight: 700 }}>
        Nueva invitación
      </Typography>
    </Box>
  );
}
```

- [ ] **Step 2: Create the barrel**

```ts
// src/pages/invitations/index.ts
export { default as CreateInvitationPage } from "./CreateInvitationPage";
```

- [ ] **Step 3: Register the lazy import in `src/App.tsx`**

Add this line in the lazy-import block right below the `InvitationPage` import (the public guest page already there):

```tsx
// Create Invitation Page (staff-only - replaces legacy modal)
const CreateInvitationPage = lazyWithRetry(
  () => import("./pages/invitations/CreateInvitationPage"),
  "CreateInvitationPage",
);
```

- [ ] **Step 4: Add the route**

Insert this `<Route>` inside `AppContent`'s `<Routes>` block, alongside the other `/mi-perfil/*` staff routes (i.e. just below `/mi-perfil/invitado/:guestName`):

```tsx
{
  /* Create Invitation - dedicated full-page replacement for the legacy modal */
}
<Route
  path="/invitaciones/nueva"
  element={
    <StaffRoute>
      <Suspense fallback={<LocalizedLoading messageKey="profile" />}>
        <CreateInvitationPage />
      </Suspense>
    </StaffRoute>
  }
/>;
```

- [ ] **Step 5: Verify route resolves**

Run: `npm run dev` (port 3000). Sign in as a staff user. Open `http://localhost:3000/invitaciones/nueva`.
Expected: page renders with the placeholder "Nueva invitación" heading. As an unauthenticated user / non-staff guest, `StaffRoute` redirects to `/home` (US-7).

- [ ] **Step 6: Type-check and commit**

Run: `npx tsc --noEmit`
Expected: 0 errors.

```bash
git add src/pages/invitations/CreateInvitationPage.tsx src/pages/invitations/index.ts src/App.tsx
git commit -m "feat(invitation-page): scaffold /invitaciones/nueva route and StaffRoute guard"
```

---

## Task 2: Add the 18 i18n keys to all 6 locales

**Files:**

- Modify: `src/locales/es.ts`, `src/locales/en.ts`, `src/locales/fr.ts`, `src/locales/it.ts`, `src/locales/pt.ts`, `src/locales/zh.ts`

The keys live inside the existing `tools.invitation` block (`es.ts` has it at ~line 176 — `invitation: { label: "Invitar", subtitle: "...", title: "...", description: "...", ...`). Append the new keys at the bottom of that object so existing keys are untouched.

- [ ] **Step 1: Append the new keys to `src/locales/es.ts`**

Inside `tools.invitation`, add after `contactRequired`:

```ts
// CreateInvitationPage (full-page replacement for the legacy modal)
pageTitle: "Nueva invitación",
breadcrumb: "Nueva invitación",
heroValidityChip: "Válido 24 h tras la primera apertura",
sectionGuestTitle: "Invitado",
sectionGuestHelper: "Quién recibirá el enlace",
sectionPricingTitle: "Experiencia de precios",
sectionPricingHelper: "Cómo verá tu invitado los precios del catálogo",
showPricesOnHelper: "El invitado verá los precios convertidos",
showPricesOffHelper: "El invitado verá ‘Precio bajo consulta’",
previewHeader: "Lo que verá tu invitado",
previewHelper: "Vista previa en tiempo real",
previewGreeting: "Hola, {name}",
previewSubGreeting: "Bienvenido a Tierra Madre",
previewProductName: "Esmeralda Colombiana",
previewProductMeta: "Muzo · 2,40 ct · VVS",
previewPriceOnRequest: "Precio bajo consulta",
createAnother: "Crear otra invitación",
backToProfile: "Ir a Mi Perfil",
```

- [ ] **Step 2: Append to `src/locales/en.ts`**

```ts
pageTitle: 'New Invitation',
breadcrumb: 'New Invitation',
heroValidityChip: 'Valid for 24 h after first open',
sectionGuestTitle: 'Guest',
sectionGuestHelper: 'Who will receive the link',
sectionPricingTitle: 'Pricing experience',
sectionPricingHelper: 'How your guest sees catalog prices',
showPricesOnHelper: 'Guest will see converted prices',
showPricesOffHelper: 'Guest will see “Price upon request”',
previewHeader: 'What your guest will see',
previewHelper: 'Real-time preview',
previewGreeting: 'Hi, {name}',
previewSubGreeting: 'Welcome to Tierra Madre',
previewProductName: 'Colombian Emerald',
previewProductMeta: 'Muzo · 2.40 ct · VVS',
previewPriceOnRequest: 'Price upon request',
createAnother: 'Create another invitation',
backToProfile: 'Go to My Profile',
```

- [ ] **Step 3: Append to `src/locales/fr.ts`**

```ts
pageTitle: 'Nouvelle invitation',
breadcrumb: 'Nouvelle invitation',
heroValidityChip: 'Valide 24 h après la première ouverture',
sectionGuestTitle: 'Invité',
sectionGuestHelper: 'Qui recevra le lien',
sectionPricingTitle: 'Affichage des prix',
sectionPricingHelper: 'Ce que verra votre invité',
showPricesOnHelper: "L'invité verra les prix convertis",
showPricesOffHelper: "L'invité verra « Prix sur demande »",
previewHeader: 'Ce que votre invité verra',
previewHelper: 'Aperçu en temps réel',
previewGreeting: 'Bonjour, {name}',
previewSubGreeting: 'Bienvenue chez Tierra Madre',
previewProductName: 'Émeraude colombienne',
previewProductMeta: 'Muzo · 2,40 ct · VVS',
previewPriceOnRequest: 'Prix sur demande',
createAnother: 'Créer une autre invitation',
backToProfile: 'Aller à mon profil',
```

- [ ] **Step 4: Append to `src/locales/it.ts`**

```ts
pageTitle: 'Nuovo invito',
breadcrumb: 'Nuovo invito',
heroValidityChip: 'Valido 24 h dopo la prima apertura',
sectionGuestTitle: 'Ospite',
sectionGuestHelper: 'Chi riceverà il link',
sectionPricingTitle: 'Esperienza prezzi',
sectionPricingHelper: 'Come vedrà i prezzi il tuo ospite',
showPricesOnHelper: "L'ospite vedrà i prezzi convertiti",
showPricesOffHelper: "L'ospite vedrà «Prezzo su richiesta»",
previewHeader: 'Ciò che vedrà il tuo ospite',
previewHelper: 'Anteprima in tempo reale',
previewGreeting: 'Ciao, {name}',
previewSubGreeting: 'Benvenuto in Tierra Madre',
previewProductName: 'Smeraldo colombiano',
previewProductMeta: 'Muzo · 2,40 ct · VVS',
previewPriceOnRequest: 'Prezzo su richiesta',
createAnother: 'Crea un altro invito',
backToProfile: 'Vai al mio profilo',
```

- [ ] **Step 5: Append to `src/locales/pt.ts`**

```ts
pageTitle: 'Novo convite',
breadcrumb: 'Novo convite',
heroValidityChip: 'Válido por 24 h após a primeira abertura',
sectionGuestTitle: 'Convidado',
sectionGuestHelper: 'Quem receberá o link',
sectionPricingTitle: 'Experiência de preços',
sectionPricingHelper: 'Como o convidado verá os preços',
showPricesOnHelper: 'O convidado verá os preços convertidos',
showPricesOffHelper: 'O convidado verá “Preço sob consulta”',
previewHeader: 'O que seu convidado verá',
previewHelper: 'Pré-visualização em tempo real',
previewGreeting: 'Olá, {name}',
previewSubGreeting: 'Bem-vindo à Tierra Madre',
previewProductName: 'Esmeralda colombiana',
previewProductMeta: 'Muzo · 2,40 ct · VVS',
previewPriceOnRequest: 'Preço sob consulta',
createAnother: 'Criar outro convite',
backToProfile: 'Ir ao meu perfil',
```

- [ ] **Step 6: Append to `src/locales/zh.ts`**

```ts
pageTitle: '新邀请',
breadcrumb: '新邀请',
heroValidityChip: '首次打开后有效期 24 小时',
sectionGuestTitle: '受邀人',
sectionGuestHelper: '谁将收到链接',
sectionPricingTitle: '价格展示',
sectionPricingHelper: '受邀人看到的价格方式',
showPricesOnHelper: '受邀人将看到换算后的价格',
showPricesOffHelper: '受邀人将看到“价格请咨询”',
previewHeader: '受邀人将看到',
previewHelper: '实时预览',
previewGreeting: '你好，{name}',
previewSubGreeting: '欢迎来到 Tierra Madre',
previewProductName: '哥伦比亚祖母绿',
previewProductMeta: 'Muzo · 2.40 克拉 · VVS',
previewPriceOnRequest: '价格请咨询',
createAnother: '再创建一个邀请',
backToProfile: '前往我的档案',
```

- [ ] **Step 7: Verify type parity across locales**

Run: `npx tsc --noEmit`
Expected: 0 errors. (`src/locales/es.ts` is the canonical type — every other locale must match its shape.)

- [ ] **Step 8: Commit**

```bash
git add src/locales/es.ts src/locales/en.ts src/locales/fr.ts src/locales/it.ts src/locales/pt.ts src/locales/zh.ts
git commit -m "feat(i18n): add invitation page keys (es/en/fr/it/pt/zh)"
```

---

## Task 3: Build the section primitives (`SectionCard`, `SectionLabel`)

**Files:**

- Modify: `src/pages/invitations/CreateInvitationPage.tsx`

These two file-local components establish the visual rhythm for sections B (Invitado), C (Pricing), and the success state (P0-6). Keep them inside the page file — they are not reused elsewhere (YAGNI).

- [ ] **Step 1: Replace the placeholder body with the imports the file will need**

Replace the entire current contents of `CreateInvitationPage.tsx` with:

```tsx
/**
 * CreateInvitationPage
 *
 * Full-page replacement for the legacy InvitationGenerator modal.
 * Lives at /invitaciones/nueva. Staff-only (StaffRoute guard in App.tsx).
 *
 * Spec: docs/specs/2026-05-01-create-invitation-page.md
 */

import { useId, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  IconButton,
  InputAdornment,
  Slider,
  Snackbar,
  Switch,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
  useMediaQuery,
  useTheme,
} from "@mui/material";
import {
  ArrowBack as ArrowBackIcon,
  AttachMoney as PriceIcon,
  CheckCircle as CheckIcon,
  ContentCopy as CopyIcon,
  CurrencyExchange as CurrencyIcon,
  Email as EmailIcon,
  InfoOutlined as InfoIcon,
  Link as LinkIcon,
  LinkOutlined as LinkOutlineIcon,
  Person as PersonIcon,
  Phone as PhoneIcon,
  QrCode2 as QrCodeIcon,
  Schedule as ClockIcon,
  Share as ShareIcon,
  VisibilityOff as VisibilityOffIcon,
} from "@mui/icons-material";
import { QRCodeSVG } from "qrcode.react";
import { motion, useReducedMotion, AnimatePresence } from "framer-motion";

import { useInvitation } from "../../hooks/useInvitation";
import { useLanguage } from "../../contexts/LanguageContext";
import {
  brand,
  cssTransition,
  fontWeights,
  iosTypographyScale,
  primitiveSpacing as spacing,
  radius,
  legacyTypography as typography,
} from "../../design-system";
import Breadcrumbs from "../../components/shared/Breadcrumbs";
import type {
  GuestCurrencyMode,
  GuestMultiplier,
  PricingMode,
} from "../../types/invitation";

export default function CreateInvitationPage() {
  return null; // replaced in Task 4 — keeps tsc happy meanwhile
}
```

- [ ] **Step 2: Add `SectionCard` above the `export default`**

```tsx
function SectionCard({
  children,
  emphasized = false,
}: {
  children: React.ReactNode;
  emphasized?: boolean;
}) {
  return (
    <Box
      sx={{
        p: { xs: 2.25, sm: 2.75 },
        borderRadius: radius.xl,
        bgcolor: "background.paper",
        border: "1px solid",
        borderColor: emphasized ? brand.emerald[200] : "divider",
        boxShadow: emphasized
          ? `0 1px 2px rgba(15,23,42,0.04), 0 8px 24px ${brand.emerald[600]}10`
          : "0 1px 2px rgba(15,23,42,0.04)",
        transition: cssTransition.default,
      }}
    >
      {children}
    </Box>
  );
}
```

- [ ] **Step 3: Add `SectionLabel` below `SectionCard`**

```tsx
function SectionLabel({
  title,
  helper,
  icon,
}: {
  title: string;
  helper?: string;
  icon?: React.ReactNode;
}) {
  return (
    <Box sx={{ mb: 2 }}>
      <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 0.25 }}>
        {icon}
        <Typography
          sx={{
            fontSize: iosTypographyScale.headline,
            fontWeight: fontWeights.semibold,
            color: "text.primary",
            lineHeight: 1.2,
          }}
        >
          {title}
        </Typography>
      </Box>
      {helper && (
        <Typography
          sx={{
            fontSize: iosTypographyScale.footnote,
            color: "text.secondary",
            lineHeight: 1.4,
          }}
        >
          {helper}
        </Typography>
      )}
    </Box>
  );
}
```

- [ ] **Step 4: Type-check**

Run: `npx tsc --noEmit`
Expected: 0 errors. Unused `useId/useMemo/useState/Alert/etc.` warnings will appear once TS strict-unused triggers — that's expected; they are wired up in subsequent tasks.

- [ ] **Step 5: Commit**

```bash
git add src/pages/invitations/CreateInvitationPage.tsx
git commit -m "feat(invitation-page): add SectionCard and SectionLabel primitives"
```

---

## Task 4: Wire form state, handlers, and the `useInvitation` hook

**Files:**

- Modify: `src/pages/invitations/CreateInvitationPage.tsx`

This task replaces the `return null` body with the page's behavioral contract: form state, validation, submit, reset, copy/share helpers. Render a single SectionCard so the wiring is visible during smoke testing — full layout comes in later tasks.

- [ ] **Step 1: Replace the body of `CreateInvitationPage` with state + handlers**

```tsx
export default function CreateInvitationPage() {
  const navigate = useNavigate();
  const theme = useTheme();
  const isMdUp = useMediaQuery(theme.breakpoints.up("md"));
  const reduceMotion = useReducedMotion();
  const idPrefix = useId();

  const { t } = useLanguage();
  const inv = t.tools.invitation;

  const {
    generateInvitation,
    clearLastInvitation,
    isGenerating,
    error,
    lastInvitation,
  } = useInvitation();

  // Form state
  const [guestName, setGuestName] = useState("");
  const [guestEmail, setGuestEmail] = useState("");
  const [guestPhone, setGuestPhone] = useState("");
  const [showPrices, setShowPrices] = useState(true);
  const [guestCurrency, setGuestCurrency] = useState<GuestCurrencyMode>("COP");
  const [guestMultiplier, setGuestMultiplier] = useState<GuestMultiplier>(4);
  const [formError, setFormError] = useState("");

  // Success-state UI
  const [showQR, setShowQR] = useState(false);
  const [copied, setCopied] = useState(false);
  const [copiedPin, setCopiedPin] = useState(false);
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState("");

  const isFormValid =
    guestName.trim().length > 0 &&
    (guestEmail.trim().length > 0 || guestPhone.trim().length > 0);

  const firstName = guestName.trim().split(" ")[0];

  const handleGenerate = async () => {
    if (!guestName.trim()) {
      setFormError(inv.nameRequired);
      return;
    }
    if (!guestEmail.trim() && !guestPhone.trim()) {
      setFormError(inv.contactRequired);
      return;
    }
    setFormError("");

    const pricingMode: PricingMode = showPrices ? "with_prices" : "no_prices";
    const contactInfo = guestEmail.trim() || guestPhone.trim();
    const contactType = guestEmail.trim() ? "email" : "phone";

    await generateInvitation({
      pricingMode,
      guestName: guestName.trim(),
      guestContact: contactInfo,
      contactType,
      ...(showPrices && { guestCurrencyMode: guestCurrency }),
      ...(showPrices && { guestMultiplier }),
    });
  };

  const handleReset = () => {
    clearLastInvitation();
    setGuestName("");
    setGuestEmail("");
    setGuestPhone("");
    setShowPrices(true);
    setGuestCurrency("COP");
    setGuestMultiplier(4);
    setShowQR(false);
    setFormError("");
    setCopiedPin(false);
    setCopied(false);
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      const textArea = document.createElement("textarea");
      textArea.value = text;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand("copy");
      document.body.removeChild(textArea);
    }
  };

  const handleCopyLink = async () => {
    if (!lastInvitation?.url) return;
    await copyToClipboard(lastInvitation.url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    setSnackbarMessage(inv.linkCopied);
    setSnackbarOpen(true);
  };

  const handleCopyPin = async () => {
    if (!lastInvitation?.pin) return;
    await copyToClipboard(lastInvitation.pin);
    setCopiedPin(true);
    setTimeout(() => setCopiedPin(false), 2000);
    setSnackbarMessage(inv.pinCopied);
    setSnackbarOpen(true);
  };

  const handleShare = async () => {
    if (!lastInvitation?.url) return;
    if ("share" in navigator) {
      const pin = lastInvitation.pin;
      const pinLine = pin
        ? `\n\n${inv.sharePinLine.replace("{pin}", pin)}`
        : "";
      const shareBody = `${inv.shareText.replace("{name}", guestName)}\n\n${lastInvitation.url}${pinLine}`;
      try {
        await navigator.share({ title: inv.shareTitle, text: shareBody });
      } catch {
        /* user cancelled */
      }
    } else {
      handleCopyLink();
    }
  };

  // Animation presets (P1-3)
  const fadeUp = reduceMotion
    ? {}
    : {
        initial: { opacity: 0, y: 8 },
        animate: { opacity: 1, y: 0 },
        exit: { opacity: 0, y: -8 },
        transition: { duration: 0.22, ease: [0.32, 0.72, 0, 1] as const },
      };

  return (
    <Box
      sx={{ maxWidth: 960, mx: "auto", px: { xs: 2, sm: 3 }, pt: 1.5, pb: 12 }}
    >
      <Breadcrumbs
        items={[
          { label: "Inicio", path: "/home" },
          { label: "Mi Perfil", path: "/mi-perfil" },
          { label: inv.breadcrumb },
        ]}
      />
      <Typography
        component="h1"
        sx={{ fontSize: iosTypographyScale.title1, fontWeight: 700, mt: 2 }}
      >
        {inv.pageTitle}
      </Typography>
      {/* Body lands in Tasks 5–10 */}
    </Box>
  );
}
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: 0 errors. The `Box, Button, ...` imports that aren't yet used will warn only if `noUnusedLocals` is enabled; this repo's `tsconfig.json` does not enable it for the editor pass — leave the imports in place since Tasks 5–10 consume them all.

- [ ] **Step 3: Smoke**

Run: `npm run dev`. Visit `/invitaciones/nueva` as staff.
Expected: breadcrumb + h1 render in Spanish (`Inicio › Mi Perfil › Nueva invitación` and "Nueva invitación").

- [ ] **Step 4: Commit**

```bash
git add src/pages/invitations/CreateInvitationPage.tsx
git commit -m "feat(invitation-page): wire form state, validation, copy/share handlers"
```

---

## Task 5: Build the hero header

**Files:**

- Modify: `src/pages/invitations/CreateInvitationPage.tsx`

The hero gives the page a brand-coherent identity (P0-6) and matches the rhythm of `MyProfilePage`'s opening row. Replaces the temporary `<h1>` from Task 4.

- [ ] **Step 1: Replace the temporary `<Typography component="h1">…</Typography>` with the hero block**

Inside the `return`, between the `<Breadcrumbs>` and the body comment, render:

```tsx
{
  /* Hero */
}
<Box sx={{ mb: { xs: 2.5, md: 3.5 }, mt: 1 }}>
  <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, mb: 1 }}>
    <Box
      sx={{
        width: 44,
        height: 44,
        borderRadius: radius.lg,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: `linear-gradient(135deg, ${brand.emerald[50]} 0%, ${brand.emerald[100]} 100%)`,
        border: "1px solid",
        borderColor: brand.emerald[200],
        flexShrink: 0,
      }}
    >
      <LinkIcon sx={{ color: brand.emerald[700], fontSize: 22 }} />
    </Box>
    <Box sx={{ minWidth: 0 }}>
      <Typography
        component="h1"
        sx={{
          fontSize: iosTypographyScale.title1,
          fontWeight: fontWeights.bold,
          color: "text.primary",
          lineHeight: 1.15,
          letterSpacing: "-0.02em",
        }}
      >
        {inv.pageTitle}
      </Typography>
      <Typography
        sx={{
          fontSize: iosTypographyScale.subhead,
          color: "text.secondary",
          mt: 0.25,
        }}
      >
        {inv.description}
      </Typography>
    </Box>
  </Box>

  <Chip
    icon={
      <ClockIcon
        sx={{
          fontSize: "14px !important",
          color: `${brand.emerald[700]} !important`,
        }}
      />
    }
    label={inv.heroValidityChip}
    size="small"
    sx={{
      mt: 0.5,
      bgcolor: brand.emerald[50],
      color: brand.emerald[700],
      border: "1px solid",
      borderColor: brand.emerald[200],
      fontSize: iosTypographyScale.caption1,
      fontWeight: fontWeights.medium,
      "& .MuiChip-icon": { ml: 1 },
    }}
  />
</Box>;
```

- [ ] **Step 2: Smoke at 375 px viewport**

DevTools → iPhone SE (375 × 667). Expected: hero icon + title + description fit one line each, no horizontal scroll.

- [ ] **Step 3: Commit**

```bash
git add src/pages/invitations/CreateInvitationPage.tsx
git commit -m "feat(invitation-page): add hero header with validity chip"
```

---

## Task 6: Build the two-column layout shell + Section B (Invitado)

**Files:**

- Modify: `src/pages/invitations/CreateInvitationPage.tsx`

Spec §5 calls for a 1-column mobile / 2-column md+ grid. The right column (preview) lands in Task 8; this task lays the grid and fills the left column with the form scaffolding + Section B.

- [ ] **Step 1: Add the grid + alerts + AnimatePresence shell**

After the hero block, render:

```tsx
{/* Two-column layout at md+, single column otherwise */}
<Box
  sx={{
    display: 'grid',
    gridTemplateColumns: { xs: '1fr', md: '1fr 320px' },
    gap: { xs: 2, md: 3 },
    alignItems: 'start',
  }}
>
  {/* LEFT COLUMN */}
  <Box sx={{ display: 'flex', flexDirection: 'column', gap: { xs: 2, md: 2.5 } }}>
    {error && (
      <Alert severity="error" sx={{ borderRadius: radius.lg }}>
        {error}
      </Alert>
    )}
    {formError && (
      <Alert severity="warning" sx={{ borderRadius: radius.lg }}>
        {formError}
      </Alert>
    )}

    <AnimatePresence mode="wait" initial={false}>
      {!lastInvitation ? (
        <motion.div key="form" {...fadeUp}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: { xs: 2, md: 2.5 } }}>
            {/* SECTION B (this task) */}
            {/* SECTION C (Task 7) */}
            {/* MOBILE PREVIEW (Task 8) */}
            {/* GENERATE CTA (Task 9) */}
          </Box>
        </motion.div>
      ) : (
        <motion.div key="success" {...fadeUp}>
          {/* Task 10 */}
        </motion.div>
      )}
    </AnimatePresence>
  </Box>

  {/* RIGHT COLUMN (Task 8) */}
</Box>

<Snackbar
  open={snackbarOpen}
  autoHideDuration={2000}
  onClose={() => setSnackbarOpen(false)}
  message={snackbarMessage}
  anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
/>
```

- [ ] **Step 2: Insert Section B inside the form `motion.div`**

Replace `{/* SECTION B (this task) */}` with:

```tsx
<SectionCard>
  <SectionLabel title={inv.sectionGuestTitle} helper={inv.sectionGuestHelper} />

  <TextField
    fullWidth
    label={inv.guestName}
    placeholder={inv.guestNamePlaceholder}
    value={guestName}
    onChange={(e) => setGuestName(e.target.value)}
    required
    inputProps={{ autoComplete: "name", id: `${idPrefix}-name` }}
    InputProps={{
      startAdornment: (
        <InputAdornment position="start">
          <PersonIcon
            fontSize="small"
            sx={{
              color: guestName ? brand.emerald[600] : "text.disabled",
              transition: cssTransition.fast,
            }}
          />
        </InputAdornment>
      ),
    }}
    sx={{ mb: 2, "& .MuiOutlinedInput-root": { borderRadius: radius.lg } }}
  />

  <Box
    sx={{
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      mb: 1,
    }}
  >
    <Typography
      sx={{
        fontSize: iosTypographyScale.footnote,
        fontWeight: fontWeights.semibold,
        color: "text.secondary",
        textTransform: "uppercase",
        letterSpacing: "0.04em",
      }}
    >
      {inv.contact}
    </Typography>
    <Chip
      label={inv.contactAtLeastOne}
      size="small"
      sx={{
        height: 22,
        fontSize: iosTypographyScale.caption2,
        bgcolor: "action.hover",
        color: "text.secondary",
        fontWeight: fontWeights.medium,
      }}
    />
  </Box>

  <Box
    sx={{
      display: "grid",
      gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" },
      gap: 1.5,
    }}
  >
    <TextField
      fullWidth
      label="Email"
      placeholder={inv.emailPlaceholder}
      type="email"
      value={guestEmail}
      onChange={(e) => setGuestEmail(e.target.value)}
      inputProps={{ autoComplete: "email", id: `${idPrefix}-email` }}
      InputProps={{
        startAdornment: (
          <InputAdornment position="start">
            <EmailIcon
              fontSize="small"
              sx={{
                color: guestEmail ? brand.emerald[600] : "text.disabled",
                transition: cssTransition.fast,
              }}
            />
          </InputAdornment>
        ),
      }}
      sx={{ "& .MuiOutlinedInput-root": { borderRadius: radius.lg } }}
    />
    <TextField
      fullWidth
      label={inv.phoneLabel}
      placeholder={inv.phonePlaceholder}
      type="tel"
      value={guestPhone}
      onChange={(e) => setGuestPhone(e.target.value)}
      inputProps={{ autoComplete: "tel", id: `${idPrefix}-phone` }}
      InputProps={{
        startAdornment: (
          <InputAdornment position="start">
            <PhoneIcon
              fontSize="small"
              sx={{
                color: guestPhone ? brand.emerald[600] : "text.disabled",
                transition: cssTransition.fast,
              }}
            />
          </InputAdornment>
        ),
      }}
      sx={{ "& .MuiOutlinedInput-root": { borderRadius: radius.lg } }}
    />
  </Box>
</SectionCard>
```

- [ ] **Step 3: Smoke**

`npm run dev` → `/invitaciones/nueva` → type a name + email. Field icons turn emerald on focus/value (US-2). At 375 px the email/phone fields stack; at 600 px+ they side-by-side.

- [ ] **Step 4: Commit**

```bash
git add src/pages/invitations/CreateInvitationPage.tsx
git commit -m "feat(invitation-page): add 2-column grid shell and Invitado section"
```

---

## Task 7: Build Section C (Experiencia de precios)

**Files:**

- Modify: `src/pages/invitations/CreateInvitationPage.tsx`

- [ ] **Step 1: Replace `{/* SECTION C (Task 7) */}` with the pricing card**

```tsx
<SectionCard>
  <SectionLabel
    title={inv.sectionPricingTitle}
    helper={inv.sectionPricingHelper}
  />

  {/* Switch row */}
  <Box
    role="group"
    sx={{
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      py: 0.5,
    }}
  >
    <Box sx={{ display: "flex", alignItems: "center", gap: 1.25 }}>
      <Box
        sx={{
          width: 28,
          height: 28,
          borderRadius: radius.md,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          bgcolor: showPrices ? brand.emerald[50] : "action.hover",
          color: showPrices ? brand.emerald[700] : "text.disabled",
          transition: cssTransition.default,
        }}
      >
        <PriceIcon sx={{ fontSize: 16 }} />
      </Box>
      <Box>
        <Typography
          sx={{
            fontSize: iosTypographyScale.body,
            fontWeight: fontWeights.medium,
            color: "text.primary",
            lineHeight: 1.2,
          }}
        >
          {inv.showPrices}
        </Typography>
        <Typography
          sx={{
            fontSize: iosTypographyScale.caption1,
            color: "text.secondary",
          }}
        >
          {showPrices ? inv.showPricesOnHelper : inv.showPricesOffHelper}
        </Typography>
      </Box>
    </Box>
    <Switch
      checked={showPrices}
      onChange={(e) => setShowPrices(e.target.checked)}
      inputProps={{ "aria-label": inv.showPricesAria }}
      sx={{
        "& .MuiSwitch-switchBase.Mui-checked": { color: brand.emerald[600] },
        "& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track": {
          backgroundColor: brand.emerald[400],
        },
      }}
    />
  </Box>

  {/* Conditional sub-block */}
  {showPrices && (
    <Box
      sx={{
        mt: 2,
        pt: 2,
        borderTop: "1px solid",
        borderColor: "divider",
        display: "flex",
        flexDirection: "column",
        gap: 2,
      }}
    >
      {/* Currency segmented control */}
      <Box>
        <Typography
          sx={{
            fontSize: iosTypographyScale.footnote,
            fontWeight: fontWeights.semibold,
            color: "text.secondary",
            textTransform: "uppercase",
            letterSpacing: "0.04em",
            mb: 0.75,
          }}
        >
          {inv.currency}
        </Typography>
        <ToggleButtonGroup
          value={guestCurrency}
          exclusive
          onChange={(_e, val) => {
            if (val !== null) setGuestCurrency(val as GuestCurrencyMode);
          }}
          aria-label={inv.currencyAria}
          sx={{
            width: "100%",
            "& .MuiToggleButton-root": {
              flex: 1,
              textTransform: "none",
              fontWeight: fontWeights.semibold,
              fontSize: iosTypographyScale.subhead,
              py: 1,
              borderColor: "divider",
              color: "text.secondary",
              "&.Mui-selected": {
                backgroundColor: brand.emerald[50],
                color: brand.emerald[700],
                borderColor: brand.emerald[300],
                "&:hover": { backgroundColor: brand.emerald[100] },
              },
            },
          }}
        >
          <ToggleButton value="COP">COP</ToggleButton>
          <ToggleButton value="USD">USD</ToggleButton>
        </ToggleButtonGroup>
      </Box>

      {/* Multiplier */}
      <Box>
        <Box
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            mb: 0.5,
          }}
        >
          <Typography
            sx={{
              fontSize: iosTypographyScale.footnote,
              fontWeight: fontWeights.semibold,
              color: "text.secondary",
              textTransform: "uppercase",
              letterSpacing: "0.04em",
            }}
          >
            {inv.priceMultiplier}
          </Typography>
          <Box
            sx={{
              px: 1,
              py: 0.25,
              borderRadius: radius.md,
              bgcolor: brand.emerald[50],
              border: "1px solid",
              borderColor: brand.emerald[200],
              color: brand.emerald[700],
              fontFamily: typography.fontFamily.mono,
              fontWeight: fontWeights.bold,
              fontSize: iosTypographyScale.footnote,
              lineHeight: 1.2,
            }}
          >
            x{guestMultiplier}
          </Box>
        </Box>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1, px: 0.25 }}>
          <Typography
            sx={{
              fontSize: iosTypographyScale.caption2,
              color: "text.disabled",
              minWidth: 18,
            }}
          >
            x1
          </Typography>
          <Slider
            value={guestMultiplier}
            onChange={(_e, val) => setGuestMultiplier(val as number)}
            min={1}
            max={4}
            step={0.1}
            valueLabelDisplay="auto"
            valueLabelFormat={(v) => `x${v}`}
            aria-label={inv.priceMultiplier}
            aria-valuetext={`x${guestMultiplier}`}
            sx={{
              color: brand.emerald[600],
              "& .MuiSlider-thumb": {
                width: 22,
                height: 22,
                border: `2px solid ${brand.emerald[700]}`,
                bgcolor: "background.paper",
                "&:hover, &.Mui-focusVisible": {
                  boxShadow: `0 0 0 8px ${brand.emerald[600]}1F`,
                },
              },
              "& .MuiSlider-track": { height: 6 },
              "& .MuiSlider-rail": { height: 6, opacity: 0.3 },
              "& .MuiSlider-valueLabel": {
                fontSize: iosTypographyScale.caption1,
                bgcolor: brand.emerald[700],
              },
            }}
          />
          <Typography
            sx={{
              fontSize: iosTypographyScale.caption2,
              color: "text.disabled",
              minWidth: 18,
            }}
          >
            x4
          </Typography>
        </Box>
      </Box>
    </Box>
  )}
</SectionCard>
```

- [ ] **Step 2: Smoke (US-3)**

In dev, toggle the price switch off → sub-block collapses. Toggle on → reveals currency + slider. Drag the slider; the `x{n}` badge updates live; aria-valuetext announces "x2.3" etc.

- [ ] **Step 3: Commit**

```bash
git add src/pages/invitations/CreateInvitationPage.tsx
git commit -m "feat(invitation-page): add pricing experience section (toggle, currency, multiplier)"
```

---

## Task 8: Build the live `GuestPreview` and place it sticky on md+ / inline on xs–sm

**Files:**

- Modify: `src/pages/invitations/CreateInvitationPage.tsx`

P1-1 + P1-2 — the right-rail preview that updates in real time. Q-2 resolution: stylized SVG silhouette, no Drive call.

- [ ] **Step 1: Add `GuestPreview` above `export default function CreateInvitationPage`**

```tsx
function GuestPreview({
  guestName,
  showPrices,
  currency,
  multiplier,
  inv,
}: {
  guestName: string;
  showPrices: boolean;
  currency: GuestCurrencyMode;
  multiplier: GuestMultiplier;
  inv: any;
}) {
  const firstName =
    guestName.trim().split(" ")[0] || inv.guestNamePlaceholder.split(" ")[0];

  // Reference stone: 2,000,000 COP at multiplier 1.
  const samplePriceLabel = useMemo(() => {
    if (!showPrices) return null;
    if (currency === "COP") {
      const amount = 2_000_000 * multiplier;
      return `$${amount.toLocaleString("es-CO")} COP`;
    }
    const usd = Math.round((2_000_000 / 4200) * multiplier);
    return `$${usd.toLocaleString("en-US")} USD`;
  }, [showPrices, currency, multiplier]);

  return (
    <SectionCard>
      <SectionLabel
        title={inv.previewHeader}
        helper={inv.previewHelper}
        icon={
          <Box
            sx={{
              width: 28,
              height: 28,
              borderRadius: radius.md,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              bgcolor: brand.emerald[50],
              border: "1px solid",
              borderColor: brand.emerald[200],
            }}
          >
            <PersonIcon sx={{ fontSize: 16, color: brand.emerald[700] }} />
          </Box>
        }
      />

      <Typography
        sx={{
          fontSize: iosTypographyScale.title3,
          fontWeight: fontWeights.semibold,
          color: "text.primary",
          mb: 0.25,
          letterSpacing: "-0.01em",
        }}
      >
        {inv.previewGreeting.replace("{name}", firstName)}
      </Typography>
      <Typography
        sx={{
          fontSize: iosTypographyScale.footnote,
          color: "text.secondary",
          mb: 2.25,
        }}
      >
        {inv.previewSubGreeting}
      </Typography>

      {/* Mock product tile */}
      <Box
        sx={{
          display: "flex",
          gap: 1.5,
          alignItems: "center",
          p: 1.5,
          borderRadius: radius.lg,
          border: "1px dashed",
          borderColor: brand.emerald[200],
          bgcolor: `${brand.emerald[50]}80`,
        }}
      >
        <Box
          sx={{
            width: 56,
            height: 56,
            borderRadius: radius.md,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: `linear-gradient(135deg, ${brand.emerald[500]} 0%, ${brand.emerald[800]} 100%)`,
            boxShadow: `inset 0 0 0 1px ${brand.emerald[300]}, 0 4px 12px ${brand.emerald[700]}30`,
            flexShrink: 0,
          }}
        >
          <Box
            component="svg"
            viewBox="0 0 24 24"
            sx={{ width: 28, height: 28, color: brand.emerald[100] }}
            fill="currentColor"
          >
            <path d="M6 3h12l3 6-9 12L3 9l3-6z" opacity={0.85} />
          </Box>
        </Box>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography
            sx={{
              fontSize: iosTypographyScale.subhead,
              fontWeight: fontWeights.semibold,
              color: "text.primary",
              lineHeight: 1.2,
            }}
            noWrap
          >
            {inv.previewProductName}
          </Typography>
          <Typography
            sx={{
              fontSize: iosTypographyScale.caption1,
              color: "text.secondary",
              mb: 0.25,
            }}
          >
            {inv.previewProductMeta}
          </Typography>
          {showPrices ? (
            <Typography
              sx={{
                fontSize: iosTypographyScale.callout,
                fontWeight: fontWeights.bold,
                color: brand.emerald[700],
                fontFamily: typography.fontFamily.mono,
                letterSpacing: "-0.01em",
              }}
            >
              {samplePriceLabel}
            </Typography>
          ) : (
            <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
              <VisibilityOffIcon
                sx={{ fontSize: 13, color: "text.disabled" }}
              />
              <Typography
                sx={{
                  fontSize: iosTypographyScale.footnote,
                  color: "text.secondary",
                  fontStyle: "italic",
                }}
              >
                {inv.previewPriceOnRequest}
              </Typography>
            </Box>
          )}
        </Box>
      </Box>

      {/* Validity pill */}
      <Box
        sx={{
          mt: 2,
          display: "flex",
          alignItems: "center",
          gap: 0.75,
          color: "text.secondary",
        }}
      >
        <ClockIcon sx={{ fontSize: 14 }} />
        <Typography sx={{ fontSize: iosTypographyScale.caption1 }}>
          {inv.expiryHint}
        </Typography>
      </Box>
    </SectionCard>
  );
}
```

- [ ] **Step 2: Render the inline preview between Section C and the future Generate CTA (xs–sm only)**

Replace `{/* MOBILE PREVIEW (Task 8) */}` with:

```tsx
{
  !isMdUp && (
    <GuestPreview
      guestName={guestName}
      showPrices={showPrices}
      currency={guestCurrency}
      multiplier={guestMultiplier}
      inv={inv}
    />
  );
}
```

- [ ] **Step 3: Render the sticky right rail (md+) at the bottom of the grid**

Replace `{/* RIGHT COLUMN (Task 8) */}` with:

```tsx
{
  isMdUp && !lastInvitation && (
    <Box sx={{ position: "sticky", top: spacing.lg }}>
      <GuestPreview
        guestName={guestName}
        showPrices={showPrices}
        currency={guestCurrency}
        multiplier={guestMultiplier}
        inv={inv}
      />
    </Box>
  );
}
```

- [ ] **Step 4: Smoke (US-3)**

DevTools 1024 px viewport. Type a name → preview greeting updates. Move slider → preview price updates. Toggle off prices → preview shows "Precio bajo consulta" with a `VisibilityOff` icon. Scroll the page; preview stays sticky.

- [ ] **Step 5: Commit**

```bash
git add src/pages/invitations/CreateInvitationPage.tsx
git commit -m "feat(invitation-page): add live GuestPreview with sticky right-rail at md+"
```

---

## Task 9: Build the Generate CTA + cancel row

**Files:**

- Modify: `src/pages/invitations/CreateInvitationPage.tsx`

- [ ] **Step 1: Replace `{/* GENERATE CTA (Task 9) */}` with the CTA block**

```tsx
<SectionCard emphasized>
  <Button
    variant="contained"
    size="large"
    fullWidth
    onClick={handleGenerate}
    disabled={isGenerating || !isFormValid}
    startIcon={
      isGenerating ? (
        <CircularProgress size={18} sx={{ color: 'inherit' }} />
      ) : (
        <LinkIcon />
      )
    }
    sx={{
      height: 52,
      background: `linear-gradient(135deg, ${brand.emerald[600]} 0%, ${brand.emerald[700]} 100%)`,
      '&:hover': {
        background: `linear-gradient(135deg, ${brand.emerald[500]} 0%, ${brand.emerald[600]} 100%)`,
      },
      '&:disabled': { opacity: 0.45, color: 'rgba(255,255,255,0.85)' },
      borderRadius: radius.lg,
      textTransform: 'none',
      fontWeight: fontWeights.semibold,
      fontSize: iosTypographyScale.headline,
      boxShadow: `0 6px 18px ${brand.emerald[700]}30`,
    }}
  >
    {isGenerating
      ? inv.generating
      : firstName
        ? `${inv.createLinkFor} ${firstName}`
        : inv.generateLink}
  </Button>

  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0.5, mt: 1.25, color: 'text.secondary' }}>
    <InfoIcon sx={{ fontSize: 13 }} />
    <Typography sx={{ fontSize: iosTypographyScale.caption1 }}>
      {inv.expiryHint}
    </Typography>
  </Box>
</SectionCard>

<Box sx={{ display: 'flex', justifyContent: 'center' }}>
  <Button
    onClick={() => navigate(-1)}
    startIcon={<ArrowBackIcon sx={{ fontSize: '18px !important' }} />}
    sx={{
      textTransform: 'none',
      color: 'text.secondary',
      fontWeight: fontWeights.medium,
      minHeight: 44,
      px: 2,
      '&:hover': { bgcolor: 'action.hover' },
    }}
  >
    {t.actions.back}
  </Button>
</Box>
```

- [ ] **Step 2: Smoke (US-6)**

In dev, leave name empty → button label is "Generar Enlace" and is disabled. Type a name only (no contact) → still disabled. Add an email → button enables and label becomes "Crear enlace para {firstName}". Click → spinner + "Generando…" while the API call resolves; then the success state in Task 10 renders.

- [ ] **Step 3: Commit**

```bash
git add src/pages/invitations/CreateInvitationPage.tsx
git commit -m "feat(invitation-page): add Generate CTA with personalized label and cancel row"
```

---

## Task 10: Build the success state (URL, PIN, summary chips, Copy/Share/QR, footer)

**Files:**

- Modify: `src/pages/invitations/CreateInvitationPage.tsx`

This task replaces `{/* Task 10 */}` inside the `motion.div key="success"`. Reuses `lastInvitation` from `useInvitation()`.

- [ ] **Step 1: Insert the success card**

```tsx
<Box sx={{ display: "flex", flexDirection: "column", gap: { xs: 2, md: 2.5 } }}>
  <SectionCard emphasized>
    {/* Headline */}
    <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, mb: 2.5 }}>
      <Box
        sx={{
          width: 44,
          height: 44,
          borderRadius: radius.lg,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          bgcolor: brand.emerald[50],
          border: "1px solid",
          borderColor: brand.emerald[200],
          flexShrink: 0,
        }}
      >
        <CheckIcon sx={{ color: brand.emerald[700], fontSize: 24 }} />
      </Box>
      <Box sx={{ minWidth: 0 }}>
        <Typography
          sx={{
            fontSize: iosTypographyScale.title3,
            fontWeight: fontWeights.bold,
            color: "text.primary",
            letterSpacing: "-0.01em",
            lineHeight: 1.2,
          }}
          noWrap
        >
          {inv.linkGeneratedFor} {guestName}
        </Typography>
        <Typography
          sx={{
            fontSize: iosTypographyScale.footnote,
            color: "text.secondary",
            mt: 0.25,
          }}
        >
          {inv.validFor24h}
        </Typography>
      </Box>
    </Box>

    {/* URL field */}
    <TextField
      fullWidth
      value={lastInvitation.url}
      InputProps={{
        readOnly: true,
        sx: {
          fontFamily: typography.fontFamily.mono,
          fontSize: iosTypographyScale.subhead,
          fontWeight: fontWeights.medium,
          bgcolor: "action.hover",
          borderRadius: radius.lg,
        },
        endAdornment: (
          <IconButton
            onClick={handleCopyLink}
            size="small"
            aria-label={inv.copy}
            sx={{ borderRadius: radius.md }}
          >
            {copied ? (
              <CheckIcon sx={{ color: brand.emerald[600], fontSize: 18 }} />
            ) : (
              <CopyIcon sx={{ fontSize: 18 }} />
            )}
          </IconButton>
        ),
      }}
      sx={{ mb: 2 }}
    />

    {/* PIN block (clickable card copies the PIN) */}
    {lastInvitation.pin && (
      <Box
        onClick={handleCopyPin}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") handleCopyPin();
        }}
        aria-label={`${inv.pinAccess}: ${lastInvitation.pin.split("").join(" ")}. ${inv.copy}`}
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: 1.5,
          p: 1.75,
          mb: 1.5,
          borderRadius: radius.lg,
          bgcolor: brand.emerald[50],
          border: "1px solid",
          borderColor: brand.emerald[200],
          cursor: "pointer",
          transition: cssTransition.fast,
          "&:hover": {
            borderColor: brand.emerald[400],
            boxShadow: `0 0 0 3px ${brand.emerald[600]}14`,
          },
          "&:active": { transform: "scale(0.995)" },
          "&:focus-visible": {
            outline: `2px solid ${brand.emerald[600]}`,
            outlineOffset: 2,
          },
        }}
      >
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            gap: 1.5,
            flexWrap: "wrap",
          }}
        >
          <Typography
            sx={{
              fontSize: iosTypographyScale.footnote,
              fontWeight: fontWeights.semibold,
              color: "text.secondary",
              textTransform: "uppercase",
              letterSpacing: "0.04em",
            }}
          >
            {inv.pinAccess}
          </Typography>
          <Box sx={{ display: "flex", gap: 0.75 }}>
            {lastInvitation.pin.split("").map((digit, i) => (
              <Box
                key={i}
                sx={{
                  width: 34,
                  height: 40,
                  borderRadius: radius.md,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  bgcolor: "background.paper",
                  border: "1px solid",
                  borderColor: brand.emerald[300],
                }}
              >
                <Typography
                  aria-hidden
                  sx={{
                    fontFamily: "monospace",
                    fontWeight: fontWeights.bold,
                    fontSize: iosTypographyScale.headline,
                    color: brand.emerald[800],
                    lineHeight: 1,
                  }}
                >
                  {digit}
                </Typography>
              </Box>
            ))}
          </Box>
        </Box>
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            gap: 0.5,
            color: brand.emerald[700],
          }}
        >
          {copiedPin ? (
            <CheckIcon sx={{ fontSize: 16 }} />
          ) : (
            <CopyIcon sx={{ fontSize: 16 }} />
          )}
          <Typography
            sx={{
              fontSize: iosTypographyScale.subhead,
              fontWeight: fontWeights.semibold,
            }}
          >
            {copiedPin ? inv.copied : inv.copy}
          </Typography>
        </Box>
      </Box>
    )}

    <Typography
      sx={{
        display: "block",
        textAlign: "center",
        fontSize: iosTypographyScale.caption1,
        color: "text.secondary",
        mb: 2.5,
      }}
    >
      {inv.sharePinSeparately}
    </Typography>

    {/* Summary chips: pricing mode, currency × multiplier, contact */}
    <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.75, mb: 2.5 }}>
      {[
        {
          icon: <PriceIcon sx={{ fontSize: 14 }} />,
          label:
            lastInvitation.pricingMode === "with_prices"
              ? inv.withPrices
              : inv.withoutPrices,
          active: lastInvitation.pricingMode === "with_prices",
        },
        ...(lastInvitation.guestCurrencyMode
          ? [
              {
                icon: <CurrencyIcon sx={{ fontSize: 14 }} />,
                label:
                  lastInvitation.guestCurrencyMode === "USD"
                    ? `USD x${lastInvitation.guestMultiplier || 4}`
                    : `COP x${lastInvitation.guestMultiplier || 4}`,
                active: true,
              },
            ]
          : []),
        ...(guestEmail
          ? [
              {
                icon: <EmailIcon sx={{ fontSize: 14 }} />,
                label: guestEmail,
                active: false,
              },
            ]
          : []),
        ...(guestPhone
          ? [
              {
                icon: <PhoneIcon sx={{ fontSize: 14 }} />,
                label: guestPhone,
                active: false,
              },
            ]
          : []),
      ].map((tag, i) => (
        <Chip
          key={i}
          icon={tag.icon as React.ReactElement}
          label={tag.label}
          size="small"
          sx={{
            height: 28,
            borderRadius: radius.md,
            bgcolor: tag.active ? brand.emerald[50] : "action.hover",
            border: "1px solid",
            borderColor: tag.active ? brand.emerald[200] : "divider",
            color: tag.active ? brand.emerald[700] : "text.secondary",
            fontSize: iosTypographyScale.caption1,
            fontWeight: tag.active ? fontWeights.semibold : fontWeights.medium,
            "& .MuiChip-icon": { color: "inherit", ml: 0.75 },
            maxWidth: 200,
            "& .MuiChip-label": {
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            },
          }}
        />
      ))}
    </Box>

    {/* Action buttons: Copy · Share · QR */}
    <Box
      sx={{
        display: "grid",
        gridTemplateColumns: { xs: "1fr 1fr auto", sm: "1fr 1fr auto" },
        gap: 1,
      }}
    >
      <Button
        variant="contained"
        startIcon={<CopyIcon sx={{ fontSize: "18px !important" }} />}
        onClick={handleCopyLink}
        sx={{
          background: `linear-gradient(135deg, ${brand.emerald[600]} 0%, ${brand.emerald[700]} 100%)`,
          "&:hover": {
            background: `linear-gradient(135deg, ${brand.emerald[500]} 0%, ${brand.emerald[600]} 100%)`,
          },
          borderRadius: radius.lg,
          textTransform: "none",
          fontWeight: fontWeights.semibold,
          fontSize: iosTypographyScale.subhead,
          py: 1.25,
          minHeight: 44,
        }}
      >
        {copied ? inv.copiedBang : inv.copy}
      </Button>

      {"share" in navigator ? (
        <Button
          variant="outlined"
          startIcon={<ShareIcon sx={{ fontSize: "18px !important" }} />}
          onClick={handleShare}
          sx={{
            borderRadius: radius.lg,
            textTransform: "none",
            fontWeight: fontWeights.semibold,
            fontSize: iosTypographyScale.subhead,
            py: 1.25,
            minHeight: 44,
            borderColor: "divider",
            color: "text.primary",
            "&:hover": {
              borderColor: brand.emerald[400],
              bgcolor: brand.emerald[50],
            },
          }}
        >
          {inv.share}
        </Button>
      ) : (
        <Box />
      )}

      <IconButton
        onClick={() => setShowQR(!showQR)}
        aria-label="QR Code"
        sx={{
          border: "1px solid",
          borderColor: showQR ? brand.emerald[400] : "divider",
          borderRadius: radius.lg,
          bgcolor: showQR ? brand.emerald[50] : "transparent",
          color: showQR ? brand.emerald[700] : "text.primary",
          width: 44,
          height: 44,
          transition: cssTransition.fast,
          "&:hover": {
            borderColor: brand.emerald[400],
            bgcolor: brand.emerald[50],
          },
        }}
      >
        <QrCodeIcon sx={{ fontSize: 22 }} />
      </IconButton>
    </Box>

    {showQR && (
      <Box
        sx={{
          display: "flex",
          justifyContent: "center",
          p: 2.5,
          mt: 2,
          bgcolor: "white",
          borderRadius: radius.xl,
          border: "1px solid",
          borderColor: brand.emerald[200],
        }}
      >
        <QRCodeSVG
          value={lastInvitation.url}
          size={200}
          level="M"
          includeMargin
          fgColor={brand.emerald[800]}
        />
      </Box>
    )}
  </SectionCard>

  {/* Footer actions */}
  <Box
    sx={{
      display: "flex",
      flexDirection: { xs: "column", sm: "row" },
      alignItems: "center",
      justifyContent: "space-between",
      gap: 1.5,
    }}
  >
    <Button
      onClick={handleReset}
      startIcon={<LinkOutlineIcon sx={{ fontSize: "18px !important" }} />}
      sx={{
        color: brand.emerald[700],
        textTransform: "none",
        fontWeight: fontWeights.semibold,
        fontSize: iosTypographyScale.subhead,
        minHeight: 44,
        "&:hover": { bgcolor: brand.emerald[50] },
      }}
    >
      {inv.createAnother}
    </Button>
    <Button
      onClick={() => navigate("/mi-perfil")}
      sx={{
        color: "text.secondary",
        textTransform: "none",
        fontWeight: fontWeights.medium,
        fontSize: iosTypographyScale.subhead,
        minHeight: 44,
        "&:hover": { bgcolor: "action.hover" },
      }}
    >
      {inv.backToProfile}
    </Button>
  </Box>
</Box>
```

- [ ] **Step 2: Smoke (US-4, US-5)**

After a successful generate: success card replaces the form (no navigation). Click the URL copy icon → snackbar "Enlace copiado…". Click the PIN card → snackbar "PIN copiado…". Click the QR icon → 200 px QR appears centered. On a phone, "Compartir" opens the native share sheet; on desktop without Web Share API, the Share button is hidden (`<Box />` placeholder keeps the grid columns aligned). Click "Crear otra invitación" → form returns with cleared fields and the right-rail preview reappears.

- [ ] **Step 3: Commit**

```bash
git add src/pages/invitations/CreateInvitationPage.tsx
git commit -m "feat(invitation-page): add success state with URL/PIN/QR/share and footer actions"
```

---

## Task 11: Wire `IOSMoreSheet` to navigate to the new page

**Files:**

- Modify: `src/components/ios/IOSMoreSheet.tsx`

- [ ] **Step 1: Drop the modal import and state**

In `src/components/ios/IOSMoreSheet.tsx`:

- Remove the `import InvitationGenerator from '../invitation/InvitationGenerator';` line.
- Remove the `const [invitationOpen, setInvitationOpen] = useState(false);` line.
- Remove the `<InvitationGenerator open={invitationOpen} onClose={…} />` element near the bottom of the component.

- [ ] **Step 2: Route the "invitation" tool through `navigate`**

Inside `handleToolClick`, replace the `if (tool.action === 'invitation') { setInvitationOpen(true); return; }` branch with:

```tsx
if (tool.action === "invitation") {
  navigate("/invitaciones/nueva");
  onClose();
  return;
}
```

- [ ] **Step 3: Smoke (US-1, P0-2)**

In dev, sign in as Embajador → tap the "Más" tab → tap the "Invitar" tile → sheet closes and the page renders at `/invitaciones/nueva`.

- [ ] **Step 4: Commit**

```bash
git add src/components/ios/IOSMoreSheet.tsx
git commit -m "feat(invitation-page): route IOSMoreSheet 'Invitar' tile to /invitaciones/nueva"
```

---

## Task 12: Delete the legacy modal and update the barrel

**Files:**

- Delete: `src/components/invitation/InvitationGenerator.tsx`
- Modify: `src/components/invitation/index.ts`

Q-1 resolution: delete outright, no backwards-compat shim.

- [ ] **Step 1: Confirm nothing else imports `InvitationGenerator`**

Run: `grep -rn "InvitationGenerator" src/ api/`
Expected: no matches outside `src/components/invitation/index.ts` and the file itself.

- [ ] **Step 2: Delete the file**

```bash
git rm src/components/invitation/InvitationGenerator.tsx
```

- [ ] **Step 3: Update the barrel**

Replace the contents of `src/components/invitation/index.ts` with:

```ts
// InvitationGenerator (legacy modal) replaced by /invitaciones/nueva page.
// See: src/pages/invitations/CreateInvitationPage.tsx and
// docs/specs/2026-05-01-create-invitation-page.md
export { default as InvitationBanner } from "./InvitationBanner";
```

- [ ] **Step 4: Type-check**

Run: `npx tsc --noEmit`
Expected: 0 errors. Anything still referencing the deleted symbol would surface here.

- [ ] **Step 5: Commit**

```bash
git add src/components/invitation/index.ts
git commit -m "feat(invitation-page): retire legacy InvitationGenerator modal"
```

---

## Task 13: Verification, build, and acceptance smoke

**Files:** none modified — pure verification.

- [ ] **Step 1: Type-check**

Run: `npx tsc --noEmit`
Expected: 0 errors across the whole project.

- [ ] **Step 2: Production build**

Run: `npm run build`
Expected: build succeeds. `index.html` and `public/version.json` get updated `APP_VERSION` automatically — keep them staged for the PR per CLAUDE.md "Git Commit Rules".

- [ ] **Step 3: Acceptance smoke against the spec**

Run: `npm run dev` and walk the matrix below in a clean private window:

| Test                                           | Spec ref           | Expected                                                   |
| ---------------------------------------------- | ------------------ | ---------------------------------------------------------- |
| Visit `/invitaciones/nueva` as guest (no role) | US-7 / P0-1        | Redirect to `/home`                                        |
| Visit as staff                                 | P0-1               | Page renders                                               |
| Type name + email + slider 1.0 → 4.0           | US-3 / P1-1        | Right-rail preview price updates live                      |
| Toggle prices off                              | P0-3               | Sub-block collapses; preview shows "Precio bajo consulta"  |
| Submit empty form                              | US-6               | Generate button disabled                                   |
| Submit with name + contact                     | US-4 / P0-3 / P0-4 | API call succeeds, success card swaps in via fade          |
| Click URL copy icon                            | P0-3               | Snackbar "Enlace copiado…"                                 |
| Click PIN card                                 | P0-3               | Snackbar "PIN copiado…"                                    |
| Click QR icon                                  | P0-3               | 200 px QR card reveals                                     |
| Click "Crear otra invitación"                  | US-5               | Form returns with cleared values                           |
| Click "Ir a Mi Perfil"                         | spec §5 footer     | Navigates to `/mi-perfil`                                  |
| 375 px viewport                                | P0-8               | No horizontal scroll, sections stack                       |
| Switch language to en/fr/it/pt/zh              | P0-7               | All hero, section, preview, CTA, success strings localized |
| `prefers-reduced-motion: reduce`               | P0-9 / P1-3        | Form↔success swap is instant (no fade)                     |

- [ ] **Step 4: Commit the build artifacts**

```bash
git add index.html public/version.json
git commit -m "build: bump APP_VERSION for invitation page release"
```

- [ ] **Step 5: Summarize the change for the PR**

The PR body should call out: new route `/invitaciones/nueva`, modal retired, `IOSMoreSheet` swap, 18 i18n keys × 6 locales, no API changes (P0-4 / Non-Goal 1). Phase 2 follow-ups (analytics events `invitation_page_view` / `invitation_generated_v2`, P1-4 recent-guests prefill strip) are explicitly deferred per spec §9.

---

## Self-Review Notes

**Spec coverage:** Every P0 requirement maps to a task — P0-1 (Task 1), P0-2 (Task 11), P0-3/P0-4 (Tasks 4/9/10), P0-5 (Tasks 6+10), P0-6 (Tasks 3/5/8), P0-7 (Task 2), P0-8 (Task 5+13), P0-9 (Tasks 4+13), P0-10 (Task 13). P1-1/P1-2 covered by Task 8; P1-3 covered by Task 4 (`fadeUp` motion preset). P1-4 (recent-guests prefill) is explicitly deferred to Phase 2 per spec §9.

**Placeholder scan:** Every step contains the actual code or command. No "TBD", no "implement later", no naked "add validation" prose.

**Type consistency:** `lastInvitation`, `guestCurrency`, `guestMultiplier`, `showPrices`, `firstName`, and the `inv` alias are introduced in Task 4 and used identically through Task 10. `handleCopyLink`, `handleCopyPin`, `handleShare`, `handleReset` are defined in Task 4 and consumed in Task 10. `SectionCard` / `SectionLabel` (Task 3) are consumed unchanged in Tasks 6/7/8/10. `GuestPreview` (Task 8) takes `{ guestName, showPrices, currency, multiplier, inv }` and is invoked with the same prop names from both the inline (Task 8 step 2) and sticky (Task 8 step 3) sites.
