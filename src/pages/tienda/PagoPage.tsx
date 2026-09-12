/**
 * `/tienda/pago` — el pago SIMULADO.
 *
 * Aquí no se cobra nada, y la página lo dice en voz alta en vez de dejarlo en
 * una nota al pie: quien llega hasta el botón de pagar merece saber, antes de
 * escribir su celular, que del otro lado no hay pasarela. La simulación existe
 * para poder mirar el recorrido completo y decidir sobre él.
 *
 * El desenlace se elige a mano porque un flujo de pago sólo se juzga por sus
 * ramas, y las tres del esquema real (`convex/_lib/applyPayment.ts`) son
 * `reservada · confirmada · cancelada`. APPROVED/DECLINED/VOIDED son
 * vocabulario del proveedor y se normalizan antes de llegar a React, así que
 * ofrecerlos aquí enseñaría un modelo que la aplicación no tiene.
 *
 * La selección se lee de `?p=` y, si no viene, del store de la tienda. Ese
 * orden es el que hace que el enlace de una pieza suelta («Comprar ahora» en
 * la ficha) no arrastre lo que hubiera guardado en la sesión.
 */
import React, { useEffect, useId, useMemo, useRef, useState } from 'react';
import { Box, Typography } from '@mui/material';
import { ArrowLeft, Check, ShoppingBag } from 'lucide-react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import TiendaShell from './TiendaShell';
import { useSeleccion } from './useTienda';
import { useLanguage } from '../../contexts/LanguageContext';
import {
  Badge,
  Button,
  EmptyState,
  Field,
  SegmentedControl,
  TextField,
  qeType,
} from '../../design-system';
import { formatPriceCOP } from '../../utils/priceFormatters';
import {
  parseSeleccionParam,
  resolverSeleccion,
  totalCOP,
} from '../../utils/tiendaSeleccion';

/** Los TRES estados del esquema real. No hay un cuarto. */
type Desenlace = 'confirmada' | 'cancelada' | 'reservada';

/** Los campos que la casa necesita para poder entregar. El resto es cortesía. */
type CampoObligatorio = 'nombre' | 'celular' | 'direccion';

interface Formulario {
  nombre: string;
  celular: string;
  email: string;
  documento: string;
  direccion: string;
  ciudad: string;
}

const FORMULARIO_VACIO: Formulario = {
  nombre: '',
  celular: '',
  email: '',
  documento: '',
  direccion: '',
  ciudad: '',
};

/** El número del pedido de mentira. Uno fijo: la simulación no lleva libro. */
const PEDIDO_SIMULADO = 'SIM-0001';

/** Espera artificial antes de redirigir. Sin ella el estado «enviando» nunca
 *  llega a pintarse, y justo ese fotograma es el que hay que poder mirar. */
const ESPERA_SIMULADA_MS = 900;

/**
 * El piso de lectura del contrato: 17px en móvil, «nunca más chico». Baja a
 * 15px sólo desde `md`, donde la columna es más ancha y la distancia de lectura
 * mayor. Todo lo que el comprador TIENE que leer —la advertencia de simulación,
 * la frase del consentimiento, los dos enlaces legales, el error de validación,
 * las etiquetas del selector de desenlace— usa esta escala, no la de las notas
 * al pie. En esta pantalla se entregan datos personales y se da un
 * consentimiento legal: aquí no hay letra chica por diseño.
 */
const CUERPO_LEGIBLE = { xs: '1.0625rem', md: '0.9375rem' };

/** El objetivo táctil mínimo del contrato. */
const TOQUE_MINIMO = 44;

export default function PagoPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { t } = useLanguage();
  const { seleccion } = useSeleccion();
  const consentId = useId();
  const consentErrorId = `${consentId}-error`;

  const [form, setForm] = useState<Formulario>(FORMULARIO_VACIO);
  const [errores, setErrores] = useState<
    Partial<Record<CampoObligatorio, boolean>>
  >({});
  const [consentimiento, setConsentimiento] = useState(false);
  const [faltaConsentimiento, setFaltaConsentimiento] = useState(false);
  const [desenlace, setDesenlace] = useState<Desenlace>('confirmada');
  const [enviando, setEnviando] = useState(false);
  // NUNCA se limpia. Limpiar la bandera en un `finally` reactiva el botón
  // durante los fotogramas que la pestaña sigue viva mientras el router
  // navega, y un segundo toque manda un SEGUNDO pedido. Ya pasó.
  const [redirigiendo, setRedirigiendo] = useState(false);
  const temporizador = useRef<number | null>(null);

  // Si alguien se va por el menú durante la espera, el temporizador pendiente
  // lo traería de vuelta a la fuerza a una pantalla que ya no pidió.
  useEffect(
    () => () => {
      if (temporizador.current !== null)
        window.clearTimeout(temporizador.current);
    },
    [],
  );

  const piezas = useMemo(() => {
    const desdeUrl = parseSeleccionParam(searchParams.get('p'));
    return desdeUrl.length > 0 ? desdeUrl : seleccion;
  }, [searchParams, seleccion]);

  const filas = useMemo(() => resolverSeleccion(piezas), [piezas]);
  const total = useMemo(() => totalCOP(piezas), [piezas]);

  if (filas.length === 0) {
    return (
      <TiendaShell hideSeleccionBar>
        <EmptyState
          icon={ShoppingBag}
          title={t.tienda.seleccion.emptyTitle}
          subtitle={t.tienda.seleccion.emptyBody}
          action={{
            label: t.tienda.seleccion.emptyCta,
            onClick: () => navigate('/tienda'),
          }}
        />
      </TiendaShell>
    );
  }

  const bloqueado = enviando || redirigiendo;

  const editar = (campo: keyof Formulario) => (valor: string) => {
    setForm((antes) => ({ ...antes, [campo]: valor }));
    if (campo === 'nombre' || campo === 'celular' || campo === 'direccion') {
      // El error se retira al escribir, no al enviar de nuevo: reprocharle al
      // visitante un campo que ya está corrigiendo es ruido.
      setErrores((antes) => ({ ...antes, [campo]: false }));
    }
  };

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (bloqueado) return;

    const faltantes: Partial<Record<CampoObligatorio, boolean>> = {
      nombre: form.nombre.trim() === '',
      celular: form.celular.trim() === '',
      direccion: form.direccion.trim() === '',
    };
    const hayFaltantes = Object.values(faltantes).some(Boolean);
    setErrores(faltantes);
    setFaltaConsentimiento(!consentimiento);
    if (hayFaltantes || !consentimiento) return;

    setEnviando(true);
    temporizador.current = window.setTimeout(() => {
      setRedirigiendo(true);
      navigate(`/tienda/pedido/${PEDIDO_SIMULADO}?estado=${desenlace}`);
    }, ESPERA_SIMULADA_MS);
  };

  const errorRequerido = t.tienda.pago.consentRequired;

  /** Cada segmento se apoya en una caja alta para que el objetivo táctil
   *  llegue a 44px aunque la etiqueta quepa en una sola línea, y sube el
   *  tamaño heredado del control (11.5px) a la escala legible: estas tres
   *  etiquetas deciden qué pantalla ve el comprador a continuación, así que son
   *  etiquetas interactivas, no metadatos. El precio de la decisión es que en
   *  500px «El pago no se completó» ocupa dos o tres renglones y el control
   *  crece a lo alto; se prefiere un control alto y legible a uno compacto que
   *  no se puede leer. */
  const segmento = (texto: string) => (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        textAlign: 'center',
        minHeight: TOQUE_MINIMO,
        fontSize: CUERPO_LEGIBLE,
        lineHeight: 1.25,
      }}
    >
      {texto}
    </Box>
  );

  return (
    <TiendaShell hideSeleccionBar>
      <Typography
        component="h1"
        sx={{
          ...qeType.display,
          fontSize: 'clamp(1.75rem, 5.5vw, 2.25rem)',
          color: 'var(--tm-text)',
        }}
      >
        {t.tienda.pago.resumenTitle}
      </Typography>

      <Box
        sx={{
          display: 'flex',
          alignItems: 'flex-start',
          gap: '12px',
          flexWrap: 'wrap',
          marginBlockStart: '14px',
        }}
      >
        <Badge tone="warn" label={t.tienda.pago.simulated} />
        {/* La advertencia de que no hay pasarela NO es un metadato: es lo que
            el visitante necesita saber antes de escribir su celular. Va en la
            escala legible, no en la de las notas al pie. */}
        <Typography
          sx={{
            ...qeType.body,
            fontSize: CUERPO_LEGIBLE,
            color: 'var(--tm-muted)',
            flex: 1,
            minWidth: '18ch',
            maxWidth: '60ch',
          }}
        >
          {t.tienda.pago.simulatedBody}
        </Typography>
      </Box>

      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: {
            xs: '1fr',
            md: 'minmax(0, 5fr) minmax(0, 7fr)',
          },
          gap: { xs: '28px', md: '40px' },
          alignItems: 'start',
          marginBlockStart: { xs: '24px', md: '32px' },
        }}
      >
        {/* ---------------------------------------------------- el pedido */}
        <Box component="section" aria-labelledby="tm-pago-piezas">
          <Typography
            component="h2"
            id="tm-pago-piezas"
            sx={{ ...qeType.overline, color: 'var(--tm-muted)' }}
          >
            {t.tienda.pago.pieces}
          </Typography>

          <Box
            sx={{
              marginBlockStart: '10px',
              border: '1px solid var(--tm-border)',
              borderRadius: 'var(--tm-radius-card)',
              overflow: 'hidden',
            }}
          >
            {filas.map(({ item, producto, variante }) => {
              const copy = t.tienda.productos[producto.slug];
              const montura = item.metal ? t.tienda.metales[item.metal] : null;
              return (
                <Box
                  key={item.metal ? `${item.slug}:${item.metal}` : item.slug}
                  sx={{
                    display: 'flex',
                    alignItems: 'baseline',
                    gap: '12px',
                    paddingInline: '14px',
                    paddingBlock: '12px',
                    '& + &': { borderTop: '1px solid var(--tm-hairline)' },
                  }}
                >
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography
                      sx={{
                        ...qeType.title,
                        fontSize: CUERPO_LEGIBLE,
                        color: 'var(--tm-text)',
                      }}
                    >
                      {copy.nombre}
                    </Typography>
                    {/* «Montura · Oro blanco 18k» es el único atributo que
                        distingue dos pedidos por lo demás idénticos, así que
                        11px era demasiado chico: sube a 15/13. No sube al piso
                        de 17 porque no es prosa sino un atributo en el rol
                        `spec` (mono, muted) colgado del título — igualarlo al
                        nombre de la pieza aplanaría la jerarquía de la fila.
                        Compensación consciente, anotada en el reporte. */}
                    {montura && (
                      <Typography
                        sx={{
                          ...qeType.spec,
                          fontSize: { xs: '0.9375rem', md: '0.8125rem' },
                          color: 'var(--tm-muted)',
                          marginBlockStart: '3px',
                        }}
                      >
                        {t.tienda.montura} · {montura}
                      </Typography>
                    )}
                  </Box>
                  <Typography
                    sx={{
                      ...qeType.data,
                      fontSize: CUERPO_LEGIBLE,
                      color: 'var(--tm-text)',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    ${formatPriceCOP(variante.precioCOP)}
                  </Typography>
                </Box>
              );
            })}

            <Box
              sx={{
                display: 'flex',
                alignItems: 'baseline',
                justifyContent: 'space-between',
                gap: '12px',
                paddingInline: '14px',
                paddingBlock: '14px',
                borderTop: '1px solid var(--tm-border)',
                backgroundColor: 'var(--tm-well)',
              }}
            >
              <Typography sx={{ ...qeType.overline, color: 'var(--tm-muted)' }}>
                {t.tienda.pago.total}
              </Typography>
              <Typography
                sx={{
                  ...qeType.data,
                  fontSize: '1.125rem',
                  color: 'var(--tm-text)',
                  whiteSpace: 'nowrap',
                }}
              >
                ${formatPriceCOP(total)}
              </Typography>
            </Box>
          </Box>
        </Box>

        {/* ------------------------------------------------- los datos */}
        <Box component="form" onSubmit={handleSubmit} noValidate>
          <Typography
            component="h2"
            sx={{ ...qeType.overline, color: 'var(--tm-muted)' }}
          >
            {t.tienda.pago.datos}
          </Typography>

          <Box
            sx={{
              marginBlockStart: '12px',
              display: 'grid',
              gridTemplateColumns: {
                xs: '1fr',
                sm: 'repeat(2, minmax(0, 1fr))',
              },
              gap: '16px',
            }}
          >
            <Box sx={{ gridColumn: { sm: '1 / -1' } }}>
              <Field
                label={t.tienda.pago.nombre}
                required
                error={errores.nombre ? errorRequerido : undefined}
              >
                {(id) => (
                  <TextField
                    id={id}
                    value={form.nombre}
                    onChange={(e) => editar('nombre')(e.target.value)}
                    error={Boolean(errores.nombre)}
                    required
                    autoComplete="name"
                    fullWidth
                  />
                )}
              </Field>
            </Box>

            <Field
              label={t.tienda.pago.celular}
              required
              error={errores.celular ? errorRequerido : undefined}
            >
              {(id) => (
                <TextField
                  id={id}
                  type="tel"
                  inputMode="tel"
                  value={form.celular}
                  onChange={(e) => editar('celular')(e.target.value)}
                  error={Boolean(errores.celular)}
                  required
                  autoComplete="tel"
                  fullWidth
                />
              )}
            </Field>

            <Field label={t.tienda.pago.email}>
              {(id) => (
                <TextField
                  id={id}
                  type="email"
                  inputMode="email"
                  value={form.email}
                  onChange={(e) => editar('email')(e.target.value)}
                  autoComplete="email"
                  fullWidth
                />
              )}
            </Field>

            <Field label={t.tienda.pago.documento}>
              {(id) => (
                <TextField
                  id={id}
                  value={form.documento}
                  onChange={(e) => editar('documento')(e.target.value)}
                  fullWidth
                />
              )}
            </Field>

            <Field label={t.tienda.pago.ciudad}>
              {(id) => (
                <TextField
                  id={id}
                  value={form.ciudad}
                  onChange={(e) => editar('ciudad')(e.target.value)}
                  autoComplete="address-level2"
                  fullWidth
                />
              )}
            </Field>

            <Box sx={{ gridColumn: { sm: '1 / -1' } }}>
              <Field
                label={t.tienda.pago.direccion}
                required
                error={errores.direccion ? errorRequerido : undefined}
              >
                {(id) => (
                  <TextField
                    id={id}
                    value={form.direccion}
                    onChange={(e) => editar('direccion')(e.target.value)}
                    error={Boolean(errores.direccion)}
                    required
                    autoComplete="street-address"
                    fullWidth
                  />
                )}
              </Field>
            </Box>
          </Box>

          {/* --------------------------------------------- consentimiento */}
          <Box
            sx={{
              marginBlockStart: '24px',
              border: '1px solid var(--tm-border)',
              borderRadius: 'var(--tm-radius-card)',
              paddingInline: '14px',
              paddingBlock: '10px',
            }}
          >
            {/* El control que abre la puerta legal (Ley 1581). La etiqueta
                envuelve TODA la frase y además la enlaza por `htmlFor`/`id`:
                el objetivo real no es la casilla, es el párrafo entero.
                La casilla nativa medía 22x22 y no hay forma de agrandarle el
                área sin agrandarle la tinta — un `input` es un elemento
                reemplazado: no admite `::after` (así que `hitSlop` no aplica
                aquí) y el `padding` estira el propio dibujo del control. Por
                eso el `input` pasa a ser una capa transparente de 44x44 sobre
                una casilla dibujada de 22px: el área táctil crece, la tinta no,
                y los márgenes negativos devuelven exactamente la huella de
                22x22 que ocupaba antes. */}
            <Box
              component="label"
              htmlFor={consentId}
              sx={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: '12px',
                cursor: 'pointer',
                minHeight: TOQUE_MINIMO,
                // 12px (no 8) para que los 44px de la casilla quepan dentro de
                // la etiqueta incluso cuando la frase entra en un solo renglón;
                // si sobresalieran, se solaparían con los enlaces de abajo y
                // robarían el toque destinado a ellos.
                paddingBlock: '12px',
              }}
            >
              <Box
                sx={{
                  position: 'relative',
                  flexShrink: 0,
                  width: TOQUE_MINIMO,
                  height: TOQUE_MINIMO,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  // 44 de área, 22 de huella: (44−22)/2 = 11 por lado, menos
                  // el 1px de ajuste óptico que tenía la casilla original.
                  marginBlockStart: '-10px',
                  marginBlockEnd: '-12px',
                  marginInline: '-11px',
                  '& input:focus-visible + span': {
                    boxShadow: 'var(--tm-focus-ring)',
                  },
                }}
              >
                <Box
                  component="input"
                  type="checkbox"
                  id={consentId}
                  checked={consentimiento}
                  aria-invalid={faltaConsentimiento || undefined}
                  aria-describedby={
                    faltaConsentimiento ? consentErrorId : undefined
                  }
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                    setConsentimiento(e.target.checked);
                    if (e.target.checked) setFaltaConsentimiento(false);
                  }}
                  sx={{
                    position: 'absolute',
                    inset: 0,
                    width: '100%',
                    height: '100%',
                    margin: 0,
                    opacity: 0,
                    cursor: 'pointer',
                  }}
                />
                {/* La tinta. `aria-hidden` porque quien narra la casilla es el
                    input de arriba, que sigue siendo un checkbox de verdad. */}
                <Box
                  component="span"
                  aria-hidden="true"
                  sx={{
                    width: 22,
                    height: 22,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderRadius: 'var(--tm-radius-well)',
                    border: '1.5px solid',
                    borderColor: consentimiento
                      ? 'var(--tm-accent)'
                      : faltaConsentimiento
                        ? 'var(--tm-danger)'
                        : 'var(--tm-border)',
                    backgroundColor: consentimiento
                      ? 'var(--tm-accent)'
                      : 'var(--tm-surface)',
                    color: 'var(--tm-on-accent)',
                    transition:
                      'background-color var(--tm-fast) var(--tm-ease), border-color var(--tm-fast) var(--tm-ease)',
                    // Una casilla dibujada a mano desaparece en alto contraste
                    // (el sistema descarta los colores de autor). Palabras
                    // clave del sistema para que el estado marcado se siga
                    // viendo — en el control del consentimiento no es opcional.
                    '@media (forced-colors: active)': {
                      backgroundColor: consentimiento ? 'Highlight' : 'Canvas',
                      borderColor: 'CanvasText',
                      color: 'HighlightText',
                    },
                  }}
                >
                  {consentimiento && <Check size={15} strokeWidth={3} />}
                </Box>
              </Box>
              <Typography
                sx={{
                  ...qeType.body,
                  fontSize: CUERPO_LEGIBLE,
                  color: 'var(--tm-text)',
                }}
              >
                {t.tienda.pago.consent}
              </Typography>
            </Box>

            {/* Los dos textos legales van FUERA de la etiqueta a propósito: un
                enlace dentro de un <label> se disputa el clic con la casilla, y
                quien quiere leer los términos termina marcando la casilla.
                Ésa es también la respuesta al «no se pueden hacer de 44px sin
                romper el renglón»: NO son enlaces en línea dentro de la frase,
                son dos destinos en su propia fila, así que se les puede dar
                altura real (44) sin recurrir a márgenes negativos que se
                solaparían con el área táctil de la casilla o entre ellos. La
                fila crece unos 12px y el bloque legal respira: barato.
                El `gap` es 8/24 y no 6/16 por el mínimo de 8px entre objetivos
                adyacentes — en vertical cuando envuelven, y en horizontal
                porque los dos enlaces quedan pegados uno al lado del otro. */}
            <Box
              sx={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: '8px 24px',
                paddingInlineStart: '34px',
                marginBlockStart: '6px',
                paddingBlockEnd: '6px',
              }}
            >
              {[
                { to: '/tienda/terminos', texto: t.tienda.legal.terminos },
                { to: '/tienda/privacidad', texto: t.tienda.legal.privacidad },
              ].map((enlace) => (
                <Box
                  key={enlace.to}
                  component={Link}
                  to={enlace.to}
                  sx={{
                    ...qeType.body,
                    fontSize: CUERPO_LEGIBLE,
                    color: 'var(--tm-accent)',
                    textDecoration: 'underline',
                    textUnderlineOffset: '3px',
                    display: 'inline-flex',
                    alignItems: 'center',
                    minHeight: TOQUE_MINIMO,
                    transition: 'opacity var(--tm-fast) var(--tm-ease)',
                    '&:hover': { opacity: 0.75 },
                    '&:focus-visible': {
                      outline: 'none',
                      boxShadow: 'var(--tm-focus-ring)',
                      borderRadius: 'var(--tm-radius-well)',
                    },
                  }}
                >
                  {enlace.texto}
                </Box>
              ))}
            </Box>

            {faltaConsentimiento && (
              <Typography
                role="alert"
                id={consentErrorId}
                sx={{
                  ...qeType.body,
                  fontSize: CUERPO_LEGIBLE,
                  color: 'var(--tm-danger)',
                  paddingInlineStart: '34px',
                  paddingBlockEnd: '6px',
                }}
              >
                {t.tienda.pago.consentRequired}
              </Typography>
            )}
          </Box>

          {/* ------------------------------------------ desenlace simulado */}
          <Box
            sx={{
              marginBlockStart: '24px',
              display: 'flex',
              flexDirection: 'column',
              gap: '10px',
            }}
          >
            <Typography sx={{ ...qeType.overline, color: 'var(--tm-muted)' }}>
              {t.tienda.pago.scenario}
            </Typography>
            <SegmentedControl<Desenlace>
              options={[
                {
                  value: 'confirmada',
                  label: segmento(t.tienda.pago.estado.confirmada),
                },
                {
                  value: 'cancelada',
                  label: segmento(t.tienda.pago.estado.cancelada),
                },
                {
                  value: 'reservada',
                  label: segmento(t.tienda.pago.estado.confirmando),
                },
              ]}
              value={desenlace}
              onChange={setDesenlace}
              ariaLabel={t.tienda.pago.scenario}
              block
            />
          </Box>

          <Box
            sx={{
              marginBlockStart: '24px',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px',
            }}
          >
            <Button
              type="submit"
              variant="primary"
              size="lg"
              fullWidth
              loading={enviando}
              disabled={bloqueado}
            >
              {enviando ? t.tienda.pago.paying : t.tienda.pago.pay}
            </Button>

            {/* «Pago simulado. Ninguna tarjeta se cobra.» — la última cosa que
                se lee antes de tocar el botón. Es la advertencia, no el pie de
                página de la advertencia: escala legible, no `spec`. */}
            <Typography
              sx={{
                ...qeType.body,
                fontSize: CUERPO_LEGIBLE,
                color: 'var(--tm-muted)',
                textAlign: 'center',
              }}
            >
              {t.tienda.ficha.comprarAyuda}
            </Typography>

            {/* Enlace de verdad, no un botón que navega: volver a mirar es la
                salida de este flujo, y quien la usa espera abrir en otra
                pestaña o volver atrás. `Button` no acepta hoy `component` en su
                tipo (DS3 Button.tsx), así que un ancla suelta también evita
                pelear con eso. */}
            <Box
              component={Link}
              to="/tienda"
              sx={{
                ...qeType.body,
                fontSize: CUERPO_LEGIBLE,
                color: 'var(--tm-muted)',
                textDecoration: 'none',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                minHeight: TOQUE_MINIMO,
                borderRadius: 'var(--tm-radius-control)',
                transition: 'color var(--tm-fast) var(--tm-ease)',
                '&:hover': { color: 'var(--tm-accent)' },
                '&:focus-visible': {
                  outline: 'none',
                  boxShadow: 'var(--tm-focus-ring)',
                },
              }}
            >
              <ArrowLeft size={17} strokeWidth={1.75} aria-hidden="true" />
              {t.tienda.pago.backToShop}
            </Box>
          </Box>
        </Box>
      </Box>

      <Box aria-hidden="true" sx={{ height: 48 }} />
    </TiendaShell>
  );
}
