/**
 * Fotosynthia Co-pilot Workbench — the dedicated two-pane capture cockpit.
 *
 * LEFT  = the live canvas (the real capture form + its artifact preview).
 * RIGHT = the Fotosynthia conversation (the rail's CopilotPanel in workbench
 *         mode: no hand-off, no auto-route, no in-panel commit).
 *
 * Both panes share ONE chat thread (lifted here), so the conversation fills the
 * canvas live and the canvas can read the same accumulating draft. For PR1 the
 * venta canvas is the embedded `VentaPage`, live-seeded through the existing
 * draft bus (`seedDraftForm`) on each turn — VentaPage keeps its own real
 * Kardex + certificate confirm button.
 */
import { useEffect, useMemo, useRef } from "react";
import { Navigate, useLocation, useParams } from "react-router-dom";
import { Box } from "@mui/material";
import { fontFamilies, getFoto } from "../../../../design-system";
import { useFotosynthiaChat } from "../hooks/useFotosynthiaChat";
import { useFotosintesisLayout } from "../FotosintesisLayoutContext";
import { CopilotPanelBody } from "../components/CopilotPanel";
import FotosintesisVentaPage from "../VentaPage";
import { flowLabel } from "../utils/flowLabels";
import { isWorkbenchFlow, type WorkbenchFlow } from "./workbenchSteps";
import { WorkbenchStepper } from "./WorkbenchStepper";
import { WorkbenchDraftProvider } from "./WorkbenchDraftContext";

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

  // Live-seed the embedded form through the draft bus whenever the conversation
  // accumulates a new slot. Guarded by a value signature so it fires only on a
  // real change (not on every render). For PR1 only venta has an embedded form.
  const seedSigRef = useRef<string>("");
  useEffect(() => {
    if (flow !== "venta") return;
    if (chat.flow && chat.flow !== "venta") return; // conversation drifted
    const draft = chat.priorDraft;
    if (!draft || Object.keys(draft).length === 0) return;
    const sig = JSON.stringify(draft);
    if (sig === seedSigRef.current) return;
    seedSigRef.current = sig;
    layout.seedDraftForm("venta", draft);
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
          {/* Canvas (left) */}
          <Box
            sx={{
              minWidth: 0,
              overflowY: "auto",
              borderRight: { lg: `1px solid ${foto.surfaces.rule}` },
            }}
          >
            {flow === "venta" ? (
              <FotosintesisVentaPage embedded />
            ) : (
              <PlaceholderCanvas label={flowLabel(flow)} />
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
