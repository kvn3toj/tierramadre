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
}

interface UseFotosynthiaChatResult {
  threadId: string;
  messages: ChatMessage[];
  isStreaming: boolean;
  send: (args: SendArgs) => Promise<void>;
  /** Guided data-entry turn. Populates `latestEnvelope`. */
  sendGuided: (args: GuidedSendArgs) => Promise<void>;
  /** The structured result of the last guided turn (flow, draft, missing, ready). */
  latestEnvelope: GuidedEnvelope | null;
  /** Clear the guided envelope + accumulation (call after a successful hand-off). */
  clearEnvelope: () => void;
  reset: () => void;
  cancel: () => void;
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
        return parsed;
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
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    persistState(state);
  }, [state]);

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
          headers: { "Content-Type": "application/json" },
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

  const sendGuided = useCallback(
    async (args: GuidedSendArgs) => {
      const trimmed = args.text.trim();
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

      const wireMessages = state.messages
        .concat(userMessage)
        .map((m) => ({ role: m.role, content: m.content }));

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
          headers: { "Content-Type": "application/json" },
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
        setState((prev) => ({
          ...prev,
          flow: envelope.flow,
          // Persist the accumulated draft so the next turn continues from it
          // (batch-edit carries no merge — the model re-proposes the full list).
          priorDraft: envelope.draft,
          messages: prev.messages.map((m) =>
            m.id === assistantPlaceholder.id
              ? { ...m, streaming: false, content: envelope.say }
              : m,
          ),
        }));
      } catch (err) {
        if ((err as { name?: string }).name === "AbortError") {
          setState((prev) => ({
            ...prev,
            messages: prev.messages.map((m) =>
              m.id === assistantPlaceholder.id
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
    [
      isStreaming,
      state.flow,
      state.messages,
      state.priorDraft,
      state.routeAtStart,
      state.threadId,
    ],
  );

  return useMemo(
    () => ({
      threadId: state.threadId,
      messages: state.messages,
      isStreaming,
      send,
      sendGuided,
      latestEnvelope,
      clearEnvelope,
      reset,
      cancel,
    }),
    [
      cancel,
      clearEnvelope,
      isStreaming,
      latestEnvelope,
      reset,
      send,
      sendGuided,
      state.messages,
      state.threadId,
    ],
  );
}
