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
 */
import { describe, it, expect } from 'vitest';
import { translations, LANGUAGE_OPTIONS } from '../src/locales';

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

/** Frases que cuentan piezas: sin `{n}` el número desaparece del texto. */
const NECESITAN_N: Record<string, string[]> = {
  vitrina: ['caption'],
  vitrinaShare: ['shareText', 'whatsappMessage'],
};

/** El mensaje de WhatsApp existe para llevar el enlace. Sin `{link}`, no lo lleva. */
const NECESITAN_LINK = ['whatsappMessage', 'whatsappMessageOne'];

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
