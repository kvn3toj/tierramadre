/**
 * `/renacer/tribu` — "Conocer las necesidades" (31-08) y el Mapa de la Tribu (§6.8).
 *
 * Una sola página, dos lectores: quien tiene carnet puede sumarse con "+1"; quien llega
 * desde "Quiero ayudar" solo lee. Las necesidades van agrupadas por **bolsa**; dentro de
 * cada bolsa, el orden es el turno (§9). Esta ruta no va impresa: puede cambiar.
 *
 * **Los nombres que faltan no son un bug.** Identidad solo con `donorVisibilityConsent`
 * explícito, y solo el nombre de pila; el backend manda `null` cuando no lo hay
 * (D-0831-5). El default es no mostrar.
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, CircularProgress, Typography } from '@mui/material';
import RenacerLayout, { useRenacerTokens } from './RenacerLayout';
import { BotonSecundario } from './ui';
import { leerCredencial, leerTribu, sumarseA, type Necesidad } from './renacerApi';
import { agruparPorBolsa } from './agrupar';
import { copy } from './renacerCopy';
import { qeFont } from '../../design-system';

export default function RenacerTribu() {
  const t = useRenacerTokens();
  const navegar = useNavigate();
  const [necesidades, setNecesidades] = useState<Necesidad[] | 'cargando' | 'error'>('cargando');
  const [sumando, setSumando] = useState<string | null>(null);
  const [abierta, setAbierta] = useState<string | null>(null);
  const credencial = leerCredencial();

  const cargar = useCallback(() => {
    leerTribu()
      .then(setNecesidades)
      .catch(() => setNecesidades('error'));
  }, []);

  useEffect(cargar, [cargar]);

  const bolsas = useMemo(
    () => (Array.isArray(necesidades) ? agruparPorBolsa(necesidades) : []),
    [necesidades],
  );

  async function sumarme(id: string) {
    if (!credencial) return;
    setSumando(id);
    try {
      await sumarseA(id, credencial);
      cargar();
    } finally {
      setSumando(null);
    }
  }

  if (necesidades === 'cargando') {
    return (
      <RenacerLayout titulo="Un momento…">
        <CircularProgress size={24} sx={{ color: t.accent }} />
      </RenacerLayout>
    );
  }

  if (necesidades === 'error') {
    return (
      <RenacerLayout titulo="No pudimos cargar las necesidades" bajada="Puede ser la conexión. Intentá de nuevo en un momento.">
        <BotonSecundario onClick={cargar}>Reintentar</BotonSecundario>
      </RenacerLayout>
    );
  }

  return (
    <RenacerLayout
      titulo="Lo que las familias necesitan"
      bajada={
        credencial
          ? 'Agrupado por tipo. Si a vos también te hace falta, sumate — así sabemos cuántos son.'
          : 'Agrupado por tipo, para saber a dónde va lo que aportás.'
      }
    >
      {necesidades.length === 0 && (
        <Typography sx={{ fontFamily: qeFont.ui, fontSize: 15, color: t.muted, mb: 3 }}>
          Todavía no hay necesidades registradas. Cuando las familias se registren, van a aparecer acá.
        </Typography>
      )}

      {bolsas.map((bolsa) => {
        const estaAbierta = abierta === bolsa.nombre;
        return (
          <Box key={bolsa.nombre} sx={{ border: `1px solid ${t.border}`, bgcolor: t.surface, borderRadius: 2, mb: 1.5, overflow: 'hidden' }}>
            <Box
              component="button"
              type="button"
              aria-expanded={estaAbierta}
              onClick={() => setAbierta(estaAbierta ? null : bolsa.nombre)}
              sx={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                background: 'none',
                border: 0,
                p: 2,
                minHeight: 56,
                cursor: 'pointer',
                textAlign: 'left',
              }}
            >
              <Typography sx={{ fontFamily: qeFont.serif, fontSize: 20, color: t.text }}>
                {bolsa.nombre}
              </Typography>
              <Typography sx={{ fontFamily: qeFont.ui, fontSize: 13, color: t.subtle, whiteSpace: 'nowrap', ml: 2 }}>
                {bolsa.necesidades.length} {bolsa.necesidades.length === 1 ? 'pedido' : 'pedidos'}
              </Typography>
            </Box>

            {estaAbierta &&
              bolsa.necesidades.map((n) => (
                <Box key={n.id} sx={{ borderTop: `1px solid ${t.hairline}`, p: 2 }}>
                  <Typography sx={{ fontFamily: qeFont.ui, fontSize: 16, color: t.text, mb: 0.5 }}>
                    {n.whatINeed}
                  </Typography>
                  <Typography sx={{ fontFamily: qeFont.ui, fontSize: 14, color: t.muted, mb: 1.5, lineHeight: 1.5 }}>
                    {n.whyItMatters}
                  </Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <Typography sx={{ fontFamily: qeFont.ui, fontSize: 13, color: t.subtle }}>
                      {/* Fail-closed hecho copy: sin consentimiento no hay nombre. */}
                      {n.autorNombre ?? 'Una familia de la comunidad'}
                      {n.supportCount > 0 && ` · ${n.supportCount} se sumaron`}
                    </Typography>
                    {credencial && (
                      <Typography
                        component="button"
                        type="button"
                        onClick={() => sumarme(n.id)}
                        disabled={sumando === n.id}
                        sx={{ fontFamily: qeFont.ui, fontSize: 14, color: t.accent, background: 'none', border: `1px solid ${t.border}`, borderRadius: 1.5, px: 1.5, py: 0.75, minHeight: 40, cursor: 'pointer' }}
                      >
                        {sumando === n.id ? '…' : '+1 a mí también'}
                      </Typography>
                    )}
                  </Box>
                </Box>
              ))}
          </Box>
        );
      })}

      {!credencial && necesidades.length > 0 && (
        <Typography sx={{ fontFamily: qeFont.ui, fontSize: 14, color: t.subtle, my: 2, lineHeight: 1.5 }}>
          {copy.tribu.sinCarnet}
        </Typography>
      )}

      <Box sx={{ mt: 2 }}>
        <BotonSecundario onClick={() => navegar(credencial ? '/renacer' : '/renacer/ayudar')}>Volver</BotonSecundario>
      </Box>
    </RenacerLayout>
  );
}
