# TIERRA MADRE STUDIO - ESTRATEGIA DE TRACKING Y FUNNELS UX

## EXECUTIVE SUMMARY

### Contexto
Tierra Madre Studio es una herramienta interna de agencia publicitaria para esmeraldas colombianas premium. La aplicación combina gestión de inventario, herramientas financieras y experiencias de marca para un equipo interno de embajadores y administradores.

### Objetivos Estratégicos
1. Maximizar conversión de exploración → cotización → cierre de ventas
2. Reducir fricción en flujos críticos de cuentas (simulador, cotizaciones, recibos)
3. Aumentar engagement con contenido educativo (Oracle, Knowledge)
4. Mejorar retención mediante gamificación ética (White Hat dominante)
5. Optimizar descubrimiento de inventario con filtros avanzados

### KPIs Principales por Área

| Área | KPI Primario | Target | Current Baseline |
|------|-------------|--------|------------------|
| Conversión Comercial | Cotización → PDF Exportado | 85% | TBD |
| Descubrimiento | Treasure Browse → Product Detail | 35% | TBD |
| Engagement | Retorno diario al Oracle | 60% | TBD |
| Herramientas Cuentas | Simulador → Cotización | 25% | TBD |
| Gamificación | Achievement Unlock Rate | 3/semana | TBD |

---

## PARTE 1: FUNNELS PRIORITARIOS

### FUNNEL 1: DESCUBRIMIENTO Y EXPLORACIÓN DE INVENTARIO
**Core Drive Octalysis**: Epic Meaning (1), Accomplishment (2), Empowerment (3)

#### Objetivo de Negocio
Facilitar que embajadores descubran productos relevantes para clientes mediante filtros intuitivos, favoritos y comparación. Reducir tiempo de búsqueda en 40% mediante filtros guardados y búsqueda avanzada.

#### Pasos del Funnel

```
1. HOME → Click en Category Carousel o "Ver Tesoros"
   Event: treasure_entry_point
   Properties: { source: 'carousel' | 'hero_cta' | 'tab_nav', category?: string }

2. TREASURE BROWSER → Primera Interacción (Grid loaded)
   Event: treasure_view
   Properties: { total_items: number, view_mode: 'grid' | 'list' }

3. TREASURE BROWSER → Aplicar Filtros
   Event: treasure_filter_applied
   Properties: {
     filter_type: 'color' | 'quality' | 'shape' | 'price' | 'type' | 'coleccion',
     filter_value: string,
     filters_count: number,
     results_count: number
   }

4. TREASURE BROWSER → Guardar Filtro Personalizado
   Event: filter_saved
   Properties: { filter_name: string, criteria: object }
   Achievement Trigger: "Curador Experto" (5 filtros guardados)

5. TREASURE BROWSER → Click en Producto
   Event: product_clicked
   Properties: {
     item_id: number,
     item_name: string,
     position_in_list: number,
     filters_active: boolean,
     view_mode: 'grid' | 'list'
   }

6. PRODUCT DETAIL → Tiempo en Página (>10s)
   Event: product_engaged
   Properties: {
     item_id: number,
     time_on_page: number,
     gallery_interactions: number,
     qr_scanned: boolean
   }

7. PRODUCT DETAIL → Agregar a Favoritos
   Event: product_favorited
   Properties: { item_id: number, favorites_count: number }
   Achievement Trigger: "Coleccionista" (10 favoritos)

8. PRODUCT DETAIL → Comparar con Otro Producto
   Event: product_comparison_added
   Properties: { item_id: number, comparison_size: number }

9. COMPARISON BAR → Comparar 2+ Productos
   Event: comparison_viewed
   Properties: { products_count: number, products_ids: number[] }
   Achievement Trigger: "Estratega" (primera comparación)
```

#### Métricas Clave

| Métrica | Fórmula | Target | Significance |
|---------|---------|--------|--------------|
| Discovery Rate | (Step 3 / Step 2) * 100 | 65% | % usuarios que aplican filtros |
| Product Engagement | (Step 6 / Step 5) * 100 | 80% | % que se quedan >10s en detalle |
| Comparison Rate | (Step 9 / Step 6) * 100 | 15% | % que usan comparación avanzada |
| Favorite Conversion | (Step 7 / Step 6) * 100 | 25% | % que guardan favoritos |
| Filter Save Rate | (Step 4 / Step 3) * 100 | 10% | % que guardan filtros custom |

#### Drop-off Points Potenciales
- **Step 2 → 3**: No encuentra filtros relevantes (sobrecarga cognitiva)
- **Step 3 → 5**: Filtros demasiado restrictivos (0 resultados)
- **Step 5 → 6**: Thumbnail poco atractiva o info incompleta

#### Oportunidades de Gamificación (White Hat)

**Core Drive 1 - Epic Meaning**
- Badge "Guardián de Tesoros": Descubrir productos de todas las colecciones
- Narrativa: "Estás ayudando a clientes encontrar su esmeralda perfecta"

**Core Drive 2 - Accomplishment**
- Progress Ring: "Has explorado X de Y colecciones"
- Badge "Curador Experto": Guardar 5+ filtros personalizados
- Badge "Coleccionista": Agregar 10+ favoritos

**Core Drive 3 - Empowerment**
- Filtros guardados con nombres custom
- Comparación side-by-side ilimitada
- Grid vs List view customization

**Recomendaciones UX**

1. **Quick Win**: Agregar tooltips en primer filtro aplicado explicando cómo combinarlos
2. **Short-term**: "Búsquedas sugeridas" basadas en filtros populares del equipo
3. **Strategic**: Filtro predictivo ML que sugiere productos según cliente tipo descrito

---

### FUNNEL 2: COTIZACIÓN PROFESIONAL
**Core Drive Octalysis**: Accomplishment (2), Ownership (4), Social Influence (5)

#### Objetivo de Negocio
Maximizar tasa de cotizaciones completadas y exportadas. Target: 85% de cotizaciones iniciadas terminan en PDF descargado. Reducir tiempo promedio de creación de 15min → 8min.

#### Pasos del Funnel

```
1. ACCOUNTS HUB → Click en "Cotización"
   Event: cotizacion_started
   Properties: { entry_source: 'accounts_hub' | 'direct_link' }

2. COTIZACION FORM → Información Cliente Completada
   Event: cotizacion_client_info_complete
   Properties: {
     has_phone: boolean,
     has_email: boolean,
     has_document: boolean,
     asesor_selected: string
   }

3. COTIZACION FORM → Producto Agregado (Inventory)
   Event: cotizacion_product_added
   Properties: {
     product_id: number,
     product_name: string,
     product_price: number,
     entry_mode: 'inventory' | 'manual',
     products_count: number
   }

4. COTIZACION FORM → Producto Manual Agregado
   Event: cotizacion_manual_product_added
   Properties: {
     is_jewelry: boolean,
     price: number,
     products_count: number
   }

5. COTIZACION FORM → Inversión Configurada
   Event: cotizacion_investment_set
   Properties: {
     total_investment: number,
     has_custom_costs: boolean,
     investment_breakdown: object
   }

6. COTIZACION FORM → Descuento Aplicado
   Event: cotizacion_discount_applied
   Properties: { discount_percent: number, discount_amount: number }

7. COTIZACION PREVIEW → PDF Exportado
   Event: cotizacion_exported
   Properties: {
     quotation_number: string,
     products_count: number,
     total_amount: number,
     has_discount: boolean,
     time_to_complete: number (seconds)
   }
   Achievement Trigger: "Cerrador Profesional" (5 cotizaciones exportadas)

8. COTIZACION FORM → Imprimir Cotización
   Event: cotizacion_printed
   Properties: { quotation_number: string }

9. COTIZACION FORM → Nueva Cotización
   Event: cotizacion_reset
   Properties: { previous_quotation_number: string }
```

#### Métricas Clave

| Métrica | Fórmula | Target | Significance |
|---------|---------|--------|--------------|
| Completion Rate | (Step 7 / Step 1) * 100 | 85% | % cotizaciones exportadas |
| Client Info Quality | (Steps 2 complete / Step 2) * 100 | 90% | % con todos los campos |
| Product Addition Speed | Avg time Step 1 → Step 3 | <2min | Eficiencia UX |
| Discount Usage | (Step 6 / Step 7) * 100 | 35% | % cotizaciones con descuento |
| Time to Complete | Avg time Step 1 → Step 7 | <8min | Eficiencia workflow |

#### Drop-off Points Potenciales
- **Step 1 → 2**: Formulario de cliente abrumador (muchos campos)
- **Step 3 → 7**: No encuentra producto en inventario (busca manual)
- **Step 7**: Error al exportar PDF (html2canvas timeout)

#### Oportunidades de Gamificación (White Hat)

**Core Drive 2 - Accomplishment**
- Badge "Primera Cotización": Exportar primera cotización
- Badge "Cerrador Profesional": 5 cotizaciones exportadas
- Badge "Maestro de Ventas": 25 cotizaciones exportadas
- Progress Ring: "X cotizaciones este mes"

**Core Drive 4 - Ownership**
- Plantillas de cotización guardadas (cliente frecuente)
- Notas personalizadas por asesor
- Firma digital personalizada

**Core Drive 5 - Social Influence**
- Leaderboard mensual: "Top Asesores por Cotizaciones"
- Compartir cotización exitosa con equipo

**Recomendaciones UX**

1. **Quick Win**: Autocompletar información de cliente si ya cotizado antes
2. **Short-term**: Templates de "Clientes Frecuentes" con info pre-cargada
3. **Strategic**: Integración WhatsApp para enviar PDF directo desde app
4. **Critical Fix**: Optimizar html2canvas para cotizaciones largas (>5 productos)

---

### FUNNEL 3: SIMULADOR DE PRECIOS
**Core Drive Octalysis**: Empowerment (3), Unpredictability (7 - moderated)

#### Objetivo de Negocio
Convertir simulaciones en cotizaciones formales. Target: 25% de simulaciones terminan en cotización. Educar a embajadores sobre pricing strategy mediante experimentación.

#### Pasos del Funnel

```
1. ACCOUNTS HUB → Click en "Simulador"
   Event: simulator_started
   Properties: { entry_source: 'accounts_hub' | 'direct_link' }

2. SIMULATOR → Producto Seleccionado
   Event: simulator_product_selected
   Properties: {
     product_id?: number,
     product_name: string,
     base_price: number
   }

3. SIMULATOR → Factores Ajustados
   Event: simulator_factors_adjusted
   Properties: {
     quality_factor: number,
     size_factor: number,
     color_factor: number,
     market_factor: number,
     simulated_price: number,
     price_delta_percent: number
   }

4. SIMULATOR → Múltiples Simulaciones (3+)
   Event: simulator_exploration
   Properties: { simulations_count: number }
   Achievement Trigger: "Analista Estratégico" (10 simulaciones)

5. SIMULATOR → Click "Crear Cotización"
   Event: simulator_to_cotizacion
   Properties: {
     simulated_price: number,
     original_price: number,
     price_adjustment: number
   }

6. COTIZACION → Cotización Completada desde Simulador
   Event: simulator_cotizacion_completed
   Properties: {
     quotation_number: string,
     total_amount: number
   }
```

#### Métricas Clave

| Métrica | Fórmula | Target | Significance |
|---------|---------|--------|--------------|
| Simulation Engagement | Avg simulations per session | 3+ | Experimentación activa |
| Simulator → Cotización | (Step 5 / Step 1) * 100 | 25% | Conversión comercial |
| Price Exploration Range | Avg % price delta across sims | ±20% | Comprensión de pricing |
| Cotización Close Rate | (Step 6 / Step 5) * 100 | 80% | Finalización post-simulación |

#### Drop-off Points Potenciales
- **Step 2 → 3**: No entiende cómo funcionan los factores (falta tooltips)
- **Step 4 → 5**: Precio simulado muy alto/bajo (pierde confianza)

#### Oportunidades de Gamificación (White Hat)

**Core Drive 3 - Empowerment**
- Sliders interactivos con feedback visual inmediato
- Comparación precio simulado vs precio real del inventario
- "What-if scenarios": Guardar múltiples simulaciones

**Core Drive 7 - Unpredictability (Moderated White Hat)**
- "Insight del Día": Tips sobre qué factores más impactan precio
- "Simulación Sugerida": Producto aleatorio para practicar pricing

**Recomendaciones UX**

1. **Quick Win**: Tooltips explicativos en cada slider de factor
2. **Short-term**: Gráfico de distribución de precios del inventario
3. **Strategic**: Histórico de simulaciones para comparar evolución de pricing skills

---

### FUNNEL 4: GENERACIÓN DE RECIBOS
**Core Drive Octalysis**: Accomplishment (2), Loss Avoidance (8 - moderated)

#### Objetivo de Negocio
Profesionalizar documentación de ventas. Target: 100% de ventas con recibo oficial generado. Reducir tiempo de generación a <3min.

#### Pasos del Funnel

```
1. ACCOUNTS HUB → Click en "Recibos"
   Event: receipt_started
   Properties: { entry_source: 'accounts_hub' | 'direct_link' }

2. RECEIPT FORM → Información Básica Completada
   Event: receipt_info_complete
   Properties: {
     has_client_name: boolean,
     has_client_id: boolean,
     has_payment_method: boolean
   }

3. RECEIPT FORM → Monto Configurado
   Event: receipt_amount_set
   Properties: {
     total_amount: number,
     payment_method: string
   }

4. RECEIPT FORM → Recibo Generado (Preview)
   Event: receipt_generated
   Properties: {
     receipt_number: string,
     amount: number,
     time_to_generate: number
   }

5. RECEIPT PREVIEW → PDF Exportado
   Event: receipt_exported
   Properties: {
     receipt_number: string,
     amount: number,
     payment_method: string
   }
   Achievement Trigger: "Documentador Oficial" (10 recibos)

6. RECEIPT FORM → Nuevo Recibo
   Event: receipt_reset
   Properties: { previous_receipt_number: string }
```

#### Métricas Clave

| Métrica | Fórmula | Target | Significance |
|---------|---------|--------|--------------|
| Completion Rate | (Step 5 / Step 1) * 100 | 95% | % recibos exportados |
| Time to Complete | Avg time Step 1 → Step 5 | <3min | Eficiencia workflow |
| Error Rate | Failed exports / Total attempts | <5% | Estabilidad técnica |

#### Drop-off Points Potenciales
- **Step 2 → 3**: Confusión sobre métodos de pago disponibles
- **Step 5**: Error de exportación PDF

#### Oportunidades de Gamificación (White Hat)

**Core Drive 2 - Accomplishment**
- Badge "Documentador Oficial": 10 recibos generados
- Badge "Profesional Certificado": 50 recibos generados

**Core Drive 8 - Loss Avoidance (Moderated)**
- "Recuerda generar recibo para esta venta" (gentle reminder, not pressure)
- Auto-save draft para evitar pérdida de datos

**Recomendaciones UX**

1. **Quick Win**: Templates para métodos de pago comunes (Transferencia, Efectivo)
2. **Short-term**: Autocompletado de cliente si ya existe en cotizaciones previas
3. **Strategic**: Vinculación recibo → cotización para tracking completo de venta

---

### FUNNEL 5: ORACLE Y CONOCIMIENTO (ENGAGEMENT CONTENT)
**Core Drive Octalysis**: Epic Meaning (1), Unpredictability (7), Social Influence (5)

#### Objetivo de Negocio
Aumentar retención y engagement diario mediante contenido educativo sobre esmeraldas. Target: 60% de usuarios regresan diariamente para Oracle.

#### Pasos del Funnel

```
1. HOME → Oracle Section Visible
   Event: oracle_viewed
   Properties: { scroll_depth: number, oracle_id: number }

2. ORACLE → Click en "Ver Más"
   Event: oracle_expanded
   Properties: { oracle_id: number, oracle_title: string }

3. ORACLE → Guardar Fact
   Event: oracle_saved
   Properties: { oracle_id: number, saved_count: number }
   Achievement Trigger: "Estudiante de Gemas" (5 facts guardados)

4. ORACLE → Compartir Fact
   Event: oracle_shared
   Properties: { oracle_id: number, share_method: 'whatsapp' | 'clipboard' }
   Achievement Trigger: "Embajador del Conocimiento" (compartir 3 facts)

5. KNOWLEDGE SECTION → Ver Fact Guardado
   Event: knowledge_revisited
   Properties: { oracle_id: number, days_since_save: number }

6. MEDITATION → Iniciar Meditación
   Event: meditation_started
   Properties: { meditation_type: string }

7. MEDITATION → Completar Meditación
   Event: meditation_completed
   Properties: {
     meditation_type: string,
     duration: number,
     completion_rate: number
   }
   Achievement Trigger: "Alma Serena" (5 meditaciones completadas)
```

#### Métricas Clave

| Métrica | Fórmula | Target | Significance |
|---------|---------|--------|--------------|
| Daily Active Return | DAU with oracle_viewed | 60% | Engagement sticky feature |
| Oracle Save Rate | (Step 3 / Step 1) * 100 | 15% | Valor percibido contenido |
| Oracle Share Rate | (Step 4 / Step 1) * 100 | 8% | Amplificación orgánica |
| Knowledge Revisit Rate | (Step 5 / Step 3) * 100 | 40% | Retención long-term |
| Meditation Completion | (Step 7 / Step 6) * 100 | 70% | Engagement feature premium |

#### Drop-off Points Potenciales
- **Step 1 → 2**: Oracle no visible (scroll depth bajo)
- **Step 6 → 7**: Meditación muy larga (>5min)

#### Oportunidades de Gamificación (White Hat)

**Core Drive 1 - Epic Meaning**
- Badge "Guardián del Conocimiento": Leer todos los Oracles del mes
- Narrativa: "Cada fact te hace un mejor embajador de esmeraldas colombianas"

**Core Drive 7 - Unpredictability**
- Oracle diario cambia cada 24h (curiosidad)
- "Fact Sorpresa" - Oracle aleatorio de archivo cada semana

**Core Drive 5 - Social Influence**
- "Este fact fue guardado por 12 embajadores" (social proof)
- Leaderboard: "Top Curadores de Conocimiento"

**Recomendaciones UX**

1. **Quick Win**: Push notification diaria "Tu Oracle está listo"
2. **Short-term**: Categorías de facts (historia, geología, energía, mercado)
3. **Strategic**: Quiz semanal sobre facts aprendidos con rewards

---

### FUNNEL 6: NAVEGACIÓN DE EMBAJADORES
**Core Drive Octalysis**: Social Influence (5), Accomplishment (2)

#### Objetivo de Negocio
Fortalecer red de embajadores y facilitar contacto entre equipo. Target: 80% de embajadores tienen perfil visitado mensualmente.

#### Pasos del Funnel

```
1. HOME → Click Tab "Embajadores"
   Event: ambassadors_viewed
   Properties: { total_ambassadors: number }

2. AMBASSADORS → Click en Perfil de Embajador
   Event: ambassador_profile_viewed
   Properties: {
     ambassador_name: string,
     ambassador_slug: string,
     position_in_list: number
   }

3. AMBASSADOR PROFILE → Ver Productos Asignados
   Event: ambassador_products_viewed
   Properties: {
     ambassador_name: string,
     products_count: number
   }

4. AMBASSADOR PROFILE → Contactar Embajador
   Event: ambassador_contacted
   Properties: {
     ambassador_name: string,
     contact_method: 'placeholder' // Future: whatsapp, email
   }

5. AMBASSADORS → Búsqueda de Embajador
   Event: ambassador_searched
   Properties: { search_term: string, results_count: number }
```

#### Métricas Clave

| Métrica | Fórmula | Target | Significance |
|---------|---------|--------|--------------|
| Profile Visit Rate | (Step 2 / Step 1) * 100 | 45% | Engagement con directorio |
| Products View Rate | (Step 3 / Step 2) * 100 | 60% | Interés en inventario asignado |
| Contact Rate | (Step 4 / Step 2) * 100 | 10% | Colaboración activa |

#### Oportunidades de Gamificación (White Hat)

**Core Drive 5 - Social Influence**
- Badge "Networker": Visitar perfiles de 10+ embajadores
- "Embajador del Mes": Highlight basado en métricas

**Core Drive 2 - Accomplishment**
- Progress Bar: "Has conocido X de Y embajadores"

**Recomendaciones UX**

1. **Quick Win**: Stats card en perfil (productos, ciudades, especialidad)
2. **Short-term**: Filtros por ciudad y especialidad
3. **Strategic**: Chat interno entre embajadores

---

### FUNNEL 7: BÓVEDA SECRETA (PREMIUM ENGAGEMENT)
**Core Drive Octalysis**: Scarcity (6 - moderated), Epic Meaning (1), Ownership (4)

#### Objetivo de Negocio
Crear anticipación para colección exclusiva. Target: 90% de usuarios autorizados visitan bóveda en primera semana de lanzamiento.

#### Pasos del Funnel

```
1. HOME → Click en "Bóveda Secreta" (More Menu)
   Event: vault_entry
   Properties: { entry_source: 'more_menu' | 'direct_link' }

2. VAULT → Scroll Through Description
   Event: vault_description_read
   Properties: { scroll_depth: number, time_on_page: number }

3. VAULT → Click en CTA "Notificarme"
   Event: vault_notification_requested
   Properties: { email_provided: boolean }
```

#### Métricas Clave

| Métrica | Fórmula | Target | Significance |
|---------|---------|--------|--------------|
| Discovery Rate | (Step 1 / Total Sessions) * 100 | 30% | Awareness de feature |
| Engagement Rate | (Step 2 / Step 1) * 100 | 80% | Interés en exclusividad |
| Notification Rate | (Step 3 / Step 2) * 100 | 50% | Intent de retorno |

#### Oportunidades de Gamificación (White Hat)

**Core Drive 6 - Scarcity (Moderated White Hat)**
- "Acceso Exclusivo" (no manipulativo, genuinamente curado)
- "Próximamente" (anticipación sin presión)

**Core Drive 1 - Epic Meaning**
- Narrativa: "Tesoros reservados para coleccionistas serios"

**Recomendaciones UX**

1. **Quick Win**: Countdown timer para lanzamiento de primera colección
2. **Short-term**: Preview de primera gema exclusiva (teaser)
3. **Strategic**: Sistema de "early access" para top performers

---

## PARTE 2: ARQUITECTURA DE TRACKING MINIMALISTA

### Principios de Diseño

1. **Privacy-First**: Herramienta interna, no tracking de terceros
2. **Performance**: Eventos asíncronos, no bloquean UI
3. **Actionable**: Solo trackear lo que informará decisiones UX
4. **GDPR-Friendly**: Aunque interna, respetar mejores prácticas

### Herramientas Recomendadas

#### Opción A: Mixpanel (Recomendado para Internal Tools)
- **Pros**: Funnels nativos, user profiles, A/B testing integrado
- **Cons**: Costo (pero tier gratuito hasta 100k eventos/mes)
- **Setup**: `npm install mixpanel-browser`

#### Opción B: PostHog (Open Source + Self-Hosted)
- **Pros**: Control total de datos, GDPR compliant, session replay
- **Cons**: Requiere infraestructura
- **Setup**: Docker container en VPS

#### Opción C: Google Analytics 4 (GA4)
- **Pros**: Gratis, familiar, integración con Google Workspace
- **Cons**: Learning curve para custom events, menos flexible
- **Setup**: `npm install react-ga4`

### Estructura de Datos de Eventos

#### Event Schema Standard

```typescript
interface TrackingEvent {
  // Core metadata
  event_name: string;
  timestamp: string; // ISO 8601
  session_id: string; // UUID generado en login
  user_id?: string; // Email del embajador (si autenticado)

  // Device context
  device_type: 'mobile' | 'tablet' | 'desktop';
  os: string;
  browser: string;
  viewport_width: number;
  viewport_height: number;

  // App context
  app_version: string; // package.json version
  environment: 'development' | 'production';

  // Event-specific properties
  properties: Record<string, any>;
}
```

#### User Profile Schema

```typescript
interface UserProfile {
  user_id: string; // Email
  name: string;
  role: 'admin' | 'asesor' | 'guest';
  first_seen: string; // ISO date
  last_seen: string;

  // Engagement metrics
  total_sessions: number;
  total_events: number;
  avg_session_duration: number;

  // Feature usage
  features_used: string[]; // ['cotizacion', 'simulator', 'oracle']

  // Gamification
  level: number;
  xp: number;
  achievements_unlocked: string[];

  // Custom properties
  favorite_coleccion?: string;
  preferred_view_mode?: 'grid' | 'list';
}
```

### Implementación Técnica

#### Tracking Utility Hook

```typescript
// src/hooks/useTracking.ts
import { useCallback } from 'react';
import mixpanel from 'mixpanel-browser';

// Initialize once
if (import.meta.env.VITE_MIXPANEL_TOKEN) {
  mixpanel.init(import.meta.env.VITE_MIXPANEL_TOKEN, {
    debug: import.meta.env.DEV,
    track_pageview: false, // Manual tracking
    persistence: 'localStorage',
  });
}

export function useTracking() {
  const track = useCallback((eventName: string, properties?: Record<string, any>) => {
    if (!import.meta.env.VITE_MIXPANEL_TOKEN) {
      console.log('[Analytics]', eventName, properties);
      return;
    }

    mixpanel.track(eventName, {
      ...properties,
      app_version: import.meta.env.VITE_APP_VERSION,
      timestamp: new Date().toISOString(),
    });
  }, []);

  const identify = useCallback((userId: string, traits?: Record<string, any>) => {
    if (!import.meta.env.VITE_MIXPANEL_TOKEN) return;

    mixpanel.identify(userId);
    if (traits) {
      mixpanel.people.set(traits);
    }
  }, []);

  const trackPageView = useCallback((pageName: string) => {
    track('page_viewed', { page_name: pageName });
  }, [track]);

  return { track, identify, trackPageView };
}
```

#### Example Usage

```typescript
// En CotizacionGenerator.tsx
import { useTracking } from '../hooks/useTracking';

export default function CotizacionGenerator() {
  const { track } = useTracking();

  useEffect(() => {
    track('cotizacion_started', {
      entry_source: 'accounts_hub'
    });
  }, []);

  const handleExportPDF = async () => {
    const startTime = Date.now();

    try {
      // ... existing PDF export logic

      track('cotizacion_exported', {
        quotation_number,
        products_count: products.length,
        total_amount: total,
        has_discount: discountPercent > 0,
        time_to_complete: Math.round((Date.now() - startTime) / 1000)
      });
    } catch (error) {
      track('cotizacion_export_failed', {
        error_message: error.message
      });
    }
  };
}
```

### Eventos Prioritarios (Fase 1)

#### Must-Have (20 eventos core)

```typescript
// Navigation
'page_viewed'
'tab_changed'

// Treasure Browser
'treasure_view'
'treasure_filter_applied'
'product_clicked'
'product_engaged'
'product_favorited'

// Cotización
'cotizacion_started'
'cotizacion_client_info_complete'
'cotizacion_product_added'
'cotizacion_exported'

// Simulator
'simulator_started'
'simulator_product_selected'
'simulator_to_cotizacion'

// Receipt
'receipt_started'
'receipt_exported'

// Oracle
'oracle_viewed'
'oracle_saved'
'oracle_shared'

// Auth
'user_logged_in'
'user_logged_out'
```

#### Nice-to-Have (Fase 2)

```typescript
// Advanced interactions
'comparison_viewed'
'filter_saved'
'ambassador_profile_viewed'
'meditation_completed'
'achievement_unlocked'
```

---

## PARTE 3: DASHBOARD Y VISUALIZACIÓN

### Dashboard Conceptual (Descripción Textual)

#### Panel 1: Business Health (Executive Summary)

```
┌─────────────────────────────────────────────────────┐
│ BUSINESS HEALTH SCORE: 87/100                      │
├─────────────────────────────────────────────────────┤
│                                                     │
│  Cotizaciones Exportadas (30d)    [▓▓▓▓▓▓▓░] 78    │
│  Conversión Simulador → Cotización [▓▓▓▓▓░░░] 23%   │
│  Recibos Generados                [▓▓▓▓▓▓▓▓] 45    │
│  Oracle Engagement                [▓▓▓▓▓▓░░] 62%   │
│                                                     │
│  Top Asesor: María García (12 cotizaciones)        │
│  Top Producto: #2047 Esmeralda Corazón Verde       │
│                                                     │
└─────────────────────────────────────────────────────┘
```

**Métricas mostradas**:
- Total cotizaciones exportadas (30d)
- Conversion rate simulador → cotización
- Total recibos generados
- Oracle daily active users
- Top performer (asesor)
- Top selling product (más cotizado)

---

#### Panel 2: Funnel Visualization (Cotización)

```
┌─────────────────────────────────────────────────────┐
│ FUNNEL: COTIZACIÓN PROFESIONAL (30d)               │
├─────────────────────────────────────────────────────┤
│                                                     │
│  Cotización Iniciada      [▓▓▓▓▓▓▓▓▓▓] 100  (100%) │
│     ↓ -8%                                          │
│  Info Cliente Completa    [▓▓▓▓▓▓▓▓▓░]  92  (92%)  │
│     ↓ -5%                                          │
│  Producto Agregado        [▓▓▓▓▓▓▓▓▓░]  87  (87%)  │
│     ↓ -2%                                          │
│  PDF Exportado            [▓▓▓▓▓▓▓▓░░]  85  (85%)  │
│                                                     │
│  ⚠️  Drop-off crítico: Step 1 → 2 (-8%)            │
│  💡 Sugerencia: Simplificar formulario cliente     │
│                                                     │
└─────────────────────────────────────────────────────┘
```

**Elementos interactivos**:
- Click en cada step para ver breakdown
- Filtros por asesor, rango de fechas
- Comparación periodo anterior

---

#### Panel 3: User Engagement Heatmap

```
┌─────────────────────────────────────────────────────┐
│ ENGAGEMENT POR FEATURE (Últimos 7 días)           │
├─────────────────────────────────────────────────────┤
│                                                     │
│  Feature          DAU    Avg Time    Retention     │
│  ────────────────────────────────────────────────  │
│  Treasure Browser  45    8min 23s    ████████ 78%  │
│  Cotización        32    12min 45s   ██████░░ 65%  │
│  Oracle            38    2min 10s    █████░░░ 55%  │
│  Simulator         18    6min 30s    ████░░░░ 42%  │
│  Recibos           28    3min 15s    ██████░░ 60%  │
│  Embajadores       12    4min 50s    ███░░░░░ 35%  │
│                                                     │
└─────────────────────────────────────────────────────┘
```

**Métricas mostradas**:
- DAU (Daily Active Users) por feature
- Avg session time por feature
- 7-day retention rate

---

#### Panel 4: Gamification Progress

```
┌─────────────────────────────────────────────────────┐
│ ACHIEVEMENTS & PROGRESS                            │
├─────────────────────────────────────────────────────┤
│                                                     │
│  Top Achievements Unlocked (30d):                  │
│                                                     │
│  🏆 Cerrador Profesional     x12 (5 cotizaciones)  │
│  💎 Coleccionista            x8  (10 favoritos)    │
│  📚 Estudiante de Gemas      x15 (5 facts saved)   │
│  🧘 Alma Serena              x5  (5 meditaciones)  │
│                                                     │
│  Progress Rings Distribution:                      │
│  Level 1-2: ████░░░░░░ 35%                        │
│  Level 3-5: █████████░ 45%                        │
│  Level 6+:  ████░░░░░░ 20%                        │
│                                                     │
└─────────────────────────────────────────────────────┘
```

---

#### Panel 5: Product Discovery Insights

```
┌─────────────────────────────────────────────────────┐
│ TREASURE BROWSER INSIGHTS (30d)                    │
├─────────────────────────────────────────────────────┤
│                                                     │
│  Most Used Filters:                                │
│    1. Color: Verde Intenso     (78 searches)       │
│    2. Quality: AAA             (65 searches)       │
│    3. Shape: Óvalo             (45 searches)       │
│    4. Price: 5M-10M COP        (38 searches)       │
│                                                     │
│  Saved Filters Created:        12                  │
│  Avg Filters per Search:       2.3                 │
│  Comparison Rate:              15% (above target!) │
│                                                     │
│  Top Viewed Products:                              │
│    #2047 Esmeralda Corazón Verde    (23 views)    │
│    #1834 Anillo Oro + Esmeralda     (18 views)    │
│    #2103 Esmeralda Colombiana AAA   (16 views)    │
│                                                     │
└─────────────────────────────────────────────────────┘
```

---

### Alertas y Notificaciones Automáticas

#### Alerts Dashboard

```typescript
interface Alert {
  id: string;
  severity: 'critical' | 'warning' | 'info';
  title: string;
  description: string;
  action?: string; // CTA
  timestamp: string;
}

// Ejemplo de alertas automáticas
const alerts: Alert[] = [
  {
    severity: 'critical',
    title: 'Drop-off alto en Cotización',
    description: 'Step 1 → 2 tiene -12% drop-off (target: <10%)',
    action: 'Ver funnel detallado',
  },
  {
    severity: 'warning',
    title: 'Oracle engagement bajo',
    description: 'Solo 45% DAU (target: 60%)',
    action: 'Ver métricas Oracle',
  },
  {
    severity: 'info',
    title: '🎉 Target alcanzado',
    description: 'Comparison rate: 18% (target: 15%)',
  }
];
```

---

## PARTE 4: SISTEMA DE MÉTRICAS DE ÉXITO UX

### Health Score del Producto

#### Fórmula de Health Score

```typescript
function calculateHealthScore(): number {
  const weights = {
    cotizacion_completion: 0.30,    // 30% - Core business
    treasure_engagement: 0.20,      // 20% - Discovery
    oracle_retention: 0.15,         // 15% - Engagement
    simulator_conversion: 0.15,     // 15% - Tools usage
    receipt_completion: 0.10,       // 10% - Documentation
    ambassador_network: 0.10,       // 10% - Social
  };

  const scores = {
    cotizacion_completion: (actual / 0.85) * 100, // Target: 85%
    treasure_engagement: (actual / 0.35) * 100,   // Target: 35%
    oracle_retention: (actual / 0.60) * 100,      // Target: 60%
    simulator_conversion: (actual / 0.25) * 100,  // Target: 25%
    receipt_completion: (actual / 0.95) * 100,    // Target: 95%
    ambassador_network: (actual / 0.45) * 100,    // Target: 45%
  };

  return Object.entries(weights).reduce((total, [key, weight]) => {
    return total + (scores[key] * weight);
  }, 0);
}
```

#### Interpretación

- **90-100**: Excelente - Producto funcionando óptimamente
- **75-89**: Bueno - Algunas áreas de mejora identificadas
- **60-74**: Aceptable - Requiere atención en funnels críticos
- **<60**: Crítico - Intervención UX urgente requerida

---

### KPIs Principales por Flujo

#### Tabla Consolidada

| Flujo | KPI Primario | Target | Frecuencia Medición | Owner |
|-------|-------------|--------|---------------------|-------|
| Cotización | Completion Rate | 85% | Diaria | Product Lead |
| Treasure Browser | Product Engagement | 35% | Semanal | UX Lead |
| Oracle | Daily Return Rate | 60% | Diaria | Content Lead |
| Simulator | Sim → Cotización | 25% | Semanal | Product Lead |
| Recibos | Completion Rate | 95% | Semanal | Operations |
| Embajadores | Profile Visit Rate | 45% | Mensual | Community Lead |

---

### Indicadores de Fricción (Red Flags)

#### Criterios de Alerta

```typescript
interface FrictionIndicator {
  metric: string;
  threshold: number;
  severity: 'high' | 'medium' | 'low';
  action: string;
}

const frictionIndicators: FrictionIndicator[] = [
  {
    metric: 'cotizacion_time_to_complete',
    threshold: 12 * 60, // >12 min
    severity: 'high',
    action: 'Revisar UX del formulario - posible sobrecarga cognitiva'
  },
  {
    metric: 'treasure_filter_abandonment',
    threshold: 0.40, // >40% abandon after applying filters
    severity: 'high',
    action: 'Filtros muy restrictivos o UI confusa'
  },
  {
    metric: 'pdf_export_failure_rate',
    threshold: 0.10, // >10% failures
    severity: 'high',
    action: 'Bug crítico en html2canvas - fix inmediato'
  },
  {
    metric: 'oracle_bounce_rate',
    threshold: 0.70, // >70% bounce
    severity: 'medium',
    action: 'Contenido Oracle poco relevante o scroll depth bajo'
  },
  {
    metric: 'simulator_single_use',
    threshold: 0.60, // >60% users run only 1 sim
    severity: 'medium',
    action: 'Falta claridad en value prop del simulador'
  }
];
```

---

## PARTE 5: INTEGRACIÓN CON GAMIFICACIÓN

### Achievements System

#### Achievement Definitions

```typescript
interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  tier: 'bronze' | 'silver' | 'gold' | 'platinum';
  xp: number;
  trigger: {
    event: string;
    condition: (data: any) => boolean;
  };
  octalysis_drive: number; // 1-8
}

const achievements: Achievement[] = [
  {
    id: 'first_cotizacion',
    name: 'Primera Cotización',
    description: 'Exportaste tu primera cotización profesional',
    icon: '📋',
    tier: 'bronze',
    xp: 50,
    trigger: {
      event: 'cotizacion_exported',
      condition: (data) => data.user_cotizaciones_count === 1
    },
    octalysis_drive: 2 // Accomplishment
  },
  {
    id: 'cerrador_profesional',
    name: 'Cerrador Profesional',
    description: 'Exportaste 5 cotizaciones exitosas',
    icon: '🏆',
    tier: 'silver',
    xp: 200,
    trigger: {
      event: 'cotizacion_exported',
      condition: (data) => data.user_cotizaciones_count === 5
    },
    octalysis_drive: 2 // Accomplishment
  },
  {
    id: 'maestro_ventas',
    name: 'Maestro de Ventas',
    description: '25 cotizaciones exportadas - Eres una estrella',
    icon: '⭐',
    tier: 'gold',
    xp: 500,
    trigger: {
      event: 'cotizacion_exported',
      condition: (data) => data.user_cotizaciones_count === 25
    },
    octalysis_drive: 2 // Accomplishment
  },
  {
    id: 'coleccionista',
    name: 'Coleccionista',
    description: 'Guardaste 10 productos en favoritos',
    icon: '💎',
    tier: 'silver',
    xp: 150,
    trigger: {
      event: 'product_favorited',
      condition: (data) => data.favorites_count === 10
    },
    octalysis_drive: 4 // Ownership
  },
  {
    id: 'curador_experto',
    name: 'Curador Experto',
    description: 'Creaste 5 filtros personalizados',
    icon: '🎯',
    tier: 'gold',
    xp: 300,
    trigger: {
      event: 'filter_saved',
      condition: (data) => data.user_saved_filters_count === 5
    },
    octalysis_drive: 3 // Empowerment
  },
  {
    id: 'estudiante_gemas',
    name: 'Estudiante de Gemas',
    description: 'Guardaste 5 facts del Oracle',
    icon: '📚',
    tier: 'bronze',
    xp: 100,
    trigger: {
      event: 'oracle_saved',
      condition: (data) => data.saved_count === 5
    },
    octalysis_drive: 1 // Epic Meaning
  },
  {
    id: 'embajador_conocimiento',
    name: 'Embajador del Conocimiento',
    description: 'Compartiste 3 facts del Oracle',
    icon: '🌟',
    tier: 'silver',
    xp: 250,
    trigger: {
      event: 'oracle_shared',
      condition: (data) => data.user_shares_count === 3
    },
    octalysis_drive: 5 // Social Influence
  },
  {
    id: 'alma_serena',
    name: 'Alma Serena',
    description: 'Completaste 5 meditaciones',
    icon: '🧘',
    tier: 'gold',
    xp: 400,
    trigger: {
      event: 'meditation_completed',
      condition: (data) => data.user_meditations_count === 5
    },
    octalysis_drive: 1 // Epic Meaning
  },
  {
    id: 'estratega',
    name: 'Estratega',
    description: 'Comparaste productos por primera vez',
    icon: '🔍',
    tier: 'bronze',
    xp: 75,
    trigger: {
      event: 'comparison_viewed',
      condition: (data) => data.products_count >= 2
    },
    octalysis_drive: 3 // Empowerment
  },
  {
    id: 'analista_estrategico',
    name: 'Analista Estratégico',
    description: 'Realizaste 10 simulaciones de precios',
    icon: '📊',
    tier: 'gold',
    xp: 350,
    trigger: {
      event: 'simulator_factors_adjusted',
      condition: (data) => data.user_simulations_count === 10
    },
    octalysis_drive: 3 // Empowerment
  },
  {
    id: 'documentador_oficial',
    name: 'Documentador Oficial',
    description: 'Generaste 10 recibos',
    icon: '📄',
    tier: 'silver',
    xp: 200,
    trigger: {
      event: 'receipt_exported',
      condition: (data) => data.user_receipts_count === 10
    },
    octalysis_drive: 2 // Accomplishment
  },
  {
    id: 'networker',
    name: 'Networker',
    description: 'Visitaste perfiles de 10 embajadores',
    icon: '🤝',
    tier: 'silver',
    xp: 180,
    trigger: {
      event: 'ambassador_profile_viewed',
      condition: (data) => data.unique_ambassadors_visited === 10
    },
    octalysis_drive: 5 // Social Influence
  }
];
```

---

### Progress Rings & XP System

#### Leveling System

```typescript
interface Level {
  level: number;
  xp_required: number;
  title: string;
  benefits: string[];
}

const levels: Level[] = [
  {
    level: 1,
    xp_required: 0,
    title: 'Aprendiz',
    benefits: ['Acceso básico a todas las features']
  },
  {
    level: 2,
    xp_required: 200,
    title: 'Explorador',
    benefits: ['Badge personalizado', 'Stats avanzadas']
  },
  {
    level: 3,
    xp_required: 500,
    title: 'Asesor',
    benefits: ['Filtros guardados ilimitados', 'Priority support']
  },
  {
    level: 4,
    xp_required: 1000,
    title: 'Embajador',
    benefits: ['Dashboard personalizado', 'Early access features']
  },
  {
    level: 5,
    xp_required: 2000,
    title: 'Maestro',
    benefits: ['Acceso Bóveda Secreta', 'Custom branding cotizaciones']
  },
  {
    level: 6,
    xp_required: 4000,
    title: 'Leyenda',
    benefits: ['All benefits', 'Recognition en equipo', 'Mentor role']
  }
];
```

#### Progress Ring Implementation

```typescript
// Mostrar progress hacia siguiente nivel
interface ProgressRingData {
  current_xp: number;
  current_level: number;
  next_level_xp: number;
  progress_percent: number;
}

function calculateProgress(userXp: number): ProgressRingData {
  const currentLevel = levels.findIndex(l => userXp < l.xp_required) - 1;
  const levelData = levels[currentLevel] || levels[0];
  const nextLevelData = levels[currentLevel + 1] || levels[levels.length - 1];

  const xpInCurrentLevel = userXp - levelData.xp_required;
  const xpNeededForNext = nextLevelData.xp_required - levelData.xp_required;

  return {
    current_xp: userXp,
    current_level: currentLevel + 1,
    next_level_xp: nextLevelData.xp_required,
    progress_percent: Math.min(100, (xpInCurrentLevel / xpNeededForNext) * 100)
  };
}
```

---

### Octalysis Balance Dashboard

#### White Hat vs Black Hat Distribution

```typescript
interface OctalysisBalance {
  white_hat_percent: number; // Drives 1-5
  black_hat_percent: number; // Drives 6-8
  drives_distribution: {
    drive_1_epic_meaning: number;
    drive_2_accomplishment: number;
    drive_3_empowerment: number;
    drive_4_ownership: number;
    drive_5_social_influence: number;
    drive_6_scarcity: number;
    drive_7_unpredictability: number;
    drive_8_loss_avoidance: number;
  };
}

// Target: 70%+ White Hat
function calculateOctalysisBalance(achievements: Achievement[]): OctalysisBalance {
  const driveCounts = achievements.reduce((acc, ach) => {
    acc[`drive_${ach.octalysis_drive}`] = (acc[`drive_${ach.octalysis_drive}`] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const whiteHatCount = (driveCounts.drive_1 || 0) + (driveCounts.drive_2 || 0) +
                        (driveCounts.drive_3 || 0) + (driveCounts.drive_4 || 0) +
                        (driveCounts.drive_5 || 0);
  const blackHatCount = (driveCounts.drive_6 || 0) + (driveCounts.drive_7 || 0) +
                        (driveCounts.drive_8 || 0);
  const total = whiteHatCount + blackHatCount;

  return {
    white_hat_percent: (whiteHatCount / total) * 100,
    black_hat_percent: (blackHatCount / total) * 100,
    drives_distribution: {
      drive_1_epic_meaning: ((driveCounts.drive_1 || 0) / total) * 100,
      drive_2_accomplishment: ((driveCounts.drive_2 || 0) / total) * 100,
      drive_3_empowerment: ((driveCounts.drive_3 || 0) / total) * 100,
      drive_4_ownership: ((driveCounts.drive_4 || 0) / total) * 100,
      drive_5_social_influence: ((driveCounts.drive_5 || 0) / total) * 100,
      drive_6_scarcity: ((driveCounts.drive_6 || 0) / total) * 100,
      drive_7_unpredictability: ((driveCounts.drive_7 || 0) / total) * 100,
      drive_8_loss_avoidance: ((driveCounts.drive_8 || 0) / total) * 100,
    }
  };
}

// Resultado esperado para Tierra Madre:
// White Hat: ~75% (Drives 1, 2, 3, 4, 5)
// Black Hat: ~25% (Drives 6, 7 - moderated, Drive 8 minimal)
```

---

### Achievement Notifications

#### Toast Design System

```typescript
interface AchievementToast {
  achievement: Achievement;
  unlocked_at: string;
  new_xp: number;
  new_level?: number; // If leveled up
}

// Visual design (conceptual)
/*
┌────────────────────────────────────────┐
│  🏆  Achievement Unlocked!             │
│                                        │
│  Cerrador Profesional                 │
│  Exportaste 5 cotizaciones exitosas   │
│                                        │
│  +200 XP  |  Level 3 → Level 4 🎉     │
└────────────────────────────────────────┘
*/

// Auto-dismiss after 5s, click to dismiss early
// Animate from bottom-right corner
```

---

## PARTE 6: ROADMAP DE IMPLEMENTACIÓN

---

### FASE 1: FUNDAMENTOS ✅ COMPLETADO

#### Sprint 1.1: Setup de Tracking Infrastructure ✅

**Tareas** (Completadas 2025-12-30):
1. ✅ ~~Instalar Mixpanel~~ → Implementado con localStorage (sin third-party)
2. ✅ Crear `TrackingContext` + `useTracking` hook
3. ✅ Implementar eventos core (page_view, product_view, filter_applied, etc.)
4. ✅ Configurar tipos en `src/types/analytics.ts`
5. ✅ Testing en development

**Entregables**:
- ✅ `src/contexts/TrackingContext.tsx`
- ✅ `src/types/analytics.ts`
- ✅ Integración en App.tsx

**Success Criteria**: ✅ CUMPLIDO
- ✅ Eventos registrándose en localStorage
- ✅ TrackingContext disponible en toda la app

---

#### Sprint 1.2: Funnels Críticos Tracking ✅

**Tareas** (Completadas 2025-12-30):
1. ✅ Tracking en TreasureBrowser (product views, filters)
2. ✅ Tracking de page views automático
3. ✅ Session management con sessionId
4. ✅ Testing de funnels end-to-end

**Entregables**:
- ✅ Tracking integrado en componentes principales

**Success Criteria**: ✅ CUMPLIDO
- ✅ Funnels visibles en Admin Analytics Dashboard
- ✅ Eventos correctamente registrados

---

### FASE 2: GAMIFICACIÓN BÁSICA ✅ COMPLETADO

#### Sprint 2.1: Achievement System ✅

**Tareas** (Completadas 2025-12-30):
1. ✅ Crear 12 Achievement definitions (Octalysis-based)
2. ✅ Implementar `useAchievements` hook con trigger logic
3. ✅ Crear `AchievementToast` component con animaciones
4. ✅ Persistencia en localStorage
5. ✅ Sistema XP integrado

**Entregables**:
- ✅ `src/hooks/useAchievements.ts`
- ✅ `src/components/gamification/AchievementToast.tsx`
- ✅ Achievement definitions embebidas en hook

**Achievements Implementados**:
| ID | Nombre | Trigger | XP | Tier |
|----|--------|---------|-----|------|
| first_explorer | Primer Explorador | Primer producto visto | 50 | bronze |
| treasure_hunter | Cazador de Tesoros | 10 productos vistos | 100 | silver |
| filter_master | Maestro de Filtros | Usar 3+ filtros | 75 | bronze |
| first_cotizacion | Primera Cotización | Primera cotización exportada | 150 | silver |
| cerrador_profesional | Cerrador Profesional | 5 cotizaciones | 300 | gold |
| coleccionista | Coleccionista | 5 favoritos | 100 | silver |
| curador_experto | Curador Experto | 3 filtros guardados | 200 | gold |
| estudiante_gemas | Estudiante de Gemas | 3 Oracle saves | 100 | silver |
| embajador_conocimiento | Embajador del Conocimiento | 2 Oracle shares | 150 | gold |
| networker | Networker | 5 perfiles visitados | 125 | silver |
| simulador_novato | Simulador Novato | Primera simulación | 75 | bronze |
| analista_estrategico | Analista Estratégico | 5 simulaciones | 250 | gold |

**Success Criteria**: ✅ CUMPLIDO
- ✅ Achievements se desbloquean correctamente
- ✅ Toast notifications con animación profesional
- ✅ Persistencia entre sesiones

---

#### Sprint 2.2: Progress Rings & XP System ✅

**Tareas** (Completadas 2025-12-30):
1. ✅ Implementar sistema de 6 niveles (Aprendiz → Leyenda)
2. ✅ Crear `ProgressRing` component con animación SVG
3. ✅ Crear `LevelBadge` component compacto
4. ✅ XP tracking con localStorage

**Entregables**:
- ✅ `src/components/gamification/ProgressRing.tsx`
- ✅ `src/components/gamification/LevelBadge.tsx`
- ✅ Level system en `useAchievements.ts`

**Sistema de Niveles**:
| Nivel | Título | XP Requerido |
|-------|--------|--------------|
| 1 | Aprendiz | 0 |
| 2 | Explorador | 200 |
| 3 | Asesor | 500 |
| 4 | Embajador | 1000 |
| 5 | Maestro | 2000 |
| 6 | Leyenda | 4000 |

**Success Criteria**: ✅ CUMPLIDO
- ✅ Progress Ring animado y visible
- ✅ LevelBadge en NavigationBar para admins
- ✅ Level-ups tracked correctamente

---

### FASE 3: ANALYTICS DASHBOARD ✅ COMPLETADO

#### Sprint 3.1: Business Health Dashboard ✅

**Tareas** (Completadas 2025-12-30):
1. ✅ Crear ruta `/admin/analytics` (AdminRoute protected)
2. ✅ Implementar Business Health Score (0-100)
3. ✅ Visualizar métricas principales
4. ✅ Top products, páginas más visitadas

**Entregables**:
- ✅ `src/pages/AdminAnalyticsPage.tsx`
- ✅ Ruta en App.tsx con AdminRoute
- ✅ Entrada en IOSMoreSheet (solo admins)

**Business Health Score Formula**:
- Productos vistos (30%)
- Filtros aplicados (25%)
- Páginas visitadas (25%)
- Logros desbloqueados (20%)

**Success Criteria**: ✅ CUMPLIDO
- ✅ Admins pueden ver métricas en tiempo real
- ✅ Health Score calculado y visualizado

---

#### Sprint 3.2: Advanced Insights ✅

**Tareas** (Completadas 2025-12-31):
1. ✅ Timeline de actividad con eventos recientes
2. ✅ Filter insights (tipos de filtro más usados)
3. ✅ Page insights (páginas más visitadas)
4. ✅ Export a CSV y JSON

**Entregables**:
- ✅ Tab system (Actividad, Filtros, Páginas)
- ✅ InsightBar component para visualización
- ✅ ActivityItem component con iconos por tipo de evento
- ✅ Funciones handleExportCSV y handleExportJSON

**Success Criteria**: ✅ CUMPLIDO
- ✅ Insights accionables disponibles en tabs
- ✅ Export funcional (CSV descargable, JSON copiable)

---

### FASE 4: OPTIMIZACIÓN & REFINEMENT

#### Sprint 4.1: UX Fixes basados en Data ✅ COMPLETADO

**Tareas** (Completadas 2025-12-31):
1. ✅ Analizar funnels reales con datos acumulados
2. ✅ Identificar friction points automáticamente
3. ✅ Generar recomendaciones UX accionables
4. ⏳ A/B testing de mejoras (futuro)

**Entregables**:
- ✅ `src/types/analytics.ts` - Tipos para análisis de funnels
- ✅ `src/utils/funnelAnalyzer.ts` - Motor de análisis con detección de fricciones
- ✅ `src/components/analytics/FunnelVisualization.tsx` - Visualización de funnels
- ✅ `src/components/analytics/FrictionInsights.tsx` - Panel de insights UX
- ✅ Nueva tab "Funnels" en AdminAnalyticsPage

**Características Implementadas**:

1. **Funnel Analyzer Engine**:
   - 5 funnels definidos: Discovery, Cotización, Simulator, Receipt, Engagement
   - Cálculo automático de: completion rate, drop-off por paso, tiempo promedio
   - Detección de drop-offs críticos con severidad (low/medium/high/critical)
   - Comparación contra targets definidos

2. **Friction Point Detection**:
   - Identificación automática de puntos de fricción
   - Clasificación por severidad
   - Recomendaciones UX específicas por funnel y paso
   - Estimación de impacto de mejoras

3. **UX Insights Generation**:
   - Quick Wins identificados automáticamente
   - Critical Fixes priorizados
   - Improvements y Optimizations categorizados
   - Evidence-based recommendations con datos

4. **Visual Dashboard**:
   - FunnelVisualization: barras de progreso por paso, drop-offs visuales
   - FrictionInsights: resumen de UX, cards expandibles con detalles
   - Métricas: entradas, completados, conversión, tiempo promedio
   - Alertas visuales para funnels debajo del target

**Success Criteria**: ✅ CUMPLIDO
- ✅ Análisis automático de funnels funcional
- ✅ Detección de fricciones implementada
- ✅ Recomendaciones UX generadas automáticamente

---

#### Sprint 4.2: Gamification Expansion

**Tareas**:
1. ⏳ Agregar 10+ achievements nuevos
2. ⏳ Leaderboards por equipo
3. ⏳ Weekly challenges
4. ⏳ Social features (compartir achievements)

**Entregables**:
- Expanded achievement catalog
- Leaderboard component
- Social sharing

**Success Criteria**:
- Engagement metrics up 15%
- Daily active users up 10%

---

## RESUMEN DE IMPLEMENTACIÓN

| Fase | Estado | Fecha Completado |
|------|--------|------------------|
| Fase 1: Fundamentos | ✅ Completado | 2025-12-30 |
| Fase 2: Gamificación Básica | ✅ Completado | 2025-12-30 |
| Fase 3.1: Business Health Dashboard | ✅ Completado | 2025-12-30 |
| Fase 3.2: Advanced Insights | ✅ Completado | 2025-12-31 |
| Fase 4.1: Funnel Analysis & UX Insights | ✅ Completado | 2025-12-31 |
| Fase 4.2: Gamification Expansion | ⏳ Pendiente | - |

**Archivos Creados/Modificados**:

- `src/contexts/TrackingContext.tsx` - Context principal de tracking
- `src/types/analytics.ts` - Tipos TypeScript para analytics (+ funnel types)
- `src/utils/funnelAnalyzer.ts` - Motor de análisis de funnels
- `src/components/analytics/FunnelVisualization.tsx` - Visualización de funnels
- `src/components/analytics/FrictionInsights.tsx` - Panel de fricciones y UX insights
- `src/components/analytics/index.ts` - Exports de componentes analytics
- `src/hooks/useAchievements.ts` - Sistema de logros y XP
- `src/components/gamification/AchievementToast.tsx` - Notificaciones de logros
- `src/components/gamification/ProgressRing.tsx` - Anillo de progreso animado
- `src/components/gamification/LevelBadge.tsx` - Badge compacto de nivel
- `src/pages/AdminAnalyticsPage.tsx` - Dashboard de analytics para admins

---

## APÉNDICE A: WIREFRAMES CONCEPTUALES

### Wireframe 1: Achievement Toast (Mobile)

```
┌─────────────────────────────────────┐
│                                     │
│  (App content)                      │
│                                     │
│                                     │
│                ┌──────────────────┐ │
│                │ 🏆 Achievement   │ │
│                │                  │ │
│                │ Cerrador Pro     │ │
│                │ 5 cotizaciones   │ │
│                │                  │ │
│                │ +200 XP  Lvl 4→  │ │
│                └──────────────────┘ │
│                     ↑               │
│              Animated slide-up      │
└─────────────────────────────────────┘
```

---

### Wireframe 2: Progress Ring in Home

```
┌─────────────────────────────────────┐
│ HOME                                │
├─────────────────────────────────────┤
│                                     │
│  ┌────────────────────────────────┐ │
│  │   Welcome Card                 │ │
│  │                                │ │
│  │      ╭────╮                    │ │
│  │    75%│    │ Level 3           │ │
│  │      ╰────╯ Asesor             │ │
│  │                                │ │
│  │  750 / 1000 XP                 │ │
│  │  250 XP to Level 4             │ │
│  │                                │ │
│  │  Achievements: 8/12            │ │
│  └────────────────────────────────┘ │
│                                     │
└─────────────────────────────────────┘
```

---

### Wireframe 3: Funnel Visualization (Admin Dashboard)

```
┌──────────────────────────────────────────┐
│ ADMIN ANALYTICS                          │
├──────────────────────────────────────────┤
│                                          │
│  Funnel: Cotización (Last 30 days)      │
│                                          │
│  ┌────────────────────────────────────┐ │
│  │ Started          100 ████████████  │ │
│  │      ↓ -8%                         │ │
│  │ Client Info      92  ███████████   │ │
│  │      ↓ -5%                         │ │
│  │ Product Added    87  ██████████    │ │
│  │      ↓ -2%                         │ │
│  │ PDF Exported     85  ██████████    │ │
│  └────────────────────────────────────┘ │
│                                          │
│  ⚠️  Critical Drop: Step 1→2 (-8%)      │
│  💡 Suggested Fix: Simplify form        │
│                                          │
│  [View Detailed Breakdown]              │
│                                          │
└──────────────────────────────────────────┘
```

---

### Wireframe 4: Octalysis Balance Radar Chart (Admin)

```
┌──────────────────────────────────────────┐
│ GAMIFICATION BALANCE                     │
├──────────────────────────────────────────┤
│                                          │
│   White Hat: 75% ✅ (Target: 70%+)      │
│   Black Hat: 25%                         │
│                                          │
│          Epic Meaning (1)                │
│               /|\                        │
│              / | \                       │
│    Social(5)/  |  \Accomplish(2)        │
│            /   |   \                     │
│           ─────┼─────                    │
│          /     |     \                   │
│  Avoid(8)      |      Empower(3)        │
│         \      |      /                  │
│          \     |     /                   │
│           ─────┼─────                    │
│    Unpred(7)\  |  /Owner(4)             │
│              \ | /                       │
│               \|/                        │
│            Scarcity(6)                   │
│                                          │
│  Drive Breakdown:                        │
│  1-Epic: 20%  | 2-Accomplish: 25%       │
│  3-Empower: 15% | 4-Owner: 10%          │
│  5-Social: 5%  | 6-Scarcity: 10%        │
│  7-Unpred: 10% | 8-Avoid: 5%            │
│                                          │
└──────────────────────────────────────────┘
```

---

## APÉNDICE B: QUERIES ÚTILES (MIXPANEL/SQL)

### Query 1: Cotización Funnel Conversion

```sql
-- Mixpanel JQL equivalent
SELECT
  COUNT(DISTINCT user_id) as started,
  COUNT(DISTINCT CASE WHEN event = 'cotizacion_client_info_complete' THEN user_id END) as completed_info,
  COUNT(DISTINCT CASE WHEN event = 'cotizacion_product_added' THEN user_id END) as added_product,
  COUNT(DISTINCT CASE WHEN event = 'cotizacion_exported' THEN user_id END) as exported
FROM events
WHERE event IN ('cotizacion_started', 'cotizacion_client_info_complete', 'cotizacion_product_added', 'cotizacion_exported')
  AND timestamp >= NOW() - INTERVAL '30 days'
GROUP BY DATE(timestamp)
ORDER BY DATE(timestamp) DESC;
```

---

### Query 2: Top Products by Engagement

```sql
SELECT
  properties.item_id,
  properties.item_name,
  COUNT(*) as total_views,
  AVG(properties.time_on_page) as avg_time,
  COUNT(DISTINCT user_id) as unique_viewers
FROM events
WHERE event = 'product_engaged'
  AND timestamp >= NOW() - INTERVAL '30 days'
GROUP BY properties.item_id, properties.item_name
ORDER BY total_views DESC
LIMIT 10;
```

---

### Query 3: Achievement Unlock Rate

```sql
SELECT
  properties.achievement_id,
  properties.achievement_name,
  COUNT(*) as total_unlocks,
  COUNT(DISTINCT user_id) as unique_users,
  (COUNT(*) * 1.0 / (SELECT COUNT(DISTINCT user_id) FROM events)) as unlock_rate
FROM events
WHERE event = 'achievement_unlocked'
  AND timestamp >= NOW() - INTERVAL '30 days'
GROUP BY properties.achievement_id, properties.achievement_name
ORDER BY total_unlocks DESC;
```

---

## CONCLUSIÓN

Este sistema de tracking y funnels está diseñado para:

1. **Medir lo que importa**: Solo eventos que informan decisiones de producto
2. **Gamificación ética**: 75% White Hat dominance (Octalysis framework)
3. **Accionable**: Alerts y dashboards que guían mejoras UX
4. **Escalable**: Arquitectura lista para crecer con el producto
5. **Privacy-conscious**: Datos internos, sin third-party trackers invasivos

**Next Steps**:
1. Revisar este documento con equipo de producto
2. Priorizar funnels críticos para Fase 1
3. Elegir herramienta de analytics (Mixpanel recommended)
4. Asignar owners a cada funnel
5. Iniciar implementación siguiendo roadmap de 8 semanas

---

**Documento creado por**: Moksart - UX Excellence & Gamificación Estratégica
**Fecha**: 2025-12-30
**Versión**: 1.0
**Para**: Tierra Madre Studio - CoomÜnity Universe

*"Cada interacción es una oportunidad de crear valor medible con empatía profunda"*
