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
} from 'lucide-react';
import { Asesor } from '../../../../hooks/useAsesores';
import { brand, lightTokens, darkTokens } from '../../../../design-system';

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
}

export const ProfileHeader: React.FC<ProfileHeaderProps> = ({
  asesor,
  stats,
  totalProducts,
  onContact,
  onShare,
  onShareWhatsApp,
  onCopyLink,
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
          <Avatar
            sx={{
              width: 80,
              height: 80,
              bgcolor: brand.emerald[500],
              fontSize: '2rem',
              fontWeight: 700,
            }}
          >
            {asesor.name.charAt(0).toUpperCase()}
          </Avatar>
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
          color="#3B82F6"
        />
        <StatBox
          icon={<Crown size={20} />}
          value={stats.jewelryCount.toString()}
          label="Joyeria"
          color="#8B5CF6"
        />
        <StatBox
          icon={<DollarSign size={20} />}
          value={formatCurrency(stats.totalValue)}
          label="Valor Disponible"
          color="#F59E0B"
        />
      </Box>
    </Paper>
  );
};

export default ProfileHeader;
