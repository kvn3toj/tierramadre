import { describe, it, expect } from 'vitest';
// @ts-expect-error — plain JS module shared with the api/ serverless bundle
import { extractDriveFolderId } from '../api/_lib/drive-url.js';

describe('extractDriveFolderId — carpetaFotosUrl parsing', () => {
  it('extracts the ID from a standard folder URL (the format stored in Convex)', () => {
    expect(
      extractDriveFolderId(
        'https://drive.google.com/drive/folders/1-1g6BlDVhQu4jI4W0Vbg8OeRbGUNFhJ4',
      ),
    ).toBe('1-1g6BlDVhQu4jI4W0Vbg8OeRbGUNFhJ4');
  });

  it('tolerates query params and account prefixes', () => {
    expect(
      extractDriveFolderId(
        'https://drive.google.com/drive/u/0/folders/1AbC_dEf-123456789012345?usp=sharing',
      ),
    ).toBe('1AbC_dEf-123456789012345');
  });

  it('extracts the ID from open?id= links', () => {
    expect(
      extractDriveFolderId(
        'https://drive.google.com/open?id=1AbC_dEf-123456789012345',
      ),
    ).toBe('1AbC_dEf-123456789012345');
  });

  it('accepts a bare Drive ID', () => {
    expect(extractDriveFolderId('1-1g6BlDVhQu4jI4W0Vbg8OeRbGUNFhJ4')).toBe(
      '1-1g6BlDVhQu4jI4W0Vbg8OeRbGUNFhJ4',
    );
  });

  it('returns null for empty, malformed, or non-string input', () => {
    expect(extractDriveFolderId('')).toBeNull();
    expect(extractDriveFolderId('   ')).toBeNull();
    expect(extractDriveFolderId('not a url')).toBeNull();
    expect(extractDriveFolderId('https://example.com/x')).toBeNull();
    expect(extractDriveFolderId(undefined)).toBeNull();
    expect(extractDriveFolderId(null)).toBeNull();
  });
});
