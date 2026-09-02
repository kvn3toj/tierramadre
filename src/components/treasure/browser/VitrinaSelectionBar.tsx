/**
 * VitrinaSelectionBar — la barra inferior del modo selección del catálogo.
 *
 * Conteo · espacio · «Limpiar» · «Compartir» · «Listo». **Sin tira de
 * miniaturas**: la grilla detrás ya muestra qué está marcado, y una tira le
 * robaría al catálogo el alto que el asesor vino a usar.
 *
 * Geometría copiada del PATRÓN de `src/pages/admin/ProductManagement/
 * BulkActionBar.tsx` (no del archivo — aquel depende de `FotoTokens`):
 * siempre montada, visibilidad por `translateY` para que la salida se anime en
 * la última deselección, y el despeje inferior por `bottomBarClearance`.
 *
 * Lo que NUNCA se copia es `ComparisonBar.tsx:57` (`calc(72px + env(...))`):
 * ese literal es anterior a `bottomBarClearance` y es exactamente lo que la
 * mixin existe para reemplazar.
 *
 * Spec: docs/superpowers/specs/2026-09-01-seleccion-multiple-vitrina-design.md
 */
import { Box, ButtonBase, Typography, alpha } from '@mui/material';
import { Share2 } from 'lucide-react';
import { useThemeMode } from '../../../contexts/ThemeContext';
import {
  appShell,
  bottomBarClearance,
  getQuietEmerald,
  layoutBreakpoints,
  layoutConstants,
  qeFont,
  zIndex,
} from '../../../design-system';
import { selectionLabel } from '../../../utils/vitrinaSelection';

export interface VitrinaSelectionBarProps {
  visible: boolean;
  count: number;
  max: number;
  atCap: boolean;
  onShare: () => void;
  onClear: () => void;
  onDone: () => void;
}

export default function VitrinaSelectionBar({
  visible,
  count,
  max,
  atCap,
  onShare,
  onClear,
  onDone,
}: VitrinaSelectionBarProps) {
  const { mode } = useThemeMode();
  const qe = getQuietEmerald(mode);
  const isEmpty = count === 0;

  // En el tope el conteo cambia de FORMA, no de tono: "50 piezas
  // seleccionadas" no dice que haya un techo; "50 / 50 piezas" sí.
  const label = atCap ? `${max} / ${max} piezas` : selectionLabel(count);

  return (
    <Box
      role="region"
      aria-label="Piezas seleccionadas para compartir"
      // Siempre montada (la salida se anima en la última deselección), así que
      // sin esto un lector de pantalla encontraría tres botones fantasma en
      // cada pantalla del catálogo.
      aria-hidden={!visible}
      sx={{
        position: 'fixed',
        left: 0,
        // Consume el riel acoplado del Copilot, para desplazarse con el
        // contenido en vez de quedar por debajo (Navigation UX regla 5).
        right: `var(${appShell.railWidthVar}, 0px)`,
        // Debajo del corte de escritorio la barra de pestañas global está
        // visible y hay que despejarla; por encima se esconde sola y sólo
        // queda el área segura (Navigation UX regla 6).
        bottom: bottomBarClearance(appShell.tabBarReserve),
        [`@media (min-width: ${layoutBreakpoints.desktop}px)`]: {
          bottom: 'env(safe-area-inset-bottom, 0px)',
        },
        zIndex: zIndex.fixed,
        backgroundColor: qe.surface,
        borderTop: `1px solid ${qe.border}`,
        // Sólo transform y opacity (DS3 §4.2). Nada de alto ni de posición.
        transform: visible ? 'translateY(0)' : 'translateY(100%)',
        opacity: visible ? 1 : 0,
        transition:
          'transform var(--tm-base) var(--tm-ease), opacity var(--tm-fast) linear',
        // Compuerta dura (DS3 §4.4): con el movimiento apagado la barra
        // aparece y desaparece, no se desliza.
        '@media (prefers-reduced-motion: reduce)': { transition: 'none' },
        pointerEvents: visible ? 'auto' : 'none',
      }}
    >
      <Box
        sx={{
          maxWidth: 1536,
          mx: 'auto',
          px: { xs: 2, md: 3 },
          py: 1,
          display: 'flex',
          alignItems: 'center',
          // 8px mínimo entre blancos adyacentes (DS3 §6.3).
          gap: 1,
        }}
      >
        <Typography
          sx={{
            fontFamily: qeFont.ui,
            fontSize: 13,
            fontWeight: 600,
            color: atCap ? qe.accent : qe.text,
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            minWidth: 0,
          }}
        >
          {label}
        </Typography>

        <Box sx={{ flex: 1, minWidth: 8 }} />

        <BarButton onClick={onClear} disabled={isEmpty} qe={qe}>
          Limpiar
        </BarButton>

        {/* La ÚNICA acción rellena de acento de la pantalla (DS3 §6.3).
            Deshabilitada en cero, nunca oculta: un botón que aparece y
            desaparece mueve los otros dos bajo el dedo. */}
        <BarButton
          onClick={onShare}
          disabled={isEmpty}
          qe={qe}
          filled
          // Ancla estable a la que el hook devuelve el foco al cerrar el
          // diálogo (WCAG 2.4.3) — no es un anzuelo de test.
          dataAttr="data-vitrina-share"
        >
          <Share2 size={15} aria-hidden />
          Compartir
        </BarButton>

        <BarButton onClick={onDone} qe={qe}>
          Listo
        </BarButton>
      </Box>
    </Box>
  );
}

function BarButton({
  onClick,
  disabled = false,
  filled = false,
  qe,
  dataAttr,
  children,
}: {
  onClick: () => void;
  disabled?: boolean;
  filled?: boolean;
  qe: ReturnType<typeof getQuietEmerald>;
  dataAttr?: string;
  children: React.ReactNode;
}) {
  return (
    <ButtonBase
      onClick={onClick}
      disabled={disabled}
      disableRipple
      {...(dataAttr ? { [dataAttr]: '' } : {})}
      sx={{
        fontFamily: qeFont.ui,
        fontSize: 13,
        fontWeight: filled ? 600 : 500,
        // 44px de alto real, no un área de toque simulada: la barra tiene el
        // espacio para darlo (DS3 §6.3).
        minHeight: layoutConstants.minTouchTarget,
        px: filled ? 2 : 1.5,
        gap: 0.75,
        borderRadius: 2,
        flexShrink: 0,
        display: 'inline-flex',
        alignItems: 'center',
        color: filled ? qe.onAccent : qe.text,
        backgroundColor: filled ? qe.accent : 'transparent',
        border: filled ? 'none' : `1px solid ${qe.border}`,
        transition: 'opacity var(--tm-fast) var(--tm-ease)',
        '@media (prefers-reduced-motion: reduce)': { transition: 'none' },
        '&:hover': {
          backgroundColor: filled ? qe.accentStrong : alpha(qe.accent, 0.08),
        },
        // Presión por opacidad, nunca por escala: una escala aquí correría a
        // los botones vecinos bajo el dedo (DS3 §6.1).
        '&:active': { opacity: 0.85 },
        '&:focus-visible': {
          outline: `2px solid ${qe.accent}`,
          outlineOffset: 2,
        },
        '&.Mui-disabled': {
          opacity: 0.45,
          color: filled ? qe.onAccent : qe.muted,
        },
      }}
    >
      {children}
    </ButtonBase>
  );
}
