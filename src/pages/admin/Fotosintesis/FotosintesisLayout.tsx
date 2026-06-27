import { useCallback, useMemo, useRef, useState } from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { Box } from "@mui/material";
import { getFoto } from "../../../design-system";
import { FotoTopbar, type Crumb } from "./components/FotoTopbar";
import { useFotosintesisHotkeys } from "./hooks/useFotosintesisHotkeys";
import {
  FotosintesisLayoutProvider,
  type SpotlightOpenOptions,
} from "./FotosintesisLayoutContext";
import type {
  BatchEditPatch,
  GuidedDraft,
  GuidedFlow,
} from "./copilot/flowSchemas";
import { ProductoSpotlight } from "./components/ProductoSpotlight";
import { WORKBENCH_ENABLED } from "./workbench/featureFlag";
import { isWorkbenchFlow } from "./workbench/workbenchSteps";
import { flowLabel } from "./utils/flowLabels";

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

  // Page-registered fallback options for keyless entry points (⌘K, topbar
  // search). A ref so updating it never re-renders the layout.
  const defaultSpotlightRef = useRef<SpotlightOpenOptions | null>(null);

  const openSpotlight = useCallback((options?: SpotlightOpenOptions) => {
    setSpotlightOptions(options ?? defaultSpotlightRef.current ?? {});
    setSpotlightOpen(true);
  }, []);
  const closeSpotlight = useCallback(() => {
    setSpotlightOpen(false);
  }, []);
  const registerSpotlightDefault = useCallback(
    (options: SpotlightOpenOptions | null) => {
      defaultSpotlightRef.current = options;
    },
    [],
  );

  // ─── Fotosynthia v2 · guided-capture hand-off bus ──────────────────
  // Ref-backed (no re-render on write), mirroring defaultSpotlightRef. The
  // nonces are the only state — they bump so a target page re-seeds even when
  // navigation lands on the route it's already on.
  const draftBusRef = useRef<{ flow: GuidedFlow; data: GuidedDraft } | null>(
    null,
  );
  const editQueueRef = useRef<BatchEditPatch[]>([]);
  const [draftNonce, setDraftNonce] = useState(0);
  const [editQueueNonce, setEditQueueNonce] = useState(0);

  const openDraftForm = useCallback(
    (flow: GuidedFlow, data: GuidedDraft, targetPath: string) => {
      draftBusRef.current = { flow, data };
      setDraftNonce((n) => n + 1);
      navigate(targetPath);
    },
    [navigate],
  );
  const seedDraftForm = useCallback((flow: GuidedFlow, data: GuidedDraft) => {
    draftBusRef.current = { flow, data };
    setDraftNonce((n) => n + 1);
  }, []);
  const consumeDraftForm = useCallback(
    (flow: GuidedFlow): GuidedDraft | null => {
      const pending = draftBusRef.current;
      if (pending && pending.flow === flow) {
        draftBusRef.current = null;
        return pending.data;
      }
      return null;
    },
    [],
  );
  const enqueueEdits = useCallback((edits: BatchEditPatch[]) => {
    editQueueRef.current = [...edits];
    setEditQueueNonce((n) => n + 1);
  }, []);
  const peekEdits = useCallback(() => editQueueRef.current, []);
  const dequeueEdit = useCallback((): BatchEditPatch | null => {
    const queue = editQueueRef.current;
    if (queue.length === 0) return null;
    const [next, ...rest] = queue;
    editQueueRef.current = rest;
    return next ?? null;
  }, []);

  const layoutValue = useMemo(
    () => ({
      openSpotlight,
      closeSpotlight,
      registerSpotlightDefault,
      openDraftForm,
      seedDraftForm,
      consumeDraftForm,
      draftNonce,
      enqueueEdits,
      peekEdits,
      dequeueEdit,
      editQueueNonce,
    }),
    [
      openSpotlight,
      closeSpotlight,
      registerSpotlightDefault,
      openDraftForm,
      seedDraftForm,
      consumeDraftForm,
      draftNonce,
      enqueueEdits,
      peekEdits,
      dequeueEdit,
      editQueueNonce,
    ],
  );

  // Venta routes into the dedicated workbench when the flag is on (PR1 flagship);
  // lote/directory stay on their standalone pages until their canvases land.
  // While already inside a workbench (/copilot/*), the global ⌘N/⌘V/⌘D nav is
  // suppressed so a hotkey can't swap the active flow + draft mid-capture.
  const inWorkbench = location.pathname.includes(
    "/admin/fotosintesis/copilot/",
  );
  useFotosintesisHotkeys({
    onSpotlight: () => openSpotlight(),
    onNewLot: () => {
      if (!inWorkbench) navigate("/admin/fotosintesis/lots/new");
    },
    onNewSale: () => {
      if (inWorkbench) return;
      navigate(
        WORKBENCH_ENABLED
          ? "/admin/fotosintesis/copilot/venta"
          : "/admin/fotosintesis/sales/new",
      );
    },
    onOpenDirectory: () => {
      if (!inWorkbench) navigate("/admin/fotosintesis/directory");
    },
  });

  const crumbs = useMemo<Crumb[]>(() => {
    const path = location.pathname;
    const base: Crumb = { label: "Fotosíntesis", to: "/admin/fotosintesis" };
    if (path === "/admin/fotosintesis") {
      return [{ label: "Inicio" }];
    }
    if (path === "/admin/fotosintesis/lots") {
      return [base, { label: "Lotes" }];
    }
    if (path.startsWith("/admin/fotosintesis/lots/")) {
      if (path.endsWith("/edit")) {
        return [base, { label: "Editar ítem" }];
      }
      if (path.endsWith("/sublotes")) {
        return [base, { label: "Sublotes" }];
      }
      const isClose = path.endsWith("/close");
      return [base, { label: isClose ? "Cerrar lote" : "Captura de lote" }];
    }
    if (path.startsWith("/admin/fotosintesis/copilot/")) {
      const seg = path.split("/").pop() ?? "";
      return [
        base,
        { label: isWorkbenchFlow(seg) ? flowLabel(seg) : "Captura guiada" },
      ];
    }
    if (path.startsWith("/admin/fotosintesis/sales/")) {
      return [base, { label: "Venta" }];
    }
    if (path.startsWith("/admin/fotosintesis/directory")) {
      return [base, { label: "Directorio" }];
    }
    if (path.startsWith("/admin/fotosintesis/certificados")) {
      return [base, { label: "Generador de Certificados" }];
    }
    return [base];
  }, [location.pathname]);

  return (
    <FotosintesisLayoutProvider value={layoutValue}>
      <Box
        // Marker for the global form-control box-sizing reset in
        // css-variables.css (Fotosíntesis inputs default to content-box,
        // overflowing their grid cells). Covers every in-layout form.
        data-foto-admin
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
        <FotoTopbar
          crumbs={crumbs}
          syncStatus="synced"
          userInitial="M"
          onSearchClick={() => openSpotlight()}
        />
        <Box
          sx={{
            // Reserve room at the bottom so the global iOS tab bar never sits on
            // top of page content when scrolled to the end (the copilot is now a
            // docked/overlay rail, not a floating FAB). QA flagged this at every
            // viewport. The workbench fills its own height (its commit bar owns
            // the bottom), so it drops this reservation.
            paddingBottom: inWorkbench ? 0 : { xs: "180px", md: "56px" },
          }}
        >
          <Outlet />
        </Box>
      </Box>

      <ProductoSpotlight
        open={spotlightOpen}
        onClose={closeSpotlight}
        scope={spotlightOptions.scope}
        multiSelect={spotlightOptions.multiSelect}
        selectedProducts={spotlightOptions.selectedProducts}
        onSelect={(product) => {
          spotlightOptions.onSelect?.(product);
          closeSpotlight();
        }}
        onConfirm={(products) => {
          spotlightOptions.onConfirm?.(products);
          closeSpotlight();
        }}
      />
    </FotosintesisLayoutProvider>
  );
}
