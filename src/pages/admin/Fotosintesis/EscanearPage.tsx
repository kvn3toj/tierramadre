import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Button,
  CircularProgress,
  IconButton,
  TextField,
  Typography,
} from '@mui/material';
import {
  Camera,
  ExternalLink,
  Keyboard,
  PackagePlus,
  Receipt,
  RotateCcw,
  ScanLine,
  Tag,
  X,
} from 'lucide-react';
import { getFoto, fontFamilies } from '../../../design-system';
import { FotoTopbar, FOTO_TOPBAR_HEIGHT } from './components/FotoTopbar';
import {
  convexApi,
  convexReady,
  useConvexQuery,
} from '../../../lib/convex-safe';
import { parseTmQr } from '../../../lib/qr/parseTmQr';
import { useQrScanner } from '../../../hooks/useQrScanner';

const COP = new Intl.NumberFormat('es-CO', {
  style: 'currency',
  currency: 'COP',
  maximumFractionDigits: 0,
});

/**
 * Fotosíntesis · Escanear — camera QR entry point (Fase 1).
 *
 * Point the camera at a product QR (`tierramadre.app/product/{item}`), the item
 * resolves against Convex (`products.getByItem`) and its ficha appears. The
 * movement actions (compra / kardex / venta) are wired here, navigating the
 * operator straight to the matching flow once the item resolves. A manual
 * item-number field is always available as a fallback for damaged codes or
 * browsers without camera access.
 */
export default function EscanearPage() {
  const foto = getFoto('light');
  const navigate = useNavigate();

  const [scannedItemId, setScannedItemId] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [manual, setManual] = useState('');

  const handleDecode = useCallback((text: string) => {
    const parsed = parseTmQr(text);
    if (parsed.kind === 'item') {
      setNotice(null);
      setScannedItemId(parsed.itemId);
    } else if (parsed.kind === 'vitrina') {
      setNotice('Ese QR es un enlace de Vitrina, no un ítem.');
    } else if (parsed.kind === 'grupo') {
      // A lote/sublote bundle card's QR (grupoId) — not a single stock item,
      // so there's nothing here to resolve movements against.
      setNotice(
        `Ese QR es un lote/sublote agrupado ("${parsed.groupId}"), no un ítem individual. Verlo en tierramadre.app/grupo/${parsed.groupId}.`,
      );
    } else {
      setNotice('Ese código no corresponde a un ítem de Tierra Mädre.');
    }
  }, []);

  const { videoRef, state, error, start, stop } = useQrScanner({
    onDecode: handleDecode,
  });

  // Auto-start the camera while no result is showing; release it otherwise.
  useEffect(() => {
    if (!scannedItemId) {
      start();
    } else {
      stop();
    }
  }, [scannedItemId, start, stop]);

  const item = useConvexQuery(
    convexApi.products.getByItem,
    scannedItemId ? { itemId: scannedItemId } : 'skip',
  );

  const lotItem = useConvexQuery(
    convexApi.lotItems.getByItemId,
    scannedItemId ? { itemId: scannedItemId } : 'skip',
  );

  const submitManual = useCallback(() => {
    const parsed = parseTmQr(manual);
    if (parsed.kind === 'item') {
      setNotice(null);
      setScannedItemId(parsed.itemId);
    } else {
      setNotice('Escribe un número de ítem válido (ej. B-001-G1 o 368).');
    }
  }, [manual]);

  const reset = useCallback(() => {
    setScannedItemId(null);
    setManual('');
    setNotice(null);
  }, []);

  const priceLabel = useMemo(
    () =>
      item && typeof item.precioCOP === 'number' && item.precioCOP > 0
        ? COP.format(item.precioCOP)
        : null,
    [item],
  );

  const showResult = scannedItemId != null;
  const loading = showResult && item === undefined && convexReady;
  const notFound = showResult && item === null;

  return (
    <Box
      sx={{
        minHeight: '100dvh',
        background: foto.surfaces.canvas,
        color: foto.ink.primary,
      }}
    >
      <FotoTopbar
        crumbs={[
          { label: 'Fotosíntesis', to: '/admin/fotosintesis' },
          { label: 'Escanear' },
        ]}
      />

      <Box
        sx={{
          maxWidth: 560,
          mx: 'auto',
          px: 2,
          pt: `${FOTO_TOPBAR_HEIGHT + 16}px`,
          pb: 6,
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25, mb: 0.5 }}>
          <ScanLine size={22} color={foto.accent.primary} />
          <Typography
            sx={{ fontSize: '20px', fontWeight: 600, color: foto.ink.primary }}
          >
            Escanear QR
          </Typography>
        </Box>
        <Typography sx={{ fontSize: '13px', color: foto.ink.tertiary, mb: 2 }}>
          Apunta la cámara al código del ítem para ver su ficha y registrar
          movimientos.
        </Typography>

        {!showResult && (
          <>
            {/* Camera viewport */}
            <Box
              sx={{
                position: 'relative',
                width: '100%',
                aspectRatio: '1 / 1',
                borderRadius: 3,
                overflow: 'hidden',
                background: '#0B0D0C',
                border: `1px solid ${foto.surfaces.rule}`,
              }}
            >
              <video
                ref={videoRef}
                muted
                playsInline
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
              {/* Reticle */}
              <Box
                sx={{
                  position: 'absolute',
                  inset: '18%',
                  border: `2px solid ${foto.accent.primary}`,
                  borderRadius: 2,
                  boxShadow: '0 0 0 100vmax rgba(0,0,0,0.35)',
                  pointerEvents: 'none',
                }}
              />
              {state !== 'scanning' && (
                <Box
                  sx={{
                    position: 'absolute',
                    inset: 0,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 1,
                    color: '#fff',
                  }}
                >
                  {state === 'error' ? (
                    <Camera size={30} color="#fff" opacity={0.85} />
                  ) : (
                    <CircularProgress size={26} sx={{ color: '#fff' }} />
                  )}
                  <Typography
                    sx={{
                      fontSize: '12.5px',
                      px: 3,
                      textAlign: 'center',
                      opacity: 0.9,
                    }}
                  >
                    {state === 'error' ? error : 'Iniciando cámara…'}
                  </Typography>
                </Box>
              )}
            </Box>

            {notice && (
              <Typography
                sx={{
                  mt: 1.5,
                  fontSize: '13px',
                  color: foto.status.sold,
                  textAlign: 'center',
                }}
              >
                {notice}
              </Typography>
            )}

            {/* Manual fallback */}
            <Box sx={{ mt: 2.5 }}>
              <Box
                sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}
              >
                <Keyboard size={16} color={foto.ink.tertiary} />
                <Typography
                  sx={{ fontSize: '12.5px', color: foto.ink.tertiary }}
                >
                  ¿Código dañado? Escribe el número de ítem
                </Typography>
              </Box>
              <Box sx={{ display: 'flex', gap: 1 }}>
                <TextField
                  size="small"
                  fullWidth
                  placeholder="B-001-G1"
                  value={manual}
                  onChange={(e) => setManual(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') submitManual();
                  }}
                  InputProps={{
                    sx: { fontFamily: fontFamilies.mono, fontSize: '14px' },
                  }}
                />
                <Button
                  variant="outlined"
                  onClick={submitManual}
                  disabled={!manual.trim()}
                  sx={{ whiteSpace: 'nowrap' }}
                >
                  Buscar
                </Button>
              </Box>
            </Box>
          </>
        )}

        {showResult && (
          <Box
            sx={{
              mt: 1,
              border: `1px solid ${foto.surfaces.rule}`,
              borderRadius: 3,
              overflow: 'hidden',
              background: foto.surfaces.canvas,
            }}
          >
            {/* Header row */}
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                px: 2,
                py: 1.25,
                borderBottom: `1px solid ${foto.surfaces.rule}`,
              }}
            >
              <Typography
                sx={{
                  fontFamily: fontFamilies.mono,
                  fontSize: '14px',
                  color: foto.accent.primary,
                }}
              >
                {scannedItemId}
              </Typography>
              <IconButton size="small" onClick={reset} aria-label="Cerrar">
                <X size={18} color={foto.ink.tertiary} />
              </IconButton>
            </Box>

            {loading && (
              <Box sx={{ display: 'flex', justifyContent: 'center', py: 5 }}>
                <CircularProgress
                  size={26}
                  sx={{ color: foto.accent.primary }}
                />
              </Box>
            )}

            {notFound && (
              <Box sx={{ px: 2, py: 4, textAlign: 'center' }}>
                <Typography
                  sx={{ fontSize: '14px', color: foto.ink.secondary, mb: 0.5 }}
                >
                  No hay ningún ítem registrado con ese código todavía.
                </Typography>
                <Typography
                  sx={{ fontSize: '12.5px', color: foto.ink.tertiary }}
                >
                  Es una etiqueta nueva sin registrar (eso llega en la Fase 3).
                </Typography>
              </Box>
            )}

            {item && (
              <Box sx={{ p: 2 }}>
                <Box sx={{ display: 'flex', gap: 1.5 }}>
                  {item.fotoUrl ? (
                    <Box
                      component="img"
                      src={item.fotoUrl}
                      alt={item.nombre ?? scannedItemId ?? ''}
                      sx={{
                        width: 84,
                        height: 84,
                        objectFit: 'cover',
                        borderRadius: 2,
                        flexShrink: 0,
                        background: foto.surfaces.rule,
                      }}
                    />
                  ) : (
                    <Box
                      sx={{
                        width: 84,
                        height: 84,
                        borderRadius: 2,
                        flexShrink: 0,
                        background: foto.surfaces.rule,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <Camera size={22} color={foto.ink.tertiary} />
                    </Box>
                  )}
                  <Box sx={{ minWidth: 0 }}>
                    <Typography
                      sx={{
                        fontSize: '15px',
                        fontWeight: 600,
                        color: foto.ink.primary,
                      }}
                    >
                      {item.nombre || 'Ítem sin nombre'}
                    </Typography>
                    <Typography
                      sx={{
                        fontSize: '12.5px',
                        color: foto.ink.tertiary,
                        mt: '2px',
                      }}
                    >
                      {[item.peso, item.color, item.calidad]
                        .filter(Boolean)
                        .join(' · ') || '—'}
                    </Typography>
                    <Box
                      sx={{
                        display: 'flex',
                        gap: 1,
                        mt: 0.75,
                        flexWrap: 'wrap',
                      }}
                    >
                      {item.estado && (
                        <Chip
                          label={item.estado}
                          color={foto.accent.primary}
                          foto={foto}
                        />
                      )}
                      {item.loteId && (
                        <Chip
                          label={`Lote ${item.loteId}`}
                          color={foto.ink.tertiary}
                          foto={foto}
                        />
                      )}
                    </Box>
                    {priceLabel && (
                      <Typography
                        sx={{
                          fontSize: '14px',
                          fontWeight: 600,
                          color: foto.accent.deep,
                          mt: 0.75,
                        }}
                      >
                        {priceLabel}
                      </Typography>
                    )}
                  </Box>
                </Box>

                {item.medidas && (
                  <Typography
                    sx={{
                      fontSize: '12.5px',
                      color: foto.ink.secondary,
                      mt: 1.5,
                    }}
                  >
                    Medidas: {item.medidas}
                  </Typography>
                )}

                <Button
                  fullWidth
                  variant="text"
                  endIcon={<ExternalLink size={16} />}
                  onClick={() => navigate(`/product/${scannedItemId}`)}
                  sx={{
                    mt: 1.5,
                    justifyContent: 'center',
                    color: foto.accent.deep,
                  }}
                >
                  Ver detalle completo
                </Button>
              </Box>
            )}

            {/* Movement actions — navigate to Compra/Kardex/Venta once the item has resolved */}
            {item && (
              <Box sx={{ px: 2, pb: 2, pt: 0 }}>
                <Typography
                  sx={{
                    fontSize: '11.5px',
                    color: foto.ink.tertiary,
                    mb: 1,
                    letterSpacing: '0.02em',
                  }}
                >
                  REGISTRAR MOVIMIENTO
                </Typography>
                <Box
                  sx={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(3, 1fr)',
                    gap: 1,
                  }}
                >
                  <ActionButton
                    icon={<PackagePlus size={18} />}
                    label="Compra"
                    foto={foto}
                    onClick={
                      lotItem
                        ? () =>
                            navigate(
                              `/admin/fotosintesis/lots/${lotItem.loteId}/items/${lotItem._id}/edit`,
                            )
                        : undefined
                    }
                  />
                  <ActionButton
                    icon={<Receipt size={18} />}
                    label="Kardex"
                    foto={foto}
                    onClick={() =>
                      navigate(
                        `/admin/fotosintesis/movimientos?itemId=${scannedItemId}`,
                      )
                    }
                  />
                  <ActionButton
                    icon={<Tag size={18} />}
                    label="Venta"
                    foto={foto}
                    onClick={() =>
                      navigate(
                        `/admin/fotosintesis/sales/new?itemId=${scannedItemId}`,
                      )
                    }
                  />
                </Box>
              </Box>
            )}

            <Box sx={{ px: 2, pb: 2 }}>
              <Button
                fullWidth
                variant="contained"
                startIcon={<RotateCcw size={18} />}
                onClick={reset}
                sx={{
                  background: foto.accent.primary,
                  '&:hover': { background: foto.accent.deep },
                }}
              >
                Escanear otro
              </Button>
            </Box>
          </Box>
        )}
      </Box>
    </Box>
  );
}

function Chip({
  label,
  color,
  foto,
}: {
  label: string;
  color: string;
  foto: ReturnType<typeof getFoto>;
}) {
  return (
    <Box
      sx={{
        px: 1,
        py: '2px',
        borderRadius: 1,
        fontSize: '11px',
        color,
        border: `1px solid ${foto.surfaces.rule}`,
        background: foto.surfaces.canvas,
      }}
    >
      {label}
    </Box>
  );
}

function ActionButton({
  icon,
  label,
  foto,
  onClick,
}: {
  icon: ReactNode;
  label: string;
  foto: ReturnType<typeof getFoto>;
  onClick?: () => void;
}) {
  return (
    <Button
      disabled={!onClick}
      onClick={onClick}
      variant="outlined"
      sx={{
        flexDirection: 'column',
        gap: 0.5,
        py: 1.25,
        color: foto.ink.secondary,
        borderColor: foto.surfaces.rule,
        textTransform: 'none',
        fontSize: '12.5px',
      }}
    >
      {icon}
      {label}
    </Button>
  );
}
