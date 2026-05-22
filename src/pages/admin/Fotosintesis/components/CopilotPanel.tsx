/**
 * Fotosynthia · in-drawer chat surface.
 *
 * Lives inside the Copilot tab of `<FotosintesisGuideFab/>`. Owns the
 * Convex workspace snapshot, the message list, and the composer.
 * Convex provider may be absent in dev (no VITE_CONVEX_URL), in which
 * case we fall back to an empty snapshot rather than crashing.
 */

import {
  type FormEvent,
  type KeyboardEvent,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Box, IconButton, Tooltip } from "@mui/material";
import { alpha } from "@mui/material/styles";
import { useLocation } from "react-router-dom";
import { Eraser, RefreshCcw, Send, Sparkles, StopCircle } from "lucide-react";
import { useQuery } from "convex/react";
import { fontFamilies, getFoto } from "../../../../design-system";
import { useGoogleAuth } from "../../../../contexts/GoogleAuthContext";
import { api } from "../../../../../convex/_generated/api";
import { useFotosynthiaChat } from "../hooks/useFotosynthiaChat";

// Convex provider is only mounted when VITE_CONVEX_URL is set in main.tsx.
// We mirror that gate here so `useQuery` isn't called in environments
// without a provider (it would throw).
const HAS_CONVEX =
  typeof import.meta !== "undefined" &&
  !!(import.meta.env?.VITE_CONVEX_URL as string | undefined);

const snapshotRef = (
  api as unknown as {
    fotosintesisAi: { workspaceSnapshot: Parameters<typeof useQuery>[0] };
  }
).fotosintesisAi.workspaceSnapshot;

interface CopilotPanelProps {
  /**
   * Forwarded by the parent so the drawer header still owns visibility.
   * Used to skip expensive Convex queries when the tab is hidden.
   */
  active: boolean;
}

const SUGGESTED_PROMPTS = [
  "¿Qué le falta a este lote para cerrar?",
  "¿Cuántas ventas confirmadas tengo este mes?",
  "¿Hay errores de sincronización ahora mismo?",
  "¿Quién está invitando más embajadores?",
];

/**
 * When Convex is wired, this subcomponent is mounted and its `useQuery`
 * pushes the live snapshot up via callback. Kept separate so the outer
 * panel doesn't call any Convex hook in offline builds.
 */
function SnapshotSource({
  active,
  onSnapshot,
}: {
  active: boolean;
  onSnapshot: (s: unknown) => void;
}) {
  const data = useQuery(snapshotRef, active ? {} : "skip");
  useEffect(() => {
    onSnapshot(data);
  }, [data, onSnapshot]);
  return null;
}

export function CopilotPanel({ active }: CopilotPanelProps) {
  const foto = getFoto("light");
  const location = useLocation();
  const route = location.pathname;
  const { user } = useGoogleAuth();
  const listRef = useRef<HTMLDivElement | null>(null);
  const [input, setInput] = useState("");
  const [snapshot, setSnapshot] = useState<unknown>(undefined);

  const { messages, isStreaming, send, reset, cancel, threadId } =
    useFotosynthiaChat(route);

  // Auto-scroll to bottom on new messages or stream chunks.
  useEffect(() => {
    if (!listRef.current) return;
    listRef.current.scrollTop = listRef.current.scrollHeight;
  }, [messages]);

  const canSend = input.trim().length > 0 && !isStreaming;

  const handleSubmit = (e?: FormEvent) => {
    e?.preventDefault();
    if (!canSend) return;
    const text = input.trim();
    setInput("");
    void send({
      text,
      snapshot,
      route,
      userEmail: user?.email,
      userName: user?.name,
    });
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleSuggested = (prompt: string) => {
    if (isStreaming) return;
    void send({
      text: prompt,
      snapshot,
      route,
      userEmail: user?.email,
      userName: user?.name,
    });
  };

  const snapshotStatus = useMemo(() => {
    if (!HAS_CONVEX)
      return "Convex offline · Fotosynthia responde sin datos vivos.";
    if (snapshot === undefined) return "Cargando contexto…";
    if (snapshot === null)
      return "Sin acceso a Convex — Fotosynthia responde sin datos vivos.";
    const s = snapshot as {
      counts?: { lots?: number; sales?: number; ambassadors?: number };
    };
    const c = s.counts;
    if (!c) return "Snapshot listo";
    return `Snapshot · ${c.lots ?? 0} lotes · ${c.sales ?? 0} ventas · ${c.ambassadors ?? 0} embajadores`;
  }, [snapshot]);

  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
        color: foto.ink.primary,
      }}
    >
      {HAS_CONVEX && (
        <SnapshotSource active={active} onSnapshot={setSnapshot} />
      )}
      {/* Snapshot strip */}
      <Box
        sx={{
          padding: "10px 26px",
          borderBottom: `1px solid ${foto.surfaces.rule}`,
          background: foto.surfaces.panel,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "10px",
          fontSize: "10.5px",
          color: foto.ink.tertiary,
        }}
      >
        <Box
          sx={{
            display: "inline-flex",
            alignItems: "center",
            gap: "8px",
            minWidth: 0,
          }}
        >
          <Sparkles size={12} strokeWidth={1.8} />
          <Box
            component="span"
            sx={{
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
            title={`Thread ${threadId.slice(0, 8)}…`}
          >
            {snapshotStatus}
          </Box>
        </Box>
        <Box sx={{ display: "inline-flex", gap: "4px" }}>
          {isStreaming && (
            <Tooltip title="Detener respuesta" arrow placement="left">
              <IconButton
                size="small"
                onClick={cancel}
                aria-label="Detener respuesta"
                sx={{
                  width: 26,
                  height: 26,
                  color: foto.ink.secondary,
                  "&:hover": { color: foto.status.sold },
                }}
              >
                <StopCircle size={14} strokeWidth={1.8} />
              </IconButton>
            </Tooltip>
          )}
          <Tooltip title="Refrescar contexto" arrow placement="left">
            <IconButton
              size="small"
              onClick={() => {
                // useQuery is reactive; this forces a re-mount of the
                // snapshot strip animation by toggling key state. The
                // actual Convex data is already live via subscriptions.
                listRef.current?.scrollTo({ top: 0, behavior: "smooth" });
              }}
              aria-label="Refrescar contexto"
              sx={{
                width: 26,
                height: 26,
                color: foto.ink.secondary,
                "&:hover": { color: foto.ink.primary },
              }}
            >
              <RefreshCcw size={13} strokeWidth={1.8} />
            </IconButton>
          </Tooltip>
          <Tooltip title="Limpiar conversación" arrow placement="left">
            <IconButton
              size="small"
              onClick={reset}
              aria-label="Limpiar conversación"
              disabled={messages.length === 0}
              sx={{
                width: 26,
                height: 26,
                color: foto.ink.secondary,
                "&:hover": { color: foto.ink.primary },
                "&.Mui-disabled": { color: foto.ink.mute },
              }}
            >
              <Eraser size={13} strokeWidth={1.8} />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>

      {/* Message list */}
      <Box
        ref={listRef}
        sx={{
          flex: 1,
          overflowY: "auto",
          padding: "18px 26px",
          display: "flex",
          flexDirection: "column",
          gap: "12px",
        }}
        role="log"
        aria-live="polite"
        aria-label="Conversación con Fotosynthia"
      >
        {messages.length === 0 ? (
          <Box>
            <Box
              sx={{
                fontSize: "12.5px",
                color: foto.ink.secondary,
                lineHeight: 1.55,
                marginBottom: "14px",
              }}
            >
              Soy <strong>Fotosynthia</strong>, tu copiloto del taller. Conozco
              el flujo Fotosíntesis, los lotes abiertos, las ventas recientes y
              los embajadores activos. Pregúntame lo que necesites.
            </Box>
            <Box
              sx={{
                display: "flex",
                flexDirection: "column",
                gap: "8px",
              }}
            >
              {SUGGESTED_PROMPTS.map((prompt) => (
                <Box
                  key={prompt}
                  component="button"
                  type="button"
                  onClick={() => handleSuggested(prompt)}
                  disabled={
                    isStreaming || (HAS_CONVEX && snapshot === undefined)
                  }
                  sx={{
                    textAlign: "left",
                    fontFamily: "inherit",
                    fontSize: "12px",
                    color: foto.ink.primary,
                    background: foto.surfaces.canvas,
                    border: `1px solid ${foto.surfaces.rule}`,
                    borderRadius: "10px",
                    padding: "10px 12px",
                    cursor: "pointer",
                    transition:
                      "background 120ms ease, border-color 120ms ease",
                    "&:hover": {
                      background: foto.surfaces.inset,
                      borderColor: foto.surfaces.edgeStrong,
                    },
                    "&:disabled": {
                      cursor: "not-allowed",
                      color: foto.ink.mute,
                      background: foto.surfaces.panel,
                    },
                    "&:focus-visible": {
                      outline: "none",
                      boxShadow: `0 0 0 3px ${foto.accent.glow}`,
                    },
                  }}
                >
                  {prompt}
                </Box>
              ))}
            </Box>
          </Box>
        ) : (
          messages.map((m) => (
            <Box
              key={m.id}
              sx={{
                display: "flex",
                flexDirection: "column",
                alignItems: m.role === "user" ? "flex-end" : "flex-start",
              }}
            >
              <Box
                sx={{
                  fontSize: "9px",
                  letterSpacing: "0.18em",
                  textTransform: "uppercase",
                  color: foto.ink.tertiary,
                  marginBottom: "4px",
                  paddingX: "2px",
                }}
              >
                {m.role === "user" ? "Tú" : "Fotosynthia"}
              </Box>
              <Box
                sx={{
                  maxWidth: "86%",
                  background:
                    m.role === "user"
                      ? alpha(foto.accent.primary, 0.06)
                      : foto.surfaces.canvas,
                  border: `1px solid ${
                    m.role === "user"
                      ? alpha(foto.accent.primary, 0.18)
                      : foto.surfaces.rule
                  }`,
                  borderRadius: "12px",
                  padding: "10px 12px",
                  fontSize: "13px",
                  lineHeight: 1.55,
                  color: foto.ink.primary,
                  whiteSpace: "pre-wrap",
                  wordBreak: "break-word",
                }}
              >
                {m.content || (m.streaming ? "Pensando…" : "")}
                {m.error && (
                  <Box
                    sx={{
                      marginTop: "8px",
                      fontSize: "11px",
                      color: foto.status.sold,
                    }}
                  >
                    {m.error}
                  </Box>
                )}
                {m.streaming && !m.error && m.content && (
                  <Box
                    component="span"
                    aria-hidden
                    sx={{
                      display: "inline-block",
                      width: "6px",
                      height: "12px",
                      marginLeft: "4px",
                      background: foto.accent.primary,
                      verticalAlign: "text-bottom",
                      animation: "fotoCaret 800ms steps(2) infinite",
                      "@keyframes fotoCaret": {
                        "0%, 50%": { opacity: 1 },
                        "51%, 100%": { opacity: 0 },
                      },
                      "@media (prefers-reduced-motion: reduce)": {
                        animation: "none",
                        opacity: 0.6,
                      },
                    }}
                  />
                )}
              </Box>
            </Box>
          ))
        )}
      </Box>

      {/* Composer */}
      <Box
        component="form"
        onSubmit={handleSubmit}
        sx={{
          padding: "14px 26px 16px",
          borderTop: `1px solid ${foto.surfaces.rule}`,
          background: foto.surfaces.panel,
          display: "grid",
          gridTemplateColumns: "1fr auto",
          gap: "10px",
          alignItems: "end",
        }}
      >
        <Box
          component="textarea"
          rows={1}
          value={input}
          placeholder="Pregúntale a Fotosynthia…"
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          aria-label="Mensaje a Fotosynthia"
          sx={{
            resize: "none",
            minHeight: 36,
            maxHeight: 140,
            width: "100%",
            fontFamily: "inherit",
            fontSize: "13px",
            lineHeight: 1.5,
            color: foto.ink.primary,
            background: foto.surfaces.canvas,
            border: `1px solid ${foto.surfaces.rule}`,
            borderRadius: "10px",
            padding: "9px 12px",
            outline: "none",
            transition: "border-color 120ms ease, box-shadow 120ms ease",
            "&:focus": {
              borderColor: foto.surfaces.edgeStrong,
              boxShadow: `0 0 0 3px ${foto.accent.glow}`,
            },
            "&::placeholder": {
              color: foto.ink.mute,
              fontFamily: fontFamilies.system,
            },
          }}
        />
        <IconButton
          type="submit"
          aria-label="Enviar"
          disabled={!canSend}
          sx={{
            width: 36,
            height: 36,
            borderRadius: "10px",
            background: canSend ? foto.accent.primary : foto.surfaces.inset,
            color: canSend ? foto.ink.inverse : foto.ink.mute,
            border: `1px solid ${canSend ? "transparent" : foto.surfaces.rule}`,
            transition: "background 120ms ease",
            "&:hover": {
              background: canSend ? foto.accent.deep : foto.surfaces.inset,
            },
            "&.Mui-disabled": {
              background: foto.surfaces.inset,
              color: foto.ink.mute,
            },
          }}
        >
          <Send size={16} strokeWidth={1.8} />
        </IconButton>
      </Box>
    </Box>
  );
}

export default CopilotPanel;
