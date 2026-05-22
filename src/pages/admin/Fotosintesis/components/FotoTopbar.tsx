import { Box, alpha } from "@mui/material";
import { Link as RouterLink } from "react-router-dom";
import { Search } from "lucide-react";
import { getFoto, fontFamilies } from "../../../../design-system";

export type SyncStatus = "synced" | "pending" | "error";

export interface Crumb {
  label: string;
  to?: string;
}

interface FotoTopbarProps {
  crumbs: Crumb[];
  syncStatus?: SyncStatus;
  userInitial?: string;
  /**
   * Opens the global spotlight (⌘K). Wired by FotosintesisLayout so the
   * topbar can render a real search trigger instead of a static shortcut chip.
   */
  onSearchClick?: () => void;
}

/**
 * Sticky top bar with breadcrumbs (left) and sync chip + search + avatar (right).
 * Matches `home.html .topbar`: glass blur on white at 86% opacity, hairline edge.
 */
export function FotoTopbar({
  crumbs,
  syncStatus = "synced",
  userInitial = "M",
  onSearchClick,
}: FotoTopbarProps) {
  const foto = getFoto("light");

  const syncCopy: Record<SyncStatus, { label: string; color: string }> = {
    synced: { label: "Sincronizado", color: foto.accent.primary },
    pending: { label: "Sincronizando…", color: foto.status.consigned },
    error: { label: "Sync error", color: foto.status.sold },
  };
  const sync = syncCopy[syncStatus];

  return (
    <Box
      component="header"
      sx={{
        position: "sticky",
        top: 0,
        zIndex: 50,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "13px 28px",
        borderBottom: `1px solid ${foto.surfaces.edge}`,
        background: alpha("#FFFFFF", 0.86),
        backdropFilter: "saturate(140%) blur(8px)",
        WebkitBackdropFilter: "saturate(140%) blur(8px)",
      }}
    >
      <Box
        component="nav"
        aria-label="Migas de pan"
        sx={{
          fontSize: 11.5,
          color: foto.ink.tertiary,
          display: "flex",
          alignItems: "center",
          gap: 0,
          minWidth: 0,
          flex: "1 1 auto",
          overflow: "hidden",
          whiteSpace: "nowrap",
          textOverflow: "ellipsis",
        }}
      >
        {crumbs.map((crumb, idx) => {
          const isLast = idx === crumbs.length - 1;
          const content = (
            <Box
              component="span"
              sx={{
                color: isLast ? foto.ink.primary : foto.ink.tertiary,
                fontWeight: isLast ? 600 : 400,
              }}
            >
              {crumb.label}
            </Box>
          );
          return (
            <Box component="span" key={`${crumb.label}-${idx}`}>
              {!isLast && crumb.to ? (
                <Box
                  component={RouterLink}
                  to={crumb.to}
                  sx={{
                    color: "inherit",
                    textDecoration: "none",
                    "&:hover": { color: foto.ink.primary },
                  }}
                >
                  {content}
                </Box>
              ) : (
                content
              )}
              {!isLast && (
                <Box
                  component="span"
                  sx={{ margin: "0 6px", color: foto.ink.mute }}
                >
                  /
                </Box>
              )}
            </Box>
          );
        })}
      </Box>

      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          gap: 1,
          minWidth: 0,
          flexShrink: 0,
        }}
      >
        <Box
          aria-label={sync.label}
          sx={{
            // Hide the sync chip on narrow viewports — the dot alone is
            // enough signal and the breadcrumbs need the horizontal room.
            display: { xs: "none", sm: "inline-flex" },
            alignItems: "center",
            gap: 0.75,
            padding: "5px 10px",
            borderRadius: "6px",
            border: `1px solid ${foto.surfaces.edge}`,
            fontSize: 10.5,
            color: foto.ink.secondary,
            fontWeight: 500,
          }}
        >
          <Box
            sx={{
              width: 6,
              height: 6,
              borderRadius: "50%",
              backgroundColor: sync.color,
              "@media (prefers-reduced-motion: no-preference)": {
                animation:
                  syncStatus === "pending"
                    ? "fotoTopbarPulse 1.8s ease-in-out infinite"
                    : "none",
              },
              "@keyframes fotoTopbarPulse": {
                "50%": { opacity: 0.4 },
              },
            }}
          />
          {sync.label}
        </Box>
        <Box
          component="button"
          type="button"
          onClick={onSearchClick}
          aria-label="Buscar productos, lotes y clientes"
          aria-keyshortcuts="Meta+K Control+K"
          sx={{
            // Looks like a search field, behaves like a trigger: opens the
            // ProductoSpotlight modal (which owns the real input + results).
            // Hidden on xs — the FAB still surfaces ⌘K on narrow viewports.
            display: { xs: "none", sm: "inline-flex" },
            alignItems: "center",
            gap: 1,
            height: 30,
            paddingLeft: "10px",
            paddingRight: "6px",
            width: { sm: 220, md: 300, lg: 340 },
            maxWidth: "40vw",
            borderRadius: "8px",
            border: `1px solid ${foto.surfaces.edge}`,
            background: alpha("#FFFFFF", 0.7),
            color: foto.ink.tertiary,
            fontSize: 12,
            fontFamily: "inherit",
            textAlign: "left",
            cursor: "text",
            appearance: "none",
            transition:
              "background 140ms ease, border-color 140ms ease, box-shadow 140ms ease",
            "&:hover": {
              background: alpha("#FFFFFF", 0.95),
              borderColor: alpha(foto.accent.primary, 0.35),
            },
            "&:focus-visible": {
              outline: "none",
              borderColor: foto.accent.primary,
              boxShadow: `0 0 0 3px ${foto.accent.glow}`,
            },
          }}
        >
          <Search
            size={14}
            strokeWidth={1.8}
            color={foto.ink.tertiary}
            aria-hidden
          />
          <Box
            component="span"
            sx={{
              flex: 1,
              minWidth: 0,
              color: foto.ink.tertiary,
              fontWeight: 400,
              letterSpacing: "-0.005em",
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            Buscar productos, lotes, clientes…
          </Box>
          <Box
            component="kbd"
            aria-hidden
            sx={{
              flexShrink: 0,
              fontFamily: fontFamilies.mono,
              fontSize: 9.5,
              background: foto.surfaces.inset,
              border: `1px solid ${foto.surfaces.edge}`,
              padding: "1.5px 5px",
              borderRadius: "3px",
              color: foto.ink.tertiary,
              fontWeight: 500,
              letterSpacing: 0,
              lineHeight: 1,
            }}
          >
            ⌘ K
          </Box>
        </Box>
        <Box
          aria-label="Cuenta de usuario"
          sx={{
            width: 26,
            height: 26,
            borderRadius: "50%",
            background: "#3a5b4a",
            color: "#FFFFFF",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 10.5,
            fontWeight: 600,
          }}
        >
          {userInitial}
        </Box>
      </Box>
    </Box>
  );
}

export default FotoTopbar;
