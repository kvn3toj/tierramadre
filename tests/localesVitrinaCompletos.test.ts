/**
 * Los seis idiomas de la vitrina pública, completos.
 *
 * `Translations = typeof es` (`src/locales/index.ts:15`) ya hace que `tsc`
 * grite si a un locale le falta una clave. Pero `tsc` sólo prueba que la clave
 * EXISTE: `caption: ''` compila, y `caption: 'Selección para ti · {n} piezas'`
 * copiado tal cual dentro de `zh.ts` también. Las dos formas de estar
 * incompleto que más veces pasan una revisión son exactamente ésas — la cadena
 * vacía y el español olvidado — y ninguna la ve el compilador.
 *
 * Este test mira el contenido: que haya texto, que las frases con conteo
 * conserven su marcador `{n}` (sin él el cliente lee «Selección para ti ·
 * piezas»), y que el mensaje de WhatsApp conserve `{link}` — sin ese marcador
 * el mensaje sale sin el enlace, que es lo único que el mensaje existe para
 * llevar.
 *
 * No compara contra el español para detectar «sin traducir»: `pay` en
 * portugués ES «Pagar», igual que en español, y una regla así lo marcaría como
 * error para siempre. Lo que se prueba es la forma, no la diferencia.
 *
 * Desde 2026-09-09 cubre también `checkout` y `cart`: la hoja de pago y la
 * página post-pago. Ahí el costo de una clave vacía u olvidada es más alto que
 * en la vitrina — es el único formulario donde el cliente entrega su plata, y
 * `payButton` sin `{total}` deja un botón que dice «Pagar» sin decir cuánto.
 * Los marcadores viven en un solo mapa (`MARCADORES`) porque son un contrato
 * con los componentes que los interpolan: si una traducción pierde `{saleId}`,
 * el cliente que ya pagó se queda sin el número que necesita para reclamar.
 */
import { describe, it, expect } from 'vitest';
import { translations, LANGUAGE_OPTIONS } from '../src/locales';
import type { Language } from '../src/locales';

/** Toda clave de `vitrina` que debe existir, con texto, en los seis idiomas. */
const CLAVES_VITRINA = [
  'caption',
  'captionOne',
  'expiredTitle',
  'expiredBody',
  'expiredCta',
  'unavailableTitle',
  'unavailableBody',
  'back',
  'price',
  'consultWhatsApp',
  'pay',
  'addToSelection',
  'inSelection',
  'footerTagline',
] as const;

const CLAVES_VITRINA_SHARE = [
  'languageLabel',
  'shareTitle',
  'shareText',
  'shareTextOne',
  'whatsappMessage',
  'whatsappMessageOne',
] as const;

/** Toda clave de `checkout` que debe existir, con texto, en los seis idiomas. */
const CLAVES_CHECKOUT = [
  'title',
  'close',
  'empty',
  'totalLabel',
  'reservationNote',
  'phoneLabel',
  'phonePlaceholder',
  'nameLabel',
  'emailLabel',
  'payButton',
  'blockedUnpriced',
  'networkError',
  'msgGenerico',
  'msgBloqueadoEdge',
  'msgExito',
  'msgPedidoSinLink',
  'msgItemReserved',
  'msgProductUnavailable',
  'msgPrecioNoDisponible',
  'msgPrecioNoDisponibleSinSku',
  'msgZeroTotal',
  'msgOrigenInvalido',
  'pedidoConfirmingTitle',
  'pedidoConfirmingBody',
  'pedidoConfirmedTitle',
  'pedidoConfirmedBody',
  'pedidoLabel',
  'pedidoTotalLabel',
  'pedidoCancelledTitle',
  'pedidoCancelledBody',
  'pedidoNotFoundTitle',
  'pedidoNotFoundBody',
  'pedidoWhatsApp',
  'pedidoSlowLine',
  'pedidoWhatsAppCancelled',
  'pedidoWhatsAppNotFound',
  'pedidoWhatsAppSlow',
] as const;

/** Toda clave de `cart` que debe existir, con texto, en los seis idiomas. */
const CLAVES_CART = [
  'title',
  'piecesSelected',
  'pieceSelectedOne',
  'clear',
  'itemNumber',
  'certified',
  'remove',
  'withPrice',
  'totalToCharge',
  'unpricedLabel',
  'unpricedAction',
  'unpricedNotice',
  'multiplierLabel',
  'emptyTitle',
  'emptyCta',
  'exploreCollection',
  'inquiryTo',
  'sending',
  'sendWhatsApp',
  'sendHint',
  'noInviter',
  'sendFailed',
  'emptyError',
  'pay',
  'payHint',
  'shareDivider',
  'shareTitle',
  'shareHint',
] as const;

/** Frases que cuentan piezas: sin `{n}` el número desaparece del texto. */
const NECESITAN_N: Record<string, string[]> = {
  vitrina: ['caption'],
  vitrinaShare: ['shareText', 'whatsappMessage'],
};

/** El mensaje de WhatsApp existe para llevar el enlace. Sin `{link}`, no lo lleva. */
const NECESITAN_LINK = ['whatsappMessage', 'whatsappMessageOne'];

/**
 * Marcador → dónde tiene que sobrevivir, en los seis idiomas.
 *
 * Cada uno es un dato que el componente inyecta y que el cliente necesita
 * leer: el total que va a pagar, el SKU de la pieza que otro está pagando, el
 * número de pedido con el que reclama. Perder el marcador no deja un texto
 * feo: deja un texto sin el dato.
 */
const MARCADORES: Record<string, Record<string, readonly string[]>> = {
  '{minutes}': { checkout: ['reservationNote'] },
  '{total}': { checkout: ['payButton'] },
  '{sku}': { checkout: ['msgItemReserved', 'msgPrecioNoDisponible'] },
  '{pedido}': { checkout: ['msgPedidoSinLink'] },
  '{saleId}': {
    checkout: [
      'pedidoConfirmingBody',
      'pedidoCancelledBody',
      'pedidoSlowLine',
      'pedidoWhatsAppCancelled',
      'pedidoWhatsAppSlow',
    ],
  },
  '{n}': { cart: ['piecesSelected', 'withPrice', 'itemNumber'] },
  '{name}': { cart: ['inquiryTo', 'sendFailed'] },
  '{m}': { cart: ['multiplierLabel'] },
};

/** Lee `translations[code][seccion]` sin que un bloque ausente reviente. */
function seccionDe(code: Language, seccion: string): Record<string, unknown> {
  return (
    (
      translations[code] as unknown as Record<
        string,
        Record<string, unknown> | undefined
      >
    )[seccion] ?? {}
  );
}

/**
 * Exige texto real en cada clave. Nombra la clave en el mensaje a propósito:
 * un fallo que dice «falta `en.checkout.payButton`» se arregla solo; uno que
 * dice «undefined no es string» manda a alguien a leer 800 líneas de locale.
 */
function exigirTexto(
  code: Language,
  nombre: string,
  claves: readonly string[],
): void {
  const seccion = seccionDe(code, nombre);
  for (const clave of claves) {
    const valor = seccion[clave];
    expect(
      typeof valor,
      `${code}.${nombre}.${clave} falta o no es una cadena`,
    ).toBe('string');
    expect(
      (valor as string).trim().length,
      `${code}.${nombre}.${clave} está vacía`,
    ).toBeGreaterThan(0);
  }
}

const IDIOMAS = LANGUAGE_OPTIONS.map((o) => o.code);

describe('locales — la vitrina pública, completa en los seis idiomas', () => {
  it('los seis idiomas del picker son los seis del mapa de traducciones', () => {
    expect(IDIOMAS.slice().sort()).toEqual(
      ['en', 'es', 'fr', 'it', 'pt', 'zh'].sort(),
    );
    for (const code of IDIOMAS) {
      expect(translations[code]).toBeDefined();
    }
  });

  for (const code of ['es', 'en', 'fr', 'it', 'zh', 'pt'] as const) {
    describe(code, () => {
      it('tiene todas las claves de `vitrina`, con texto', () => {
        const seccion = translations[code].vitrina as unknown as Record<
          string,
          unknown
        >;
        expect(seccion).toBeDefined();
        for (const clave of CLAVES_VITRINA) {
          expect(
            typeof seccion[clave],
            `${code}.vitrina.${clave} no es una cadena`,
          ).toBe('string');
          expect(
            (seccion[clave] as string).trim().length,
            `${code}.vitrina.${clave} está vacía`,
          ).toBeGreaterThan(0);
        }
      });

      it('tiene todas las claves de `vitrinaShare`, con texto', () => {
        const seccion = translations[code].vitrinaShare as unknown as Record<
          string,
          unknown
        >;
        expect(seccion).toBeDefined();
        for (const clave of CLAVES_VITRINA_SHARE) {
          expect(
            typeof seccion[clave],
            `${code}.vitrinaShare.${clave} no es una cadena`,
          ).toBe('string');
          expect(
            (seccion[clave] as string).trim().length,
            `${code}.vitrinaShare.${clave} está vacía`,
          ).toBeGreaterThan(0);
        }
      });

      it('tiene todas las claves de `checkout`, con texto', () => {
        exigirTexto(code, 'checkout', CLAVES_CHECKOUT);
      });

      it('tiene todas las claves de `cart`, con texto', () => {
        exigirTexto(code, 'cart', CLAVES_CART);
      });

      it('conserva los marcadores de `checkout` y `cart`', () => {
        for (const [marcador, secciones] of Object.entries(MARCADORES)) {
          for (const [nombre, claves] of Object.entries(secciones)) {
            const seccion = seccionDe(code, nombre);
            for (const clave of claves) {
              expect(
                (seccion[clave] as string) ?? '',
                `${code}.${nombre}.${clave} perdió ${marcador}`,
              ).toContain(marcador);
            }
          }
        }
      });

      it('conserva los marcadores `{n}` y `{link}`', () => {
        for (const [seccionNombre, claves] of Object.entries(NECESITAN_N)) {
          const seccion = (
            translations[code] as unknown as Record<
              string,
              Record<string, string>
            >
          )[seccionNombre];
          for (const clave of claves) {
            expect(
              seccion[clave],
              `${code}.${seccionNombre}.${clave} perdió {n}`,
            ).toContain('{n}');
          }
        }
        const share = translations[code].vitrinaShare as unknown as Record<
          string,
          string
        >;
        for (const clave of NECESITAN_LINK) {
          expect(
            share[clave],
            `${code}.vitrinaShare.${clave} perdió {link}`,
          ).toContain('{link}');
        }
      });
    });
  }
});
