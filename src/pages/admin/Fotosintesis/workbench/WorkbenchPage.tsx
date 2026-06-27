/**
 * Fotosynthia Co-pilot Workbench — the dedicated two-pane capture cockpit.
 *
 * LEFT  = the live canvas (the real capture form + its artifact preview).
 * RIGHT = the Fotosynthia conversation (the rail's CopilotPanel in workbench
 *         mode: no hand-off, no auto-route, no in-panel commit).
 *
 * Both panes share ONE chat thread (lifted here), so the conversation fills the
 * canvas live and the canvas can read the same accumulating draft. Canvases are
 * embedded existing pages, live-seeded through the existing draft bus
 * (`seedDraftForm`) on each turn, each keeping its own real commit button:
 * `VentaPage` (Kardex + certificate) for venta, and `CapturaLotePage` (lot
 * header + per-item loop) for the lote family. Provider/client use a net-new
 * canvas with the shared `WorkbenchCommitBar`.
 */
import { useCallback, useEffect, useMemo, useRef } from "react";
import {
  Navigate,
  useLocation,
  useNavigate,
  useParams,
} from "react-router-dom";
import { Box } from "@mui/material";
import { fontFamilies, getFoto } from "../../../../design-system";
import { useFotosynthiaChat } from "../hooks/useFotosynthiaChat";
import { useFotosintesisLayout } from "../FotosintesisLayoutContext";
import { CopilotPanelBody } from "../components/CopilotPanel";
import FotosintesisVentaPage from "../VentaPage";
import FotosintesisCapturaLotePage from "../CapturaLotePage";
import { flowLabel } from "../utils/flowLabels";
import { isWorkbenchFlow, type WorkbenchFlow } from "./workbenchSteps";
import { WorkbenchStepper } from "./WorkbenchStepper";
import { WorkbenchDraftProvider } from "./WorkbenchDraftContext";
import { WorkbenchCommitBar } from "./WorkbenchCommitBar";
import { ProviderClientCanvas } from "./canvas/ProviderClientCanvas";
import { coerceGuidedItemDraft, isItemFlow } from "./canvas/itemAdapters";
import type { GuidedDraft, GuidedFlow } from "../copilot/flowSchemas";

export default function WorkbenchPage() {
  const { flow } = useParams<{ flow: string }>();
  if (!isWorkbenchFlow(flow)) {
    return <Navigate to="/admin/fotosintesis" replace />;
  }
  // `flow` is narrowed to WorkbenchFlow by the type guard above. Keyed remount
  // on flow so a switch resets the lifted hook + embedded canvas cleanly.
  return <WorkbenchInner key={flow} flow={flow} />;
}

function WorkbenchInner({ flow }: { flow: WorkbenchFlow }) {
  const foto = getFoto("light");
  const route = useLocation().pathname;
  const chat = useFotosynthiaChat(route);
  const layout = useFotosintesisLayout();
  const navigate = useNavigate();

  // After a direct-flow commit, show "Guardado" briefly, then clear the thread
  // + draft and land on the directory where the freshly-synced record appears.
  const handleCommitted = useCallback(() => {
    window.setTimeout(() => {
      chat.reset();
      navigate("/admin/fotosintesis/directory");
    }, 900);
  }, [chat, navigate]);

  // Live-seed the embedded canvas through the draft bus whenever the
  // conversation accumulates a new slot. Guarded by a value signature so it
  // fires only on a real change (not on every render).
  //   • venta         → the embedded VentaPage form
  //   • lote / item-* → the embedded lote canvas: the lot header (lote) or the
  //                     active item draft (item-*, coerced GuidedDraft → typed
  //                     item Draft via itemAdapters).
  const seedSigRef = useRef<string>("");
  useEffect(() => {
    const cf = chat.flow;
    const draft = chat.priorDraft;
    if (!draft || Object.keys(draft).length === 0) return;

    let seedFlow: GuidedFlow | null = null;
    let seedData: GuidedDraft = draft;

    if (flow === "venta") {
      if (cf && cf !== "venta") return; // conversation drifted
      seedFlow = "venta";
    } else if (flow === "lote" || flow === "item-gema") {
      // The embedded lote canvas hosts both the header and the per-item loop, so
      // route the conversation's locked flow to the matching seed target.
      if (cf === "lote") {
        seedFlow = "lote";
      } else if (isItemFlow(cf)) {
        seedFlow = cf;
        seedData = coerceGuidedItemDraft(cf, draft);
      } else {
        return; // flow not locked yet / not a lote-family flow
      }
    } else {
      return;
    }

    if (!seedFlow) return;
    const sig = `${seedFlow}:${JSON.stringify(seedData)}`;
    if (sig === seedSigRef.current) return;
    seedSigRef.current = sig;
    layout.seedDraftForm(seedFlow, seedData);
  }, [flow, chat.flow, chat.priorDraft, layout]);

  // The stepper reads the live draft only while the conversation is on this
  // flow; if it drifts to another flow, show this flow's empty progress.
  const stepperDraft = useMemo(
    () => (!chat.flow || chat.flow === flow ? (chat.priorDraft ?? {}) : {}),
    [chat.flow, chat.priorDraft, flow],
  );

  const draftValue = useMemo(
    () => ({
      flow,
      draft: chat.priorDraft ?? {},
      recentlyFilledKeys: chat.recentlyFilledKeys,
      patchDraft: chat.patchDraft,
    }),
    [flow, chat.priorDraft, chat.recentlyFilledKeys, chat.patchDraft],
  );

  return (
    <WorkbenchDraftProvider value={draftValue}>
      <Box
        sx={{
          display: "flex",
          flexDirection: "column",
          height: "calc(100dvh - 56px)",
          background: foto.surfaces.canvas,
          color: foto.ink.primary,
        }}
      >
        {/* Header — overline · flow title · progress stepper */}
        <Box
          sx={{
            flexShrink: 0,
            display: "flex",
            alignItems: { xs: "flex-start", sm: "center" },
            justifyContent: "space-between",
            gap: "16px",
            flexWrap: "wrap",
            padding: { xs: "14px 16px", md: "16px 28px" },
            borderBottom: `1px solid ${foto.surfaces.rule}`,
            background: foto.surfaces.panel,
          }}
        >
          <Box sx={{ minWidth: 0 }}>
            <Box
              sx={{
                fontSize: "9px",
                letterSpacing: "0.2em",
                textTransform: "uppercase",
                fontWeight: 500,
                color: foto.ink.tertiary,
                marginBottom: "3px",
              }}
            >
              Atelier · Captura guiada
            </Box>
            <Box
              component="h1"
              sx={{
                margin: 0,
                fontFamily: fontFamilies.brand,
                fontSize: { xs: "22px", md: "26px" },
                fontWeight: 600,
                letterSpacing: "-0.02em",
                lineHeight: 1.1,
                color: foto.ink.primary,
              }}
            >
              {flowLabel(flow)}
            </Box>
          </Box>
          <WorkbenchStepper flow={flow} draft={stepperDraft} />
        </Box>

        {/* Body — canvas | conversation */}
        <Box
          sx={{
            flex: 1,
            minHeight: 0,
            display: "grid",
            gridTemplateColumns: {
              xs: "1fr",
              lg: "minmax(0, 1fr) minmax(360px, 440px)",
            },
          }}
        >
          {/* Canvas (left) — each canvas owns its own scroll; direct flows pin
              a commit bar at the bottom of the pane. */}
          <Box
            sx={{
              minWidth: 0,
              minHeight: 0,
              display: "flex",
              flexDirection: "column",
              borderRight: { lg: `1px solid ${foto.surfaces.rule}` },
            }}
          >
            {flow === "venta" ? (
              <Box sx={{ flex: 1, minHeight: 0, overflowY: "auto" }}>
                <FotosintesisVentaPage embedded />
              </Box>
            ) : flow === "provider" || flow === "client" ? (
              <>
                <Box sx={{ flex: 1, minHeight: 0, overflowY: "auto" }}>
                  <ProviderClientCanvas />
                </Box>
                <WorkbenchCommitBar
                  flow={flow}
                  chat={chat}
                  route={route}
                  onCommitted={handleCommitted}
                />
              </>
            ) : flow === "lote" || flow === "item-gema" ? (
              // The lote canvas owns its own proven commit buttons (lots.create
              // + lotItems.create with photo/cert uploads), so — like venta —
              // it renders no separate WorkbenchCommitBar.
              <Box sx={{ flex: 1, minHeight: 0, overflowY: "auto" }}>
                <FotosintesisCapturaLotePage embedded />
              </Box>
            ) : (
              <Box sx={{ flex: 1, minHeight: 0, overflowY: "auto" }}>
                <PlaceholderCanvas label={flowLabel(flow)} />
              </Box>
            )}
          </Box>

          {/* Conversation (right) */}
          <Box
            sx={{
              display: "flex",
              minHeight: { xs: 480, lg: 0 },
              minWidth: 0,
              background: foto.surfaces.canvas,
              borderTop: { xs: `1px solid ${foto.surfaces.rule}`, lg: "none" },
            }}
          >
            <CopilotPanelBody active chat={chat} mode="workbench" />
          </Box>
        </Box>
      </Box>
    </WorkbenchDraftProvider>
  );
}

function PlaceholderCanvas({ label }: { label: string }) {
  const foto = getFoto("light");
  return (
    <Box
      sx={{
        height: "100%",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: "8px",
        padding: "48px 24px",
        textAlign: "center",
        color: foto.ink.tertiary,
      }}
    >
      <Box
        sx={{
          fontFamily: fontFamilies.brand,
          fontSize: "20px",
          fontWeight: 600,
          color: foto.ink.secondary,
        }}
      >
        {label}
      </Box>
      <Box sx={{ fontSize: "13px", maxWidth: 320, lineHeight: 1.5 }}>
        El lienzo de esta captura llega pronto. Mientras tanto, usá la
        conversación de Fotosynthia para capturar los datos.
      </Box>
    </Box>
  );
}
