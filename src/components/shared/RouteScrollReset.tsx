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
import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { scrollMainTo } from "../../utils/mainScroll";

export const RouteScrollReset: React.FC = () => {
  const { pathname } = useLocation();
  useEffect(() => {
    scrollMainTo({ top: 0, left: 0, behavior: "auto" });
  }, [pathname]);
  return null;
};

export default RouteScrollReset;
