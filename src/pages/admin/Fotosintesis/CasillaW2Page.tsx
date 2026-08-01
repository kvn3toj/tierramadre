/**
 * W2 «Cerebro Creativo» — la casilla.
 *
 * Se llega por QR desde `EscanearPage` (la pieza está en la mano) o desde la
 * grilla del lote. Clasificar es corregir defaults heredados, no digitar de
 * cero, así que la pantalla muestra primero lo que ya se sabe del lote.
 *
 * El campo que manda es **el costo unitario real**: capturado, jamás derivado
 * del lote. Prorratear cotizó «Choker + Piedra» en $67.499 cuando había costado
 * $119.999. La pantalla lo dice, para que nadie lo llene «a ojo» dividiendo.
 */
import { useEffect, useState, type FormEvent } from 'react';
import { Box } from '@mui/material';
import { useNavigate, useParams } from 'react-router-dom';

import { getFoto, fontFamilies } from '../../../design-system';
import { SegmentedControl } from '../../../design-system/components/SegmentedControl';
import { useAuthedConvexAction, convexApi } from '../../../lib/convex-safe';
import { useNotification } from '../../../contexts/NotificationContext';
import { FieldLabel } from './components/FieldLabel';
import { NumberInputWithCalc } from './components/NumberInputWithCalc';

interface CasillaVista {
  itemId: string;
  loteId: string;
  ordenEnLote: number;
  estadoCasilla: string;
  categoriaFiscal?: 'gema' | 'joya';
  costoUnitarioRealCOP?: number;
  renombre?: string;
  calidad?: string;
  color?: string;
  corte?: string;
  ct?: number;
  gradoRareza?: string;
  tipo?: string;
  tipoJoya?: string;
  gramaje?: number;
  rangoVentaEsperadoCOP?: number;
  completa: boolean;
  faltantes: string[];
}

const CALIDADES = [
  'comercial',
  'fina',
  'extrafina',
  'premium',
  'colección',
  'NO Oil',
];

export default function CasillaW2Page() {
  const foto = getFoto('light');
  const navigate = useNavigate();
  const { loteId, itemId } = useParams<{ loteId: string; itemId: string }>();
  const { notify } = useNotification();

  // Las dos lecturas son actions gateadas por rol (traen el costo por pieza),
  // así que se piden una vez al montar en vez de suscribirse.
  const pedirCasilla = useAuthedConvexAction(convexApi.casillas.porItemId);
  const pedirEstadoLote = useAuthedConvexAction(convexApi.casillas.estadoDelLote);
  const guardar = useAuthedConvexAction(convexApi.casillas.guardar);

  const [casilla, setCasilla] = useState<CasillaVista | null | undefined>(
    undefined,
  );
  const [estadoLote, setEstadoLote] = useState<
    { categoriaFiscalLote?: string; completeness: { total: number; completas: number } } | null
  >(null);

  useEffect(() => {
    if (!itemId) return;
    pedirCasilla({ itemId })
      .then((r) => setCasilla(r as CasillaVista | null))
      .catch(() => setCasilla(null));
  }, [itemId, pedirCasilla]);

  useEffect(() => {
    if (!loteId) return;
    pedirEstadoLote({ loteId })
      .then((r) => setEstadoLote(r as never))
      .catch(() => setEstadoLote(null));
  }, [loteId, pedirEstadoLote]);

  const [costoUnitarioRealCOP, setCosto] = useState<number | ''>('');
  const [categoriaFiscal, setCategoria] = useState<'gema' | 'joya' | ''>('');
  const [renombre, setRenombre] = useState('');
  const [calidad, setCalidad] = useState('');
  const [color, setColor] = useState('');
  const [corte, setCorte] = useState('');
  const [ct, setCt] = useState<number | ''>('');
  const [gradoRareza, setGradoRareza] = useState('');
  const [tipo, setTipo] = useState('');
  const [tipoJoya, setTipoJoya] = useState('');
  const [gramaje, setGramaje] = useState<number | ''>('');
  const [rangoVentaEsperadoCOP, setRango] = useState<number | ''>('');
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Prefill una sola vez, cuando llega la casilla. Sin esto, cada re-render de
  // la query pisaría lo que la persona está escribiendo.
  const [prefilled, setPrefilled] = useState(false);
  useEffect(() => {
    if (!casilla || prefilled) return;
    setCosto(casilla.costoUnitarioRealCOP ?? '');
    setCategoria(casilla.categoriaFiscal ?? '');
    setRenombre(casilla.renombre ?? '');
    setCalidad(casilla.calidad ?? '');
    setColor(casilla.color ?? '');
    setCorte(casilla.corte ?? '');
    setCt(casilla.ct ?? '');
    setGradoRareza(casilla.gradoRareza ?? '');
    setTipo(casilla.tipo ?? '');
    setTipoJoya(casilla.tipoJoya ?? '');
    setGramaje(casilla.gramaje ?? '');
    setRango(casilla.rangoVentaEsperadoCOP ?? '');
    setPrefilled(true);
  }, [casilla, prefilled]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!itemId) return;
    setGuardando(true);
    setError(null);
    try {
      const res = await guardar({
        itemId,
        costoUnitarioRealCOP:
          typeof costoUnitarioRealCOP === 'number'
            ? costoUnitarioRealCOP
            : undefined,
        categoriaFiscal: categoriaFiscal || undefined,
        renombre: renombre || undefined,
        calidad: calidad || undefined,
        color: color || undefined,
        corte: corte || undefined,
        ct: typeof ct === 'number' ? ct : undefined,
        gradoRareza: gradoRareza || undefined,
        tipo: tipo || undefined,
        tipoJoya: tipoJoya || undefined,
        gramaje: typeof gramaje === 'number' ? gramaje : undefined,
        rangoVentaEsperadoCOP:
          typeof rangoVentaEsperadoCOP === 'number'
            ? rangoVentaEsperadoCOP
            : undefined,
      });
      notify(
        res.completa
          ? `Casilla ${itemId} completa`
          : `Casilla ${itemId} guardada · falta ${res.faltantes.join(', ')}`,
        res.completa ? 'success' : 'info',
      );
      if (res.completa && loteId) {
        navigate(`/admin/fotosintesis/lots/${loteId}/casillas`);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo guardar');
    } finally {
      setGuardando(false);
    }
  }

  const inputSx = {
    width: '100%',
    background: foto.surfaces.inset,
    border: `1px solid ${foto.surfaces.rule}`,
    borderRadius: '9px',
    padding: '11px 14px',
    fontSize: 13,
    color: foto.ink.primary,
    outline: 'none',
  } as const;

  if (casilla === undefined) {
    return (
      <Box
        sx={{ padding: '36px 28px', color: foto.ink.tertiary, fontSize: 13 }}
      >
        Cargando casilla {itemId}…
      </Box>
    );
  }

  if (casilla === null) {
    return (
      <Box
        data-testid="casilla-inexistente"
        sx={{ padding: '36px 28px', color: foto.ink.secondary, fontSize: 13 }}
      >
        El ítem {itemId} no es una casilla del modelo v4.
      </Box>
    );
  }

  const esMixto = estadoLote?.categoriaFiscalLote === 'mixta';

  return (
    <Box
      component="form"
      onSubmit={onSubmit}
      sx={{ display: 'grid', gap: '20px', padding: '22px', maxWidth: 720 }}
    >
      <Box>
        <Box component="h1" sx={{ fontSize: 17, fontWeight: 600, margin: 0 }}>
          Casilla #{itemId}
        </Box>
        <Box
          sx={{ fontSize: 12, color: foto.ink.secondary, marginTop: '4px' }}
          data-testid="casilla-contexto"
        >
          Lote {casilla.loteId} · pieza {casilla.ordenEnLote}
          {estadoLote
            ? ` de ${estadoLote.completeness.total} · ${estadoLote.completeness.completas} clasificadas`
            : ''}
        </Box>
      </Box>

      {/* El costo, primero: es el dato que enciende el modelo. */}
      <Box
        data-testid="bloque-costo"
        sx={{
          display: 'grid',
          gap: '8px',
          padding: '16px 18px',
          background: foto.surfaces.inset,
          border: `1px solid ${foto.surfaces.rule}`,
          borderRadius: '14px',
        }}
      >
        <FieldLabel htmlFor="c-costo">
          Costo real de ESTA pieza (COP)
        </FieldLabel>
        <NumberInputWithCalc
          id="c-costo"
          value={costoUnitarioRealCOP}
          onChange={setCosto}
          format="currency"
          step={1000}
          min={0}
          ariaLabel="Costo unitario real de la pieza en COP"
        />
        <Box sx={{ fontSize: 11, color: foto.ink.tertiary, lineHeight: 1.5 }}>
          Lo que costó esta pieza, no lo que sale de dividir el lote. Prorratear
          cotizó «Choker + Piedra» en $67.499 cuando había costado $119.999.
        </Box>
      </Box>

      {esMixto ? (
        <Box data-testid="categoria-por-casilla">
          <FieldLabel>Categoría fiscal de esta pieza</FieldLabel>
          <SegmentedControl
            ariaLabel="Categoría fiscal de la casilla"
            options={[
              { value: 'gema', label: 'Gema' },
              { value: 'joya', label: 'Joya' },
            ]}
            value={categoriaFiscal}
            onChange={(n) => setCategoria(n as 'gema' | 'joya')}
          />
          <Box
            sx={{ fontSize: 11, color: foto.ink.tertiary, marginTop: '6px' }}
          >
            El lote es mixto, así que cada pieza declara la suya.
          </Box>
        </Box>
      ) : null}

      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' },
          gap: '16px',
        }}
      >
        <Box>
          <FieldLabel htmlFor="c-renombre">Renombre</FieldLabel>
          <Box
            component="input"
            id="c-renombre"
            value={renombre}
            onChange={(e) => setRenombre((e.target as HTMLInputElement).value)}
            sx={inputSx}
          />
        </Box>
        <Box>
          <FieldLabel>Calidad</FieldLabel>
          <SegmentedControl
            ariaLabel="Calidad de la gema"
            allowOther
            otherLabel="Otra…"
            options={CALIDADES.map((c) => ({ value: c, label: c }))}
            value={calidad}
            onChange={setCalidad}
          />
        </Box>
        <Box>
          <FieldLabel htmlFor="c-color">Color</FieldLabel>
          <Box
            component="input"
            id="c-color"
            value={color}
            onChange={(e) => setColor((e.target as HTMLInputElement).value)}
            sx={inputSx}
          />
        </Box>
        <Box>
          <FieldLabel htmlFor="c-corte">Corte / forma</FieldLabel>
          <Box
            component="input"
            id="c-corte"
            value={corte}
            onChange={(e) => setCorte((e.target as HTMLInputElement).value)}
            sx={inputSx}
          />
        </Box>
        <Box>
          <FieldLabel htmlFor="c-ct">Quilates</FieldLabel>
          <NumberInputWithCalc
            id="c-ct"
            value={ct}
            onChange={setCt}
            format="carat"
            step={0.1}
            min={0}
            ariaLabel="Quilates de la pieza"
          />
        </Box>
        <Box>
          <FieldLabel htmlFor="c-rareza">Grado de rareza</FieldLabel>
          <Box
            component="input"
            id="c-rareza"
            value={gradoRareza}
            onChange={(e) =>
              setGradoRareza((e.target as HTMLInputElement).value)
            }
            sx={inputSx}
          />
        </Box>
        <Box>
          {/* Nace heredado del bloque Gema del lote: clasificar es CORREGIR
              defaults, no digitar de cero. */}
          <FieldLabel htmlFor="c-tipo">Tipo de gema</FieldLabel>
          <Box
            component="input"
            id="c-tipo"
            value={tipo}
            onChange={(e) => setTipo((e.target as HTMLInputElement).value)}
            sx={inputSx}
          />
        </Box>
      </Box>

      {(categoriaFiscal || casilla.categoriaFiscal) === 'joya' ? (
        <Box
          data-testid="bloque-joya-casilla"
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' },
            gap: '16px',
          }}
        >
          <Box>
            <FieldLabel htmlFor="c-tipojoya">Tipo de joya</FieldLabel>
            <Box
              component="input"
              id="c-tipojoya"
              value={tipoJoya}
              onChange={(e) =>
                setTipoJoya((e.target as HTMLInputElement).value)
              }
              sx={inputSx}
            />
          </Box>
          <Box>
            <FieldLabel htmlFor="c-gramaje">Gramaje</FieldLabel>
            <NumberInputWithCalc
              id="c-gramaje"
              value={gramaje}
              onChange={setGramaje}
              format="decimal"
              step={0.1}
              min={0}
              ariaLabel="Gramaje de la joya"
            />
          </Box>
        </Box>
      ) : null}

      <Box>
        <FieldLabel htmlFor="c-rango">
          Rango de venta esperado (COP) · opcional
        </FieldLabel>
        <NumberInputWithCalc
          id="c-rango"
          value={rangoVentaEsperadoCOP}
          onChange={setRango}
          format="currency"
          step={10000}
          min={0}
          ariaLabel="Rango de venta esperado en COP"
        />
      </Box>

      {casilla.faltantes.length ? (
        <Box
          data-testid="faltantes"
          sx={{
            fontSize: 11,
            color: foto.ink.secondary,
            fontFamily: fontFamilies.mono,
          }}
        >
          Falta para completar: {casilla.faltantes.join(' · ')}
        </Box>
      ) : null}

      {error ? (
        <Box data-testid="error-casilla" sx={{ fontSize: 12 }}>
          {error}
        </Box>
      ) : null}

      <Box
        component="button"
        type="submit"
        disabled={guardando}
        data-testid="guardar-casilla"
        sx={{
          padding: '13px 18px',
          borderRadius: '10px',
          border: 'none',
          fontSize: 13,
          fontWeight: 600,
          cursor: guardando ? 'not-allowed' : 'pointer',
          background: foto.accent.primary,
          color: '#fff',
          justifySelf: 'start',
        }}
      >
        {guardando ? 'Guardando…' : 'Guardar casilla'}
      </Box>
    </Box>
  );
}
