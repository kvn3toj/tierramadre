/**
 * Casa Tierra Madre - canonical contact details.
 *
 * The house WhatsApp number used to be copy-pasted into Footer, VitrinaPage and
 * PedidoConfirmadoPage; it lives here now so a number change is one edit.
 */

/** House WhatsApp, E.164 without the leading '+' (the shape wa.me expects). */
export const HOUSE_WHATSAPP = '573113052755';

/** Same number, formatted for display. */
export const HOUSE_WHATSAPP_DISPLAY = '+57 311 305 2755';

export const INSTAGRAM_URL =
  'https://www.instagram.com/tierramadre.co?igsh=dnJ3djRkOGIwdHhy';
export const WEBSITE_URL = 'https://www.tierramadre.co';

/**
 * Build a wa.me link to the house line.
 * `message` is pre-filled into the chat; the visitor still has to press send.
 */
export function houseWhatsAppLink(message?: string): string {
  const base = `https://wa.me/${HOUSE_WHATSAPP}`;
  return message ? `${base}?text=${encodeURIComponent(message)}` : base;
}

/** Default opener when someone taps the floating button with no context. */
export const DEFAULT_WHATSAPP_MESSAGE =
  'Buen día, escribo desde tierramadre.app. Me gustaría recibir información sobre las esmeraldas de la colección.';
