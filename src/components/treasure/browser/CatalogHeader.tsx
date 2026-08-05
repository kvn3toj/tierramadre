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
 * DESKTOP ONLY (`md` and up). Below that this component renders nothing: a phone
 * cannot hold the band, and wrapping it into identity + tabs cost 86px on top of
 * MobileSearchBar's own 48 — 187px of chrome before the first stone, a fifth of
 * an iPhone SE screen. The phone now puts search, origin chips and filters in
 * ONE 46px row inside MobileSearchBar, under the untouched brand lockup.
 *
 * The title and the count do not reappear there, deliberately. "Catálogo" is what
 * the active tab already says (TESOROS), and the piece total was a number nobody
 * acts on — it now shows only when a filter has actually narrowed the set, which
 * is the only moment it means anything.
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
        // Desktop only. The phone renders this band's contents inside
        // MobileSearchBar's single row instead — see the note at the top.
        display: { xs: 'none', md: 'flex' },
        alignItems: 'center',
        gap: 2,
        flexWrap: 'nowrap',
        minHeight: 56,
        borderBottom: `1px solid ${qe.hairline}`,
        mb: '14px',
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
          fontSize: 24,
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
            gap: '20px',
            ml: '6px',
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
