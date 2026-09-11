/**
 * El idioma de `/pedido-confirmado/:saleId` no viaja en la redirección.
 *
 * `api/_lib/checkoutLink.ts` arma `redirect-url` sin idioma, y `LanguageContext`
 * guarda la preferencia del VISITANTE, no la del link por el que llegó (una
 * vitrina en inglés se abre con el contexto en español). Así que la hoja de
 * pago deja el idioma en `sessionStorage` justo antes de saltar a Wompi, y la
 * página de confirmación lo lee al volver — misma pestaña, mismo storage.
 *
 * Precedencia: `?lang=` explícito → handoff guardado → contexto → 'es'.
 */
import { LANGUAGE_OPTIONS, type Language } from '../locales';
import { SESSION_KEYS } from '../constants/storage-keys';

function esLanguage(v: unknown): v is Language {
  return typeof v === 'string' && LANGUAGE_OPTIONS.some((o) => o.code === v);
}

export function resolverLangPedido(
  search: string,
  guardado: string | null,
  contexto: Language,
): Language {
  const query = new URLSearchParams(search).get('lang');
  if (esLanguage(query)) return query;
  if (esLanguage(guardado)) return guardado;
  if (esLanguage(contexto)) return contexto;
  return 'es';
}

export function guardarLangPedido(lang: Language): void {
  try {
    sessionStorage.setItem(SESSION_KEYS.CHECKOUT_LANG, lang);
  } catch {
    // Safari privado / storage bloqueado: la confirmación cae al contexto.
  }
}

export function leerLangPedidoGuardado(): string | null {
  try {
    return sessionStorage.getItem(SESSION_KEYS.CHECKOUT_LANG);
  } catch {
    return null;
  }
}
