/**
 * W1 «Cerebro Racional» — la captura del lote en el modelo SOT v4.
 *
 * Ruta propia (`/admin/fotosintesis/lots/new-v4`) detrás de `VITE_CAPTURA_V4`.
 * NO reemplaza a `CapturaLotePage`: los dos modelos se contradicen (v4 captura el
 * costo por pieza; el viejo lo prorratea por preponderancia) y esa página, de
 * 3315 líneas, es la que hoy da de comer.
 *
 * Dos diferencias que se ven en pantalla:
 *
 *  1. **La categoría fiscal es el PRIMER campo**, y hasta que no se elige no se
 *     puede capturar nada más. Es el gate de la regla dura §4.1: es el dato que
 *     decide el divisor (0,60 gema · 0,41 joya), y su ausencia —columna vacía en
 *     102 filas de la hoja— es lo que dejó 60 de 63 lotes mal cotizados.
 *  2. **El motor cotiza mientras se escribe.** El precio deja de ser algo que
 *     alguien calcula después en otra hoja: la consecuencia económica de la
 *     compra se ve antes de hacerla.
 *
 * Guardar no captura piezas: crea las casillas y manda a clasificarlas (W2).
 */
import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { Box } from '@mui/material';
import { useNavigate } from 'react-router-dom';

import { getFoto, fontFamilies } from '../../../design-system';
import { SegmentedControl } from '../../../design-system/components/SegmentedControl';
import {
  useConvexQuery,
  useAuthedConvexAction,
  convexApi,
} from '../../../lib/convex-safe';
import { useNotification } from '../../../contexts/NotificationContext';
import { useGoogleAuth } from '../../../contexts/GoogleAuthContext';
import { FieldLabel } from './components/FieldLabel';
import { NumberInputWithCalc } from './components/NumberInputWithCalc';
import { EntityPicker } from './components/EntityPicker';
import {
  PreviewMotorCard,
  type PreviewMotor,
} from './capturaV4/PreviewMotorCard';
import { CostosVariablesEditor } from './capturaV4/CostosVariablesEditor';
import type { CostoVariable } from './capturaV4/CostosVariablesEditor';
import {
  BOVEDAS,
  sanitizeSedeCode,
  type Sede,
} from '../../../data/vocabularies';
import type { Id } from '../../../../convex/_generated/dataModel';

type CategoriaFiscal = 'gema' | 'joya' | 'mixta';

interface ProviderRow {
  _id: Id<'providers'>;
  nombreORazonSocial: string;
  nit?: string;
  cedula?: string;
  tipo: string;
}

const hoyIso = () => new Date().toISOString().slice(0, 10);

export default function CapturaLoteV4Page() {
  const foto = getFoto('light');
  const navigate = useNavigate();
  const { notify } = useNotification();
  const { user } = useGoogleAuth();

  // El gate. Nada más se habilita hasta que esté.
  const [categoriaFiscal, setCategoriaFiscal] = useState<CategoriaFiscal | ''>(
    '',
  );

  const [sede, setSede] = useState<Sede | ''>('');
  const [providerId, setProviderId] = useState<Id<'providers'> | null>(null);
  const [fechaRecepcion, setFechaRecepcion] = useState(hoyIso());
  const [costoCompraCOP, setCostoCompraCOP] = useState<number | ''>('');
  const [unidadesDeclaradas, setUnidadesDeclaradas] = useState<number | ''>(1);
  const [costosVariables, setCostosVariables] = useState<CostoVariable[]>([]);
  const [abonoCOP, setAbonoCOP] = useState<number | ''>('');
  const [renombreLote, setRenombreLote] = useState('');

  const [formaPago, setFormaPago] = useState('contado');
  const [metodoContado, setMetodoContado] = useState('efectivo');
  const [fechaVencimiento, setFechaVencimiento] = useState('');
  const [numeroCuotas, setNumeroCuotas] = useState<number | ''>('');

  // Bloque joya — obligatorio cuando la categoría es joya.
  const [tipoJoya, setTipoJoya] = useState('');
  const [mineral, setMineral] = useState('');
  const [gramaje, setGramaje] = useState<number | ''>('');
  const [costoPorGramoCOP, setCostoPorGramoCOP] = useState<number | ''>('');
  const [cantidadJoyas, setCantidadJoyas] = useState<number | ''>('');

  // Bloque gema — OPCIONAL, al revés que el de joya: es descriptivo, no un
  // insumo del costo. De acá hereda cada casilla su `tipo`.
  const [tipoGema, setTipoGema] = useState('');
  const [cantidadGemas, setCantidadGemas] = useState<number | ''>('');
  const [corteGema, setCorteGema] = useState('');
  const [pesoTotalCt, setPesoTotalCt] = useState<number | ''>('');
  const [calidadPromedio, setCalidadPromedio] = useState('');
  const [medidaPromedio, setMedidaPromedio] = useState('');
  const [pesoGemaPromedioCt, setPesoGemaPromedioCt] = useState<number | ''>('');
  const [costoPorCtCOP, setCostoPorCtCOP] = useState<number | ''>('');

  // Descripción de COMPRA. `renombreLote` es el alias comercial de W2: son dos.
  const [nombre, setNombre] = useState('');
  // Cuándo se PAGÓ. `fechaVencimiento` (cuándo se debe) es otra cosa.
  const [fechaPago, setFechaPago] = useState('');

  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const providers = useConvexQuery(convexApi.providers.list, {}) as
    | ProviderRow[]
    | undefined;
  const crearLote = useAuthedConvexAction(convexApi.lotsV4.create);

  const costosVariablesCOP = useMemo(
    () => costosVariables.reduce((acc, c) => acc + (c.montoCOP || 0), 0),
    [costosVariables],
  );

  // El preview es una ACTION gateada por rol, no una query reactiva: devuelve la
  // estructura de costos y eso no puede quedar detrás de una convención del
  // frontend. Como no es reactivo, se pide a mano y se debouncea — si no, cada
  // tecla sería una verificación de token contra Google.
  const pedirPreview = useAuthedConvexAction(convexApi.precios.previewLote);
  const [preview, setPreview] = useState<PreviewMotor | undefined>(undefined);

  const listoParaCotizar =
    !!categoriaFiscal &&
    typeof costoCompraCOP === 'number' &&
    costoCompraCOP > 0;

  useEffect(() => {
    if (!listoParaCotizar) {
      setPreview(undefined);
      return;
    }
    let cancelado = false;
    const t = setTimeout(() => {
      pedirPreview({
        costoCompraCOP: costoCompraCOP as number,
        costosVariablesCOP,
        categoriaFiscal: categoriaFiscal as CategoriaFiscal,
        unidadesDeclaradas:
          typeof unidadesDeclaradas === 'number' && unidadesDeclaradas > 0
            ? unidadesDeclaradas
            : undefined,
        fecha: fechaRecepcion,
      })
        .then((r) => {
          // Descartar respuestas de un tecleo anterior: sin esto, una respuesta
          // lenta puede pisar a una más nueva y mostrar el precio equivocado.
          if (!cancelado) setPreview(r as PreviewMotor);
        })
        .catch(() => {
          if (!cancelado) setPreview(undefined);
        });
    }, 350);
    return () => {
      cancelado = true;
      clearTimeout(t);
    };
  }, [
    listoParaCotizar,
    costoCompraCOP,
    costosVariablesCOP,
    categoriaFiscal,
    unidadesDeclaradas,
    fechaRecepcion,
    pedirPreview,
  ]);

  // El bloque gema entra solo si está entero. Es opcional a nivel modelo, así
  // que «a medias» significa «no lo capturaron», no «error».
  const gemaCompleta =
    categoriaFiscal !== 'joya' &&
    !!tipoGema &&
    !!corteGema &&
    !!calidadPromedio &&
    typeof cantidadGemas === 'number' &&
    cantidadGemas > 0 &&
    typeof pesoTotalCt === 'number' &&
    pesoTotalCt > 0 &&
    typeof pesoGemaPromedioCt === 'number' &&
    pesoGemaPromedioCt > 0 &&
    typeof costoPorCtCOP === 'number' &&
    costoPorCtCOP > 0;

  const joyaCompleta =
    categoriaFiscal !== 'joya' ||
    (!!tipoJoya &&
      !!mineral &&
      typeof gramaje === 'number' &&
      gramaje > 0 &&
      typeof costoPorGramoCOP === 'number' &&
      costoPorGramoCOP > 0);

  const canSubmit =
    !!categoriaFiscal &&
    !!sede &&
    !!providerId &&
    typeof costoCompraCOP === 'number' &&
    costoCompraCOP > 0 &&
    typeof unidadesDeclaradas === 'number' &&
    unidadesDeclaradas >= 1 &&
    joyaCompleta &&
    (formaPago !== 'credito' || !!fechaVencimiento) &&
    (formaPago !== 'contado' || !!metodoContado) &&
    !guardando;

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!canSubmit || !providerId || !categoriaFiscal) return;
    setGuardando(true);
    setError(null);
    try {
      const res = await crearLote({
        sede,
        providerId,
        fechaRecepcion,
        categoriaFiscal,
        costoCompraCOP: costoCompraCOP as number,
        unidadesDeclaradas: unidadesDeclaradas as number,
        formaPago,
        metodoContado: formaPago === 'contado' ? metodoContado : undefined,
        fechaVencimiento:
          formaPago === 'credito' ? fechaVencimiento : undefined,
        numeroCuotas:
          typeof numeroCuotas === 'number' ? numeroCuotas : undefined,
        costosVariables: costosVariables.length ? costosVariables : undefined,
        abonoCOP: typeof abonoCOP === 'number' ? abonoCOP : undefined,
        joya:
          categoriaFiscal === 'joya'
            ? {
                tipoJoya,
                mineral,
                gramaje: gramaje as number,
                costoPorGramoCOP: costoPorGramoCOP as number,
                cantidadJoyas:
                  typeof cantidadJoyas === 'number' ? cantidadJoyas : undefined,
              }
            : undefined,
        // Solo si está COMPLETO: el bloque es opcional, pero a medias no
        // valida — y mandar la mitad haría reventar la mutation con un error
        // que el operador no pidió.
        gema: gemaCompleta
          ? {
              tipoGema,
              cantidadGemas: cantidadGemas as number,
              corteGema,
              pesoTotalCt: pesoTotalCt as number,
              calidadPromedio,
              medidaPromedio,
              pesoGemaPromedioCt: pesoGemaPromedioCt as number,
              costoPorCtCOP: costoPorCtCOP as number,
            }
          : undefined,
        nombre: nombre || undefined,
        fechaPago: fechaPago || undefined,
        renombreLote: renombreLote || undefined,
        operadorNombre: user?.name ?? undefined,
      });
      notify(
        `Lote ${res.loteId} creado con ${res.casillas.length} casillas por clasificar`,
        'success',
      );
      // A la grilla de casillas, NO a `/lots/:id`: esa es la página vieja, que
      // ahora rechaza los lotes v4 — guardar terminaba en un cartel sin salida.
      navigate(`/admin/fotosintesis/lots/${res.loteId}/casillas`);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'No se pudo guardar el lote',
      );
    } finally {
      setGuardando(false);
    }
  }

  const rotulo = {
    fontSize: 9,
    fontWeight: 500,
    letterSpacing: '0.2em',
    textTransform: 'uppercase',
    color: foto.ink.tertiary,
  } as const;

  const inputSx = {
    width: '100%',
    background: foto.surfaces.inset,
    border: `1px solid ${foto.surfaces.rule}`,
    borderRadius: '9px',
    padding: '11px 14px',
    fontSize: 13,
    color: foto.ink.primary,
    fontFamily: fontFamilies.mono,
    outline: 'none',
    '&:focus': {
      borderColor: foto.accent.primary,
      boxShadow: `0 0 0 3px ${foto.accent.glow}`,
    },
  } as const;

  return (
    <Box
      component="form"
      onSubmit={onSubmit}
      sx={{ display: 'grid', gap: '22px', padding: '22px', maxWidth: 1180 }}
    >
      <Box>
        <Box component="h1" sx={{ fontSize: 17, fontWeight: 600, margin: 0 }}>
          Nuevo lote · Cerebro Racional
        </Box>
        <Box sx={{ fontSize: 12, color: foto.ink.secondary, marginTop: '4px' }}>
          Los datos financieros del lote completo. Al guardar se crean las
          casillas; las piezas se clasifican después, una por una.
        </Box>
      </Box>

      {/* ── El gate: categoría fiscal ───────────────────────────── */}
      <Box
        data-testid="paso-categoria"
        sx={{
          display: 'grid',
          gap: '10px',
          padding: '16px 18px',
          background: foto.surfaces.inset,
          border: `1px solid ${categoriaFiscal ? foto.surfaces.rule : foto.accent.primary}`,
          borderRadius: '14px',
        }}
      >
        <Box sx={rotulo}>Paso 1 · Categoría fiscal</Box>
        <SegmentedControl
          ariaLabel="Categoría fiscal del lote"
          options={[
            { value: 'gema', label: 'Gema suelta' },
            { value: 'joya', label: 'Joya' },
            { value: 'mixta', label: 'Mixta' },
          ]}
          value={categoriaFiscal}
          onChange={(next) => setCategoriaFiscal(next as CategoriaFiscal)}
        />
        <Box sx={{ fontSize: 11, color: foto.ink.tertiary, lineHeight: 1.5 }}>
          Desde ago-2026 gema y joya pagan comisión más IVA (÷0,41 al objetivo):
          la categoría ya no mueve el precio, pero sí el multiplicador de remate
          y el reporte fiscal. «Mixta» es válido — el régimen se resuelve
          casilla por casilla.
        </Box>
      </Box>

      {!categoriaFiscal ? (
        <Box
          data-testid="bloqueado-sin-categoria"
          sx={{ fontSize: 12, color: foto.ink.tertiary }}
        >
          Elegí la categoría fiscal para continuar.
        </Box>
      ) : (
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', md: 'minmax(0, 1fr) 360px' },
            gap: '22px',
            alignItems: 'start',
          }}
        >
          {/* ── Columna izquierda: el lote ───────────────────────── */}
          <Box sx={{ display: 'grid', gap: '18px', minWidth: 0 }}>
            <Box sx={rotulo}>Paso 2 · Datos del lote</Box>

            <Box>
              <FieldLabel>Bóveda</FieldLabel>
              <SegmentedControl
                ariaLabel="Bóveda del lote"
                allowOther
                otherLabel="Otra…"
                sanitizeOther={sanitizeSedeCode}
                options={BOVEDAS.map((b) => ({
                  value: b.code,
                  label: b.label,
                }))}
                value={sede}
                onChange={(next) => setSede(next as Sede)}
              />
            </Box>

            <EntityPicker<ProviderRow>
              label="Proveedor"
              placeholder="Buscar por nombre o NIT…"
              options={providers ?? []}
              loading={providers === undefined}
              value={providers?.find((p) => p._id === providerId) ?? null}
              onChange={(next) => setProviderId(next?._id ?? null)}
              getOptionId={(p) => p._id}
              getOptionLabel={(p) => p.nombreORazonSocial}
              getOptionMeta={(p) => p.tipo ?? null}
              getOptionAvatar={(p) =>
                p.nombreORazonSocial.slice(0, 1).toUpperCase()
              }
            />

            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' },
                gap: '18px',
              }}
            >
              <Box>
                <FieldLabel htmlFor="v4-fecha">Fecha de recepción</FieldLabel>
                <Box
                  component="input"
                  id="v4-fecha"
                  type="date"
                  value={fechaRecepcion}
                  onChange={(e) =>
                    setFechaRecepcion((e.target as HTMLInputElement).value)
                  }
                  sx={inputSx}
                />
              </Box>
              <Box>
                <FieldLabel htmlFor="v4-costo">
                  Costo de compra (COP)
                </FieldLabel>
                <NumberInputWithCalc
                  id="v4-costo"
                  value={costoCompraCOP}
                  onChange={setCostoCompraCOP}
                  format="currency"
                  step={1000}
                  min={0}
                  ariaLabel="Costo de compra del lote en COP"
                />
              </Box>
            </Box>

            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' },
                gap: '18px',
              }}
            >
              <Box>
                <FieldLabel htmlFor="v4-unidades">
                  Unidades (casillas a crear)
                </FieldLabel>
                <NumberInputWithCalc
                  id="v4-unidades"
                  value={unidadesDeclaradas}
                  onChange={setUnidadesDeclaradas}
                  format="integer"
                  step={1}
                  min={1}
                  ariaLabel="Unidades declaradas del lote"
                />
              </Box>
              <Box>
                <FieldLabel htmlFor="v4-renombre">Alias interno</FieldLabel>
                <Box
                  component="input"
                  id="v4-renombre"
                  value={renombreLote}
                  onChange={(e) =>
                    setRenombreLote((e.target as HTMLInputElement).value)
                  }
                  sx={inputSx}
                />
              </Box>
              <Box>
                {/* Qué se COMPRÓ. El alias de arriba es cómo se vende: el canon
                    las lista aparte porque son dos cosas distintas. */}
                <FieldLabel htmlFor="v4-nombre">
                  Nombre de compra (opcional)
                </FieldLabel>
                <Box
                  component="input"
                  id="v4-nombre"
                  value={nombre}
                  onChange={(e) =>
                    setNombre((e.target as HTMLInputElement).value)
                  }
                  sx={inputSx}
                />
              </Box>
              <Box>
                {/* Cuándo se PAGÓ, distinto de cuándo vence. Se autocompleta
                    solo cuando los abonos saldan el lote. */}
                <FieldLabel htmlFor="v4-fechapago">
                  Fecha de pago (opcional)
                </FieldLabel>
                <Box
                  component="input"
                  id="v4-fechapago"
                  type="date"
                  value={fechaPago}
                  onChange={(e) =>
                    setFechaPago((e.target as HTMLInputElement).value)
                  }
                  sx={inputSx}
                />
              </Box>
            </Box>

            {/* Bloque joya condicional */}
            {categoriaFiscal !== 'gema' ? (
              <Box
                data-testid="bloque-joya"
                sx={{
                  display: 'grid',
                  gap: '14px',
                  padding: '14px 16px',
                  border: `1px solid ${foto.surfaces.rule}`,
                  borderRadius: '12px',
                }}
              >
                <Box sx={rotulo}>
                  Bloque joya{' '}
                  {categoriaFiscal === 'joya' ? '· obligatorio' : '· opcional'}
                </Box>
                <Box
                  sx={{
                    display: 'grid',
                    gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' },
                    gap: '14px',
                  }}
                >
                  <Box>
                    <FieldLabel htmlFor="v4-tipojoya">Tipo de joya</FieldLabel>
                    <Box
                      component="input"
                      id="v4-tipojoya"
                      value={tipoJoya}
                      onChange={(e) =>
                        setTipoJoya((e.target as HTMLInputElement).value)
                      }
                      sx={inputSx}
                    />
                  </Box>
                  <Box>
                    <FieldLabel htmlFor="v4-mineral">Mineral</FieldLabel>
                    <Box
                      component="input"
                      id="v4-mineral"
                      value={mineral}
                      onChange={(e) =>
                        setMineral((e.target as HTMLInputElement).value)
                      }
                      sx={inputSx}
                    />
                  </Box>
                  <Box>
                    <FieldLabel htmlFor="v4-gramaje">Gramaje</FieldLabel>
                    <NumberInputWithCalc
                      id="v4-gramaje"
                      value={gramaje}
                      onChange={setGramaje}
                      format="decimal"
                      step={0.1}
                      min={0}
                      ariaLabel="Gramaje de la joya"
                    />
                  </Box>
                  <Box>
                    <FieldLabel htmlFor="v4-costogramo">
                      Costo por gramo (COP)
                    </FieldLabel>
                    <NumberInputWithCalc
                      id="v4-costogramo"
                      value={costoPorGramoCOP}
                      onChange={setCostoPorGramoCOP}
                      format="currency"
                      step={1000}
                      min={0}
                      ariaLabel="Costo por gramo en COP"
                    />
                  </Box>
                  <Box>
                    <FieldLabel htmlFor="v4-cantjoyas">
                      Cantidad de joyas
                    </FieldLabel>
                    <NumberInputWithCalc
                      id="v4-cantjoyas"
                      value={cantidadJoyas}
                      onChange={setCantidadJoyas}
                      format="integer"
                      step={1}
                      min={1}
                      ariaLabel="Cantidad de joyas del lote"
                    />
                  </Box>
                </Box>
              </Box>
            ) : null}

            {/* Bloque gema condicional. OPCIONAL: describe la mercancía, no
                arma el costo. Entra al guardar solo si está completo. */}
            {categoriaFiscal !== 'joya' ? (
              <Box
                data-testid="bloque-gema"
                sx={{
                  display: 'grid',
                  gap: '12px',
                  padding: '14px',
                  borderRadius: '12px',
                  border: `1px solid ${foto.surfaces.edge}`,
                }}
              >
                <Box sx={{ fontSize: '13px', color: foto.ink.secondary }}>
                  Bloque gema · opcional
                </Box>
                <Box
                  sx={{
                    display: 'grid',
                    gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' },
                    gap: '14px',
                  }}
                >
                  <Box>
                    <FieldLabel htmlFor="v4-tipogema">Tipo de gema</FieldLabel>
                    <Box
                      component="input"
                      id="v4-tipogema"
                      value={tipoGema}
                      onChange={(e) =>
                        setTipoGema((e.target as HTMLInputElement).value)
                      }
                      sx={inputSx}
                    />
                  </Box>
                  <Box>
                    <FieldLabel htmlFor="v4-cantgemas">
                      Cantidad de gemas
                    </FieldLabel>
                    <NumberInputWithCalc
                      id="v4-cantgemas"
                      value={cantidadGemas}
                      onChange={setCantidadGemas}
                      format="integer"
                      step={1}
                      min={1}
                      ariaLabel="Cantidad de gemas del lote"
                    />
                  </Box>
                  <Box>
                    <FieldLabel htmlFor="v4-cortegema">Corte</FieldLabel>
                    <Box
                      component="input"
                      id="v4-cortegema"
                      value={corteGema}
                      onChange={(e) =>
                        setCorteGema((e.target as HTMLInputElement).value)
                      }
                      sx={inputSx}
                    />
                  </Box>
                  <Box>
                    <FieldLabel htmlFor="v4-calidadprom">
                      Calidad promedio
                    </FieldLabel>
                    <Box
                      component="input"
                      id="v4-calidadprom"
                      value={calidadPromedio}
                      onChange={(e) =>
                        setCalidadPromedio((e.target as HTMLInputElement).value)
                      }
                      sx={inputSx}
                    />
                  </Box>
                  <Box>
                    <FieldLabel htmlFor="v4-pesototal">
                      Peso total (ct)
                    </FieldLabel>
                    <NumberInputWithCalc
                      id="v4-pesototal"
                      value={pesoTotalCt}
                      onChange={setPesoTotalCt}
                      format="decimal"
                      step={0.1}
                      min={0}
                      ariaLabel="Peso total en quilates"
                    />
                  </Box>
                  <Box>
                    <FieldLabel htmlFor="v4-pesoprom">
                      Peso promedio por gema (ct)
                    </FieldLabel>
                    <NumberInputWithCalc
                      id="v4-pesoprom"
                      value={pesoGemaPromedioCt}
                      onChange={setPesoGemaPromedioCt}
                      format="decimal"
                      step={0.01}
                      min={0}
                      ariaLabel="Peso promedio por gema en quilates"
                    />
                  </Box>
                  <Box>
                    <FieldLabel htmlFor="v4-medidaprom">
                      Medida promedio
                    </FieldLabel>
                    <Box
                      component="input"
                      id="v4-medidaprom"
                      value={medidaPromedio}
                      onChange={(e) =>
                        setMedidaPromedio((e.target as HTMLInputElement).value)
                      }
                      sx={inputSx}
                    />
                  </Box>
                  <Box>
                    <FieldLabel htmlFor="v4-costoct">
                      Costo por ct (COP)
                    </FieldLabel>
                    <NumberInputWithCalc
                      id="v4-costoct"
                      value={costoPorCtCOP}
                      onChange={setCostoPorCtCOP}
                      format="currency"
                      step={1000}
                      min={0}
                      ariaLabel="Costo por quilate en COP"
                    />
                  </Box>
                </Box>
              </Box>
            ) : null}

            <CostosVariablesEditor
              value={costosVariables}
              onChange={setCostosVariables}
            />

            {/* Pago */}
            <Box sx={{ display: 'grid', gap: '14px' }}>
              <Box sx={rotulo}>Paso 3 · Pago al proveedor</Box>
              <SegmentedControl
                ariaLabel="Forma de pago"
                options={[
                  { value: 'contado', label: 'Contado' },
                  { value: 'credito', label: 'Crédito' },
                  { value: 'consignacion', label: 'Consignación' },
                ]}
                value={formaPago}
                onChange={setFormaPago}
              />
              {formaPago === 'contado' ? (
                <SegmentedControl
                  ariaLabel="Método de pago de contado"
                  options={[
                    { value: 'efectivo', label: 'Efectivo' },
                    { value: 'transferencia', label: 'Transferencia' },
                  ]}
                  value={metodoContado}
                  onChange={setMetodoContado}
                />
              ) : null}
              {formaPago === 'credito' ? (
                // Inline en vez de reusar `CreditoFields`: ese componente pide
                // tasa y total para calcular la tabla de amortización, que W1
                // todavía no captura. Acoplarse a él obligaría a inventar dos
                // datos para satisfacer una firma.
                <Box
                  data-testid="bloque-credito"
                  sx={{
                    display: 'grid',
                    gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' },
                    gap: '14px',
                  }}
                >
                  <Box>
                    <FieldLabel htmlFor="v4-vencimiento">
                      Fecha de vencimiento
                    </FieldLabel>
                    <Box
                      component="input"
                      id="v4-vencimiento"
                      type="date"
                      value={fechaVencimiento}
                      onChange={(e) =>
                        setFechaVencimiento(
                          (e.target as HTMLInputElement).value,
                        )
                      }
                      sx={inputSx}
                    />
                  </Box>
                  <Box>
                    <FieldLabel htmlFor="v4-cuotas">
                      Número de cuotas
                    </FieldLabel>
                    <NumberInputWithCalc
                      id="v4-cuotas"
                      value={numeroCuotas}
                      onChange={setNumeroCuotas}
                      format="integer"
                      step={1}
                      min={1}
                      ariaLabel="Número de cuotas"
                    />
                  </Box>
                </Box>
              ) : null}
              <Box>
                <FieldLabel htmlFor="v4-abono">Abono (COP)</FieldLabel>
                <NumberInputWithCalc
                  id="v4-abono"
                  value={abonoCOP}
                  onChange={setAbonoCOP}
                  format="currency"
                  step={1000}
                  min={0}
                  ariaLabel="Abono al proveedor en COP"
                />
              </Box>
            </Box>
          </Box>

          {/* ── Columna derecha: el motor ────────────────────────── */}
          <Box
            sx={{ display: 'grid', gap: '14px', position: 'sticky', top: 16 }}
          >
            <PreviewMotorCard preview={preview} />

            {error ? (
              <Box
                data-testid="error-guardar"
                sx={{
                  fontSize: 12,
                  color: foto.ink.primary,
                  padding: '10px 12px',
                  borderRadius: '9px',
                  border: `1px solid ${foto.surfaces.rule}`,
                  background: foto.surfaces.edge,
                }}
              >
                {error}
              </Box>
            ) : null}

            <Box
              component="button"
              type="submit"
              disabled={!canSubmit}
              data-testid="guardar-lote"
              sx={{
                padding: '13px 18px',
                borderRadius: '10px',
                border: 'none',
                fontSize: 13,
                fontWeight: 600,
                cursor: canSubmit ? 'pointer' : 'not-allowed',
                opacity: canSubmit ? 1 : 0.45,
                background: foto.accent.primary,
                color: '#fff',
              }}
            >
              {guardando
                ? 'Guardando…'
                : `Guardar y crear ${typeof unidadesDeclaradas === 'number' ? unidadesDeclaradas : 0} casillas`}
            </Box>
          </Box>
        </Box>
      )}
    </Box>
  );
}
