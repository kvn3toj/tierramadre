/**
 * `/renacer` — la puerta: el fork de dos botones (textual del 24-08).
 *
 * Quien llega acá sin código —porque el QR falló, porque el teléfono no tiene cámara, o
 * porque le pasaron el link— toma "Recibí una manilla" y teclea el código impreso bajo
 * el QR (§3.4 · G-A.2: "Código 666", dictable por teléfono).
 */

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Button, TextField, Typography } from '@mui/material';
import RenacerLayout, { useRenacerTokens } from './RenacerLayout';
import { qeFont } from '../../design-system';

export default function RenacerPuerta() {
  const t = useRenacerTokens();
  const navegar = useNavigate();
  const [tecleando, setTecleando] = useState(false);
  const [codigo, setCodigo] = useState('');

  const codigoValido = /^[1-9][0-9]{2,3}$/.test(codigo.trim());

  return (
    <RenacerLayout
      titulo="El terremoto se llevó casas enteras. Lo que sigue lo hacemos entre todos."
      bajada="Cada manilla que se compra deja otra en manos de una familia damnificada. Y cada manilla lleva un código: con él, quien la recibe cuenta qué necesita."
    >
      {!tecleando ? (
        <Box sx={{ display: 'grid', gap: 1.5 }}>
          <Button
            fullWidth
            size="large"
            onClick={() => navegar('/renacer/ayudar')}
            sx={{
              bgcolor: t.accent,
              color: t.onAccent,
              fontFamily: qeFont.ui,
              py: 1.75,
              '&:hover': { bgcolor: t.accentStrong },
            }}
          >
            ¿Quieres ayudar?
          </Button>

          <Button
            fullWidth
            size="large"
            onClick={() => setTecleando(true)}
            sx={{
              border: `1px solid ${t.border}`,
              color: t.text,
              fontFamily: qeFont.ui,
              py: 1.75,
            }}
          >
            Recibí una manilla — soy beneficiario
          </Button>
        </Box>
      ) : (
        <Box sx={{ display: 'grid', gap: 2 }}>
          <Typography sx={{ fontFamily: qeFont.ui, fontSize: 15, color: t.muted }}>
            Escribe el código que viene impreso debajo del QR, en el estuche. Son tres o
            cuatro números.
          </Typography>

          <TextField
            autoFocus
            value={codigo}
            onChange={(e) => setCodigo(e.target.value.replace(/[^0-9]/g, '').slice(0, 4))}
            placeholder="666"
            inputProps={{ inputMode: 'numeric', 'aria-label': 'Código del estuche' }}
            sx={{ '& input': { fontFamily: qeFont.ui, fontSize: 28, letterSpacing: '0.2em' } }}
          />

          <Button
            fullWidth
            size="large"
            disabled={!codigoValido}
            onClick={() => navegar(`/renacer/k/${codigo.trim()}`)}
            sx={{
              bgcolor: t.accent,
              color: t.onAccent,
              fontFamily: qeFont.ui,
              py: 1.75,
              '&:hover': { bgcolor: t.accentStrong },
              '&.Mui-disabled': { bgcolor: t.surface2, color: t.subtle },
            }}
          >
            Continuar
          </Button>
        </Box>
      )}
    </RenacerLayout>
  );
}
