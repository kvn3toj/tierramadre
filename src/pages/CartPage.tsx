/**
 * CartPage Component
 *
 * Displays selected products and allows users to send inquiry via WhatsApp.
 * - Guests send to their inviter
 * - Staff select an admin to contact
 */
import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Button,
  Paper,
  IconButton,
  Avatar,
  Divider,
  Alert,
  alpha,
} from '@mui/material';
import {
  ShoppingCart,
  Trash2,
  ChevronLeft,
  CreditCard,
  MessageCircle,
  Package,
  X,
  Link2,
} from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import { useCart } from '../hooks/useCart';
import { useWhatsAppContact } from '../hooks/useWhatsAppContact';
import { useCurrentAsesor } from '../hooks/useCurrentAsesor';
import VitrinaShareDialog from '../components/vitrina/VitrinaShareDialog';
import { useIsGuest, useGuestCanSeePrices } from '../hooks/useAuth';
import { useCanShareVitrina } from '../hooks/usePermissions';
import { useThemeMode } from '../contexts/ThemeContext';
import AdminSelectDialog from '../components/cart/AdminSelectDialog';
import {
  emeraldCore,
  surfacesLight,
  surfacesDark,
} from '../design-system/tokens/colors';
import { buttonGradients } from '../design-system/tokens/gradients';
import { useCurrency, useCurrencyFormat } from '../contexts/CurrencyContext';
import { fontWeights } from '../design-system';
import CheckoutSheet, {
  CheckoutPieza,
} from '../components/checkout/CheckoutSheet';
import { hayPiezaSinPrecio } from '../components/checkout/checkoutGuards';
import { leerOrigen } from '../utils/origenCheckout';

export default function CartPage() {
  const { t } = useLanguage();
  const { formatCurrency } = useCurrencyFormat();
  const { multiplier } = useCurrency();
  const navigate = useNavigate();
  const { mode } = useThemeMode();
  const isLight = mode === 'light';
  const isGuest = useIsGuest();
  const canSeePrices = useGuestCanSeePrices();
  const canShareVitrina = useCanShareVitrina();

  const { cartItems, removeFromCart, clearCart, cartCount, getCartTotal } =
    useCart();

  const {
    openWhatsAppToInviter,
    openWhatsAppToAdmin,
    isLoading,
    error,
    admins,
    inviterName,
    hasInviter,
  } = useWhatsAppContact();

  const { asesor } = useCurrentAsesor();

  const [adminDialogOpen, setAdminDialogOpen] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  const [checkoutOpen, setCheckoutOpen] = useState(false);

  const totals = getCartTotal();

  // De dónde viene esta compra. `undefined` es legítimo y frecuente: el
  // visitante anónimo del catálogo público no tiene vitrina ni invitación, y
  // el servidor le cobra el precio base (x1), dejando `precioBaseCOP` y
  // `multiplicador` en la venta para poder auditarla. Ver `origenCheckout.ts`
  // para la precedencia (invitación > vitrina) y por qué un origen inválido
  // se manda igual en vez de "limpiarse".
  const origen = useMemo(() => leerOrigen(), []);

  const piezas: CheckoutPieza[] = useMemo(
    () =>
      cartItems.map((item) => ({
        sku: String(item.item),
        nombre: item.nombre,
        precioCOP: item.precioCOP,
        precioMostrado: formatCurrency(item.precioCOP),
      })),
    [cartItems, formatCurrency],
  );

  // Quién ve "Pagar": el comprador, y nadie más. `isGuest` cubre tanto al
  // anónimo (AuthContext devuelve `accessLevel: 'guest'` sin sesión) como al
  // invitado con invitación. Quedan fuera staff, embajador, asesor,
  // invitado_especial y provider: no son el comprador y ya cierran por
  // WhatsApp o por el mostrador.
  //
  // `canSeePrices` sigue en la condición: a un invitado `no_prices` nunca se
  // le mostró una cifra, y toda la UI del CheckoutSheet gira alrededor de
  // mostrar una.
  const canPagar =
    isGuest && canSeePrices && cartCount > 0 && !hayPiezaSinPrecio(piezas);

  // Sólo para mostrar — el servidor re-resuelve el multiplicador desde el
  // registro y nunca confía en éste (ver la nota de seguridad en el header
  // de `CheckoutSheet.tsx`).
  //  · vitrina    → el que quedó guardado al resolver la vitrina
  //  · invitación → `CurrencyContext`, que ya lo sincroniza en vivo desde
  //                 Convex cuando el asesor cambia `guestMultiplier`
  //  · sin origen → 1, que es exactamente lo que va a cobrar el servidor
  const multiplicadorMostrado =
    origen?.tipo === 'vitrina'
      ? (origen.multiplicador ?? 1)
      : origen?.tipo === 'invitacion'
        ? multiplier
        : 1;

  const handleSendInquiry = async () => {
    setSendError(null);

    if (cartItems.length === 0) {
      setSendError('No hay productos en el carrito');
      return;
    }

    if (isGuest) {
      // Guest flow - send to inviter
      if (!hasInviter) {
        setSendError(
          'No se encontro el contacto de tu invitador. Por favor contacta al soporte.',
        );
        return;
      }
      await openWhatsAppToInviter(cartItems);
      // Don't clear cart - let user keep their selection
      // They can manually clear or the cart persists for future reference
    } else {
      // Staff flow - open admin selection dialog
      setAdminDialogOpen(true);
    }
  };

  const handleAdminSelected = async (adminName: string) => {
    const success = await openWhatsAppToAdmin(cartItems, adminName);
    if (!success) {
      // Show error - the hook already set the error state
      // Keep the dialog closed but cart items remain
      setSendError(
        `No se pudo enviar a ${adminName}. Verifica que tenga WhatsApp configurado.`,
      );
    }
    // Don't clear cart - let user keep their selection
  };

  // iOS HIG colors
  const separatorColor = isLight
    ? 'rgba(60, 60, 67, 0.12)'
    : 'rgba(235, 235, 245, 0.12)';

  return (
    <Box
      sx={{
        maxWidth: 600,
        mx: 'auto',
        px: { xs: 2, sm: 3 },
        py: 3,
      }}
    >
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
        <IconButton
          onClick={() => navigate(-1)}
          sx={{
            bgcolor: isLight
              ? surfacesLight.background.secondary
              : surfacesDark.background.secondary,
          }}
        >
          <ChevronLeft size={24} />
        </IconButton>
        <Box sx={{ flex: 1 }}>
          <Typography variant="h5" sx={{ fontWeight: fontWeights.bold }}>
            Mi Selección
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {cartCount} {cartCount === 1 ? 'producto' : 'productos'}
          </Typography>
        </Box>
        {cartCount > 0 && (
          <Button
            size="small"
            color="error"
            startIcon={<Trash2 size={16} />}
            onClick={clearCart}
          >
            {t.cart.clear}
          </Button>
        )}
      </Box>

      {/* Error messages */}
      {(error || sendError) && (
        <Alert
          severity="error"
          sx={{ mb: 2 }}
          onClose={() => setSendError(null)}
        >
          {error || sendError}
        </Alert>
      )}

      {/* Empty state */}
      {cartCount === 0 ? (
        <Paper
          elevation={0}
          sx={{
            p: 4,
            textAlign: 'center',
            borderRadius: 3,
            border: '1px solid',
            borderColor: separatorColor,
          }}
        >
          <Package
            size={64}
            color={
              isLight ? surfacesLight.text.tertiary : surfacesDark.text.tertiary
            }
            style={{ marginBottom: 16, opacity: 0.5 }}
          />
          <Typography
            variant="h6"
            sx={{ fontWeight: fontWeights.semibold, mb: 1 }}
          >
            Tu selección está vacía
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            Explora nuestra colección y agrega productos que te interesen
          </Typography>
          <Button
            variant="contained"
            onClick={() => navigate('/treasure')}
            sx={{
              background: buttonGradients.primary,
              color: '#FFFFFF',
            }}
          >
            {t.cart.exploreCollection}
          </Button>
        </Paper>
      ) : (
        <>
          {/* Cart items */}
          <Paper
            elevation={0}
            sx={{
              borderRadius: 3,
              border: '1px solid',
              borderColor: separatorColor,
              overflow: 'hidden',
              mb: 3,
            }}
          >
            {cartItems.map((item, index) => (
              <Box key={item.itemId}>
                <Box
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 2,
                    p: 2,
                  }}
                >
                  <Avatar
                    src={item.thumbnailUrl}
                    alt={item.nombre}
                    variant="rounded"
                    sx={{
                      width: 60,
                      height: 60,
                      bgcolor: alpha(emeraldCore.primary, 0.1),
                    }}
                  >
                    <ShoppingCart size={24} color={emeraldCore.primary} />
                  </Avatar>

                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography
                      variant="subtitle2"
                      sx={{
                        fontWeight: 600,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {item.nombre}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Item #{item.item}
                    </Typography>
                    {canSeePrices && (
                      <Typography
                        variant="body2"
                        sx={{
                          fontWeight: 600,
                          color: emeraldCore.dark,
                          mt: 0.5,
                        }}
                      >
                        {formatCurrency(item.precioCOP)}
                      </Typography>
                    )}
                  </Box>

                  <IconButton
                    size="small"
                    onClick={() => removeFromCart(item.itemId)}
                    sx={{
                      color: 'error.main',
                      '&:hover': {
                        bgcolor: alpha('#ef4444', 0.1),
                      },
                    }}
                  >
                    <X size={18} />
                  </IconButton>
                </Box>

                {index < cartItems.length - 1 && <Divider sx={{ mx: 2 }} />}
              </Box>
            ))}
          </Paper>

          {/* Totals - Only show if guest can see prices */}
          {canSeePrices && (
            <Paper
              elevation={0}
              sx={{
                p: 2,
                borderRadius: 3,
                border: '1px solid',
                borderColor: separatorColor,
                mb: 3,
              }}
            >
              <Box
                sx={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <Typography variant="body2" color="text.secondary">
                  Total
                </Typography>
                <Typography variant="h6" sx={{ fontWeight: 700 }}>
                  {formatCurrency(totals.cop)}
                </Typography>
              </Box>
            </Paper>
          )}

          {/* Guest info banner */}
          {isGuest && inviterName && (
            <Alert
              severity="info"
              sx={{ mb: 3 }}
              icon={<MessageCircle size={20} />}
            >
              Tu consulta sera enviada a <strong>{inviterName}</strong> por
              WhatsApp
            </Alert>
          )}

          {/* Send button */}
          <Button
            variant="contained"
            fullWidth
            size="large"
            disabled={isLoading || cartCount === 0}
            onClick={handleSendInquiry}
            startIcon={<MessageCircle size={20} />}
            sx={{
              background: buttonGradients.primary,
              color: '#FFFFFF',
              py: 1.5,
              fontWeight: 600,
              fontSize: '1rem',
              borderRadius: 2,
              '&:hover': {
                background: emeraldCore.dark,
              },
            }}
          >
            {isLoading ? t.cart.sending : t.cart.sendWhatsApp}
          </Button>

          <Typography
            variant="caption"
            color="text.secondary"
            sx={{ display: 'block', textAlign: 'center', mt: 2 }}
          >
            Se abrira WhatsApp con tu lista de productos
          </Typography>

          {/* Pagar — only for a guest with an invitation on record (see
              `canPagar` above); staff and unresolvable guests keep WhatsApp
              only. */}
          {canPagar && (
            <Button
              variant="outlined"
              fullWidth
              size="large"
              onClick={() => setCheckoutOpen(true)}
              startIcon={<CreditCard size={20} />}
              sx={{
                mt: 2,
                py: 1.5,
                fontWeight: 600,
                fontSize: '1rem',
                borderRadius: 2,
                borderColor: emeraldCore.primary,
                color: emeraldCore.primary,
                '&:hover': {
                  borderColor: emeraldCore.dark,
                  bgcolor: alpha(emeraldCore.primary, 0.06),
                },
              }}
            >
              Pagar
            </Button>
          )}

          {/* Staff + special guests: generate a public client link (Vitrina) */}
          {canShareVitrina && (
            <>
              <Divider sx={{ my: 3 }}>
                <Typography variant="caption" color="text.secondary">
                  o comparte con un cliente
                </Typography>
              </Divider>
              <Button
                variant="outlined"
                fullWidth
                size="large"
                disabled={cartCount === 0}
                onClick={() => setShareDialogOpen(true)}
                startIcon={<Link2 size={20} />}
                sx={{
                  py: 1.5,
                  fontWeight: 600,
                  fontSize: '1rem',
                  borderRadius: 2,
                  borderColor: emeraldCore.primary,
                  color: emeraldCore.primary,
                  '&:hover': {
                    borderColor: emeraldCore.dark,
                    bgcolor: alpha(emeraldCore.primary, 0.06),
                  },
                }}
              >
                Compartir con cliente (sin app)
              </Button>
              <Typography
                variant="caption"
                color="text.secondary"
                sx={{ display: 'block', textAlign: 'center', mt: 1 }}
              >
                El cliente verá solo estas piezas, sin necesidad de iniciar
                sesión.
              </Typography>
            </>
          )}
        </>
      )}

      {/* Admin selection dialog (for staff only) */}
      <AdminSelectDialog
        open={adminDialogOpen}
        onClose={() => setAdminDialogOpen(false)}
        onSelect={handleAdminSelected}
        admins={admins}
        isLoading={isLoading}
      />

      {/* Staff: pick pricing (multiplier + COP/USD) and mint a public client link */}
      <VitrinaShareDialog
        open={shareDialogOpen}
        onClose={() => setShareDialogOpen(false)}
        items={cartItems}
        senderSlug={asesor?.slug}
      />

      {/* Guest checkout — only mounted when the invitation token resolved */}
      <CheckoutSheet
        open={checkoutOpen}
        piezas={piezas}
        multiplicador={multiplicadorMostrado}
        origen={origen}
        onClose={() => setCheckoutOpen(false)}
      />
    </Box>
  );
}
