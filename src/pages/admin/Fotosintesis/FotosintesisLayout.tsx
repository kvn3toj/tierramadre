import { useCallback, useMemo, useState } from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { Box } from "@mui/material";
import { getFoto } from "../../../design-system";
import { FotoTopbar, type Crumb } from "./components/FotoTopbar";
import { useFotosintesisHotkeys } from "./hooks/useFotosintesisHotkeys";
import {
  FotosintesisLayoutProvider,
  type SpotlightOpenOptions,
} from "./FotosintesisLayoutContext";
import { ProductoSpotlight } from "./components/ProductoSpotlight";
import { FotosintesisGuideFab } from "./components/FotosintesisGuideFab";

/**
 * Shared shell for every /admin/fotosintesis route. Owns the sticky topbar,
 * the four global hotkeys (⌘K / ⌘N / ⌘V / ⌘D), and the singleton spotlight
 * modal. Child routes consume `useFotosintesisLayout()` to open spotlight.
 */
export default function FotosintesisLayout() {
  const foto = getFoto("light");
  const navigate = useNavigate();
  const location = useLocation();

  const [spotlightOpen, setSpotlightOpen] = useState(false);
  const [spotlightOptions, setSpotlightOptions] =
    useState<SpotlightOpenOptions>({});

  const openSpotlight = useCallback((options?: SpotlightOpenOptions) => {
    setSpotlightOptions(options ?? {});
    setSpotlightOpen(true);
  }, []);
  const closeSpotlight = useCallback(() => {
    setSpotlightOpen(false);
  }, []);

  const layoutValue = useMemo(
    () => ({ openSpotlight, closeSpotlight }),
    [openSpotlight, closeSpotlight],
  );

  useFotosintesisHotkeys({
    onSpotlight: () => openSpotlight(),
    onNewLot: () => navigate("/admin/fotosintesis/lots/new"),
    onNewSale: () => navigate("/admin/fotosintesis/sales/new"),
    onOpenDirectory: () => navigate("/admin/fotosintesis/directory"),
  });

  const crumbs = useMemo<Crumb[]>(() => {
    const path = location.pathname;
    const base: Crumb = { label: "Fotosíntesis", to: "/admin/fotosintesis" };
    if (path === "/admin/fotosintesis") {
      return [{ label: "Inicio" }];
    }
    if (path.startsWith("/admin/fotosintesis/lots/")) {
      const isClose = path.endsWith("/close");
      return [base, { label: isClose ? "Cerrar lote" : "Captura de lote" }];
    }
    if (path.startsWith("/admin/fotosintesis/sales/")) {
      return [base, { label: "Venta" }];
    }
    if (path.startsWith("/admin/fotosintesis/directory")) {
      return [base, { label: "Directorio" }];
    }
    return [base];
  }, [location.pathname]);

  return (
    <FotosintesisLayoutProvider value={layoutValue}>
      <Box
        sx={{
          minHeight: "100vh",
          background: foto.surfaces.canvas,
          color: foto.ink.primary,
          fontFamily:
            '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, system-ui, sans-serif',
          fontSize: 13,
          lineHeight: 1.45,
          WebkitFontSmoothing: "antialiased",
          textRendering: "optimizeLegibility",
        }}
      >
        <FotoTopbar crumbs={crumbs} syncStatus="synced" userInitial="M" />
        <Outlet />
        <FotosintesisGuideFab />
      </Box>

      <ProductoSpotlight
        open={spotlightOpen}
        onClose={closeSpotlight}
        scope={spotlightOptions.scope}
        onSelect={(product) => {
          spotlightOptions.onSelect?.(product);
          closeSpotlight();
        }}
      />
    </FotosintesisLayoutProvider>
  );
}
