/**
 * EsmereoSideNav — desktop-only slim left rail for the Bóveda screens. Mirrors
 * the app's GLOBAL four destinations (Inicio · Tesoros · Embajadores · Más) via
 * the same routes (no parallel nav model), with the emerald-cut Tesoros icon and
 * the feature theme toggle pinned at the bottom. Self-gates to desktop.
 */

import { Home, Users, MoreHorizontal } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import EmeraldCutIcon from "../icons/EmeraldCutIcon";
import EsmereoThemeToggle from "./EsmereoThemeToggle";
import { useEsmereoBp } from "./useEsmereoBp";

const ITEMS: { key: string; label: string; route: string; cut?: boolean }[] = [
  { key: "inicio", label: "Inicio", route: "/home" },
  { key: "tesoros", label: "Tesoros", route: "/treasure", cut: true },
  { key: "embajadores", label: "Embajadores", route: "/ambassadors" },
  { key: "mas", label: "Más", route: "/more" },
];

export default function EsmereoSideNav() {
  const bp = useEsmereoBp();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  // Desktop only — it replaces the global bottom bar, which auto-hides on esmereo
  // routes at the same ≥1180px threshold. iPad keeps the bottom bar.
  if (bp !== "desktop") return null;

  return (
    <nav className="bov-sidenav" aria-label="Navegación">
      {/* brand mark */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 9,
          paddingTop: 4,
        }}
      >
        <span
          style={{
            color: "var(--gold)",
            display: "inline-flex",
            filter: "drop-shadow(0 0 10px rgba(217,169,75,0.4))",
          }}
        >
          <EmeraldCutIcon size={30} strokeWidth={1.6} />
        </span>
        <span
          className="serif"
          style={{
            fontSize: 10.5,
            letterSpacing: "0.16em",
            color: "var(--ink-soft)",
            writingMode: "vertical-rl",
            transform: "rotate(180deg)",
            textTransform: "uppercase",
            marginTop: 4,
          }}
        >
          Tierra Mädre
        </span>
      </div>

      {/* tabs */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 6,
          width: "100%",
          alignItems: "center",
        }}
      >
        {ITEMS.map((t) => {
          const on = pathname.startsWith(t.route);
          return (
            <button
              key={t.key}
              className="tap"
              onClick={() => navigate(t.route)}
              aria-current={on ? "page" : undefined}
              style={{
                width: 64,
                padding: "11px 0",
                borderRadius: 16,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 6,
                cursor: "pointer",
                color: on ? "var(--gold-bright)" : "var(--ink-faint)",
                background: on ? "var(--accent-bg)" : "transparent",
                border: on
                  ? "1px solid var(--accent-line)"
                  : "1px solid transparent",
                boxShadow: on ? "0 0 24px -10px var(--gold)" : "none",
                transition: "all .2s",
              }}
            >
              {t.cut ? (
                <EmeraldCutIcon size={23} strokeWidth={on ? 2.2 : 1.8} />
              ) : t.key === "inicio" ? (
                <Home size={22} strokeWidth={on ? 2 : 1.5} />
              ) : t.key === "embajadores" ? (
                <Users size={22} strokeWidth={on ? 2 : 1.5} />
              ) : (
                <MoreHorizontal size={22} strokeWidth={on ? 2 : 1.5} />
              )}
              <span
                style={{
                  fontSize: 8,
                  letterSpacing: "0.1em",
                  textTransform: "uppercase",
                  fontWeight: on ? 700 : 500,
                }}
              >
                {t.label}
              </span>
            </button>
          );
        })}
      </div>

      {/* theme toggle pinned bottom */}
      <div style={{ display: "flex", justifyContent: "center" }}>
        <EsmereoThemeToggle />
      </div>
    </nav>
  );
}
