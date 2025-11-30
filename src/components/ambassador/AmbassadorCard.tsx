// Ambassador Card Component
// Compact card for directory listing with trust indicators

import {
  Box,
  Card,
  CardContent,
  Typography,
  Avatar,
  Chip,
  Button,
  alpha,
  useTheme,
} from '@mui/material';
import {
  MapPin,
  MessageCircle,
  Star,
  Clock,
  ShoppingBag,
  ChevronRight,
} from 'lucide-react';
import { AmbassadorProfile } from '../../types/ambassador';
import AmbassadorTrustBadge, { AmbassadorBadgeDisplay, AmbassadorTrustCompact } from './AmbassadorTrustBadge';
import { getAmbassadorTrustLevel } from '../../utils/ambassadorTrust';

interface AmbassadorCardProps {
  ambassador: AmbassadorProfile;
  onViewProfile?: (ambassador: AmbassadorProfile) => void;
  onContact?: (ambassador: AmbassadorProfile) => void;
  variant?: 'default' | 'compact' | 'featured';
}

export default function AmbassadorCard({
  ambassador,
  onViewProfile,
  onContact,
  variant = 'default',
}: AmbassadorCardProps) {
  const theme = useTheme();
  const isLight = theme.palette.mode === 'light';

  if (variant === 'compact') {
    return (
      <CompactCard
        ambassador={ambassador}
        onViewProfile={onViewProfile}
        onContact={onContact}
      />
    );
  }

  if (variant === 'featured') {
    return (
      <FeaturedCard
        ambassador={ambassador}
        onViewProfile={onViewProfile}
        onContact={onContact}
      />
    );
  }

  return (
    <Card
      sx={{
        bgcolor: isLight ? '#FFFFFF' : '#1C1C1E',
        borderRadius: 3,
        border: '1px solid',
        borderColor: isLight ? '#E5E7EB' : '#2C2C2E',
        transition: 'all 0.2s ease',
        '&:hover': {
          borderColor: '#059669',
          boxShadow: `0 4px 20px ${alpha('#059669', 0.15)}`,
          transform: 'translateY(-2px)',
        },
      }}
    >
      <CardContent sx={{ p: 2.5 }}>
        {/* Header: Avatar + Basic Info */}
        <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
          <Avatar
            src={ambassador.photoUrl}
            alt={ambassador.displayName}
            sx={{
              width: 64,
              height: 64,
              bgcolor: '#059669',
              fontSize: '1.5rem',
              fontWeight: 700,
            }}
          >
            {ambassador.displayName.charAt(0)}
          </Avatar>

          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
              <Typography
                variant="h6"
                sx={{
                  fontWeight: 700,
                  fontSize: '1rem',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {ambassador.displayName}
              </Typography>
              {ambassador.trustScore && (
                <AmbassadorTrustBadge trustScore={ambassador.trustScore} size="small" />
              )}
            </Box>

            <Typography
              variant="body2"
              sx={{
                color: 'text.secondary',
                fontSize: '0.8rem',
                mb: 0.5,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {ambassador.tagline || 'Asesor de Esmeraldas'}
            </Typography>

            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <MapPin size={12} style={{ color: isLight ? '#6B7280' : '#9CA3AF' }} />
              <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                {ambassador.location.city}, {ambassador.location.country}
              </Typography>
            </Box>
          </Box>
        </Box>

        {/* Stats Row */}
        {ambassador.reputation && (
          <Box
            sx={{
              display: 'flex',
              gap: 2,
              mb: 2,
              py: 1.5,
              px: 2,
              bgcolor: isLight ? '#F9FAFB' : '#2C2C2E',
              borderRadius: 2,
            }}
          >
            <StatItem
              icon={<Star size={14} fill="#F59E0B" color="#F59E0B" />}
              value={ambassador.reputation.averageRating.toFixed(1)}
              label={`(${ambassador.reputation.totalReviews})`}
            />
            <StatItem
              icon={<ShoppingBag size={14} />}
              value={ambassador.reputation.totalSales.toString()}
              label="ventas"
            />
            <StatItem
              icon={<Clock size={14} />}
              value={`${ambassador.reputation.avgResponseTime}h`}
              label="respuesta"
            />
          </Box>
        )}

        {/* Specialties */}
        <Box sx={{ mb: 2 }}>
          <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
            {ambassador.specialties.slice(0, 2).map((specialty) => (
              <Chip
                key={specialty.name}
                label={specialty.name}
                size="small"
                sx={{
                  bgcolor: alpha('#059669', 0.1),
                  color: '#059669',
                  fontSize: '0.7rem',
                  height: 24,
                }}
              />
            ))}
            {ambassador.specialties.length > 2 && (
              <Chip
                label={`+${ambassador.specialties.length - 2}`}
                size="small"
                variant="outlined"
                sx={{ fontSize: '0.7rem', height: 24 }}
              />
            )}
          </Box>
        </Box>

        {/* Badges */}
        {ambassador.verificationStatus.badges.length > 0 && (
          <Box sx={{ mb: 2 }}>
            <AmbassadorBadgeDisplay
              badges={ambassador.verificationStatus.badges}
              maxVisible={3}
            />
          </Box>
        )}

        {/* Actions */}
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button
            variant="contained"
            size="small"
            startIcon={<MessageCircle size={16} />}
            onClick={() => onContact?.(ambassador)}
            sx={{
              flex: 1,
              bgcolor: '#059669',
              '&:hover': { bgcolor: '#047857' },
              textTransform: 'none',
              fontWeight: 600,
            }}
          >
            Contactar
          </Button>
          <Button
            variant="outlined"
            size="small"
            endIcon={<ChevronRight size={16} />}
            onClick={() => onViewProfile?.(ambassador)}
            sx={{
              flex: 1,
              borderColor: isLight ? '#E5E7EB' : '#3C3C3E',
              color: 'text.primary',
              textTransform: 'none',
              fontWeight: 600,
              '&:hover': {
                borderColor: '#059669',
                bgcolor: alpha('#059669', 0.05),
              },
            }}
          >
            Ver Perfil
          </Button>
        </Box>
      </CardContent>
    </Card>
  );
}

// Stat Item Component
function StatItem({
  icon,
  value,
  label,
}: {
  icon: React.ReactNode;
  value: string;
  label: string;
}) {
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
      {icon}
      <Typography variant="caption" sx={{ fontWeight: 700 }}>
        {value}
      </Typography>
      <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: '0.65rem' }}>
        {label}
      </Typography>
    </Box>
  );
}

// Compact Card Variant
function CompactCard({
  ambassador,
  onViewProfile,
}: Omit<AmbassadorCardProps, 'variant'>) {
  const theme = useTheme();
  const isLight = theme.palette.mode === 'light';

  return (
    <Card
      onClick={() => onViewProfile?.(ambassador)}
      sx={{
        bgcolor: isLight ? '#FFFFFF' : '#1C1C1E',
        borderRadius: 2,
        border: '1px solid',
        borderColor: isLight ? '#E5E7EB' : '#2C2C2E',
        cursor: 'pointer',
        transition: 'all 0.2s ease',
        '&:hover': {
          borderColor: '#059669',
          bgcolor: isLight ? '#F9FAFB' : '#2C2C2E',
        },
      }}
    >
      <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 } }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Avatar
            src={ambassador.photoUrl}
            alt={ambassador.displayName}
            sx={{ width: 40, height: 40, bgcolor: '#059669' }}
          >
            {ambassador.displayName.charAt(0)}
          </Avatar>

          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography
              variant="body2"
              sx={{
                fontWeight: 600,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {ambassador.displayName}
            </Typography>
            <Typography variant="caption" sx={{ color: 'text.secondary' }}>
              {ambassador.location.city}
            </Typography>
          </Box>

          {ambassador.trustScore && (
            <AmbassadorTrustCompact score={ambassador.trustScore.overall} />
          )}

          {ambassador.reputation && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <Star size={12} fill="#F59E0B" color="#F59E0B" />
              <Typography variant="caption" sx={{ fontWeight: 600 }}>
                {ambassador.reputation.averageRating.toFixed(1)}
              </Typography>
            </Box>
          )}
        </Box>
      </CardContent>
    </Card>
  );
}

// Featured Card Variant (for homepage spotlight)
function FeaturedCard({
  ambassador,
  onContact,
}: Omit<AmbassadorCardProps, 'variant'>) {
  const theme = useTheme();
  const isLight = theme.palette.mode === 'light';
  const trustLevel = ambassador.trustScore ? getAmbassadorTrustLevel(ambassador.trustScore.overall) : null;

  return (
    <Card
      sx={{
        bgcolor: isLight ? '#FFFFFF' : '#1C1C1E',
        borderRadius: 4,
        border: '2px solid',
        borderColor: trustLevel?.color || '#059669',
        overflow: 'hidden',
        position: 'relative',
      }}
    >
      {/* Banner */}
      <Box
        sx={{
          height: 100,
          background: ambassador.bannerUrl
            ? `url(${ambassador.bannerUrl}) center/cover`
            : `linear-gradient(135deg, ${trustLevel?.color || '#059669'} 0%, ${alpha(trustLevel?.color || '#059669', 0.6)} 100%)`,
        }}
      />

      {/* Avatar overlapping banner */}
      <Box sx={{ px: 3, mt: -5 }}>
        <Avatar
          src={ambassador.photoUrl}
          alt={ambassador.displayName}
          sx={{
            width: 80,
            height: 80,
            bgcolor: '#059669',
            border: '4px solid',
            borderColor: isLight ? '#FFFFFF' : '#1C1C1E',
            fontSize: '2rem',
            fontWeight: 700,
          }}
        >
          {ambassador.displayName.charAt(0)}
        </Avatar>
      </Box>

      <CardContent sx={{ pt: 1, pb: 3, px: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1, mb: 1 }}>
          <Box sx={{ flex: 1 }}>
            <Typography variant="h6" sx={{ fontWeight: 700, mb: 0.5 }}>
              {ambassador.displayName}
            </Typography>
            <Typography variant="body2" sx={{ color: 'text.secondary' }}>
              {ambassador.tagline}
            </Typography>
          </Box>
          {ambassador.trustScore && (
            <AmbassadorTrustBadge trustScore={ambassador.trustScore} size="large" showLabel />
          )}
        </Box>

        {/* Bio excerpt */}
        <Typography
          variant="body2"
          sx={{
            color: 'text.secondary',
            mb: 2,
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
          }}
        >
          {ambassador.bio}
        </Typography>

        {/* Stats */}
        {ambassador.reputation && (
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'space-around',
              py: 2,
              mb: 2,
              borderTop: '1px solid',
              borderBottom: '1px solid',
              borderColor: isLight ? '#E5E7EB' : '#2C2C2E',
            }}
          >
            <Box sx={{ textAlign: 'center' }}>
              <Typography variant="h6" sx={{ fontWeight: 700, color: '#059669' }}>
                {ambassador.reputation.totalSales}
              </Typography>
              <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                Ventas
              </Typography>
            </Box>
            <Box sx={{ textAlign: 'center' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0.5 }}>
                <Typography variant="h6" sx={{ fontWeight: 700 }}>
                  {ambassador.reputation.averageRating.toFixed(1)}
                </Typography>
                <Star size={16} fill="#F59E0B" color="#F59E0B" />
              </Box>
              <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                ({ambassador.reputation.totalReviews} resenas)
              </Typography>
            </Box>
            <Box sx={{ textAlign: 'center' }}>
              <Typography variant="h6" sx={{ fontWeight: 700 }}>
                {ambassador.reputation.repeatCustomerRate * 100}%
              </Typography>
              <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                Recompra
              </Typography>
            </Box>
          </Box>
        )}

        {/* Badges */}
        {ambassador.verificationStatus.badges.length > 0 && (
          <Box sx={{ mb: 2 }}>
            <AmbassadorBadgeDisplay badges={ambassador.verificationStatus.badges} maxVisible={4} />
          </Box>
        )}

        {/* Actions */}
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button
            variant="contained"
            fullWidth
            startIcon={<MessageCircle size={18} />}
            onClick={() => onContact?.(ambassador)}
            sx={{
              bgcolor: trustLevel?.color || '#059669',
              '&:hover': { bgcolor: alpha(trustLevel?.color || '#059669', 0.9) },
              textTransform: 'none',
              fontWeight: 600,
              py: 1.25,
            }}
          >
            Contactar Asesor
          </Button>
        </Box>
      </CardContent>
    </Card>
  );
}
