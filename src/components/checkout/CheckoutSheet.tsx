/**
 * CheckoutSheet Component
 *
 * The sheet where a customer actually pays. Reviews the pieces they picked,
 * gives contact info, and POSTs to `/api/checkout-create-order`, which
 * reserves the item(s) server-side and hands back either a Wompi/MP payment
 * link (success) or the saved order without one (aviso — the order still
 * exists, see `mensajesCheckout.ts` for why that is never shown as "error").
 *
 * Wompi collects only in COP, even on a vitrina that displays USD, and the
 * two figures don't round-trip cleanly. So the total shown here is computed
 * with the SAME pure function the server uses to charge —
 * `precioConMarkup(precioCOP, multiplicador)` from `convex/_lib/precioVitrina`
 * (dependency-free, no Convex imports, safe to run in the browser) — applied
 * per piece and summed, exactly like `convex/ghl.ts`'s `createOrder` does.
 * `precioMostrado` (the label the customer was already looking at, possibly
 * in USD) stays as a secondary reference per piece; the COP figure computed
 * here is the one being confirmed.
 *
 * SAFETY NOTE: this is presentation only. The server re-resolves the
 * multiplier itself from the `vitrinas`/`invitations` record — it never
 * trusts a multiplier sent by the browser (see `resolverMultiplicador` in
 * `precioVitrina.ts`). So if `multiplicador` here were ever stale or
 * tampered with client-side, the customer would see a figure that differs
 * from the real charge — it could never make the server charge LESS than it
 * would have anyway.
 *
 * ── DS3 + idioma + reserva (2026-09-09) ───────────────────────────────────
 *
 * Tres cosas cambiaron a la vez porque las tres se veían en la misma
 * pantalla, la última antes de que se mueva dinero real:
 *
 * 1. **`Sheet` de DS3** en vez de un `Dialog` de MUI. Gana el bottom-sheet en
 *    móvil (donde ocurre la compra), el focus-trap y el Escape reales, y
 *    `disableClose` mientras el POST está en vuelo. Cero literales de color:
 *    todo es `--tm-*`.
 * 2. **`lang` es un PROP, no el contexto.** El idioma de esta hoja es el del
 *    ENLACE por el que llegó el cliente (la vitrina se comparte en uno de
 *    seis idiomas), no el del visitante — `LanguageContext` guarda lo
 *    segundo, y una vitrina en inglés se abre con el contexto en español. Por
 *    eso aquí NO se llama a `useLanguage()`: quien monta esta hoja ya sabe en
 *    qué idioma está el enlace y lo baja. Default `'es'`.
 * 3. **La nota de reserva.** El servidor aparta la piedra `RESERVA_TTL_MS`
 *    (`convex/_lib/reservas.ts`, puro y sin imports — igual que
 *    `precioVitrina`, seguro en el navegador). Los minutos se derivan de esa
 *    constante, nunca se escriben a mano: si el TTL cambia y la frase no, la
 *    hoja miente sobre cuánto tiempo tiene el cliente para pagar.
 *
 * Y el fix que no se ve: `redirigiendo`. El `finally` apagaba `enviando`
 * DESPUÉS de asignar `window.location.href`, y la asignación no detiene el
 * mundo — la pestaña sigue viva unos cuantos frames mientras el navegador
 * negocia con Wompi. En ese hueco el botón volvía a estar habilitado y un
 * segundo clic mandaba una SEGUNDA orden (con su segunda reserva). Ahora el
 * `finally` sólo re-habilita cuando NO nos estamos yendo.
 */
import { useState } from 'react';
import { Box, Typography, IconButton } from '@mui/material';
import { X, CreditCard, AlertTriangle, Clock } from 'lucide-react';
import { Sheet, Button, TextField } from '../../design-system';
import { formatCurrency } from '../../utils/formatting';
import { precioConMarkup } from '../../../convex/_lib/precioVitrina';
import { RESERVA_TTL_MS } from '../../../convex/_lib/reservas';
import { translations, type Language } from '../../locales';
import { guardarLangPedido } from '../../utils/langPedido';
import {
  mensajeDeRespuesta,
  traducirMensaje,
  type MensajeCheckout,
} from './mensajesCheckout';
import { hayPiezaSinPrecio } from './checkoutGuards';
import NoticeBox from './NoticeBox';

export interface CheckoutPieza {
  sku: string;
  nombre: string;
  /** Precio base en COP, sin markup — la entrada de `precioConMarkup`. */
  precioCOP: number;
  /** La etiqueta que el cliente ya venía viendo (puede ser COP o USD). */
  precioMostrado: string;
}

export interface CheckoutOrigen {
  tipo: 'vitrina' | 'invitacion';
  token: string;
}

interface CheckoutSheetProps {
  open: boolean;
  piezas: CheckoutPieza[];
  /** El multiplicador de la vitrina/invitación de origen (x1–x4). Sólo para
   * mostrar el mismo número que el servidor va a cobrar — ver la nota de
   * seguridad en el header de este archivo. Por defecto 1, que es lo que
   * cobra el servidor cuando no hay origen. */
  multiplicador?: number;
  /**
   * De qué registro viene la compra. **Opcional a propósito**: el catálogo
   * público no tiene vitrina ni invitación, y sin origen el servidor cobra
   * el precio base (`MULTIPLICADOR_POR_DEFECTO = 1` en
   * `convex/_lib/precioVitrina.ts`), dejando `precioBaseCOP` y
   * `multiplicador: 1` en la venta para poder auditarla después.
   *
   * Ausente y ausente-pero-inválido NO son lo mismo: un token que no
   * resuelve hace que el servidor RECHACE la orden con `ORIGEN_INVALIDO`,
   * nunca que la cobre a x1. Por eso nunca hay que "limpiar" un origen roto
   * antes de mandarlo — eso convertiría un error en un descuento.
   */
  origen?: CheckoutOrigen;
  /**
   * El idioma del ENLACE por el que llegó el cliente, no el del visitante —
   * ver el punto 2 del header. Default `'es'` para que las vistas que aún no
   * lo bajan (catálogo público) sigan funcionando igual que antes.
   */
  lang?: Language;
  onClose: () => void;
}

const TITLE_ID = 'checkout-sheet-title';

/** Los minutos de la nota salen del TTL real del servidor, nunca a mano. */
const MINUTOS_RESERVA = String(Math.round(RESERVA_TTL_MS / 60000));

export default function CheckoutSheet({
  open,
  piezas,
  multiplicador = 1,
  origen,
  lang = 'es',
  onClose,
}: CheckoutSheetProps) {
  const tc = translations[lang].checkout;

  const [celular, setCelular] = useState('');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [resultado, setResultado] = useState<MensajeCheckout | null>(null);

  // Por pieza y luego sumado — no sumado y luego multiplicado — porque así
  // redondea el servidor (`convex/ghl.ts`: `precioConMarkup(base, mult) * qty`
  // dentro del loop). Divergir del orden de operaciones divergiría del
  // redondeo.
  const totalCOP = piezas.reduce(
    (acc, p) => acc + precioConMarkup(p.precioCOP, multiplicador),
    0,
  );

  // Fix crítico (revisión final) — ver el header de `checkoutGuards.ts` para
  // el porqué completo. Bloquea la hoja ENTERA (no sólo descarta la pieza
  // sin precio): soltar en silencio una pieza que el cliente sí puso en su
  // carrito sería su propia sorpresa.
  const piezaSinPrecio = hayPiezaSinPrecio(piezas);

  const handleClose = () => {
    if (enviando) return;
    setResultado(null);
    onClose();
  };

  const handleSubmit = async () => {
    // Defensivo: el botón ya está deshabilitado/oculto cuando hay una pieza
    // sin precio, pero handleSubmit no debe depender únicamente de eso.
    if (piezaSinPrecio) return;
    const celularLimpio = celular.trim();
    if (!celularLimpio || enviando) return;

    setEnviando(true);
    setResultado(null);

    // Se queda `false` salvo que de verdad nos estemos yendo a Wompi — ver el
    // último párrafo del header. El `finally` lo consulta.
    let redirigiendo = false;

    try {
      const contact: Record<string, string> = { celular: celularLimpio };
      // Nunca mandar null — el servidor rechaza un opcional que no sea
      // string (api/_lib/checkoutBody.ts). Sólo se agrega la llave si hay
      // valor.
      const fullNameLimpio = fullName.trim();
      if (fullNameLimpio) contact.full_name = fullNameLimpio;
      const emailLimpio = email.trim();
      if (emailLimpio) contact.email = emailLimpio;

      const res = await fetch('/api/checkout-create-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contact,
          items: piezas.map((p) => ({ sku: p.sku, qty: 1 })),
          // La clave se OMITE cuando no hay origen; nunca viaja como `null`.
          // `parseCheckoutBody` rechaza un `origen` que no sea objeto con un
          // 400, así que mandar null rompería el catálogo público entero —
          // la misma trampa que ya está documentada arriba para
          // `full_name`/`email`.
          ...(origen ? { origen } : {}),
        }),
      });
      const body = await res.json().catch(() => null);
      const mensaje = mensajeDeRespuesta(res.status, body);
      setResultado(mensaje);

      if (mensaje.tono === 'exito' && mensaje.url) {
        redirigiendo = true;
        // El idioma no viaja en la redirección de Wompi: se deja en
        // sessionStorage para que `/pedido-confirmado` lo lea al volver (ver
        // `utils/langPedido.ts`).
        guardarLangPedido(lang);
        window.location.href = mensaje.url;
        return;
      }
    } catch {
      setResultado({
        tono: 'error',
        codigo: 'GENERICO',
        texto: tc.networkError,
      });
    } finally {
      // Nos vamos: dejar el botón en `loading` (y por lo tanto deshabilitado)
      // hasta que el navegador de verdad abandone la página.
      if (!redirigiendo) setEnviando(false);
    }
  };

  return (
    <Sheet
      open={open}
      onClose={handleClose}
      ariaLabelledBy={TITLE_ID}
      maxWidth={440}
      disableClose={enviando}
    >
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '12px',
          padding: '16px 20px 12px',
          borderBottom: '1px solid var(--tm-hairline)',
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <CreditCard size={20} color="var(--tm-accent)" aria-hidden />
          <Typography
            id={TITLE_ID}
            component="h2"
            sx={{
              fontFamily: 'var(--tm-font-ui)',
              fontWeight: 600,
              fontSize: '1.0625rem',
              color: 'var(--tm-text)',
            }}
          >
            {tc.title}
          </Typography>
        </Box>
        <IconButton
          onClick={handleClose}
          aria-label={tc.close}
          size="small"
          disabled={enviando}
          sx={{ color: 'var(--tm-muted)' }}
        >
          <X size={18} />
        </IconButton>
      </Box>

      {piezas.length === 0 ? (
        <Box sx={{ padding: '24px 20px', textAlign: 'center' }}>
          <Typography
            sx={{
              fontFamily: 'var(--tm-font-ui)',
              fontSize: '0.9375rem',
              color: 'var(--tm-muted)',
            }}
          >
            {tc.empty}
          </Typography>
        </Box>
      ) : (
        <>
          <Box>
            {piezas.map((pieza, i) => (
              <Box
                key={pieza.sku}
                sx={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  justifyContent: 'space-between',
                  gap: '12px',
                  padding: '12px 20px',
                  ...(i > 0
                    ? { borderTop: '1px solid var(--tm-hairline)' }
                    : {}),
                }}
              >
                <Box sx={{ minWidth: 0 }}>
                  <Typography
                    sx={{
                      fontFamily: 'var(--tm-font-serif)',
                      fontSize: '1rem',
                      color: 'var(--tm-text)',
                    }}
                  >
                    {pieza.nombre}
                  </Typography>
                  <Typography
                    sx={{
                      fontFamily: 'var(--tm-font-mono)',
                      fontSize: '0.75rem',
                      color: 'var(--tm-subtle)',
                    }}
                  >
                    {pieza.sku}
                  </Typography>
                </Box>
                <Box sx={{ textAlign: 'right', flexShrink: 0 }}>
                  <Typography
                    sx={{
                      fontFamily: 'var(--tm-font-mono)',
                      fontFeatureSettings: '"tnum"',
                      fontSize: '0.9375rem',
                      color: 'var(--tm-text)',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {formatCurrency(
                      precioConMarkup(pieza.precioCOP, multiplicador),
                      'COP',
                    )}
                  </Typography>
                  <Typography
                    sx={{
                      fontFamily: 'var(--tm-font-ui)',
                      fontSize: '0.75rem',
                      color: 'var(--tm-muted)',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {pieza.precioMostrado}
                  </Typography>
                </Box>
              </Box>
            ))}
          </Box>

          {piezaSinPrecio ? (
            // Bloquea la hoja entera — ver la nota junto a `piezaSinPrecio`
            // arriba. Ni total, ni formulario, ni botón de pago: no hay
            // nada seguro que cobrar mientras una pieza no tenga precio.
            <Box sx={{ padding: '16px 20px 20px' }}>
              <NoticeBox
                tone="danger"
                icon={<AlertTriangle size={18} color="var(--tm-danger)" />}
              >
                {tc.blockedUnpriced}
              </NoticeBox>
            </Box>
          ) : (
            <>
              <Box
                sx={{
                  margin: '16px 20px 10px',
                  padding: '14px 16px',
                  borderRadius: 'var(--tm-radius-card)',
                  backgroundColor: 'var(--tm-accent-wash)',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'baseline',
                  gap: '12px',
                }}
              >
                <Typography
                  sx={{
                    fontFamily: 'var(--tm-font-ui)',
                    fontSize: '0.8125rem',
                    color: 'var(--tm-muted)',
                  }}
                >
                  {tc.totalLabel}
                </Typography>
                <Typography
                  sx={{
                    fontFamily: 'var(--tm-font-mono)',
                    fontFeatureSettings: '"tnum"',
                    fontWeight: 600,
                    fontSize: '1.125rem',
                    color: 'var(--tm-accent)',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {formatCurrency(totalCOP, 'COP')}
                </Typography>
              </Box>

              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '8px',
                  padding: '0 20px 16px',
                }}
              >
                <Box
                  aria-hidden
                  sx={{ display: 'flex', flexShrink: 0, marginTop: '2px' }}
                >
                  <Clock size={14} color="var(--tm-muted)" />
                </Box>
                <Typography
                  sx={{
                    fontFamily: 'var(--tm-font-ui)',
                    fontSize: '0.8125rem',
                    lineHeight: 1.45,
                    color: 'var(--tm-muted)',
                  }}
                >
                  {tc.reservationNote.replace('{minutes}', MINUTOS_RESERVA)}
                </Typography>
              </Box>

              <Box
                sx={{
                  padding: '0 20px 20px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '14px',
                }}
              >
                <TextField
                  fullWidth
                  label={tc.phoneLabel}
                  type="tel"
                  value={celular}
                  onChange={(e) => setCelular(e.target.value)}
                  size="sm"
                  placeholder={tc.phonePlaceholder}
                  inputProps={{ autoComplete: 'tel' }}
                  disabled={enviando}
                />
                <TextField
                  fullWidth
                  label={tc.nameLabel}
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  size="sm"
                  inputProps={{ autoComplete: 'name' }}
                  disabled={enviando}
                />
                <TextField
                  fullWidth
                  label={tc.emailLabel}
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  size="sm"
                  inputProps={{ autoComplete: 'email' }}
                  disabled={enviando}
                />

                {resultado && resultado.tono !== 'exito' && (
                  <NoticeBox
                    tone={resultado.tono === 'aviso' ? 'warn' : 'danger'}
                    icon={
                      <AlertTriangle
                        size={18}
                        color={
                          resultado.tono === 'aviso'
                            ? 'var(--tm-warning)'
                            : 'var(--tm-danger)'
                        }
                      />
                    }
                  >
                    {traducirMensaje(resultado, tc)}
                  </NoticeBox>
                )}

                <Button
                  variant="primary"
                  size="lg"
                  fullWidth
                  loading={enviando}
                  disabled={!celular.trim() || piezas.length === 0}
                  onClick={handleSubmit}
                >
                  {tc.payButton.replace(
                    '{total}',
                    formatCurrency(totalCOP, 'COP'),
                  )}
                </Button>
              </Box>
            </>
          )}
        </>
      )}
    </Sheet>
  );
}
