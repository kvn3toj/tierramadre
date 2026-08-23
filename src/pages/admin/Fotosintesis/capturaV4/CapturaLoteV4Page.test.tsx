/**
 * W1 en pantalla — los dos comportamientos que definen el wizard.
 *
 *  1. La categoría fiscal es el PRIMER campo y bloquea el resto. Es el gate de
 *     la regla dura §4.1: sin ella no hay divisor, y su ausencia en la hoja
 *     (columna vacía en 102 filas) es lo que dejó 60 de 63 lotes mal cotizados.
 *  2. El motor cotiza mientras se escribe, con sus advertencias.
 */
import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import {
  render,
  screen,
  cleanup,
  fireEvent,
  waitFor,
} from '@testing-library/react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { MemoryRouter } from 'react-router-dom';

const previewMock = vi.hoisted(() => ({ current: undefined as unknown }));

vi.mock('../../../../lib/convex-safe', () => ({
  convexReady: false,
  convexApi: {
    providers: { list: 'providers.list' },
    precios: { previewLote: 'precios.previewLote' },
    lotsV4: { create: 'lotsV4.create' },
  },
  useConvexQuery: () => [
    { _id: 'p1', nombreORazonSocial: 'Minas del Chivor', tipo: 'gemas' },
  ],
  useConvexMutation: () => async () => ({}),
  useConvexAction: () => async () => ({}),
  // El preview dejó de ser query reactiva: ahora es una action gateada por rol,
  // así que el mock tiene que distinguir cuál action le están pidiendo.
  useAuthedConvexAction: (ref: string) =>
    ref === 'precios.previewLote'
      ? async () => previewMock.current
      : async () => ({ loteId: 'B-009', casillas: [] }),
}));

vi.mock('../../../../contexts/NotificationContext', () => ({
  useNotification: () => ({ notify: vi.fn(), confirmAction: async () => true }),
}));

vi.mock('../../../../contexts/GoogleAuthContext', () => ({
  useGoogleAuth: () => ({ user: { name: 'Kevin' } }),
}));

import CapturaLoteV4Page from '../CapturaLoteV4Page';

function renderPage() {
  return render(
    <ThemeProvider theme={createTheme()}>
      <MemoryRouter>
        <CapturaLoteV4Page />
      </MemoryRouter>
    </ThemeProvider>,
  );
}

beforeEach(() => {
  previewMock.current = undefined;
});
afterEach(cleanup);

describe('la categoría fiscal es el gate', () => {
  it('arranca bloqueando el resto del formulario', () => {
    renderPage();
    expect(screen.getByTestId('paso-categoria')).toBeTruthy();
    expect(screen.getByTestId('bloqueado-sin-categoria')).toBeTruthy();
    expect(screen.queryByTestId('guardar-lote')).toBeNull();
  });

  it('ofrece las tres categorías, incluida mixta', () => {
    renderPage();
    expect(screen.getByLabelText('Gema suelta')).toBeTruthy();
    expect(screen.getByLabelText('Joya')).toBeTruthy();
    expect(screen.getByLabelText('Mixta')).toBeTruthy();
  });

  it('al elegirla se abre el resto de la captura', () => {
    renderPage();
    fireEvent.click(screen.getByLabelText('Gema suelta'));
    expect(screen.queryByTestId('bloqueado-sin-categoria')).toBeNull();
    expect(screen.getByTestId('guardar-lote')).toBeTruthy();
  });

  it('explica el régimen fiscal vigente: gema y joya pagan IVA (÷0,41)', () => {
    // Desde la regla de agosto 2026 (ivaGemaPct: 0.19) la categoría ya no
    // mueve el divisor — el viejo aviso del «46%» describía la asimetría
    // gema-sin-IVA que la corrección legal del 2026-08-20 eliminó.
    renderPage();
    expect(screen.getByTestId('paso-categoria').textContent).toContain('÷0,41');
  });
});

describe('los bloques condicionales', () => {
  it('una gema NO muestra el bloque joya', () => {
    renderPage();
    fireEvent.click(screen.getByLabelText('Gema suelta'));
    expect(screen.queryByTestId('bloque-joya')).toBeNull();
  });

  it('una joya lo muestra y lo marca obligatorio', () => {
    renderPage();
    fireEvent.click(screen.getByLabelText('Joya'));
    const bloque = screen.getByTestId('bloque-joya');
    expect(bloque.textContent).toMatch(/obligatorio/i);
  });

  it('un lote mixto lo muestra como opcional', () => {
    renderPage();
    fireEvent.click(screen.getByLabelText('Mixta'));
    expect(screen.getByTestId('bloque-joya').textContent).toMatch(/opcional/i);
  });

  it('el crédito abre vencimiento y cuotas', () => {
    renderPage();
    fireEvent.click(screen.getByLabelText('Gema suelta'));
    expect(screen.queryByTestId('bloque-credito')).toBeNull();
    fireEvent.click(screen.getByLabelText('Crédito'));
    expect(screen.getByTestId('bloque-credito')).toBeTruthy();
  });
});

describe('el preview del motor', () => {
  it('sin costo todavía no cotiza', () => {
    renderPage();
    fireEvent.click(screen.getByLabelText('Gema suelta'));
    expect(screen.getByTestId('preview-cargando')).toBeTruthy();
    expect(screen.queryByTestId('preview-precio')).toBeNull();
  });

  it('con los datos completos muestra K, equilibrio y objetivo', async () => {
    previewMock.current = {
      disponible: true,
      costoFijoUnitarioCOP: 442_787,
      lotesActivos: 76,
      K: 1_383_809,
      cotizable: true,
      enRemate: false,
      pesoDelFijoPct: 32,
      advertencias: [],
      pisoCOP: 1_537_566,
      precioCOP: 2_306_348,
      regla: 'objetivo',
      margenNetoPct: 30,
      multiplicador: 2.47,
    };
    renderPage();
    fireEvent.click(screen.getByLabelText('Gema suelta'));
    fireEvent.change(screen.getByLabelText('Costo de compra del lote en COP'), {
      target: { value: '931931' },
    });
    // 350ms de debounce + la resolución de la action.
    await waitFor(() =>
      expect(screen.getByTestId('preview-precio').textContent).toContain(
        '2.306.348',
      ),
    );
    expect(screen.getByTestId('preview-piso').textContent).toContain(
      '1.537.566',
    );
  });

  it('muestra la alerta de que el fijo pesa más que la pieza', async () => {
    previewMock.current = {
      disponible: true,
      costoFijoUnitarioCOP: 442_787,
      lotesActivos: 76,
      K: 742_787,
      cotizable: true,
      enRemate: false,
      pesoDelFijoPct: 59.6,
      advertencias: [
        {
          codigo: 'FIJO_PESA_MAS',
          nivel: 'alerta',
          texto: 'El gasto fijo pesa más que la mercancía.',
        },
      ],
      pisoCOP: 825_319,
      precioCOP: 1_237_978,
      regla: 'objetivo',
      margenNetoPct: 30,
      multiplicador: 4.13,
    };
    renderPage();
    fireEvent.click(screen.getByLabelText('Gema suelta'));
    fireEvent.change(screen.getByLabelText('Costo de compra del lote en COP'), {
      target: { value: '300000' },
    });
    await waitFor(() =>
      expect(screen.getByTestId('advertencia-FIJO_PESA_MAS')).toBeTruthy(),
    );
  });
});

describe('el botón dice lo que va a pasar', () => {
  it('anuncia cuántas casillas va a crear, no «guardar»', () => {
    // Guardar W1 no captura piezas: crea casillas. El botón lo dice para que
    // nadie espere haber terminado la captura.
    renderPage();
    fireEvent.click(screen.getByLabelText('Gema suelta'));
    fireEvent.change(screen.getByLabelText('Unidades declaradas del lote'), {
      target: { value: '4' },
    });
    expect(screen.getByTestId('guardar-lote').textContent).toMatch(
      /4 casillas/i,
    );
  });
});
