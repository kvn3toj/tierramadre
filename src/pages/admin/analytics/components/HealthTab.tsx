/**
 * HealthTab Component
 * Health score breakdown with achievements progress.
 */

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Typography, LinearProgress, alpha } from '@mui/material';
import {
  FileText,
  Eye,
  Zap,
  Target,
  BarChart3,
  Package,
  Sparkles,
  ChevronDown,
  Lock,
  CheckCircle2,
} from 'lucide-react';
import { useThemeMode } from '../../../../contexts/ThemeContext';
import { emeraldCore, goldAccent, semanticColors } from '../../../../design-system/tokens/colors';
import { iosDimensions } from '../../../../design-system/tokens/primitives/spacing';
import { HealthScoreHero } from '../../../../components/analytics/HealthScoreHero';
import { HorizontalBarChart } from '../../../../components/analytics/HorizontalBarChart';
import { ProgressBar } from '../../../../components/analytics/ProgressBar';
import { InsightCard } from '../../../../components/analytics/InsightCard';
import {
  TabPanel,
  SectionHeader,
  GlassCard,
} from '../../../../components/shared';
import type { HealthScores, Insight } from '../../../../utils/insightGenerator';

interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  xp: number;
}

interface HealthTabProps {
  activeTab: number;
  healthScores: HealthScores;
  healthColor: string;
  healthInsights: Insight[];
  cotizacionTopProducts?: Array<{ itemNumber: number; name: string; count: number; totalValue: number }>;
  achievements: { totalXp: number };
  levelInfo: { level: number; name: string; nextLevelXp: number };
  unlockedAchievements: Array<{ id: string }>;
  ACHIEVEMENTS: Achievement[];
  getAchievementProgress: (id: string) => number;
}

export const HealthTab: React.FC<HealthTabProps> = ({
  activeTab,
  healthScores,
  healthColor,
  healthInsights,
  cotizacionTopProducts,
  achievements,
  levelInfo,
  unlockedAchievements,
  ACHIEVEMENTS,
  getAchievementProgress,
}) => {
  const navigate = useNavigate();
  const { mode } = useThemeMode();
  const isLight = mode === 'light';
  const [achievementsExpanded, setAchievementsExpanded] = useState(false);

  return (
    <TabPanel value={activeTab} index={3}>
      {/* Health Score Hero */}
      <GlassCard>
        <HealthScoreHero
          score={healthScores.overall}
          breakdown={healthScores}
          animated={true}
          size={180}
        />
      </GlassCard>

      {/* Score Breakdown */}
      <Box sx={{ mt: 3 }}>
        <SectionHeader title="Desglose de Puntaje" icon={BarChart3} />
        <GlassCard noPadding>
          <ProgressBar
            value={healthScores.cotizacion}
            label="Cotizaciones"
            sublabel="Meta: 10 cotizaciones"
            color={emeraldCore.primary}
            icon={FileText}
            status={healthScores.cotizacion >= 60 ? 'Activo' : 'Bajo'}
            animated
          />
          <ProgressBar
            value={healthScores.engagement}
            label="Engagement"
            sublabel="Vistas y productos únicos"
            color={goldAccent.primary}
            icon={Eye}
            status={healthScores.engagement >= 60 ? 'Activo' : 'Bajo'}
            animated
          />
          <ProgressBar
            value={healthScores.retention}
            label="Retención"
            sublabel="Racha y sesiones"
            color="#8B5CF6"
            icon={Zap}
            status={healthScores.retention >= 60 ? 'Activo' : 'Bajo'}
            animated
          />
          <ProgressBar
            value={healthScores.conversion}
            label="Conversión"
            sublabel="Cotizaciones por vista"
            color="#F59E0B"
            icon={Target}
            status={healthScores.conversion >= 60 ? 'Activo' : 'Bajo'}
            animated
          />
        </GlassCard>
      </Box>

      {/* Health Recommendations */}
      {healthInsights.length > 0 && (
        <Box sx={{ mt: 3 }}>
          <SectionHeader title="Recomendaciones para Mejorar" icon={Sparkles} />
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
            {healthInsights.map((insight) => (
              <InsightCard
                key={insight.id}
                type={insight.type}
                title={insight.title}
                description={insight.description}
                metric={insight.metric}
              />
            ))}
          </Box>
        </Box>
      )}

      {/* Benchmarks */}
      <Box sx={{ mt: 3 }}>
        <SectionHeader title="Benchmarks" icon={Target} />
        <GlassCard>
          <Box sx={{ display: 'flex', justifyContent: 'space-around', textAlign: 'center' }}>
            <Box>
              <Typography variant="h6" sx={{ fontWeight: 700, color: semanticColors.success.main }}>
                80%
              </Typography>
              <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                Meta
              </Typography>
            </Box>
            <Box>
              <Typography variant="h6" sx={{ fontWeight: 700, color: healthColor }}>
                {healthScores.overall}%
              </Typography>
              <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                Actual
              </Typography>
            </Box>
            <Box>
              <Typography
                variant="h6"
                sx={{
                  fontWeight: 700,
                  color: healthScores.overall >= 80
                    ? semanticColors.success.main
                    : semanticColors.warning.main,
                }}
              >
                {Math.max(0, 80 - healthScores.overall)} pts
              </Typography>
              <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                Gap
              </Typography>
            </Box>
          </Box>
          <LinearProgress
            variant="determinate"
            value={Math.min(100, (healthScores.overall / 80) * 100)}
            sx={{
              mt: 2,
              height: 8,
              borderRadius: 4,
              bgcolor: alpha(emeraldCore.primary, 0.1),
              '& .MuiLinearProgress-bar': {
                bgcolor: healthColor,
                borderRadius: 4,
              },
            }}
          />
        </GlassCard>
      </Box>

      {/* Top Products in Cotizaciones - Value Drivers */}
      {cotizacionTopProducts && cotizacionTopProducts.length > 0 && (
        <Box sx={{ mt: 3 }}>
          <SectionHeader title="Productos que Generan Valor" icon={Package} />
          <GlassCard noPadding>
            <HorizontalBarChart
              data={cotizacionTopProducts.slice(0, 5).map(p => ({
                id: p.itemNumber,
                label: p.name,
                sublabel: `$${(p.totalValue / 1000000).toFixed(1)}M valor total`,
                value: p.count,
              }))}
              color={goldAccent.primary}
              showMedals={true}
              unit="cotizaciones"
              onItemClick={(item) => navigate(`/admin/analytics/item/${item.id}`)}
            />
          </GlassCard>
          {cotizacionTopProducts.length > 0 && (
            <InsightCard
              type="success"
              title="Productos Estrella"
              description={`"${cotizacionTopProducts[0]?.name}" lidera con ${cotizacionTopProducts[0]?.count} cotizaciones. Considera destacarlo en tu portafolio.`}
              metric={{
                value: `$${((cotizacionTopProducts[0]?.totalValue || 0) / 1000000).toFixed(1)}M`,
                label: 'Valor generado',
              }}
              compact
            />
          )}
        </Box>
      )}

      {/* Achievements Progress - Expandable */}
      <Box sx={{ mt: 3 }}>
        <GlassCard noPadding>
          {/* Header - Clickable to expand */}
          <Box
            onClick={() => setAchievementsExpanded(!achievementsExpanded)}
            sx={{
              p: 2.5,
              cursor: 'pointer',
              '&:hover': { bgcolor: alpha(goldAccent.primary, 0.04) },
              transition: 'background-color 0.2s ease',
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                <Box
                  sx={{
                    width: 36,
                    height: 36,
                    borderRadius: iosDimensions.borderRadiusStandard,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    bgcolor: alpha(goldAccent.primary, 0.12),
                  }}
                >
                  <Target size={18} color={goldAccent.primary} />
                </Box>
                <Box>
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>
                    Logros
                  </Typography>
                  <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                    {unlockedAchievements.length} de {ACHIEVEMENTS.length} desbloqueados
                  </Typography>
                </Box>
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Box sx={{ textAlign: 'right' }}>
                  <Typography variant="h6" sx={{ fontWeight: 700, color: goldAccent.primary, lineHeight: 1 }}>
                    {Math.round((unlockedAchievements.length / ACHIEVEMENTS.length) * 100)}%
                  </Typography>
                  <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                    {achievements.totalXp} XP
                  </Typography>
                </Box>
                <Box
                  sx={{
                    transform: achievementsExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
                    transition: 'transform 0.2s ease',
                    color: 'text.secondary',
                  }}
                >
                  <ChevronDown size={20} />
                </Box>
              </Box>
            </Box>
            <LinearProgress
              variant="determinate"
              value={(unlockedAchievements.length / ACHIEVEMENTS.length) * 100}
              sx={{
                height: 6,
                borderRadius: 3,
                bgcolor: alpha(goldAccent.primary, 0.1),
                '& .MuiLinearProgress-bar': {
                  bgcolor: goldAccent.primary,
                  borderRadius: 3,
                },
              }}
            />
          </Box>

          {/* Expanded Achievements List */}
          <Box
            sx={{
              maxHeight: achievementsExpanded ? 600 : 0,
              overflow: 'hidden',
              transition: 'max-height 0.3s ease-in-out',
            }}
          >
            <Box
              sx={{
                borderTop: `1px solid ${alpha(isLight ? '#000' : '#fff', 0.08)}`,
                p: 2,
              }}
            >
              {/* Level Info */}
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 2,
                  mb: 2,
                  p: 1.5,
                  borderRadius: iosDimensions.borderRadiusStandard,
                  bgcolor: alpha(emeraldCore.primary, 0.08),
                }}
              >
                <Typography variant="h5" sx={{ fontSize: '1.5rem' }}>
                  {levelInfo.level <= 2 ? '🌱' : levelInfo.level <= 4 ? '💎' : '👑'}
                </Typography>
                <Box>
                  <Typography variant="body2" sx={{ fontWeight: 700, color: emeraldCore.primary }}>
                    Nivel {levelInfo.level}: {levelInfo.name}
                  </Typography>
                  <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                    {achievements.totalXp} / {levelInfo.nextLevelXp} XP para siguiente nivel
                  </Typography>
                </Box>
              </Box>

              {/* Achievements Grid */}
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                {ACHIEVEMENTS.map((achievement) => {
                  const isUnlocked = unlockedAchievements.some(a => a.id === achievement.id);
                  const progress = getAchievementProgress(achievement.id);

                  return (
                    <Box
                      key={achievement.id}
                      sx={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 1.5,
                        p: 1.5,
                        borderRadius: iosDimensions.borderRadiusStandard,
                        bgcolor: isUnlocked
                          ? alpha(semanticColors.success.main, 0.08)
                          : alpha(isLight ? '#000' : '#fff', 0.03),
                        border: `1px solid ${isUnlocked
                          ? alpha(semanticColors.success.main, 0.2)
                          : alpha(isLight ? '#000' : '#fff', 0.06)}`,
                        opacity: isUnlocked ? 1 : 0.7,
                        transition: 'all 0.2s ease',
                      }}
                    >
                      {/* Icon */}
                      <Box
                        sx={{
                          width: 40,
                          height: 40,
                          borderRadius: '50%',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          bgcolor: isUnlocked
                            ? alpha(goldAccent.primary, 0.15)
                            : alpha(isLight ? '#000' : '#fff', 0.08),
                          fontSize: '1.2rem',
                          position: 'relative',
                        }}
                      >
                        {isUnlocked ? (
                          achievement.icon
                        ) : (
                          <Lock size={16} color={isLight ? '#999' : '#666'} />
                        )}
                        {isUnlocked && (
                          <Box
                            sx={{
                              position: 'absolute',
                              bottom: -2,
                              right: -2,
                              width: 16,
                              height: 16,
                              borderRadius: '50%',
                              bgcolor: semanticColors.success.main,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                            }}
                          >
                            <CheckCircle2 size={12} color="#fff" />
                          </Box>
                        )}
                      </Box>

                      {/* Info */}
                      <Box sx={{ flex: 1, minWidth: 0 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Typography
                            variant="body2"
                            sx={{
                              fontWeight: 600,
                              color: isUnlocked ? 'text.primary' : 'text.secondary',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                            }}
                          >
                            {achievement.name}
                          </Typography>
                          <Typography
                            variant="caption"
                            sx={{
                              px: 0.75,
                              py: 0.25,
                              borderRadius: 1,
                              bgcolor: alpha(goldAccent.primary, 0.12),
                              color: goldAccent.primary,
                              fontWeight: 600,
                              fontSize: '0.65rem',
                              flexShrink: 0,
                            }}
                          >
                            +{achievement.xp} XP
                          </Typography>
                        </Box>
                        <Typography
                          variant="caption"
                          sx={{
                            color: 'text.secondary',
                            display: 'block',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {achievement.description}
                        </Typography>
                        {/* Progress bar for locked achievements */}
                        {!isUnlocked && progress > 0 && (
                          <Box sx={{ mt: 0.5 }}>
                            <LinearProgress
                              variant="determinate"
                              value={progress}
                              sx={{
                                height: 4,
                                borderRadius: 2,
                                bgcolor: alpha(emeraldCore.primary, 0.1),
                                '& .MuiLinearProgress-bar': {
                                  bgcolor: emeraldCore.primary,
                                  borderRadius: 2,
                                },
                              }}
                            />
                            <Typography
                              variant="caption"
                              sx={{ color: emeraldCore.primary, fontSize: '0.6rem', fontWeight: 600 }}
                            >
                              {Math.round(progress)}% completado
                            </Typography>
                          </Box>
                        )}
                      </Box>
                    </Box>
                  );
                })}
              </Box>
            </Box>
          </Box>
        </GlassCard>
      </Box>
    </TabPanel>
  );
};

export default HealthTab;
