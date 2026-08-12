/**
 * PrecioEspecialBadge — el contrato mínimo del indicador de precio temporal.
 *
 * Lo que se fija aquí:
 *   1. Sin `precioEspecial` NO se pinta nada. Es la mitad importante: el campo
 *      llega ausente cuando la promoción venció, y un badge fantasma sería una
 *      promesa de precio que la casa ya no sostiene.
 *   2. Con el campo presente, la vigencia se DERIVA de `hasta` y se lee en
 *      español ("31 de agosto"), nunca hardcodeada.
 *   3. La variante compacta (tarjeta del grid) recorta el texto visible pero
 *      conserva el nombre accesible completo — el indicador no puede depender
 *      solo del color ni del espacio disponible.
 */

import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import type { ReactElement } from 'react';

import PrecioEspecialBadge from './PrecioEspecialBadge';
import type { PrecioEspecial } from '../../types';

const promo: PrecioEspecial = {
  etiqueta: 'Precio especial por cierre de temporada',
  hasta: '2026-08-31',
};

function renderWithTheme(ui: ReactElement) {
  return render(<ThemeProvider theme={createTheme()}>{ui}</ThemeProvider>);
}

afterEach(cleanup);

describe('PrecioEspecialBadge', () => {
  it('no renderiza nada cuando no hay promoción vigente', () => {
    const { container } = renderWithTheme(
      <PrecioEspecialBadge precioEspecial={undefined} />,
    );
    expect(container.firstChild).toBeNull();
  });

  it('muestra la etiqueta del dato y la vigencia legible en español', () => {
    renderWithTheme(<PrecioEspecialBadge precioEspecial={promo} />);

    expect(screen.getByText(promo.etiqueta)).toBeTruthy();
    // Derivada de `hasta`, no escrita a mano.
    expect(screen.getByText(/vigente hasta el 31 de agosto/i)).toBeTruthy();
  });

  it('compacta el texto visible pero conserva el nombre accesible completo', () => {
    renderWithTheme(<PrecioEspecialBadge precioEspecial={promo} compact />);

    // Visible en la tarjeta: la versión corta.
    expect(screen.getByText('Precio especial')).toBeTruthy();
    // Para lector de pantalla / hover: el motivo Y el vencimiento.
    expect(
      screen.getByRole('img', {
        name: `${promo.etiqueta}, hasta el 31 de agosto`,
      }),
    ).toBeTruthy();
  });
});
