/**
 * Sheet conversion coverage — DS3 Slice 6.
 *
 * These dialogs are gated behind `isProfileOwner` (or a hardcoded
 * collection-slug map), so they are unreachable in a browser without a
 * specific identity. That is exactly why their conversion to the canonical
 * `Sheet` shipped without runtime verification.
 *
 * Rendering them directly with props sidesteps the auth gate entirely and
 * pins the behaviours `Sheet` is responsible for — focus restore on close and
 * Escape dismissal — plus, for the override form, that its validation moved
 * across the conversion unchanged.
 *
 * Uses fireEvent rather than user-event: the latter is not a dependency of
 * this repo and these assertions do not need its higher-fidelity input
 * simulation.
 */

import { useState } from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  render,
  screen,
  cleanup,
  waitFor,
  fireEvent,
} from '@testing-library/react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import type { ReactElement } from 'react';

import { EditProductOverrideDialog } from '../EditProductOverrideDialog';
import { CotizacionPreviewDialog } from '../CotizacionPreviewDialog';
import type { TreasureItem } from '../../../../../types';

// -----------------------------------------------------------------------------
// Fixtures
// -----------------------------------------------------------------------------

const BASE_PRICE = 1_000_000;

const product = {
  item: 42,
  fechaIngreso: '2026-01-01',
  nombre: 'Turquesa',
  peso: 0.66,
  color: 'Verde Natural',
  calidad: 'COMERCIAL ESTÁNDAR',
  cantidad: 1,
  talla: 'Esmeralda',
  medidas: '5x4',
  precioCOP: BASE_PRICE,
} as unknown as TreasureItem;

function renderWithTheme(ui: ReactElement) {
  return render(<ThemeProvider theme={createTheme()}>{ui}</ThemeProvider>);
}

/** Type into a controlled MUI input. */
function setValue(input: HTMLElement, value: string) {
  fireEvent.change(input, { target: { value } });
}

beforeEach(() => {
  // jsdom has no matchMedia; Sheet uses useMediaQuery to choose Drawer (mobile)
  // vs Dialog (desktop). Reporting "no match" selects the desktop branch.
  vi.stubGlobal(
    'matchMedia',
    vi.fn().mockImplementation((query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  );
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

// -----------------------------------------------------------------------------
// EditProductOverrideDialog
// -----------------------------------------------------------------------------

describe('EditProductOverrideDialog (Sheet)', () => {
  function makeProps(overrides: Record<string, unknown> = {}) {
    return {
      open: true,
      product,
      currentOverride: undefined,
      onClose: vi.fn(),
      onSave: vi.fn(),
      onClear: vi.fn(),
      ...overrides,
    };
  }

  it('dismisses on Escape', async () => {
    const onClose = vi.fn();
    renderWithTheme(<EditProductOverrideDialog {...makeProps({ onClose })} />);

    const dialog = await screen.findByRole('dialog');
    fireEvent.keyDown(dialog, { key: 'Escape', code: 'Escape' });

    await waitFor(() => expect(onClose).toHaveBeenCalled());
  });

  it('returns focus to the invoking element when closed (WCAG 2.4.3)', async () => {
    function Harness() {
      const [open, setOpen] = useState(false);
      return (
        <>
          <button type="button" onClick={() => setOpen(true)}>
            abrir
          </button>
          <EditProductOverrideDialog
            {...makeProps({ open, onClose: () => setOpen(false) })}
          />
        </>
      );
    }

    renderWithTheme(<Harness />);
    const invoker = screen.getByRole('button', { name: 'abrir' });

    invoker.focus();
    fireEvent.click(invoker);

    const dialog = await screen.findByRole('dialog');
    fireEvent.keyDown(dialog, { key: 'Escape', code: 'Escape' });

    // Focus must come back to what opened the sheet, not the top of the page.
    // This is the behaviour Sheet exists to provide, and the reason the
    // hand-rolled predecessors were replaced.
    await waitFor(() => expect(document.activeElement).toBe(invoker));
  });

  it('blocks saving a price below the base (validation survived the conversion)', async () => {
    const onSave = vi.fn();
    renderWithTheme(<EditProductOverrideDialog {...makeProps({ onSave })} />);

    const price = screen.getByLabelText(/precio personalizado/i);
    setValue(price, String(BASE_PRICE - 1));

    // The message comes from validateOverride(), which the conversion moved
    // verbatim — if the chrome swap broke that wiring, this is what fails.
    expect(await screen.findByText(/no puede ser menor al base/i)).toBeTruthy();

    // Assert the field is actually MARKED invalid, not just accompanied by
    // text. helperText renders independently of the `error` prop, so without
    // this a severed error={...} would slip through silently — and a screen
    // reader would never learn the field is in error.
    await waitFor(() =>
      expect(price.getAttribute('aria-invalid')).toBe('true'),
    );

    const save = screen.getByRole('button', { name: /guardar/i });
    expect(save.hasAttribute('disabled')).toBe(true);

    fireEvent.click(save);
    expect(onSave).not.toHaveBeenCalled();
  });

  it('re-enables saving once the price is back in range', async () => {
    renderWithTheme(<EditProductOverrideDialog {...makeProps()} />);

    const price = screen.getByLabelText(/precio personalizado/i);
    setValue(price, String(BASE_PRICE - 1));
    await screen.findByText(/no puede ser menor al base/i);

    setValue(price, String(BASE_PRICE * 2));

    await waitFor(() =>
      expect(screen.queryByText(/no puede ser menor al base/i)).toBeNull(),
    );
    await waitFor(() =>
      expect(
        screen
          .getByRole('button', { name: /guardar/i })
          .hasAttribute('disabled'),
      ).toBe(false),
    );
  });

  it('rejects a price above 10x the base', async () => {
    renderWithTheme(<EditProductOverrideDialog {...makeProps()} />);

    setValue(
      screen.getByLabelText(/precio personalizado/i),
      String(BASE_PRICE * 11),
    );

    expect(await screen.findByText(/no puede ser mayor a 10x/i)).toBeTruthy();
  });
});

// -----------------------------------------------------------------------------
// CotizacionPreviewDialog
// -----------------------------------------------------------------------------

describe('CotizacionPreviewDialog (Sheet)', () => {
  const cotizacion = {
    id: 'c1',
    quotationNumber: 'TM-2026-0001',
    clientName: 'Cliente',
    imageUrl: 'https://example.test/cotizacion.png',
    total: 500000,
    productsCount: 2,
    createdAt: new Date('2026-01-01').toISOString(),
  } as never;

  it('renders nothing until a cotización is supplied', () => {
    renderWithTheme(
      <CotizacionPreviewDialog cotizacion={null} onClose={vi.fn()} />,
    );
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('opens as a dialog and dismisses on Escape', async () => {
    const onClose = vi.fn();
    renderWithTheme(
      <CotizacionPreviewDialog cotizacion={cotizacion} onClose={onClose} />,
    );

    const dialog = await screen.findByRole('dialog');
    fireEvent.keyDown(dialog, { key: 'Escape', code: 'Escape' });

    await waitFor(() => expect(onClose).toHaveBeenCalled());
  });

  it('exposes a labelled close control', async () => {
    const onClose = vi.fn();
    renderWithTheme(
      <CotizacionPreviewDialog cotizacion={cotizacion} onClose={onClose} />,
    );

    // The close button is on-photo chrome; it must still be reachable by name
    // rather than being an unlabelled icon.
    const close = await screen.findByRole('button', { name: /cerrar/i });
    fireEvent.click(close);
    expect(onClose).toHaveBeenCalled();
  });
});
