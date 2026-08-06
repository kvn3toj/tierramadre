import { useMemo, useState } from 'react';
import { Box } from '@mui/material';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, Plus, Boxes } from 'lucide-react';

import { getFoto, fontFamilies } from '../../../design-system';
import { useConvexQuery, convexApi } from '../../../lib/convex-safe';
import { readFreshSessionToken } from '../../../utils/sessionToken';
import type { Doc } from '../../../../convex/_generated/dataModel';
import { SubLoteCard } from './components/SubLoteCard';
import { SubLoteDrawer } from './components/SubLoteDrawer';

const formatCOP = (n: number): string =>
  new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0,
  }).format(n);

export default function FotosintesisSubLotesPage() {
  const foto = getFoto('light');
  const { loteId: loteIdParam } = useParams();
  const loteId = loteIdParam ?? '';

  const lot = useConvexQuery(
    convexApi.lots.getByLoteId,
    loteId
      ? { loteId, sessionToken: readFreshSessionToken() ?? undefined }
      : 'skip',
  );
  const subLotes = useConvexQuery(
    convexApi.subLotes.listByParent,
    loteId ? { parentLoteId: loteId } : 'skip',
  );
  const products = useConvexQuery(
    convexApi.products.listByLote,
    loteId ? { loteId } : 'skip',
  );

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editing, setEditing] = useState<Doc<'subLotes'> | null>(null);

  const productById = useMemo(() => {
    const map = new Map<string, Doc<'productInventory'>>();
    for (const p of products ?? []) map.set(p.itemId, p);
    return map;
  }, [products]);

  const openCreate = () => {
    setEditing(null);
    setDrawerOpen(true);
  };
  const openEdit = (sub: Doc<'subLotes'>) => {
    setEditing(sub);
    setDrawerOpen(true);
  };

  if (lot === undefined || subLotes === undefined || products === undefined) {
    return (
      <Box
        sx={{
          maxWidth: 1320,
          marginX: 'auto',
          padding: { xs: '24px 16px', md: '36px 28px' },
          color: foto.ink.tertiary,
          fontSize: 13,
        }}
      >
        Cargando sub-lotes de {loteId}…
      </Box>
    );
  }

  if (lot === null) {
    return (
      <Box
        sx={{
          maxWidth: 1320,
          marginX: 'auto',
          padding: { xs: '24px 16px', md: '36px 28px' },
        }}
      >
        <Box sx={{ fontSize: 14, color: foto.ink.secondary }}>
          No encontramos el lote {loteId}.
        </Box>
        <Box
          component={Link}
          to="/admin/fotosintesis"
          sx={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            marginTop: '12px',
            color: foto.accent.deep,
            fontWeight: 600,
            textDecoration: 'none',
          }}
        >
          <ArrowLeft size={14} /> Volver
        </Box>
      </Box>
    );
  }

  const gateMsg =
    lot.estado === 'abierto'
      ? 'Cierra o publica el lote antes de agrupar sub-lotes.'
      : lot.estado === 'cancelado'
        ? 'Este lote está cancelado — no admite sub-lotes.'
        : null;
  const gated = gateMsg !== null;

  const activeSubs = subLotes.filter((s) => s.estado === 'activa');
  const archivedSubs = subLotes.filter((s) => s.estado === 'archivada');
  const ordered = [...activeSubs, ...archivedSubs];

  return (
    <Box
      sx={{
        maxWidth: 1320,
        marginX: 'auto',
        padding: { xs: '24px 16px', md: '36px 28px' },
      }}
    >
      <Box
        component={Link}
        to="/admin/fotosintesis"
        sx={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '6px',
          fontSize: 12,
          fontWeight: 600,
          color: foto.ink.tertiary,
          textDecoration: 'none',
          marginBottom: '18px',
          '&:hover': { color: foto.accent.deep },
        }}
      >
        <ArrowLeft size={14} /> Fotosíntesis
      </Box>

      {/* Header */}
      <Box
        sx={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: '16px',
          justifyContent: 'space-between',
          alignItems: 'flex-end',
          marginBottom: '24px',
        }}
      >
        <Box>
          <Box
            sx={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              color: foto.accent.deep,
            }}
          >
            <Boxes size={14} /> Sub-lotes
          </Box>
          <Box
            component="h1"
            sx={{
              fontSize: { xs: 26, md: 34 },
              fontWeight: 600,
              letterSpacing: '-0.03em',
              margin: '8px 0 6px',
              color: foto.ink.primary,
            }}
          >
            Lote{' '}
            <Box component="span" sx={{ fontFamily: fontFamilies.mono }}>
              {lot.loteId}
            </Box>
          </Box>
          <Box sx={{ fontSize: 13, color: foto.ink.secondary }}>
            {lot.estado} · {lot.unidadesDeclaradas} unidades ·{' '}
            {formatCOP(lot.costoTotalCOP)}
          </Box>
        </Box>

        <Box
          component="button"
          type="button"
          disabled={gated}
          onClick={openCreate}
          sx={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '7px',
            padding: '11px 16px',
            borderRadius: '10px',
            border: 'none',
            background: foto.accent.primary,
            color: '#fff',
            fontSize: 13,
            fontWeight: 600,
            cursor: gated ? 'not-allowed' : 'pointer',
            opacity: gated ? 0.5 : 1,
            '&:hover:not(:disabled)': { filter: 'brightness(1.05)' },
          }}
        >
          <Plus size={15} /> Nuevo sub-lote
        </Box>
      </Box>

      {gateMsg ? (
        <Box
          role="note"
          sx={{
            fontSize: 13,
            color: foto.ink.secondary,
            background: foto.surfaces.inset,
            border: `1px solid ${foto.surfaces.edge}`,
            borderRadius: '12px',
            padding: '16px 18px',
            marginBottom: '24px',
            lineHeight: 1.55,
          }}
        >
          {gateMsg}
        </Box>
      ) : null}

      {ordered.length === 0 ? (
        <Box
          sx={{
            textAlign: 'center',
            padding: '48px 24px',
            border: `1px dashed ${foto.surfaces.rule}`,
            borderRadius: '16px',
            color: foto.ink.tertiary,
          }}
        >
          <Boxes size={28} strokeWidth={1.5} />
          <Box sx={{ fontSize: 14, fontWeight: 600, marginTop: '12px' }}>
            Todavía no hay sub-lotes
          </Box>
          <Box sx={{ fontSize: 12.5, marginTop: '4px' }}>
            {gated
              ? gateMsg
              : 'Agrupa ítems de este lote para venderlos juntos, conservando la trazabilidad al lote original.'}
          </Box>
        </Box>
      ) : (
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: {
              xs: '1fr',
              md: 'repeat(2, 1fr)',
              xl: 'repeat(3, 1fr)',
            },
            gap: '16px',
            alignItems: 'start',
          }}
        >
          {ordered.map((sub) => (
            <SubLoteCard
              key={sub._id}
              subLote={sub}
              productById={productById}
              onEdit={openEdit}
            />
          ))}
        </Box>
      )}

      <SubLoteDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        parentLoteId={loteId}
        items={products}
        subLote={editing}
      />
    </Box>
  );
}
