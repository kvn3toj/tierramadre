/**
 * ProfileHeader Component
 * Avatar, name, contact info, stats, and action buttons for asesor profile.
 */

import React from 'react';
import {
  Box,
  Typography,
  Avatar,
  Button,
  Paper,
  Chip,
  IconButton,
  Tooltip,
  CircularProgress,
  alpha,
  useTheme,
} from '@mui/material';
import {
  Package,
  Phone,
  Gem,
  DollarSign,
  Share2,
  CheckCircle,
  Crown,
  Link2,
  MessageCircle,
  Camera,
} from 'lucide-react';
import { Asesor } from '../../../../hooks/useAsesores';
import { brand, lightTokens, darkTokens, cssTransition, accentColors } from '../../../../design-system';

// Stat Box Component
function StatBox({
  icon,
  value,
  label,
  color,
}: {
  icon: React.ReactNode;
  value: string;
  label: string;
  color: string;
}) {
  const theme = useTheme();
  const isLight = theme.palette.mode === 'light';

  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 1.5,
        px: 2,
        py: 1.5,
        borderRadius: 2,
        bgcolor: alpha(color, isLight ? 0.1 : 0.15),
        minWidth: 130,
        flex: '1 1 auto',
      }}
    >
      <Box sx={{ color }}>{icon}</Box>
      <Box>
        <Typography
          variant="h6"
          sx={{ fontWeight: 700, fontSize: '1.1rem', lineHeight: 1, color }}
        >
          {value}
        </Typography>
        <Typography variant="caption" sx={{ color: 'text.secondary' }}>
          {label}
        </Typography>
      </Box>
    </Box>
  );
}

// Format currency helper
function formatCurrency(value: number): string {
  if (value >= 1000000) {
    return `$${(value / 1000000).toFixed(1)}M`;
  }
  if (value >= 1000) {
    return `$${Math.round(value / 1000)}K`;
  }
  return `$${value.toLocaleString('es-CO')}`;
}

export interface ProfileStats {
  totalValue: number;
  avgPrice: number;
  looseCount: number;
  jewelryCount: number;
  disponibleCount: number;
  vendidaCount: number;
}

interface ProfileHeaderProps {
  asesor: Asesor;
  stats: ProfileStats;
  totalProducts: number;
  onContact: () => void;
  onShare: () => void;
  onShareWhatsApp?: () => void;
  onCopyLink?: () => void;
  isOwner?: boolean;
  onPhotoEdit?: () => void;
  photoUrl?: string;
  isUploadingPhoto?: boolean;
}

export const ProfileHeader: React.FC<ProfileHeaderProps> = ({
  asesor,
  stats,
  totalProducts,
  onContact,
  onShare,
  onShareWhatsApp,
  onCopyLink,
  isOwner,
  onPhotoEdit,
  photoUrl,
  isUploadingPhoto,
}) => {
  const theme = useTheme();
  const isLight = theme.palette.mode === 'light';

  return (
    <Paper
      elevation={0}
      sx={{
        p: 3,
        mb: 3,
        borderRadius: 3,
        bgcolor: isLight ? lightTokens.background.surface : darkTokens.background.surface,
        border: '1px solid',
        borderColor: isLight ? lightTokens.border.default : darkTokens.border.default,
      }}
    >
      <Box sx={{ display: 'flex', gap: 3, flexWrap: 'wrap', alignItems: 'flex-start' }}>
        {/* Avatar and Name */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flex: 1, minWidth: 250 }}>
          <Box sx={{ position: 'relative', flexShrink: 0 }}>
            <Avatar
              src={photoUrl || asesor.photoUrl}
              sx={{
                width: 80,
                height: 80,
                bgcolor: brand.emerald[500],
                fontSize: '2rem',
                fontWeight: 700,
                opacity: isUploadingPhoto ? 0.6 : 1,
                transition: cssTransition.default,
              }}
            >
              {asesor.name.charAt(0).toUpperCase()}
            </Avatar>
            {isUploadingPhoto && (
              <CircularProgress
                aria-label="Cargando"
                size={28}
                sx={{
                  position: 'absolute',
                  top: '50%',
                  left: '50%',
                  mt: '-14px',
                  ml: '-14px',
                  color: brand.emerald[500],
                }}
              />
            )}
            {isOwner && onPhotoEdit && (
              <IconButton
                onClick={onPhotoEdit}
                disabled={isUploadingPhoto}
                size="small"
                sx={{
                  position: 'absolute',
                  bottom: -2,
                  right: -2,
                  width: 28,
                  height: 28,
                  bgcolor: brand.emerald[500],
                  color: '#fff',
                  border: '2px solid',
                  borderColor: isLight ? lightTokens.background.surface : darkTokens.background.surface,
                  '&:hover': { bgcolor: brand.emerald[600] },
                  '&.Mui-disabled': { bgcolor: brand.emerald[300], color: '#fff' },
                }}
              >
                <Camera size={14} />
              </IconButton>
            )}
          </Box>
          <Box>
            <Typography variant="h5" sx={{ fontWeight: 700, mb: 0.5 }}>
              {asesor.name}
            </Typography>
            <Typography variant="body2" sx={{ color: 'text.secondary', mb: 1 }}>
              Embajador de Esmeraldas - Tierra Madre
            </Typography>
            <Box sx={{ display: 'flex', gap: 1 }}>
              <Chip
                size="small"
                icon={<CheckCircle size={12} />}
                label={`${stats.disponibleCount} disponibles`}
                sx={{
                  bgcolor: alpha(brand.emerald[500], 0.1),
                  color: brand.emerald[500],
                  fontSize: '0.7rem',
                }}
              />
              {stats.vendidaCount > 0 && (
                <Chip
                  size="small"
                  label={`${stats.vendidaCount} vendidas`}
                  sx={{
                    bgcolor: alpha(lightTokens.text.muted, 0.1),
                    color: lightTokens.text.secondary,
                    fontSize: '0.7rem',
                  }}
                />
              )}
            </Box>
          </Box>
        </Box>

        {/* Action Buttons */}
        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
          {onShareWhatsApp && (
            <Tooltip title="Compartir por WhatsApp">
              <IconButton
                onClick={onShareWhatsApp}
                sx={{
                  color: '#25D366',
                  '&:hover': { bgcolor: alpha('#25D366', 0.1) },
                }}
              >
                <MessageCircle size={20} />
              </IconButton>
            </Tooltip>
          )}
          {onCopyLink && (
            <Tooltip title="Copiar enlace">
              <IconButton onClick={onCopyLink} sx={{ color: 'text.secondary' }}>
                <Link2 size={20} />
              </IconButton>
            </Tooltip>
          )}
          <Tooltip title="Compartir perfil">
            <IconButton onClick={onShare} sx={{ color: 'text.secondary' }}>
              <Share2 size={20} />
            </IconButton>
          </Tooltip>
          <Button
            variant="contained"
            startIcon={<Phone size={18} />}
            onClick={onContact}
            sx={{
              bgcolor: brand.emerald[500],
              '&:hover': { bgcolor: brand.emerald[600] },
              textTransform: 'none',
              fontWeight: 600,
            }}
          >
            Contactar
          </Button>
        </Box>
      </Box>

      {/* Stats */}
      <Box
        sx={{
          display: 'flex',
          gap: 2,
          mt: 3,
          pt: 3,
          borderTop: '1px solid',
          borderColor: isLight ? lightTokens.border.default : darkTokens.border.default,
          flexWrap: 'wrap',
        }}
      >
        <StatBox
          icon={<Package size={20} />}
          value={totalProducts.toString()}
          label="Total Productos"
          color={brand.emerald[500]}
        />
        <StatBox
          icon={<Gem size={20} />}
          value={stats.looseCount.toString()}
          label="Gemas"
          color={accentColors.info.light}
        />
        <StatBox
          icon={<Crown size={20} />}
          value={stats.jewelryCount.toString()}
          label="Joyeria"
          color={accentColors.purple.light}
        />
        <StatBox
          icon={<DollarSign size={20} />}
          value={formatCurrency(stats.totalValue)}
          label="Valor Disponible"
          color={accentColors.warning.light}
        />
      </Box>
    </Paper>
  );
};

export default ProfileHeader;
