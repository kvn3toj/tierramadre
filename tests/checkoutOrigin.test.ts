import { describe, it, expect } from 'vitest';
import {
  allowedCheckoutOrigins,
  isCheckoutOriginAllowed,
} from '../api/_lib/checkoutOrigin';

describe('allowedCheckoutOrigins', () => {
  it('always includes the production domain, even with no env at all', () => {
    expect(allowedCheckoutOrigins({})).toContain('https://tierramadre.app');
  });

  it('includes APP_URL, normalized without its trailing slash', () => {
    expect(
      allowedCheckoutOrigins({ APP_URL: 'https://tierramadre.app/' }),
    ).toContain('https://tierramadre.app');
  });

  it('keeps only the origin of an APP_URL that carries a path', () => {
    expect(
      allowedCheckoutOrigins({ APP_URL: 'https://staging.tierramadre.app/app' }),
    ).toContain('https://staging.tierramadre.app');
  });

  it('adds the comma-separated extras from CHECKOUT_ALLOWED_ORIGINS', () => {
    const list = allowedCheckoutOrigins({
      CHECKOUT_ALLOWED_ORIGINS: 'https://a.com, https://b.com',
    });
    expect(list).toContain('https://a.com');
    expect(list).toContain('https://b.com');
  });

  it('ignores an empty CHECKOUT_ALLOWED_ORIGINS instead of allowing ""', () => {
    expect(allowedCheckoutOrigins({ CHECKOUT_ALLOWED_ORIGINS: ' , ' })).not.toContain(
      '',
    );
  });
});

describe('isCheckoutOriginAllowed', () => {
  const lista = ['https://tierramadre.app'];

  // Un llamante sin navegador (curl, el riel del bot, un webhook) no manda
  // Origin. Bloquearlo no protegería nada — CORS lo imponen los navegadores,
  // no el servidor — y sí rompería a los llamantes legítimos de servidor.
  it('allows a request with no Origin header', () => {
    expect(isCheckoutOriginAllowed(undefined, lista)).toBe(true);
  });

  it('allows the app own origin', () => {
    expect(isCheckoutOriginAllowed('https://tierramadre.app', lista)).toBe(true);
  });

  // Éste es el ataque que la regla cierra: una página de un tercero que hace
  // POST desde el navegador de SUS visitantes aparta piedras con IPs
  // legítimas y variadas, justo lo que un rate limit por IP no ve.
  it('rejects a third-party origin', () => {
    expect(isCheckoutOriginAllowed('https://evil.example', lista)).toBe(false);
  });

  it('ignores case and a trailing slash', () => {
    expect(isCheckoutOriginAllowed('HTTPS://TierraMadre.app/', lista)).toBe(
      true,
    );
  });

  it('rejects a look-alike subdomain that is not on the list', () => {
    expect(
      isCheckoutOriginAllowed('https://tierramadre.app.evil.example', lista),
    ).toBe(false);
  });

  it('allows localhost when localhost is enabled (dev)', () => {
    expect(
      isCheckoutOriginAllowed('http://localhost:3000', lista, {
        allowLocalhost: true,
      }),
    ).toBe(true);
  });

  it('rejects localhost when it is not enabled (production)', () => {
    expect(
      isCheckoutOriginAllowed('http://localhost:3000', lista, {
        allowLocalhost: false,
      }),
    ).toBe(false);
  });

  it('allows 127.0.0.1 on any port when localhost is enabled', () => {
    expect(
      isCheckoutOriginAllowed('http://127.0.0.1:5173', lista, {
        allowLocalhost: true,
      }),
    ).toBe(true);
  });
});
