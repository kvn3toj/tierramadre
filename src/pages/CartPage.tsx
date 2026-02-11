/**
 * CartPage Component
 *
 * Displays selected products and allows users to send inquiry via WhatsApp.
 * - Guests send to their inviter
 * - Staff select an admin to contact
 */
import { useState } from 'react';
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
  MessageCircle,
  Package,
  X,
} from 'lucide-react';
import { useCart } from '../hooks/useCart';
import { useWhatsAppContact } from '../hooks/useWhatsAppContact';
import { useIsGuest, useGuestCanSeePrices } from '../hooks/useAuth';
import { useThemeMode } from '../contexts/ThemeContext';
import AdminSelectDialog from '../components/cart/AdminSelectDialog';
import { emeraldCore, surfacesLight, surfacesDark } from '../design-system/tokens/colors';
import { buttonGradients } from '../design-system/tokens/gradients';
import { useCurrencyFormat } from '../contexts/CurrencyContext';

export default function CartPage() {
  const { formatCurrency } = useCurrencyFormat();
  const navigate = useNavigate();
  const { mode } = useThemeMode();
  const isLight = mode === 'light';
  const isGuest = useIsGuest();
  const canSeePrices = useGuestCanSeePrices();

  const {
    cartItems,
    removeFromCart,
    clearCart,
    cartCount,
    getCartTotal,
  } = useCart();

  const {
    openWhatsAppToInviter,
    openWhatsAppToAdmin,
    isLoading,
    error,
    admins,
    inviterName,
    hasInviter,
  } = useWhatsAppContact();

  const [adminDialogOpen, setAdminDialogOpen] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);

  const totals = getCartTotal();

  const handleSendInquiry = async () => {
    setSendError(null);

    if (cartItems.length === 0) {
      setSendError('No hay productos en el carrito');
      return;
    }

    if (isGuest) {
      // Guest flow - send to inviter
      if (!hasInviter) {
        setSendError('No se encontro el contacto de tu invitador. Por favor contacta al soporte.');
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
      setSendError(`No se pudo enviar a ${adminName}. Verifica que tenga WhatsApp configurado.`);
    }
    // Don't clear cart - let user keep their selection
  };

  // iOS HIG colors
  const separatorColor = isLight ? 'rgba(60, 60, 67, 0.12)' : 'rgba(235, 235, 245, 0.12)';

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
            bgcolor: isLight ? surfacesLight.background.secondary : surfacesDark.background.secondary,
          }}
        >
          <ChevronLeft size={24} />
        </IconButton>
        <Box sx={{ flex: 1 }}>
          <Typography variant="h5" sx={{ fontWeight: 700 }}>
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
            Limpiar
          </Button>
        )}
      </Box>

      {/* Error messages */}
      {(error || sendError) && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setSendError(null)}>
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
            color={isLight ? surfacesLight.text.tertiary : surfacesDark.text.tertiary}
            style={{ marginBottom: 16, opacity: 0.5 }}
          />
          <Typography variant="h6" sx={{ fontWeight: 600, mb: 1 }}>
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
            Explorar Colección
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
                        sx={{ fontWeight: 600, color: emeraldCore.dark, mt: 0.5 }}
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

                {index < cartItems.length - 1 && (
                  <Divider sx={{ mx: 2 }} />
                )}
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
              Tu consulta sera enviada a <strong>{inviterName}</strong> por WhatsApp
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
            {isLoading ? 'Enviando...' : 'Enviar Consulta por WhatsApp'}
          </Button>

          <Typography
            variant="caption"
            color="text.secondary"
            sx={{ display: 'block', textAlign: 'center', mt: 2 }}
          >
            Se abrira WhatsApp con tu lista de productos
          </Typography>
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
    </Box>
  );
}
