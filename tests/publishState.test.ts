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
