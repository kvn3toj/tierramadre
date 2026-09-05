/**
 * BulkActionBar — fixed-bottom action bar for the row checkbox selection.
 *
 * Visible only while at least one row is checked. Always mounted
 * (toggling visibility via transform) so the slide-out runs on the
 * last unselect and the buttons can finish a click animation even as
 * the count hits zero.
 *
 * Phase H3 adds three additional bulk operations behind popovers:
 *  - **Cambiar precio** — delta / porcentaje / absoluto.
 *  - **Cambiar colección** — combobox of existing collections + free text.
 *  - **Cambiar ubicación** — free-text input.
 *
 * Surfaces use Fotosíntesis tokens (replaces the original atelier
 * palette so the bar matches the redesigned page).
 *
 * Spec: docs/superpowers/specs/2026-05-06-fotosintesis-admin-redesign-design.md
 */

import { useRef, useState } from 'react';
import { Box, ButtonBase, Popover, Typography } from '@mui/material';
import {
  fontFamilies,
  appShell,
  layoutBreakpoints,
  bottomBarClearance,
  zIndex,
  type FotoTokens,
} from '../../../design-system';

const SANS = fontFamilies.system;

export type BulkPriceMode = 'delta' | 'percent' | 'absolute';

interface BulkActionBarProps {
  visible: boolean;
  count: number;
  isSaving: boolean;
  foto: FotoTokens;
  /** Existing collection names — feeds the colección combobox. */
  collections: string[];
  onMarkAvailable: () => void;
  onMarkSold: () => void;
  onChangePrice: (next: { mode: BulkPriceMode; value: number }) => void;
  onChangeColeccion: (value: string) => void;
  onChangeUbicacion: (value: string) => void;
  onClear: () => void;
}

export function BulkActionBar({
  visible,
  count,
  isSaving,
  foto,
  collections,
  onMarkAvailable,
  onMarkSold,
  onChangePrice,
  onChangeColeccion,
  onChangeUbicacion,
  onClear,
}: BulkActionBarProps) {
  return (
    <Box
      role="region"
      aria-label="Acciones en lote"
      aria-hidden={!visible}
      sx={{
        position: 'fixed',
        left: 0,
        // Consumes the docked Copilot rail width so the bar shifts with the
        // content instead of underlapping the rail (Navigation UX rule 5).
        right: 'var(--copilot-rail-width, 0px)',
        // Below the desktop breakpoint the global iOS tab bar is visible and
        // must be cleared; at/above it the tab bar hides so only the safe
        // area applies (Navigation UX rule 6).
        bottom: bottomBarClearance(appShell.tabBarReserve),
        [`@media (min-width: ${layoutBreakpoints.desktop}px)`]: {
          bottom: 'env(safe-area-inset-bottom, 0px)',
        },
        zIndex: zIndex.fixed,
        backgroundColor: foto.surfaces.panel,
        borderTop: `1px solid ${foto.surfaces.edgeStrong}`,
        transform: visible ? 'translateY(0)' : 'translateY(100%)',
        transition:
          'transform 240ms cubic-bezier(0.2, 0.8, 0.2, 1), opacity 200ms linear, right 200ms cubic-bezier(0.25, 0.46, 0.45, 0.94)',
        opacity: visible ? 1 : 0,
        pointerEvents: visible ? 'auto' : 'none',
      }}
    >
      <Box
        sx={{
          maxWidth: 1280,
          mx: 'auto',
          px: { xs: 2, md: 3 },
          py: '12px',
          display: 'flex',
          alignItems: 'center',
          gap: 1.5,
          flexWrap: 'wrap',
        }}
      >
        <Typography
          sx={{
            fontFamily: SANS,
            fontSize: 12,
            color: foto.ink.tertiary,
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <Box
            aria-hidden
            sx={{
              width: '8px',
              height: '8px',
              borderRadius: '1px',
              backgroundColor: foto.accent.primary,
              flexShrink: 0,
            }}
          />
          <Box
            component="span"
            sx={{ fontSize: 13, color: foto.ink.primary, fontWeight: 600 }}
          >
            {count.toLocaleString('es-CO')}
          </Box>
          {count === 1 ? 'seleccionada' : 'seleccionadas'}
        </Typography>

        <Box sx={{ flex: 1 }} />

        <BulkActionButton
          foto={foto}
          onClick={onMarkAvailable}
          disabled={isSaving || count === 0}
          pipColor={foto.status.available}
        >
          Marcar disponible
        </BulkActionButton>
        <BulkActionButton
          foto={foto}
          onClick={onMarkSold}
          disabled={isSaving || count === 0}
          pipColor={foto.status.sold}
        >
          Marcar vendida
        </BulkActionButton>

        {/* Phase H3 — three new bulk ops behind popovers */}
        <BulkPricePopover
          foto={foto}
          disabled={isSaving || count === 0}
          onApply={onChangePrice}
        />
        <BulkColeccionPopover
          foto={foto}
          disabled={isSaving || count === 0}
          collections={collections}
          onApply={onChangeColeccion}
        />
        <BulkUbicacionPopover
          foto={foto}
          disabled={isSaving || count === 0}
          onApply={onChangeUbicacion}
        />

        <ButtonBase
          onClick={onClear}
          disabled={isSaving || count === 0}
          disableRipple
          sx={{
            fontFamily: SANS,
            fontSize: 12,
            color: foto.ink.secondary,
            px: '12px',
            py: '8px',
            borderRadius: '4px',
            border: `1px solid ${foto.surfaces.edgeStrong}`,
            transition: foto.motion.rowHover,
            '&:hover': { backgroundColor: foto.surfaces.inset },
            '&:focus-visible': {
              outline: `2px solid ${foto.accent.primary}`,
              outlineOffset: '2px',
            },
            '&:disabled': { opacity: 0.5, cursor: 'default' },
          }}
        >
          Limpiar
        </ButtonBase>
      </Box>
    </Box>
  );
}

/* ─── Sub-components ──────────────────────────────────────────────── */

function BulkActionButton({
  foto,
  onClick,
  disabled,
  pipColor,
  children,
  'data-testid': dataTestId,
}: {
  foto: FotoTokens;
  onClick: () => void;
  disabled: boolean;
  pipColor?: string;
  children: React.ReactNode;
  'data-testid'?: string;
}) {
  return (
    <ButtonBase
      onClick={onClick}
      disabled={disabled}
      disableRipple
      data-testid={dataTestId}
      sx={{
        fontFamily: SANS,
        fontSize: 12,
        color: foto.ink.primary,
        backgroundColor: foto.surfaces.canvas,
        border: `1px solid ${foto.surfaces.edgeStrong}`,
        borderRadius: '4px',
        px: '14px',
        py: '8px',
        display: 'inline-flex',
        alignItems: 'center',
        gap: '8px',
        transition: foto.motion.rowHover,
        '&:hover': {
          backgroundColor: foto.surfaces.inset,
          borderColor: foto.accent.primary,
        },
        '&:focus-visible': {
          outline: `2px solid ${foto.accent.primary}`,
          outlineOffset: '2px',
        },
        '&:disabled': { opacity: 0.5, cursor: 'default' },
      }}
    >
      {pipColor && (
        <Box
          aria-hidden
          sx={{
            width: '8px',
            height: '8px',
            borderRadius: '1px',
            backgroundColor: pipColor,
            flexShrink: 0,
          }}
        />
      )}
      <Box component="span">{children}</Box>
    </ButtonBase>
  );
}

/**
 * Price popover — radio for delta / porcentaje / absoluto + a numeric
 * input + Apply button. Closes on Apply or click-outside.
 */
function BulkPricePopover({
  foto,
  disabled,
  onApply,
}: {
  foto: FotoTokens;
  disabled: boolean;
  onApply: (next: { mode: BulkPriceMode; value: number }) => void;
}) {
  const anchorRef = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<BulkPriceMode>('absolute');
  const [raw, setRaw] = useState('');

  const close = () => setOpen(false);

  /**
   * El valor tecleado, y si sirve para aplicar.
   *
   * `Number('')` es 0, y 0 es finito: con el guard viejo —`if
   * (!Number.isFinite(n)) return;`— abrir el popover en modo «absoluto» (el que
   * viene por defecto), no escribir nada y darle a Aplicar ponía **$0 a toda la
   * selección**. Sin previsualización, sin confirmación y sin deshacer, con un
   * toast verde encima, y el 0 viajaba a la columna M y a la vitrina. Hay una
   * fila así en producción hoy (#339).
   *
   * Un 0 en modo absoluto NO es un precio: es «no escribí nada». En delta y
   * porcentaje, en cambio, un negativo sí es legítimo (bajar precios), y por eso
   * la regla del `> 0` se aplica sólo al modo absoluto.
   */
  const limpio = raw.replace(/[^0-9.\-]/g, '').trim();
  const n = limpio === '' ? Number.NaN : Number(limpio);
  const valorValido =
    Number.isFinite(n) && (mode !== 'absolute' || n > 0) && !(mode !== 'absolute' && n === 0);

  const apply = () => {
    if (!valorValido) return;
    onApply({ mode, value: n });
    setRaw('');
    close();
  };

  return (
    <>
      <ButtonBase
        ref={anchorRef}
        onClick={() => setOpen(true)}
        disabled={disabled}
        disableRipple
        data-testid="bulk-change-price"
        sx={{
          fontFamily: SANS,
          fontSize: 12,
          color: foto.ink.primary,
          backgroundColor: foto.surfaces.canvas,
          border: `1px solid ${foto.surfaces.edgeStrong}`,
          borderRadius: '4px',
          px: '14px',
          py: '8px',
          transition: foto.motion.rowHover,
          '&:hover': {
            backgroundColor: foto.surfaces.inset,
            borderColor: foto.accent.primary,
          },
          '&:focus-visible': {
            outline: `2px solid ${foto.accent.primary}`,
            outlineOffset: '2px',
          },
          '&:disabled': { opacity: 0.5, cursor: 'default' },
        }}
      >
        Cambiar precio
      </ButtonBase>
      <Popover
        open={open}
        anchorEl={anchorRef.current}
        onClose={close}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
        transformOrigin={{ vertical: 'bottom', horizontal: 'center' }}
        slotProps={{
          paper: {
            sx: {
              backgroundColor: foto.surfaces.panel,
              border: `1px solid ${foto.surfaces.edgeStrong}`,
              borderRadius: '6px',
              boxShadow: 'none',
              p: 2,
              minWidth: 240,
            },
          },
        }}
      >
        <Typography
          sx={{
            fontFamily: SANS,
            fontSize: 11,
            color: foto.ink.tertiary,
            textTransform: 'uppercase',
            letterSpacing: '0.08em',
            mb: 1,
          }}
        >
          Modo
        </Typography>
        <Box
          role="radiogroup"
          aria-label="Modo de cambio de precio"
          sx={{ display: 'flex', gap: '6px', mb: 1.5 }}
        >
          {(
            [
              { v: 'delta', label: 'Delta' },
              { v: 'percent', label: 'Porcentaje' },
              { v: 'absolute', label: 'Absoluto' },
            ] as const
          ).map((opt) => {
            const active = mode === opt.v;
            return (
              <ButtonBase
                key={opt.v}
                role="radio"
                aria-checked={active}
                onClick={() => setMode(opt.v)}
                disableRipple
                data-bulk-price-mode={opt.v}
                sx={{
                  fontFamily: SANS,
                  fontSize: 11,
                  color: active ? foto.ink.inverse : foto.ink.primary,
                  backgroundColor: active
                    ? foto.accent.primary
                    : foto.surfaces.canvas,
                  border: `1px solid ${
                    active ? foto.accent.primary : foto.surfaces.edgeStrong
                  }`,
                  borderRadius: '4px',
                  px: '10px',
                  py: '6px',
                  transition: foto.motion.rowHover,
                }}
              >
                {opt.label}
              </ButtonBase>
            );
          })}
        </Box>
        <Typography
          sx={{
            fontFamily: SANS,
            fontSize: 11,
            color: foto.ink.tertiary,
            textTransform: 'uppercase',
            letterSpacing: '0.08em',
            mb: 0.5,
          }}
        >
          Valor
          {mode === 'delta'
            ? ' (COP +/-)'
            : mode === 'percent'
              ? ' (% +/-)'
              : ' (COP)'}
        </Typography>
        <Box
          component="input"
          type="number"
          value={raw}
          onChange={(e) => setRaw((e.target as HTMLInputElement).value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') apply();
            if (e.key === 'Escape') close();
          }}
          aria-label="Valor"
          sx={{
            fontFamily: SANS,
            fontSize: 13,
            color: foto.ink.primary,
            backgroundColor: foto.surfaces.inset,
            border: `1px solid ${foto.surfaces.edgeStrong}`,
            borderRadius: '4px',
            px: '8px',
            py: '6px',
            width: '100%',
            mb: 1.5,
          }}
        />
        <Box sx={{ display: 'flex', gap: '6px', justifyContent: 'flex-end' }}>
          <ButtonBase
            onClick={close}
            disableRipple
            sx={{
              fontFamily: SANS,
              fontSize: 12,
              color: foto.ink.secondary,
              px: '10px',
              py: '6px',
              borderRadius: '4px',
            }}
          >
            Cancelar
          </ButtonBase>
          <ButtonBase
            onClick={apply}
            disabled={!valorValido}
            disableRipple
            data-testid="bulk-change-price-apply"
            sx={{
              fontFamily: SANS,
              fontSize: 12,
              color: foto.ink.inverse,
              backgroundColor: foto.accent.primary,
              px: '12px',
              py: '6px',
              borderRadius: '4px',
              // Que se VEA que no se puede aplicar, no sólo que no haga nada:
              // un botón que ignora el clic en silencio se lee como que falló
              // la app, y el próximo intento es teclear cualquier cosa.
              '&.Mui-disabled': {
                opacity: 0.4,
                cursor: 'not-allowed',
                color: foto.ink.inverse,
                backgroundColor: foto.accent.primary,
              },
            }}
          >
            Aplicar
          </ButtonBase>
        </Box>
      </Popover>
    </>
  );
}

function BulkColeccionPopover({
  foto,
  disabled,
  collections,
  onApply,
}: {
  foto: FotoTokens;
  disabled: boolean;
  collections: string[];
  onApply: (value: string) => void;
}) {
  const anchorRef = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState('');

  const close = () => setOpen(false);
  const apply = () => {
    const v = value.trim();
    if (!v) return;
    onApply(v);
    setValue('');
    close();
  };

  return (
    <>
      <ButtonBase
        ref={anchorRef}
        onClick={() => setOpen(true)}
        disabled={disabled}
        disableRipple
        data-testid="bulk-change-coleccion"
        sx={{
          fontFamily: SANS,
          fontSize: 12,
          color: foto.ink.primary,
          backgroundColor: foto.surfaces.canvas,
          border: `1px solid ${foto.surfaces.edgeStrong}`,
          borderRadius: '4px',
          px: '14px',
          py: '8px',
          transition: foto.motion.rowHover,
          '&:hover': {
            backgroundColor: foto.surfaces.inset,
            borderColor: foto.accent.primary,
          },
          '&:focus-visible': {
            outline: `2px solid ${foto.accent.primary}`,
            outlineOffset: '2px',
          },
          '&:disabled': { opacity: 0.5, cursor: 'default' },
        }}
      >
        Cambiar colección
      </ButtonBase>
      <Popover
        open={open}
        anchorEl={anchorRef.current}
        onClose={close}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
        transformOrigin={{ vertical: 'bottom', horizontal: 'center' }}
        slotProps={{
          paper: {
            sx: {
              backgroundColor: foto.surfaces.panel,
              border: `1px solid ${foto.surfaces.edgeStrong}`,
              borderRadius: '6px',
              boxShadow: 'none',
              p: 2,
              minWidth: 280,
            },
          },
        }}
      >
        <Typography
          sx={{
            fontFamily: SANS,
            fontSize: 11,
            color: foto.ink.tertiary,
            textTransform: 'uppercase',
            letterSpacing: '0.08em',
            mb: 0.75,
          }}
        >
          Colección
        </Typography>
        <Box
          component="input"
          list="bulk-coleccion-options"
          value={value}
          onChange={(e) => setValue((e.target as HTMLInputElement).value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') apply();
            if (e.key === 'Escape') close();
          }}
          placeholder="p. ej. Muzo Bold"
          aria-label="Colección"
          sx={{
            fontFamily: SANS,
            fontSize: 13,
            color: foto.ink.primary,
            backgroundColor: foto.surfaces.inset,
            border: `1px solid ${foto.surfaces.edgeStrong}`,
            borderRadius: '4px',
            px: '8px',
            py: '6px',
            width: '100%',
            mb: 1.5,
          }}
        />
        <Box component="datalist" id="bulk-coleccion-options">
          {collections.map((c) => (
            <Box component="option" key={c} value={c} />
          ))}
        </Box>
        <Box sx={{ display: 'flex', gap: '6px', justifyContent: 'flex-end' }}>
          <ButtonBase
            onClick={close}
            disableRipple
            sx={{
              fontFamily: SANS,
              fontSize: 12,
              color: foto.ink.secondary,
              px: '10px',
              py: '6px',
              borderRadius: '4px',
            }}
          >
            Cancelar
          </ButtonBase>
          <ButtonBase
            onClick={apply}
            disableRipple
            data-testid="bulk-change-coleccion-apply"
            sx={{
              fontFamily: SANS,
              fontSize: 12,
              color: foto.ink.inverse,
              backgroundColor: foto.accent.primary,
              px: '12px',
              py: '6px',
              borderRadius: '4px',
            }}
          >
            Aplicar
          </ButtonBase>
        </Box>
      </Popover>
    </>
  );
}

function BulkUbicacionPopover({
  foto,
  disabled,
  onApply,
}: {
  foto: FotoTokens;
  disabled: boolean;
  onApply: (value: string) => void;
}) {
  const anchorRef = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState('');

  const close = () => setOpen(false);
  const apply = () => {
    const v = value.trim();
    if (!v) return;
    onApply(v);
    setValue('');
    close();
  };

  return (
    <>
      <ButtonBase
        ref={anchorRef}
        onClick={() => setOpen(true)}
        disabled={disabled}
        disableRipple
        data-testid="bulk-change-ubicacion"
        sx={{
          fontFamily: SANS,
          fontSize: 12,
          color: foto.ink.primary,
          backgroundColor: foto.surfaces.canvas,
          border: `1px solid ${foto.surfaces.edgeStrong}`,
          borderRadius: '4px',
          px: '14px',
          py: '8px',
          transition: foto.motion.rowHover,
          '&:hover': {
            backgroundColor: foto.surfaces.inset,
            borderColor: foto.accent.primary,
          },
          '&:focus-visible': {
            outline: `2px solid ${foto.accent.primary}`,
            outlineOffset: '2px',
          },
          '&:disabled': { opacity: 0.5, cursor: 'default' },
        }}
      >
        Cambiar ubicación
      </ButtonBase>
      <Popover
        open={open}
        anchorEl={anchorRef.current}
        onClose={close}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
        transformOrigin={{ vertical: 'bottom', horizontal: 'center' }}
        slotProps={{
          paper: {
            sx: {
              backgroundColor: foto.surfaces.panel,
              border: `1px solid ${foto.surfaces.edgeStrong}`,
              borderRadius: '6px',
              boxShadow: 'none',
              p: 2,
              minWidth: 240,
            },
          },
        }}
      >
        <Typography
          sx={{
            fontFamily: SANS,
            fontSize: 11,
            color: foto.ink.tertiary,
            textTransform: 'uppercase',
            letterSpacing: '0.08em',
            mb: 0.75,
          }}
        >
          Ubicación
        </Typography>
        <Box
          component="input"
          value={value}
          onChange={(e) => setValue((e.target as HTMLInputElement).value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') apply();
            if (e.key === 'Escape') close();
          }}
          placeholder="p. ej. Caja 12 — anaquel A"
          aria-label="Ubicación"
          sx={{
            fontFamily: SANS,
            fontSize: 13,
            color: foto.ink.primary,
            backgroundColor: foto.surfaces.inset,
            border: `1px solid ${foto.surfaces.edgeStrong}`,
            borderRadius: '4px',
            px: '8px',
            py: '6px',
            width: '100%',
            mb: 1.5,
          }}
        />
        <Box sx={{ display: 'flex', gap: '6px', justifyContent: 'flex-end' }}>
          <ButtonBase
            onClick={close}
            disableRipple
            sx={{
              fontFamily: SANS,
              fontSize: 12,
              color: foto.ink.secondary,
              px: '10px',
              py: '6px',
              borderRadius: '4px',
            }}
          >
            Cancelar
          </ButtonBase>
          <ButtonBase
            onClick={apply}
            disableRipple
            data-testid="bulk-change-ubicacion-apply"
            sx={{
              fontFamily: SANS,
              fontSize: 12,
              color: foto.ink.inverse,
              backgroundColor: foto.accent.primary,
              px: '12px',
              py: '6px',
              borderRadius: '4px',
            }}
          >
            Aplicar
          </ButtonBase>
        </Box>
      </Popover>
    </>
  );
}
