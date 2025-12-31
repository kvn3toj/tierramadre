/**
 * Admin Changelog Page
 *
 * Visual development report with Mermaid diagrams.
 * Shows commits, code changes, and architecture evolution.
 * Admin-only access.
 */

import React, { useEffect, useRef } from 'react';
import {
  Box,
  Typography,
  Paper,
  Grid,
  alpha,
  Chip,
  Divider,
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
} from 'lucide-react';
import { useThemeMode } from '../contexts/ThemeContext';
import { emeraldCore, goldAccent, semanticColors } from '../design-system/tokens/colors';
import { spacing } from '../design-system/tokens/primitives/spacing';

// Mermaid CDN - loaded dynamically
declare global {
  interface Window {
    mermaid: {
      initialize: (config: object) => void;
      run: (config?: { nodes?: NodeListOf<Element> }) => Promise<void>;
    };
  }
}

// Commits data (generated from git log)
const COMMITS = [
  {
    hash: 'a5c9c6c',
    message: 'Agregar hook de analytics y eliminar PinLock deprecado',
    time: 'Hace 25 minutos',
    additions: 930,
    deletions: 289,
    type: 'feat',
  },
  {
    hash: '271e0cb',
    message: 'Permisos admin, teaser beneficios guest y limpieza de codigo',
    time: 'Hace 36 minutos',
    additions: 1564,
    deletions: 6043,
    type: 'feat',
  },
  {
    hash: '9c683a3',
    message: 'Fase 3 validacion cross-device y fixes iOS HIG',
    time: 'Hace 2 horas',
    additions: 4718,
    deletions: 676,
    type: 'feat',
  },
  {
    hash: 'fdfdfad',
    message: 'Cache busting agresivo para todas las rutas SPA',
    time: 'Hace 2 horas',
    additions: 33,
    deletions: 0,
    type: 'fix',
  },
  {
    hash: '9e19e7d',
    message: 'Rediseno ProductDetail iOS HIG con layout compacto',
    time: 'Hace 2 horas',
    additions: 434,
    deletions: 590,
    type: 'feat',
  },
  {
    hash: '91e0de7',
    message: 'Mejorar UX de Cotizacion con mejores practicas',
    time: 'Hace 24 horas',
    additions: 230,
    deletions: 58,
    type: 'feat',
  },
  {
    hash: 'da1f56d',
    message: 'Actualizar favicons PWA con logo Tierra Madre',
    time: 'Hace 24 horas',
    additions: 31,
    deletions: 11,
    type: 'feat',
  },
];

const STATS = {
  commits: 7,
  additions: 7940,
  deletions: 7667,
  filesChanged: 72,
};

const CATEGORIES = [
  { name: 'iOS HIG y UX', desc: 'Detalle de producto, layouts, diseno compacto', icon: Layers, count: 3, color: emeraldCore.primary },
  { name: 'Auth y Permisos', desc: 'Rutas admin, validacion cross-device', icon: Shield, count: 2, color: '#6366F1' },
  { name: 'Analytics', desc: 'Hooks de tracking, tipos de analytics', icon: BarChart3, count: 1, color: '#8B5CF6' },
  { name: 'Rendimiento', desc: 'Cache busting, rutas SPA', icon: Zap, count: 1, color: goldAccent.primary },
  { name: 'Limpieza de Codigo', desc: 'Eliminadas 6K+ lineas de codigo muerto', icon: Trash2, count: 1, color: semanticColors.error.main },
];

const HIGHLIGHTS = [
  { title: 'Sistema Analytics', desc: 'Nuevo hook useTracking con tipos TypeScript para tracking completo de eventos.' },
  { title: 'Rediseno iOS HIG', desc: 'Layout compacto de ProductDetail con optimizacion mobile-first.' },
  { title: 'Permisos Admin', desc: 'AdminRoute basado en roles con sistema de validacion cross-device.' },
  { title: 'Limpieza Tecnica', desc: 'Eliminados templates deprecados, PinLock y paneles dev. Neto -6K lineas legacy.' },
];

// Mermaid diagram definitions
const MERMAID_GIT_GRAPH = `
%%{init: {'theme': 'dark', 'themeVariables': { 'primaryColor': '#10B981', 'primaryTextColor': '#fff', 'primaryBorderColor': '#34D399', 'lineColor': '#F59E0B', 'secondaryColor': '#1E293B', 'tertiaryColor': '#0F172A'}}}%%
gitGraph
   commit id: "da1f56d" tag: "PWA"
   commit id: "91e0de7" tag: "Cotizacion"
   commit id: "9e19e7d" tag: "iOS HIG"
   commit id: "fdfdfad" type: HIGHLIGHT tag: "Cache Fix"
   commit id: "9c683a3" tag: "Fase 3"
   commit id: "271e0cb" tag: "Admin"
   commit id: "a5c9c6c" tag: "Analytics"
`;

const MERMAID_PIE = `
%%{init: {'theme': 'dark', 'themeVariables': { 'pie1': '#10B981', 'pie2': '#6366F1', 'pie3': '#8B5CF6', 'pie4': '#F59E0B', 'pie5': '#EF4444', 'pieStrokeColor': '#1E293B', 'pieOuterStrokeColor': '#0F172A'}}}%%
pie showData
    title Commits por Categoria
    "iOS HIG y UX" : 3
    "Auth y Permisos" : 2
    "Analytics" : 1
    "Rendimiento" : 1
`;

const MERMAID_ARCHITECTURE = `
%%{init: {'theme': 'dark', 'themeVariables': { 'primaryColor': '#10B981', 'primaryTextColor': '#fff', 'primaryBorderColor': '#34D399', 'lineColor': '#64748B', 'secondaryColor': '#1E293B'}}}%%
flowchart LR
    subgraph Agregado["Agregado"]
        A1[useTracking]
        A2[AdminRoute]
        A3[MemberBenefitsTeaser]
        A4[ImageLightbox]
        A5[useHaptics]
        A6[useShare]
    end

    subgraph Eliminado["Eliminado"]
        R1[PinLock]
        R2[DeviceTestPanel]
        R3[ViewportTest]
        R4[useABTest]
        R5[DesignSystemDemo]
        R6[Templates Legacy]
    end

    subgraph Mejorado["Mejorado"]
        E1[AuthContext]
        E2[ProductDetail]
        E3[MediaGallery]
        E4[GridCard]
    end

    style Agregado fill:#064E3B,stroke:#10B981
    style Eliminado fill:#7F1D1D,stroke:#EF4444
    style Mejorado fill:#1E3A5F,stroke:#60A5FA
`;

const MERMAID_STATE = `
%%{init: {'theme': 'dark', 'themeVariables': { 'primaryColor': '#10B981'}}}%%
stateDiagram-v2
    [*] --> Invitado
    Invitado --> Autenticado: Login
    Autenticado --> Admin: tieneRolAdmin
    Admin --> Autenticado: revocarAdmin
    Autenticado --> Invitado: Logout
    Admin --> Invitado: Logout
`;

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
  id: string;
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

// Main Component
const AdminChangelogPage: React.FC = () => {
  const { mode } = useThemeMode();
  const isLight = mode === 'light';

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
            flowchart: {
              useMaxWidth: true,
              htmlLabels: true,
              curve: 'basis',
            },
            gitGraph: {
              useMaxWidth: true,
              showCommitLabel: true,
            },
          });
        };
        document.head.appendChild(script);
      } else if (window.mermaid) {
        window.mermaid.initialize({
          startOnLoad: true,
          theme: 'dark',
          securityLevel: 'loose',
        });
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
        <Chip
          label="29 - 30 Dic, 2025"
          sx={{
            bgcolor: alpha(emeraldCore.primary, 0.15),
            border: `1px solid ${emeraldCore.primary}`,
            color: emeraldCore.light,
            fontWeight: 500,
          }}
        />
      </Box>

      {/* Stats Row */}
      <Grid container spacing={2} sx={{ mb: 4 }}>
        <Grid item xs={6} md={3}>
          <StatCard value={STATS.commits} label="Commits" color={emeraldCore.light} />
        </Grid>
        <Grid item xs={6} md={3}>
          <StatCard value={STATS.additions} label="Lineas Agregadas" color={goldAccent.primary} />
        </Grid>
        <Grid item xs={6} md={3}>
          <StatCard value={STATS.deletions} label="Lineas Eliminadas" color={semanticColors.error.main} />
        </Grid>
        <Grid item xs={6} md={3}>
          <StatCard value={STATS.filesChanged} label="Archivos Modificados" color={semanticColors.info.main} />
        </Grid>
      </Grid>

      {/* Mermaid Diagrams Grid */}
      <Grid container spacing={2} sx={{ mb: 4 }}>
        <Grid item xs={12} md={6}>
          <MermaidDiagram id="git-graph" definition={MERMAID_GIT_GRAPH} title="Flujo de Commits" />
        </Grid>
        <Grid item xs={12} md={6}>
          <MermaidDiagram id="pie-chart" definition={MERMAID_PIE} title="Distribucion del Trabajo" />
        </Grid>
        <Grid item xs={12} md={6}>
          <MermaidDiagram id="architecture" definition={MERMAID_ARCHITECTURE} title="Cambios de Arquitectura" />
        </Grid>
        <Grid item xs={12} md={6}>
          <MermaidDiagram id="state" definition={MERMAID_STATE} title="Flujo de Estados Auth" />
        </Grid>
      </Grid>

      {/* Main Grid: Timeline + Categories */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        {/* Commits Timeline */}
        <Grid item xs={12} md={7}>
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
              <GitCommit size={20} color={emeraldCore.primary} />
              Linea de Tiempo de Commits
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

              {COMMITS.map((commit, idx) => (
                <Box
                  key={commit.hash}
                  sx={{
                    position: 'relative',
                    pl: 3,
                    pb: idx < COMMITS.length - 1 ? 2.5 : 0,
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

                  <Chip
                    label={commit.hash}
                    size="small"
                    sx={{
                      fontFamily: 'monospace',
                      fontSize: '0.7rem',
                      bgcolor: alpha('#fff', 0.1),
                      color: 'text.secondary',
                      mb: 0.5,
                    }}
                  />
                  <Typography variant="body2" sx={{ fontWeight: 500, mb: 0.5 }}>
                    {commit.message}
                  </Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                    <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                      {commit.time}
                    </Typography>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                      <Plus size={12} color={emeraldCore.primary} />
                      <Typography variant="caption" sx={{ color: emeraldCore.primary }}>
                        {commit.additions.toLocaleString()}
                      </Typography>
                    </Box>
                    {commit.deletions > 0 && (
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <Minus size={12} color={semanticColors.error.main} />
                        <Typography variant="caption" sx={{ color: semanticColors.error.main }}>
                          {commit.deletions.toLocaleString()}
                        </Typography>
                      </Box>
                    )}
                  </Box>
                </Box>
              ))}
            </Box>
          </Paper>
        </Grid>

        {/* Categories */}
        <Grid item xs={12} md={5}>
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
            <Typography variant="h6" sx={{ fontWeight: 600, mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
              <GitBranch size={20} color={emeraldCore.primary} />
              Categorias de Trabajo
            </Typography>

            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
              {CATEGORIES.map((cat) => (
                <Box
                  key={cat.name}
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
                      {cat.desc}
                    </Typography>
                  </Box>
                  <Chip
                    label={cat.count}
                    size="small"
                    sx={{
                      bgcolor: alpha('#fff', 0.1),
                      fontWeight: 600,
                    }}
                  />
                </Box>
              ))}
            </Box>
          </Paper>
        </Grid>
      </Grid>

      {/* Highlights */}
      <Typography variant="h6" sx={{ fontWeight: 600, mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
        <FileCode size={20} color={emeraldCore.primary} />
        Highlights
      </Typography>

      <Grid container spacing={2} sx={{ mb: 4 }}>
        {HIGHLIGHTS.map((highlight, idx) => (
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
          Generado el 30 Dic, 2025 - Parte de CoomUnity Universe
        </Typography>
      </Box>
    </Box>
  );
};

export default AdminChangelogPage;
