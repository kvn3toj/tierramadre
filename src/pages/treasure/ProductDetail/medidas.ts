/**
 * medidas — one place that decides what a product's "Medidas" row shows.
 *
 * The catalog carries measurements in two columns with DIFFERENT meanings, and
 * the split is the source of a long-standing display bug:
 *
 *   • `medidas`        — in the legacy Sheets catalog this is the FORMAT LABEL
 *                        ("Largo x Ancho" / "Diámetro"), not a measurement.
 *                        In Fotosíntesis/Convex the same field holds the actual
 *                        serialized value ("6.9×9×3.8 mm").
 *   • `medidasValores` — the legacy column that holds the real numbers.
 *
 * As of the 2026-07-31 audit, 191 of 513 catalog items store a format label in
 * `medidas` with the real value in `medidasValores`. Any surface reading
 * `medidas` alone renders "Largo x Ancho" to the customer — which is exactly
 * what the gem sheet did.
 *
 * Precedence therefore prefers a value that actually looks like a measurement
 * over one that looks like a label, rather than trusting either column blindly.
 */

import type { TreasureItem } from '../../../types';

/** The two format labels the catalog uses in `medidas` in place of a value. */
const FORMAT_LABELS = /^(largo\s*[x×]\s*ancho|di[áa]metro)$/i;

/** Placeholder values that mean "no measurement", not a measurement of zero. */
const EMPTY_VALUES = new Set(['', '-', '0', 'anillo']);

const isMeaningful = (raw: string | undefined): boolean => {
  const v = (raw ?? '').trim();
  return (
    v !== '' && !EMPTY_VALUES.has(v.toLowerCase()) && !FORMAT_LABELS.test(v)
  );
};

/**
 * The measurement to display, already unit-formatted, or `undefined` when the
 * product genuinely has none (so callers can drop the row entirely).
 *
 * `medidasValores` wins only when `medidas` is a bare format label — a
 * Fotosíntesis item whose `medidas` holds freshly-edited values must not be
 * overridden by a stale legacy `medidasValores`.
 */
export function formatMedidas(
  product: Partial<Pick<TreasureItem, 'medidas' | 'medidasValores'>>,
): string | undefined {
  const medidas = (product.medidas ?? '').trim();
  const valores = (product.medidasValores ?? '').trim();

  const chosen = isMeaningful(medidas)
    ? medidas
    : isMeaningful(valores)
      ? valores
      : '';
  if (!chosen) return undefined;

  // Append the unit only when the value is bare numbers + dimension separators.
  // Testing for any letter is wrong: "6.9 x 9" uses `x` AS a separator and would
  // be mistaken for a value that already carries its unit. So strip the digits
  // and separators first — whatever survives is a genuine unit word.
  const withoutDimensions = chosen.replace(/[\d.,\s\n]|[x×*]/gi, '');
  if (withoutDimensions !== '') return chosen;
  return `${chosen.replace(/\n/g, ' x ').trim()} mm`;
}
