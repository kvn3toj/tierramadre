/**
 * `/renacer/tribu` — el Mapa de la Tribu (§6.8): ver las necesidades de otros y sumarse
 * con "+1".
 *
 * Esta ruta **no va impresa**, así que —a diferencia de `/renacer/k/*` y `/renacer/b/*`—
 * puede cambiar sin costo (§3.4 · G-A.1).
 *
 * **Los nombres que faltan no son un bug.** El §10.3 fija que la identidad de quien pidió
 * algo solo se muestra con `donorVisibilityConsent` explícito; el backend manda `null`
 * cuando no lo hay, y acá se dice "Alguien de la tribu". El default es no mostrar.
 *
 * Sin reactividad viva: no hay cliente de Convex en el navegador (§8.1). La lista
 * refresca al montar y después de cada "+1", no sola.
 */

import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, CircularProgress, Typography } from '@mui/material';
import RenacerLayout, { useRenacerTokens } from './RenacerLayout';
import { BotonSecundario } from './ui';
import { leerCredencial, leerTribu, sumarseA, type Necesidad } from './renacerApi';
import { qeFont } from '../../design-system';

export default function RenacerTribu() {
  const t = useRenacerTokens();
  const navegar = useNavigate();
  const [necesidades, setNecesidades] = useState<Necesidad[] | 'cargando' | 'error'>('cargando');
  const [sumando, setSumando] = useState<string | null>(null);
  const credencial = leerCredencial();

  const cargar = useCallback(() => {
    leerTribu()
      .then(setNecesidades)
      .catch(() => setNecesidades('error'));
  }, []);

  useEffect(cargar, [cargar]);

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
      <RenacerLayout
        titulo="No pudimos cargar el mapa"
        bajada="Puede ser la conexión. Intentá de nuevo en un momento."
      >
        <BotonSecundario onClick={cargar}>Reintentar</BotonSecundario>
      </RenacerLayout>
    );
  }

  return (
    <RenacerLayout
      titulo="El mapa de la tribu"
      bajada="Lo que otras familias están necesitando. Si a vos también te hace falta, sumate — así sabemos cuántos son."
    >
      {necesidades.length === 0 && (
        <Typography sx={{ fontFamily: qeFont.ui, fontSize: 15, color: t.muted, mb: 3 }}>
          Todavía no hay necesidades registradas. Cuando otras familias se registren, van a
          aparecer acá.
        </Typography>
      )}

      {necesidades.map((n) => (
        <Box
          key={n.id}
          sx={{
            border: `1px solid ${t.border}`,
            bgcolor: t.surface,
            borderRadius: 2,
            p: 2,
            mb: 2,
          }}
        >
          <Typography sx={{ fontFamily: qeFont.serif, fontSize: 20, color: t.text, mb: 0.5 }}>
            {n.whatINeed}
          </Typography>
          <Typography
            sx={{ fontFamily: qeFont.ui, fontSize: 14.5, color: t.muted, mb: 1.5, lineHeight: 1.5 }}
          >
            {n.whyItMatters}
          </Typography>

          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Typography sx={{ fontFamily: qeFont.ui, fontSize: 13, color: t.subtle }}>
              {/* Fail-closed hecho copy: sin consentimiento no hay nombre, y no se
                  disfraza de dato faltante. */}
              {n.autorNombre ?? 'Alguien de la tribu'}
              {n.supportCount > 0 && ` · ${n.supportCount} se sumaron`}
            </Typography>

            {credencial && (
              <Typography
                component="button"
                onClick={() => sumarme(n.id)}
                disabled={sumando === n.id}
                sx={{
                  fontFamily: qeFont.ui,
                  fontSize: 14,
                  color: t.accent,
                  background: 'none',
                  border: `1px solid ${t.border}`,
                  borderRadius: 1.5,
                  px: 1.5,
                  py: 0.75,
                  minHeight: 40,
                  cursor: 'pointer',
                }}
              >
                {sumando === n.id ? '…' : '+1 a mí también'}
              </Typography>
            )}
          </Box>
        </Box>
      ))}

      {!credencial && necesidades.length > 0 && (
        <Typography
          sx={{ fontFamily: qeFont.ui, fontSize: 14, color: t.subtle, mb: 2, lineHeight: 1.5 }}
        >
          Para sumarte a una necesidad necesitás tu carnet. Se genera al completar el registro
          con el código de tu manilla.
        </Typography>
      )}

      <BotonSecundario onClick={() => navegar('/renacer')}>Volver</BotonSecundario>
    </RenacerLayout>
  );
}
