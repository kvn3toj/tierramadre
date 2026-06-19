/**
 * AppNavigatorContext — the single, role-gated entry point for programmatic
 * navigation driven by the Fotosynthia copilot (both natural-language `navigate`
 * envelopes and visual nav-map clicks).
 *
 * Why a context and not a raw `useNavigate()` in the copilot: the rail is mounted
 * at the app shell and must navigate from ANY route, while the binding role gate
 * (layer 3 of the security model) must use the LIVE session role — not the role
 * the server was told. The route guards (`AdminRoute`/`StaffRoute`) remain the
 * final backstop, so navigation can never grant access the guards would deny.
 *
 * Must be mounted inside <BrowserRouter> and inside the AuthProvider.
 */

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useNavigate } from "react-router-dom";
import { useAuthContext } from "./AuthContext";
import { canAccess, getRouteById } from "../config/adminNavMap";
import type { AccessLevel } from "../types/auth";
import type { NavigateAction } from "../pages/admin/Fotosintesis/copilot/flowSchemas";

export type NavigateResult =
  | { ok: true; path: string; label: string }
  | { ok: false; reason: "role" | "needsParam" | "unknown"; message: string };

interface AppNavigatorValue {
  /** Role-gated navigation. Returns the outcome so callers can drive UX/a11y. */
  navigateTo: (action: NavigateAction) => NavigateResult;
  /** The live session access level (for role-filtering the map). */
  accessLevel: AccessLevel;
}

const AppNavigatorContext = createContext<AppNavigatorValue | null>(null);

const SR_ONLY: React.CSSProperties = {
  position: "absolute",
  width: 1,
  height: 1,
  padding: 0,
  margin: -1,
  overflow: "hidden",
  clip: "rect(0 0 0 0)",
  whiteSpace: "nowrap",
  border: 0,
};

const UNFILLED_PARAM = /:[A-Za-z]/;

export function AppNavigatorProvider({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  const { accessLevel } = useAuthContext();
  const [announce, setAnnounce] = useState("");

  const navigateTo = useCallback(
    (action: NavigateAction): NavigateResult => {
      const entry = getRouteById(action.routeId);
      if (!entry) {
        return {
          ok: false,
          reason: "unknown",
          message: "Esa pantalla no existe.",
        };
      }
      // Layer 3 — authoritative role gate against the LIVE session.
      if (!canAccess(entry, accessLevel)) {
        return {
          ok: false,
          reason: "role",
          message: `No tenés acceso a ${entry.label}.`,
        };
      }
      const path = action.path;
      if (!path || UNFILLED_PARAM.test(path) || action.needsParam) {
        return {
          ok: false,
          reason: "needsParam",
          message: `Necesito el dato de ${
            action.needsParam?.label ?? "la pantalla"
          } para abrirla.`,
        };
      }
      const label = action.label || entry.label;
      setAnnounce(`Navegando a ${label}`);
      navigate(path);
      return { ok: true, path, label };
    },
    [navigate, accessLevel],
  );

  const value = useMemo<AppNavigatorValue>(
    () => ({ navigateTo, accessLevel }),
    [navigateTo, accessLevel],
  );

  return (
    <AppNavigatorContext.Provider value={value}>
      {children}
      <div aria-live="assertive" role="status" style={SR_ONLY}>
        {announce}
      </div>
    </AppNavigatorContext.Provider>
  );
}

export function useAppNavigator(): AppNavigatorValue {
  const ctx = useContext(AppNavigatorContext);
  if (!ctx) {
    throw new Error("useAppNavigator must be used within AppNavigatorProvider");
  }
  return ctx;
}
