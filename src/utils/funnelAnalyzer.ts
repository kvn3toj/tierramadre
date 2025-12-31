/**
 * Funnel Analyzer - Tierra Madre Studio
 *
 * Analyzes event data to calculate funnel metrics, detect friction points,
 * and generate actionable UX recommendations.
 */

import type {
  AnalyticsEvent,
  FunnelDefinition,
  FunnelAnalysis,
  FunnelStep,
  FrictionPoint,
  UXInsight,
} from '../types/analytics';

// =============================================================================
// FUNNEL DEFINITIONS
// =============================================================================

export const FUNNEL_DEFINITIONS: FunnelDefinition[] = [
  {
    id: 'discovery',
    name: 'Descubrimiento de Tesoros',
    description: 'Flujo desde entrada al catálogo hasta engagement con productos',
    icon: '💎',
    steps: [
      { id: 'entry', name: 'Entrada al Catálogo', event: 'page_view' }, // /treasure
      { id: 'filter', name: 'Filtro Aplicado', event: 'treasure_filter_applied' },
      { id: 'click', name: 'Producto Seleccionado', event: 'product_clicked' },
      { id: 'engaged', name: 'Producto Visualizado (+10s)', event: 'product_engaged' },
      { id: 'favorite', name: 'Agregado a Favoritos', event: 'product_favorited' },
    ],
    targets: {
      completionRate: 25,
      avgTimeToComplete: 300, // 5 minutes
    },
  },
  {
    id: 'cotizacion',
    name: 'Cotización Profesional',
    description: 'Flujo desde inicio de cotización hasta exportación PDF',
    icon: '📋',
    steps: [
      { id: 'started', name: 'Cotización Iniciada', event: 'cotizacion_started' },
      { id: 'client_info', name: 'Info Cliente Completa', event: 'cotizacion_client_info_complete' },
      { id: 'product_added', name: 'Producto Agregado', event: 'cotizacion_product_added' },
      { id: 'exported', name: 'PDF Exportado', event: 'cotizacion_exported' },
    ],
    targets: {
      completionRate: 85,
      avgTimeToComplete: 480, // 8 minutes
    },
  },
  {
    id: 'simulator',
    name: 'Simulador de Precios',
    description: 'Flujo desde simulación hasta conversión a cotización',
    icon: '🧮',
    steps: [
      { id: 'started', name: 'Simulador Iniciado', event: 'simulator_started' },
      { id: 'adjusted', name: 'Factores Ajustados', event: 'simulator_factors_adjusted' },
      { id: 'to_cotizacion', name: 'Crear Cotización', event: 'simulator_to_quotation' },
    ],
    targets: {
      completionRate: 25,
      avgTimeToComplete: 180, // 3 minutes
    },
  },
  {
    id: 'receipt',
    name: 'Generación de Recibos',
    description: 'Flujo desde inicio de recibo hasta exportación',
    icon: '🧾',
    steps: [
      { id: 'started', name: 'Recibo Iniciado', event: 'receipt_started' },
      { id: 'exported', name: 'Recibo Exportado', event: 'receipt_exported' },
    ],
    targets: {
      completionRate: 95,
      avgTimeToComplete: 180, // 3 minutes
    },
  },
  {
    id: 'engagement',
    name: 'Engagement Oracle',
    description: 'Interacción con contenido educativo del Oracle',
    icon: '🔮',
    steps: [
      { id: 'home_view', name: 'Home Visitado', event: 'page_view' }, // /home
      { id: 'oracle_view', name: 'Oracle Visualizado', event: 'oracle_viewed' },
    ],
    targets: {
      completionRate: 60,
    },
  },
];

// =============================================================================
// ANALYSIS FUNCTIONS
// =============================================================================

/**
 * Analyze a single funnel based on event data
 */
export function analyzeFunnel(
  funnel: FunnelDefinition,
  events: AnalyticsEvent[],
  dateRange?: { start: number; end: number }
): FunnelAnalysis {
  // Filter events by date range if provided
  let filteredEvents = events;
  if (dateRange) {
    filteredEvents = events.filter(
      e => e.timestamp >= dateRange.start && e.timestamp <= dateRange.end
    );
  }

  // Count events for each step
  const stepCounts: Record<string, number> = {};
  const stepTimestamps: Record<string, number[]> = {};

  funnel.steps.forEach(step => {
    stepCounts[step.id] = 0;
    stepTimestamps[step.id] = [];
  });

  // Special handling for page_view events (need to check page_path)
  filteredEvents.forEach(event => {
    funnel.steps.forEach(step => {
      if (step.event === 'page_view') {
        if (event.event === 'page_view') {
          const path = (event.properties as any)?.page_path || '';
          // Match discovery funnel entry
          if (step.id === 'entry' && path.includes('/treasure')) {
            stepCounts[step.id]++;
            stepTimestamps[step.id].push(event.timestamp);
          }
          // Match engagement funnel home view
          if (step.id === 'home_view' && (path.includes('/home') || path === '/')) {
            stepCounts[step.id]++;
            stepTimestamps[step.id].push(event.timestamp);
          }
        }
      } else if (event.event === step.event) {
        stepCounts[step.id]++;
        stepTimestamps[step.id].push(event.timestamp);
      }
    });
  });

  // Calculate funnel steps with percentages and drop-offs
  const totalEntries = stepCounts[funnel.steps[0].id] || 0;
  const steps: FunnelStep[] = funnel.steps.map((step, index) => {
    const count = stepCounts[step.id];
    const percentage = totalEntries > 0 ? (count / totalEntries) * 100 : 0;
    const prevCount = index > 0 ? stepCounts[funnel.steps[index - 1].id] : count;
    const dropOffRate = prevCount > 0 ? ((prevCount - count) / prevCount) * 100 : 0;

    // Calculate average time to next step
    let avgTimeToNext: number | undefined;
    if (index < funnel.steps.length - 1) {
      const nextStepTimestamps = stepTimestamps[funnel.steps[index + 1].id];
      const currentTimestamps = stepTimestamps[step.id];

      if (currentTimestamps.length > 0 && nextStepTimestamps.length > 0) {
        // Simple heuristic: calculate median time difference
        const timeDiffs: number[] = [];
        currentTimestamps.forEach(ts => {
          const nextTs = nextStepTimestamps.find(nts => nts > ts);
          if (nextTs) {
            timeDiffs.push((nextTs - ts) / 1000); // Convert to seconds
          }
        });

        if (timeDiffs.length > 0) {
          timeDiffs.sort((a, b) => a - b);
          avgTimeToNext = timeDiffs[Math.floor(timeDiffs.length / 2)];
        }
      }
    }

    return {
      id: step.id,
      name: step.name,
      event: step.event,
      count,
      percentage,
      dropOffRate,
      avgTimeToNext,
    };
  });

  // Calculate overall metrics
  const totalCompletions = stepCounts[funnel.steps[funnel.steps.length - 1].id] || 0;
  const completionRate = totalEntries > 0 ? (totalCompletions / totalEntries) * 100 : 0;
  const isOnTarget = completionRate >= funnel.targets.completionRate;

  // Calculate average time to complete
  const firstStepTimestamps = stepTimestamps[funnel.steps[0].id];
  const lastStepTimestamps = stepTimestamps[funnel.steps[funnel.steps.length - 1].id];
  let avgTimeToComplete = 0;

  if (firstStepTimestamps.length > 0 && lastStepTimestamps.length > 0) {
    const completionTimes: number[] = [];
    firstStepTimestamps.forEach(startTs => {
      const endTs = lastStepTimestamps.find(ts => ts > startTs);
      if (endTs) {
        completionTimes.push((endTs - startTs) / 1000);
      }
    });

    if (completionTimes.length > 0) {
      avgTimeToComplete = completionTimes.reduce((a, b) => a + b, 0) / completionTimes.length;
    }
  }

  // Find critical drop-off (highest drop-off between consecutive steps)
  let criticalDropOff: FunnelAnalysis['criticalDropOff'] | undefined;
  let maxDropOff = 0;

  for (let i = 1; i < steps.length; i++) {
    if (steps[i].dropOffRate > maxDropOff && steps[i].dropOffRate > 10) {
      maxDropOff = steps[i].dropOffRate;
      const severity =
        maxDropOff >= 50 ? 'critical' :
        maxDropOff >= 30 ? 'high' :
        maxDropOff >= 20 ? 'medium' : 'low';

      criticalDropOff = {
        stepFrom: steps[i - 1].name,
        stepTo: steps[i].name,
        dropOffRate: steps[i].dropOffRate,
        severity,
      };
    }
  }

  return {
    funnel,
    steps,
    totalEntries,
    totalCompletions,
    completionRate,
    avgTimeToComplete,
    isOnTarget,
    criticalDropOff,
  };
}

/**
 * Analyze all funnels and return results
 */
export function analyzeAllFunnels(
  events: AnalyticsEvent[],
  dateRange?: { start: number; end: number }
): FunnelAnalysis[] {
  return FUNNEL_DEFINITIONS.map(funnel => analyzeFunnel(funnel, events, dateRange));
}

// =============================================================================
// FRICTION DETECTION
// =============================================================================

/**
 * Detect friction points across all funnels
 */
export function detectFrictionPoints(analyses: FunnelAnalysis[]): FrictionPoint[] {
  const frictionPoints: FrictionPoint[] = [];
  let idCounter = 1;

  analyses.forEach(analysis => {
    // Check completion rate vs target
    if (analysis.completionRate < analysis.funnel.targets.completionRate) {
      const gap = analysis.funnel.targets.completionRate - analysis.completionRate;
      const severity =
        gap >= 30 ? 'critical' :
        gap >= 20 ? 'high' :
        gap >= 10 ? 'medium' : 'low';

      frictionPoints.push({
        id: `friction_${idCounter++}`,
        funnel: analysis.funnel.name,
        step: 'Funnel Completo',
        severity,
        issue: `Tasa de completación (${analysis.completionRate.toFixed(1)}%) debajo del objetivo (${analysis.funnel.targets.completionRate}%)`,
        recommendation: getCompletionRecommendation(analysis.funnel.id, gap),
        impact: `Potencial mejora: +${gap.toFixed(1)}% en conversión`,
        metric: analysis.completionRate,
        threshold: analysis.funnel.targets.completionRate,
      });
    }

    // Check for high drop-offs between steps
    analysis.steps.forEach((step, index) => {
      if (index > 0 && step.dropOffRate > 20) {
        const severity =
          step.dropOffRate >= 50 ? 'critical' :
          step.dropOffRate >= 35 ? 'high' :
          step.dropOffRate >= 25 ? 'medium' : 'low';

        frictionPoints.push({
          id: `friction_${idCounter++}`,
          funnel: analysis.funnel.name,
          step: `${analysis.steps[index - 1].name} → ${step.name}`,
          severity,
          issue: `Drop-off del ${step.dropOffRate.toFixed(1)}% entre pasos`,
          recommendation: getStepRecommendation(analysis.funnel.id, analysis.steps[index - 1].id, step.id),
          impact: `${Math.round(step.dropOffRate)}% de usuarios abandonan en esta transición`,
          metric: step.dropOffRate,
          threshold: 20,
        });
      }
    });

    // Check for slow completion time
    if (analysis.funnel.targets.avgTimeToComplete && analysis.avgTimeToComplete > 0) {
      const timeRatio = analysis.avgTimeToComplete / analysis.funnel.targets.avgTimeToComplete;
      if (timeRatio > 1.5) {
        frictionPoints.push({
          id: `friction_${idCounter++}`,
          funnel: analysis.funnel.name,
          step: 'Tiempo Total',
          severity: timeRatio > 2 ? 'high' : 'medium',
          issue: `Tiempo promedio (${formatTime(analysis.avgTimeToComplete)}) excede objetivo (${formatTime(analysis.funnel.targets.avgTimeToComplete)})`,
          recommendation: `Simplificar flujo de ${analysis.funnel.name.toLowerCase()} para reducir tiempo de completación`,
          impact: `Reducir tiempo podría mejorar conversión en ${Math.round((timeRatio - 1) * 20)}%`,
          metric: analysis.avgTimeToComplete,
          threshold: analysis.funnel.targets.avgTimeToComplete,
        });
      }
    }
  });

  // Sort by severity
  const severityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
  frictionPoints.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);

  return frictionPoints;
}

// =============================================================================
// UX INSIGHTS GENERATION
// =============================================================================

/**
 * Generate actionable UX insights based on friction points and funnel data
 */
export function generateUXInsights(
  analyses: FunnelAnalysis[],
  frictionPoints: FrictionPoint[]
): UXInsight[] {
  const insights: UXInsight[] = [];
  let idCounter = 1;

  // Critical issues become urgent fixes
  frictionPoints
    .filter(fp => fp.severity === 'critical')
    .forEach(fp => {
      insights.push({
        id: `insight_${idCounter++}`,
        type: 'critical_fix',
        title: `Corregir: ${fp.step}`,
        description: fp.recommendation,
        funnel: fp.funnel,
        priority: 'urgent',
        estimatedImpact: fp.impact,
        dataEvidence: fp.issue,
      });
    });

  // High severity issues become improvements
  frictionPoints
    .filter(fp => fp.severity === 'high')
    .forEach(fp => {
      insights.push({
        id: `insight_${idCounter++}`,
        type: 'improvement',
        title: `Mejorar: ${fp.step}`,
        description: fp.recommendation,
        funnel: fp.funnel,
        priority: 'high',
        estimatedImpact: fp.impact,
        dataEvidence: fp.issue,
      });
    });

  // Generate quick wins based on data patterns
  analyses.forEach(analysis => {
    // Discovery funnel quick wins
    if (analysis.funnel.id === 'discovery') {
      const filterStep = analysis.steps.find(s => s.id === 'filter');
      if (filterStep && filterStep.count < analysis.totalEntries * 0.3) {
        insights.push({
          id: `insight_${idCounter++}`,
          type: 'quick_win',
          title: 'Promover uso de filtros',
          description: 'Agregar tooltips o sugerencias de filtros populares para guiar a usuarios nuevos',
          funnel: analysis.funnel.name,
          priority: 'medium',
          estimatedImpact: '+15% engagement con productos',
          dataEvidence: `Solo ${((filterStep.count / analysis.totalEntries) * 100).toFixed(1)}% de usuarios usan filtros`,
        });
      }
    }

    // Cotizacion funnel quick wins
    if (analysis.funnel.id === 'cotizacion' && analysis.avgTimeToComplete > 600) {
      insights.push({
        id: `insight_${idCounter++}`,
        type: 'optimization',
        title: 'Optimizar formulario de cliente',
        description: 'Implementar autocompletado para clientes frecuentes y reducir campos opcionales',
        funnel: analysis.funnel.name,
        priority: 'medium',
        estimatedImpact: '-30% tiempo de completación',
        dataEvidence: `Tiempo promedio: ${formatTime(analysis.avgTimeToComplete)}`,
      });
    }

    // Simulator quick wins
    if (analysis.funnel.id === 'simulator') {
      const adjustedStep = analysis.steps.find(s => s.id === 'adjusted');
      if (adjustedStep && adjustedStep.dropOffRate > 30) {
        insights.push({
          id: `insight_${idCounter++}`,
          type: 'quick_win',
          title: 'Agregar tooltips al simulador',
          description: 'Explicar cómo cada factor afecta el precio con ejemplos visuales',
          funnel: analysis.funnel.name,
          priority: 'high',
          estimatedImpact: '+20% usuarios que ajustan factores',
          dataEvidence: `${adjustedStep.dropOffRate.toFixed(1)}% abandonan antes de ajustar`,
        });
      }
    }
  });

  // Sort by priority
  const priorityOrder = { urgent: 0, high: 1, medium: 2, low: 3 };
  insights.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);

  return insights;
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

function formatTime(seconds: number): string {
  if (seconds < 60) return `${Math.round(seconds)}s`;
  if (seconds < 3600) return `${Math.round(seconds / 60)}min`;
  return `${(seconds / 3600).toFixed(1)}h`;
}

function getCompletionRecommendation(funnelId: string, gap: number): string {
  const recommendations: Record<string, string> = {
    discovery: 'Mejorar thumbnails de productos, agregar call-to-action más visibles y simplificar navegación de filtros',
    cotizacion: 'Reducir campos obligatorios, agregar templates de cliente frecuente y optimizar rendimiento de PDF export',
    simulator: 'Agregar tutorial interactivo, mostrar precios de referencia y simplificar interfaz de sliders',
    receipt: 'Pre-llenar campos con datos de cotizaciones previas y agregar validación en tiempo real',
    engagement: 'Hacer Oracle más visible en Home, agregar notificaciones diarias y mejorar diseño de cards',
  };

  return recommendations[funnelId] || `Analizar drop-offs específicos para cerrar gap de ${gap.toFixed(1)}%`;
}

function getStepRecommendation(funnelId: string, fromStep: string, toStep: string): string {
  const key = `${funnelId}_${fromStep}_${toStep}`;

  const recommendations: Record<string, string> = {
    // Discovery funnel
    'discovery_entry_filter': 'Mostrar filtros sugeridos basados en productos populares o últimas búsquedas',
    'discovery_filter_click': 'Mejorar preview de productos, agregar más información visible en cards',
    'discovery_click_engaged': 'Optimizar carga de página de detalle, agregar loading skeleton',
    'discovery_engaged_favorite': 'Hacer botón de favoritos más prominente, agregar confirmación visual',

    // Cotizacion funnel
    'cotizacion_started_client_info': 'Simplificar formulario, hacer campos opcionales más claros',
    'cotizacion_client_info_product_added': 'Mejorar búsqueda de productos, agregar productos recientes',
    'cotizacion_product_added_exported': 'Optimizar generación de PDF, mostrar progress indicator',

    // Simulator funnel
    'simulator_started_adjusted': 'Agregar valores predeterminados intuitivos y tooltips explicativos',
    'simulator_adjusted_to_cotizacion': 'Hacer CTA de "Crear Cotización" más visible, mostrar beneficios',
  };

  return recommendations[key] || 'Investigar causa de abandono mediante user testing';
}

// =============================================================================
// EXPORTS
// =============================================================================

export type {
  FunnelDefinition,
  FunnelAnalysis,
  FunnelStep,
  FrictionPoint,
  UXInsight,
};
