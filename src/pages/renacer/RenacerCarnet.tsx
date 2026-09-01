/**
 * `/renacer/b/:numero` — el carnet. Contrato permanente (§3.4 · G-A.1).
 *
 * "Como la cédula" (§6.6): es el incentivo para completar el registro y el identificador
 * con el que el staff verifica una entrega — "¿dónde y a quién?".
 *
 * **Exige el token del query string** (D-1 del plan). El argumento que hizo aceptable un
 * código de kit adivinable fue "el flujo del código no lee, escribe", y acá sí se lee:
 * sin token, un número secuencial le mostraría a cualquiera el registro de un damnificado.
 *
 * Lo que muestra es lo que una entrega necesita — número, nombre de pila, código y raíz.
 * **La dirección no está**, a propósito: quien entrega ya está ahí, y ponerla en una
 * pantalla que se muestra en público la expone sin que sirva para nada.
 */

import { useEffect, useState } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { Box, CircularProgress, Typography } from '@mui/material';
import { QRCodeSVG } from 'qrcode.react';
import RenacerLayout, { useRenacerTokens } from './RenacerLayout';
import { BotonSecundario } from './ui';
import { leerCarnet, guardarCredencial, type Carnet } from './renacerApi';
import { copy } from './renacerCopy';
import { qeFont } from '../../design-system';

export default function RenacerCarnet() {
  const { numero = '' } = useParams();
  const [params] = useSearchParams();
  const navegar = useNavigate();
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
      .then((c) => {
        if (!vigente) return;
        setCarnet(c);
        // Si llegó acá por el QR desde otro teléfono, dejamos la credencial guardada
        // para que el muro y el mapa de la tribu funcionen sin volver a escanear.
        if (c) guardarCredencial({ cardNumber: c.cardNumber, cardToken: token });
      })
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
        <BotonSecundario onClick={() => navegar('/renacer')}>Volver al inicio</BotonSecundario>
      </RenacerLayout>
    );
  }

  const urlDelCarnet = `${window.location.origin}/renacer/b/${carnet.cardNumber}?t=${token}`;

  return (
    <RenacerLayout titulo="Tu carnet">
      <Box
        sx={{
          border: `1px solid ${t.border}`,
          bgcolor: t.surface,
          borderRadius: 3,
          p: 3,
          mb: 3,
          textAlign: 'center',
        }}
      >
        <Typography sx={{ fontFamily: qeFont.ui, fontSize: 13, color: t.subtle, mb: 0.5 }}>
          Número
        </Typography>
        <Typography
          sx={{ fontFamily: qeFont.serif, fontSize: 56, lineHeight: 1, color: t.text, mb: 2.5 }}
        >
          {carnet.cardNumber}
        </Typography>

        {/* Fondo blanco fijo y no tokenizado: un QR necesita contraste real para que lo
            lea una cámara de gama baja, y en tema oscuro un fondo tokenizado lo apaga. */}
        <Box
          sx={{
            display: 'inline-flex',
            p: 2,
            bgcolor: '#FFFFFF',
            borderRadius: 2,
            mb: 2.5,
          }}
        >
          <QRCodeSVG value={urlDelCarnet} size={180} level="M" />
        </Box>

        <Typography sx={{ fontFamily: qeFont.serif, fontSize: 26, color: t.text }}>
          {carnet.primerNombre}
        </Typography>
        {carnet.codigo !== null && (
          <Typography sx={{ fontFamily: qeFont.ui, fontSize: 14, color: t.subtle, mt: 0.5 }}>
            {copy.carnet.codigo(carnet.codigo)}
          </Typography>
        )}
        {carnet.raiz && (
          <Typography sx={{ fontFamily: qeFont.ui, fontSize: 13, color: t.subtle, mt: 0.25 }}>
            {copy.carnet.raiz(carnet.raiz.nombre, carnet.raiz.comunidad)}
          </Typography>
        )}
      </Box>

      <Typography
        sx={{ fontFamily: qeFont.ui, fontSize: 14.5, color: t.muted, mb: 3, lineHeight: 1.5 }}
      >
        Guardá esta pantalla — una captura alcanza. Este número y este código son los que
        vamos a pedirte cuando llegue la ayuda.
      </Typography>

      <Box sx={{ display: 'grid', gap: 1.5 }}>
        <BotonSecundario onClick={() => navegar('/renacer/tribu')}>
          Conocer las necesidades
        </BotonSecundario>
        <BotonSecundario onClick={() => navegar('/renacer/entorno')}>
          Muro y meditaciones
        </BotonSecundario>
      </Box>
    </RenacerLayout>
  );
}
