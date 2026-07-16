/**
 * Filename convention for a kardex-event PDF comprobante.
 *
 * Extracted from MovimientosKardexPage's inline template literal so the bot
 * side and the browser side agree on one name, and so the sanitisation is
 * testable: the id becomes part of a Drive path, and `/` or `..` in it would
 * otherwise let a malformed event id write outside its folder.
 */
export function comprobanteFilename(kardexEventId: string): string {
  if (!kardexEventId) throw new Error('kardexEventId es obligatorio');
  const safe = kardexEventId.replace(/[^A-Za-z0-9-]/g, '_');
  return `kardex-${safe}.pdf`;
}
