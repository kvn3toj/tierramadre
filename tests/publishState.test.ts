import { describe, it, expect } from 'vitest';
import { withPublishStamp } from '../convex/_lib/publishState';

describe('withPublishStamp', () => {
  it('stamps publishedAt the first time an item is published', () => {
    const patch = withPublishStamp(undefined, true);
    expect(patch.mostrarEnCatalogo).toBe(true);
    expect(typeof patch.publishedAt).toBe('number');
  });

  it('does not restamp an already-published item', () => {
    const current = { mostrarEnCatalogo: true, publishedAt: 12345 };
    const patch = withPublishStamp(current, true);
    expect(patch.mostrarEnCatalogo).toBe(true);
    expect(patch.publishedAt).toBeUndefined();
  });

  it('unpublishing never sets publishedAt', () => {
    const patch = withPublishStamp(
      { mostrarEnCatalogo: true, publishedAt: 12345 },
      false,
    );
    expect(patch.mostrarEnCatalogo).toBe(false);
    expect(patch.publishedAt).toBeUndefined();
  });

  it('re-publishing after an unpublish omits publishedAt so the original timestamp survives', () => {
    // reopen() sets mostrarEnCatalogo:false but never clears publishedAt, so
    // `current.publishedAt` is still the original stamp here.
    const current = { mostrarEnCatalogo: false, publishedAt: 12345 };
    const patch = withPublishStamp(current, true);
    expect(patch.publishedAt).toBeUndefined();
  });

  it('handles a brand-new document with no prior state', () => {
    const patch = withPublishStamp(null, false);
    expect(patch).toEqual({ mostrarEnCatalogo: false });
  });
});

/**
 * Denormalized lot provenance — Fix 1B of
 * docs/audits/2026-08-12-convex-usage-audit.md.
 *
 * `products.publishedCatalog` reads `mina` / `tratamiento` straight off the item
 * and has NO fallback to the `lots` table (a fallback would reinstate the
 * reactive read-set dependency the fix removes). So the stamp is the ONLY thing
 * putting provenance on a published row: if it stops working, the public catalog
 * silently loses provenance rather than failing loudly.
 */
describe('withPublishStamp — denormalized lot provenance', () => {
  const prov = { mina: 'Muzo', tratamiento: 'Ninguno' };

  it('stamps provenance when publishing', () => {
    const patch = withPublishStamp(null, true, prov);
    expect(patch.mina).toBe('Muzo');
    expect(patch.tratamiento).toBe('Ninguno');
  });

  it('re-stamps provenance on EVERY publish, not just the first', () => {
    // A reopen → edit → republish cycle can legitimately change the lot's mina.
    // Unlike publishedAt, provenance must follow the current value.
    const current = { mostrarEnCatalogo: false, publishedAt: 12345 };
    const patch = withPublishStamp(current, true, {
      mina: 'Chivor',
      tratamiento: 'Aceite',
    });
    expect(patch.publishedAt).toBeUndefined(); // original stamp survives
    expect(patch.mina).toBe('Chivor'); // provenance refreshed
    expect(patch.tratamiento).toBe('Aceite');
  });

  it('never writes provenance keys when unpublishing', () => {
    // Unpublishing must not blank the values — the row keeps whatever it had.
    const patch = withPublishStamp({ mostrarEnCatalogo: true }, false, prov);
    expect(patch).toEqual({ mostrarEnCatalogo: false });
    expect('mina' in patch).toBe(false);
    expect('tratamiento' in patch).toBe(false);
  });

  it('omits provenance keys entirely when no lot resolved', () => {
    // lotProvenance() returns undefined for orphan rows and missing lotes.
    // Spreading this patch must not overwrite existing values with undefined.
    const patch = withPublishStamp(null, true, undefined);
    expect('mina' in patch).toBe(false);
    expect('tratamiento' in patch).toBe(false);
  });

  it('carries a partially-populated lot through (mina set, tratamiento absent)', () => {
    const patch = withPublishStamp(null, true, { mina: 'Coscuez' });
    expect(patch.mina).toBe('Coscuez');
    expect(patch.tratamiento).toBeUndefined();
  });
});
