/**
 * Workbench commit bar (direct flows: provider / client / item-*).
 *
 * The commit is ALWAYS server-hardened: the CTA renders the existing
 * `CommitReviewCard` whenever the conversation envelope carries a ready,
 * direct `action` (provider.create / client.create …). When the operator
 * completed the canvas by hand (no ready action yet) but the client-side draft
 * looks complete, "Revisar y guardar" sends one guided turn carrying the
 * accumulated draft so the SERVER hardens it into a ready action — the client
 * never builds the committable action itself (trust boundary intact).
 */
import { useEffect, useMemo, useState } from "react";
import { Box } from "@mui/material";
import { ArrowRight } from "lucide-react";
import { getFoto } from "../../../../design-system";
import { useGoogleAuth } from "../../../../contexts/GoogleAuthContext";
import { useAppNavigator } from "../../../../contexts/AppNavigatorContext";
import { CommitReviewCard } from "../components/CommitReviewCard";
import { computeMissing } from "../copilot/flowSchemas";
import { fieldLabel } from "../utils/flowLabels";
import type { UseFotosynthiaChatResult } from "../hooks/useFotosynthiaChat";
import type { WorkbenchFlow } from "./workbenchSteps";

const CONFIRM_PROMPT: Partial<Record<WorkbenchFlow, string>> = {
  provider: "Confirmá y guardá este proveedor con los datos del lienzo.",
  client: "Confirmá y guardá este cliente con los datos del lienzo.",
  "item-gema": "Confirmá y guardá esta gema con los datos del lienzo.",
  "item-joya": "Confirmá y guardá esta joya con los datos del lienzo.",
  "item-insumo": "Confirmá y guardá este insumo con los datos del lienzo.",
};

export function WorkbenchCommitBar({
  flow,
  chat,
  route,
  onCommitted,
}: {
  flow: WorkbenchFlow;
  chat: UseFotosynthiaChatResult;
  route: string;
  onCommitted: () => void;
}) {
  const foto = getFoto("light");
  const { user } = useGoogleAuth();
  const { accessLevel } = useAppNavigator();

  const [online, setOnline] = useState<boolean>(() =>
    typeof navigator === "undefined" ? true : navigator.onLine,
  );
  useEffect(() => {
    const update = () => setOnline(navigator.onLine);
    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    return () => {
      window.removeEventListener("online", update);
      window.removeEventListener("offline", update);
    };
  }, []);

  const env = chat.latestEnvelope;
  const draft = chat.priorDraft ?? {};
  const action =
    env?.action &&
    env.action.mode === "direct" &&
    env.action.ready &&
    env.flow === flow
      ? env.action
      : null;
  const missing = computeMissing(flow, draft);
  const ready = missing.length === 0;

  const ctx = useMemo(
    () => ({ editorEmail: user?.email ?? "", operatorName: user?.name }),
    [user?.email, user?.name],
  );

  const requestReview = () => {
    if (chat.isStreaming || !online) return;
    chat.sendGuided({
      text: CONFIRM_PROMPT[flow] ?? "Confirmá y guardá esto.",
      snapshot: undefined,
      route,
      userEmail: user?.email,
      userName: user?.name,
      accessLevel,
    });
  };

  return (
    <Box
      sx={{
        flexShrink: 0,
        borderTop: `1px solid ${foto.surfaces.rule}`,
        background: foto.surfaces.panel,
        padding: action ? "12px 0" : "12px 18px",
      }}
    >
      {action ? (
        <CommitReviewCard
          action={action}
          ctx={ctx}
          online={online}
          onClose={chat.clearEnvelope}
          onCommitted={onCommitted}
        />
      ) : (
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "12px",
          }}
        >
          <Box
            sx={{ fontSize: "11.5px", color: foto.ink.tertiary, minWidth: 0 }}
          >
            {ready
              ? "Listo para revisar."
              : `Faltan: ${missing.map(fieldLabel).join(", ")}`}
          </Box>
          <Box
            component="button"
            type="button"
            onClick={requestReview}
            disabled={!ready || chat.isStreaming || !online}
            sx={{
              flexShrink: 0,
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              border: "none",
              borderRadius: "9px",
              padding: "9px 15px",
              background:
                ready && !chat.isStreaming && online
                  ? foto.accent.primary
                  : foto.surfaces.inset,
              color:
                ready && !chat.isStreaming && online
                  ? foto.ink.inverse
                  : foto.ink.mute,
              fontSize: "12.5px",
              fontWeight: 600,
              cursor:
                ready && !chat.isStreaming && online
                  ? "pointer"
                  : "not-allowed",
              transition: "background 120ms ease, transform 120ms ease",
              "&:hover": {
                background:
                  ready && !chat.isStreaming && online
                    ? foto.accent.deep
                    : foto.surfaces.inset,
                transform:
                  ready && !chat.isStreaming && online
                    ? "translateY(-1px)"
                    : "none",
              },
            }}
          >
            {chat.isStreaming ? "Revisando…" : "Revisar y guardar"}
            <ArrowRight size={13} strokeWidth={2} />
          </Box>
        </Box>
      )}
    </Box>
  );
}
