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
 * two figures don't round-trip cleanly — so alongside each piece's price
 * label the customer already saw, this shows a COP total before they submit.
 * `piezas` only carries a formatted display string (no raw COP), so the
 * total below is a best-effort estimate (exact for a COP-denominated label,
 * TRM-converted for a USD one) with a disclaimer — see task-5-report.md for
 * why the prop contract doesn't carry a raw price.
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
import { useTRM } from '../../hooks/useTRM';
import { mensajeDeRespuesta } from './mensajesCheckout';

export interface CheckoutPieza {
  sku: string;
  nombre: string;
  precioMostrado: string;
}

export interface CheckoutOrigen {
  tipo: 'vitrina' | 'invitacion';
  token: string;
}

interface CheckoutSheetProps {
  open: boolean;
  piezas: CheckoutPieza[];
  origen: CheckoutOrigen;
  onClose: () => void;
}

/**
 * `precioMostrado` viene como texto ya formateado, no como número — nunca es
 * exacto para una etiqueta en USD (ver el header del archivo). Se detecta el
 * sufijo " USD" que deja `formatVitrinaPrice`; todo lo demás se asume COP.
 */
function precioMostradoACOP(precioMostrado: string, trmRate: number): number {
  const esUSD = /USD\s*$/.test(precioMostrado);
  const digitos = precioMostrado.replace(/[^\d]/g, '');
  const numero = digitos ? Number(digitos) : 0;
  if (!Number.isFinite(numero) || numero <= 0) return 0;
  return esUSD ? Math.round(numero * trmRate) : numero;
}

export default function CheckoutSheet({
  open,
  piezas,
  origen,
  onClose,
}: CheckoutSheetProps) {
  const { mode } = useThemeMode();
  const isLight = mode === 'light';
  const { trmRate } = useTRM();

  const [celular, setCelular] = useState('');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [resultado, setResultado] = useState<ReturnType<
    typeof mensajeDeRespuesta
  > | null>(null);

  const algunaEnUSD = piezas.some((p) => /USD\s*$/.test(p.precioMostrado));
  const totalCOP = piezas.reduce(
    (acc, p) => acc + precioMostradoACOP(p.precioMostrado, trmRate),
    0,
  );

  const handleClose = () => {
    if (enviando) return;
    setResultado(null);
    onClose();
  };

  const handleSubmit = async () => {
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
                  <Typography
                    sx={{ fontWeight: 600, whiteSpace: 'nowrap', ml: 2 }}
                  >
                    {pieza.precioMostrado}
                  </Typography>
                </ListItem>
              ))}
            </List>

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
                <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                  Total a pagar (COP)
                </Typography>
                <Typography
                  variant="h6"
                  sx={{ fontWeight: 700, color: emeraldCore.dark }}
                >
                  {formatCurrency(totalCOP, 'COP')}
                </Typography>
              </Box>
              {algunaEnUSD && (
                <Typography
                  variant="caption"
                  sx={{ color: 'text.disabled', display: 'block', mt: 0.5 }}
                >
                  Wompi cobra en pesos colombianos. Este total es aproximado —
                  el monto exacto se confirma en la pantalla de pago.
                </Typography>
              )}
            </Box>

            <Box
              sx={{ px: 3, display: 'flex', flexDirection: 'column', gap: 2 }}
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
                  severity={resultado.tono === 'aviso' ? 'warning' : 'error'}
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
      </DialogContent>
    </Dialog>
  );
}
