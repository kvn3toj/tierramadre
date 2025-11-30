// Ambassador Trust Badge Component
// Visual representation of SELLER trust score (not product certification)

import { Box, Tooltip, Typography, LinearProgress, Chip, alpha } from '@mui/material';
import { Award, Star, Zap, Heart, Shield, GraduationCap, Trophy } from 'lucide-react';
import {
  AmbassadorTrustScore,
  AmbassadorBadge,
  AmbassadorBadgeType,
  AMBASSADOR_BADGE_INFO
} from '../../types/ambassador';
import { getAmbassadorTrustLevel, getAmbassadorTrustColor } from '../../utils/ambassadorTrust';

interface AmbassadorTrustBadgeProps {
  trustScore: AmbassadorTrustScore;
  size?: 'small' | 'medium' | 'large';
  showLabel?: boolean;
  showTooltip?: boolean;
}

const TRUST_DIMENSION_LABELS: Record<string, string> = {
  transactionHistory: 'Historial de Ventas',
  customerSatisfaction: 'Satisfaccion del Cliente',
  responseTime: 'Tiempo de Respuesta',
  expertise: 'Experiencia',
  authenticity: 'Autenticidad',
  reliability: 'Confiabilidad'
};

export default function AmbassadorTrustBadge({
  trustScore,
  size = 'medium',
  showLabel = false,
  showTooltip = true
}: AmbassadorTrustBadgeProps) {
  const level = getAmbassadorTrustLevel(trustScore.overall);
  const color = getAmbassadorTrustColor(trustScore.overall);

  const sizeConfig = {
    small: { icon: 14, badge: 20, fontSize: '0.625rem' },
    medium: { icon: 18, badge: 28, fontSize: '0.75rem' },
    large: { icon: 24, badge: 36, fontSize: '0.875rem' },
  };

  const config = sizeConfig[size];

  const tooltipContent = (
    <Box sx={{ p: 1.5, minWidth: 240 }}>
      <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 0.5 }}>
        Reputacion del Asesor
      </Typography>
      <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mb: 1.5 }}>
        Nivel de confianza basado en desempeno
      </Typography>

      <Box sx={{ mb: 2 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
          <Typography variant="caption" sx={{ color: 'text.secondary' }}>
            Puntuacion
          </Typography>
          <Typography variant="caption" sx={{ fontWeight: 700, color }}>
            {trustScore.overall}/100
          </Typography>
        </Box>
        <LinearProgress
          variant="determinate"
          value={trustScore.overall}
          sx={{
            height: 6,
            borderRadius: 3,
            bgcolor: alpha(color, 0.2),
            '& .MuiLinearProgress-bar': {
              bgcolor: color,
              borderRadius: 3,
            },
          }}
        />
      </Box>

      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
        {Object.entries(trustScore.components).map(([key, value]) => (
          <ScoreRow
            key={key}
            label={TRUST_DIMENSION_LABELS[key] || key}
            value={value}
          />
        ))}
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
            bgcolor: level.bgColor,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: level.color,
          }}
        >
          <Star size={12} />
        </Box>
        <Typography variant="caption" sx={{ fontWeight: 600, color: level.color }}>
          {level.label}
        </Typography>
      </Box>

      {trustScore.confidence < 0.7 && (
        <Typography
          variant="caption"
          sx={{
            mt: 1,
            color: 'text.secondary',
            fontStyle: 'italic',
            display: 'block',
            fontSize: '0.6rem',
          }}
        >
          Puntuacion en desarrollo - mas datos requeridos
        </Typography>
      )}

      <Box sx={{ mt: 1.5, pt: 1, borderTop: '1px solid', borderColor: 'divider' }}>
        <Typography
          variant="caption"
          sx={{
            color: 'text.secondary',
            fontStyle: 'italic',
            display: 'block',
            fontSize: '0.65rem',
          }}
        >
          Esta puntuacion evalua AL VENDEDOR, no a la piedra.
        </Typography>
      </Box>
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
        bgcolor: level.bgColor,
        color: level.color,
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
        <Star size={config.icon} fill={level.color} />
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
          {level.label}
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

function ScoreRow({ label, value }: { label: string; value: number }) {
  const color = getAmbassadorTrustColor(value);

  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
      <Typography
        variant="caption"
        sx={{
          color: 'text.secondary',
          minWidth: 100,
          fontSize: '0.65rem',
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
          fontSize: '0.65rem',
        }}
      >
        {value}
      </Typography>
    </Box>
  );
}

// Badge Icon Component
function BadgeIcon({ type, size = 16 }: { type: AmbassadorBadgeType; size?: number }) {
  const iconProps = { size, strokeWidth: 2 };

  switch (type) {
    case 'identity-verified':
      return <Shield {...iconProps} />;
    case 'expert-gemologist':
      return <Award {...iconProps} />;
    case 'top-seller':
      return <Trophy {...iconProps} />;
    case 'fast-responder':
      return <Zap {...iconProps} />;
    case 'customer-favorite':
      return <Heart {...iconProps} />;
    case 'certified-trainer':
      return <GraduationCap {...iconProps} />;
    case 'founders-circle':
      return <Star {...iconProps} />;
    default:
      return <Award {...iconProps} />;
  }
}

// Badge Display Component
interface BadgeDisplayProps {
  badges: AmbassadorBadge[];
  maxVisible?: number;
  size?: 'small' | 'medium';
}

export function AmbassadorBadgeDisplay({ badges, maxVisible = 4, size = 'small' }: BadgeDisplayProps) {
  const visibleBadges = badges.slice(0, maxVisible);
  const hiddenCount = badges.length - maxVisible;

  return (
    <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
      {visibleBadges.map((badge) => {
        const info = AMBASSADOR_BADGE_INFO[badge.type];
        return (
          <Tooltip key={badge.type} title={info.description}>
            <Chip
              icon={<BadgeIcon type={badge.type} size={size === 'small' ? 12 : 14} />}
              label={info.name}
              size="small"
              sx={{
                fontSize: size === 'small' ? '0.65rem' : '0.75rem',
                height: size === 'small' ? 22 : 26,
                '& .MuiChip-icon': {
                  marginLeft: '6px',
                },
              }}
            />
          </Tooltip>
        );
      })}
      {hiddenCount > 0 && (
        <Chip
          label={`+${hiddenCount}`}
          size="small"
          variant="outlined"
          sx={{
            fontSize: size === 'small' ? '0.65rem' : '0.75rem',
            height: size === 'small' ? 22 : 26,
          }}
        />
      )}
    </Box>
  );
}

// Compact Trust Score for List View
export function AmbassadorTrustCompact({ score }: { score: number }) {
  const level = getAmbassadorTrustLevel(score);

  return (
    <Tooltip title={`${level.label}: ${score}/100`}>
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 0.5,
        }}
      >
        <Box
          sx={{
            width: 8,
            height: 8,
            borderRadius: '50%',
            bgcolor: level.color,
            flexShrink: 0,
          }}
        />
        <Typography variant="caption" sx={{ fontWeight: 600, color: level.color }}>
          {score}
        </Typography>
      </Box>
    </Tooltip>
  );
}
