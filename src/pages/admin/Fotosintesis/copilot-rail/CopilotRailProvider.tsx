import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  CopilotRailContext,
  RAIL_DEFAULT_WIDTH,
  RAIL_DOCK_BREAKPOINT,
  RAIL_STORAGE,
  clampRailWidth,
  type RailMode,
} from "./CopilotRailContext";
import { useCopilotRailHotkeys } from "./useCopilotRailHotkeys";

const isBrowser = typeof window !== "undefined";

function readBool(key: string, fallback: boolean): boolean {
  if (!isBrowser) return fallback;
  const raw = window.localStorage.getItem(key);
  return raw === null ? fallback : raw === "1";
}

function readWidth(): number {
  if (!isBrowser) return RAIL_DEFAULT_WIDTH;
  const raw = Number(window.localStorage.getItem(RAIL_STORAGE.WIDTH));
  return Number.isFinite(raw) && raw > 0 ? raw : RAIL_DEFAULT_WIDTH;
}

function currentMode(): RailMode {
  if (!isBrowser) return "docked";
  return window.matchMedia(`(min-width: ${RAIL_DOCK_BREAKPOINT}px)`).matches
    ? "docked"
    : "overlay";
}

/**
 * Owns the Copilot rail's open / width / nav-map state with localStorage
 * persistence, derives the docked-vs-overlay mode from the viewport, and binds
 * the ⌘J toggle. State only — it renders no rail; `<CopilotRail/>` consumes it.
 *
 * First-ever load on desktop opens the rail so the companion is discoverable;
 * thereafter the persisted choice wins. Mobile never auto-opens (it would cover
 * content). Reads are synchronous (anti-blink) per the project convention.
 */
export function CopilotRailProvider({ children }: { children: ReactNode }) {
  const [mode, setMode] = useState<RailMode>(() => currentMode());
  const [open, setOpen] = useState<boolean>(() =>
    readBool(RAIL_STORAGE.OPEN, currentMode() === "docked"),
  );
  const [width, setWidthState] = useState<number>(() => readWidth());
  const [navMapOpen, setNavMapOpen] = useState<boolean>(() =>
    readBool(RAIL_STORAGE.NAV_MAP_OPEN, true),
  );

  // Track the docked/overlay breakpoint.
  useEffect(() => {
    if (!isBrowser) return;
    const mq = window.matchMedia(`(min-width: ${RAIL_DOCK_BREAKPOINT}px)`);
    const onChange = () => setMode(mq.matches ? "docked" : "overlay");
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  // Re-clamp width when the viewport shrinks so the content column stays usable.
  useEffect(() => {
    if (!isBrowser) return;
    const onResize = () =>
      setWidthState((w) => clampRailWidth(w, window.innerWidth));
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  const persist = useCallback((key: string, value: string) => {
    if (isBrowser) window.localStorage.setItem(key, value);
  }, []);

  const openRail = useCallback(() => {
    setOpen(true);
    persist(RAIL_STORAGE.OPEN, "1");
  }, [persist]);

  const closeRail = useCallback(() => {
    setOpen(false);
    persist(RAIL_STORAGE.OPEN, "0");
  }, [persist]);

  const toggle = useCallback(() => {
    setOpen((prev) => {
      persist(RAIL_STORAGE.OPEN, prev ? "0" : "1");
      return !prev;
    });
  }, [persist]);

  const setWidth = useCallback(
    (w: number) => {
      const clamped = clampRailWidth(w, isBrowser ? window.innerWidth : 1440);
      setWidthState(clamped);
      persist(RAIL_STORAGE.WIDTH, String(clamped));
    },
    [persist],
  );

  const toggleNavMap = useCallback(() => {
    setNavMapOpen((prev) => {
      persist(RAIL_STORAGE.NAV_MAP_OPEN, prev ? "0" : "1");
      return !prev;
    });
  }, [persist]);

  useCopilotRailHotkeys(toggle);

  const value = useMemo(
    () => ({
      open,
      mode,
      width,
      navMapOpen,
      openRail,
      closeRail,
      toggle,
      setWidth,
      toggleNavMap,
    }),
    [
      open,
      mode,
      width,
      navMapOpen,
      openRail,
      closeRail,
      toggle,
      setWidth,
      toggleNavMap,
    ],
  );

  return (
    <CopilotRailContext.Provider value={value}>
      {children}
    </CopilotRailContext.Provider>
  );
}
