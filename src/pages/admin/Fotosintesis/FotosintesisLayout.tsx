import { useCallback, useMemo, useRef, useState } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { Box } from '@mui/material';
import { getFoto } from '../../../design-system';
import { convexApi, useConvexClient } from '../../../lib/convex-safe';
import { FotoTopbar, type Crumb } from './components/FotoTopbar';
import { FotoTabBar } from './components/FotoTabBar';
import { FotoRouteMenu } from './components/FotoRouteMenu';
import { useFotosintesisHotkeys } from './hooks/useFotosintesisHotkeys';
import {
  FotosintesisLayoutProvider,
  type SpotlightOpenOptions,
} from './FotosintesisLayoutContext';
import type {
  BatchEditPatch,
  GuidedDraft,
  GuidedFlow,
} from './copilot/flowSchemas';
import { ProductoSpotlight } from './components/ProductoSpotlight';
import { WORKBENCH_ENABLED } from './workbench/featureFlag';
import { isWorkbenchFlow } from './workbench/workbenchSteps';
import { flowLabel } from './utils/flowLabels';

/**
 * Shared shell for every /admin/fotosintesis route. Owns the sticky topbar,
 * the four global hotkeys (⌘K / ⌘N / ⌘V / ⌘D), and the singleton spotlight
 * modal. Child routes consume `useFotosintesisLayout()` to open spotlight.
 */
export default function FotosintesisLayout() {
  const foto = getFoto('light');
  const navigate = useNavigate();
  const location = useLocation();
  const convexClient = useConvexClient();

  // Shared by the topbar avatar trigger and the FotoTabBar "Menú" slot.
  const [menuOpen, setMenuOpen] = useState(false);

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

  // Fallback used whenever a route hasn't registered its own spotlight
  // onSelect (e.g. Home, Lotes, Directorio): jump straight to the item's edit
  // view, mirroring what the QR scanner does for a resolved item. Falls back
  // to the lote's capture page if the item has no lotItems join row yet.
  const goToItemDetail = useCallback(
    (product: { itemId: string; loteId?: string }) => {
      if (!convexClient) return;
      convexClient
        .query(convexApi.lotItems.getByItemId, { itemId: product.itemId })
        .then((lotItem) => {
          if (lotItem) {
            navigate(
              `/admin/fotosintesis/lots/${lotItem.loteId}/items/${lotItem._id}/edit`,
            );
          } else if (product.loteId) {
            navigate(`/admin/fotosintesis/lots/${product.loteId}`);
          }
        })
        .catch(() => {
          if (product.loteId) {
            navigate(`/admin/fotosintesis/lots/${product.loteId}`);
          }
        });
    },
    [convexClient, navigate],
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

  // Venta + lote route into the dedicated workbench when the flag is on;
  // directory stays on its standalone page until its canvas lands.
  // While already inside a workbench (/copilot/*), the global ⌘N/⌘V/⌘D nav is
  // suppressed so a hotkey can't swap the active flow + draft mid-capture.
  const inWorkbench = location.pathname.includes(
    '/admin/fotosintesis/copilot/',
  );
  useFotosintesisHotkeys({
    onSpotlight: () => openSpotlight(),
    onNewLot: () => {
      if (inWorkbench) return;
      navigate(
        WORKBENCH_ENABLED
          ? '/admin/fotosintesis/copilot/lote'
          : '/admin/fotosintesis/lots/new',
      );
    },
    onNewSale: () => {
      if (inWorkbench) return;
      navigate(
        WORKBENCH_ENABLED
          ? '/admin/fotosintesis/copilot/venta'
          : '/admin/fotosintesis/sales/new',
      );
    },
    onOpenDirectory: () => {
      if (!inWorkbench) navigate('/admin/fotosintesis/directory');
    },
  });

  const crumbs = useMemo<Crumb[]>(() => {
    const path = location.pathname;
    const base: Crumb = { label: 'Fotosíntesis', to: '/admin/fotosintesis' };
    if (path === '/admin/fotosintesis') {
      return [{ label: 'Inicio' }];
    }
    if (path === '/admin/fotosintesis/lots') {
      return [base, { label: 'Lotes' }];
    }
    if (path.startsWith('/admin/fotosintesis/lots/')) {
      if (path.endsWith('/edit')) {
        return [base, { label: 'Editar ítem' }];
      }
      if (path.endsWith('/sublotes')) {
        return [base, { label: 'Sublotes' }];
      }
      const isClose = path.endsWith('/close');
      return [base, { label: isClose ? 'Cerrar lote' : 'Captura de lote' }];
    }
    if (path.startsWith('/admin/fotosintesis/copilot/')) {
      const seg = path.split('/').pop() ?? '';
      return [
        base,
        { label: isWorkbenchFlow(seg) ? flowLabel(seg) : 'Captura guiada' },
      ];
    }
    if (path.startsWith('/admin/fotosintesis/sales/')) {
      return [base, { label: 'Venta' }];
    }
    if (path.startsWith('/admin/fotosintesis/directory')) {
      return [base, { label: 'Directorio' }];
    }
    if (path.startsWith('/admin/fotosintesis/certificados')) {
      return [base, { label: 'Generador de Certificados' }];
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
          minHeight: '100vh',
          background: foto.surfaces.canvas,
          color: foto.ink.primary,
          fontFamily:
            '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, system-ui, sans-serif',
          fontSize: 13,
          lineHeight: 1.45,
          WebkitFontSmoothing: 'antialiased',
          textRendering: 'optimizeLegibility',
        }}
      >
        <FotoTopbar
          crumbs={crumbs}
          syncStatus="synced"
          userInitial="M"
          onSearchClick={() => openSpotlight()}
          onMenuClick={() => setMenuOpen(true)}
          menuOpen={menuOpen}
        />
        <Box
          sx={{
            // Reserve room at the bottom so the Fotosíntesis-native FotoTabBar
            // never sits on top of page content when scrolled to the end. The bar
            // is ~82px tall (60px pill + 10px top + 12px bottom) plus the device
            // safe-area inset. At lg the workbench fills its own fixed height (its
            // commit bar owns the bottom) so it drops the reservation; below lg
            // the workbench is a scrolling document and needs tab-bar clearance so
            // its composer stays reachable (M2).
            paddingBottom: inWorkbench
              ? { xs: 'calc(96px + env(safe-area-inset-bottom, 0px))', lg: 0 }
              : 'calc(92px + env(safe-area-inset-bottom, 0px))',
          }}
        >
          <Outlet />
        </Box>
      </Box>

      {/* Fotosíntesis-native bottom bar + full route menu. The global iOS tab
          bar suppresses itself inside this prefix so these own the chrome. */}
      <FotoTabBar onMenuClick={() => setMenuOpen(true)} menuOpen={menuOpen} />
      <FotoRouteMenu open={menuOpen} onClose={() => setMenuOpen(false)} />

      <ProductoSpotlight
        open={spotlightOpen}
        onClose={closeSpotlight}
        scope={spotlightOptions.scope}
        multiSelect={spotlightOptions.multiSelect}
        selectedProducts={spotlightOptions.selectedProducts}
        onSelect={(product) => {
          if (spotlightOptions.onSelect) {
            spotlightOptions.onSelect(product);
          } else {
            goToItemDetail(product);
          }
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
