/**
 * W3 — registrar un movimiento sobre casillas v4.
 *
 * Una sola pantalla para venta, consignación, devolución y entrega a asesor,
 * porque son el mismo evento con distinto efecto. Hoy la venta vive en su propia
 * página y los movimientos no-venta en otra, y esa separación es la razón de que
 * una venta del comercializador se registre como «entrega» y desaparezca de los
 * totales.
 *
 * `MovimientosKardexPage` y `VentaPage` quedan intactas: son el riel viejo, en
 * producción, y unificarlas es la decisión abierta #9 de la spec.
 *
 * La graduación (W5) entra por `?itemId=&origen=`: un tap desde la consignación
 * abre esta pantalla en modo VENTA con la pieza puesta.
 */
import { useEffect, useState, type FormEvent } from 'react';
import { Box } from '@mui/material';
import { useNavigate, useSearchParams } from 'react-router-dom';

import { getFoto, fontFamilies } from '../../../design-system';
import { SegmentedControl } from '../../../design-system/components/SegmentedControl';
import {
  useConvexQuery,
  useAuthedConvexAction,
  convexApi,
} from '../../../lib/convex-safe';
import { useNotification } from '../../../contexts/NotificationContext';
import { FieldLabel } from './components/FieldLabel';
import { NumberInputWithCalc } from './components/NumberInputWithCalc';

type Tipo = 'VENTA' | 'CONSIGNACION' | 'DEVOLUCION' | 'ASESOR';
type FormaPago = 'efectivo' | 'transferencia' | 'credito';

const hoyIso = () => new Date().toISOString().slice(0, 10);

export default function MovimientoV4Page() {
  const foto = getFoto('light');
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const { notify } = useNotification();

  const [tipo, setTipo] = useState<Tipo>(
    params.get('itemId') ? 'VENTA' : 'CONSIGNACION',
  );
  const [itemsTexto, setItemsTexto] = useState(params.get('itemId') ?? '');
  const [fecha, setFecha] = useState(hoyIso());
  const [entregadoPor, setEntregadoPor] = useState('');
  const [recibidoPor, setRecibidoPor] = useState('');
  const [condicion, setCondicion] = useState('');

  const [cliente, setCliente] = useState('');
  const [precioVentaRealCOP, setPrecio] = useState<number | ''>('');
  const [comisionPct, setComision] = useState<number | ''>(10);
  const [pagoComisionesA, setPagoComisionesA] = useState('');
  const [formaPago, setFormaPago] = useState<FormaPago>('efectivo');
  const [numeroRecibo, setNumeroRecibo] = useState('');
  const [recibidoEfectivoPor, setRecibidoEfectivoPor] = useState('');
  const [numeroCuenta, setNumeroCuenta] = useState('');
  const [titular, setTitular] = useState('');
  const [banco, setBanco] = useState('');
  const [numeroTransaccion, setNumeroTransaccion] = useState('');
  const [fechaInicio, setFechaInicio] = useState('');
  const [fechaPago, setFechaPago] = useState('');

  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const enConsignacion = useConvexQuery(
    convexApi.movimientos.enConsignacion,
    {},
  );
  const registrar = useAuthedConvexAction(convexApi.movimientos.registrar);

  const origenKardexEventId = params.get('origen') ?? undefined;

  // La graduación llega con la pieza puesta; quien la tenía es quien entrega.
  useEffect(() => {
    const itemId = params.get('itemId');
    if (!itemId || !enConsignacion) return;
    const pieza = enConsignacion.find(
      (c: { itemId: string }) => c.itemId === itemId,
    );
    if (pieza && !entregadoPor) setEntregadoPor(params.get('de') ?? '');
  }, [params, enConsignacion, entregadoPor]);

  const itemIds = itemsTexto
    .split(/[,\s]+/)
    .map((s) => s.trim())
    .filter(Boolean);

  const pagoCompleto =
    tipo !== 'VENTA' ||
    (formaPago === 'efectivo'
      ? !!numeroRecibo && !!recibidoEfectivoPor
      : formaPago === 'transferencia'
        ? !!numeroCuenta && !!titular && !!numeroTransaccion
        : !!fechaInicio && !!fechaPago);

  const canSubmit =
    itemIds.length > 0 &&
    !!entregadoPor &&
    !!recibidoPor &&
    (tipo !== 'VENTA' ||
      (!!cliente &&
        typeof precioVentaRealCOP === 'number' &&
        precioVentaRealCOP > 0)) &&
    pagoCompleto &&
    !guardando;

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    setGuardando(true);
    setError(null);
    try {
      const res = await registrar({
        tipo,
        fecha,
        itemIds,
        entregadoPor,
        recibidoPor,
        condicion: condicion || undefined,
        origenKardexEventId,
        venta:
          tipo === 'VENTA'
            ? {
                cliente,
                precioVentaRealCOP: precioVentaRealCOP as number,
                comisionPct:
                  typeof comisionPct === 'number' ? comisionPct : undefined,
                pagoComisionesA: pagoComisionesA || undefined,
                formaPago,
                efectivo:
                  formaPago === 'efectivo'
                    ? { numeroRecibo, recibidoPor: recibidoEfectivoPor }
                    : undefined,
                transferencia:
                  formaPago === 'transferencia'
                    ? { numeroCuenta, titular, banco, numeroTransaccion }
                    : undefined,
                credito:
                  formaPago === 'credito'
                    ? { fechaInicio, fechaPago }
                    : undefined,
              }
            : undefined,
      });
      notify(`${tipo} registrada · ${res.movimientoId}`, 'success');
      navigate('/admin/fotosintesis/movimientos-v4');
      setItemsTexto('');
      setPrecio('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo registrar');
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

  return (
    <Box
      component="form"
      onSubmit={onSubmit}
      sx={{ display: 'grid', gap: '18px', padding: '22px', maxWidth: 760 }}
    >
      <Box>
        <Box component="h1" sx={{ fontSize: 17, fontWeight: 600, margin: 0 }}>
          Movimiento
        </Box>
        <Box sx={{ fontSize: 12, color: foto.ink.secondary, marginTop: '4px' }}>
          Venta, consignación, devolución o entrega a asesor. La venta es un
          movimiento más, no un flujo aparte.
        </Box>
      </Box>

      {origenKardexEventId ? (
        <Box
          data-testid="marca-graduacion"
          sx={{
            fontSize: 11,
            fontFamily: fontFamilies.mono,
            color: foto.ink.secondary,
            padding: '8px 12px',
            borderRadius: '9px',
            border: `1px solid ${foto.surfaces.rule}`,
          }}
        >
          Graduación de la consignación {origenKardexEventId} — la cadena queda
          trazada.
        </Box>
      ) : null}

      <Box>
        <FieldLabel>Tipo</FieldLabel>
        <SegmentedControl
          ariaLabel="Tipo de movimiento"
          options={[
            { value: 'VENTA', label: 'Venta' },
            { value: 'CONSIGNACION', label: 'Consignación' },
            { value: 'DEVOLUCION', label: 'Devolución' },
            { value: 'ASESOR', label: 'Asesor' },
          ]}
          value={tipo}
          onChange={(n) => setTipo(n as Tipo)}
        />
      </Box>

      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' },
          gap: '16px',
        }}
      >
        <Box>
          <FieldLabel htmlFor="m-items">Ítems (separados por coma)</FieldLabel>
          <Box
            component="input"
            id="m-items"
            value={itemsTexto}
            onChange={(e) =>
              setItemsTexto((e.target as HTMLInputElement).value)
            }
            placeholder="525, 526"
            sx={inputSx}
          />
        </Box>
        <Box>
          <FieldLabel htmlFor="m-fecha">Fecha</FieldLabel>
          <Box
            component="input"
            id="m-fecha"
            type="date"
            value={fecha}
            onChange={(e) => setFecha((e.target as HTMLInputElement).value)}
            sx={inputSx}
          />
        </Box>
        <Box>
          <FieldLabel htmlFor="m-entrega">Entregado por</FieldLabel>
          <Box
            component="input"
            id="m-entrega"
            value={entregadoPor}
            onChange={(e) =>
              setEntregadoPor((e.target as HTMLInputElement).value)
            }
            sx={inputSx}
          />
        </Box>
        <Box>
          <FieldLabel htmlFor="m-recibe">Recibido por</FieldLabel>
          <Box
            component="input"
            id="m-recibe"
            value={recibidoPor}
            onChange={(e) =>
              setRecibidoPor((e.target as HTMLInputElement).value)
            }
            sx={inputSx}
          />
        </Box>
      </Box>

      {tipo !== 'VENTA' ? (
        <Box>
          <FieldLabel htmlFor="m-condicion">Condición</FieldLabel>
          <Box
            component="input"
            id="m-condicion"
            value={condicion}
            onChange={(e) => setCondicion((e.target as HTMLInputElement).value)}
            placeholder="devolver si no se vende en 30 días"
            sx={inputSx}
          />
        </Box>
      ) : null}

      {/* El bloque de venta — condicional, y con el precio obligatorio. */}
      {tipo === 'VENTA' ? (
        <Box
          data-testid="bloque-venta"
          sx={{
            display: 'grid',
            gap: '16px',
            padding: '16px 18px',
            border: `1px solid ${foto.surfaces.rule}`,
            borderRadius: '14px',
            background: foto.surfaces.inset,
          }}
        >
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' },
              gap: '16px',
            }}
          >
            <Box>
              <FieldLabel htmlFor="m-cliente">Cliente</FieldLabel>
              <Box
                component="input"
                id="m-cliente"
                value={cliente}
                onChange={(e) =>
                  setCliente((e.target as HTMLInputElement).value)
                }
                sx={inputSx}
              />
            </Box>
            <Box>
              <FieldLabel htmlFor="m-precio">
                Precio de venta REAL (COP)
              </FieldLabel>
              <NumberInputWithCalc
                id="m-precio"
                value={precioVentaRealCOP}
                onChange={setPrecio}
                format="currency"
                step={1000}
                min={0}
                ariaLabel="Precio de venta real en COP"
              />
            </Box>
            <Box>
              <FieldLabel htmlFor="m-comision">Comisión %</FieldLabel>
              <NumberInputWithCalc
                id="m-comision"
                value={comisionPct}
                onChange={setComision}
                format="decimal"
                step={1}
                min={0}
                ariaLabel="Porcentaje de comisión"
              />
            </Box>
            <Box>
              <FieldLabel htmlFor="m-pagoa">Pago de comisiones a</FieldLabel>
              <Box
                component="input"
                id="m-pagoa"
                value={pagoComisionesA}
                onChange={(e) =>
                  setPagoComisionesA((e.target as HTMLInputElement).value)
                }
                sx={inputSx}
              />
            </Box>
          </Box>

          <Box>
            <FieldLabel>Forma de pago</FieldLabel>
            <SegmentedControl
              ariaLabel="Forma de pago de la venta"
              options={[
                { value: 'efectivo', label: 'Efectivo' },
                { value: 'transferencia', label: 'Transferencia' },
                { value: 'credito', label: 'Crédito' },
              ]}
              value={formaPago}
              onChange={(n) => setFormaPago(n as FormaPago)}
            />
          </Box>

          {formaPago === 'efectivo' ? (
            <Box
              data-testid="pago-efectivo"
              sx={{
                display: 'grid',
                gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' },
                gap: '14px',
              }}
            >
              <Box>
                <FieldLabel htmlFor="m-recibo"># recibo de caja</FieldLabel>
                <Box
                  component="input"
                  id="m-recibo"
                  value={numeroRecibo}
                  onChange={(e) =>
                    setNumeroRecibo((e.target as HTMLInputElement).value)
                  }
                  sx={inputSx}
                />
              </Box>
              <Box>
                <FieldLabel htmlFor="m-quien">Quién recibió</FieldLabel>
                <Box
                  component="input"
                  id="m-quien"
                  value={recibidoEfectivoPor}
                  onChange={(e) =>
                    setRecibidoEfectivoPor((e.target as HTMLInputElement).value)
                  }
                  sx={inputSx}
                />
              </Box>
            </Box>
          ) : null}

          {formaPago === 'transferencia' ? (
            <Box
              data-testid="pago-transferencia"
              sx={{
                display: 'grid',
                gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' },
                gap: '14px',
              }}
            >
              <Box>
                <FieldLabel htmlFor="m-cuenta"># cuenta</FieldLabel>
                <Box
                  component="input"
                  id="m-cuenta"
                  value={numeroCuenta}
                  onChange={(e) =>
                    setNumeroCuenta((e.target as HTMLInputElement).value)
                  }
                  sx={inputSx}
                />
              </Box>
              <Box>
                <FieldLabel htmlFor="m-titular">Titular</FieldLabel>
                <Box
                  component="input"
                  id="m-titular"
                  value={titular}
                  onChange={(e) =>
                    setTitular((e.target as HTMLInputElement).value)
                  }
                  sx={inputSx}
                />
              </Box>
              <Box>
                <FieldLabel htmlFor="m-banco">Banco o billetera</FieldLabel>
                <Box
                  component="input"
                  id="m-banco"
                  value={banco}
                  onChange={(e) =>
                    setBanco((e.target as HTMLInputElement).value)
                  }
                  sx={inputSx}
                />
              </Box>
              <Box>
                <FieldLabel htmlFor="m-tx"># transacción</FieldLabel>
                <Box
                  component="input"
                  id="m-tx"
                  value={numeroTransaccion}
                  onChange={(e) =>
                    setNumeroTransaccion((e.target as HTMLInputElement).value)
                  }
                  sx={inputSx}
                />
              </Box>
            </Box>
          ) : null}

          {formaPago === 'credito' ? (
            <Box
              data-testid="pago-credito"
              sx={{
                display: 'grid',
                gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' },
                gap: '14px',
              }}
            >
              <Box>
                <FieldLabel htmlFor="m-inicio">Fecha de inicio</FieldLabel>
                <Box
                  component="input"
                  id="m-inicio"
                  type="date"
                  value={fechaInicio}
                  onChange={(e) =>
                    setFechaInicio((e.target as HTMLInputElement).value)
                  }
                  sx={inputSx}
                />
              </Box>
              <Box>
                <FieldLabel htmlFor="m-pago">Fecha de pago</FieldLabel>
                <Box
                  component="input"
                  id="m-pago"
                  type="date"
                  value={fechaPago}
                  onChange={(e) =>
                    setFechaPago((e.target as HTMLInputElement).value)
                  }
                  sx={inputSx}
                />
              </Box>
            </Box>
          ) : null}
        </Box>
      ) : null}

      {/* La bandeja de graduación: lo que hoy está afuera. */}
      {enConsignacion?.length ? (
        <Box sx={{ display: 'grid', gap: '8px' }}>
          <FieldLabel>En consignación</FieldLabel>
          {enConsignacion.map((c: { itemId: string; loteId: string }) => (
            <Box
              key={c.itemId}
              component="button"
              type="button"
              data-testid={`graduar-${c.itemId}`}
              onClick={() => {
                setTipo('VENTA');
                setItemsTexto(c.itemId);
              }}
              sx={{
                display: 'flex',
                justifyContent: 'space-between',
                padding: '10px 12px',
                borderRadius: '10px',
                border: `1px solid ${foto.surfaces.rule}`,
                background: 'transparent',
                fontSize: 12,
                color: foto.ink.secondary,
                cursor: 'pointer',
                textAlign: 'left',
              }}
            >
              <span>
                #{c.itemId} · {c.loteId}
              </span>
              <span>Vender esta pieza →</span>
            </Box>
          ))}
        </Box>
      ) : null}

      {error ? (
        <Box data-testid="error-movimiento" sx={{ fontSize: 12 }}>
          {error}
        </Box>
      ) : null}

      <Box
        component="button"
        type="submit"
        disabled={!canSubmit}
        data-testid="registrar-movimiento"
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
          justifySelf: 'start',
        }}
      >
        {guardando ? 'Registrando…' : `Registrar ${tipo.toLowerCase()}`}
      </Box>
    </Box>
  );
}
