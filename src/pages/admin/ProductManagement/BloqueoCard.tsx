/**
 * BloqueoCard — surfaces the soft-lock state for the selected stone.
 *
 * Reads `products.lockStatus` reactively. The real query returns
 * `null` when free/expired, otherwise `{ holderEmail, holderName,
 * claimedAt, expiresAt }`. The card derives `held` from the
 * presence/absence of that record and lets the asesor request control
 * when another editor holds the lock.
 *
 * `claimLock` does not (yet) accept a `force` arg — if takeover fails
 * because someone else holds an unexpired lock, the page surfaces the
 * error in the notification toast. Schema change is deferred to a
 * later phase.
 */

import { Box, ButtonBase, Typography } from "@mui/material";
import { fontFamilies, type FotoTokens } from "../../../design-system";
import {
  useConvexQuery,
  convexApi,
  convexReady,
} from "../../../lib/convex-safe";

const SANS = fontFamilies.system;

interface BloqueoCardProps {
  foto: FotoTokens;
  itemId: string | null;
  currentEmail: string | null;
  onClaim: () => void;
}

interface LockStatusRow {
  holderEmail: string;
  holderName?: string;
  claimedAt: string;
  expiresAt: string;
}

function relTime(iso: string | null | undefined): string {
  if (!iso) return "";
  const diffSec = Math.max(
    0,
    Math.round((Date.now() - new Date(iso).getTime()) / 1000),
  );
  if (diffSec < 60) return `hace ${diffSec} s`;
  const diffMin = Math.round(diffSec / 60);
  return `hace ${diffMin} min`;
}

export function BloqueoCard({
  foto,
  itemId,
  currentEmail,
  onClaim,
}: BloqueoCardProps) {
  const status = useConvexQuery(
    convexApi.products.lockStatus,
    convexReady && itemId ? { itemId } : "skip",
  ) as LockStatusRow | null | undefined;
  const held = !!status;
  const heldByOther = held && status!.holderEmail !== currentEmail;
  const heldByMe = held && status!.holderEmail === currentEmail;
  return (
    <Box
      sx={{
        border: `1px solid ${foto.surfaces.rule}`,
        borderRadius: "11px",
        p: "13px 15px",
        backgroundColor: foto.surfaces.canvas,
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        gap: 1.5,
      }}
    >
      <Box>
        <Typography
          component="div"
          sx={{
            fontFamily: SANS,
            fontSize: 9,
            letterSpacing: "0.18em",
            textTransform: "uppercase",
            color: foto.ink.tertiary,
            fontWeight: 500,
          }}
        >
          Bloqueo
        </Typography>
        <Typography
          component="div"
          sx={{
            fontFamily: SANS,
            fontSize: 10,
            color: foto.ink.secondary,
            mt: 0.5,
          }}
        >
          {!itemId
            ? "Selecciona una piedra para ver su bloqueo"
            : !held
              ? "Libre · ningún editor activo"
              : heldByMe
                ? "Editas esta piedra"
                : `${status!.holderName ?? status!.holderEmail} edita · ${relTime(status!.claimedAt)}`}
        </Typography>
      </Box>
      {heldByOther ? (
        <ButtonBase
          data-bandeja-claim-lock
          onClick={onClaim}
          disableRipple
          sx={{
            fontFamily: SANS,
            fontSize: 9.5,
            fontWeight: 600,
            color: foto.ink.primary,
            border: `1px solid ${foto.surfaces.edgeStrong}`,
            borderRadius: "7px",
            px: "10px",
            py: "5px",
          }}
        >
          Solicitar control
        </ButtonBase>
      ) : (
        <Box
          aria-hidden
          sx={{
            width: 7,
            height: 7,
            borderRadius: "50%",
            backgroundColor: foto.accent.primary,
          }}
        />
      )}
    </Box>
  );
}
