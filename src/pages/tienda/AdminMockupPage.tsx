/**
 * `/tienda/admin-preview` — MAQUETA de la herramienta de administración
 * hablando el idioma de la tienda.
 *
 * No es una función: es un dibujo. No toca Convex, ni `api/`, ni
 * `src/pages/admin/**` (donde hoy conviven dos libros de ítems y aún no está
 * decidido cuál sobrevive; rediseñar uno de los dos sería trabajo tirado).
 * Todo lo que se ve aquí son constantes de este archivo, y el aviso de arriba
 * está para que nadie confunda el dibujo con la herramienta.
 *
 * Por qué maqueta y no reskin: DS3 no tiene primitiva de tabla. Hacerla —
 * cabecera pegajosa, selección, orden, densidad, accesibilidad de rejilla — es
 * un proyecto con su propio presupuesto. Antes de gastarlo conviene mirar el
 * destino dibujado y decidir si es el correcto.
 *
 * La contención que define la pantalla: el selector de fila no se ve en
 * reposo. Un libro de inventario en calma no enseña ocho casillas vacías; la
 * casilla aparece cuando la fila se toca, se enfoca o ya está elegida. Se hace
 * SÓLO con opacidad — `display: none` rompería el recorrido de teclado y un
 * cambio de ancho re-maquetaría la tabla entera con cada pasada del ratón.
 */
import { useMemo, useState } from 'react';
import { Box, Typography } from '@mui/material';
import { SearchX } from 'lucide-react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import TiendaShell from './TiendaShell';
import { TIENDA_HEADER_HEIGHT } from './components/TiendaHeader';
import { useMenuPlacement } from './useTienda';
import {
  Badge,
  Button,
  EmptyState,
  SegmentedControl,
  TextField,
  ds3Shell,
  qeType,
  touchTargets,
  type BadgeTone,
} from '../../design-system';
import { useReducedMotion } from '../../hooks/useReducedMotion';
import { formatPriceCOP } from '../../utils/priceFormatters';

/**
 * Los rótulos viven aquí, en local, y NO en `t.tienda.*`.
 *
 * Es la única excepción a la regla de i18n en toda la tienda, y es deliberada:
 * estas etiquetas son de trastienda, existen para juzgar un diseño y podrían
 * no sobrevivir a la semana. Sembrarlas en los seis archivos de idioma dejaría
 * seis deudas de traducción por una pantalla que aún no es un compromiso. El
 * día que la administración se construya de verdad, sus cadenas nacen en
 * `es.ts` como todas las demás.
 */
const COPY = {
  aviso: 'Maqueta',
  avisoDetalle:
    'Pantalla de estudio. Los datos son inventados y ninguna acción escribe nada.',
  titulo: 'Inventario',
  migaTienda: 'Tienda',
  migaSeccion: 'Administración',
  migaActual: 'Inventario',
  conteo: '{n} piezas',
  conteoUna: '1 pieza',
  buscar: 'Buscar por pieza o número',
  ambitoEtiqueta: 'Ámbito del listado',
  ambitoTodas: 'Todas',
  ambitoDisponibles: 'Disponibles',
  ambitoVendidas: 'Vendidas',
  colSeleccion: 'Selección',
  colNumero: 'Nº',
  colPieza: 'Pieza',
  colMontura: 'Montura',
  colEstado: 'Estado',
  colGramaje: 'Gramaje',
  colPrecio: 'Precio',
  estadoDisponible: 'Disponible',
  estadoReservada: 'Reservada',
  estadoVendida: 'Vendida',
  elegirTodas: 'Elegir todas las piezas del listado',
  elegirFila: 'Elegir {pieza}',
  elegidas: '{n} elegidas',
  elegidasUna: '1 elegida',
  accionEstado: 'Cambiar estado',
  accionPrecio: 'Ajustar precio',
  accionExportar: 'Exportar',
  vaciar: 'Vaciar',
  vacioTitulo: 'Sin coincidencias',
  vacioDetalle: 'Ninguna de las piezas inventadas responde a esa búsqueda.',
} as const;

type EstadoInventario = 'disponible' | 'reservada' | 'vendida';
type AmbitoListado = 'todas' | 'disponibles' | 'vendidas';

interface FilaInventario {
  id: string;
  numero: number;
  pieza: string;
  montura: string;
  estado: EstadoInventario;
  gramos: number;
  precioCOP: number;
}

/** Inventario inventado. Ocho filas: suficientes para que la tabla tenga peso
 *  visual, pocas para que ninguna se lea como un dato real de la casa. */
const FILAS: FilaInventario[] = [
  {
    id: 'f-541',
    numero: 541,
    pieza: 'Anillo Vértice',
    montura: 'Oro amarillo 18k',
    estado: 'disponible',
    gramos: 4.82,
    precioCOP: 3450000,
  },
  {
    id: 'f-538',
    numero: 538,
    pieza: 'Aretes Vaupés',
    montura: 'Oro blanco 18k',
    estado: 'disponible',
    gramos: 3.14,
    precioCOP: 2180000,
  },
  {
    id: 'f-534',
    numero: 534,
    pieza: 'Colgante Fósil',
    montura: 'Plata 950',
    estado: 'reservada',
    gramos: 6.05,
    precioCOP: 1290000,
  },
  {
    id: 'f-529',
    numero: 529,
    pieza: 'Anillo Muzo',
    montura: 'Oro amarillo 18k',
    estado: 'vendida',
    gramos: 5.47,
    precioCOP: 7900000,
  },
  {
    id: 'f-522',
    numero: 522,
    pieza: 'Brazalete Río',
    montura: 'Oro rosa 18k',
    estado: 'disponible',
    gramos: 12.36,
    precioCOP: 5600000,
  },
  {
    id: 'f-517',
    numero: 517,
    pieza: 'Anillo Sello',
    montura: 'Oro blanco 18k',
    estado: 'reservada',
    gramos: 8.91,
    precioCOP: 4275000,
  },
  {
    id: 'f-509',
    numero: 509,
    pieza: 'Colgante Gota',
    montura: 'Plata 950',
    estado: 'vendida',
    gramos: 2.73,
    precioCOP: 980000,
  },
  {
    id: 'f-503',
    numero: 503,
    pieza: 'Aretes Cordillera',
    montura: 'Oro amarillo 18k',
    estado: 'disponible',
    gramos: 4.08,
    precioCOP: 3120000,
  },
];

const ESTADO_ETIQUETA: Record<EstadoInventario, string> = {
  disponible: COPY.estadoDisponible,
  reservada: COPY.estadoReservada,
  vendida: COPY.estadoVendida,
};

/** El tono no es decoración: disponible es el acento de la casa, reservada
 *  avisa (hay un compromiso encima) y vendida se apaga a neutro. */
const ESTADO_TONO: Record<EstadoInventario, BadgeTone> = {
  disponible: 'accent',
  reservada: 'warn',
  vendida: 'neutral',
};

/** Tinta de la casilla. El área táctil son los 44px del contrato; esto es lo
 *  único que se pinta. */
const CASILLA_PX = 16;
/**
 * El relleno de una celda del libro. El selector lo reutiliza como margen
 * negativo, así que vive en constantes y no en literales sueltos que puedan
 * separarse con el tiempo.
 *
 * Van separados el eje X del Y, y no por gusto de simetría rota:
 *
 * - El horizontal se queda en 12 porque de él cuelgan los dos umbrales medidos
 *   más abajo (`LIBRO_CABE_PX`, `LIBRO_APRETADO_PX`): esos 409px de mínimo de
 *   tabla son cinco columnas con 24px de relleno cada una. Tocarlo obligaría a
 *   volver a medir en Chrome, y un umbral recalculado a ojo es exactamente el
 *   dato inventado con forma de dato que esta pantalla existe para no enseñar.
 *
 * - El vertical sube a 15 por el segundo número del contrato, el que se olvida:
 *   los objetivos táctiles piden 44x44 **y 8px de separación entre vecinos**.
 *   La celda más alta de la fila es la insignia de estado (22px exactos), así
 *   que con 12 de relleno la fila medía 46 y los selectores de dos filas
 *   contiguas —44 de alto cada uno— quedaban a 2px. Con 15 la fila mide 52 y la
 *   separación es 8 justos. De paso 52 es la altura de fila estándar de una
 *   tabla de datos, así que la densidad que enseña la maqueta sigue siendo una
 *   densidad que alguien querría copiar.
 */
const CELDA_RELLENO_X_PX = 12;
const CELDA_RELLENO_Y_PX = 15;

/**
 * A partir de qué ancho de ventana cabe el libro. Medido, no supuesto (Chrome,
 * 2026-09-10, midiendo `scrollWidth` de la tabla contra el ancho interior de
 * la tarjeta): sin Montura ni Gramaje, el mínimo de contenido de la tabla son
 * 409px — 52 del selector, 68 del número, 63 del nombre, 120 del estado y 106
 * del precio. La tarjeta mide el ancho de la ventana menos 34 (16+16 de calle
 * y 1+1 de borde), así que de 443px hacia abajo la tabla se sale y
 * `overflow: clip` recorta la ÚLTIMA columna sin avisar: 13px a 430, 53px a
 * 390, 83px a 360. Y la última columna es el precio.
 *
 * Un precio recortado no se lee como un dato ausente: se lee como otro precio.
 * «$3.45» donde dice «$3.450.000» es el peor defecto que puede tener la
 * columna que decide, y no se veía en la auditoría porque Chrome no baja de
 * 500px —donde la tabla cabe por 2px— mientras que un teléfono real mide 360,
 * 390 o 430.
 *
 * El remedio sigue la doctrina de la pantalla (antes menos columnas que un
 * desplazamiento horizontal): por debajo del umbral se retira el Nº, que
 * identifica pero no decide, y el libro vuelve a caber en 341px.
 */
const LIBRO_CABE_PX = 443;
const LIBRO_ESTRECHO = `@media (max-width: ${LIBRO_CABE_PX - 1}px)`;

/**
 * Y por debajo de 375px ni siquiera eso alcanza: quedan 341px de tabla dentro
 * de 326px de tarjeta. Ahí —y sólo ahí— la tarjeta se deja desplazar a lo
 * ancho y la cabecera renuncia a pegarse, porque un contenedor que desplaza en
 * un eje lo es en los dos a efectos de `sticky`. Es la única ventana donde el
 * intercambio se paga solo: una cabecera fija sobre ocho filas vale mucho
 * menos que el precio completo.
 */
const LIBRO_APRETADO_PX = 375;
const LIBRO_MINIMO = `@media (max-width: ${LIBRO_APRETADO_PX - 1}px)`;

/**
 * El selector de fila: 44x44 de área táctil, 16x16 de tinta.
 *
 * El objetivo ES el `<input>`. Se estira a los 44px del contrato, se apaga con
 * `appearance: none` y queda transparente por encima de la casilla dibujada:
 * lo que mide un dedo —y lo que mide una auditoría con `getBoundingClientRect`
 * sobre los controles de la página— es el control mismo, no un envoltorio que
 * resulta que también recibe el clic. Medido de la otra forma, el `<input>`
 * declaraba 16x16 y la promesa de los 44 vivía sólo en el `<label>`.
 *
 * El margen negativo es exactamente el relleno de la celda —por eje, que ya no
 * son el mismo número—: el área táctil la llena de borde a borde y ni un píxel
 * más, así que la tarjeta con `overflow: clip` no le recorta una esquina a la
 * primera fila ni a la última —y un área recortada es un área que no existe—.
 * Al flujo aporta 14px de alto (44 menos los 30 que devuelve el margen), menos
 * de lo que ya miden la insignia y el nombre de la pieza: la fila mide lo mismo
 * con selector que sin él y no se mueve cuando aparece.
 */
const selectorSx = {
  position: 'relative' as const,
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  width: touchTargets.minimum,
  height: touchTargets.minimum,
  margin: `-${CELDA_RELLENO_Y_PX}px -${CELDA_RELLENO_X_PX}px`,
  cursor: 'pointer',
  // La tinta obedece al input hermano por CSS: ni un estado más en React, ni
  // un re-render por pasada del ratón. `:checked` y `:focus-visible` ya saben
  // todo lo que hay que saber.
  '& input:checked + span': {
    backgroundColor: 'var(--tm-accent)',
    borderColor: 'var(--tm-accent)',
  },
  '& input:checked + span::after': { opacity: 1 },
  '& input:focus-visible + span': { boxShadow: 'var(--tm-focus-ring)' },
};

/** El input: todo el área, nada de tinta. */
const entradaSx = {
  position: 'absolute' as const,
  inset: 0,
  width: '100%',
  height: '100%',
  margin: 0,
  padding: 0,
  appearance: 'none',
  WebkitAppearance: 'none',
  border: 'none',
  backgroundColor: 'transparent',
  cursor: 'pointer',
  // El anillo de foco no se pierde: lo pinta la casilla dibujada, 14px más
  // adentro, donde el ojo lo busca.
  '&:focus-visible': { outline: 'none' },
};

/**
 * La casilla pintada. Sin transición a propósito: un cambio de color
 * instantáneo no necesita el permiso de `prefers-reduced-motion` y aquí no hay
 * nada que escalonar; la única animación de la pantalla es la aparición del
 * selector, que ya pasa por esa puerta.
 */
const casillaSx = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  flex: '0 0 auto',
  width: CASILLA_PX,
  height: CASILLA_PX,
  borderRadius: 'var(--tm-radius-well)',
  // `--tm-muted` y no `--tm-border`: el borde de un control es su única
  // afordancia y necesita 3:1 contra la superficie (WCAG 1.4.11). El borde de
  // tarjeta, a 1,35:1 sobre blanco, deja una casilla que no se ve.
  border: '1px solid var(--tm-muted)',
  backgroundColor: 'var(--tm-surface)',
  // La marca de verificación, dibujada con dos bordes girados: no hay icono
  // que cargar ni SVG que colorear a mano.
  '&::after': {
    content: '""',
    width: 4,
    height: 7,
    marginBlockStart: '-2px',
    borderInlineEnd: '2px solid var(--tm-on-accent)',
    borderBlockEnd: '2px solid var(--tm-on-accent)',
    transform: 'rotate(45deg)',
    opacity: 0,
  },
};

/** Sólo para lectores de pantalla: se saca del flujo sin `display: none`, que
 *  lo borraría también del árbol de accesibilidad. */
const soloLectorSx = {
  position: 'absolute' as const,
  width: 1,
  height: 1,
  padding: 0,
  margin: -1,
  overflow: 'hidden',
  clip: 'rect(0 0 0 0)',
  whiteSpace: 'nowrap' as const,
  border: 0,
};

/**
 * Los botones de la barra en lote.
 *
 * `size="sm"` da 32px de alto — el token compartido `componentHeights.button`
 * define sm:32 / md:40 / lg:48 y sólo `lg` cumple el contrato, pero ese token y
 * el componente `Button` los comparte toda la app: no se tocan desde aquí.
 * El arreglo local es el alto real, no una cápsula invisible: lo que mide un
 * dedo y lo que mide `getBoundingClientRect` sobre el `<button>` tienen que ser
 * el mismo número, que es la misma razón por la que el selector de fila estira
 * su `<input>` en vez de envolverlo. Se queda la tipografía de `sm` (13px) y el
 * relleno lateral de `sm`, así que la barra no se ensancha ni cambia de ritmo
 * —medidos, los cuatro botones siguen cayendo en una línea de 500px en
 * adelante—; sólo crece a lo alto, y de eso ya se ocupa el hueco del final.
 *
 * Los tres apagados lo llevan igual que el vivo. Un botón deshabilitado no es
 * un objetivo táctil y podría quedarse en 32, pero entonces la barra tendría
 * dos alturas de botón y la maqueta enseñaría un ritmo que nadie querría
 * copiar: la altura es composición, no sólo accesibilidad.
 */
const ACCION_SX = { height: touchTargets.minimum };

/** Coma decimal: la casa pesa en gramos y escribe en español. */
function formatGramos(gramos: number): string {
  return `${gramos.toFixed(2).replace('.', ',')} g`;
}

export default function AdminMockupPage() {
  const [placement] = useMenuPlacement();
  const prefersReducedMotion = useReducedMotion();

  const [ambito, setAmbito] = useState<AmbitoListado>('todas');
  const [busqueda, setBusqueda] = useState('');
  const [elegidas, setElegidas] = useState<Set<string>>(() => new Set());

  const visibles = useMemo(() => {
    const aguja = busqueda.trim().toLowerCase();
    return FILAS.filter((fila) => {
      // «Todas» incluye las reservadas: el ámbito es un filtro de trabajo, no
      // la taxonomía completa del inventario, y una pieza comprometida no se
      // pierde por no tener pestaña propia.
      if (ambito === 'disponibles' && fila.estado !== 'disponible')
        return false;
      if (ambito === 'vendidas' && fila.estado !== 'vendida') return false;
      if (!aguja) return true;
      return (
        fila.pieza.toLowerCase().includes(aguja) ||
        String(fila.numero).includes(aguja)
      );
    });
  }, [ambito, busqueda]);

  const todasElegidas =
    visibles.length > 0 && visibles.every((fila) => elegidas.has(fila.id));

  const alternarFila = (id: string) => {
    setElegidas((previas) => {
      const siguiente = new Set(previas);
      if (siguiente.has(id)) siguiente.delete(id);
      else siguiente.add(id);
      return siguiente;
    });
  };

  const alternarTodas = () => {
    setElegidas((previas) => {
      const siguiente = new Set(previas);
      if (todasElegidas) visibles.forEach((fila) => siguiente.delete(fila.id));
      else visibles.forEach((fila) => siguiente.add(fila.id));
      return siguiente;
    });
  };

  const conteo =
    visibles.length === 1
      ? COPY.conteoUna
      : COPY.conteo.replace('{n}', String(visibles.length));

  const etiquetaElegidas =
    elegidas.size === 1
      ? COPY.elegidasUna
      : COPY.elegidas.replace('{n}', String(elegidas.size));

  // Celda base. El relleno vertical deja la fila en 52px —22 de la insignia,
  // que es el contenido más alto, más 15 arriba y 15 abajo— sin necesidad de
  // fijarle un alto: por encima del mínimo táctil, y con los 8px de aire que
  // el contrato pide entre el selector de una fila y el de la siguiente.
  const celdaSx = {
    ...qeType.body,
    fontSize: '0.875rem',
    color: 'var(--tm-text)',
    textAlign: 'start' as const,
    paddingInline: `${CELDA_RELLENO_X_PX}px`,
    paddingBlock: `${CELDA_RELLENO_Y_PX}px`,
    verticalAlign: 'middle' as const,
  };

  const cabeceraSx = {
    ...qeType.overline,
    color: 'var(--tm-muted)',
    textAlign: 'start' as const,
    paddingInline: '12px',
    paddingBlock: '10px',
    position: 'sticky' as const,
    // Se detiene justo debajo de la cabecera de la tienda, que ya es pegajosa.
    // El alto sale de su constante exportada, no de un número adivinado.
    top: TIENDA_HEADER_HEIGHT,
    // Un escalón sobre el contenido en flujo, y sólo uno. Con `base` (0) el
    // contenido de las filas se pintaba ENCIMA de la cabecera fija: se veía el
    // punto de la insignia «Disponible» atravesando la cabecera «Estado».
    // `stickyCell` es 1, muy por debajo de `sticky` (500), así que tampoco se
    // sube por encima de la cabecera de la tienda.
    zIndex: ds3Shell.zIndex.stickyCell,
    backgroundColor: 'var(--tm-surface)',
    // El borde va como sombra interior, no como `borderBottom`: con la tabla
    // en `separate` es lo que mantiene la línea pegada a la celda mientras
    // ésta está fija.
    boxShadow: 'inset 0 -1px 0 var(--tm-border)',
    whiteSpace: 'nowrap' as const,
    // En la ventana más estrecha la tarjeta se desplaza a lo ancho, y una
    // cabecera pegajosa dentro de un contenedor que desplaza mide su `top`
    // contra el contenedor, no contra la ventana: se descolgaría hacia dentro
    // y pintaría su fondo encima de la primera fila. Se queda quieta.
    [LIBRO_MINIMO]: { position: 'static' as const },
  };

  // Columnas que se retiran en teléfono. Se ocultan en vez de envolver la
  // tabla en un contenedor con desplazamiento horizontal: un contenedor que
  // desplaza en un eje lo es en los dos a efectos de `sticky`, y la cabecera
  // pegajosa dejaría de pegarse. Antes que perder la cabecera, se muestran
  // menos columnas.
  const soloAnchoSx = { display: { xs: 'none', md: 'table-cell' } };

  // Y la columna que se retira una talla más abajo: el número identifica la
  // pieza, pero no decide nada que el nombre no diga ya. Cede el sitio para
  // que el precio quepa entero. Ver `LIBRO_CABE_PX`.
  const soloLibroAnchoSx = { [LIBRO_ESTRECHO]: { display: 'none' } };

  return (
    // La barra flotante de selección de la tienda se apaga: abajo ya vive la
    // barra de acciones en lote, y dos barras compartiendo borde inferior es
    // exactamente lo que DS3 §5.2 prohíbe.
    <TiendaShell hideSeleccionBar>
      <Box
        role="note"
        sx={{
          display: 'flex',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '10px',
          border: '1px solid var(--tm-border)',
          borderRadius: 'var(--tm-radius-card)',
          backgroundColor: 'var(--tm-well)',
          paddingInline: '14px',
          paddingBlock: '12px',
          marginBlockEnd: { xs: '24px', sm: '28px' },
        }}
      >
        <Badge tone="warn" dot label={COPY.aviso} />
        {/* Esta es la frase que impide confundir el dibujo con la
            herramienta. Medía 11px —la letra más pequeña de la pantalla, en
            `spec`, que es rol de ficha técnica— y por tanto lo primero que el
            ojo se salta. Pasa a cuerpo de 17px: el mínimo del contrato en
            teléfono, y el tamaño que dice «esto hay que leerlo». */}
        <Typography
          sx={{
            ...qeType.body,
            fontSize: '1.0625rem',
            color: 'var(--tm-muted)',
            flex: 1,
            minWidth: '16ch',
          }}
        >
          {COPY.avisoDetalle}
        </Typography>
      </Box>

      {/* ZONA 1 — barra de trabajo: dónde estoy, cuánto hay, qué miro, qué busco. */}
      <Box sx={{ marginBlockEnd: { xs: '20px', sm: '24px' } }}>
        <Box
          component="nav"
          aria-label={COPY.migaSeccion}
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            flexWrap: 'wrap',
          }}
        >
          {/* Sólo la primera miga es enlace: es el único destino que existe de
              verdad. Una miga que no lleva a ninguna parte miente. */}
          <Box
            component={Link}
            to="/tienda"
            sx={{
              ...qeType.spec,
              // Una miga es navegación de verdad, y la línea de 11px medía
              // 38x15. La caja sube a los 44 del contrato y el margen negativo
              // devuelve al flujo lo que el relleno añadió: la palabra sigue
              // empezando donde empezaba y el rastro conserva su ritmo. No se
              // usa el mixin `hitSlop` por lo que avisa su propia
              // documentación —la cápsula absoluta se sale de la caja—; aquí
              // los vecinos son texto muerto, pero la casa ya resolvió esto
              // con caja real en el pie de la tienda.
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              minWidth: touchTargets.minimum,
              minHeight: touchTargets.minimum,
              paddingInline: '10px',
              marginInline: '-10px',
              marginBlock: '-10px',
              color: 'var(--tm-muted)',
              textDecoration: 'none',
              transition: 'color var(--tm-fast) var(--tm-ease)',
              '&:hover': { color: 'var(--tm-accent)' },
              '&:focus-visible': {
                outline: 'none',
                boxShadow: 'var(--tm-focus-ring)',
                borderRadius: 'var(--tm-radius-well)',
              },
            }}
          >
            {COPY.migaTienda}
          </Box>
          <Typography
            aria-hidden="true"
            sx={{ ...qeType.spec, color: 'var(--tm-subtle)' }}
          >
            /
          </Typography>
          <Typography sx={{ ...qeType.spec, color: 'var(--tm-muted)' }}>
            {COPY.migaSeccion}
          </Typography>
          <Typography
            aria-hidden="true"
            sx={{ ...qeType.spec, color: 'var(--tm-subtle)' }}
          >
            /
          </Typography>
          <Typography sx={{ ...qeType.spec, color: 'var(--tm-text)' }}>
            {COPY.migaActual}
          </Typography>
        </Box>

        <Box
          sx={{
            display: 'flex',
            alignItems: 'baseline',
            gap: '12px',
            flexWrap: 'wrap',
            marginBlockStart: '10px',
          }}
        >
          <Typography
            component="h1"
            sx={{
              ...qeType.display,
              // `display` no trae fontSize a propósito: clamp() en el sitio de uso.
              fontSize: 'clamp(1.75rem, 5.5vw, 2.25rem)',
              color: 'var(--tm-text)',
            }}
          >
            {COPY.titulo}
          </Typography>
          <Typography
            role="status"
            sx={{ ...qeType.spec, color: 'var(--tm-muted)' }}
          >
            {conteo}
          </Typography>
        </Box>

        <Box
          sx={{
            display: 'flex',
            flexDirection: { xs: 'column', sm: 'row' },
            alignItems: { xs: 'stretch', sm: 'center' },
            gap: '12px',
            marginBlockStart: '18px',
          }}
        >
          <Box sx={{ width: '100%', maxWidth: { xs: 'none', sm: 320 } }}>
            <SegmentedControl<AmbitoListado>
              options={[
                { value: 'todas', label: COPY.ambitoTodas },
                { value: 'disponibles', label: COPY.ambitoDisponibles },
                { value: 'vendidas', label: COPY.ambitoVendidas },
              ]}
              value={ambito}
              onChange={setAmbito}
              ariaLabel={COPY.ambitoEtiqueta}
              block
            />
          </Box>
          <TextField
            size="sm"
            clearable
            onClear={() => setBusqueda('')}
            value={busqueda}
            onChange={(event) => setBusqueda(event.target.value)}
            placeholder={COPY.buscar}
            inputProps={{ 'aria-label': COPY.buscar }}
            sx={{ width: '100%', maxWidth: { xs: 'none', sm: 300 } }}
          />
        </Box>
      </Box>

      {/* ZONA 2 — el libro. Tabla semántica de verdad: un lector de pantalla
          anuncia fila y columna, y eso no se consigue con divs en rejilla. */}
      {visibles.length === 0 ? (
        <EmptyState
          icon={SearchX}
          title={COPY.vacioTitulo}
          subtitle={COPY.vacioDetalle}
          action={{ label: COPY.vaciar, onClick: () => setBusqueda('') }}
        />
      ) : (
        <Box
          sx={{
            border: '1px solid var(--tm-border)',
            borderRadius: 'var(--tm-radius-card)',
            backgroundColor: 'var(--tm-surface)',
            // `clip`, NO `hidden`, y la diferencia se mide en 60px.
            //
            // `overflow: hidden` convierte a la tarjeta en contenedor de
            // desplazamiento, y una cabecera `sticky` se pega al contenedor de
            // desplazamiento MÁS CERCANO, no a la ventana. Con `top: 60px`
            // medido contra la propia tarjeta, la cabecera se descolgaba 60px
            // hacia dentro y pintaba su fondo blanco encima de la primera fila
            // del libro: medido en Chrome a 500px, `th` en y=459 sobre una
            // fila que vive en y=443–491. La primera pieza del inventario
            // estaba tapada, siempre, en todas las ventanas.
            //
            // `overflow: clip` recorta igual —las esquinas de la tabla siguen
            // obedeciendo al radio de la tarjeta— pero NO crea contenedor de
            // desplazamiento, así que la cabecera vuelve a medir su `top`
            // contra la ventana y se queda donde debe. Verificado: `th` pasa
            // de y=459,3 a y=399,3, justo encima del `tbody` (y=443,3).
            // En un Safari anterior al 16 `clip` no existe y degrada a
            // `visible`: se pierde el recorte de las esquinas, no la tabla.
            overflow: 'clip',
            // Red de seguridad, no norma: por debajo de 375px el libro no cabe
            // ni retirando el Nº (341px de tabla en 326px de tarjeta), y entre
            // recortar el precio en silencio y dejar arrastrar la tabla 15px,
            // se arrastra. La cabecera deja de pegarse aquí — ver `cabeceraSx`.
            [LIBRO_MINIMO]: { overflowX: 'auto' },
          }}
        >
          <Box
            component="table"
            sx={{
              width: '100%',
              // `separate`, NO `collapse`. Con `collapse` los bordes
              // pertenecen a la TABLA y no a la celda, así que una cabecera
              // `position: sticky` deja pasar el contenido que se desliza por
              // debajo: se veía el punto de la insignia «Disponible» de la
              // primera fila atravesando la cabecera «Estado». Con `separate`
              // + `border-spacing: 0` la celda pinta su propio fondo y el
              // borde inferior viaja con ella como sombra interior.
              borderCollapse: 'separate',
              borderSpacing: 0,
              tableLayout: 'auto',
            }}
          >
            <Box
              component="thead"
              sx={{
                // La casilla de «todas» sigue la misma ley que las de fila:
                // callada en reposo, presente en cuanto la cabecera se toca,
                // se enfoca, o ya hay algo elegido.
                '& .maqueta-selector': {
                  opacity: elegidas.size > 0 ? 1 : 0,
                  transition: prefersReducedMotion
                    ? 'none'
                    : 'opacity var(--tm-fast) var(--tm-ease)',
                },
                '&:hover .maqueta-selector, &:focus-within .maqueta-selector': {
                  opacity: 1,
                },
              }}
            >
              <Box component="tr">
                <Box
                  component="th"
                  scope="col"
                  sx={{
                    ...cabeceraSx,
                    width: 52,
                    // Los 44px del selector caben entre estos dos rellenos con
                    // el mismo aire que en las filas. Con los 10px del resto de
                    // cabeceras, la tarjeta le recortaría por arriba.
                    paddingBlock: `${CELDA_RELLENO_Y_PX}px`,
                  }}
                >
                  {/* La columna tiene nombre aunque no se pinte: sin él, un
                      lector de pantalla anuncia una columna sin título. */}
                  <Box component="span" sx={soloLectorSx}>
                    {COPY.colSeleccion}
                  </Box>
                  <Box
                    component="label"
                    className="maqueta-selector"
                    sx={selectorSx}
                  >
                    <Box
                      component="input"
                      type="checkbox"
                      checked={todasElegidas}
                      onChange={alternarTodas}
                      aria-label={COPY.elegirTodas}
                      sx={entradaSx}
                    />
                    <Box component="span" aria-hidden="true" sx={casillaSx} />
                  </Box>
                </Box>
                <Box
                  component="th"
                  scope="col"
                  sx={{ ...cabeceraSx, width: 68, ...soloLibroAnchoSx }}
                >
                  {COPY.colNumero}
                </Box>
                <Box component="th" scope="col" sx={cabeceraSx}>
                  {COPY.colPieza}
                </Box>
                <Box
                  component="th"
                  scope="col"
                  sx={{ ...cabeceraSx, ...soloAnchoSx }}
                >
                  {COPY.colMontura}
                </Box>
                <Box component="th" scope="col" sx={cabeceraSx}>
                  {COPY.colEstado}
                </Box>
                <Box
                  component="th"
                  scope="col"
                  sx={{ ...cabeceraSx, ...soloAnchoSx, textAlign: 'end' }}
                >
                  {COPY.colGramaje}
                </Box>
                <Box
                  component="th"
                  scope="col"
                  sx={{ ...cabeceraSx, textAlign: 'end' }}
                >
                  {COPY.colPrecio}
                </Box>
              </Box>
            </Box>

            <Box component="tbody">
              {visibles.map((fila) => {
                const elegida = elegidas.has(fila.id);
                return (
                  <Box
                    component="tr"
                    key={fila.id}
                    sx={{
                      backgroundColor: elegida
                        ? 'var(--tm-accent-wash)'
                        : 'transparent',
                      transition: prefersReducedMotion
                        ? 'none'
                        : 'background-color var(--tm-fast) var(--tm-ease)',
                      '& > *': { borderTop: '1px solid var(--tm-hairline)' },
                      '&:hover': {
                        backgroundColor: elegida
                          ? 'var(--tm-accent-wash-strong)'
                          : 'var(--tm-well)',
                      },
                      // La contención de la pantalla, en tres reglas.
                      '& .maqueta-selector': {
                        opacity: elegida ? 1 : 0,
                        transition: prefersReducedMotion
                          ? 'none'
                          : 'opacity var(--tm-fast) var(--tm-ease)',
                      },
                      '&:hover .maqueta-selector, &:focus-within .maqueta-selector':
                        { opacity: 1 },
                    }}
                  >
                    <Box component="td" sx={celdaSx}>
                      <Box
                        component="label"
                        className="maqueta-selector"
                        sx={selectorSx}
                      >
                        <Box
                          component="input"
                          type="checkbox"
                          checked={elegida}
                          onChange={() => alternarFila(fila.id)}
                          aria-label={COPY.elegirFila.replace(
                            '{pieza}',
                            fila.pieza,
                          )}
                          sx={entradaSx}
                        />
                        <Box
                          component="span"
                          aria-hidden="true"
                          sx={casillaSx}
                        />
                      </Box>
                    </Box>
                    <Box
                      component="td"
                      sx={{
                        ...celdaSx,
                        ...qeType.data,
                        fontSize: '0.8125rem',
                        color: 'var(--tm-muted)',
                        ...soloLibroAnchoSx,
                      }}
                    >
                      {fila.numero}
                    </Box>
                    <Box
                      component="td"
                      sx={{ ...celdaSx, ...qeType.title, fontSize: '1rem' }}
                    >
                      {fila.pieza}
                    </Box>
                    <Box
                      component="td"
                      sx={{
                        ...celdaSx,
                        ...soloAnchoSx,
                        color: 'var(--tm-muted)',
                      }}
                    >
                      {fila.montura}
                    </Box>
                    <Box component="td" sx={celdaSx}>
                      <Badge
                        tone={ESTADO_TONO[fila.estado]}
                        dot
                        label={ESTADO_ETIQUETA[fila.estado]}
                      />
                    </Box>
                    <Box
                      component="td"
                      sx={{
                        ...celdaSx,
                        ...soloAnchoSx,
                        ...qeType.data,
                        fontSize: '0.8125rem',
                        color: 'var(--tm-muted)',
                        textAlign: 'end',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {formatGramos(fila.gramos)}
                    </Box>
                    <Box
                      component="td"
                      sx={{
                        ...celdaSx,
                        // Toda cifra en `data`, que es tabular: sin eso las
                        // columnas bailan un píxel por fila al filtrar.
                        ...qeType.data,
                        fontSize: '0.875rem',
                        textAlign: 'end',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      ${formatPriceCOP(fila.precioCOP)}
                    </Box>
                  </Box>
                );
              })}
            </Box>
          </Box>
        </Box>
      )}

      {/* Hueco para que la barra en lote nunca tape la última fila.
          Medido (Chrome, 2026-09-10, con una fila elegida), no adivinado: con
          los botones a 44px la barra ocupa 90px desde el borde inferior
          mientras los cuatro caben en una línea (500px en adelante), y 144px
          en cuanto envuelven a dos, que es lo que pasa en cualquier teléfono
          de verdad — 120px de barra a 360, 390 y 430px de ancho. El hueco
          copia esos dos números para que el libro se despeje solo: con 96 fijo
          los 144 del teléfono los tenía que poner el relleno del armazón, y un
          despeje que depende de otro archivo es un despeje que se pierde el
          día que ese archivo cambie. */}
      <Box aria-hidden="true" sx={{ height: { xs: 152, sm: 96 } }} />

      {/* ZONA 3 — acciones en lote. Aparece con opacidad y 12px de
          desplazamiento; nada de alto animado, que re-maquetaría la tabla. */}
      {elegidas.size > 0 && (
        <Box
          component={motion.div}
          initial={prefersReducedMotion ? false : { opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.24 }}
          sx={{
            position: 'fixed',
            insetInline: 0,
            bottom:
              placement === 'bottom'
                ? ds3Shell.scroll.bottomBarClearance(ds3Shell.tabBarReserve)
                : 'env(safe-area-inset-bottom, 0px)',
            zIndex: ds3Shell.zIndex.panel,
            display: 'flex',
            justifyContent: 'center',
            paddingInline: '16px',
            paddingBlock: '12px',
            pointerEvents: 'none',
          }}
        >
          <Box
            role="status"
            sx={{
              pointerEvents: 'auto',
              width: '100%',
              maxWidth: 680,
              display: 'flex',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '10px',
              paddingInline: '14px',
              paddingBlock: '10px',
              borderRadius: 'var(--tm-radius-card)',
              border: '1px solid var(--tm-border)',
              backgroundColor: 'var(--tm-surface)',
              // Capa que flota de verdad: aquí la sombra sí está permitida.
              boxShadow: 'var(--tm-shadow)',
            }}
          >
            <Typography
              sx={{
                ...qeType.spec,
                color: 'var(--tm-text)',
                flex: 1,
                minWidth: 0,
              }}
            >
              {etiquetaElegidas}
            </Typography>

            {/* Deshabilitadas a propósito: es una maqueta, y un botón que
                parece vivo y no hace nada es peor que uno apagado. */}
            <Button variant="tinted" size="sm" disabled sx={ACCION_SX}>
              {COPY.accionEstado}
            </Button>
            <Button variant="tinted" size="sm" disabled sx={ACCION_SX}>
              {COPY.accionPrecio}
            </Button>
            <Button variant="tinted" size="sm" disabled sx={ACCION_SX}>
              {COPY.accionExportar}
            </Button>
            {/* La única acción viva: la salida. Quedarse encerrado en una
                selección sería el defecto más caro de la maqueta — y por eso
                es el botón que más falta hacía que midiera los 44. */}
            <Button
              variant="plain"
              size="sm"
              onClick={() => setElegidas(new Set())}
              sx={ACCION_SX}
            >
              {COPY.vaciar}
            </Button>
          </Box>
        </Box>
      )}
    </TiendaShell>
  );
}
