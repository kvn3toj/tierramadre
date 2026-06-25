/**
 * Fotosynthia v2 · guided-capture + navigation surface.
 *
 * The chat body of the docked Copilot rail (`<CopilotRail/>`). Maritza states
 * what she wants in plain language; Fotosynthia classifies the intent, runs a
 * short interview (asking only what it can't infer), and on `ready` shows a
 * review card that pre-fills the matching form — the AI never writes; she
 * reviews and clicks the form's own Guardar/Confirmar.
 *
 * Owns the Convex workspace snapshot, the message list, the review card, and
 * the composer. Convex may be absent in dev (no VITE_CONVEX_URL), in which
 * case the snapshot is empty and the interview just asks for more fields.
 */

import {
  type FormEvent,
  type KeyboardEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Box, IconButton, Tooltip } from "@mui/material";
import { alpha, keyframes } from "@mui/material/styles";
import { useLocation, useNavigate } from "react-router-dom";
import {
  AlertTriangle,
  ArrowRight,
  Compass,
  Eraser,
  RefreshCcw,
  RotateCcw,
  Send,
  Sparkles,
  StopCircle,
  WifiOff,
} from "lucide-react";
import { useQuery } from "convex/react";
import { fontFamilies, getFoto } from "../../../../design-system";
import { useGoogleAuth } from "../../../../contexts/GoogleAuthContext";
import { useAppNavigator } from "../../../../contexts/AppNavigatorContext";
import { api } from "../../../../../convex/_generated/api";
import { ITEM_SCAN_CAP } from "../../../../../convex/_lib/aiCaps";
import { useFotosynthiaChat } from "../hooks/useFotosynthiaChat";
import { useFotosintesisLayoutSafe } from "../FotosintesisLayoutContext";
import type {
  BatchEditPatch,
  GuidedFlow,
  NavigateAction,
} from "../copilot/flowSchemas";
import { resolveItemHint, hintMissMessage } from "../copilot/resolveItemHint";
import { buildPath, getRouteById } from "../../../../config/adminNavMap";
import { CopilotEmptyState } from "../copilot-rail/CopilotEmptyState";
import { CommitReviewCard } from "./CommitReviewCard";
import { CommitLogRow } from "./CommitLogRow";
import type { CommitEntity } from "../copilot/executeAction";
import { spanishText } from "../utils/fieldLang";

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

const FLOW_LABELS: Record<GuidedFlow, string> = {
  "item-gema": "Gema nueva",
  "item-joya": "Joya nueva",
  "item-insumo": "Insumo nuevo",
  lote: "Lote nuevo",
  venta: "Venta",
  provider: "Proveedor nuevo",
  client: "Cliente nuevo",
  "edit-existing": "Editar ítem",
  "batch-edit": "Edición múltiple",
  advisory: "Consulta",
};

const FIELD_LABELS: Record<string, string> = {
  nombre: "Nombre",
  peso: "Peso",
  color: "Color",
  calidad: "Calidad",
  procedencia: "Procedencia",
  preponderancia: "Preponderancia",
  precioPublicoCOP: "Precio público",
  cantidad: "Cantidad",
  tipoEsmeralda: "Tipo esmeralda",
  corte: "Corte",
  tipoJoya: "Tipo joya",
  tecnica: "Técnica",
  minerales: "Minerales",
  complementos: "Complementos",
  descripcion: "Descripción",
  categoria: "Categoría",
  sede: "Bóveda",
  providerName: "Proveedor",
  costoTotalCOP: "Costo total",
  unidadesDeclaradas: "Unidades",
  formaPago: "Forma de pago",
  metodoContado: "Método",
  renombreLote: "Renombre",
  mina: "Mina",
  pesoTotalQuilates: "Peso (ct)",
  itemId: "Ítem",
  compradorTipo: "Comprador",
  precioAcordado: "Precio acordado",
  nombreORazonSocial: "Razón social",
  tipo: "Tipo",
  documento: "Documento",
  direccion: "Dirección",
  telefono: "Teléfono",
  email: "Email",
};

const ITEM_FLOWS: ReadonlyArray<GuidedFlow> = [
  "item-gema",
  "item-joya",
  "item-insumo",
];

function fieldLabel(key: string): string {
  return FIELD_LABELS[key] ?? key;
}

function formatDraftValue(v: unknown): string {
  if (v === null || v === undefined || v === "") return "—";
  if (Array.isArray(v)) return v.length ? v.join(", ") : "—";
  if (typeof v === "object") {
    return (
      Object.entries(v as Record<string, unknown>)
        .filter(([, val]) => val !== undefined && val !== "")
        .map(([k, val]) => `${fieldLabel(k)}: ${String(val)}`)
        .join(" · ") || "—"
    );
  }
  if (typeof v === "number") return v.toLocaleString("es-CO");
  return String(v);
}

interface LoteContext {
  loteId: string;
  costoTotalCOP?: number;
  unidadesDeclaradas?: number;
}

interface CandidateItem {
  itemId: string;
  nombre?: string;
  loteId?: string;
}

// Shared with convex/fotosintesisAi.ts via convex/_lib/aiCaps (single source of
// truth): when the live snapshot holds fewer than this many lot-items it is the
// complete set, so an itemHint miss is a true not-found rather than "older than
// the recent-items window".
const CANDIDATE_ITEM_CAP = ITEM_SCAN_CAP;

// Three-dot "typing" pulse shown while a guided turn is in flight (the guided
// response is a single JSON payload, so the bubble has no streamed text yet).
const typingPulse = keyframes`
  0%, 80%, 100% { opacity: 0.25; transform: translateY(0); }
  40% { opacity: 1; transform: translateY(-2px); }
`;

function TypingDots({ color }: { color: string }) {
  return (
    <Box
      component="span"
      role="status"
      aria-label="Fotosynthia está escribiendo"
      sx={{
        display: "inline-flex",
        alignItems: "center",
        gap: "4px",
        height: "1.55em",
      }}
    >
      {[0, 1, 2].map((i) => (
        <Box
          key={i}
          component="span"
          aria-hidden
          sx={{
            width: 6,
            height: 6,
            borderRadius: "50%",
            background: color,
            animation: `${typingPulse} 1.2s ${i * 0.16}s infinite ease-in-out`,
            // Respect reduced-motion: hold dots steady instead of pulsing.
            "@media (prefers-reduced-motion: reduce)": {
              animation: "none",
              opacity: 0.5,
            },
          }}
        />
      ))}
    </Box>
  );
}

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
  const navigate = useNavigate();
  const route = location.pathname;
  const onFotoRoute = route.startsWith("/admin/fotosintesis");
  const { user } = useGoogleAuth();
  const layout = useFotosintesisLayoutSafe();
  const { accessLevel, navigateTo } = useAppNavigator();
  const listRef = useRef<HTMLDivElement | null>(null);
  const [input, setInput] = useState("");
  const [snapshot, setSnapshot] = useState<unknown>(undefined);

  // In-copilot approval log: each committed action, newest first, with its
  // Sheets-sync state. Session-scoped (the durable record lives in Convex).
  const [commitLog, setCommitLog] = useState<
    Array<{
      id: number;
      summary: string;
      syncsToSheet: boolean;
      entity?: CommitEntity;
    }>
  >([]);
  const commitSeq = useRef(0);
  const handleCommitted = useCallback(
    (entry: {
      kind: string;
      summary: string;
      syncsToSheet: boolean;
      entity?: CommitEntity;
    }) => {
      setCommitLog((prev) =>
        [
          {
            id: (commitSeq.current += 1),
            summary: entry.summary,
            syncsToSheet: entry.syncsToSheet,
            entity: entry.entity,
          },
          ...prev,
        ].slice(0, 5),
      );
    },
    [],
  );

  const {
    messages,
    isStreaming,
    sendGuided,
    retryLast,
    latestEnvelope,
    clearEnvelope,
    reset,
    cancel,
    threadId,
  } = useFotosynthiaChat(route);

  // Network awareness: block sending while offline (the request would only
  // fail and surface as an error) and tell Maritza why the composer is locked.
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

  // Auto-scroll to bottom on new messages or stream chunks.
  useEffect(() => {
    if (!listRef.current) return;
    listRef.current.scrollTop = listRef.current.scrollHeight;
  }, [messages, latestEnvelope]);

  // Focus the composer when the rail OPENS (active false→true), not on initial
  // mount — so an auto-opened rail on page load doesn't steal focus.
  const composerRef = useRef<HTMLTextAreaElement | null>(null);
  const prevActiveRef = useRef(active);
  useEffect(() => {
    if (active && !prevActiveRef.current) composerRef.current?.focus();
    prevActiveRef.current = active;
  }, [active]);

  // Live lot context from the current route + snapshot (lets the model infer
  // the target lot and avoid re-asking the cost/units).
  const loteContext = useMemo<LoteContext | undefined>(() => {
    const m = route.match(/^\/admin\/fotosintesis\/lots\/([^/]+)/);
    const seg = m?.[1];
    if (!seg || seg === "new") return undefined;
    const loteId = decodeURIComponent(seg);
    const lots = (snapshot as { recentLots?: Array<Record<string, unknown>> })
      ?.recentLots;
    const found = lots?.find((l) => l.loteId === loteId);
    return {
      loteId,
      ...(found
        ? {
            costoTotalCOP: found.costoTotalCOP as number | undefined,
            unidadesDeclaradas: found.unidadesDeclaradas as number | undefined,
          }
        : {}),
    };
  }, [route, snapshot]);

  const candidateItems = useMemo<CandidateItem[] | undefined>(() => {
    const items = (snapshot as { candidateItems?: CandidateItem[] })
      ?.candidateItems;
    return Array.isArray(items) ? items : undefined;
  }, [snapshot]);

  const canSend = input.trim().length > 0 && !isStreaming && online;

  // Chat-level error = the last turn ended in an error (vs. mid-history ones).
  const lastMessage = messages[messages.length - 1];
  const chatError =
    lastMessage && lastMessage.role === "assistant" && lastMessage.error
      ? lastMessage.error
      : null;

  const dispatchGuided = (text: string) => {
    void sendGuided({
      text,
      snapshot,
      route,
      userEmail: user?.email,
      userName: user?.name,
      loteContext,
      candidateItems,
      accessLevel,
    });
  };

  const handleSubmit = (e?: FormEvent) => {
    e?.preventDefault();
    if (!canSend) return;
    const text = input.trim();
    setInput("");
    dispatchGuided(text);
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleSuggested = (prompt: string) => {
    if (isStreaming || !online) return;
    dispatchGuided(prompt);
  };

  // ─── Hand-off planning ────────────────────────────────────────────
  // The panel computes the target route from the envelope + lot context; the
  // layout bus carries the draft and the form seeds itself on mount.
  const env = latestEnvelope;
  const showCard = !!env && env.flow !== "advisory";

  // A server-hardened, ready-to-commit action → the AI executes it directly on
  // one approval (the CommitReviewCard). `handoff`-mode actions (e.g. venta) and
  // actionless envelopes fall through to the existing form hand-off card below.
  const commitAction =
    env?.action && env.action.mode === "direct" && env.action.ready
      ? env.action
      : null;
  const commitCtx = useMemo(
    () => ({
      editorEmail: user?.email ?? "",
      operatorName: user?.name,
      activeLoteId: loteContext?.loteId,
      candidateItems,
    }),
    [user?.email, user?.name, loteContext?.loteId, candidateItems],
  );

  const handoff = useMemo(() => {
    if (!env || env.flow === "advisory") {
      return { kind: "none" as const };
    }
    if (env.flow === "batch-edit" || env.flow === "edit-existing") {
      const edits: BatchEditPatch[] =
        env.flow === "batch-edit"
          ? (env.edits ?? [])
          : (() => {
              const { itemHint, targetItemId, ...patch } = env.draft as Record<
                string,
                unknown
              >;
              return [
                {
                  itemHint: typeof itemHint === "string" ? itemHint : undefined,
                  targetItemId:
                    typeof targetItemId === "string" ? targetItemId : undefined,
                  patch,
                },
              ];
            })();
      // Find a lot to land on: current lot, else a resolved candidate's lot.
      let loteId = loteContext?.loteId;
      if (!loteId) {
        for (const e of edits) {
          const res = resolveItemHint(
            e.itemHint,
            candidateItems,
            CANDIDATE_ITEM_CAP,
          );
          if (res.status === "resolved" && res.item.loteId) {
            loteId = res.item.loteId;
            break;
          }
        }
      }
      if (edits.length === 0) return { kind: "none" as const };
      if (!loteId) {
        // No lot to land on: explain WHY (ambiguous / not-found / off-cap /
        // offline) so Maritza can recover instead of hitting a silent dead end.
        const firstHint = edits.find((e) => e.itemHint)?.itemHint;
        return {
          kind: "blocked" as const,
          reason: hintMissMessage(
            firstHint,
            resolveItemHint(firstHint, candidateItems, CANDIDATE_ITEM_CAP),
          ),
        };
      }
      return {
        kind: "batch" as const,
        edits,
        target: `/admin/fotosintesis/lots/${encodeURIComponent(loteId)}`,
      };
    }
    if (ITEM_FLOWS.includes(env.flow)) {
      const draft = { ...(env.draft as Record<string, unknown>) };
      const hint = typeof draft.loteId === "string" ? draft.loteId : undefined;
      delete draft.loteId; // routing-only — keep the form draft clean
      const loteId = hint || loteContext?.loteId;
      if (!loteId) {
        return {
          kind: "blocked" as const,
          reason: "Abrí o nombrá el lote para precargar el ítem.",
        };
      }
      return {
        kind: "form" as const,
        flow: env.flow,
        data: draft,
        target: `/admin/fotosintesis/lots/${encodeURIComponent(loteId)}`,
      };
    }
    if (env.flow === "lote") {
      return {
        kind: "form" as const,
        flow: env.flow,
        data: env.draft,
        target: "/admin/fotosintesis/lots/new",
      };
    }
    if (env.flow === "venta") {
      const itemId =
        typeof (env.draft as Record<string, unknown>).itemId === "string"
          ? (env.draft as Record<string, string>).itemId
          : undefined;
      return {
        kind: "form" as const,
        flow: env.flow,
        data: env.draft,
        target: itemId
          ? `/admin/fotosintesis/sales/new?itemId=${encodeURIComponent(itemId)}`
          : "/admin/fotosintesis/sales/new",
      };
    }
    if (env.flow === "provider") {
      // ProveedorNuevoDrawer lives on the new-lot page.
      return {
        kind: "form" as const,
        flow: env.flow,
        data: env.draft,
        target: "/admin/fotosintesis/lots/new",
      };
    }
    if (env.flow === "client") {
      // ClienteFinalForm lives on the new-sale page.
      return {
        kind: "form" as const,
        flow: env.flow,
        data: env.draft,
        target: "/admin/fotosintesis/sales/new",
      };
    }
    return { kind: "none" as const };
  }, [env, loteContext, candidateItems]);

  const canHandoff = !!env && env.ready && handoff.kind !== "blocked";

  const runHandoff = () => {
    if (!env || !env.ready) return;
    if (!layout) {
      // Off a /admin/fotosintesis/* route the capture bus isn't mounted. Route
      // INTO Fotosíntesis; the rail (and this envelope) persist, so the button
      // re-enables on arrival and seeds the form on the second click.
      if (handoff.kind === "form" || handoff.kind === "batch") {
        navigate(handoff.target);
      }
      return;
    }
    if (handoff.kind === "form") {
      layout.openDraftForm(handoff.flow, handoff.data, handoff.target);
      clearEnvelope();
    } else if (handoff.kind === "batch") {
      layout.enqueueEdits(handoff.edits);
      navigate(handoff.target);
      clearEnvelope();
    }
  };

  const handoffLabel = !layout
    ? "Ir a Fotosíntesis"
    : env?.flow === "batch-edit" || env?.flow === "edit-existing"
      ? "Aplicar ediciones"
      : "Abrir formulario";

  // ─── Natural-language navigation ──────────────────────────────────
  // The envelope may carry a server-validated `navigate`. Static routes arrive
  // ready; dynamic ones (item/sale by name) arrive with `needsParam` for the
  // client to resolve against the live candidate list. A clear single match
  // auto-routes; ambiguity surfaces a chip instead of a silent dead end.
  type NavPlan =
    | { kind: "ready"; action: NavigateAction; label: string }
    | { kind: "blocked"; label: string; message: string };

  const navPlan = useMemo<NavPlan | null>(() => {
    const nav = env?.navigate;
    if (!nav) return null;
    if (!nav.needsParam)
      return { kind: "ready", action: nav, label: nav.label };
    const entry = getRouteById(nav.routeId);
    if (!entry) return null;
    const needs = nav.needsParam;
    const spec = entry.params?.find((p) => p.name === needs.name);
    const hint = nav.params?.[needs.name];
    if (
      spec &&
      (spec.resolver === "itemId" ||
        spec.resolver === "lotItemId" ||
        spec.resolver === "saleId")
    ) {
      const res = resolveItemHint(hint, candidateItems, CANDIDATE_ITEM_CAP);
      if (res.status === "resolved") {
        const built = buildPath(entry, {
          ...(nav.params ?? {}),
          [spec.name]: res.item.itemId,
        });
        if (built) {
          return {
            kind: "ready",
            action: { ...nav, path: built, needsParam: undefined },
            label: nav.label,
          };
        }
      }
      return {
        kind: "blocked",
        label: nav.label,
        message: hintMissMessage(hint, res),
      };
    }
    return {
      kind: "blocked",
      label: nav.label,
      message: `Necesito ${needs.label} para abrir ${nav.label}.`,
    };
  }, [env, candidateItems]);

  // Auto-route a clear single match, once per envelope.
  const handledNavRef = useRef<unknown>(null);
  useEffect(() => {
    if (!env?.navigate || navPlan?.kind !== "ready") return;
    if (handledNavRef.current === env) return;
    handledNavRef.current = env;
    navigateTo(navPlan.action);
  }, [env, navPlan, navigateTo]);

  const snapshotStatus = useMemo(() => {
    if (!HAS_CONVEX)
      return "Convex offline · Fotosynthia responde sin datos vivos.";
    if (snapshot === undefined) return "Cargando contexto…";
    if (snapshot === null)
      return "Sin acceso a Convex — Fotosynthia responde sin datos vivos.";
    const s = snapshot as {
      counts?: { lots?: number; sales?: number; ambassadors?: number };
      syncErrors?: {
        lots?: number;
        sales?: number;
        providers?: number;
        clients?: number;
      };
    };
    const c = s.counts;
    if (!c) return "Snapshot listo";
    const base = `Snapshot · ${c.lots ?? 0} lotes · ${c.sales ?? 0} ventas · ${c.ambassadors ?? 0} embajadores`;
    // Surface sheet-sync health deterministically in the rail chrome instead of
    // relying on the model honoring the system-prompt rule to mention it.
    const e = s.syncErrors;
    const totalErr = e
      ? (e.lots ?? 0) + (e.sales ?? 0) + (e.providers ?? 0) + (e.clients ?? 0)
      : 0;
    return totalErr > 0
      ? `${base} · ⚠ ${totalErr} ${totalErr === 1 ? "error" : "errores"} de sync`
      : base;
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
        <SnapshotSource
          active={active && onFotoRoute}
          onSnapshot={setSnapshot}
        />
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
            <Tooltip title="Detener" arrow placement="left">
              <IconButton
                size="small"
                onClick={cancel}
                aria-label="Detener"
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
          <Tooltip title="Ir al inicio del hilo" arrow placement="left">
            <IconButton
              size="small"
              onClick={() => {
                listRef.current?.scrollTo({ top: 0, behavior: "smooth" });
              }}
              aria-label="Ir al inicio del hilo"
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
          <CopilotEmptyState
            onSuggested={handleSuggested}
            disabled={isStreaming || !online}
          />
        ) : (
          messages.map((m, idx) => {
            const isLast = idx === messages.length - 1;
            return (
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
                  {m.content ? (
                    m.content
                  ) : m.streaming ? (
                    <TypingDots color={foto.ink.tertiary} />
                  ) : null}
                  {/* Mid-history errors stay inline; the latest one is owned
                      by the rail-level band (which also offers Reintentar). */}
                  {m.error && !isLast && (
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
                </Box>
              </Box>
            );
          })
        )}
      </Box>

      {/* Navigation chip — confirms an auto-route or surfaces an unresolved hint */}
      {navPlan && (
        <Box
          sx={{
            margin: "0 18px 2px",
            display: "inline-flex",
            alignItems: "center",
            gap: "8px",
            padding: "9px 12px",
            borderRadius: "10px",
            border: `1px solid ${
              navPlan.kind === "ready"
                ? alpha(foto.accent.primary, 0.25)
                : foto.surfaces.rule
            }`,
            background:
              navPlan.kind === "ready" ? foto.accent.soft : foto.surfaces.panel,
            fontSize: "11.5px",
            lineHeight: 1.45,
            color:
              navPlan.kind === "ready" ? foto.accent.deep : foto.ink.secondary,
          }}
          role="status"
        >
          <Compass size={13} strokeWidth={2} />
          <Box component="span">
            {navPlan.kind === "ready"
              ? `Te llevé a ${navPlan.label}`
              : navPlan.message}
          </Box>
        </Box>
      )}

      {/* Direct-commit card — Fotosynthia executes the action on one approval. */}
      {commitAction && (
        <CommitReviewCard
          action={commitAction}
          ctx={commitCtx}
          online={online}
          onClose={clearEnvelope}
          onCommitted={handleCommitted}
        />
      )}

      {/* Approval log — what Fotosynthia committed this session + sync state */}
      {commitLog.length > 0 && (
        <Box
          sx={{
            margin: "0 18px 2px",
            display: "flex",
            flexDirection: "column",
            gap: "4px",
          }}
          aria-label="Acciones guardadas"
        >
          {commitLog.map((c) => (
            <CommitLogRow
              key={c.id}
              summary={c.summary}
              syncsToSheet={c.syncsToSheet}
              entity={c.entity}
            />
          ))}
        </Box>
      )}

      {/* Review card — pinned above the composer when a draft is in progress */}
      {showCard && env && !commitAction && (
        <Box
          sx={{
            margin: "0 18px",
            border: `1px solid ${foto.accent.primary}`,
            background: foto.accent.soft,
            borderRadius: "12px",
            padding: "12px 14px",
            display: "flex",
            flexDirection: "column",
            gap: "8px",
          }}
        >
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: "8px",
            }}
          >
            <Box
              sx={{
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                fontSize: "9px",
                fontWeight: 600,
                letterSpacing: "0.14em",
                textTransform: "uppercase",
                color: foto.accent.deep,
              }}
            >
              <Sparkles size={11} strokeWidth={2} />
              {FLOW_LABELS[env.flow]}
            </Box>
            {env.coercedKeys.length > 0 && (
              <Box
                sx={{
                  fontSize: "10px",
                  color: foto.ink.tertiary,
                }}
                title={`Ajustado al vocabulario: ${env.coercedKeys.join(", ")}`}
              >
                ⚠ {env.coercedKeys.length} ajuste
                {env.coercedKeys.length > 1 ? "s" : ""}
              </Box>
            )}
          </Box>

          {/* Batch-edit: numbered checklist preview */}
          {(env.flow === "batch-edit" || env.flow === "edit-existing") &&
          handoff.kind === "batch" ? (
            <Box
              component="ol"
              sx={{
                margin: 0,
                paddingLeft: "18px",
                display: "flex",
                flexDirection: "column",
                gap: "4px",
                fontSize: "11.5px",
                color: foto.ink.secondary,
              }}
            >
              {handoff.edits.map((e, i) => (
                <Box component="li" key={i}>
                  <strong>{e.itemHint ?? e.targetItemId ?? "ítem"}</strong>
                  {" → "}
                  {Object.entries(e.patch)
                    .map(([k, v]) => `${fieldLabel(k)}: ${formatDraftValue(v)}`)
                    .join(" · ")}
                </Box>
              ))}
            </Box>
          ) : (
            // Single-record drafts: field list
            <Box
              sx={{
                display: "grid",
                gridTemplateColumns: "auto 1fr",
                rowGap: "3px",
                columnGap: "10px",
                fontSize: "11.5px",
              }}
            >
              {Object.entries(env.draft as Record<string, unknown>)
                .filter(([k]) => k !== "loteId")
                .map(([k, v]) => (
                  <Box key={k} sx={{ display: "contents" }}>
                    <Box sx={{ color: foto.ink.tertiary }}>{fieldLabel(k)}</Box>
                    <Box
                      sx={{
                        color: env.coercedKeys.includes(k)
                          ? foto.accent.deep
                          : foto.ink.primary,
                        fontWeight: env.coercedKeys.includes(k) ? 600 : 400,
                      }}
                    >
                      {formatDraftValue(v)}
                      {env.coercedKeys.includes(k) ? " ⚠" : ""}
                    </Box>
                  </Box>
                ))}
            </Box>
          )}

          {env.missing.length > 0 && (
            <Box sx={{ fontSize: "10.5px", color: foto.ink.tertiary }}>
              Faltan: {env.missing.map(fieldLabel).join(", ")}
            </Box>
          )}

          {handoff.kind === "blocked" && (
            <Box sx={{ fontSize: "10.5px", color: foto.status.sold }}>
              {handoff.reason}
            </Box>
          )}

          {canHandoff && (
            <Box
              component="button"
              type="button"
              onClick={runHandoff}
              sx={{
                alignSelf: "flex-end",
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                border: "none",
                borderRadius: "9px",
                padding: "8px 14px",
                background: foto.accent.primary,
                color: foto.ink.inverse,
                fontSize: "12px",
                fontWeight: 600,
                cursor: "pointer",
                transition: "background 120ms ease, transform 120ms ease",
                "&:hover": {
                  background: foto.accent.deep,
                  transform: "translateY(-1px)",
                },
              }}
            >
              {handoffLabel}
              <ArrowRight size={13} strokeWidth={2} />
            </Box>
          )}
        </Box>
      )}

      {/* Rail-level error band — concise + actionable. The technical detail
          stays in the failed bubble above; this offers the retry affordance. */}
      {chatError && !isStreaming && (
        <Box
          role="alert"
          sx={{
            margin: "0 18px 2px",
            display: "flex",
            alignItems: "center",
            gap: "10px",
            padding: "9px 12px",
            borderRadius: "10px",
            border: `1px solid ${alpha(foto.status.sold, 0.35)}`,
            background: alpha(foto.status.sold, 0.06),
            fontSize: "11.5px",
            lineHeight: 1.4,
            color: foto.status.sold,
          }}
        >
          <AlertTriangle
            size={14}
            strokeWidth={2}
            style={{ flexShrink: 0 }}
            aria-hidden
          />
          <Box component="span" sx={{ flex: 1, minWidth: 0 }}>
            No pude completar el último mensaje.
          </Box>
          <Box
            component="button"
            type="button"
            onClick={retryLast}
            disabled={!online}
            sx={{
              display: "inline-flex",
              alignItems: "center",
              gap: "5px",
              flexShrink: 0,
              border: `1px solid ${alpha(foto.status.sold, 0.4)}`,
              borderRadius: "8px",
              padding: "5px 9px",
              background: "transparent",
              color: foto.status.sold,
              fontSize: "11px",
              fontWeight: 600,
              cursor: "pointer",
              transition: "background 120ms ease",
              "&:hover": { background: alpha(foto.status.sold, 0.1) },
              "&:disabled": {
                opacity: 0.5,
                cursor: "not-allowed",
                "&:hover": { background: "transparent" },
              },
            }}
          >
            <RotateCcw size={12} strokeWidth={2} aria-hidden />
            Reintentar
          </Box>
        </Box>
      )}

      {/* Offline band — explains why the composer is locked. */}
      {!online && (
        <Box
          role="status"
          sx={{
            margin: "0 18px 2px",
            display: "flex",
            alignItems: "center",
            gap: "9px",
            padding: "9px 12px",
            borderRadius: "10px",
            border: `1px solid ${foto.surfaces.rule}`,
            background: foto.surfaces.panel,
            fontSize: "11.5px",
            lineHeight: 1.4,
            color: foto.ink.secondary,
          }}
        >
          <WifiOff size={14} strokeWidth={2} aria-hidden />
          <Box component="span">
            Sin conexión — Fotosynthia espera a que vuelvas a estar en línea.
          </Box>
        </Box>
      )}

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
          ref={composerRef}
          rows={1}
          value={input}
          placeholder="Decile a Fotosynthia qué registrar o editar…"
          {...spanishText}
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
