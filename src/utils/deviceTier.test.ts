/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi } from 'vitest';

const IOS_PWA_UA =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148';
const TELEGRAM_ANDROID_UA =
  'Mozilla/5.0 (Linux; Android 13; SM-S908B Build/TP1A.220624.014; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/126.0.6478.71 Mobile Safari/537.36';

async function detect(ua: string, standalone: boolean) {
  vi.resetModules();
  Object.defineProperty(navigator, 'userAgent', {
    value: ua,
    configurable: true,
  });
  Object.defineProperty(navigator, 'standalone', {
    value: standalone,
    configurable: true,
  });
  window.matchMedia = ((q: string) => ({
    matches: standalone && q.includes('standalone'),
    media: q,
    addEventListener() {},
    removeEventListener() {},
  })) as unknown as typeof window.matchMedia;
  const mod = await import('./deviceTier');
  return mod.detectBrowser();
}

describe('detectBrowser standalone subtraction', () => {
  it('does not flag an installed iOS PWA as an in-app browser', async () => {
    const info = await detect(IOS_PWA_UA, true);
    expect(info.isStandalone).toBe(true);
    expect(info.isInAppBrowser).toBe(false);
    expect(info.browserName).toBe('PWA');
  });

  it('still flags the same UA when NOT standalone (real WKWebView)', async () => {
    const info = await detect(IOS_PWA_UA, false);
    expect(info.isStandalone).toBe(false);
    expect(info.isInAppBrowser).toBe(true);
  });

  it('still flags an Android WebView even if display-mode reports standalone', async () => {
    const info = await detect(TELEGRAM_ANDROID_UA, true);
    expect(info.isInAppBrowser).toBe(true);
  });
});
