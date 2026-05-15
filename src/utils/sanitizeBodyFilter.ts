/**
 * sanitizeBodyFilter
 *
 * The third-party `noprint.js` (loaded in index.html as a screenshot deterrent)
 * writes `filter: blur(0px)` to `<body>` on every click via `style.cssText`.
 * Per CSS spec, any non-`none` filter creates a *containing block* for
 * fixed-positioned descendants — so portaled MUI Drawers / Modals end up
 * positioned relative to body instead of the viewport, rendering off-screen
 * whenever the inner scroll container has scrolled.
 *
 * `blur(0px)` is visually a no-op, so stripping it doesn't affect any actual
 * deterrent behaviour. We watch the body's style attribute and remove the
 * filter whenever it reappears.
 */

const BODY_FILTER_TARGETS =
  /(^|;)\s*(-(webkit|moz|ms|o)-)?filter\s*:\s*blur\(0(px)?\)\s*;?/gi;

let installed = false;

export function installBodyFilterSanitizer(): () => void {
  if (typeof document === "undefined" || installed) {
    return () => {};
  }
  installed = true;
  const body = document.body;

  const sweep = () => {
    const current = body.getAttribute("style") || "";
    if (!BODY_FILTER_TARGETS.test(current)) {
      BODY_FILTER_TARGETS.lastIndex = 0;
      return;
    }
    BODY_FILTER_TARGETS.lastIndex = 0;
    const cleaned = current.replace(BODY_FILTER_TARGETS, "$1").trim();
    if (cleaned) {
      body.setAttribute("style", cleaned);
    } else {
      body.removeAttribute("style");
    }
  };

  // Initial sweep — handles the case where noprint.js wrote it before we mounted.
  sweep();

  const obs = new MutationObserver(sweep);
  obs.observe(body, { attributes: true, attributeFilter: ["style"] });

  return () => {
    obs.disconnect();
    installed = false;
  };
}
