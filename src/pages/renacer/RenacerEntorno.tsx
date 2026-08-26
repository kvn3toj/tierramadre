/**
 * `/renacer/entorno` — playlists y muro de desahogo (§6.9). Ruta no impresa, cambiable.
 *
 * El encuadre honesto que la sala misma se dio el 25-08: esta parte de la app sirve, en
 * el fondo, para **esperar organizadamente las noticias de la ayuda**. El diseño no
 * promete más que eso, y el copy tampoco.
 *
 * **Las playlists no existen todavía** — no hay pieza ratificada (§11.c es el video, y de
 * las playlists no hay ni decisión de contenido). Poner enlaces inventados sería peor que
 * no poner nada, así que la sección dice lo que hay.
 *
 * El muro tiene moderación mínima desde el día uno (`hiddenAt` en el backend, §8.3): un
 * muro de desahogo de damnificados sin manera de ocultar un mensaje sería una decisión, y
 * la equivocada.
 */

import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, CircularProgress, Typography } from '@mui/material';
import RenacerLayout, { useRenacerTokens } from './RenacerLayout';
import { BotonPrincipal, BotonSecundario, Campo } from './ui';
import { leerCredencial, leerMuro, publicarEnMuro, type MensajeMuro } from './renacerApi';
import { qeFont } from '../../design-system';

export default function RenacerEntorno() {
  const t = useRenacerTokens();
  const navegar = useNavigate();
  const [mensajes, setMensajes] = useState<MensajeMuro[] | 'cargando' | 'error'>('cargando');
  const [borrador, setBorrador] = useState('');
  const [enviando, setEnviando] = useState(false);
  const credencial = leerCredencial();

  const cargar = useCallback(() => {
    leerMuro()
      .then(setMensajes)
      .catch(() => setMensajes('error'));
  }, []);

  useEffect(cargar, [cargar]);

  async function publicar() {
    if (!credencial || !borrador.trim()) return;
    setEnviando(true);
    try {
      await publicarEnMuro(borrador.trim(), credencial);
      setBorrador('');
      cargar();
    } finally {
      setEnviando(false);
    }
  }

  return (
    <RenacerLayout
      titulo="Mientras tanto"
      bajada="Esperar también se hace en compañía. Acá podés dejar lo que estés sintiendo y leer lo que dejaron otros."
    >
      <Typography
        sx={{ fontFamily: qeFont.ui, fontSize: 13, letterSpacing: '0.1em', textTransform: 'uppercase', color: t.subtle, mb: 1.5 }}
      >
        Meditaciones y música
      </Typography>
      <Box
        sx={{
          border: `1px dashed ${t.border}`,
          bgcolor: t.surface,
          borderRadius: 2,
          p: 2,
          mb: 4,
        }}
      >
        <Typography sx={{ fontFamily: qeFont.ui, fontSize: 14.5, color: t.subtle, lineHeight: 1.5 }}>
          Las respiraciones conscientes y la música medicina todavía se están preparando.
          Cuando estén, van a aparecer acá.
        </Typography>
      </Box>

      <Typography
        sx={{ fontFamily: qeFont.ui, fontSize: 13, letterSpacing: '0.1em', textTransform: 'uppercase', color: t.subtle, mb: 1.5 }}
      >
        Muro
      </Typography>

      {credencial ? (
        <Box sx={{ mb: 3 }}>
          <Campo
            etiqueta="¿Cómo venís?"
            valor={borrador}
            onChange={setBorrador}
            placeholder="Escribí lo que quieras dejar acá"
            multilinea
          />
          <BotonPrincipal disabled={enviando || !borrador.trim()} onClick={publicar}>
            {enviando ? 'Publicando…' : 'Publicar'}
          </BotonPrincipal>
        </Box>
      ) : (
        <Typography
          sx={{ fontFamily: qeFont.ui, fontSize: 14, color: t.subtle, mb: 3, lineHeight: 1.5 }}
        >
          Para escribir en el muro necesitás tu carnet. Podés leer lo que dejaron otros igual.
        </Typography>
      )}

      {mensajes === 'cargando' && <CircularProgress size={20} sx={{ color: t.accent }} />}

      {mensajes === 'error' && (
        <BotonSecundario onClick={cargar}>No pudimos cargar el muro. Reintentar</BotonSecundario>
      )}

      {Array.isArray(mensajes) &&
        mensajes.map((m) => (
          <Box
            key={m.id}
            sx={{
              borderLeft: `2px solid ${t.border}`,
              pl: 2,
              py: 1,
              mb: 2.5,
            }}
          >
            <Typography
              sx={{ fontFamily: qeFont.ui, fontSize: 15, color: t.text, lineHeight: 1.55, mb: 0.5 }}
            >
              {m.body}
            </Typography>
            <Typography sx={{ fontFamily: qeFont.ui, fontSize: 13, color: t.subtle }}>
              {m.authorName}
            </Typography>
          </Box>
        ))}

      {Array.isArray(mensajes) && mensajes.length === 0 && (
        <Typography sx={{ fontFamily: qeFont.ui, fontSize: 15, color: t.muted, mb: 3 }}>
          El muro está vacío. Podés ser quien lo empiece.
        </Typography>
      )}

      <Box sx={{ mt: 2 }}>
        <BotonSecundario onClick={() => navegar('/renacer')}>Volver</BotonSecundario>
      </Box>
    </RenacerLayout>
  );
}
