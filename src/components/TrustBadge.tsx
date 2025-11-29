import { Box, Tooltip, Typography, LinearProgress, Divider, alpha } from '@mui/material';
import { Award, CircleDashed } from 'lucide-react';
import { TrustScoreBreakdown, TrustBadge as TrustBadgeType } from '../types';
import { getTrustBadge, getTrustScoreColor } from '../utils/trustScore';

interface TrustBadgeProps {
  score: TrustScoreBreakdown;
  size?: 'small' | 'medium' | 'large';
  showLabel?: boolean;
  showTooltip?: boolean;
}

const getCertIcon = (level: TrustBadgeType['level'], size: number) => {
  const props = { size, strokeWidth: 2 };
  if (level === 'NONE') {
    return <CircleDashed {...props} />;
  }
  return <Award {...props} />;
};

export default function TrustBadge({
  score,
  size = 'medium',
  showLabel = false,
  showTooltip = true
}: TrustBadgeProps) {
  const badge = getTrustBadge(score.overall);

  const sizeConfig = {
    small: { icon: 14, badge: 20, fontSize: '0.625rem' },
    medium: { icon: 18, badge: 28, fontSize: '0.75rem' },
    large: { icon: 24, badge: 36, fontSize: '0.875rem' },
  };

  const config = sizeConfig[size];

  const tooltipContent = (
    <Box sx={{ p: 1.5, minWidth: 220 }}>
      <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 0.5 }}>
        Certificacion del Producto
      </Typography>
      <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mb: 1.5 }}>
        Nivel de autenticidad de la esmeralda
      </Typography>

      <Box sx={{ mb: 2 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
          <Typography variant="caption" sx={{ color: 'text.secondary' }}>
            Puntuacion
          </Typography>
          <Typography variant="caption" sx={{ fontWeight: 700, color: badge.color }}>
            {score.overall}/100
          </Typography>
        </Box>
        <LinearProgress
          variant="determinate"
          value={score.overall}
          sx={{
            height: 6,
            borderRadius: 3,
            bgcolor: alpha(badge.color, 0.2),
            '& .MuiLinearProgress-bar': {
              bgcolor: badge.color,
              borderRadius: 3,
            },
          }}
        />
      </Box>

      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
        <ScoreRow label="Trazabilidad" value={score.provenance} weight="25%" />
        <ScoreRow label="Gemologia" value={score.quality} weight="30%" />
        <ScoreRow label="Estetica" value={score.aesthetic} weight="20%" />
        <ScoreRow label="Mercado" value={score.market} weight="25%" />
      </Box>

      <Box
        sx={{
          mt: 2,
          pt: 1.5,
          borderTop: '1px solid',
          borderColor: 'divider',
          display: 'flex',
          alignItems: 'center',
          gap: 1,
        }}
      >
        <Box
          sx={{
            width: 20,
            height: 20,
            borderRadius: '50%',
            bgcolor: badge.bgColor,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: badge.color,
          }}
        >
          {getCertIcon(badge.level, 12)}
        </Box>
        <Typography variant="caption" sx={{ fontWeight: 600, color: badge.color }}>
          {badge.label}
        </Typography>
      </Box>

      <Divider sx={{ my: 1.5 }} />
      <Typography
        variant="caption"
        sx={{
          color: 'text.secondary',
          fontStyle: 'italic',
          display: 'block',
          fontSize: '0.65rem',
        }}
      >
        Esta calificacion evalua LA PIEDRA, no al vendedor.
      </Typography>
    </Box>
  );

  const badgeElement = (
    <Box
      sx={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 0.5,
        px: showLabel ? 1 : 0,
        py: showLabel ? 0.25 : 0,
        borderRadius: showLabel ? 2 : '50%',
        bgcolor: badge.bgColor,
        color: badge.color,
        cursor: showTooltip ? 'help' : 'default',
      }}
    >
      <Box
        sx={{
          width: config.badge,
          height: config.badge,
          borderRadius: '50%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {getCertIcon(badge.level, config.icon)}
      </Box>
      {showLabel && (
        <Typography
          sx={{
            fontSize: config.fontSize,
            fontWeight: 700,
            letterSpacing: '-0.01em',
            pr: 0.5,
          }}
        >
          {badge.labelShort}
        </Typography>
      )}
    </Box>
  );

  if (showTooltip) {
    return (
      <Tooltip
        title={tooltipContent}
        arrow
        placement="top"
        slotProps={{
          tooltip: {
            sx: {
              bgcolor: 'background.paper',
              color: 'text.primary',
              boxShadow: 3,
              '& .MuiTooltip-arrow': {
                color: 'background.paper',
              },
            },
          },
        }}
      >
        {badgeElement}
      </Tooltip>
    );
  }

  return badgeElement;
}

function ScoreRow({ label, value, weight }: { label: string; value: number; weight: string }) {
  const color = getTrustScoreColor(value);

  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
      <Typography
        variant="caption"
        sx={{
          color: 'text.secondary',
          minWidth: 70,
        }}
      >
        {label}
      </Typography>
      <Box sx={{ flex: 1 }}>
        <LinearProgress
          variant="determinate"
          value={value}
          sx={{
            height: 4,
            borderRadius: 2,
            bgcolor: alpha(color, 0.15),
            '& .MuiLinearProgress-bar': {
              bgcolor: color,
              borderRadius: 2,
            },
          }}
        />
      </Box>
      <Typography
        variant="caption"
        sx={{
          fontWeight: 600,
          minWidth: 24,
          textAlign: 'right',
        }}
      >
        {value}
      </Typography>
      <Typography
        variant="caption"
        sx={{
          color: 'text.disabled',
          fontSize: '0.6rem',
          minWidth: 24,
        }}
      >
        {weight}
      </Typography>
    </Box>
  );
}

// Compact version for list view
export function TrustBadgeCompact({ score }: { score: TrustScoreBreakdown }) {
  const badge = getTrustBadge(score.overall);

  return (
    <Tooltip title={`${badge.label}: ${score.overall}/100`}>
      <Box
        sx={{
          width: 8,
          height: 8,
          borderRadius: '50%',
          bgcolor: badge.color,
          flexShrink: 0,
        }}
      />
    </Tooltip>
  );
}
