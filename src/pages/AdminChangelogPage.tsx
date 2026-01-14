/**
 * Admin Changelog Page
 *
 * Visual development report with Mermaid diagrams.
 * Shows commits, code changes, and architecture evolution.
 * Admin-only access.
 */

import React, { useEffect, useRef, useMemo } from 'react';
import {
  Box,
  Typography,
  Paper,
  Grid,
  alpha,
  Chip,
  Divider,
  LinearProgress,
} from '@mui/material';
import {
  GitCommit,
  GitBranch,
  FileCode,
  Plus,
  Minus,
  Layers,
  Shield,
  BarChart3,
  Zap,
  Trash2,
  Activity,
  Bug,
  Wrench,
  Users,
  TrendingUp,
  FileText,
} from 'lucide-react';
import { useThemeMode } from '../contexts/ThemeContext';
import { emeraldCore, goldAccent, semanticColors } from '../design-system/tokens/colors';
import { spacing } from '../design-system/tokens/primitives/spacing';
import { changelogData, ChangelogCommit } from '../data/changelog-data';

// Mermaid CDN - loaded dynamically
declare global {
  interface Window {
    mermaid: {
      initialize: (config: object) => void;
      run: (config?: { nodes?: NodeListOf<Element> }) => Promise<void>;
    };
  }
}

// Category configuration with icons and colors
const CATEGORY_CONFIG: Record<string, { name: string; icon: React.ElementType; color: string }> = {
  ux: { name: 'iOS HIG y UX', icon: Layers, color: emeraldCore.primary },
  auth: { name: 'Auth y Permisos', icon: Shield, color: '#6366F1' },
  analytics: { name: 'Analytics', icon: BarChart3, color: '#8B5CF6' },
  performance: { name: 'Rendimiento', icon: Zap, color: goldAccent.primary },
  cleanup: { name: 'Limpieza', icon: Trash2, color: semanticColors.error.main },
  bugfix: { name: 'Bug Fixes', icon: Bug, color: '#F97316' },
  other: { name: 'Otros', icon: Wrench, color: '#64748B' },
};

// Type configuration
const TYPE_CONFIG: Record<string, { name: string; color: string }> = {
  feat: { name: 'Features', color: emeraldCore.primary },
  fix: { name: 'Fixes', color: goldAccent.primary },
  refactor: { name: 'Refactors', color: '#8B5CF6' },
  docs: { name: 'Docs', color: '#64748B' },
  style: { name: 'Style', color: '#06B6D4' },
  test: { name: 'Tests', color: '#F97316' },
  chore: { name: 'Chores', color: '#6B7280' },
  other: { name: 'Other', color: '#94A3B8' },
};

// Generate Mermaid diagrams from data
function generateMermaidDiagrams(commits: ChangelogCommit[], categoryStats: Record<string, number>) {
  // Git Graph - last 8 commits
  const gitGraphCommits = commits.slice(0, 8).reverse();
  const gitGraph = `
%%{init: {'theme': 'dark', 'themeVariables': { 'primaryColor': '#10B981', 'primaryTextColor': '#fff', 'primaryBorderColor': '#34D399', 'lineColor': '#F59E0B', 'secondaryColor': '#1E293B', 'tertiaryColor': '#0F172A'}}}%%
gitGraph
${gitGraphCommits.map(c => {
    const tag = c.message.split(' ')[0].slice(0, 8);
    const type = c.type === 'fix' ? ' type: HIGHLIGHT' : '';
    return `   commit id: "${c.hash}"${type} tag: "${tag}"`;
  }).join('\n')}`;

  // Pie Chart - category distribution
  const pieData = Object.entries(categoryStats)
    .filter(([, count]) => count > 0)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5)
    .map(([cat, count]) => `    "${CATEGORY_CONFIG[cat]?.name || cat}" : ${count}`)
    .join('\n');

  const pieChart = `
%%{init: {'theme': 'dark', 'themeVariables': { 'pie1': '#10B981', 'pie2': '#6366F1', 'pie3': '#8B5CF6', 'pie4': '#F59E0B', 'pie5': '#EF4444', 'pieStrokeColor': '#1E293B', 'pieOuterStrokeColor': '#0F172A'}}}%%
pie showData
    title Commits por Categoría
${pieData}`;

  return { gitGraph, pieChart };
}

// Stat Card Component
interface StatCardProps {
  value: string | number;
  label: string;
  color?: string;
}

const StatCard: React.FC<StatCardProps> = ({ value, label, color = emeraldCore.light }) => {
  const { mode } = useThemeMode();
  const isLight = mode === 'light';

  return (
    <Paper
      elevation={0}
      sx={{
        p: 2.5,
        borderRadius: 3,
        bgcolor: isLight ? 'background.paper' : alpha('#000', 0.2),
        border: `1px solid ${isLight ? alpha('#000', 0.08) : alpha('#fff', 0.1)}`,
        textAlign: 'center',
        transition: 'transform 0.3s, box-shadow 0.3s',
        '&:hover': {
          transform: 'translateY(-4px)',
          boxShadow: `0 20px 40px ${alpha(emeraldCore.primary, 0.2)}`,
        },
      }}
    >
      <Typography
        variant="h3"
        sx={{
          fontWeight: 800,
          color: color,
          mb: 0.5,
        }}
      >
        {typeof value === 'number' ? value.toLocaleString() : value}
      </Typography>
      <Typography variant="body2" sx={{ color: 'text.secondary' }}>
        {label}
      </Typography>
    </Paper>
  );
};

// Mermaid Diagram Component
interface MermaidDiagramProps {
  definition: string;
  title: string;
}

const MermaidDiagram: React.FC<MermaidDiagramProps> = ({ definition, title }) => {
  const { mode } = useThemeMode();
  const isLight = mode === 'light';
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const renderDiagram = async () => {
      if (typeof window !== 'undefined' && window.mermaid && containerRef.current) {
        containerRef.current.innerHTML = definition;
        try {
          await window.mermaid.run({ nodes: containerRef.current.querySelectorAll('.mermaid-content') });
        } catch (e) {
          // Fallback: just render the pre element
          containerRef.current.innerHTML = `<pre class="mermaid">${definition}</pre>`;
          await window.mermaid.run();
        }
      }
    };

    renderDiagram();
  }, [definition]);

  return (
    <Paper
      elevation={0}
      sx={{
        p: 2.5,
        borderRadius: 3,
        bgcolor: isLight ? 'background.paper' : alpha('#000', 0.2),
        border: `1px solid ${isLight ? alpha('#000', 0.08) : alpha('#fff', 0.1)}`,
        height: '100%',
      }}
    >
      <Typography
        variant="subtitle1"
        sx={{
          fontWeight: 600,
          color: emeraldCore.light,
          mb: 2,
          display: 'flex',
          alignItems: 'center',
          gap: 1,
        }}
      >
        <Activity size={18} />
        {title}
      </Typography>
      <Box
        ref={containerRef}
        sx={{
          display: 'flex',
          justifyContent: 'center',
          bgcolor: alpha('#000', 0.1),
          borderRadius: 2,
          p: 2,
          overflow: 'auto',
          '& .mermaid': {
            display: 'flex',
            justifyContent: 'center',
          },
        }}
      >
        <pre className="mermaid">{definition}</pre>
      </Box>
    </Paper>
  );
};

// Progress Bar Component
interface ProgressBarProps {
  label: string;
  value: number;
  maxValue: number;
  color: string;
}

const ProgressBar: React.FC<ProgressBarProps> = ({ label, value, maxValue, color }) => {
  const percentage = maxValue > 0 ? (value / maxValue) * 100 : 0;

  return (
    <Box sx={{ mb: 1.5 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
        <Typography variant="body2" sx={{ fontWeight: 500 }}>{label}</Typography>
        <Typography variant="body2" sx={{ color: 'text.secondary' }}>{value}</Typography>
      </Box>
      <LinearProgress
        variant="determinate"
        value={percentage}
        sx={{
          height: 8,
          borderRadius: 1,
          bgcolor: alpha(color, 0.1),
          '& .MuiLinearProgress-bar': {
            bgcolor: color,
            borderRadius: 1,
          },
        }}
      />
    </Box>
  );
};

// Main Component
const AdminChangelogPage: React.FC = () => {
  const { mode } = useThemeMode();
  const isLight = mode === 'light';

  // Get data from generated file
  const { stats, commits, categoryStats, typeStats, mostChangedFiles, contributors, dateRange, branchInfo, generatedAt } = changelogData;

  // Generate Mermaid diagrams dynamically
  const diagrams = useMemo(() => generateMermaidDiagrams(commits, categoryStats), [commits, categoryStats]);

  // Categories with counts
  const categories = useMemo(() => {
    return Object.entries(categoryStats)
      .filter(([, count]) => count > 0)
      .sort(([, a], [, b]) => b - a)
      .map(([key, count]) => ({
        key,
        ...CATEGORY_CONFIG[key] || CATEGORY_CONFIG.other,
        count,
      }));
  }, [categoryStats]);

  // Most impactful commits (highlights)
  const highlights = useMemo(() => {
    return [...commits]
      .sort((a, b) => (b.additions + b.deletions) - (a.additions + a.deletions))
      .slice(0, 4)
      .map(c => ({
        title: CATEGORY_CONFIG[c.category]?.name || c.category,
        desc: c.message.slice(0, 80),
        hash: c.hash,
      }));
  }, [commits]);

  // Max values for progress bars
  const maxTypeCount = Math.max(...Object.values(typeStats), 1);
  const maxFileCount = mostChangedFiles[0]?.count || 1;

  // Load Mermaid on mount
  useEffect(() => {
    const loadMermaid = async () => {
      if (typeof window !== 'undefined' && !window.mermaid) {
        const script = document.createElement('script');
        script.src = 'https://cdn.jsdelivr.net/npm/mermaid@10/dist/mermaid.min.js';
        script.async = true;
        script.onload = () => {
          window.mermaid.initialize({
            startOnLoad: true,
            theme: 'dark',
            securityLevel: 'loose',
            fontFamily: 'Inter, sans-serif',
            flowchart: { useMaxWidth: true, htmlLabels: true, curve: 'basis' },
            gitGraph: { useMaxWidth: true, showCommitLabel: true },
          });
        };
        document.head.appendChild(script);
      } else if (window.mermaid) {
        window.mermaid.initialize({ startOnLoad: true, theme: 'dark', securityLevel: 'loose' });
      }
    };

    loadMermaid();
  }, []);

  return (
    <Box sx={{ p: spacing.md, pb: 10 }}>
      {/* Header */}
      <Box sx={{ textAlign: 'center', mb: 4 }}>
        <Typography
          variant="h4"
          sx={{
            fontWeight: 800,
            background: `linear-gradient(135deg, ${emeraldCore.light}, ${goldAccent.primary})`,
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
            mb: 1,
          }}
        >
          Tierra Madre Studio
        </Typography>
        <Typography variant="body1" sx={{ color: 'text.secondary', mb: 2 }}>
          Reporte de Progreso de Desarrollo
        </Typography>
        <Box sx={{ display: 'flex', justifyContent: 'center', gap: 1, flexWrap: 'wrap' }}>
          <Chip
            label={`${dateRange.start} - ${dateRange.end}`}
            sx={{
              bgcolor: alpha(emeraldCore.primary, 0.15),
              border: `1px solid ${emeraldCore.primary}`,
              color: emeraldCore.light,
              fontWeight: 500,
            }}
          />
          <Chip
            icon={<GitBranch size={14} />}
            label={branchInfo.currentBranch}
            size="small"
            sx={{ bgcolor: alpha('#fff', 0.1), color: 'text.secondary' }}
          />
        </Box>
      </Box>

      {/* Stats Row */}
      <Grid container spacing={2} sx={{ mb: 4 }}>
        <Grid item xs={6} md={3}>
          <StatCard value={stats.totalCommits} label="Commits" color={emeraldCore.light} />
        </Grid>
        <Grid item xs={6} md={3}>
          <StatCard value={stats.totalAdditions} label="Lineas Agregadas" color={goldAccent.primary} />
        </Grid>
        <Grid item xs={6} md={3}>
          <StatCard value={stats.totalDeletions} label="Lineas Eliminadas" color={semanticColors.error.main} />
        </Grid>
        <Grid item xs={6} md={3}>
          <StatCard value={stats.totalFilesChanged} label="Archivos Modificados" color={semanticColors.info.main} />
        </Grid>
      </Grid>

      {/* Net Change Banner */}
      <Paper
        elevation={0}
        sx={{
          p: 2,
          mb: 4,
          borderRadius: 2,
          bgcolor: alpha(stats.netLines >= 0 ? emeraldCore.primary : semanticColors.error.main, 0.1),
          border: `1px solid ${alpha(stats.netLines >= 0 ? emeraldCore.primary : semanticColors.error.main, 0.3)}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 1,
        }}
      >
        <TrendingUp size={20} color={stats.netLines >= 0 ? emeraldCore.primary : semanticColors.error.main} />
        <Typography variant="h6" sx={{ fontWeight: 600, color: stats.netLines >= 0 ? emeraldCore.primary : semanticColors.error.main }}>
          {stats.netLines >= 0 ? '+' : ''}{stats.netLines.toLocaleString()} lineas netas
        </Typography>
      </Paper>

      {/* Mermaid Diagrams Grid */}
      <Grid container spacing={2} sx={{ mb: 4 }}>
        <Grid item xs={12} md={6}>
          <MermaidDiagram definition={diagrams.gitGraph} title="Flujo de Commits" />
        </Grid>
        <Grid item xs={12} md={6}>
          <MermaidDiagram definition={diagrams.pieChart} title="Distribucion del Trabajo" />
        </Grid>
      </Grid>

      {/* Main Grid: Timeline + Categories + Stats */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        {/* Commits Timeline */}
        <Grid item xs={12} md={5}>
          <Paper
            elevation={0}
            sx={{
              p: 2.5,
              borderRadius: 3,
              bgcolor: isLight ? 'background.paper' : alpha('#000', 0.2),
              border: `1px solid ${isLight ? alpha('#000', 0.08) : alpha('#fff', 0.1)}`,
              maxHeight: 500,
              overflow: 'auto',
            }}
          >
            <Typography variant="h6" sx={{ fontWeight: 600, mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
              <GitCommit size={20} color={emeraldCore.primary} />
              Últimos Commits ({commits.length})
            </Typography>

            <Box sx={{ position: 'relative', pl: 3 }}>
              {/* Timeline line */}
              <Box
                sx={{
                  position: 'absolute',
                  left: 8,
                  top: 0,
                  bottom: 0,
                  width: 2,
                  background: `linear-gradient(180deg, ${emeraldCore.primary}, ${goldAccent.primary})`,
                }}
              />

              {commits.slice(0, 12).map((commit, idx) => (
                <Box
                  key={commit.hash}
                  sx={{
                    position: 'relative',
                    pl: 3,
                    pb: idx < 11 ? 2 : 0,
                  }}
                >
                  {/* Timeline dot */}
                  <Box
                    sx={{
                      position: 'absolute',
                      left: -3,
                      top: 4,
                      width: 14,
                      height: 14,
                      borderRadius: '50%',
                      bgcolor: commit.type === 'fix' ? goldAccent.primary : emeraldCore.primary,
                      border: '3px solid',
                      borderColor: isLight ? 'background.paper' : '#0F172A',
                    }}
                  />

                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                    <Chip
                      label={commit.hash}
                      size="small"
                      sx={{
                        fontFamily: 'monospace',
                        fontSize: '0.65rem',
                        height: 20,
                        bgcolor: alpha('#fff', 0.1),
                        color: 'text.secondary',
                      }}
                    />
                    <Chip
                      label={commit.type}
                      size="small"
                      sx={{
                        fontSize: '0.6rem',
                        height: 18,
                        bgcolor: alpha(TYPE_CONFIG[commit.type]?.color || '#666', 0.2),
                        color: TYPE_CONFIG[commit.type]?.color || '#666',
                      }}
                    />
                  </Box>
                  <Typography variant="body2" sx={{ fontWeight: 500, mb: 0.5, fontSize: '0.85rem' }}>
                    {commit.message.slice(0, 50)}{commit.message.length > 50 ? '...' : ''}
                  </Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                    <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                      {commit.relativeTime}
                    </Typography>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                      <Plus size={10} color={emeraldCore.primary} />
                      <Typography variant="caption" sx={{ color: emeraldCore.primary, fontSize: '0.7rem' }}>
                        {commit.additions}
                      </Typography>
                    </Box>
                    {commit.deletions > 0 && (
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <Minus size={10} color={semanticColors.error.main} />
                        <Typography variant="caption" sx={{ color: semanticColors.error.main, fontSize: '0.7rem' }}>
                          {commit.deletions}
                        </Typography>
                      </Box>
                    )}
                  </Box>
                </Box>
              ))}

              {commits.length > 12 && (
                <Typography variant="caption" sx={{ color: 'text.secondary', pl: 3, display: 'block', mt: 2 }}>
                  + {commits.length - 12} commits mas...
                </Typography>
              )}
            </Box>
          </Paper>
        </Grid>

        {/* Categories & Stats Column */}
        <Grid item xs={12} md={4}>
          {/* Categories */}
          <Paper
            elevation={0}
            sx={{
              p: 2.5,
              borderRadius: 3,
              bgcolor: isLight ? 'background.paper' : alpha('#000', 0.2),
              border: `1px solid ${isLight ? alpha('#000', 0.08) : alpha('#fff', 0.1)}`,
              mb: 2,
            }}
          >
            <Typography variant="h6" sx={{ fontWeight: 600, mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
              <GitBranch size={20} color={emeraldCore.primary} />
              Categorías
            </Typography>

            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
              {categories.slice(0, 6).map((cat) => (
                <Box
                  key={cat.key}
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1.5,
                  }}
                >
                  <Box
                    sx={{
                      width: 40,
                      height: 40,
                      borderRadius: 2,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      bgcolor: alpha(cat.color, 0.2),
                    }}
                  >
                    <cat.icon size={20} color={cat.color} />
                  </Box>
                  <Box sx={{ flex: 1 }}>
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>
                      {cat.name}
                    </Typography>
                    <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                      {cat.count} commits
                    </Typography>
                  </Box>
                </Box>
              ))}
            </Box>
          </Paper>

          {/* Type Stats */}
          <Paper
            elevation={0}
            sx={{
              p: 2.5,
              borderRadius: 3,
              bgcolor: isLight ? 'background.paper' : alpha('#000', 0.2),
              border: `1px solid ${isLight ? alpha('#000', 0.08) : alpha('#fff', 0.1)}`,
            }}
          >
            <Typography variant="h6" sx={{ fontWeight: 600, mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
              <Activity size={20} color={goldAccent.primary} />
              Tipos de Commits
            </Typography>

            {Object.entries(typeStats)
              .filter(([, count]) => count > 0)
              .sort(([, a], [, b]) => b - a)
              .slice(0, 5)
              .map(([type, count]) => (
                <ProgressBar
                  key={type}
                  label={TYPE_CONFIG[type]?.name || type}
                  value={count}
                  maxValue={maxTypeCount}
                  color={TYPE_CONFIG[type]?.color || '#64748B'}
                />
              ))}
          </Paper>
        </Grid>

        {/* Most Changed Files & Contributors */}
        <Grid item xs={12} md={3}>
          {/* Most Changed Files */}
          <Paper
            elevation={0}
            sx={{
              p: 2.5,
              borderRadius: 3,
              bgcolor: isLight ? 'background.paper' : alpha('#000', 0.2),
              border: `1px solid ${isLight ? alpha('#000', 0.08) : alpha('#fff', 0.1)}`,
              mb: 2,
            }}
          >
            <Typography variant="h6" sx={{ fontWeight: 600, mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
              <FileText size={20} color={semanticColors.info.main} />
              Archivos Más Activos
            </Typography>

            {mostChangedFiles.slice(0, 5).map((file) => (
              <ProgressBar
                key={file.file}
                label={file.file.split('/').pop() || file.file}
                value={file.count}
                maxValue={maxFileCount}
                color={semanticColors.info.main}
              />
            ))}
          </Paper>

          {/* Contributors */}
          <Paper
            elevation={0}
            sx={{
              p: 2.5,
              borderRadius: 3,
              bgcolor: isLight ? 'background.paper' : alpha('#000', 0.2),
              border: `1px solid ${isLight ? alpha('#000', 0.08) : alpha('#fff', 0.1)}`,
            }}
          >
            <Typography variant="h6" sx={{ fontWeight: 600, mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
              <Users size={20} color={goldAccent.primary} />
              Contribuidores
            </Typography>

            {contributors.map((contributor) => (
              <Box
                key={contributor.name}
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  mb: 1,
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Box
                    sx={{
                      width: 28,
                      height: 28,
                      borderRadius: '50%',
                      bgcolor: alpha(emeraldCore.primary, 0.2),
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '0.7rem',
                      fontWeight: 600,
                      color: emeraldCore.primary,
                    }}
                  >
                    {contributor.name.slice(0, 2).toUpperCase()}
                  </Box>
                  <Typography variant="body2" sx={{ fontWeight: 500 }}>
                    {contributor.name}
                  </Typography>
                </Box>
                <Chip
                  label={contributor.commits}
                  size="small"
                  sx={{
                    height: 20,
                    fontSize: '0.7rem',
                    bgcolor: alpha(emeraldCore.primary, 0.1),
                    color: emeraldCore.primary,
                    fontWeight: 600,
                  }}
                />
              </Box>
            ))}
          </Paper>
        </Grid>
      </Grid>

      {/* Highlights */}
      <Typography variant="h6" sx={{ fontWeight: 600, mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
        <FileCode size={20} color={emeraldCore.primary} />
        Highlights
      </Typography>

      <Grid container spacing={2} sx={{ mb: 4 }}>
        {highlights.map((highlight, idx) => (
          <Grid item xs={12} sm={6} md={3} key={idx}>
            <Paper
              elevation={0}
              sx={{
                p: 2,
                borderRadius: 2,
                background: `linear-gradient(135deg, ${alpha(emeraldCore.primary, 0.1)}, ${alpha(goldAccent.primary, 0.05)})`,
                border: `1px solid ${alpha(emeraldCore.primary, 0.3)}`,
                height: '100%',
              }}
            >
              <Typography
                variant="subtitle2"
                sx={{ color: emeraldCore.light, fontWeight: 600, mb: 1 }}
              >
                {highlight.title}
              </Typography>
              <Typography variant="caption" sx={{ color: 'text.secondary', lineHeight: 1.5 }}>
                {highlight.desc}
              </Typography>
            </Paper>
          </Grid>
        ))}
      </Grid>

      {/* Footer */}
      <Divider sx={{ my: 3, opacity: 0.3 }} />
      <Box sx={{ textAlign: 'center' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1, mb: 1 }}>
          <Box
            sx={{
              width: 20,
              height: 20,
              bgcolor: emeraldCore.primary,
              clipPath: 'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)',
            }}
          />
          <Typography variant="body2" sx={{ fontWeight: 600 }}>
            Tierra Madre Studio
          </Typography>
        </Box>
        <Typography variant="caption" sx={{ color: 'text.secondary' }}>
          Generado: {new Date(generatedAt).toLocaleDateString('es-CO', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })} - Parte de CoomUnity Universe
        </Typography>
      </Box>
    </Box>
  );
};

export default AdminChangelogPage;
