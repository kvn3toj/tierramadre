/**
 * Los costos variables del lote, capturados como documentos con concepto.
 *
 * No es un campo «costos variables: $9.091». Es una lista de ajustes con nombre,
 * porque el punto es poder decir DE QUÉ fue cada uno. En la hoja, 17 filas traen
 * $9.091 hardcodeado mientras el propio modelo calcula $6.579, y nadie sabe cuál
 * es cuál ni de dónde salió ninguno.
 */
import { Box } from '@mui/material';
import { Plus, X } from 'lucide-react';
import { getFoto, fontFamilies } from '../../../../design-system';
import { FieldLabel } from '../components/FieldLabel';
import { NumberInputWithCalc } from '../components/NumberInputWithCalc';

export interface CostoVariable {
  concepto: string;
  montoCOP: number;
}

const SUGERENCIAS = ['Viáticos', 'Packing', 'Domicilio'];

const COP = new Intl.NumberFormat('es-CO', {
  style: 'currency',
  currency: 'COP',
  maximumFractionDigits: 0,
});

export function CostosVariablesEditor({
  value,
  onChange,
}: {
  value: CostoVariable[];
  onChange: (next: CostoVariable[]) => void;
}) {
  const foto = getFoto('light');
  const total = value.reduce((acc, c) => acc + (c.montoCOP || 0), 0);

  function actualizar(i: number, patch: Partial<CostoVariable>) {
    onChange(value.map((c, idx) => (idx === i ? { ...c, ...patch } : c)));
  }

  return (
    <Box sx={{ display: 'grid', gap: '10px' }}>
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'baseline',
        }}
      >
        <FieldLabel>Costos variables</FieldLabel>
        <Box
          data-testid="costos-variables-total"
          sx={{
            fontSize: 11,
            fontFamily: fontFamilies.mono,
            color: foto.ink.tertiary,
          }}
        >
          {total > 0 ? COP.format(total) : '—'}
        </Box>
      </Box>

      {value.map((c, i) => (
        <Box
          key={i}
          data-testid={`costo-variable-${i}`}
          sx={{
            display: 'grid',
            gridTemplateColumns: 'minmax(0, 1fr) 150px 34px',
            gap: '8px',
            alignItems: 'center',
          }}
        >
          <Box
            component="input"
            aria-label={`Concepto del costo variable ${i + 1}`}
            placeholder="Concepto (viáticos, packing…)"
            value={c.concepto}
            onChange={(e) =>
              actualizar(i, { concepto: (e.target as HTMLInputElement).value })
            }
            sx={{
              width: '100%',
              background: foto.surfaces.inset,
              border: `1px solid ${foto.surfaces.rule}`,
              borderRadius: '9px',
              padding: '10px 12px',
              fontSize: 12,
              color: foto.ink.primary,
              outline: 'none',
            }}
          />
          <NumberInputWithCalc
            value={c.montoCOP === 0 ? '' : c.montoCOP}
            onChange={(next) =>
              actualizar(i, { montoCOP: typeof next === 'number' ? next : 0 })
            }
            format="currency"
            step={1000}
            min={0}
            ariaLabel={`Monto del costo variable ${i + 1}`}
          />
          <Box
            component="button"
            type="button"
            aria-label={`Quitar costo variable ${i + 1}`}
            onClick={() => onChange(value.filter((_, idx) => idx !== i))}
            sx={{
              display: 'grid',
              placeItems: 'center',
              height: 34,
              borderRadius: '8px',
              border: `1px solid ${foto.surfaces.rule}`,
              background: 'transparent',
              color: foto.ink.tertiary,
              cursor: 'pointer',
            }}
          >
            <X size={13} />
          </Box>
        </Box>
      ))}

      <Box sx={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
        {SUGERENCIAS.map((s) => (
          <Box
            key={s}
            component="button"
            type="button"
            onClick={() => onChange([...value, { concepto: s, montoCOP: 0 }])}
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              padding: '6px 10px',
              borderRadius: '999px',
              border: `1px solid ${foto.surfaces.rule}`,
              background: 'transparent',
              color: foto.ink.secondary,
              fontSize: 11,
              cursor: 'pointer',
            }}
          >
            <Plus size={11} /> {s}
          </Box>
        ))}
        <Box
          component="button"
          type="button"
          data-testid="agregar-costo-variable"
          onClick={() => onChange([...value, { concepto: '', montoCOP: 0 }])}
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            padding: '6px 10px',
            borderRadius: '999px',
            border: `1px dashed ${foto.surfaces.rule}`,
            background: 'transparent',
            color: foto.ink.tertiary,
            fontSize: 11,
            cursor: 'pointer',
          }}
        >
          <Plus size={11} /> Otro
        </Box>
      </Box>
    </Box>
  );
}
