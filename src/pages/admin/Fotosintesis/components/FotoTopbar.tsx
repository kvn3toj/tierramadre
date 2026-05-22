import { Box, alpha } from "@mui/material";
import { Link as RouterLink } from "react-router-dom";
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
}

/**
 * Sticky top bar with breadcrumbs (left) and sync chip + avatar (right).
 * Matches `home.html .topbar`: glass blur on white at 86% opacity, hairline edge.
 */
export function FotoTopbar({
  crumbs,
  syncStatus = "synced",
  userInitial = "M",
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
          aria-label="Atajo: Buscar"
          sx={{
            // Same rationale as the sync chip — the ⌘K shortcut is also
            // discoverable from the FAB / page hints on narrow viewports.
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
          Buscar
          <Box
            component="kbd"
            sx={{
              fontFamily: fontFamilies.mono,
              fontSize: 9.5,
              background: foto.surfaces.inset,
              border: `1px solid ${foto.surfaces.edge}`,
              padding: "1.5px 5px",
              borderRadius: "3px",
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
