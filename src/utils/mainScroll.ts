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

/**
 * Send the current screen back to its top — the iOS status-bar tap, bound to the
 * brand lockup in the nav bar.
 *
 * Scrolling <main> is not enough on its own. Virtualized screens (the catalogue
 * grid) scroll inside react-window's container, so <main> sits at 0 the whole
 * time and moving it does nothing visible. Rather than teach the shell about
 * every page's internals, reset whatever is actually scrolled: only `scrollTop`
 * is touched, so horizontal rails (recently viewed, favourites) keep their place.
 */
export function scrollActivePageToTop(
  behavior: ScrollBehavior = 'smooth',
): void {
  const main = getMainScrollContainer();
  if (!main) return;
  main.scrollTo({ top: 0, behavior });
  main.querySelectorAll<HTMLElement>('div').forEach((el) => {
    if (el.scrollTop > 0) el.scrollTo({ top: 0, behavior });
  });
}

export function addMainScrollListener(
  handler: EventListener,
  options?: AddEventListenerOptions,
): () => void {
  const el = getMainScrollContainer();
  if (!el) return () => {};
  el.addEventListener('scroll', handler, options);
  return () => el.removeEventListener('scroll', handler);
}
