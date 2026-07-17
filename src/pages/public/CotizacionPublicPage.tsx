/**
 * CotizacionPublicPage — public online view of a cotización (`/c/:quotationNumber`).
 *
 * This is the destination of the QR code embedded in the 1080×1920 product
 * cards. It is unauthenticated: it fetches the cotización by number from the
 * public read endpoint and renders the same ProductCard(s), scaled to fit.
 * Styling mirrors the `/cuentas/cotizaciones` document look.
 */

import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Box, Typography, CircularProgress } from '@mui/material';
import { FileText } from 'lucide-react';
import {
  ProductCard,
  ScaledCard,
} from '../../components/cotizacion/quotation-card';
import { brandColors } from '../../components/cotizacion/constants';
import { formatCotizacionCurrency } from '../../hooks/useCotizacion';
import type { CotizacionProduct } from '../../hooks/useCotizacion';
import { qeFont, qeTokens } from '../../design-system';

interface PublicProductLine {
  itemNumber: number;
  name: string;
  precioCOP: number;
  selectedPreviewUrl?: string;
  cantidad?: number;
  descripcion?: string;
  certificadoUrl?: string;
  numeroCO?: string;
  imagen?: string;
}

interface PublicCotizacion {
  quotationNumber: string;
  asesorName: string;
  clientName: string;
  total: number;
  expiryDate: string;
  imageUrl: string;
  products: PublicProductLine[];
}

export default function CotizacionPublicPage() {
  const { quotationNumber } = useParams<{ quotationNumber: string }>();
  const [data, setData] = useState<PublicCotizacion | null>(null);
  const [status, setStatus] = useState<'loading' | 'ok' | 'notfound' | 'error'>(
    'loading',
  );

  useEffect(() => {
    if (!quotationNumber) {
      setStatus('notfound');
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const resp = await fetch(
          `/api/cotizacion-save?action=public&quotationNumber=${encodeURIComponent(
            quotationNumber,
          )}`,
        );
        if (resp.status === 404) {
          if (!cancelled) setStatus('notfound');
          return;
        }
        if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
        const json = await resp.json();
        if (!cancelled) {
          setData(json as PublicCotizacion);
          setStatus('ok');
        }
      } catch {
        if (!cancelled) setStatus('error');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [quotationNumber]);

  const cards: CotizacionProduct[] = useMemo(() => {
    if (!data?.products) return [];
    return data.products.map((p, i) => ({
      id: `${p.itemNumber}-${i}`,
      itemNumber: p.itemNumber,
      name: p.name,
      peso: '',
      color: '',
      calidad: '',
      talla: '',
      precioCOP: p.precioCOP,
      imagen: p.imagen,
      selectedPreviewUrl: p.selectedPreviewUrl || undefined,
      isJewelry: false,
      cantidad: p.cantidad ?? 1,
      descripcion: p.descripcion || undefined,
      certificadoUrl: p.certificadoUrl || undefined,
      numeroCO: p.numeroCO || undefined,
    }));
  }, [data]);

  return (
    <Box
      sx={{
        minHeight: '100dvh',
        bgcolor: '#F4F5F4',
        pb: 8,
      }}
    >
      {/* Header — matches the cotización document gradient */}
      <Box
        sx={{
          px: { xs: 2.5, sm: 4 },
          py: { xs: 3, sm: 4 },
          background: `linear-gradient(135deg, ${brandColors.emeraldDark} 0%, ${qeTokens.light.text} 100%)`,
          color: '#fff',
          display: 'flex',
          alignItems: 'center',
          gap: 2,
        }}
      >
        <Box
          sx={{
            width: 48,
            height: 48,
            borderRadius: 2,
            bgcolor: 'rgba(255,255,255,0.14)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          <FileText size={26} color="#fff" />
        </Box>
        <Box sx={{ minWidth: 0 }}>
          <Typography
            sx={{
              fontFamily: qeFont.serif,
              fontSize: { xs: '1.4rem', sm: '1.8rem' },
              fontWeight: 500,
              lineHeight: 1.1,
            }}
          >
            Cotización
          </Typography>
          <Typography
            sx={{
              fontFamily: qeFont.mono,
              fontSize: '0.8rem',
              opacity: 0.85,
              letterSpacing: '0.06em',
            }}
          >
            {quotationNumber}
          </Typography>
        </Box>
      </Box>

      {/* Body */}
      <Box sx={{ maxWidth: 760, mx: 'auto', px: { xs: 2, sm: 3 }, pt: 4 }}>
        {status === 'loading' && (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 10 }}>
            <CircularProgress sx={{ color: brandColors.emerald }} />
          </Box>
        )}

        {status === 'notfound' && (
          <StateMessage
            title="Cotización no encontrada"
            body="El enlace puede haber expirado o el número no es correcto."
          />
        )}

        {status === 'error' && (
          <StateMessage
            title="No se pudo cargar la cotización"
            body="Revisa tu conexión e inténtalo de nuevo."
          />
        )}

        {status === 'ok' && data && (
          <>
            {data.clientName && (
              <Typography
                sx={{
                  textAlign: 'center',
                  color: qeTokens.light.subtle,
                  mb: 3,
                  fontSize: '0.95rem',
                }}
              >
                Preparada para{' '}
                <Box
                  component="span"
                  sx={{ color: qeTokens.light.text, fontWeight: 600 }}
                >
                  {data.clientName}
                </Box>
              </Typography>
            )}

            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {cards.map((product) => (
                <ScaledCard key={product.id}>
                  <ProductCard
                    product={product}
                    quotationNumber={data.quotationNumber}
                    formatPrice={(cop) => formatCotizacionCurrency(cop, 'COP')}
                    positionLabel={undefined}
                  />
                </ScaledCard>
              ))}
            </Box>

            {/* Total */}
            <Box
              sx={{
                mt: 5,
                p: 3,
                borderRadius: 3,
                bgcolor: '#fff',
                border: '1px solid rgba(0,0,0,0.06)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <Typography
                sx={{
                  fontFamily: qeFont.mono,
                  textTransform: 'uppercase',
                  letterSpacing: '0.1em',
                  color: qeTokens.light.subtle,
                  fontSize: '0.85rem',
                  fontWeight: 600,
                }}
              >
                Total
              </Typography>
              <Typography
                sx={{
                  fontFamily: qeFont.mono,
                  fontSize: '1.8rem',
                  fontWeight: 700,
                  color: qeTokens.light.text,
                }}
              >
                {formatCotizacionCurrency(data.total, 'COP')}
              </Typography>
            </Box>

            <Typography
              sx={{
                textAlign: 'center',
                mt: 4,
                fontFamily: qeFont.serif,
                letterSpacing: '0.16em',
                color: qeTokens.light.subtle,
              }}
            >
              TIERRA MÄDRE · Esmeraldas con ADN de Paz
            </Typography>
          </>
        )}
      </Box>
    </Box>
  );
}

const StateMessage: React.FC<{ title: string; body: string }> = ({
  title,
  body,
}) => (
  <Box sx={{ textAlign: 'center', py: 10 }}>
    <Typography
      sx={{
        fontFamily: qeFont.serif,
        fontSize: '1.4rem',
        color: qeTokens.light.text,
        mb: 1,
      }}
    >
      {title}
    </Typography>
    <Typography sx={{ color: qeTokens.light.subtle }}>{body}</Typography>
  </Box>
);
