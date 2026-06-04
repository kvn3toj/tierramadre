import { IconButton } from "@mui/material";
import { Sun, Moon } from "lucide-react";
import { useEsmereoTheme } from "../../contexts/EsmereoThemeContext";
import { useLanguage } from "../../contexts/LanguageContext";
import { useTrackingDispatch } from "../../contexts/TrackingContext";

/**
 * EsmereoThemeToggle — sun ⇄ moon button for the Bóveda feature theme. Lives
 * top-right of every screen header. Announces the TARGET mode (a11y) and emits
 * `esmereo_theme_toggled`. Colors come from the feature CSS vars so it adapts to
 * whichever theme is active.
 */
export default function EsmereoThemeToggle({ size = 19 }: { size?: number }) {
  const { mode, toggle } = useEsmereoTheme();
  const { language } = useLanguage();
  const { track } = useTrackingDispatch();
  const isDark = mode === "dark";

  // Announce the target mode. (Promoted to the i18n bundle in Phase 9.)
  const label = isDark
    ? language === "en"
      ? "Switch to light mode"
      : "Cambiar a modo claro"
    : language === "en"
      ? "Switch to dark mode"
      : "Cambiar a modo oscuro";

  const handleToggle = () => {
    const next = isDark ? "light" : "dark";
    toggle();
    try {
      track("esmereo_theme_toggled", { mode: next });
    } catch {
      /* tracking is best-effort */
    }
  };

  return (
    <IconButton
      className="tap"
      onClick={handleToggle}
      aria-label={label}
      sx={{
        width: 38,
        height: 38,
        color: "var(--gold)",
        "&:hover": { background: "var(--surface)" },
      }}
    >
      {isDark ? (
        <Sun size={size} strokeWidth={1.6} />
      ) : (
        <Moon size={size} strokeWidth={1.6} />
      )}
    </IconButton>
  );
}
