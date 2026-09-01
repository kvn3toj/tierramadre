/**
 * `/renacer` — la puerta: el fork de dos botones (24-08, ratificado de nuevo el 31-08).
 *
 * Quien llega acá con un código —porque alguien de su comunidad lo invitó— lo teclea;
 * quien quiere ayudar entra por el otro botón. Desde el 31-08 no hay manilla ni estuche
 * en este camino: hay una invitación (nota Anima `2026-08-31-renacer-flujo-reunion-pivote`).
 */

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, TextField, Typography } from '@mui/material';
import RenacerLayout, { useRenacerTokens } from './RenacerLayout';
import { BotonPrincipal, BotonSecundario, HuecoDeVideo } from './ui';
import { leerCredencial } from './renacerApi';
import { copy } from './renacerCopy';
import { qeFont, renacerFont } from '../../design-system';

/** Mismo formato que valida el servidor (`convex-renacer/convex/lib/codigos.ts`). */
export const FORMATO_CODIGO = /^[1-9][0-9]{2,3}$/;

export default function RenacerPuerta() {
  const t = useRenacerTokens();
  const navegar = useNavigate();
  const [tecleando, setTecleando] = useState(false);
  const [codigo, setCodigo] = useState('');

  const codigoValido = FORMATO_CODIGO.test(codigo.trim());
  const credencial = leerCredencial();
  const irAlCodigo = () => codigoValido && navegar(`/renacer/k/${codigo.trim()}`);

  return (
    <RenacerLayout
      marca
      lead={copy.puerta.lead}
      titulo={copy.puerta.pregunta}
      bajada={copy.puerta.bajada}
    >
      {!tecleando ? (
        <Box sx={{ display: 'grid', gap: 1.5 }}>
          <HuecoDeVideo nota="Pronto, un video corto sobre la campaña." />
          <BotonPrincipal onClick={() => navegar('/renacer/ayudar')}>
            {copy.puerta.botonAyudar}
          </BotonPrincipal>
          <BotonSecundario onClick={() => setTecleando(true)}>
            {copy.puerta.botonCodigo}
          </BotonSecundario>
          {credencial && (
            // Quien ya se registró vuelve a su carnet desde la puerta, sin re-teclear un código ya usado.
            <BotonSecundario onClick={() => navegar(`/renacer/b/${credencial.cardNumber}?t=${credencial.cardToken}`)}>
              {copy.puerta.botonMiCarnet}
            </BotonSecundario>
          )}
        </Box>
      ) : (
        <Box
          component="form"
          onSubmit={(e) => {
            e.preventDefault();
            irAlCodigo();
          }}
          sx={{ display: 'grid', gap: 2 }}
        >
          <Typography sx={{ fontFamily: qeFont.ui, fontSize: 15, color: t.muted }}>
            {copy.puerta.instruccionCodigo}
          </Typography>

          <TextField
            autoFocus
            value={codigo}
            onChange={(e) => setCodigo(e.target.value.replace(/[^0-9]/g, '').slice(0, 4))}
            placeholder="101"
            inputProps={{ inputMode: 'numeric', 'aria-label': copy.puerta.ariaCodigo }}
            sx={{
              '& .MuiOutlinedInput-root': { bgcolor: t.glass, borderRadius: 3 },
              '& input': { fontFamily: renacerFont.mono, fontSize: 30, letterSpacing: '0.25em', textIndent: '0.25em', color: t.text, textAlign: 'center' },
              '& fieldset': { borderColor: t.controlBorder },
              '& .MuiOutlinedInput-root.Mui-focused fieldset': { borderColor: t.accent },
            }}
          />

          {codigo.length > 0 && !codigoValido && (
            <Typography role="alert" sx={{ fontFamily: qeFont.ui, fontSize: 13.5, color: t.muted }}>
              {copy.puerta.codigoIncompleto}
            </Typography>
          )}
          <BotonPrincipal type="submit" disabled={!codigoValido} onClick={irAlCodigo}>
            Continuar
          </BotonPrincipal>
          <BotonSecundario onClick={() => setTecleando(false)}>Volver</BotonSecundario>
        </Box>
      )}
    </RenacerLayout>
  );
}
