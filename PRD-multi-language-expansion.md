# PRD: Multi-Language Expansion (6 Languages)

**Author:** Tierra Madre Team
**Date:** March 10, 2026
**Status:** Draft

---

## Problem Statement

Tierra Madre Studio currently supports only Spanish and English. As the brand expands internationally — particularly into European and Asian markets for Colombian emeralds — the app needs to support **French, Italian, Mandarin Chinese, and Portuguese** to serve ambassadors and clients in those regions. Without this, non-Spanish/English-speaking clients receive a degraded experience and ambassadors lose sales opportunities.

## Goals

1. **Add 4 new languages**: French (fr), Italian (it), Mandarin Chinese (zh), Portuguese (pt)
2. **Zero performance regression** — new languages should not increase initial bundle size
3. **Maintain type safety** — TypeScript should catch missing translation keys at compile time
4. **Simple maintenance** — adding or updating a key across all 6 languages should be straightforward
5. **Seamless UX** — language picker should replace the current binary toggle with a proper selector

## Non-Goals

- **Auto-detection of browser locale** — users will choose manually (keeps behavior explicit)
- **RTL language support** — no Arabic/Hebrew planned for this phase
- **Dynamic translation loading from a CMS** — translations stay in code for type safety and simplicity
- **Translating product data** (emerald names, descriptions) — those remain as-is from Google Sheets
- **Pluralization engine / ICU message format** — the current ~245 keys are simple strings, no complex plurals needed

---

## User Stories

### Ambassador (Asesor)
- As an ambassador, I want to switch the app to my client's language so that I can present quotations and products in a language they understand.
- As an ambassador, I want the quotation PDF to render in the selected language so that my international clients receive professional documents.

### Guest / Client
- As an invited guest, I want to browse the catalog in my native language so that I can understand product details and pricing.
- As a guest, I want the language I chose to persist across sessions so I don't have to re-select it every time.

---

## Requirements

### P0 — Must Have

| # | Requirement | Acceptance Criteria |
|---|-------------|-------------------|
| 1 | **Create 4 new translation files** (`fr.ts`, `it.ts`, `zh.ts`, `pt.ts`) with all ~245 keys | All files export the same object shape as `es.ts`. TypeScript compilation passes with no errors. |
| 2 | **Expand `Language` type** from `'es' \| 'en'` to include `'fr' \| 'it' \| 'zh' \| 'pt'` | Type is `'es' \| 'en' \| 'fr' \| 'it' \| 'zh' \| 'pt'`. All references updated. |
| 3 | **Replace `toggleLanguage()` with language selector** | Settings sheet shows a list/picker of 6 languages with native names and flag emojis. `toggleLanguage` removed or deprecated. |
| 4 | **Update `LanguageContext`** to support 6 languages in the translations map | `const translations = { es, en, fr, it, zh, pt }` works and `t` resolves correctly. |
| 5 | **localStorage persistence** works for all 6 language codes | Selecting any language, closing app, reopening → same language active. |
| 6 | **Quotation preview** renders in selected language | All quotation labels (client, ambassador, totals, notes, validity) display in the active language. |

### P1 — Nice to Have

| # | Requirement | Acceptance Criteria |
|---|-------------|-------------------|
| 7 | **Lazy-load translation files** to avoid bundling all 6 at once | Only `es.ts` + selected language loaded initially. Others loaded on demand via dynamic `import()`. Bundle size for initial load stays ≤ current size. |
| 8 | **Translation completeness check** script | `npm run check:translations` reports any keys present in `es.ts` but missing in other locale files. |
| 9 | **Language name displayed in its own language** in the picker | French shows "Français", Chinese shows "中文", etc. |

### P2 — Future Considerations

| # | Requirement |
|---|-------------|
| 10 | Browser locale auto-detection as a suggestion (not override) |
| 11 | Per-quotation language override (send quotation in a different language than app UI) |
| 12 | Contribution workflow for community translations |

---

## Technical Design (Recommended Approach)

### Current Architecture (what we have)

```
src/locales/
├── es.ts          (~326 lines, flat export)
└── en.ts          (~326 lines, flat export)

src/contexts/LanguageContext.tsx
├── Language type: 'es' | 'en'
├── toggleLanguage(): binary switch
└── translations map: { es, en }
```

### Target Architecture

```
src/locales/
├── es.ts          (source of truth — defines the shape)
├── en.ts
├── fr.ts
├── it.ts
├── zh.ts
├── pt.ts
└── index.ts       (barrel export + type helper)

src/contexts/LanguageContext.tsx
├── Language type: 'es' | 'en' | 'fr' | 'it' | 'zh' | 'pt'
├── setLanguage(lang): replaces toggleLanguage
└── translations map: { es, en, fr, it, zh, pt }
```

### Key Changes

**1. New locale files** — Each file (`fr.ts`, `it.ts`, `zh.ts`, `pt.ts`) follows the exact same structure as `es.ts`:

```typescript
// src/locales/fr.ts
export const fr = {
  nav: {
    home: 'Accueil',
    gallery: 'Galerie',
    // ... all ~245 keys
  },
  // ...
};
```

**2. Type-safe barrel export** — A new `src/locales/index.ts` ensures all files match the shape:

```typescript
import { es } from './es';
import { en } from './en';
import { fr } from './fr';
import { it } from './it';
import { zh } from './zh';
import { pt } from './pt';

export type Translations = typeof es;

// This line guarantees type safety — TS will error if any file
// is missing keys or has wrong types
export const translations: Record<string, Translations> = { es, en, fr, it, zh, pt };
```

**3. LanguageContext updates:**

```typescript
export type Language = 'es' | 'en' | 'fr' | 'it' | 'zh' | 'pt';

export const LANGUAGE_OPTIONS: { code: Language; label: string; flag: string }[] = [
  { code: 'es', label: 'Español', flag: '🇨🇴' },
  { code: 'en', label: 'English', flag: '🇺🇸' },
  { code: 'fr', label: 'Français', flag: '🇫🇷' },
  { code: 'it', label: 'Italiano', flag: '🇮🇹' },
  { code: 'zh', label: '中文', flag: '🇨🇳' },
  { code: 'pt', label: 'Português', flag: '🇧🇷' },
];
```

**4. Settings UI** — Replace the toggle in `IOSSettingsSheet.tsx` with a language picker (list of options or bottom sheet selector).

### What Stays the Same

- **No new dependencies** — keeps the custom i18n approach (no i18next needed)
- **Synchronous cache loading** — `useState(() => localStorage.getItem(...))` pattern preserved
- **`useLanguage()` hook API** — components still do `const { t } = useLanguage()` — zero changes needed in 23+ consuming components
- **TypeScript compile-time safety** — `typeof es` ensures all locale files match

### Bundle Impact Estimate

Each locale file is ~326 lines of string literals ≈ **~8KB uncompressed / ~2KB gzipped** per language. Adding 4 languages adds **~8KB gzipped** total to the bundle — negligible. Lazy loading (P1) is optional and can be added later if needed.

---

## Success Metrics

| Metric | Target | Type |
|--------|--------|------|
| All 6 languages fully translated (0 missing keys) | 100% | Leading |
| No increase in initial page load time | ≤50ms delta | Leading |
| International ambassador adoption (non-ES/EN language selected) | ≥10 users within 30 days | Lagging |
| Quotation PDFs generated in non-ES/EN languages | ≥5 within 30 days | Lagging |
| Zero TypeScript compilation errors from locale files | 0 errors | Leading |

---

## Open Questions

| Question | Owner |
|----------|-------|
| Should we use professional translation services or are AI-generated translations acceptable for v1? | Product / Brand |
| Is Brazilian Portuguese (pt-BR) sufficient, or do we also need European Portuguese (pt-PT)? | Product |
| For Mandarin: simplified (zh-CN) or traditional (zh-TW) characters? | Product |
| Should the quotation PDF language be tied to app language or independently selectable? | Design |

---

## Timeline Considerations

- **Estimated effort**: 1-2 days for implementation, 1-2 days for translation review
- **No external dependencies** — all changes are frontend-only
- **No API changes needed** — translations are entirely client-side
- **Phasing**: Can ship all 4 languages at once since the architecture change is the same regardless of count
- **Risk**: Translation quality — machine translations may need native speaker review before going live

---

## Implementation Checklist

1. Create `fr.ts`, `it.ts`, `zh.ts`, `pt.ts` with all keys translated
2. Create `src/locales/index.ts` barrel with type checking
3. Update `Language` type in `LanguageContext.tsx`
4. Add `LANGUAGE_OPTIONS` config array
5. Replace `toggleLanguage` with `setLanguage` in settings UI
6. Update `IOSSettingsSheet.tsx` — language picker component
7. Update `settings` translation keys to include new language names
8. Test quotation preview in all 6 languages
9. Run `npm run build` — verify no TypeScript errors
10. Native speaker review of translations (post-ship or pre-ship TBD)
