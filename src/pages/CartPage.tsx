/**
 * CartPage — «Mi Selección», la última pantalla antes de pagar.
 *
 * Para el visitante anónimo del catálogo público esta pantalla ES el camino
 * al pago (ficha → carrito → pagar), así que su trabajo no es listar: es
 * decir con exactitud qué se puede cobrar y qué no.
 *
 * ## La pieza sin precio se nombra, no se disfraza de cero
 *
 * `precioCOP <= 0` significa «Consultar precio» en el catálogo. La versión
 * anterior de esta pantalla lo formateaba como «$ 0» y lo sumaba al total,
 * de modo que el cliente veía un cobro válido de cero pesos y llegaba a
 * «Pagar» para chocarse con el rechazo del servidor (`ZERO_TOTAL` en
 * `convex/ghl.ts`). Ahora esa pieza lleva su propia etiqueta ámbar, el borde
 * punteado la separa del resto, y un aviso dice en voz alta que no entra en
 * el total — el guardia (`hayPiezaSinPrecio`) sigue siendo el mismo, lo que
 * cambió es que la pantalla lo explica antes de que el cliente lo descubra.
 *
 * ## Las tres ramas de WhatsApp, en este orden
 *
 * `handleSendInquiry` ramifica cliente → invitado → staff, y el ORDEN es
 * carga viva: un `isCliente` evaluado después del `isGuest` mandaría al
 * cliente registrado por la línea de su invitador (que no tiene). Está
 * fijado por `tests/cartPageResumen.test.tsx`.
 */
import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Typography, IconButton } from '@mui/material';
import {
  AlertTriangle,
  Trash2,
  ChevronLeft,
  CreditCard,
  MessageCircle,
  Package,
  Gem,
  X,
  Link2,
} from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import { useCart } from '../hooks/useCart';
import { useWhatsAppContact } from '../hooks/useWhatsAppContact';
import { useCurrentAsesor } from '../hooks/useCurrentAsesor';
import VitrinaShareDialog from '../components/vitrina/VitrinaShareDialog';
import {
  useIsGuest,
  useIsCliente,
  useGuestCanSeePrices,
} from '../hooks/useAuth';
import { useCanShareVitrina } from '../hooks/usePermissions';
import { useThemeMode } from '../contexts/ThemeContext';
import AdminSelectDialog from '../components/cart/AdminSelectDialog';
import { useCurrency, useCurrencyFormat } from '../contexts/CurrencyContext';
import { Badge, Button, Card, EmptyState } from '../design-system';
import CheckoutSheet, {
  CheckoutPieza,
} from '../components/checkout/CheckoutSheet';
import { hayPiezaSinPrecio } from '../components/checkout/checkoutGuards';
import NoticeBox from '../components/checkout/NoticeBox';
import { leerOrigen } from '../utils/origenCheckout';

/** Metadatos de una pieza: `Ítem #544 · 4.10 ct` — la línea `spec` de DS3 §2.1. */
const metaSx = {
  fontFamily: 'var(--tm-font-mono)',
  fontSize: '0.6875rem',
  letterSpacing: '0.05em',
  color: 'var(--tm-muted)',
} as const;

/** Etiqueta de sección: mono, versalitas anchas (DS3 §2.1 `overline`). */
const overlineSx = {
  fontFamily: 'var(--tm-font-mono)',
  fontSize: '0.6875rem',
  fontWeight: 500,
  letterSpacing: '0.14em',
  textTransform: 'uppercase',
  color: 'var(--tm-muted)',
} as const;

/** Cifras: mono con `tabular-nums` para que ninguna columna baile (DS3 §2.2). */
const dataSx = {
  fontFamily: 'var(--tm-font-mono)',
  fontVariantNumeric: 'tabular-nums',
  fontWeight: 500,
} as const;

const hintSx = {
  display: 'block',
  textAlign: 'center',
  fontFamily: 'var(--tm-font-ui)',
  fontSize: '0.8125rem',
  color: 'var(--tm-muted)',
} as const;

export default function CartPage() {
  const { t, language } = useLanguage();
  const { formatCurrency } = useCurrencyFormat();
  const { multiplier } = useCurrency();
  const navigate = useNavigate();
  // DS3 pinta por `--tm-*` y el modo lo resuelve el CSS, así que ya no hay un
  // `isLight` que ramifique colores. La llamada se conserva porque el árbol
  // sigue dependiendo del provider de tema y quitarla cambiaría el orden de
  // hooks de esta página.
  useThemeMode();
  const isGuest = useIsGuest();
  const isCliente = useIsCliente();
  const canSeePrices = useGuestCanSeePrices();
  const canShareVitrina = useCanShareVitrina();

  const { cartItems, removeFromCart, clearCart, cartCount, getCartTotal } =
    useCart();

  const {
    openWhatsAppToInviter,
    openWhatsAppToAdmin,
    openWhatsAppToHouse,
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
      setSendError(t.cart.emptyError);
      return;
    }

    if (isCliente) {
      // Self-registered client: the whole selection goes to the house line.
      openWhatsAppToHouse(cartItems);
      return;
    }

    if (isGuest) {
      // Guest flow - send to inviter
      if (!hasInviter) {
        setSendError(t.cart.noInviter);
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
      setSendError(t.cart.sendFailed.replace('{name}', adminName));
    }
    // Don't clear cart - let user keep their selection
  };

  /** «3 piezas seleccionadas» / «1 pieza seleccionada». */
  const conteoPiezas =
    cartCount === 1
      ? t.cart.pieceSelectedOne
      : t.cart.piecesSelected.replace('{n}', String(cartCount));

  const piezasConPrecio = cartItems.filter((item) => item.precioCOP > 0).length;
  const haySinPrecio = hayPiezaSinPrecio(cartItems);

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
          aria-label={t.actions.back}
          sx={{
            color: 'var(--tm-text)',
            backgroundColor: 'var(--tm-well)',
            border: '1px solid var(--tm-border)',
            '&:hover': { borderColor: 'var(--tm-accent)' },
          }}
        >
          <ChevronLeft size={24} />
        </IconButton>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography
            component="h1"
            sx={{
              fontFamily: 'var(--tm-font-serif)',
              fontSize: '1.75rem',
              fontWeight: 500,
              lineHeight: 1.15,
              color: 'var(--tm-text)',
            }}
          >
            {t.cart.title}
          </Typography>
          {cartCount > 0 && (
            <Typography
              sx={{
                fontFamily: 'var(--tm-font-ui)',
                fontSize: '0.8125rem',
                color: 'var(--tm-muted)',
              }}
            >
              {conteoPiezas}
            </Typography>
          )}
        </Box>
        {cartCount > 0 && (
          <Button
            variant="plain"
            size="sm"
            onClick={clearCart}
            startIcon={
              <Box
                component="span"
                sx={{ display: 'inline-flex', color: 'var(--tm-danger)' }}
              >
                <Trash2 size={16} />
              </Box>
            }
            sx={{ color: 'var(--tm-muted)', flexShrink: 0 }}
          >
            {t.cart.clear}
          </Button>
        )}
      </Box>

      {/* Error — plain-language cause, next to the failure (DS3 §6.2) */}
      {(error || sendError) && (
        <Box sx={{ mb: 2 }}>
          <NoticeBox
            tone="danger"
            icon={<AlertTriangle size={18} color="var(--tm-danger)" />}
          >
            {error || sendError}
          </NoticeBox>
        </Box>
      )}

      {cartCount === 0 ? (
        <EmptyState
          icon={Package}
          title={t.cart.emptyTitle}
          action={{
            label: t.cart.emptyCta,
            onClick: () => navigate('/treasure'),
          }}
        />
      ) : (
        <>
          {/* Una tarjeta por pieza: el borde punteado ámbar marca la que no
              se puede cobrar, sin necesidad de leer la cifra. */}
          <Box
            sx={{
              display: 'flex',
              flexDirection: 'column',
              gap: 1.5,
              mb: haySinPrecio && canSeePrices ? 2 : 3,
            }}
          >
            {cartItems.map((item) => {
              const sinPrecio = hayPiezaSinPrecio([item]);
              const peso =
                typeof item.peso === 'number'
                  ? `${item.peso.toFixed(2)} ct`
                  : null;
              const meta = [
                t.cart.itemNumber.replace('{n}', String(item.item)),
                peso,
              ]
                .filter(Boolean)
                .join(' · ');

              return (
                <Card
                  key={item.itemId}
                  variant="outlined"
                  sx={
                    sinPrecio
                      ? { border: '1px dashed var(--tm-warning)' }
                      : undefined
                  }
                >
                  <Box
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 1.5,
                      p: 1.5,
                    }}
                  >
                    {/* El pozo: la pieza descansa sobre el piso de la vitrina.
                        Geometría fija para que la imagen no empuje nada al
                        llegar (CLS≈0, DS3 §4 regla 6). */}
                    <Box
                      sx={{
                        width: 68,
                        height: 68,
                        flexShrink: 0,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        overflow: 'hidden',
                        borderRadius: 'var(--tm-radius-well)',
                        backgroundColor: 'var(--tm-well)',
                        border: '1px solid var(--tm-border)',
                        color: 'var(--tm-subtle)',
                      }}
                    >
                      {item.thumbnailUrl ? (
                        <Box
                          component="img"
                          src={item.thumbnailUrl}
                          alt={item.nombre}
                          sx={{
                            width: '100%',
                            height: '100%',
                            objectFit: 'cover',
                          }}
                        />
                      ) : (
                        <Gem size={24} aria-hidden />
                      )}
                    </Box>

                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Typography
                        sx={{
                          fontFamily: 'var(--tm-font-serif)',
                          fontSize: '1.0625rem',
                          fontWeight: 500,
                          lineHeight: 1.2,
                          color: 'var(--tm-text)',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {item.nombre}
                      </Typography>
                      <Box
                        sx={{
                          display: 'flex',
                          alignItems: 'center',
                          flexWrap: 'wrap',
                          gap: 1,
                          mt: 0.5,
                        }}
                      >
                        <Typography component="span" sx={metaSx}>
                          {meta}
                        </Typography>
                        {item.certificateUrl && (
                          <Badge tone="accent" label={t.cart.certified} />
                        )}
                      </Box>
                    </Box>

                    {/* La columna de precio sólo existe para quien ya venía
                        viendo cifras: a un invitado `no_prices` nunca se le
                        mostró una, ni siquiera para decir que falta. */}
                    {canSeePrices && (
                      <Box
                        sx={{
                          flexShrink: 0,
                          textAlign: 'right',
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'flex-end',
                          gap: 0.5,
                        }}
                      >
                        {sinPrecio ? (
                          <>
                            <Badge tone="warn" label={t.cart.unpricedLabel} />
                            <Typography
                              sx={{
                                fontFamily: 'var(--tm-font-ui)',
                                fontSize: '0.8125rem',
                                fontWeight: 600,
                                color: 'var(--tm-warning)',
                              }}
                            >
                              {t.cart.unpricedAction}
                            </Typography>
                          </>
                        ) : (
                          <Typography
                            sx={{
                              ...dataSx,
                              fontSize: '0.9375rem',
                              color: 'var(--tm-accent)',
                            }}
                          >
                            {formatCurrency(item.precioCOP)}
                          </Typography>
                        )}
                      </Box>
                    )}

                    <IconButton
                      size="small"
                      aria-label={t.cart.remove}
                      onClick={() => removeFromCart(item.itemId)}
                      sx={{
                        flexShrink: 0,
                        color: 'var(--tm-subtle)',
                        '&:hover': {
                          color: 'var(--tm-danger)',
                          backgroundColor: 'var(--tm-well)',
                        },
                      }}
                    >
                      <X size={18} />
                    </IconButton>
                  </Box>
                </Card>
              );
            })}
          </Box>

          {/* El aviso ámbar: por qué el total no cuadra con la lista. */}
          {haySinPrecio && canSeePrices && (
            <Box sx={{ mb: 3 }}>
              <NoticeBox
                tone="warn"
                icon={<AlertTriangle size={18} color="var(--tm-warning)" />}
              >
                {t.cart.unpricedNotice}
              </NoticeBox>
            </Box>
          )}

          {/* Resumen — sólo para quien ve precios (igual que antes). */}
          {canSeePrices && (
            <Card variant="outlined" sx={{ mb: 3 }} data-testid="cart-resumen">
              <Box sx={{ p: 2 }}>
                <Box
                  sx={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'baseline',
                    gap: 2,
                  }}
                >
                  <Typography
                    sx={{
                      fontFamily: 'var(--tm-font-ui)',
                      fontSize: '0.8125rem',
                      color: 'var(--tm-muted)',
                    }}
                  >
                    {conteoPiezas}
                  </Typography>
                  <Typography
                    sx={{
                      ...metaSx,
                      letterSpacing: '0.02em',
                    }}
                  >
                    {t.cart.withPrice.replace('{n}', String(piezasConPrecio))}
                  </Typography>
                </Box>

                <Box
                  sx={{
                    height: '1px',
                    backgroundColor: 'var(--tm-hairline)',
                    my: 2,
                  }}
                />

                <Typography sx={overlineSx}>{t.cart.totalToCharge}</Typography>
                <Typography
                  sx={{
                    fontFamily: 'var(--tm-font-serif)',
                    fontVariantNumeric: 'tabular-nums',
                    fontSize: '2rem',
                    fontWeight: 500,
                    lineHeight: 1.1,
                    color: 'var(--tm-accent)',
                    mt: 0.5,
                  }}
                >
                  {formatCurrency(totals.cop)}
                </Typography>
                {multiplicadorMostrado !== 1 && (
                  <Typography sx={{ ...metaSx, mt: 0.5 }}>
                    {t.cart.multiplierLabel.replace(
                      '{m}',
                      String(multiplicadorMostrado),
                    )}
                  </Typography>
                )}
              </Box>
            </Card>
          )}

          {isCliente && (
            <Box sx={{ mb: 3 }}>
              <NoticeBox
                tone="info"
                icon={<MessageCircle size={18} color="var(--tm-accent)" />}
              >
                {t.cliente.cartBanner}
              </NoticeBox>
            </Box>
          )}

          {isGuest && inviterName && (
            <Box sx={{ mb: 3 }}>
              <NoticeBox
                tone="info"
                icon={<MessageCircle size={18} color="var(--tm-accent)" />}
              >
                {t.cart.inquiryTo.replace('{name}', inviterName)}
              </NoticeBox>
            </Box>
          )}

          {/* La UNA acción primaria de la pantalla (DS3 §6.3). */}
          <Button
            variant="primary"
            size="lg"
            fullWidth
            disabled={isLoading || cartCount === 0}
            onClick={handleSendInquiry}
            startIcon={<MessageCircle size={20} />}
          >
            {isLoading ? t.cart.sending : t.cart.sendWhatsApp}
          </Button>
          <Typography sx={{ ...hintSx, mt: 1.5 }}>{t.cart.sendHint}</Typography>

          {/* Pagar — only for a guest with an invitation on record (see
              `canPagar` above); staff and unresolvable guests keep WhatsApp
              only. */}
          {canPagar && (
            <>
              <Box sx={{ mt: 2 }}>
                <Button
                  variant="outlined"
                  size="lg"
                  fullWidth
                  onClick={() => setCheckoutOpen(true)}
                  startIcon={<CreditCard size={20} />}
                >
                  {t.cart.pay}
                </Button>
              </Box>
              <Typography sx={{ ...hintSx, mt: 1 }}>
                {t.cart.payHint}
              </Typography>
            </>
          )}

          {/* Staff + special guests: generate a public client link (Vitrina).
              El panel de multiplicador ya vive en `VitrinaShareDialog` — acá
              sólo se abre. */}
          {canShareVitrina && (
            <>
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 2,
                  my: 3,
                }}
              >
                <Box
                  sx={{
                    flex: 1,
                    height: '1px',
                    backgroundColor: 'var(--tm-hairline)',
                  }}
                />
                <Typography sx={metaSx}>{t.cart.shareDivider}</Typography>
                <Box
                  sx={{
                    flex: 1,
                    height: '1px',
                    backgroundColor: 'var(--tm-hairline)',
                  }}
                />
              </Box>
              <Button
                variant="outlined"
                size="lg"
                fullWidth
                disabled={cartCount === 0}
                onClick={() => setShareDialogOpen(true)}
                startIcon={<Link2 size={20} />}
              >
                {t.cart.shareTitle}
              </Button>
              <Typography sx={{ ...hintSx, mt: 1 }}>
                {t.cart.shareHint}
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
        lang={language}
        onClose={() => setCheckoutOpen(false)}
      />
    </Box>
  );
}
