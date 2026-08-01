/**
 * La grilla de casillas de un lote v4 — el tablero de W2.
 *
 * Muestra tres cosas que la hoja no puede: cuántas piezas faltan por clasificar,
 * si la suma de sus costos cuadra con el costo del lote, y el gate de
 * publicación.
 *
 * El aviso de descuadre es PERSISTENTE y no se puede resolver desde acá. Hay 5
 * lotes reales (7, 15, 17, 19, 30) con diferencias sin explicación entre las dos
 * fuentes; un botón de «ajustar» las escondería, que es exactamente cómo
 * llevaban meses sin que nadie las viera.
 */
import { useState } from 'react';
import { Box } from '@mui/material';
import { useNavigate, useParams } from 'react-router-dom';
import { AlertTriangle, Check } from 'lucide-react';

import { getFoto, fontFamilies } from '../../../design-system';
import {
  useConvexQuery,
  useAuthedConvexAction,
  convexApi,
} from '../../../lib/convex-safe';
import { useNotification } from '../../../contexts/NotificationContext';

const COP = new Intl.NumberFormat('es-CO', {
  style: 'currency',
  currency: 'COP',
  maximumFractionDigits: 0,
});

export default function CasillasLotePage() {
  const foto = getFoto('light');
  const navigate = useNavigate();
  const { loteId } = useParams<{ loteId: string }>();
  const { notify } = useNotification();

  const estado = useConvexQuery(
    convexApi.casillas.estadoDelLote,
    loteId ? { loteId } : 'skip',
  );
  const publicar = useAuthedConvexAction(convexApi.casillas.publicar);
  const [publicando, setPublicando] = useState(false);

  if (estado === undefined) {
    return (
      <Box
        sx={{ padding: '36px 28px', color: foto.ink.tertiary, fontSize: 13 }}
      >
        Cargando lote {loteId}…
      </Box>
    );
  }
  if (estado === null) {
    return (
      <Box sx={{ padding: '36px 28px', fontSize: 13 }}>
        No existe el lote {loteId}.
      </Box>
    );
  }

  async function onPublicar(forzarParcial: boolean) {
    if (!loteId) return;
    const motivo = forzarParcial
      ? window.prompt(
          'Publicar con casillas sin clasificar. ¿Por qué? (queda registrado)',
        )
      : undefined;
    if (forzarParcial && !motivo) return;
    setPublicando(true);
    try {
      const res = await publicar({
        loteId,
        forzarParcial,
        motivo: motivo ?? undefined,
      });
      notify(
        res.parcial
          ? `Lote publicado PARCIAL — faltan ${res.faltantes.join(', ')}`
          : 'Lote publicado',
        res.parcial ? 'warning' : 'success',
      );
    } catch (err) {
      notify(
        err instanceof Error ? err.message : 'No se pudo publicar',
        'error',
      );
    } finally {
      setPublicando(false);
    }
  }

  const { completeness, conciliacion } = estado;

  return (
    <Box sx={{ display: 'grid', gap: '18px', padding: '22px', maxWidth: 900 }}>
      <Box>
        <Box component="h1" sx={{ fontSize: 17, fontWeight: 600, margin: 0 }}>
          Clasificación · {loteId}
        </Box>
        <Box
          data-testid="score"
          sx={{ fontSize: 13, color: foto.ink.secondary, marginTop: '4px' }}
        >
          {completeness.completas} de {completeness.total} casillas clasificadas
          ({completeness.pct}%)
        </Box>
      </Box>

      {/* El aviso de descuadre: persistente, sin botón de arreglar. */}
      {conciliacion.aviso ? (
        <Box
          data-testid="aviso-conciliacion"
          sx={{
            display: 'flex',
            gap: '10px',
            alignItems: 'flex-start',
            padding: '12px 14px',
            borderRadius: '12px',
            border: `1px solid ${foto.surfaces.rule}`,
            background: foto.surfaces.edge,
            fontSize: 12,
            lineHeight: 1.55,
            color: foto.ink.primary,
          }}
        >
          <AlertTriangle size={15} style={{ flexShrink: 0, marginTop: 1 }} />
          <span>{conciliacion.aviso}</span>
        </Box>
      ) : (
        <Box
          data-testid="conciliacion-ok"
          sx={{
            display: 'flex',
            gap: '8px',
            alignItems: 'center',
            fontSize: 12,
            color: foto.ink.tertiary,
          }}
        >
          <Check size={14} /> Los costos capturados cuadran con el lote (
          {COP.format(conciliacion.suma)}).
        </Box>
      )}

      {estado.publicacionParcial ? (
        <Box
          data-testid="marca-parcial"
          sx={{
            fontSize: 11,
            color: foto.ink.secondary,
            fontFamily: fontFamilies.mono,
          }}
        >
          Publicado parcial · {estado.publicacionParcial.motivo} · faltaban{' '}
          {estado.publicacionParcial.casillasIncompletas.join(', ')}
        </Box>
      ) : null}

      <Box sx={{ display: 'grid', gap: '8px' }}>
        {estado.casillas.map((c) => {
          const completa = !completeness.incompletas.includes(c.itemId);
          return (
            <Box
              key={c.itemId}
              component="button"
              type="button"
              data-testid={`casilla-${c.itemId}`}
              onClick={() =>
                navigate(
                  `/admin/fotosintesis/lots/${loteId}/casillas/${c.itemId}`,
                )
              }
              sx={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                gap: '12px',
                padding: '12px 14px',
                borderRadius: '11px',
                border: `1px solid ${completa ? foto.surfaces.rule : foto.accent.primary}`,
                background: foto.surfaces.inset,
                cursor: 'pointer',
                textAlign: 'left',
                width: '100%',
              }}
            >
              <Box sx={{ display: 'grid', gap: '2px', minWidth: 0 }}>
                <Box
                  sx={{
                    fontSize: 13,
                    fontWeight: 500,
                    color: foto.ink.primary,
                  }}
                >
                  #{c.itemId} {c.renombre ? `· ${c.renombre}` : ''}
                </Box>
                <Box sx={{ fontSize: 11, color: foto.ink.tertiary }}>
                  {completa
                    ? `${c.calidad ?? ''} · ${c.costoUnitarioRealCOP ? COP.format(c.costoUnitarioRealCOP) : ''}`
                    : 'Sin clasificar'}
                </Box>
              </Box>
              <Box
                sx={{
                  fontSize: 10,
                  letterSpacing: '0.1em',
                  textTransform: 'uppercase',
                  color: completa ? foto.ink.tertiary : foto.accent.deep,
                }}
              >
                {completa ? 'Lista' : 'Pendiente'}
              </Box>
            </Box>
          );
        })}
      </Box>

      <Box sx={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
        <Box
          component="button"
          type="button"
          data-testid="publicar"
          disabled={!completeness.listoParaPublicar || publicando}
          onClick={() => onPublicar(false)}
          sx={{
            padding: '12px 18px',
            borderRadius: '10px',
            border: 'none',
            fontSize: 13,
            fontWeight: 600,
            cursor: completeness.listoParaPublicar ? 'pointer' : 'not-allowed',
            opacity: completeness.listoParaPublicar ? 1 : 0.45,
            background: foto.accent.primary,
            color: '#fff',
          }}
        >
          Publicar lote
        </Box>
        {!completeness.listoParaPublicar && completeness.total > 0 ? (
          <Box
            component="button"
            type="button"
            data-testid="publicar-parcial"
            disabled={publicando}
            onClick={() => onPublicar(true)}
            sx={{
              padding: '12px 18px',
              borderRadius: '10px',
              border: `1px solid ${foto.surfaces.rule}`,
              background: 'transparent',
              fontSize: 13,
              color: foto.ink.secondary,
              cursor: 'pointer',
            }}
          >
            Publicar parcial…
          </Box>
        ) : null}
      </Box>
    </Box>
  );
}
