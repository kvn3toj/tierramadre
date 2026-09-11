/**
 * CheckoutSheet — la última pantalla antes de que se mueva dinero real.
 *
 * Cuatro cosas que se rompen por separado y cada una le cuesta una venta:
 *
 * 1. **El bloqueo por pieza sin precio bloquea la hoja ENTERA.** Ni total, ni
 *    campos, ni botón: soltar en silencio la pieza sin precio sería cobrarle
 *    al cliente algo distinto de lo que puso en su carrito.
 * 2. **El idioma es el del ENLACE, no el del visitante.** La hoja recibe
 *    `lang` como prop y no consulta `LanguageContext` a propósito — una
 *    vitrina en inglés se abre con el contexto en español.
 * 3. **La nota de reserva.** El servidor aparta la piedra 30 minutos
 *    (`RESERVA_TTL_MS`); si la hoja no lo dice, el cliente que abandona el
 *    pago no sabe por qué "su" piedra sigue bloqueada.
 * 4. **El botón NO se re-habilita durante la redirección a Wompi.** El
 *    `finally` que apaga `enviando` corre después de asignar
 *    `window.location.href`, y en ese hueco —la pestaña todavía viva— un
 *    segundo clic manda una segunda orden.
 *
 * `Sheet` (DS3) monta un `Dialog` de MUI cuando `matchMedia.matches` es
 * `false`, que es lo que deja el polyfill de abajo: por eso todo se consulta
 * con `screen` y no con el contenedor del render.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  render,
  screen,
  cleanup,
  fireEvent,
  waitFor,
} from '@testing-library/react';
import { translations, type Translations } from '../src/locales';
import { formatCurrency } from '../src/utils/formatting';
import { SESSION_KEYS } from '../src/constants/storage-keys';
import { RESERVA_TTL_MS } from '../convex/_lib/reservas';

vi.mock('../src/contexts/ThemeContext', () => ({
  useThemeMode: () => ({ mode: 'light' }),
}));

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

import CheckoutSheet, {
  type CheckoutPieza,
} from '../src/components/checkout/CheckoutSheet';

const tcEs = translations.es.checkout;
const tcEn = translations.en.checkout;

const PRECIO = 4_200_000;
const TOTAL_FMT = formatCurrency(PRECIO, 'COP');

const CON_PRECIO: CheckoutPieza[] = [
  {
    sku: 'C-090',
    nombre: 'Viaje Estelar',
    precioCOP: PRECIO,
    precioMostrado: 'US$ 1,050',
  },
];

const CON_UNA_SIN_PRECIO: CheckoutPieza[] = [
  ...CON_PRECIO,
  {
    sku: 'C-091',
    nombre: 'Aurora',
    precioCOP: 0,
    precioMostrado: 'Consultar precio',
  },
];

/**
 * El botón de pago por su etiqueta traducida, sin depender del nombre
 * accesible (el total lleva espacios duros que la normalización de nombres
 * colapsa).
 */
function botonPago(
  tc: Translations['checkout'],
): HTMLButtonElement | undefined {
  const prefijo = tc.payButton.split('{total}')[0].trim();
  return screen
    .queryAllByRole('button')
    .find((b) => (b.textContent ?? '').trim().startsWith(prefijo)) as
    | HTMLButtonElement
    | undefined;
}

function respuesta(status: number, body: unknown) {
  return { status, json: async () => body };
}

const locationOriginal = window.location;

beforeEach(() => {
  sessionStorage.clear();
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  Object.defineProperty(window, 'location', {
    configurable: true,
    writable: true,
    value: locationOriginal,
  });
});

describe('CheckoutSheet', () => {
  it('una pieza sin precio bloquea la hoja entera', () => {
    render(
      <CheckoutSheet open piezas={CON_UNA_SIN_PRECIO} onClose={() => {}} />,
    );

    expect(screen.getByRole('alert').textContent).toContain(
      tcEs.blockedUnpriced,
    );
    expect(screen.queryByLabelText(tcEs.phoneLabel)).toBeNull();
    expect(botonPago(tcEs)).toBeUndefined();
  });

  it('sin celular el botón está deshabilitado; escribirlo lo habilita y la etiqueta trae el total', () => {
    render(<CheckoutSheet open piezas={CON_PRECIO} onClose={() => {}} />);

    expect(botonPago(tcEs)?.disabled).toBe(true);

    fireEvent.change(screen.getByLabelText(tcEs.phoneLabel), {
      target: { value: '+57 300 123 4567' },
    });

    const boton = botonPago(tcEs);
    expect(boton?.disabled).toBe(false);
    expect(boton?.textContent).toContain(TOTAL_FMT);
  });

  it('dice cuántos minutos queda apartada la pieza', () => {
    render(<CheckoutSheet open piezas={CON_PRECIO} onClose={() => {}} />);

    const minutos = String(Math.round(RESERVA_TTL_MS / 60000));
    expect(minutos).toBe('30');
    const nota = tcEs.reservationNote.replace('{minutes}', minutos);
    expect(screen.getByText(nota)).toBeTruthy();
    expect(nota).toContain('30');
  });

  it('con lang="en" el título y las etiquetas están en inglés', () => {
    render(
      <CheckoutSheet open piezas={CON_PRECIO} lang="en" onClose={() => {}} />,
    );

    expect(screen.getByRole('heading', { name: tcEn.title })).toBeTruthy();
    expect(screen.getByLabelText(tcEn.phoneLabel)).toBeTruthy();
    expect(screen.getByLabelText(tcEn.nameLabel)).toBeTruthy();
    expect(screen.getByLabelText(tcEn.emailLabel)).toBeTruthy();
    expect(screen.getByText(tcEn.totalLabel)).toBeTruthy();
    expect(screen.queryByText(tcEs.totalLabel)).toBeNull();
  });

  it('durante la redirección a Wompi el botón NO vuelve a habilitarse, y el idioma queda guardado', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () =>
        respuesta(201, {
          success: true,
          data: { checkout_url: 'https://checkout.wompi.co/p/?x' },
        }),
      ),
    );
    Object.defineProperty(window, 'location', {
      configurable: true,
      writable: true,
      value: { href: '' },
    });

    render(<CheckoutSheet open piezas={CON_PRECIO} onClose={() => {}} />);
    fireEvent.change(screen.getByLabelText(tcEs.phoneLabel), {
      target: { value: '3001234567' },
    });
    fireEvent.click(botonPago(tcEs)!);

    await waitFor(() => {
      expect((window.location as unknown as { href: string }).href).toBe(
        'https://checkout.wompi.co/p/?x',
      );
    });

    const boton = botonPago(tcEs);
    expect(boton?.disabled).toBe(true);
    expect(boton?.querySelector('.MuiCircularProgress-root')).toBeTruthy();
    expect(sessionStorage.getItem(SESSION_KEYS.CHECKOUT_LANG)).toBe('es');
  });

  it('ITEM_RESERVED con sku se muestra traducido y nombrando la pieza', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () =>
        respuesta(409, { error: 'ITEM_RESERVED', sku: 'C-090' }),
      ),
    );

    render(
      <CheckoutSheet open piezas={CON_PRECIO} lang="en" onClose={() => {}} />,
    );
    fireEvent.change(screen.getByLabelText(tcEn.phoneLabel), {
      target: { value: '3001234567' },
    });
    fireEvent.click(botonPago(tcEn)!);

    const esperado = tcEn.msgItemReserved.replace('{sku}', 'C-090');
    await waitFor(() => {
      expect(screen.getByRole('alert').textContent).toContain(esperado);
    });
    expect(screen.getByRole('alert').textContent).toContain('C-090');
  });
});
