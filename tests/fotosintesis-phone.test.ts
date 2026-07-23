import { describe, it, expect, vi, afterEach } from 'vitest';
import { createElement } from 'react';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';

// Mock only the external Convex boundary so the real component renders without
// a ConvexProvider. Everything else (the phone onChange + formatColombianPhone)
// runs for real — this exercises the actual running component code path.
vi.mock('../src/lib/convex-safe', () => ({
  convexReady: false,
  convexApi: {
    providers: { list: 'providers.list', create: 'providers.create' },
  },
  useConvexQuery: () => undefined,
  useConvexMutation: () => async () => ({}),
  useConvexAction: () => async () => ({}),
  // The drawer creates providers through the authed action wrapper.
  useAuthedConvexAction: () => async () => ({}),
}));

import { ProveedorNuevoDrawer } from '../src/pages/admin/Fotosintesis/components/ProveedorNuevoDrawer';

afterEach(cleanup);

// Emulate a real user typing into the controlled input one character at a time.
// On each keystroke the browser appends the new char to the input's CURRENT
// (already-formatted, controlled) value before React's onChange fires — this is
// exactly the feedback loop that produced the "575757" bug.
function typeCharByChar(input: HTMLInputElement, chars: string) {
  for (const ch of chars) {
    fireEvent.change(input, { target: { value: input.value + ch } });
  }
}

describe('ProveedorNuevoDrawer — provider phone input (+57)', () => {
  it('formats a Colombian mobile typed digit-by-digit without duplicating +57', () => {
    render(
      createElement(ProveedorNuevoDrawer, {
        open: true,
        onClose: () => {},
        onSuccess: () => {},
      }),
    );

    const input = screen.getByPlaceholderText(
      '+57 311 555 8801',
    ) as HTMLInputElement;

    typeCharByChar(input, '3115558801');

    // The reported bug produced "+57 575 757 3115" (the repeating 57).
    expect(input.value).toBe('+57 311 555 8801');
    expect(input.value).not.toMatch(/57\D*57/);
  });

  it('does not double the country code when a full +57 number is pasted', () => {
    render(
      createElement(ProveedorNuevoDrawer, {
        open: true,
        onClose: () => {},
        onSuccess: () => {},
      }),
    );

    const input = screen.getByPlaceholderText(
      '+57 311 555 8801',
    ) as HTMLInputElement;

    fireEvent.change(input, { target: { value: '+57 311 555 8801' } });
    expect(input.value).toBe('+57 311 555 8801');

    fireEvent.change(input, { target: { value: '573115558801' } });
    expect(input.value).toBe('+57 311 555 8801');
  });
});
