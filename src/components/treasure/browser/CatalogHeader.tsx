/**
 * CatalogHeader — Quiet Emerald editorial header for the Catálogo screen.
 *
 * Two bands, in reading order:
 *   1. Identity (serif title + piece-count + summary) on the left, the
 *      search/filter cluster on the right, top-aligned.
 *   2. The origin tab strip (Todas / Muzo / Chivor / Coscuez) on its own
 *      hairline rule, with the emerald active-underline.
 *
 * The tabs used to share band 1, centred against a three-line identity block,
 * which left them floating between the title and the search box with no clear
 * owner. Separating the bands gives each one register: what you are looking
 * at, how to search it, which origin.
 *
 * Responsive: 30px title on phone, 40px on tablet/desktop.
 */
import { Box, Typography, ButtonBase } from '@mui/material';
import { useThemeMode } from '../../../contexts/ThemeContext';
import { getQuietEmerald, qeFont } from '../../../design-system';

export interface CatalogHeaderProps {
  /** Editorial title (default "Catálogo") */
  title?: string;
  /** Piece count shown in the mono subtitle */
  count: number;
  /** Trailing mono subtitle (default "ESMERALDAS DE COLOMBIA") */
  subtitle?: string;
  /** Available origin mines (e.g. ["Muzo","Chivor","Coscuez"]); "Todas" is prepended */
  origins: string[];
  /** Active origin — "all" or a mine name */
  activeOrigin: string;
  onOriginChange: (origin: string) => void;
  /** Desktop-only search/filter controls, rendered on the same row as the
   * title instead of a separate row below — saves a full row of height. */
  trailingContent?: React.ReactNode;
  /** Summary data (total value, inventory counts) shown under the subtitle —
   * the identity/summary zone, so price-dependent content never crowds the
   * control row and the layout stays stable whether or not prices are shown. */
  summary?: React.ReactNode;
}

export function CatalogHeader({
  title = 'Catálogo',
  count,
  subtitle = 'ESMERALDAS DE COLOMBIA',
  origins,
  activeOrigin,
  onOriginChange,
  trailingContent,
  summary,
}: CatalogHeaderProps) {
  const { mode } = useThemeMode();
  const qe = getQuietEmerald(mode);

  const tabs = ['all', ...origins];
  const labelFor = (o: string) => (o === 'all' ? 'Todas' : o);

  return (
    <Box
      sx={{
        px: { xs: '4px', md: 0 },
        pt: { xs: '4px', md: '8px' },
        pb: { xs: '12px', md: '16px' },
      }}
    >
      {/* Band 1 — identity on the left, controls on the right.
          Top-aligned, not centred: the identity block is three lines tall and
          the control cluster is one, so centring floated the controls at the
          identity block's midpoint instead of reading as a header band. */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          gap: { xs: 2, md: 3 },
          flexWrap: 'wrap',
        }}
      >
        <Box sx={{ flexShrink: 0 }}>
          <Typography
            component="h1"
            sx={{
              fontFamily: qeFont.serif,
              fontWeight: 500,
              color: qe.text,
              lineHeight: 0.98,
              letterSpacing: '0.2px',
              fontSize: { xs: 30, md: 40 },
            }}
          >
            {title}
          </Typography>
          <Typography
            sx={{
              fontFamily: qeFont.mono,
              // 11px legibility floor (was 10).
              fontSize: 11,
              letterSpacing: '0.08em',
              color: qe.subtle,
              mt: { xs: '6px', md: '9px' },
            }}
          >
            {count} {count === 1 ? 'PIEZA' : 'PIEZAS'} · {subtitle}
          </Typography>
          {summary && (
            <Box sx={{ mt: { xs: '8px', md: '10px' } }}>{summary}</Box>
          )}
        </Box>

        {trailingContent && (
          <Box sx={{ flex: 1, minWidth: 0 }}>{trailingContent}</Box>
        )}
      </Box>

      {/* Band 2 — origin tabs as a real tab strip on its own rule.
          Previously these sat inline between the title and the search box,
          vertically centred against a three-line block, which read as floating
          text rather than navigation. A full-width strip on a hairline is the
          familiar affordance and gives the origin filter its own register. */}
      {tabs.length > 1 && (
        <Box
          role="tablist"
          aria-label="Filtrar por origen"
          sx={{
            display: 'flex',
            gap: { xs: '20px', md: '26px' },
            alignItems: 'stretch',
            mt: { xs: '14px', md: '18px' },
            borderBottom: `1px solid ${qe.hairline}`,
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
                  // ≥44px touch target (PRODUCT.md); the strip's own hairline
                  // sits 1px below, so the tab underline overlaps it exactly.
                  minHeight: 44,
                  px: '2px',
                  mb: '-1px',
                  borderBottom: `1.5px solid ${active ? qe.accent : 'transparent'}`,
                  color: active ? qe.accent : qe.muted,
                  fontFamily: qeFont.ui,
                  fontWeight: active ? 600 : 500,
                  fontSize: { xs: 12.5, md: 13 },
                  letterSpacing: 0,
                  lineHeight: 1,
                  transition: 'color 160ms, border-color 160ms',
                  '&:hover': { color: active ? qe.accent : qe.text },
                }}
              >
                {labelFor(o)}
              </ButtonBase>
            );
          })}
        </Box>
      )}
    </Box>
  );
}

export default CatalogHeader;
