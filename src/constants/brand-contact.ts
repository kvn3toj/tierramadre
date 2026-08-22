/**
 * Public contact channels of Tierra Madre.
 *
 * Single source of truth for the brand's outward-facing links (the home
 * Footer, the Kit Renacer landing, …) so a change of line or handle does not
 * have to be chased through the components that surface it.
 */

/** Brand WhatsApp line, E.164 with the leading `+`. */
export const BRAND_WHATSAPP_NUMBER = '+573113052755';

/** Same line as a wa.me link (wa.me rejects the `+`). */
export const BRAND_WHATSAPP_LINK = `https://wa.me/${BRAND_WHATSAPP_NUMBER.replace('+', '')}`;

export const BRAND_INSTAGRAM_LINK =
  'https://www.instagram.com/tierramadre.co?igsh=dnJ3djRkOGIwdHhy';

export const BRAND_WEBSITE_LINK = 'https://www.tierramadre.co';

/** Brand WhatsApp link carrying a pre-filled message. */
export function brandWhatsAppLink(message: string): string {
  return `${BRAND_WHATSAPP_LINK}?text=${encodeURIComponent(message)}`;
}
