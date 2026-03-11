/**
 * Locales Barrel Export
 *
 * All locale files must match the shape of `es` (source of truth).
 * TypeScript will error if any file is missing keys or has wrong types.
 */

import { es } from './es';
import { en } from './en';
import { fr } from './fr';
import { it } from './it';
import { zh } from './zh';
import { pt } from './pt';

export type Translations = typeof es;

export type Language = 'es' | 'en' | 'fr' | 'it' | 'zh' | 'pt';

/** Type-safe translations map — TS will error if any locale file is missing keys */
export const translations: Record<Language, Translations> = { es, en, fr, it, zh, pt };

/** Language options for the UI picker */
export const LANGUAGE_OPTIONS: { code: Language; label: string; flag: string }[] = [
  { code: 'es', label: 'Español', flag: '🇨🇴' },
  { code: 'en', label: 'English', flag: '🇺🇸' },
  { code: 'fr', label: 'Français', flag: '🇫🇷' },
  { code: 'it', label: 'Italiano', flag: '🇮🇹' },
  { code: 'zh', label: '中文', flag: '🇨🇳' },
  { code: 'pt', label: 'Português', flag: '🇧🇷' },
];

export { es, en, fr, it, zh, pt };
