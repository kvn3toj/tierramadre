import { useMemo } from "react";
import { Box } from "@mui/material";
import { ChevronDown } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { getFoto, fontFamilies } from "../../../../design-system";
import { useConvexQuery, convexApi } from "../../../../lib/convex-safe";

interface LotSwitcherProps {
  currentLoteId: string;
  /** When closed, route here. Falls back to /admin/fotosintesis. */
  homePath?: string;
}

/**
 * Compact dropdown that lets the operator jump between lots (B-001 ↔
 * B-002 ↔ C-001 …) without going back to the home page. Shows the
 * current lot's id big-and-bold like the original `<TicketHeader>` did,
 * with a native `<select>` overlaid for keyboard + a11y. Cerrado /
 * publicado lots are still listed (with a status hint) so the operator
 * can revisit them — but only `abierto` lots are editable downstream.
 */
export function LotSwitcher({
  currentLoteId,
  homePath = "/admin/fotosintesis/lots",
}: LotSwitcherProps) {
  const foto = getFoto("light");
  const navigate = useNavigate();
  const allLots = useConvexQuery(convexApi.lots.list, {});

  const grouped = useMemo(() => {
    const open = (allLots ?? []).filter((l) => l.estado === "abierto");
    const closed = (allLots ?? []).filter((l) => l.estado === "cerrado");
    const published = (allLots ?? []).filter((l) => l.estado === "publicado");
    return { open, closed, published };
  }, [allLots]);

  const totalCount =
    grouped.open.length + grouped.closed.length + grouped.published.length;

  return (
    <Box
      sx={{
        position: "relative",
        display: "inline-flex",
        alignItems: "center",
        gap: "10px",
      }}
    >
      <Box
        sx={{
          fontFamily: fontFamilies.mono,
          fontVariantNumeric: "tabular-nums",
          fontSize: { xs: 32, sm: 38, md: 42 },
          fontWeight: 300,
          letterSpacing: "-0.055em",
          lineHeight: 1,
          color: foto.ink.primary,
        }}
      >
        {currentLoteId}
      </Box>

      <Box
        aria-hidden
        sx={{
          display: "inline-flex",
          alignItems: "center",
          gap: "4px",
          padding: "4px 8px",
          marginTop: { xs: "2px", md: "8px" },
          borderRadius: "6px",
          background: foto.surfaces.inset,
          border: `1px solid ${foto.surfaces.edge}`,
          color: foto.ink.secondary,
          fontSize: 10.5,
          fontWeight: 500,
          letterSpacing: "0.02em",
        }}
      >
        Cambiar
        <ChevronDown size={12} strokeWidth={2} />
      </Box>

      <Box
        component="select"
        aria-label="Cambiar de lote"
        value={currentLoteId}
        onChange={(e) => {
          const next = (e.target as HTMLSelectElement).value;
          if (!next || next === currentLoteId) return;
          navigate(`${homePath}/${next}`);
        }}
        sx={{
          position: "absolute",
          inset: 0,
          opacity: 0,
          cursor: totalCount > 1 ? "pointer" : "not-allowed",
          appearance: "none",
          width: "100%",
          height: "100%",
          fontSize: 16, // anti-zoom on iOS Safari
        }}
        disabled={totalCount <= 1}
      >
        {grouped.open.length > 0 ? (
          <optgroup label="Abiertos">
            {grouped.open.map((l) => (
              <option key={l._id} value={l.loteId}>
                {l.loteId} · {l.unidadesDeclaradas} unidades
              </option>
            ))}
          </optgroup>
        ) : null}
        {grouped.closed.length > 0 ? (
          <optgroup label="Cerrados (sólo lectura)">
            {grouped.closed.map((l) => (
              <option key={l._id} value={l.loteId}>
                {l.loteId} · cerrado
              </option>
            ))}
          </optgroup>
        ) : null}
        {grouped.published.length > 0 ? (
          <optgroup label="Publicados">
            {grouped.published.map((l) => (
              <option key={l._id} value={l.loteId}>
                {l.loteId} · publicado
              </option>
            ))}
          </optgroup>
        ) : null}
      </Box>
    </Box>
  );
}

export default LotSwitcher;
