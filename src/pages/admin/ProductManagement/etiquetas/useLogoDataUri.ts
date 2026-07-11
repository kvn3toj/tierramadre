/**
 * useLogoDataUri — React binding over loadLogoDataUri(). Returns the logo as a
 * `data:` URI once it has loaded, or `null` while loading / on failure.
 *
 * Callers render the QR WITHOUT a centre logo while this is null (a plain QR is
 * still perfectly scannable — arguably more so), then re-render with the logo
 * embedded once it resolves. Print actions gate on a non-null value so an
 * exported/printed label always carries the embedded mark.
 */

import { useEffect, useState } from 'react';
import { loadLogoDataUri } from './logoDataUri';

export function useLogoDataUri(): string | null {
  const [dataUri, setDataUri] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    loadLogoDataUri()
      .then((uri) => {
        if (active) setDataUri(uri);
      })
      .catch(() => {
        // Swallow — a null return degrades to a logoless (still valid) QR.
      });
    return () => {
      active = false;
    };
  }, []);

  return dataUri;
}
