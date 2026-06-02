/**
 * RouteScrollReset
 *
 * Resets the inner scroll container (`<main id="main-content">`) to top on
 * every React Router pathname change. The app uses `body { overflow: hidden }`
 * with all scrolling happening inside `<main>`, which survives route changes —
 * so without this, navigating from /esmereogenesis/<plan> back to
 * /esmereogenesis (or from a scrolled /home into the feature) leaves the new
 * route stuck mid-scroll.
 *
 * Mount once at the top of the app, inside the Router. Renders nothing.
 */
import { useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import { scrollMainTo } from "../../utils/mainScroll";

export const RouteScrollReset: React.FC = () => {
  const { pathname } = useLocation();
  // Don't steal focus on the very first load — the splash / skip-link own it.
  const firstRenderRef = useRef(true);
  useEffect(() => {
    scrollMainTo({ top: 0, left: 0, behavior: "auto" });
    if (firstRenderRef.current) {
      firstRenderRef.current = false;
      return;
    }
    // Move focus into the new page so the next Tab lands in content (not back
    // at the browser chrome) and screen readers announce the main landmark.
    // #main-content is already tabIndex={0}; preventScroll keeps the reset.
    document.getElementById("main-content")?.focus({ preventScroll: true });
  }, [pathname]);
  return null;
};

export default RouteScrollReset;
