/**
 * `/renacer/b/:numero` — el carnet del beneficiario. Contrato permanente (§3.4 · G-A.1).
 *
 * **Exige el token del query string** (`?t=…`, decisión D-1 del plan). El argumento que
 * hizo aceptable un código de kit adivinable fue "el flujo del código no lee, escribe" —
 * y acá sí se lee. Sin token, un número secuencial le mostraría a cualquiera el registro
 * de un damnificado.
 *
 * Muestra lo que una entrega necesita para verificar "¿dónde y a quién?" — y la ubicación
 * no está en esa lista: quien entrega ya está ahí.
 */

import { useEffect, useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { Box, CircularProgress, Typography } from '@mui/material';
import RenacerLayout, { useRenacerTokens } from './RenacerLayout';
import { leerCarnet, type Carnet } from './renacerApi';
import { qeFont } from '../../design-system';

export default function RenacerCarnet() {
  const { numero = '' } = useParams();
  const [params] = useSearchParams();
  const token = params.get('t') ?? '';
  const t = useRenacerTokens();
  const [carnet, setCarnet] = useState<Carnet | null | 'cargando'>('cargando');

  useEffect(() => {
    let vigente = true;
    if (!token) {
      setCarnet(null);
      return;
    }
    leerCarnet(numero, token)
      .then((c) => vigente && setCarnet(c))
      .catch(() => vigente && setCarnet(null));
    return () => {
      vigente = false;
    };
  }, [numero, token]);

  if (carnet === 'cargando') {
    return (
      <RenacerLayout titulo="Un momento…">
        <CircularProgress size={24} sx={{ color: t.accent }} />
      </RenacerLayout>
    );
  }

  // Sin token, token equivocado o número inexistente: la MISMA pantalla para los tres.
  // Distinguirlos le confirmaría a quien tantea qué carnets existen.
  if (!carnet) {
    return (
      <RenacerLayout
        titulo="Este carnet no se puede mostrar"
        bajada="El carnet se abre con el código QR que se generó al completar el registro. Escanealo desde el teléfono donde se hizo."
      >
        <span />
      </RenacerLayout>
    );
  }

  return (
    <RenacerLayout titulo={`Carnet ${carnet.cardNumber}`}>
      <Box
        sx={{
          border: `1px solid ${t.border}`,
          bgcolor: t.surface,
          borderRadius: 2,
          p: 3,
          display: 'grid',
          gap: 2,
        }}
      >
        <Box>
          <Typography sx={{ fontFamily: qeFont.ui, fontSize: 13, color: t.subtle }}>
            Nombre
          </Typography>
          <Typography sx={{ fontFamily: qeFont.serif, fontSize: 26, color: t.text }}>
            {carnet.primerNombre}
          </Typography>
        </Box>
        <Box>
          <Typography sx={{ fontFamily: qeFont.ui, fontSize: 13, color: t.subtle }}>
            Código del kit
          </Typography>
          <Typography sx={{ fontFamily: qeFont.ui, fontSize: 20, color: t.text }}>
            {carnet.kitCode}
          </Typography>
        </Box>
      </Box>
    </RenacerLayout>
  );
}
