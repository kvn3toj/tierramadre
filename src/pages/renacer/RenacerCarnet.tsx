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
import { renacerFont } from '../../design-system';
const qeFont = { ui: renacerFont.ui, serif: renacerFont.display };

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
      <RenacerLayout centrado marca titulo="Este carnet no se puede mostrar" bajada={copy.carnet.noSeMuestra}>
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
          backdropFilter: 'blur(12px)',
          borderRadius: '24px',
          p: 3,
          mb: 3,
          textAlign: 'center',
          boxShadow: t.shadow,
        }}
      >
        {/* La marca va DENTRO de la tarjeta: la persona la guarda como captura y la muestra al recibir. */}
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1, pb: 1.5, mb: 2, borderBottom: `1px solid ${t.hairline}` }}>
          <Box component="img" src={t.logo} alt="" sx={{ width: 22, height: 22, objectFit: 'contain', opacity: 0.9 }} />
          <Typography sx={{ fontFamily: renacerFont.display, fontWeight: 600, fontSize: 11, letterSpacing: '0.2em', textTransform: 'uppercase', color: t.accent }}>
            Renacer · carnet
          </Typography>
        </Box>
        <Typography sx={{ fontFamily: qeFont.ui, fontSize: 13, color: t.muted, mb: 0.5 }}>
          Número
        </Typography>
        <Typography
          sx={{ fontFamily: renacerFont.display, fontWeight: 800, fontSize: 60, lineHeight: 1, letterSpacing: '-0.03em', color: t.text, mb: 2.5 }}
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

        <Typography sx={{ fontFamily: renacerFont.display, fontWeight: 700, fontSize: 24, color: t.text }}>
          {carnet.primerNombre}
        </Typography>
        {carnet.codigo !== null && (
          <Typography sx={{ fontFamily: renacerFont.mono, fontSize: 14, letterSpacing: '0.08em', color: t.accent, mt: 0.75 }}>
            {copy.carnet.codigo(carnet.codigo)}
          </Typography>
        )}
        {carnet.raiz && (
          <Typography sx={{ fontFamily: qeFont.ui, fontSize: 13, color: t.subtle, mt: 0.25 }}>
            {copy.carnet.raiz(carnet.raiz.nombre, carnet.raiz.comunidad)}
          </Typography>
        )}
      </Box>

      <Typography sx={{ fontFamily: qeFont.ui, fontSize: 14.5, color: t.muted, mb: 1.5, lineHeight: 1.5 }}>
        Guardá esta pantalla: con una captura basta.
      </Typography>
      <Typography sx={{ fontFamily: qeFont.ui, fontSize: 14.5, color: t.muted, mb: 3, lineHeight: 1.5 }}>
        {copy.carnet.queSigue}
      </Typography>

      <Box sx={{ display: 'grid', gap: 1.5 }}>
        <BotonSecundario onClick={() => navegar('/renacer/tribu')}>
          Conocer las necesidades
        </BotonSecundario>
        <BotonSecundario onClick={() => navegar('/renacer/entorno')}>
          Mientras esperás: muro y meditaciones
        </BotonSecundario>
        <BotonSecundario onClick={() => navegar('/renacer/gracias')}>
          Dar las gracias
        </BotonSecundario>
      </Box>
    </RenacerLayout>
  );
}
