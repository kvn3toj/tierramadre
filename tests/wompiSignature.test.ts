import { describe, it, expect } from 'vitest';
import {
  buildIntegritySignature,
  validateWompiChecksum,
} from '../api/_lib/wompi-signature';

describe('buildIntegritySignature', () => {
  // Wompi's own published worked example. If this ever fails, our
  // concatenation order drifted from theirs — not a test to "fix" by
  // updating the expected hash.
  it("reproduces the vector published in Wompi's docs", () => {
    expect(
      buildIntegritySignature(
        {
          reference: 'sk8-438k4-xmxm392-sn2m',
          amountInCents: 2490000,
          currency: 'COP',
        },
        'prod_integrity_Z5mMke9x0k8gpErbDqwrJXMqsI6SFli6',
      ),
    ).toBe('37c8407747e595535433ef8f6a811d853cd943046624a0ec04662b17bbf33bf5');
  });

  it('hashes reference + amount + currency + secret, in that order', () => {
    expect(
      buildIntegritySignature(
        { reference: 'VB-0042', amountInCents: 250000000, currency: 'COP' },
        'test_integrity_SECRET',
      ),
    ).toBe('f7a3d22ff514ced04652675744db04b47d0236e3c7eb4b1b25f8735d2aeb3f81');
  });

  it('inserts expirationTime before the secret when present', () => {
    expect(
      buildIntegritySignature(
        {
          reference: 'VB-0042',
          amountInCents: 250000000,
          currency: 'COP',
          expirationTime: '2026-08-20T12:00:00.000Z',
        },
        'test_integrity_SECRET',
      ),
    ).toBe('d91de041931128e02cafea4371684783a28edcb88f46db42e172fd291fc0be6f');
  });

  it('produces a different hash for a different amount (no silent collision)', () => {
    const a = buildIntegritySignature(
      { reference: 'VB-1', amountInCents: 100, currency: 'COP' },
      's',
    );
    const b = buildIntegritySignature(
      { reference: 'VB-1', amountInCents: 200, currency: 'COP' },
      's',
    );
    expect(a).not.toBe(b);
  });
});

const EVENT = {
  event: 'transaction.updated',
  data: {
    transaction: {
      id: '1234-1699',
      status: 'APPROVED',
      amount_in_cents: 250000000,
      reference: 'VB-0042',
    },
  },
  signature: {
    properties: [
      'transaction.id',
      'transaction.status',
      'transaction.amount_in_cents',
    ],
    checksum:
      '11ed594524ab8ae1c67265fa7bb09ebb0cf12f9d4a63062e50de74bd55e7aa11',
  },
  timestamp: 1755600000,
};

describe('validateWompiChecksum', () => {
  it('accepts an event whose checksum matches the events secret', () => {
    expect(validateWompiChecksum(EVENT, 'test_events_SECRET')).toBe(true);
  });

  it('accepts an uppercase checksum (Wompi sends hex uppercased)', () => {
    const upper = {
      ...EVENT,
      signature: {
        ...EVENT.signature,
        checksum: EVENT.signature.checksum.toUpperCase(),
      },
    };
    expect(validateWompiChecksum(upper, 'test_events_SECRET')).toBe(true);
  });

  it('prefers the X-Event-Checksum header when one is supplied', () => {
    const tamperedBody = {
      ...EVENT,
      signature: { ...EVENT.signature, checksum: '0'.repeat(64) },
    };
    expect(
      validateWompiChecksum(
        tamperedBody,
        'test_events_SECRET',
        EVENT.signature.checksum,
      ),
    ).toBe(true);
  });

  it('rejects a tampered amount (the attack this exists to stop)', () => {
    const tampered = {
      ...EVENT,
      data: {
        transaction: { ...EVENT.data.transaction, amount_in_cents: 1 },
      },
    };
    expect(validateWompiChecksum(tampered, 'test_events_SECRET')).toBe(false);
  });

  it('rejects the wrong events secret', () => {
    expect(validateWompiChecksum(EVENT, 'test_events_WRONG')).toBe(false);
  });

  it('returns false (never throws) on malformed input', () => {
    expect(validateWompiChecksum({}, 's')).toBe(false);
    expect(validateWompiChecksum(EVENT, '')).toBe(false);
    expect(validateWompiChecksum({ ...EVENT, timestamp: undefined }, 's')).toBe(
      false,
    );
    expect(
      validateWompiChecksum(
        { ...EVENT, signature: { properties: [], checksum: 'x' } },
        's',
      ),
    ).toBe(false);
    expect(
      validateWompiChecksum(
        {
          ...EVENT,
          signature: {
            properties: ['transaction.nonexistent'],
            checksum: 'x'.repeat(64),
          },
        },
        'test_events_SECRET',
      ),
    ).toBe(false);
  });
});
