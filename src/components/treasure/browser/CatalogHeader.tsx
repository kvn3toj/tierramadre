/**
 * CatalogHeader — Quiet Emerald header for the Catálogo screen.
 *
 * ONE line: identity, origin tabs and the control cluster all share a single
 * 56px band. Previously this was four stacked rows — title (39px), subtitle
 * (16px), total + chips (22px), tab strip (44px) — 178px of header in which the
 * widest row used 255px of 1048px, so roughly three quarters of the space sat
 * empty for four rows running.
 *
 * What was dropped to get there, and why:
 *   - the "· ESMERALDAS DE COLOMBIA" subtitle — the entire app is Colombian
 *     emeralds, so it restated the context it sat in;
 *   - the gem/jewelry count chips — the type filter already segments those, and
 *     at 11px letterspaced they cost ~180px of the one line they'd have to share;
 *   - the total inventory value — removed separately (it is not an asesor's to
 *     show a client).
 *
 * The origin tabs lost their underline-on-a-rule: in a single band the row's own
 * bottom hairline IS the rule, so an underline would float mid-row. Active state
 * is carried by accent colour + weight instead.
 *
 * Below `md` the row wraps into identity / tabs, since a phone cannot hold the
 * band and mobile renders its own search bar underneath anyway.
 */
import { Box, Typography, ButtonBase } from '@mui/material';
import { useThemeMode } from '../../../contexts/ThemeContext';
import { getQuietEmerald, qeFont } from '../../../design-system';

export interface CatalogHeaderProps {
  /** Editorial title (default "Catálogo") */
  title?: string;
  /** Live piece count, rendered beside the title */
  count: number;
  /** Available origin mines (e.g. ["Muzo","Chivor"]); "Todas" is prepended */
  origins: string[];
  /** Active origin — "all" or a mine name */
  activeOrigin: string;
  onOriginChange: (origin: string) => void;
  /**
   * Desktop control cluster (search · Filtros · Búsquedas · Favoritos · vista).
   * Sits on the same band, pushed right by the flexible spacer.
   */
  trailingContent?: React.ReactNode;
}

export function CatalogHeader({
  title = 'Catálogo',
  count,
  origins,
  activeOrigin,
  onOriginChange,
  trailingContent,
}: CatalogHeaderProps) {
  const { mode } = useThemeMode();
  const qe = getQuietEmerald(mode);

  const tabs = ['all', ...origins];
  const labelFor = (o: string) => (o === 'all' ? 'Todas' : o);

  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: { xs: 1.5, md: 2 },
        rowGap: 1,
        // One band on desktop; wraps to identity / tabs on phones.
        flexWrap: { xs: 'wrap', md: 'nowrap' },
        minHeight: { md: 56 },
        py: { xs: 1, md: 0 },
        borderBottom: `1px solid ${qe.hairline}`,
        mb: { xs: '12px', md: '14px' },
      }}
    >
      <Typography
        component="h1"
        sx={{
          fontFamily: qeFont.serif,
          fontWeight: 500,
          color: qe.text,
          lineHeight: 1,
          letterSpacing: '0.2px',
          fontSize: { xs: 22, md: 24 },
          flexShrink: 0,
        }}
      >
        {title}
      </Typography>

      <Typography
        sx={{
          fontFamily: qeFont.ui,
          fontSize: 11,
          letterSpacing: '0.08em',
          textTransform: 'uppercase',
          color: qe.subtle,
          whiteSpace: 'nowrap',
          flexShrink: 0,
          fontVariantNumeric: 'tabular-nums',
        }}
      >
        {count} {count === 1 ? 'pieza' : 'piezas'}
      </Typography>

      {tabs.length > 1 && (
        <Box
          role="tablist"
          aria-label="Filtrar por origen"
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: { xs: '16px', md: '20px' },
            ml: { md: '6px' },
            minWidth: 0,
            overflowX: 'auto',
            scrollbarWidth: 'none',
            '&::-webkit-scrollbar': { display: 'none' },
          }}
        >
          {tabs.map((o) => {
            const active = activeOrigin === o;
            return (
              <ButtonBase
                key={o}
                role="tab"
                aria-selected={active}
                onClick={() => onOriginChange(o)}
                sx={{
                  flexShrink: 0,
                  // ≥44px touch target (PRODUCT.md) inside the 56px band.
                  minHeight: 44,
                  px: '2px',
                  color: active ? qe.accent : qe.muted,
                  fontFamily: qeFont.ui,
                  fontWeight: active ? 600 : 500,
                  fontSize: 13,
                  lineHeight: 1,
                  whiteSpace: 'nowrap',
                  transition: 'color 160ms',
                  '&:hover': { color: active ? qe.accent : qe.text },
                }}
              >
                {labelFor(o)}
              </ButtonBase>
            );
          })}
        </Box>
      )}

      {/* The one flexible gap in the band — everything after it is right-aligned.
          It lives here, not inside the toolbar, so the toolbar can no longer
          collapse it by wrapping. */}
      <Box sx={{ flex: 1, minWidth: { md: 16 } }} />

      {trailingContent}
    </Box>
  );
}

export default CatalogHeader;
