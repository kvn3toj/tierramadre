/**
 * VitrinaSelectionBar — la barra inferior del modo selección.
 *
 * Lo que se fija acá:
 *
 *   1. **Oculta significa oculta para el lector de pantalla también.** La barra
 *      está SIEMPRE montada (para que la salida se anime en la última
 *      deselección), así que sin `aria-hidden` un lector encontraría tres
 *      botones fantasma en cada pantalla del catálogo.
 *
 *   2. **Singular y plural.** "1 piezas seleccionadas" es la clase de detalle
 *      que le dice a un cliente que el software se hizo con prisa.
 *
 *   3. **Compartir se DESHABILITA en cero, nunca se oculta.** Un botón que
 *      aparece y desaparece mueve los otros dos bajo el dedo.
 *
 *   4. **En el tope el conteo cambia de forma.** "50 / 50 piezas" dice que hay
 *      un techo; "50 piezas seleccionadas" no dice nada.
 */
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';

vi.mock('../../../contexts/ThemeContext', () => ({
  useThemeMode: () => ({ mode: 'light' }),
}));

const { default: VitrinaSelectionBar } = await import('./VitrinaSelectionBar');

const noop = () => {};
const base = {
  visible: true,
  count: 3,
  max: 50,
  atCap: false,
  onShare: noop,
  onClear: noop,
  onDone: noop,
};

afterEach(cleanup);

describe('VitrinaSelectionBar', () => {
  it('oculta, se marca aria-hidden — sigue montada para animar la salida', () => {
    const { container } = render(
      <VitrinaSelectionBar {...base} visible={false} />,
    );
    const region = container.querySelector('[role="region"]');
    expect(region?.getAttribute('aria-hidden')).toBe('true');
  });

  it('visible, NO está aria-hidden y lleva su etiqueta de región', () => {
    render(<VitrinaSelectionBar {...base} />);
    const region = screen.getByRole('region', {
      name: 'Piezas seleccionadas para compartir',
    });
    expect(region.getAttribute('aria-hidden')).toBe('false');
  });

  it('usa el singular con una pieza', () => {
    render(<VitrinaSelectionBar {...base} count={1} />);
    expect(screen.getByText('1 pieza seleccionada')).toBeTruthy();
  });

  it('usa el plural con varias', () => {
    render(<VitrinaSelectionBar {...base} count={3} />);
    expect(screen.getByText('3 piezas seleccionadas')).toBeTruthy();
  });

  it('en el tope el conteo dice que HAY un techo', () => {
    render(<VitrinaSelectionBar {...base} count={50} atCap />);
    expect(screen.getByText('50 / 50 piezas')).toBeTruthy();
  });

  it('Compartir se deshabilita en cero pero SIGUE presente', () => {
    render(<VitrinaSelectionBar {...base} count={0} />);
    const compartir = screen.getByRole('button', { name: /Compartir/i });
    expect(compartir).toBeTruthy();
    expect((compartir as HTMLButtonElement).disabled).toBe(true);
  });

  it('con piezas, Compartir queda habilitado y llama a su acción', () => {
    const onShare = vi.fn();
    render(<VitrinaSelectionBar {...base} onShare={onShare} />);
    fireEvent.click(screen.getByRole('button', { name: /Compartir/i }));
    expect(onShare).toHaveBeenCalledTimes(1);
  });

  it('Limpiar y Listo llaman a lo suyo, y son cosas distintas', () => {
    const onClear = vi.fn();
    const onDone = vi.fn();
    render(<VitrinaSelectionBar {...base} onClear={onClear} onDone={onDone} />);
    fireEvent.click(screen.getByRole('button', { name: 'Limpiar' }));
    fireEvent.click(screen.getByRole('button', { name: 'Listo' }));
    expect(onClear).toHaveBeenCalledTimes(1);
    expect(onDone).toHaveBeenCalledTimes(1);
  });

  it('Compartir lleva el ancla a la que vuelve el foco al cerrar el diálogo', () => {
    // El hook devuelve el foco por este selector (WCAG 2.4.3). Si el atributo
    // se cae, el foco se va al principio del documento y quien navega por
    // teclado tiene que recorrer el catálogo entero para volver.
    render(<VitrinaSelectionBar {...base} />);
    expect(
      screen.getByRole('button', { name: /Compartir/i }),
    ).toHaveProperty('dataset.vitrinaShare');
  });

  it('Limpiar se deshabilita en cero — no hay nada que limpiar', () => {
    render(<VitrinaSelectionBar {...base} count={0} />);
    expect(
      (screen.getByRole('button', { name: 'Limpiar' }) as HTMLButtonElement)
        .disabled,
    ).toBe(true);
  });
});
