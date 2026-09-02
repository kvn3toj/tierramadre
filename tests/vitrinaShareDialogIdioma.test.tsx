/**
 * VitrinaShareDialog — el idioma que elige el asesor viaja, y el mensaje sale
 * en ese idioma.
 *
 * Son dos cosas distintas y las dos se rompen por separado:
 *
 * 1. **El `lang` llega al servidor.** Si el select existe pero su valor no
 *    entra al body, la vitrina se graba en español y el cliente abre un enlace
 *    que no puede leer. Nada en la UI lo delataría: el diálogo se vería bien.
 * 2. **El mensaje que LLEVA el enlace sale en ese idioma.** Un enlace en inglés
 *    anunciado por un WhatsApp en español es exactamente el problema que esta
 *    rebanada existe para cerrar — el mensaje es lo primero que el cliente lee,
 *    antes que la página.
 *
 * Se afirma sobre el body real del `fetch` y sobre lo que recibió
 * `navigator.share`, no sobre el estado interno del componente.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  render,
  screen,
  cleanup,
  fireEvent,
  waitFor,
} from '@testing-library/react';
import { translations } from '../src/locales';

vi.mock('../src/contexts/GoogleAuthContext', () => ({
  useGoogleAuth: () => ({ signIn: vi.fn() }),
}));
vi.mock('../src/hooks/usePermissions', () => ({
  usePermissions: () => ({ canUseMultiplier: false }),
}));
vi.mock('../src/hooks/useTRM', () => ({
  useTRM: () => ({ trmRate: 4000, isLoading: false }),
}));
// Hay sesión fresca: el diálogo va directo al POST sin el rodeo de renovar
// la credencial de Google, que no es lo que se prueba acá.
vi.mock('../src/utils/sessionToken', () => ({
  readFreshSessionToken: () => 'tms1.fake-session-token',
  ensureAppSession: async () => undefined,
}));
vi.mock('@react-oauth/google', () => ({
  GoogleLogin: () => null,
  GoogleOAuthProvider: ({ children }: { children: React.ReactNode }) => (
    <>{children}</>
  ),
  useGoogleOneTapLogin: () => undefined,
}));
// El asesor tiene la app en español. Que el enlace salga en inglés tiene que
// venir de su elección en el select, no de heredar el idioma de la app — y
// así el caso positivo no se confunde con el default.
vi.mock('../src/contexts/LanguageContext', async () => {
  const { translations: tr } = await import('../src/locales');
  return {
    useLanguage: () => ({
      language: 'es' as const,
      t: tr.es,
      setLanguage: () => {},
      toggleLanguage: () => {},
    }),
  };
});

if (!window.matchMedia) {
  window.matchMedia = ((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  })) as unknown as typeof window.matchMedia;
}

import VitrinaShareDialog from '../src/components/vitrina/VitrinaShareDialog';

const items = [
  { item: 544, nombre: 'Viaje Estelar', precioCOP: 186_030_176 },
  { item: 546, nombre: 'Aurora', precioCOP: 92_000_000 },
];

/** Cuerpos de las peticiones a /api/vitrina, en orden. */
let bodies: Record<string, unknown>[] = [];
/** Lo que recibió `navigator.share`. */
let shared: { title?: string; text?: string; url?: string }[] = [];

beforeEach(() => {
  bodies = [];
  shared = [];
  globalThis.fetch = vi.fn(async (_url: unknown, init: unknown) => {
    const req = init as { body?: string };
    if (req?.body) bodies.push(JSON.parse(req.body));
    return new Response(JSON.stringify({ token: 'AB3K9P2Q4R7S' }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  }) as unknown as typeof fetch;

  Object.defineProperty(navigator, 'share', {
    configurable: true,
    writable: true,
    value: async (data: { title?: string; text?: string; url?: string }) => {
      shared.push(data);
    },
  });
});

afterEach(() => {
  cleanup();
  // @ts-expect-error — se saca el stub para no filtrarlo a otros archivos
  delete navigator.share;
});

/** Abre el select de idioma y elige la opción cuyo nombre calce. */
function elegirIdioma(nombre: RegExp) {
  const select = screen.getByRole('combobox');
  fireEvent.mouseDown(select);
  fireEvent.click(screen.getByRole('option', { name: nombre }));
}

describe('VitrinaShareDialog — el idioma del cliente', () => {
  it('el select arranca en el idioma de la app del asesor', () => {
    render(<VitrinaShareDialog open onClose={() => {}} items={items} />);
    expect(screen.getByRole('combobox').textContent).toMatch(/Español/);
  });

  it('ofrece los seis idiomas, con bandera y nombre', () => {
    render(<VitrinaShareDialog open onClose={() => {}} items={items} />);
    fireEvent.mouseDown(screen.getByRole('combobox'));
    const opciones = screen.getAllByRole('option').map((o) => o.textContent);
    expect(opciones).toHaveLength(6);
    for (const esperado of [
      /Español/,
      /English/,
      /Français/,
      /Italiano/,
      /中文/,
      /Português/,
    ]) {
      expect(opciones.some((o) => esperado.test(o ?? ''))).toBe(true);
    }
  });

  it('el `lang` elegido viaja en el body del POST', async () => {
    render(<VitrinaShareDialog open onClose={() => {}} items={items} />);
    elegirIdioma(/English/);
    fireEvent.click(screen.getByRole('button', { name: /Generar enlace/ }));

    await waitFor(() => expect(bodies).toHaveLength(1));
    expect(bodies[0].lang).toBe('en');
    // Lo que ya viajaba sigue viajando — el idioma se suma, no reemplaza.
    expect(bodies[0].itemIds).toEqual([544, 546]);
    expect(bodies[0].currency).toBe('COP');
  });

  it('sin tocar el select viaja el idioma de la app — control negativo', async () => {
    render(<VitrinaShareDialog open onClose={() => {}} items={items} />);
    fireEvent.click(screen.getByRole('button', { name: /Generar enlace/ }));

    await waitFor(() => expect(bodies).toHaveLength(1));
    expect(bodies[0].lang).toBe('es');
  });

  it('el texto de `navigator.share` sale en el idioma elegido, con el conteo', async () => {
    render(<VitrinaShareDialog open onClose={() => {}} items={items} />);
    elegirIdioma(/English/);
    fireEvent.click(screen.getByRole('button', { name: /Generar enlace/ }));

    await waitFor(() => expect(shared).toHaveLength(1));
    expect(shared[0].title).toBe(translations.en.vitrinaShare.shareTitle);
    expect(shared[0].text).toBe(
      translations.en.vitrinaShare.shareText.replace('{n}', '2'),
    );
    // El enlace NO cambia con el idioma.
    expect(shared[0].url).toBe('https://tierramadre.app/v/AB3K9P2Q4R7S');
  });

  it('en español el texto es el español — control negativo del mensaje', async () => {
    render(<VitrinaShareDialog open onClose={() => {}} items={items} />);
    fireEvent.click(screen.getByRole('button', { name: /Generar enlace/ }));

    await waitFor(() => expect(shared).toHaveLength(1));
    expect(shared[0].text).toBe(
      translations.es.vitrinaShare.shareText.replace('{n}', '2'),
    );
    expect(shared[0].text).not.toBe(
      translations.en.vitrinaShare.shareText.replace('{n}', '2'),
    );
  });

  it('con una sola pieza usa la frase en singular', async () => {
    render(<VitrinaShareDialog open onClose={() => {}} items={[items[0]]} />);
    elegirIdioma(/English/);
    fireEvent.click(screen.getByRole('button', { name: /Generar enlace/ }));

    await waitFor(() => expect(shared).toHaveLength(1));
    expect(shared[0].text).toBe(translations.en.vitrinaShare.shareTextOne);
  });

  it('el botón de WhatsApp manda el mensaje completo, no sólo el enlace', async () => {
    const abiertas: string[] = [];
    window.open = ((url: string) => {
      abiertas.push(url);
      return null;
    }) as unknown as typeof window.open;

    render(<VitrinaShareDialog open onClose={() => {}} items={items} />);
    elegirIdioma(/English/);
    fireEvent.click(screen.getByRole('button', { name: /Generar enlace/ }));

    await waitFor(() =>
      expect(screen.queryByRole('button', { name: /WhatsApp/ })).toBeTruthy(),
    );
    fireEvent.click(screen.getByRole('button', { name: /WhatsApp/ }));

    expect(abiertas).toHaveLength(1);
    const texto = decodeURIComponent(
      abiertas[0].replace('https://wa.me/?text=', ''),
    );
    expect(texto).toBe(
      translations.en.vitrinaShare.whatsappMessage
        .replace('{n}', '2')
        .replace('{link}', 'https://tierramadre.app/v/AB3K9P2Q4R7S'),
    );
    // El enlace sigue adentro: el mensaje existe para llevarlo.
    expect(texto).toContain('https://tierramadre.app/v/AB3K9P2Q4R7S');
  });

  it('el `lang` también viaja en el PATCH que corrige un enlace ya enviado', async () => {
    render(<VitrinaShareDialog open onClose={() => {}} items={items} />);
    fireEvent.click(
      screen.getByRole('button', { name: /Corrigiendo un enlace ya enviado/ }),
    );
    fireEvent.change(
      screen.getByLabelText(/Enlace o código enviado al cliente/),
      { target: { value: 'https://tierramadre.app/v/AB3K9P2Q4R7S' } },
    );
    elegirIdioma(/Français/);
    fireEvent.click(screen.getByRole('button', { name: /Actualizar enlace/ }));

    await waitFor(() => expect(bodies).toHaveLength(1));
    expect(bodies[0].lang).toBe('fr');
    expect(bodies[0].token).toBe('AB3K9P2Q4R7S');
  });
});
