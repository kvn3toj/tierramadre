/**
 * El panel del motor en W1 — lo que el operador ve ANTES de comprar.
 *
 * Estos tests fijan las tres cosas que la hoja nunca mostró a tiempo: el
 * equilibrio real (que la hoja directamente no calcula), la advertencia de que
 * el gasto fijo pesa más que la mercancía, y que un lote mixto NO muestra
 * precio en vez de mostrar uno inventado.
 */
import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import type { ReactElement } from 'react';
import { PreviewMotorCard } from './PreviewMotorCard';

function renderWithTheme(ui: ReactElement) {
  return render(<ThemeProvider theme={createTheme()}>{ui}</ThemeProvider>);
}

afterEach(cleanup);

/** El lote 10 con el fijo de la hoja: los números de la auditoría. */
const LOTE_10 = {
  disponible: true as const,
  costoFijoUnitarioCOP: 442_787,
  lotesActivos: 76,
  K: 1_383_809,
  cotizable: true,
  enRemate: false,
  pesoDelFijoPct: 31.99,
  advertencias: [],
  pisoCOP: 1_537_566,
  precioCOP: 2_306_348,
  regla: 'objetivo' as const,
  margenNetoPct: 30,
  multiplicador: 2.4748,
  precioSiFueraLaOtraCategoriaCOP: 3_374_412,
};

describe('PreviewMotorCard — los tres números', () => {
  it('muestra K, el equilibrio real y el precio objetivo', () => {
    renderWithTheme(<PreviewMotorCard preview={LOTE_10} />);
    expect(screen.getByTestId('preview-k').textContent).toContain('1.383.809');
    expect(screen.getByTestId('preview-piso').textContent).toContain(
      '1.537.566',
    );
    expect(screen.getByTestId('preview-precio').textContent).toContain(
      '2.306.348',
    );
  });

  it('llama al equilibrio por su nombre y dice que la hoja no lo calcula', () => {
    renderWithTheme(<PreviewMotorCard preview={LOTE_10} />);
    expect(screen.getByTestId('preview-piso').textContent).toMatch(
      /equilibrio real/i,
    );
  });

  it('marca el multiplicador como informativo', () => {
    renderWithTheme(<PreviewMotorCard preview={LOTE_10} />);
    const mult = screen.getByTestId('preview-multiplicador');
    expect(mult.textContent).toContain('2,47');
    expect(mult.textContent).toMatch(/informativ/i);
  });

  it('muestra el fijo vigente y de cuántos lotes salió', () => {
    renderWithTheme(<PreviewMotorCard preview={LOTE_10} />);
    const fijo = screen.getByTestId('preview-fijo');
    expect(fijo.textContent).toContain('442.787');
    expect(fijo.textContent).toContain('76');
  });
});

describe('PreviewMotorCard — las advertencias', () => {
  it('pinta la alerta de que el fijo pesa más que la pieza', () => {
    renderWithTheme(
      <PreviewMotorCard
        preview={{
          ...LOTE_10,
          advertencias: [
            {
              codigo: 'FIJO_PESA_MAS',
              nivel: 'alerta',
              texto: 'El gasto fijo pesa más que la mercancía.',
            },
          ],
        }}
      />,
    );
    const aviso = screen.getByTestId('advertencia-FIJO_PESA_MAS');
    expect(aviso.textContent).toContain('pesa más');
    expect(aviso.getAttribute('data-nivel')).toBe('alerta');
  });

  it('marca el fijo como pre-migración en la línea del número', () => {
    // El aviso completo va abajo, pero la marca tiene que estar PEGADA a la
    // cifra: quien mira el número de reojo no lee el párrafo.
    renderWithTheme(
      <PreviewMotorCard
        preview={{
          ...LOTE_10,
          costoFijoUnitarioCOP: 509_876,
          lotesActivos: 66,
          advertencias: [
            {
              codigo: 'DIVISOR_PRE_MIGRACION',
              nivel: 'alerta',
              texto: 'dev pre-migración: … $382.407 / 88 lotes del SOT …',
            },
          ],
        }}
      />,
    );
    expect(screen.getByTestId('preview-fijo').textContent).toMatch(
      /pre-migración/i,
    );
    expect(
      screen.getByTestId('advertencia-DIVISOR_PRE_MIGRACION').textContent,
    ).toContain('382.407');
  });

  it('sin el aviso, la línea del fijo no lleva marca', () => {
    renderWithTheme(<PreviewMotorCard preview={LOTE_10} />);
    expect(screen.getByTestId('preview-fijo').textContent).not.toMatch(
      /pre-migración/i,
    );
  });

  it('marca REMATE vigente cuando la regla es remate', () => {
    renderWithTheme(
      <PreviewMotorCard
        preview={{
          ...LOTE_10,
          enRemate: true,
          regla: 'remate',
          advertencias: [
            {
              codigo: 'REMATE_VIGENTE',
              nivel: 'info',
              texto: 'REMATE vigente hasta 2026-08-31.',
            },
          ],
        }}
      />,
    );
    expect(screen.getByTestId('preview-regla').textContent).toMatch(/remate/i);
    expect(
      screen.getByTestId('advertencia-REMATE_VIGENTE').textContent,
    ).toContain('2026-08-31');
  });
});

describe('PreviewMotorCard — el lote mixto no inventa precio', () => {
  it('muestra K pero no precio', () => {
    renderWithTheme(
      <PreviewMotorCard
        preview={{
          disponible: true,
          costoFijoUnitarioCOP: 442_787,
          lotesActivos: 76,
          K: 1_374_718,
          cotizable: false,
          enRemate: false,
          pesoDelFijoPct: 32.2,
          advertencias: [
            {
              codigo: 'MIXTA_SIN_PRECIO',
              nivel: 'info',
              texto: 'Lote mixto: el precio se resuelve casilla por casilla.',
            },
          ],
        }}
      />,
    );
    expect(screen.getByTestId('preview-k').textContent).toContain('1.374.718');
    expect(screen.queryByTestId('preview-precio')).toBeNull();
    expect(
      screen.getByTestId('advertencia-MIXTA_SIN_PRECIO').textContent,
    ).toMatch(/casilla por casilla/i);
  });
});

describe('PreviewMotorCard — lote sin costo capturado', () => {
  it('no muestra K ni precio, solo el aviso', () => {
    // C-085: mostrar un K que es puro gasto fijo sería mostrar estructura
    // disfrazada de costo de mercancía.
    renderWithTheme(
      <PreviewMotorCard
        preview={{
          disponible: true,
          costoFijoUnitarioCOP: 442_787,
          lotesActivos: 88,
          cotizable: false,
          enRemate: false,
          pesoDelFijoPct: 100,
          advertencias: [
            {
              codigo: 'SIN_COSTO_CAPTURADO',
              nivel: 'alerta',
              texto: 'Lote sin costo capturado: no se puede cotizar.',
            },
          ],
        }}
      />,
    );
    expect(screen.queryByTestId('preview-k')).toBeNull();
    expect(screen.queryByTestId('preview-precio')).toBeNull();
    expect(
      screen.getByTestId('advertencia-SIN_COSTO_CAPTURADO').textContent,
    ).toMatch(/sin costo capturado/i);
  });
});

describe('PreviewMotorCard — cuando el motor no puede responder', () => {
  it('explica por qué en vez de mostrar ceros', () => {
    // Un cero aquí sería indistinguible de «gratis» y es exactamente el defecto
    // E6=0 de la hoja, que cotizó todo el inventario sin absorber estructura.
    renderWithTheme(
      <PreviewMotorCard
        preview={{ disponible: false, motivo: 'no hay lotes activos' }}
      />,
    );
    expect(screen.getByTestId('preview-no-disponible').textContent).toContain(
      'no hay lotes activos',
    );
    expect(screen.queryByTestId('preview-precio')).toBeNull();
  });

  it('mientras carga no muestra números viejos', () => {
    renderWithTheme(<PreviewMotorCard preview={undefined} />);
    expect(screen.getByTestId('preview-cargando')).toBeTruthy();
    expect(screen.queryByTestId('preview-precio')).toBeNull();
  });
});
