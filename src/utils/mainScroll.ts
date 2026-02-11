/**
 * Main Scroll Utilities
 *
 * Centralized access to the <main id="main-content"> scroll container.
 * With the fixed viewport shell layout, only <main> scrolls — not the document.
 */

const MAIN_CONTENT_ID = 'main-content';

export function getMainScrollContainer(): HTMLElement | null {
  return document.getElementById(MAIN_CONTENT_ID);
}

export function scrollMainTo(options: ScrollToOptions): void {
  getMainScrollContainer()?.scrollTo(options);
}

export function getMainScrollY(): number {
  return getMainScrollContainer()?.scrollTop ?? 0;
}

export function getMainScrollHeight(): number {
  const el = getMainScrollContainer();
  return el ? el.scrollHeight - el.clientHeight : 0;
}

export function addMainScrollListener(
  handler: EventListener,
  options?: AddEventListenerOptions
): () => void {
  const el = getMainScrollContainer();
  if (!el) return () => {};
  el.addEventListener('scroll', handler, options);
  return () => el.removeEventListener('scroll', handler);
}
