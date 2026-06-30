/**
 * Fotosynthia chat thread — local-first, SSE-streamed.
 *
 * - Messages live in localStorage (per-browser, last 30 turns).
 * - threadId is stable across reloads but resets on "Limpiar conversación".
 * - Each `send` posts to /api/fotosintesis-ai and consumes the SSE stream
 *   into the in-flight assistant message.
 * - Snapshot is owned by the caller — the hook is route-agnostic.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type {
  GuidedDraft,
  GuidedEnvelope,
  GuidedFlow,
} from "../copilot/flowSchemas";

const STORAGE_PREFIX = "tierra-madre-fotosynthia";

/**
 * Best-effort auth headers for the AI endpoint. The Google ID token stored at
 * sign-in (mirrors STORAGE_KEYS.GOOGLE_TOKEN) rides along as a Bearer so the
 * server can verify the caller's identity. It may be expired (the SPA doesn't
 * refresh it), so the server treats it as best-effort unless hard-auth is on.
 */
function aiRequestHeaders(): Record<string, string> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  try {
    const token =
      typeof window !== "undefined"
        ? window.localStorage.getItem("tierramadre-google-token")
        : null;
    if (token) headers.Authorization = `Bearer ${token}`;
  } catch {
    // localStorage unavailable — proceed without the token (best-effort).
  }
  return headers;
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  createdAt: string;
  /** Only set on the streaming bubble while bytes are arriving. */
  streaming?: boolean;
  error?: string;
}

interface ThreadState {
  threadId: string;
  messages: ChatMessage[];
  /** Route at thread start — used by Convex summaries. */
  routeAtStart: string;
  /** Guided mode: the flow locked in so far, persisted for accumulation. */
  flow?: GuidedFlow;
  /** Guided mode: the draft accumulated so far, persisted across reloads. */
  priorDraft?: GuidedDraft;
}

interface SendArgs {
  text: string;
  snapshot: unknown;
  route: string;
  userEmail?: string;
  userName?: string;
  model?: string;
}

/** Guided data-entry turn — returns a structured envelope instead of a stream. */
interface GuidedSendArgs extends SendArgs {
  /** { loteId, costoTotalCOP, unidadesDeclaradas, prepRemaining } when on a lot. */
  loteContext?: unknown;
  /** [{ itemId, nombre, loteId }] so the model's itemHint can be resolved. */
  candidateItems?: unknown;
  /** Caller role — scopes the server's navigation catalog (untrusted server-side). */
  accessLevel?: string;
}

export interface UseFotosynthiaChatResult {
  threadId: string;
  messages: ChatMessage[];
  isStreaming: boolean;
  send: (args: SendArgs) => Promise<void>;
  /** Guided data-entry turn. Populates `latestEnvelope`. */
  sendGuided: (args: GuidedSendArgs) => Promise<void>;
  /**
   * Re-run the last guided turn in place — reuses the failed assistant bubble
   * (no duplicate user message). No-op if nothing failed or a turn is in flight.
   */
  retryLast: () => void;
  /** The structured result of the last guided turn (flow, draft, missing, ready). */
  latestEnvelope: GuidedEnvelope | null;
  /** Clear the guided envelope + accumulation (call after a successful hand-off). */
  clearEnvelope: () => void;
  /**
   * Dismiss ONLY the last envelope (its commit card) and return to editing —
   * the accumulated `flow` + `priorDraft` are preserved, so the canvas stays
   * populated. Use for a draft-preserving "back to edit" / Cancelar on the
   * pre-commit card; use {@link clearEnvelope} for a true discard-everything.
   */
  dismissEnvelope: () => void;
  reset: () => void;
  cancel: () => void;
  /**
   * The accumulated guided draft (slots), the single source of truth shared
   * with the workbench canvas. Persisted across reloads.
   */
  priorDraft: GuidedDraft | undefined;
  /** The locked-in flow so far. */
  flow: GuidedFlow | undefined;
  /**
   * Merge a manual canvas edit into the accumulated draft. Auto-persists and
   * rides the next `sendGuided` (the server re-hardens). `origin` is reserved
   * for future provenance/merge policy and currently unused.
   */
  patchDraft: (patch: GuidedDraft, origin?: "human" | "copilot") => void;
  /**
   * Keys filled by the most recent guided turn — drives the workbench's
   * field-fill highlight. Cleared ~1.2s after each turn.
   */
  recentlyFilledKeys: string[];
}

const MAX_HISTORY = 30;

function generateThreadId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `thread_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

function generateMessageId(): string {
  return `msg_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function loadState(initialRoute: string): ThreadState {
  if (typeof window === "undefined") {
    return {
      threadId: generateThreadId(),
      messages: [],
      routeAtStart: initialRoute,
    };
  }
  try {
    const raw = window.localStorage.getItem(`${STORAGE_PREFIX}/thread`);
    if (raw) {
      const parsed = JSON.parse(raw) as ThreadState;
      if (parsed.threadId && Array.isArray(parsed.messages)) {
        // A persisted `streaming:true` bubble (tab closed / navigated Back
        // mid-turn) would otherwise show perpetual typing dots on reload —
        // clear the flag here. An assistant turn that was aborted before any
        // bytes arrived leaves a dead EMPTY bubble (no content, no error); drop
        // it so re-entering the workbench never shows a stranded blank turn (M5).
        return {
          ...parsed,
          messages: parsed.messages
            .map((m) => (m.streaming ? { ...m, streaming: false } : m))
            .filter(
              (m) => !(m.role === "assistant" && !m.content.trim() && !m.error),
            ),
        };
      }
    }
  } catch {
    // ignore corrupt state
  }
  const fresh: ThreadState = {
    threadId: generateThreadId(),
    messages: [],
    routeAtStart: initialRoute,
  };
  try {
    window.localStorage.setItem(
      `${STORAGE_PREFIX}/thread`,
      JSON.stringify(fresh),
    );
  } catch {
    // localStorage may be full / unavailable; chat still works in-memory.
  }
  return fresh;
}

function persistState(state: ThreadState): void {
  if (typeof window === "undefined") return;
  try {
    const trimmed: ThreadState = {
      ...state,
      messages: state.messages.slice(-MAX_HISTORY),
    };
    window.localStorage.setItem(
      `${STORAGE_PREFIX}/thread`,
      JSON.stringify(trimmed),
    );
  } catch {
    // ignore quota errors
  }
}

export function useFotosynthiaChat(
  initialRoute: string,
): UseFotosynthiaChatResult {
  const [state, setState] = useState<ThreadState>(() =>
    loadState(initialRoute),
  );
  const [isStreaming, setIsStreaming] = useState(false);
  const [latestEnvelope, setLatestEnvelope] = useState<GuidedEnvelope | null>(
    null,
  );
  const [recentlyFilledKeys, setRecentlyFilledKeys] = useState<string[]>([]);
  const abortRef = useRef<AbortController | null>(null);
  /** False once the hook unmounts — guards post-await setState (M5). */
  const mountedRef = useRef(true);
  /** Args of the last guided turn — replayed verbatim by `retryLast`. */
  const lastGuidedArgsRef = useRef<GuidedSendArgs | null>(null);

  useEffect(() => {
    persistState(state);
  }, [state]);

  // Abort any in-flight request if the hook unmounts mid-turn (e.g. navigating
  // away from the workbench) — otherwise the response races a dead component.
  // The mounted flag lets the abort handler skip its setState cleanly.
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      abortRef.current?.abort();
      abortRef.current = null;
    };
  }, []);

  // The field-fill highlight is a one-shot pulse: clear the just-filled keys a
  // beat after each guided turn so the canvas stops flashing.
  useEffect(() => {
    if (recentlyFilledKeys.length === 0) return;
    const t = setTimeout(() => setRecentlyFilledKeys([]), 1200);
    return () => clearTimeout(t);
  }, [recentlyFilledKeys]);

  const patchDraft = useCallback(
    (patch: GuidedDraft, _origin?: "human" | "copilot") => {
      void _origin; // reserved for future provenance/merge policy
      setState((prev) => ({
        ...prev,
        priorDraft: { ...(prev.priorDraft ?? {}), ...patch },
      }));
    },
    [],
  );

  const reset = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    setIsStreaming(false);
    setLatestEnvelope(null);
    setState({
      threadId: generateThreadId(),
      messages: [],
      routeAtStart: initialRoute,
    });
  }, [initialRoute]);

  const clearEnvelope = useCallback(() => {
    setLatestEnvelope(null);
    setState((prev) => ({ ...prev, flow: undefined, priorDraft: undefined }));
  }, []);

  // Back-to-edit: drop the commit card (envelope) but KEEP flow + priorDraft so
  // the canvas the operator was filling stays intact (H1 — Cancelar must not
  // wipe the captured values).
  const dismissEnvelope = useCallback(() => {
    setLatestEnvelope(null);
  }, []);

  const cancel = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    setIsStreaming(false);
    setState((prev) => ({
      ...prev,
      messages: prev.messages.map((m) =>
        m.streaming ? { ...m, streaming: false } : m,
      ),
    }));
  }, []);

  const send = useCallback(
    async ({ text, snapshot, route, userEmail, userName, model }: SendArgs) => {
      const trimmed = text.trim();
      if (!trimmed || isStreaming) return;

      const userMessage: ChatMessage = {
        id: generateMessageId(),
        role: "user",
        content: trimmed,
        createdAt: new Date().toISOString(),
      };
      const assistantPlaceholder: ChatMessage = {
        id: generateMessageId(),
        role: "assistant",
        content: "",
        createdAt: new Date().toISOString(),
        streaming: true,
      };

      const baseMessages = state.messages.concat(userMessage);
      const wireMessages = baseMessages.map((m) => ({
        role: m.role,
        content: m.content,
      }));

      setState((prev) => ({
        ...prev,
        messages: prev.messages.concat(userMessage, assistantPlaceholder),
      }));
      setIsStreaming(true);

      const controller = new AbortController();
      abortRef.current = controller;

      try {
        const response = await fetch("/api/fotosintesis-ai", {
          method: "POST",
          headers: aiRequestHeaders(),
          body: JSON.stringify({
            messages: wireMessages,
            snapshot,
            route,
            userEmail,
            userName,
            threadId: state.threadId,
            routeAtStart: state.routeAtStart,
            model,
          }),
          signal: controller.signal,
        });

        if (!response.ok || !response.body) {
          const text = await response.text().catch(() => "");
          throw new Error(
            text ||
              `Fotosynthia respondió ${response.status} sin cuerpo legible.`,
          );
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";

        while (true) {
          const { value, done } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const frames = buffer.split("\n\n");
          buffer = frames.pop() ?? "";

          for (const frame of frames) {
            const line = frame.trim();
            if (!line.startsWith("data:")) continue;
            const payload = line.slice(5).trim();
            if (!payload) continue;
            let parsed: {
              delta?: string;
              done?: boolean;
              error?: string;
            };
            try {
              parsed = JSON.parse(payload);
            } catch {
              continue;
            }
            if (parsed.error) {
              throw new Error(parsed.error);
            }
            if (parsed.delta) {
              const deltaText = parsed.delta;
              setState((prev) => ({
                ...prev,
                messages: prev.messages.map((m) =>
                  m.id === assistantPlaceholder.id
                    ? { ...m, content: m.content + deltaText }
                    : m,
                ),
              }));
            }
            if (parsed.done) {
              setState((prev) => ({
                ...prev,
                messages: prev.messages.map((m) =>
                  m.id === assistantPlaceholder.id
                    ? { ...m, streaming: false }
                    : m,
                ),
              }));
            }
          }
        }
        setState((prev) => ({
          ...prev,
          messages: prev.messages.map((m) =>
            m.id === assistantPlaceholder.id ? { ...m, streaming: false } : m,
          ),
        }));
      } catch (err) {
        if ((err as { name?: string }).name === "AbortError") {
          // Unmounted mid-turn (navigated away) → skip the write; the bubble is
          // never persisted as a dead empty turn (M5). Still-mounted (Stop) →
          // surface the cancellation in place.
          if (!mountedRef.current) return;
          setState((prev) => ({
            ...prev,
            messages: prev.messages.map((m) =>
              m.id === assistantPlaceholder.id
                ? {
                    ...m,
                    streaming: false,
                    content:
                      m.content || "(respuesta cancelada por el usuario)",
                  }
                : m,
            ),
          }));
        } else {
          const message =
            err instanceof Error
              ? err.message
              : "Algo falló hablando con Fotosynthia.";
          setState((prev) => ({
            ...prev,
            messages: prev.messages.map((m) =>
              m.id === assistantPlaceholder.id
                ? { ...m, streaming: false, error: message }
                : m,
            ),
          }));
        }
      } finally {
        setIsStreaming(false);
        abortRef.current = null;
      }
    },
    [isStreaming, state.messages, state.routeAtStart, state.threadId],
  );

  // Shared guided request: posts the wire transcript, folds the resulting
  // envelope (or error) into the target assistant bubble. Used by both the
  // first attempt (`sendGuided`) and the in-place replay (`retryLast`).
  const performGuided = useCallback(
    async (
      args: GuidedSendArgs,
      wireMessages: Array<{ role: string; content: string }>,
      assistantId: string,
    ) => {
      setIsStreaming(true);
      const controller = new AbortController();
      abortRef.current = controller;

      try {
        const response = await fetch("/api/fotosintesis-ai", {
          method: "POST",
          headers: aiRequestHeaders(),
          body: JSON.stringify({
            messages: wireMessages,
            snapshot: args.snapshot,
            route: args.route,
            userEmail: args.userEmail,
            userName: args.userName,
            threadId: state.threadId,
            routeAtStart: state.routeAtStart,
            model: args.model,
            mode: "guided",
            flow: state.flow,
            priorDraft: state.priorDraft,
            loteContext: args.loteContext,
            candidateItems: args.candidateItems,
            accessLevel: args.accessLevel,
          }),
          signal: controller.signal,
        });

        if (!response.ok) {
          const text = await response.text().catch(() => "");
          throw new Error(
            text || `Fotosynthia respondió ${response.status} sin cuerpo.`,
          );
        }

        const envelope = (await response.json()) as GuidedEnvelope;
        setLatestEnvelope(envelope);
        // `sentDraft` is exactly what this turn was built on (the closure value
        // posted to the server); `aiDraft` is the server's re-proposed draft.
        const sentDraft = (state.priorDraft ?? {}) as GuidedDraft;
        const aiDraft = (envelope.draft ?? {}) as GuidedDraft;
        setState((prev) => {
          // Human-wins merge (M1): any field the operator changed in the canvas
          // AFTER this turn was sent — i.e. while it streamed — is re-applied on
          // top of the AI draft, so a value typed mid-turn is never silently
          // overwritten. `prev.priorDraft` is the latest (it already folded in
          // those mid-flight patchDraft edits); `sentDraft` is the baseline.
          const latest = (prev.priorDraft ?? {}) as GuidedDraft;
          const merged: GuidedDraft = { ...aiDraft };
          for (const key of Object.keys(latest)) {
            if (
              JSON.stringify(latest[key]) !== JSON.stringify(sentDraft[key])
            ) {
              merged[key] = latest[key];
            }
          }
          return {
            ...prev,
            flow: envelope.flow,
            // Persist the accumulated draft so the next turn continues from it.
            priorDraft: merged,
            messages: prev.messages.map((m) =>
              m.id === assistantId
                ? {
                    ...m,
                    streaming: false,
                    error: undefined,
                    content: envelope.say,
                  }
                : m,
            ),
          };
        });
        // Flash the keys the AI actually changed this turn (vs. what was sent)
        // so the canvas highlights the freshly-filled slots.
        setRecentlyFilledKeys(
          Object.keys(aiDraft).filter(
            (k) => JSON.stringify(aiDraft[k]) !== JSON.stringify(sentDraft[k]),
          ),
        );
      } catch (err) {
        if ((err as { name?: string }).name === "AbortError") {
          // Unmounted mid-turn (navigated Back) → skip the write so the empty
          // assistant bubble is never persisted; loadState drops it on re-entry
          // (M5). Still-mounted (Stop) → mark the bubble as cancelled in place.
          if (!mountedRef.current) return;
          setState((prev) => ({
            ...prev,
            messages: prev.messages.map((m) =>
              m.id === assistantId
                ? {
                    ...m,
                    streaming: false,
                    content: m.content || "(consulta cancelada)",
                  }
                : m,
            ),
          }));
        } else {
          const message =
            err instanceof Error
              ? err.message
              : "Algo falló hablando con Fotosynthia.";
          setState((prev) => ({
            ...prev,
            messages: prev.messages.map((m) =>
              m.id === assistantId
                ? { ...m, streaming: false, error: message }
                : m,
            ),
          }));
        }
      } finally {
        setIsStreaming(false);
        abortRef.current = null;
      }
    },
    [state.flow, state.priorDraft, state.routeAtStart, state.threadId],
  );

  const sendGuided = useCallback(
    async (args: GuidedSendArgs) => {
      const trimmed = args.text.trim();
      if (!trimmed || isStreaming) return;
      lastGuidedArgsRef.current = args;

      const userMessage: ChatMessage = {
        id: generateMessageId(),
        role: "user",
        content: trimmed,
        createdAt: new Date().toISOString(),
      };
      const assistantPlaceholder: ChatMessage = {
        id: generateMessageId(),
        role: "assistant",
        content: "",
        createdAt: new Date().toISOString(),
        streaming: true,
      };

      const wireMessages = state.messages
        .concat(userMessage)
        .map((m) => ({ role: m.role, content: m.content }));

      setState((prev) => ({
        ...prev,
        messages: prev.messages.concat(userMessage, assistantPlaceholder),
      }));

      await performGuided(args, wireMessages, assistantPlaceholder.id);
    },
    [isStreaming, state.messages, performGuided],
  );

  const retryLast = useCallback(() => {
    if (isStreaming) return;
    const args = lastGuidedArgsRef.current;
    if (!args) return;

    // Find the most recent assistant bubble that errored out.
    const msgs = state.messages;
    let idx = -1;
    for (let i = msgs.length - 1; i >= 0; i--) {
      if (msgs[i].role === "assistant" && msgs[i].error) {
        idx = i;
        break;
      }
    }
    if (idx === -1) return;

    const assistantId = msgs[idx].id;
    // Replay the transcript that preceded the failed bubble (history + the
    // user turn at idx-1), reusing the same bubble instead of appending.
    const wireMessages = msgs
      .slice(0, idx)
      .map((m) => ({ role: m.role, content: m.content }));

    setState((prev) => ({
      ...prev,
      messages: prev.messages.map((m) =>
        m.id === assistantId
          ? { ...m, streaming: true, error: undefined, content: "" }
          : m,
      ),
    }));

    void performGuided(args, wireMessages, assistantId);
  }, [isStreaming, state.messages, performGuided]);

  return useMemo(
    () => ({
      threadId: state.threadId,
      messages: state.messages,
      isStreaming,
      send,
      sendGuided,
      retryLast,
      latestEnvelope,
      clearEnvelope,
      dismissEnvelope,
      reset,
      cancel,
      priorDraft: state.priorDraft,
      flow: state.flow,
      patchDraft,
      recentlyFilledKeys,
    }),
    [
      cancel,
      clearEnvelope,
      dismissEnvelope,
      isStreaming,
      latestEnvelope,
      patchDraft,
      recentlyFilledKeys,
      reset,
      retryLast,
      send,
      sendGuided,
      state.flow,
      state.messages,
      state.priorDraft,
      state.threadId,
    ],
  );
}
