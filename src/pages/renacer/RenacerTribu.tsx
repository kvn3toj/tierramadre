/**
 * `/renacer/tribu` — "Conocer las necesidades" (31-08) y el Mapa de la Tribu (§6.8).
 *
 * Una sola página, dos lectores: quien tiene carnet puede decir "a mí también"; quien llega
 * desde "Quiero ayudar" solo lee. Las necesidades van agrupadas por bolsa; dentro de cada
 * bolsa, el orden es el turno (§9). Esta ruta no va impresa: puede cambiar.
 *
 * **Los nombres que faltan no son un bug.** Identidad solo con `donorVisibilityConsent`
 * explícito, y solo el nombre de pila; el backend manda `null` cuando no lo hay (D-0831-5).
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, CircularProgress, Typography } from '@mui/material';
import RenacerLayout, { useRenacerTokens } from './RenacerLayout';
import { BotonSecundario, anilloFoco } from './ui';
import { leerCredencial, leerTribu, sumarseA, type Necesidad } from './renacerApi';
import { agruparPorBolsa } from './agrupar';
import { copy } from './renacerCopy';
import { renacerFont } from '../../design-system';

export default function RenacerTribu() {
  const t = useRenacerTokens();
  const navegar = useNavigate();
  const [necesidades, setNecesidades] = useState<Necesidad[] | 'cargando' | 'error'>('cargando');
  const [sumando, setSumando] = useState<string | null>(null);
  const [aviso, setAviso] = useState<{ id: string; texto: string } | null>(null);
  const [abierta, setAbierta] = useState<string | null>(null);
  const credencial = leerCredencial();
  const volverA = credencial ? `/renacer/b/${credencial.cardNumber}?t=${credencial.cardToken}` : '/renacer/ayudar';

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
    setAviso(null);
    try {
      const r = await sumarseA(id, credencial);
      if (r.yaEstaba) setAviso({ id, texto: copy.tribu.yaEstabas });
      cargar();
    } catch {
      // Sin silencio: si no se pudo, se dice.
      setAviso({ id, texto: 'No se pudo guardar. Intentá de nuevo.' });
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
      <RenacerLayout centrado titulo="No pudimos cargar las necesidades" bajada="Puede ser la conexión. Intentá de nuevo en un momento.">
        <BotonSecundario onClick={cargar}>Reintentar</BotonSecundario>
      </RenacerLayout>
    );
  }

  return (
    <RenacerLayout
      titulo="Lo que las familias necesitan"
      bajada={
        credencial
          ? 'Agrupado por tipo. Si a vos también te hace falta, decilo: así sabemos cuántas familias son.'
          : 'Agrupado por tipo, para saber a dónde va lo que aportás.'
      }
    >
      {!credencial && necesidades.length > 0 && (
        <Typography sx={{ fontFamily: renacerFont.ui, fontSize: 14, color: t.muted, mb: 2.5, lineHeight: 1.5 }}>
          {copy.tribu.sinCarnet}
        </Typography>
      )}

      {necesidades.length === 0 && (
        <Typography sx={{ fontFamily: renacerFont.ui, fontSize: 15, color: t.muted, mb: 3 }}>
          Todavía no hay necesidades registradas. Cuando las familias se registren, van a aparecer acá.
        </Typography>
      )}

      {bolsas.map((bolsa) => {
        const estaAbierta = abierta === bolsa.nombre;
        const n = bolsa.necesidades.length;
        return (
          <Box key={bolsa.nombre} sx={{ border: `1px solid ${t.controlBorder}`, bgcolor: t.surface, backdropFilter: 'blur(10px)', borderRadius: '18px', mb: 1.5, overflow: 'hidden' }}>
            <Box
              component="button"
              type="button"
              aria-expanded={estaAbierta}
              onClick={() => setAbierta(estaAbierta ? null : bolsa.nombre)}
              sx={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'none', border: 0, color: t.text, p: 2, minHeight: 56, cursor: 'pointer', textAlign: 'left', borderRadius: '18px', ...anilloFoco(t) }}
            >
              <Typography sx={{ fontFamily: renacerFont.display, fontWeight: 700, fontSize: 18, letterSpacing: '-0.01em', color: t.text }}>
                {bolsa.nombre}
              </Typography>
              <Typography sx={{ fontFamily: renacerFont.mono, fontSize: 13, color: t.muted, whiteSpace: 'nowrap', ml: 2 }}>
                {n} {n === 1 ? 'necesidad' : 'necesidades'} {estaAbierta ? '▴' : '▾'}
              </Typography>
            </Box>

            {estaAbierta &&
              bolsa.necesidades.map((x) => (
                <Box key={x.id} sx={{ borderTop: `1px solid ${t.hairline}`, p: 2 }}>
                  <Typography sx={{ fontFamily: renacerFont.ui, fontSize: 16, color: t.text, mb: 0.5 }}>{x.whatINeed}</Typography>
                  {x.whyItMatters && (
                    <Typography sx={{ fontFamily: renacerFont.ui, fontSize: 14, color: t.muted, mb: 1.5, lineHeight: 1.5 }}>{x.whyItMatters}</Typography>
                  )}
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1.5, flexWrap: 'wrap' }}>
                    <Typography sx={{ fontFamily: renacerFont.ui, fontSize: 13, color: t.subtle }}>
                      {x.autorNombre ?? 'Una familia de la comunidad'}
                      {x.supportCount > 0 && ` · ${copy.tribu.sumaron(x.supportCount)}`}
                    </Typography>
                    {credencial && (
                      <Box
                        component="button"
                        type="button"
                        onClick={() => sumarme(x.id)}
                        disabled={sumando === x.id}
                        sx={{ fontFamily: renacerFont.display, fontWeight: 600, fontSize: 14, color: t.accent, background: 'none', border: `1px solid ${t.controlBorder}`, borderRadius: 999, px: 2, minHeight: 48, cursor: 'pointer', ...anilloFoco(t) }}
                      >
                        {sumando === x.id ? '…' : copy.tribu.boton}
                      </Box>
                    )}
                  </Box>
                  {aviso?.id === x.id && (
                    <Typography role="status" sx={{ fontFamily: renacerFont.ui, fontSize: 13, color: t.muted, mt: 1 }}>{aviso.texto}</Typography>
                  )}
                </Box>
              ))}
          </Box>
        );
      })}

      <Box sx={{ mt: 2 }}>
        <BotonSecundario onClick={() => navegar(volverA)}>{credencial ? 'Volver a mi carnet' : 'Volver'}</BotonSecundario>
      </Box>
    </RenacerLayout>
  );
}
