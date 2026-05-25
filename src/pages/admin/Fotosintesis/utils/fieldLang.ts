import type { InputHTMLAttributes } from "react";

/**
 * Native browser spell-check / autofill presets for Fotosíntesis form fields.
 *
 * The document is already `lang="es"`, but each preset sets `lang` on the field
 * too so the **Spanish dictionary** is used even when the browser or OS locale
 * is English. With spell-check on, a misspelled Spanish word gets the red
 * underline and the team can **secondary-click ("segundo clic" / right-click)**
 * it to choose the correct spelling. The context menu is allowed on inputs and
 * textareas (see `src/utils/pwa.ts`), so the correction option always appears.
 *
 * Spread the matching preset onto a `<Box component="input">` /
 * `component="textarea">` — or onto a MUI `TextField` via
 * `slotProps={{ htmlInput: spanishText }}`.
 */
type FieldLangProps = Pick<
  InputHTMLAttributes<HTMLInputElement>,
  "lang" | "spellCheck" | "autoCapitalize" | "autoComplete"
>;

/**
 * Free Spanish prose: item names, descriptions, treatments, techniques,
 * observations, closing notes, cancellation reasons. Spell-check ON.
 */
export const spanishText: FieldLangProps = {
  lang: "es",
  spellCheck: true,
  autoCapitalize: "sentences",
};

/**
 * Proper names of people and companies. Spell-check OFF (proper nouns would be
 * flagged as misspellings), but capitalize each word for tidy data entry.
 */
export const properName: FieldLangProps = {
  lang: "es",
  spellCheck: false,
  autoCapitalize: "words",
  autoComplete: "name",
};

/**
 * Postal addresses. Capitalize each word, no spell-check (street and city
 * names are mostly proper nouns).
 */
export const streetAddress: FieldLangProps = {
  lang: "es",
  spellCheck: false,
  autoCapitalize: "words",
  autoComplete: "street-address",
};

/**
 * Identifiers that must never be "corrected": document numbers, phones,
 * emails, codes, measurements, dates, URLs, place/mine names.
 */
export const noSpellCheck: FieldLangProps = {
  spellCheck: false,
  autoCapitalize: "none",
};
