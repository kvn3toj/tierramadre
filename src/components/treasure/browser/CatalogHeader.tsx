/**
 * CatalogHeader — Quiet Emerald editorial header for the Catálogo screen.
 *
 * Cormorant title + DM Mono piece-count ("48 PIEZAS · ESMERALDAS DE COLOMBIA")
 * and the origin tab strip (Todas / Muzo / Chivor / Coscuez) with the emerald
 * active-underline. Responsive: 30px title on phone, 40px on tablet/desktop
 * (CatalogNew.dc.html / CatalogWide.dc.html).
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
      <Box
        sx={{
          display: 'flex',
          // Center the control cluster against the whole title block so the
          // controls read as one clean band instead of floating in the
          // whitespace beside the title (was flex-end, which left an L-gap).
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 2,
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
              fontSize: 10,
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

        {tabs.length > 1 && (
          <Box
            role="tablist"
            aria-label="Filtrar por origen"
            sx={{
              display: 'flex',
              gap: { xs: '18px', md: '22px' },
              alignItems: 'baseline',
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
                    pb: '6px',
                    borderBottom: `1.5px solid ${active ? qe.accent : 'transparent'}`,
                    color: active ? qe.accent : qe.muted,
                    fontFamily: qeFont.ui,
                    fontWeight: active ? 600 : 500,
                    fontSize: { xs: 12, md: 12.5 },
                    letterSpacing: 0,
                    lineHeight: 1,
                    transition: 'color 160ms, border-color 160ms',
                  }}
                >
                  {labelFor(o)}
                </ButtonBase>
              );
            })}
          </Box>
        )}

        {trailingContent && (
          <Box sx={{ flex: 1, minWidth: 0 }}>{trailingContent}</Box>
        )}
      </Box>
    </Box>
  );
}

export default CatalogHeader;
