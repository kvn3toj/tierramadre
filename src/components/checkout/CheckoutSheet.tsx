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
 */
import { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  Box,
  Typography,
  IconButton,
  List,
  ListItem,
  ListItemText,
  Alert,
  alpha,
} from '@mui/material';
import { X, CreditCard } from 'lucide-react';
import { useThemeMode } from '../../contexts/ThemeContext';
import {
  emeraldCore,
  surfacesLight,
  surfacesDark,
  Button,
  TextField,
} from '../../design-system';
import { formatCurrency } from '../../utils/formatting';
import { precioConMarkup } from '../../../convex/_lib/precioVitrina';
import { mensajeDeRespuesta } from './mensajesCheckout';
import { hayPiezaSinPrecio } from './checkoutGuards';

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
   * seguridad en el header de este archivo. */
  multiplicador: number;
  origen: CheckoutOrigen;
  onClose: () => void;
}

export default function CheckoutSheet({
  open,
  piezas,
  multiplicador,
  origen,
  onClose,
}: CheckoutSheetProps) {
  const { mode } = useThemeMode();
  const isLight = mode === 'light';

  const [celular, setCelular] = useState('');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [resultado, setResultado] = useState<ReturnType<
    typeof mensajeDeRespuesta
  > | null>(null);

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
          origen,
        }),
      });
      const body = await res.json().catch(() => null);
      const mensaje = mensajeDeRespuesta(res.status, body);
      setResultado(mensaje);

      if (mensaje.tono === 'exito' && mensaje.url) {
        window.location.href = mensaje.url;
        return;
      }
    } catch {
      setResultado({
        tono: 'error',
        texto: 'No pudimos conectar. Revisa tu conexión e intenta de nuevo.',
      });
    } finally {
      setEnviando(false);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="xs"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 3,
          bgcolor: isLight
            ? surfacesLight.background.primary
            : surfacesDark.background.primary,
        },
      }}
    >
      <DialogTitle
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderBottom: '1px solid',
          borderColor: isLight
            ? surfacesLight.border.light
            : surfacesDark.border.default,
          pb: 2,
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <CreditCard size={24} color={emeraldCore.primary} />
          <Typography variant="h6" sx={{ fontWeight: 700 }}>
            Pagar
          </Typography>
        </Box>
        <IconButton
          onClick={handleClose}
          aria-label="Cerrar"
          size="small"
          disabled={enviando}
        >
          <X size={20} />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={{ p: 0 }}>
        {piezas.length === 0 ? (
          <Box sx={{ p: 3, textAlign: 'center' }}>
            <Typography color="text.secondary">
              No hay piezas seleccionadas.
            </Typography>
          </Box>
        ) : (
          <>
            <List sx={{ pt: 1 }}>
              {piezas.map((pieza) => (
                <ListItem key={pieza.sku} sx={{ py: 1, px: 3 }}>
                  <ListItemText
                    primary={pieza.nombre}
                    secondary={pieza.sku}
                    primaryTypographyProps={{ fontWeight: 600 }}
                    secondaryTypographyProps={{
                      color: 'text.disabled',
                      fontSize: '0.75rem',
                    }}
                  />
                  <Box sx={{ textAlign: 'right', ml: 2 }}>
                    <Typography sx={{ fontWeight: 600, whiteSpace: 'nowrap' }}>
                      {formatCurrency(
                        precioConMarkup(pieza.precioCOP, multiplicador),
                        'COP',
                      )}
                    </Typography>
                    <Typography
                      variant="caption"
                      sx={{ color: 'text.disabled', whiteSpace: 'nowrap' }}
                    >
                      {pieza.precioMostrado}
                    </Typography>
                  </Box>
                </ListItem>
              ))}
            </List>

            {piezaSinPrecio ? (
              // Bloquea la hoja entera — ver la nota junto a `piezaSinPrecio`
              // arriba. Ni total, ni formulario, ni botón de pago: no hay
              // nada seguro que cobrar mientras una pieza no tenga precio.
              <Box sx={{ px: 3, pb: 3 }}>
                <Alert severity="error">
                  Una o más piezas de tu selección no tienen precio asignado
                  todavía y no podemos cobrarlas aquí. Escríbenos por WhatsApp y
                  te ayudamos a completar la compra.
                </Alert>
              </Box>
            ) : (
              <>
                <Box
                  sx={{
                    mx: 3,
                    mb: 2,
                    p: 2,
                    borderRadius: 2,
                    bgcolor: alpha(emeraldCore.primary, 0.08),
                  }}
                >
                  <Box
                    sx={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'baseline',
                    }}
                  >
                    <Typography
                      variant="body2"
                      sx={{ color: 'text.secondary' }}
                    >
                      Total a pagar (COP)
                    </Typography>
                    <Typography
                      variant="h6"
                      sx={{ fontWeight: 700, color: emeraldCore.dark }}
                    >
                      {formatCurrency(totalCOP, 'COP')}
                    </Typography>
                  </Box>
                </Box>

                <Box
                  sx={{
                    px: 3,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 2,
                  }}
                >
                  <TextField
                    fullWidth
                    label="Celular / WhatsApp"
                    type="tel"
                    value={celular}
                    onChange={(e) => setCelular(e.target.value)}
                    size="sm"
                    placeholder="+57 300 123 4567"
                    inputProps={{ autoComplete: 'tel' }}
                    disabled={enviando}
                  />
                  <TextField
                    fullWidth
                    label="Nombre completo (opcional)"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    size="sm"
                    inputProps={{ autoComplete: 'name' }}
                    disabled={enviando}
                  />
                  <TextField
                    fullWidth
                    label="Email (opcional)"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    size="sm"
                    inputProps={{ autoComplete: 'email' }}
                    disabled={enviando}
                  />

                  {resultado && resultado.tono !== 'exito' && (
                    <Alert
                      severity={
                        resultado.tono === 'aviso' ? 'warning' : 'error'
                      }
                    >
                      {resultado.texto}
                    </Alert>
                  )}

                  <Button
                    variant="primary"
                    fullWidth
                    loading={enviando}
                    disabled={!celular.trim() || piezas.length === 0}
                    onClick={handleSubmit}
                    sx={{ mb: 3 }}
                  >
                    {`Pagar ${formatCurrency(totalCOP, 'COP')}`}
                  </Button>
                </Box>
              </>
            )}
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
