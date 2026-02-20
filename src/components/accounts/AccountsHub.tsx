/**
 * AccountsHub Component
 *
 * Hub page that groups financial tools:
 * - Price Simulator
 * - Receipts Generator
 * - Quotation Generator
 */

import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Typography, Card, CardContent, CardActionArea, Grid, alpha } from '@mui/material';
import { Calculator, Receipt, FileText, TrendingUp, Send, Users } from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';
import { useThemeMode } from '../../contexts/ThemeContext';
import { useIsAdmin, useIsStaff } from '../../hooks/usePermissions';
import { emeraldCore, goldAccent, surfacesLight, surfacesDark } from '../../design-system/tokens/colors';
import { spacing } from '../../design-system/tokens/primitives/spacing';
import { accentColors, iosTypographyScale, cssTransition } from '../../design-system';

interface AccountTool {
  id: string;
  title: string;
  description: string;
  icon: React.ElementType;
  route: string;
  color: string;
  bgColor: string;
}

const AccountsHub: React.FC = () => {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const { mode } = useThemeMode();
  const isAdmin = useIsAdmin();
  const isStaff = useIsStaff();
  const isLight = mode === 'light';

  // Get theme-aware accent colors from design system
  const indigoColor = isLight ? accentColors.indigo.light : accentColors.indigo.dark;
  const cyanColor = isLight ? accentColors.cyan.light : accentColors.cyan.dark;
  const purpleColor = isLight ? accentColors.purple.light : accentColors.purple.dark;
  const orangeColor = isLight ? accentColors.warning.light : accentColors.warning.dark;

  // Build tools list based on permissions
  // - Cotizaciones: All staff (admin, embajador, asesor)
  // - Simulator, Receipts, Provider tools: Admin only
  const tools: AccountTool[] = [
    // Admin-only tools
    ...(isAdmin ? [
      {
        id: 'simulator',
        title: t.tools.simulator.label,
        description: t.tools.simulator.subtitle,
        icon: Calculator,
        route: '/cuentas/simulador',
        color: indigoColor,
        bgColor: alpha(indigoColor, 0.1),
      },
      {
        id: 'receipts',
        title: t.tools.receipts.label,
        description: t.tools.receipts.subtitle,
        icon: Receipt,
        route: '/cuentas/recibos',
        color: cyanColor,
        bgColor: alpha(cyanColor, 0.1),
      },
    ] : []),
    // Staff tools (admin, embajador, asesor)
    ...(isStaff ? [{
      id: 'quotation',
      title: t.tools.cotizacion.label,
      description: t.tools.cotizacion.subtitle,
      icon: FileText,
      route: '/cuentas/cotizaciones',
      color: purpleColor,
      bgColor: alpha(purpleColor, 0.1),
    }] : []),
    // Admin-only: Provider quotation requests
    ...(isAdmin ? [{
      id: 'provider-requests',
      title: 'Solicitudes a Proveedores',
      description: 'Enviar solicitudes de cotizacion',
      icon: Send,
      route: '/cuentas/solicitudes',
      color: orangeColor,
      bgColor: alpha(orangeColor, 0.1),
    },
    {
      id: 'asesor-requests',
      title: 'Solicitudes de Asesores',
      description: 'Ver solicitudes de asesores y embajadores',
      icon: Users,
      route: '/cuentas/solicitudes-asesores',
      color: emeraldCore.primary,
      bgColor: alpha(emeraldCore.primary, 0.1),
    }] : []),
  ];

  const handleToolClick = (route: string) => {
    navigate(route);
  };

  return (
    <Box
      sx={{
        maxWidth: 1200,
        mx: 'auto',
        px: { xs: 2, sm: 3, md: 4 },
        py: { xs: 3, md: 4 },
      }}
    >
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1 }}>
          <Box
            sx={{
              width: 48,
              height: 48,
              borderRadius: 3,
              bgcolor: alpha(emeraldCore.primary, 0.1),
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <TrendingUp size={24} color={emeraldCore.primary} />
          </Box>
          <Typography
            variant="h1"
            sx={{
              fontSize: { xs: iosTypographyScale.title1, md: iosTypographyScale.largeTitle },
              fontWeight: 700,
              color: isLight ? surfacesLight.text.primary : surfacesDark.text.primary,
            }}
          >
            {t.pages.accounts.title}
          </Typography>
        </Box>
        <Typography
          variant="body1"
          sx={{
            color: isLight ? surfacesLight.text.secondary : surfacesDark.text.secondary,
            fontSize: iosTypographyScale.callout,
          }}
        >
          {t.pages.accounts.subtitle}
        </Typography>
      </Box>

      {/* Tools Grid */}
      <Grid container spacing={3}>
        {tools.map((tool) => {
          const Icon = tool.icon;

          return (
            <Grid item xs={12} sm={6} md={4} key={tool.id}>
              <Card
                elevation={0}
                sx={{
                  height: '100%',
                  borderRadius: spacing.lg,
                  border: '1px solid',
                  borderColor: isLight ? surfacesLight.border.light : surfacesDark.border.default,
                  bgcolor: isLight ? surfacesLight.background.primary : surfacesDark.background.primary,
                  transition: cssTransition.slow,
                  '&:hover': {
                    borderColor: tool.color,
                    transform: 'translateY(-4px)',
                    boxShadow: `0 12px 24px ${alpha(tool.color, 0.2)}`,
                  },
                }}
              >
                <CardActionArea
                  onClick={() => handleToolClick(tool.route)}
                  sx={{
                    height: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'flex-start',
                    justifyContent: 'flex-start',
                  }}
                >
                  <CardContent sx={{ width: '100%', p: 3 }}>
                    {/* Icon */}
                    <Box
                      sx={{
                        width: 56,
                        height: 56,
                        borderRadius: spacing.md,
                        bgcolor: tool.bgColor,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        mb: 2,
                      }}
                    >
                      <Icon size={28} color={tool.color} />
                    </Box>

                    {/* Title */}
                    <Typography
                      variant="h3"
                      sx={{
                        fontSize: iosTypographyScale.title3,
                        fontWeight: 600,
                        color: isLight ? surfacesLight.text.primary : surfacesDark.text.primary,
                        mb: 1,
                      }}
                    >
                      {tool.title}
                    </Typography>

                    {/* Description */}
                    <Typography
                      variant="body2"
                      sx={{
                        color: isLight ? surfacesLight.text.secondary : surfacesDark.text.secondary,
                        fontSize: iosTypographyScale.subhead,
                        lineHeight: 1.6,
                      }}
                    >
                      {tool.description}
                    </Typography>
                  </CardContent>
                </CardActionArea>
              </Card>
            </Grid>
          );
        })}
      </Grid>

      {/* Quick Info Section */}
      <Box
        sx={{
          mt: 6,
          p: 3,
          borderRadius: spacing.lg,
          bgcolor: alpha(goldAccent.primary, 0.05),
          border: '1px solid',
          borderColor: alpha(goldAccent.primary, 0.2),
        }}
      >
        <Typography
          variant="h4"
          sx={{
            fontSize: iosTypographyScale.callout,
            fontWeight: 600,
            color: goldAccent.dark,
            mb: 1,
          }}
        >
          Gestiona tus operaciones financieras
        </Typography>
        <Typography
          variant="body2"
          sx={{
            color: isLight ? surfacesLight.text.secondary : surfacesDark.text.secondary,
            lineHeight: 1.7,
          }}
        >
          Accede a herramientas profesionales para calcular valuaciones, generar recibos oficiales
          y crear cotizaciones personalizadas directamente desde tu inventario.
        </Typography>
      </Box>
    </Box>
  );
};

export default AccountsHub;
