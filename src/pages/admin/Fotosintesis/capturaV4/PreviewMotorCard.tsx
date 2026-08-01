/**
 * El panel del motor en W1: lo que se ve ANTES de comprar el lote.
 *
 * Presentacional puro — recibe el resultado de `precios.previewLote` y lo pinta.
 * Toda la aritmética vive en `convex/_lib/previewLote.ts`, testeada aparte.
 *
 * Tres decisiones de diseño que son en realidad decisiones del modelo:
 *
 *  - **El equilibrio real se muestra al lado del objetivo.** Es el número que la
 *    hoja no calcula, y el que deja ver que vender en `K` pierde plata.
 *  - **Un lote mixto no muestra precio.** Mostrar uno «provisional» sería
 *    inventar un divisor, que es justo el defecto que W1 viene a matar.
 *  - **Si el motor no puede responder, se dice por qué.** Un cero aquí es
 *    indistinguible de «gratis» — el defecto `E6 = 0` que cotizó el inventario
 *    entero sin absorber estructura.
 */
import { Box } from '@mui/material';
import { AlertTriangle, Info } from 'lucide-react';
import { getFoto, fontFamilies } from '../../../../design-system';

const COP = new Intl.NumberFormat('es-CO', {
  style: 'currency',
  currency: 'COP',
  maximumFractionDigits: 0,
});

const NUM = new Intl.NumberFormat('es-CO', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export interface AdvertenciaVista {
  codigo: string;
  nivel: 'info' | 'alerta';
  texto: string;
}

export type PreviewMotor =
  | { disponible: false; motivo: string }
  | {
      disponible: true;
      costoFijoUnitarioCOP: number;
      lotesActivos: number;
      /** Ausente cuando el lote no tiene costo capturado: no hay K que mostrar. */
      K?: number;
      cotizable: boolean;
      enRemate: boolean;
      pesoDelFijoPct: number;
      advertencias: AdvertenciaVista[];
      pisoCOP?: number;
      precioCOP?: number;
      regla?: 'remate' | 'objetivo';
      margenNetoPct?: number;
      multiplicador?: number;
      precioPorUnidadCOP?: number;
      precioSiFueraLaOtraCategoriaCOP?: number;
    };

export function PreviewMotorCard({
  preview,
}: {
  preview: PreviewMotor | undefined;
}) {
  const foto = getFoto('light');

  const shell = {
    display: 'grid',
    gap: '14px',
    padding: '16px 18px',
    background: foto.surfaces.inset,
    border: `1px solid ${foto.surfaces.rule}`,
    borderRadius: '14px',
  } as const;

  const rotulo = {
    fontSize: 9,
    fontWeight: 500,
    letterSpacing: '0.2em',
    textTransform: 'uppercase',
    color: foto.ink.tertiary,
  } as const;

  if (preview === undefined) {
    return (
      <Box sx={shell} data-testid="preview-cargando">
        <Box sx={rotulo}>Motor de precios</Box>
        <Box sx={{ fontSize: 12, color: foto.ink.tertiary }}>Calculando…</Box>
      </Box>
    );
  }

  if (!preview.disponible) {
    return (
      <Box sx={shell}>
        <Box sx={rotulo}>Motor de precios</Box>
        <Box
          data-testid="preview-no-disponible"
          sx={{ fontSize: 12, color: foto.ink.secondary, lineHeight: 1.5 }}
        >
          No se puede cotizar todavía: {preview.motivo}
        </Box>
      </Box>
    );
  }

  return (
    <Box sx={shell}>
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'baseline',
          gap: '12px',
        }}
      >
        <Box sx={rotulo}>Motor de precios</Box>
        {preview.regla ? (
          <Box
            data-testid="preview-regla"
            sx={{
              fontSize: 9,
              fontWeight: 600,
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
              color:
                preview.regla === 'remate'
                  ? foto.accent.deep
                  : foto.ink.tertiary,
            }}
          >
            {preview.regla === 'remate' ? 'Remate vigente' : 'Precio objetivo'}
          </Box>
        ) : null}
      </Box>

      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', sm: 'repeat(3, minmax(0, 1fr))' },
          gap: '12px',
        }}
      >
        {preview.K !== undefined ? (
          <Cifra
            testId="preview-k"
            etiqueta="K · costo absorbido"
            valor={COP.format(preview.K)}
            nota="Vender aquí pierde plata"
          />
        ) : null}
        {preview.pisoCOP !== undefined ? (
          <Cifra
            testId="preview-piso"
            etiqueta="Equilibrio real"
            valor={COP.format(preview.pisoCOP)}
            nota="Margen cero — la hoja no lo calcula"
          />
        ) : null}
        {preview.precioCOP !== undefined ? (
          <Cifra
            testId="preview-precio"
            etiqueta="Precio objetivo"
            valor={COP.format(preview.precioCOP)}
            nota={
              preview.margenNetoPct !== undefined
                ? `${NUM.format(preview.margenNetoPct)}% de margen neto real`
                : undefined
            }
            destacado
          />
        ) : null}
      </Box>

      <Box
        sx={{
          display: 'grid',
          gap: '6px',
          fontSize: 11,
          color: foto.ink.tertiary,
          fontFamily: fontFamilies.mono,
        }}
      >
        <Box data-testid="preview-fijo">
          Gasto fijo absorbido: {COP.format(preview.costoFijoUnitarioCOP)} ·
          repartido entre {preview.lotesActivos} lotes activos ·{' '}
          {NUM.format(preview.pesoDelFijoPct)}% de K
        </Box>
        {preview.multiplicador !== undefined ? (
          <Box data-testid="preview-multiplicador">
            Multiplicador {NUM.format(preview.multiplicador)}× sobre el costo —
            informativo, nunca un insumo
          </Box>
        ) : null}
        {preview.precioPorUnidadCOP !== undefined ? (
          <Box data-testid="preview-por-unidad">
            Referencia por unidad: {COP.format(preview.precioPorUnidadCOP)}
          </Box>
        ) : null}
        {preview.precioSiFueraLaOtraCategoriaCOP !== undefined ? (
          <Box data-testid="preview-otra-categoria">
            Con el divisor de la otra categoría sería{' '}
            {COP.format(preview.precioSiFueraLaOtraCategoriaCOP)}
          </Box>
        ) : null}
      </Box>

      {preview.advertencias.length ? (
        <Box sx={{ display: 'grid', gap: '8px' }}>
          {preview.advertencias.map((a) => {
            const esAlerta = a.nivel === 'alerta';
            const Icono = esAlerta ? AlertTriangle : Info;
            return (
              <Box
                key={a.codigo}
                data-testid={`advertencia-${a.codigo}`}
                data-nivel={a.nivel}
                sx={{
                  display: 'flex',
                  gap: '8px',
                  alignItems: 'flex-start',
                  fontSize: 11,
                  lineHeight: 1.5,
                  color: esAlerta ? foto.ink.primary : foto.ink.secondary,
                  padding: '8px 10px',
                  borderRadius: '9px',
                  border: `1px solid ${foto.surfaces.rule}`,
                  background: esAlerta ? foto.surfaces.edge : 'transparent',
                }}
              >
                <Icono size={13} style={{ flexShrink: 0, marginTop: 1 }} />
                <span>{a.texto}</span>
              </Box>
            );
          })}
        </Box>
      ) : null}
    </Box>
  );
}

function Cifra({
  testId,
  etiqueta,
  valor,
  nota,
  destacado,
}: {
  testId: string;
  etiqueta: string;
  valor: string;
  nota?: string;
  destacado?: boolean;
}) {
  const foto = getFoto('light');
  return (
    <Box data-testid={testId} sx={{ display: 'grid', gap: '3px', minWidth: 0 }}>
      <Box
        sx={{
          fontSize: 9,
          letterSpacing: '0.12em',
          textTransform: 'uppercase',
          color: foto.ink.tertiary,
        }}
      >
        {etiqueta}
      </Box>
      <Box
        sx={{
          fontSize: destacado ? 19 : 15,
          fontWeight: destacado ? 600 : 500,
          fontFamily: fontFamilies.mono,
          color: destacado ? foto.accent.deep : foto.ink.primary,
        }}
      >
        {valor}
      </Box>
      {nota ? (
        <Box sx={{ fontSize: 10, color: foto.ink.tertiary, lineHeight: 1.4 }}>
          {nota}
        </Box>
      ) : null}
    </Box>
  );
}
