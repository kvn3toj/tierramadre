/**
 * Admin + Staff route registry — the single source of truth for the Fotosynthia
 * Copilot's navigation map and natural-language navigation capability.
 *
 * PURITY CONTRACT: this module must stay free of React / MUI / lucide *runtime*
 * imports so it can be imported by both the client AND `flowSchemas.ts` (which is
 * bundled into the `api/fotosintesis-ai` serverless function). Icons are stored as
 * string names and resolved to components only in the map UI. Only a *type-only*
 * import of AccessLevel is allowed here.
 *
 * Drift guard: `adminNavMap.routes.test.ts` asserts this registry stays in sync
 * with the `<Route>` definitions in `src/App.tsx`.
 */

import type { AccessLevel } from '../types/auth';

export type NavGroup =
  | 'Campaña'
  | 'Inventario'
  | 'Ventas'
  | 'Analítica'
  | 'Directorio'
  | 'Cuentas'
  | 'Perfil'
  | 'Sistema';

/** Fixed display order for grouped rendering in the nav map. */
export const GROUP_ORDER: readonly NavGroup[] = [
  'Campaña',
  'Inventario',
  'Ventas',
  'Analítica',
  'Directorio',
  'Cuentas',
  'Perfil',
  'Sistema',
];

/** How the NL layer turns a human phrase into a concrete param value. */
export type ParamResolver =
  'loteId' | 'itemId' | 'saleId' | 'lotItemId' | 'guestName' | 'none';

export interface RouteParamSpec {
  /** Param name as it appears in `path` (e.g. "loteId"). */
  name: string;
  resolver: ParamResolver;
  /** Human label shown to the model + map when the value is missing. */
  label: string;
  required: boolean;
}

export interface AdminRouteEntry {
  /** Stable key, e.g. "fotosintesis.lote". Never reused for a different route. */
  id: string;
  /** Path with `:param` placeholders, matching `src/App.tsx`. */
  path: string;
  /** Human label (es-CO). */
  label: string;
  group: NavGroup;
  /** Lucide icon NAME (string) — resolved to a component only in the map UI. */
  iconName: string;
  /** One line; powers map tooltip + LLM disambiguation. */
  description: string;
  /** Fuzzy + LLM matching terms. */
  keywords: string[];
  /** Access levels that may SEE + NAVIGATE here (mirrors the App.tsx guards). */
  roles: AccessLevel[];
  /** Present iff `path` contains `:params`. */
  params?: RouteParamSpec[];
  /** True iff `path` has params. */
  dynamic: boolean;
  /** When false, hidden from the visual map but still navigable by NL. Default true. */
  showInMap?: boolean;
}

const STAFF: AccessLevel[] = ['admin', 'embajador', 'asesor'];
const ADMIN: AccessLevel[] = ['admin'];

/**
 * Every admin + staff route. Public/storefront and provider routes are out of scope
 * (the copilot is a back-office companion). Roles mirror the real `<AdminRoute>` /
 * `<StaffRoute>` guards in `src/App.tsx`.
 */
export const ADMIN_NAV_MAP: readonly AdminRouteEntry[] = [
  // ── Inventario · Fotosíntesis ──────────────────────────────────────────────
  {
    id: 'fotosintesis.home',
    path: '/admin/fotosintesis',
    label: 'Fotosíntesis · Inicio',
    group: 'Inventario',
    iconName: 'Camera',
    description: 'Panorama del taller: lotes abiertos, ventas y sincronización',
    keywords: [
      'fotosintesis',
      'taller',
      'captura',
      'inicio',
      'panorama',
      'atelier',
    ],
    roles: ADMIN,
    dynamic: false,
  },
  {
    id: 'fotosintesis.escanear',
    path: '/admin/fotosintesis/escanear',
    label: 'Escanear QR',
    group: 'Inventario',
    iconName: 'ScanLine',
    description:
      'Escanear el QR de un ítem con la cámara para ver su ficha y registrar movimientos',
    keywords: [
      'escanear',
      'escaner',
      'escáner',
      'qr',
      'camara',
      'cámara',
      'codigo',
      'código',
      'scan',
    ],
    roles: ADMIN,
    dynamic: false,
  },
  {
    id: 'fotosintesis.lots',
    path: '/admin/fotosintesis/lots',
    label: 'Todos los lotes',
    group: 'Inventario',
    iconName: 'Boxes',
    description: 'Historial completo de lotes (abiertos, cerrados, publicados)',
    keywords: ['lotes', 'historial', 'inventario', 'cajas', 'compras'],
    roles: ADMIN,
    dynamic: false,
  },
  {
    id: 'fotosintesis.items',
    path: '/admin/fotosintesis/items',
    label: 'Items',
    group: 'Inventario',
    iconName: 'Gem',
    description:
      'Todas las piezas del inventario (con lote o sin él): ficha, edición, kardex e historial',
    keywords: [
      'items',
      'ítems',
      'piezas',
      'productos',
      'inventario',
      'esmeraldas',
      'joyas',
      'editar item',
      'ficha',
    ],
    roles: ADMIN,
    dynamic: false,
  },
  {
    id: 'fotosintesis.lote.nuevo.v4',
    path: '/admin/fotosintesis/lots/new-v4',
    label: 'Nuevo lote (v4)',
    group: 'Inventario',
    iconName: 'Gem',
    description:
      'W1 Cerebro Racional: datos financieros del lote con preview del motor. ' +
      'Al guardar crea las casillas por clasificar.',
    keywords: ['lote', 'nuevo', 'v4', 'compra', 'motor', 'precio', 'categoría'],
    roles: ADMIN,
    dynamic: false,
    // Detrás de VITE_CAPTURA_V4: la ruta solo se monta con el flag encendido.
    showInMap: false,
  },
  {
    id: 'fotosintesis.movimiento.v4',
    path: '/admin/fotosintesis/movimientos-v4',
    label: 'Movimiento (v4)',
    group: 'Inventario',
    iconName: 'ArrowLeftRight',
    description:
      'W3: venta, consignación, devolución y entrega a asesor en una sola ' +
      'pantalla. La venta exige precio real.',
    keywords: [
      'movimiento',
      'venta',
      'consignación',
      'devolución',
      'graduar',
      'w3',
    ],
    roles: ADMIN,
    dynamic: false,
    showInMap: false,
  },
  {
    id: 'fotosintesis.lote.casillas',
    path: '/admin/fotosintesis/lots/:loteId/casillas',
    label: 'Clasificar casillas',
    group: 'Inventario',
    iconName: 'LayoutGrid',
    description:
      'W2 Cerebro Creativo: score de clasificación, conciliación de costos y ' +
      'gate de publicación del lote.',
    keywords: ['casillas', 'clasificar', 'w2', 'publicar', 'completeness'],
    roles: ADMIN,
    params: [
      {
        name: 'loteId',
        resolver: 'loteId',
        label: 'lote (ej. B-001)',
        required: true,
      },
    ],
    dynamic: true,
    showInMap: false,
  },
  {
    id: 'fotosintesis.lote.casilla',
    path: '/admin/fotosintesis/lots/:loteId/casillas/:itemId',
    label: 'Casilla',
    group: 'Inventario',
    iconName: 'Gem',
    description:
      'Clasificar una pieza: costo unitario real capturado, calidad, color, ' +
      'corte y rareza. Entrada directa por QR.',
    keywords: ['casilla', 'clasificar', 'pieza', 'costo unitario', 'qr'],
    roles: ADMIN,
    params: [
      {
        name: 'loteId',
        resolver: 'loteId',
        label: 'lote (ej. B-001)',
        required: true,
      },
      {
        name: 'itemId',
        resolver: 'itemId',
        label: 'ítem (ej. 525)',
        required: true,
      },
    ],
    dynamic: true,
    showInMap: false,
  },
  {
    id: 'fotosintesis.lote',
    path: '/admin/fotosintesis/lots/:loteId',
    label: 'Lote',
    group: 'Inventario',
    iconName: 'Package',
    description: 'Captura ítem por ítem de un lote específico',
    keywords: ['lote', 'abrir lote', 'captura', 'B-'],
    roles: ADMIN,
    params: [
      {
        name: 'loteId',
        resolver: 'loteId',
        label: 'lote (ej. B-001)',
        required: true,
      },
    ],
    dynamic: true,
    showInMap: false,
  },
  {
    id: 'fotosintesis.lote.close',
    path: '/admin/fotosintesis/lots/:loteId/close',
    label: 'Cerrar lote',
    group: 'Inventario',
    iconName: 'CheckCircle2',
    description: 'Pantalla de cierre y publicación de un lote al catálogo',
    keywords: ['cerrar lote', 'publicar lote', 'cierre'],
    roles: ADMIN,
    params: [
      { name: 'loteId', resolver: 'loteId', label: 'lote', required: true },
    ],
    dynamic: true,
    showInMap: false,
  },
  {
    id: 'fotosintesis.lote.sublotes',
    path: '/admin/fotosintesis/lots/:loteId/sublotes',
    label: 'Sublotes',
    group: 'Inventario',
    iconName: 'Boxes',
    description: 'Sublotes derivados de un lote',
    keywords: ['sublotes', 'sublote'],
    roles: ADMIN,
    params: [
      { name: 'loteId', resolver: 'loteId', label: 'lote', required: true },
    ],
    dynamic: true,
    showInMap: false,
  },
  {
    id: 'fotosintesis.lote.editItem',
    path: '/admin/fotosintesis/lots/:loteId/items/:lotItemId/edit',
    label: 'Editar ítem',
    group: 'Inventario',
    iconName: 'Pencil',
    description: 'Editar los datos de un ítem dentro de un lote',
    keywords: ['editar item', 'editar gema', 'editar joya', 'editar pieza'],
    roles: ADMIN,
    params: [
      { name: 'loteId', resolver: 'loteId', label: 'lote', required: true },
      {
        name: 'lotItemId',
        resolver: 'lotItemId',
        label: 'ítem',
        required: true,
      },
    ],
    dynamic: true,
    showInMap: false,
  },
  {
    id: 'admin.products',
    path: '/admin/products',
    label: 'Atelier · Inventario',
    group: 'Inventario',
    iconName: 'Gem',
    description:
      'Hoja maestra: edición masiva, filtros avanzados, patrones y cromática',
    keywords: [
      'atelier',
      'productos',
      'hoja maestra',
      'inventario fino',
      'editar inventario',
      'edicion masiva',
      'edición masiva',
      'filtros avanzados',
    ],
    roles: ADMIN,
    dynamic: false,
  },
  {
    id: 'admin.products.etiquetas',
    path: '/admin/products/etiquetas',
    label: 'Etiquetas · QR',
    group: 'Inventario',
    iconName: 'QrCode',
    description: 'Galería de etiquetas QR imprimibles para productos e insumos',
    keywords: [
      'etiquetas',
      'qr',
      'codigos',
      'códigos',
      'imprimir',
      'labels',
      'stickers',
    ],
    roles: ADMIN,
    dynamic: false,
  },

  // ── Ventas ──────────────────────────────────────────────────────────────────
  {
    id: 'fotosintesis.sales',
    path: '/admin/fotosintesis/sales',
    label: 'Ventas',
    group: 'Ventas',
    iconName: 'BarChart3',
    description: 'Resumen de ventas: KPIs, ledger y detalle por venta',
    keywords: [
      'ventas',
      'resumen ventas',
      'dashboard ventas',
      'reporte',
      'ledger',
      'comisiones',
    ],
    roles: ADMIN,
    dynamic: false,
  },
  {
    id: 'fotosintesis.sale.new',
    path: '/admin/fotosintesis/sales/new',
    label: 'Nueva venta',
    group: 'Ventas',
    iconName: 'Tag',
    description: 'Registrar una venta y generar el Kardex',
    keywords: ['venta', 'vender', 'nueva venta', 'kardex', 'registrar venta'],
    roles: ADMIN,
    dynamic: false,
  },
  {
    id: 'fotosintesis.movimientos',
    path: '/admin/fotosintesis/movimientos',
    label: 'Movimientos con asesores',
    group: 'Ventas',
    iconName: 'Receipt',
    description:
      'Registrar entregas y devoluciones de varios ítems a un asesor en un solo evento (kardex)',
    keywords: [
      'movimientos',
      'kardex',
      'entrega',
      'devolucion',
      'devolución',
      'consignacion',
      'consignación',
      'asesor',
      'comercializador',
    ],
    roles: ADMIN,
    dynamic: false,
  },
  {
    id: 'fotosintesis.sale',
    path: '/admin/fotosintesis/sales/:saleId',
    label: 'Detalle de venta',
    group: 'Ventas',
    iconName: 'Receipt',
    description: 'Detalle y Kardex de una venta registrada',
    keywords: ['venta', 'detalle venta', 'kardex'],
    roles: ADMIN,
    params: [
      { name: 'saleId', resolver: 'saleId', label: 'venta', required: true },
    ],
    dynamic: true,
    showInMap: false,
  },

  // ── Directorio ────────────────────────────────────────────────────────────
  {
    id: 'fotosintesis.directory',
    path: '/admin/fotosintesis/directory',
    label: 'Directorio',
    group: 'Directorio',
    iconName: 'Users',
    description: 'Proveedores, embajadores y clientes finales',
    keywords: [
      'directorio',
      'proveedores',
      'clientes',
      'contactos',
      'embajadores',
    ],
    roles: ADMIN,
    dynamic: false,
  },

  // ── Certificados ──────────────────────────────────────────────────────────
  {
    id: 'fotosintesis.certificados',
    path: '/admin/fotosintesis/certificados',
    label: 'Certificados',
    group: 'Inventario',
    iconName: 'FileText',
    description: 'Generar certificados de origen, embajador y carnet',
    keywords: [
      'certificado',
      'certificados',
      'carnet',
      'origen',
      'embajador',
      'generador',
    ],
    roles: ADMIN,
    dynamic: false,
  },
  {
    // Guided AI capture workbench — entered via specific flow actions
    // (venta, lote, provider, client, item-*), not a top-level destination,
    // so it stays navigable by NL but hidden from the visual map.
    id: 'fotosintesis.workbench',
    path: '/admin/fotosintesis/copilot/:flow',
    label: 'Copiloto (captura guiada)',
    group: 'Inventario',
    iconName: 'Sparkles',
    description:
      'Flujo de captura guiada por IA (venta, lote, proveedor, cliente, ítem)',
    keywords: ['copiloto', 'workbench', 'captura guiada', 'flujo', 'asistente'],
    roles: ADMIN,
    params: [
      { name: 'flow', resolver: 'none', label: 'flujo', required: true },
    ],
    dynamic: true,
    showInMap: false,
  },

  // ── Analítica ────────────────────────────────────────────────────────────
  {
    id: 'admin.analytics',
    path: '/admin/analytics',
    label: 'Analytics',
    group: 'Analítica',
    iconName: 'BarChart3',
    description: 'Métricas del negocio y Business Health Score',
    keywords: [
      'analytics',
      'analitica',
      'metricas',
      'dashboard',
      'salud',
      'estadisticas',
    ],
    roles: ADMIN,
    dynamic: false,
  },
  {
    id: 'admin.analytics.item',
    path: '/admin/analytics/item/:itemId',
    label: 'Vistas de producto',
    group: 'Analítica',
    iconName: 'Eye',
    description: 'Quién vio un producto y cuántas veces',
    keywords: ['vistas', 'viewers', 'quien vio'],
    roles: ADMIN,
    params: [
      { name: 'itemId', resolver: 'itemId', label: 'producto', required: true },
    ],
    dynamic: true,
    showInMap: false,
  },
  {
    id: 'admin.analytics.user',
    path: '/admin/analytics/user',
    label: 'Historial de usuario',
    group: 'Analítica',
    iconName: 'UserSearch',
    description: 'Historial de navegación por usuario',
    keywords: ['historial usuario', 'user views', 'navegacion'],
    roles: ADMIN,
    dynamic: false,
  },
  {
    id: 'admin.analytics.activity',
    path: '/admin/analytics/activity',
    label: 'Actividad',
    group: 'Analítica',
    iconName: 'Activity',
    description: 'Feed de actividad de todos los usuarios',
    keywords: ['actividad', 'feed', 'activity', 'eventos'],
    roles: ADMIN,
    dynamic: false,
  },
  {
    id: 'admin.cotizacionProducts',
    path: '/admin/cotizacion-products',
    label: 'Productos cotizados',
    group: 'Analítica',
    iconName: 'FileBarChart',
    description: 'Analítica de productos incluidos en cotizaciones',
    keywords: ['productos cotizados', 'cotizacion analitica'],
    roles: ADMIN,
    dynamic: false,
  },

  // ── Sistema ──────────────────────────────────────────────────────────────
  {
    id: 'admin.nameGenerator',
    path: '/admin/name-generator',
    label: 'Generador de nombres',
    group: 'Sistema',
    iconName: 'Sparkles',
    description: 'Nombres únicos para esmeraldas con IA',
    keywords: ['generador', 'nombres', 'naming', 'ia', 'bautizar'],
    roles: ADMIN,
    dynamic: false,
  },
  {
    id: 'admin.feedback',
    path: '/admin/feedback',
    label: 'Feedback',
    group: 'Sistema',
    iconName: 'MessageSquare',
    description: 'Dashboard de feedback interno del equipo',
    keywords: ['feedback', 'reportes', 'bugs', 'sugerencias'],
    roles: ADMIN,
    dynamic: false,
  },

  // ── Cuentas ──────────────────────────────────────────────────────────────
  {
    id: 'cuentas.hub',
    path: '/cuentas',
    label: 'Cuentas',
    group: 'Cuentas',
    iconName: 'Landmark',
    description: 'Hub de cuentas, cotizaciones y finanzas',
    keywords: ['cuentas', 'finanzas', 'dinero', 'hub'],
    roles: STAFF,
    dynamic: false,
  },
  {
    id: 'cuentas.cotizaciones',
    path: '/cuentas/cotizaciones',
    label: 'Cotizaciones',
    group: 'Cuentas',
    iconName: 'FileText',
    description: 'Generar y gestionar cotizaciones',
    keywords: ['cotizacion', 'cotizaciones', 'presupuesto'],
    roles: STAFF,
    dynamic: false,
  },
  {
    id: 'cuentas.cotizaciones.preview',
    path: '/cuentas/cotizaciones/preview',
    label: 'Vista previa de cotización',
    group: 'Cuentas',
    iconName: 'FileText',
    description: 'Previsualizar una cotización antes de enviarla',
    keywords: ['preview cotizacion', 'vista previa', 'previsualizar'],
    roles: STAFF,
    dynamic: false,
    showInMap: false,
  },
  {
    id: 'cuentas.simulador',
    path: '/cuentas/simulador',
    label: 'Simulador de precios',
    group: 'Cuentas',
    iconName: 'Calculator',
    description: 'Simulador de cálculo de precios',
    keywords: ['simulador', 'precios', 'calculadora'],
    roles: ADMIN,
    dynamic: false,
  },
  {
    id: 'cuentas.recibos',
    path: '/cuentas/recibos',
    label: 'Recibos',
    group: 'Cuentas',
    iconName: 'Receipt',
    description: 'Generador de recibos',
    keywords: ['recibos', 'recibo', 'comprobante'],
    roles: ADMIN,
    dynamic: false,
  },
  {
    id: 'cuentas.solicitudes',
    path: '/cuentas/solicitudes',
    label: 'Solicitudes de cotización',
    group: 'Cuentas',
    iconName: 'Inbox',
    description: 'Solicitudes de cotización gestionadas por el admin',
    keywords: ['solicitudes cotizacion', 'requests', 'solicitudes admin'],
    roles: ADMIN,
    dynamic: false,
  },
  {
    id: 'cuentas.solicitudes.nueva',
    path: '/cuentas/solicitudes/nueva',
    label: 'Nueva solicitud de cotización',
    group: 'Cuentas',
    iconName: 'Inbox',
    description: 'Crear una solicitud de cotización',
    keywords: ['nueva solicitud', 'crear solicitud cotizacion'],
    roles: ADMIN,
    dynamic: false,
    showInMap: false,
  },
  {
    id: 'cuentas.cotizacionesProveedor',
    path: '/cuentas/cotizaciones-proveedor',
    label: 'Cotizaciones de proveedor',
    group: 'Cuentas',
    iconName: 'FileText',
    description: 'Cotizaciones recibidas de proveedores',
    keywords: ['cotizaciones proveedor', 'proveedores cotizan'],
    roles: ADMIN,
    dynamic: false,
  },
  {
    id: 'cuentas.solicitudesAsesores',
    path: '/cuentas/solicitudes-asesores',
    label: 'Solicitudes de asesores',
    group: 'Cuentas',
    iconName: 'ClipboardList',
    description: 'Solicitudes de producto enviadas por asesores',
    keywords: ['solicitudes asesores', 'pedidos asesores'],
    roles: ADMIN,
    dynamic: false,
  },
  {
    id: 'solicitudes',
    path: '/solicitudes',
    label: 'Solicitudes de producto',
    group: 'Cuentas',
    iconName: 'ShoppingBag',
    description: 'Pedir productos al admin (asesores y embajadores)',
    keywords: ['solicitudes', 'pedir producto', 'solicitud producto'],
    roles: STAFF,
    dynamic: false,
  },

  // ── Perfil ──────────────────────────────────────────────────────────────
  {
    id: 'perfil',
    path: '/mi-perfil',
    label: 'Mi perfil',
    group: 'Perfil',
    iconName: 'User',
    description: 'Tu portafolio personal y actividad',
    keywords: ['perfil', 'mi perfil', 'portafolio', 'cuenta'],
    roles: STAFF,
    dynamic: false,
  },
  {
    id: 'perfil.actividad',
    path: '/mi-perfil/actividad',
    label: 'Mi actividad',
    group: 'Perfil',
    iconName: 'Activity',
    description: 'Historial completo de tu actividad',
    keywords: ['mi actividad', 'historial actividad'],
    roles: STAFF,
    dynamic: false,
  },
  {
    id: 'perfil.invitado',
    path: '/mi-perfil/invitado/:guestName',
    label: 'Invitado',
    group: 'Perfil',
    iconName: 'UserPlus',
    description: 'Detalle de un invitado',
    keywords: ['invitado', 'guest', 'invitacion'],
    roles: STAFF,
    params: [
      {
        name: 'guestName',
        resolver: 'guestName',
        label: 'invitado',
        required: true,
      },
    ],
    dynamic: true,
    showInMap: false,
  },
  // ── Campaña · Renacer ──────────────────────────────────────────────────────
  {
    id: 'renacer.consola',
    path: '/admin/renacer',
    label: 'Renacer · Consola de operación',
    group: 'Campaña',
    iconName: 'HeartHandshake',
    description:
      'Operar la campaña Renacer: despacho de necesidades, personas, raíces, muros, voluntarios y conexiones',
    keywords: [
      'renacer',
      'campaña',
      'campana',
      'consola',
      'despacho',
      'necesidades',
      'raices',
      'raíces',
      'muros',
      'voluntarios',
      'terremoto',
    ],
    roles: ADMIN,
    dynamic: false,
  },
];

// ── Pure helpers (server-safe) ─────────────────────────────────────────────

const BY_ID: Map<string, AdminRouteEntry> = new Map(
  ADMIN_NAV_MAP.map((e) => [e.id, e]),
);

export function getRouteById(id: string): AdminRouteEntry | undefined {
  return BY_ID.get(id);
}

export function canAccess(entry: AdminRouteEntry, level: AccessLevel): boolean {
  return entry.roles.includes(level);
}

/**
 * Fill `:params` from a values map. Returns the concrete path, or `null` if a
 * required param is missing. URL-encodes each value.
 */
export function buildPath(
  entry: AdminRouteEntry,
  params: Record<string, string> = {},
): string | null {
  if (!entry.dynamic || !entry.params?.length) return entry.path;
  let out = entry.path;
  for (const spec of entry.params) {
    const value = params[spec.name];
    if (value == null || value === '') {
      if (spec.required) return null;
      continue;
    }
    out = out.replace(`:${spec.name}`, encodeURIComponent(value));
  }
  // Any remaining required placeholder means we failed to fill it.
  if (/:[A-Za-z]/.test(out)) return null;
  return out;
}

/** First required param spec still unfilled by `params`, or null. */
export function firstMissingParam(
  entry: AdminRouteEntry,
  params: Record<string, string> = {},
): RouteParamSpec | null {
  if (!entry.params?.length) return null;
  return entry.params.find((p) => p.required && !params[p.name]) ?? null;
}

/** Routes a level may navigate to (includes dynamic routes) — used for the LLM catalog. */
export function navRoutesForLevel(level: AccessLevel): AdminRouteEntry[] {
  return ADMIN_NAV_MAP.filter((e) => canAccess(e, level));
}

/** Routes shown in the visual map: role-filtered AND `showInMap !== false`. */
export function navMapForLevel(level: AccessLevel): AdminRouteEntry[] {
  return ADMIN_NAV_MAP.filter(
    (e) => canAccess(e, level) && e.showInMap !== false,
  );
}
