/**
 * `/renacer/k/:codigo` — **la URL que va impresa en cada estuche.**
 *
 * Contrato permanente desde el 2026-08-25 (compuerta §3.4 · G-A.1). Este path no se
 * renombra, no se reusa y no se borra: hay estuches impresos que apuntan acá. Lo que se
 * sirve detrás puede cambiar todas las veces que haga falta; el path, nunca.
 *
 * Esta pantalla resuelve el código y abre el flujo. El flujo completo —video,
 * necesidades primero, datos después, carnet— son los Tasks 5–9 del plan.
 */

import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Box, CircularProgress, Typography } from '@mui/material';
import RenacerLayout, { useRenacerTokens } from './RenacerLayout';
import { resolverKit, type KitResuelto } from './renacerApi';
import { qeFont } from '../../design-system';

type Estado =
  | { fase: 'cargando' }
  | { fase: 'resuelto'; kit: KitResuelto }
  | { fase: 'error'; mensaje: string };

export default function RenacerBeneficiario() {
  const { codigo = '' } = useParams();
  const t = useRenacerTokens();
  const [estado, setEstado] = useState<Estado>({ fase: 'cargando' });

  useEffect(() => {
    let vigente = true;
    resolverKit(codigo)
      .then((kit) => vigente && setEstado({ fase: 'resuelto', kit }))
      .catch((e: Error) => vigente && setEstado({ fase: 'error', mensaje: e.message }));
    return () => {
      vigente = false;
    };
  }, [codigo]);

  if (estado.fase === 'cargando') {
    return (
      <RenacerLayout titulo="Un momento…">
        <CircularProgress size={24} sx={{ color: t.accent }} />
      </RenacerLayout>
    );
  }

  // Código con formato malo, o que no existe. Pantalla honesta con salida — nunca un 404
  // crudo, y nunca la pantalla de bienvenida del catálogo de esmeraldas.
  if (estado.fase === 'error' || !estado.kit.existe) {
    return (
      <RenacerLayout
        titulo="No reconocemos ese código"
        bajada="Puede que falte un número o sobre alguno. Está impreso debajo del QR, en el estuche."
      >
        <Box
          component="a"
          href="/renacer"
          sx={{
            display: 'inline-block',
            fontFamily: qeFont.ui,
            fontSize: 16,
            color: t.accent,
            textDecoration: 'none',
            borderBottom: `1px solid ${t.accent}`,
          }}
        >
          Escribirlo de nuevo
        </Box>
      </RenacerLayout>
    );
  }

  return (
    <RenacerLayout
      titulo="Bienvenida. Bienvenido."
      bajada="Alguien compró un kit y dejó esta manilla para vos. Lo que sigue es contarnos qué necesitás — eso es lo que hace que la ayuda llegue a donde tiene que llegar."
    >
      <Box
        sx={{
          border: `1px solid ${t.border}`,
          bgcolor: t.surface,
          borderRadius: 2,
          p: 2,
          mb: 3,
        }}
      >
        <Typography sx={{ fontFamily: qeFont.ui, fontSize: 13, color: t.subtle }}>
          Código del estuche
        </Typography>
        <Typography sx={{ fontFamily: qeFont.serif, fontSize: 32, color: t.text }}>
          {codigo}
        </Typography>
      </Box>

      {/* Tasks 5–9: video de contexto, composer de necesidades, datos + consentimientos,
          carnet, capacidades, mapa de la Tribu y entorno. El orden del §6 es no
          negociable: necesidades PRIMERO, datos DESPUÉS. */}
      <Typography sx={{ fontFamily: qeFont.ui, fontSize: 15, color: t.muted }}>
        En un momento te vamos a pedir que nos cuentes qué necesitás, y solo después tus
        datos, para saber dónde llevarte la ayuda.
      </Typography>
    </RenacerLayout>
  );
}
