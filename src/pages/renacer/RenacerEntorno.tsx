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
import { BotonPrincipal, BotonSecundario, Campo, anilloFoco } from './ui';
import { leerCredencial, leerMuro, publicarEnMuro, reportarMensaje, type MensajeMuro } from './renacerApi';
import { copy } from './renacerCopy';
import { qeFont } from '../../design-system';

export default function RenacerEntorno() {
  const t = useRenacerTokens();
  const navegar = useNavigate();
  const [mensajes, setMensajes] = useState<MensajeMuro[] | 'cargando' | 'error'>('cargando');
  // Ids ya reportados en esta visita: el botón se vuelve confirmación, no se repite.
  const [reportados, setReportados] = useState<Set<string>>(new Set());
  const [borrador, setBorrador] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [errorEnvio, setErrorEnvio] = useState<string | null>(null);
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
    setErrorEnvio(null);
    try {
      await publicarEnMuro(borrador.trim(), credencial);
      setBorrador('');
      cargar();
    } catch {
      // Sin este `catch` el fallo era MUDO: el borrador quedaba escrito, no aparecía
      // nada en el muro y no se decía nada. La persona no puede distinguir "no se
      // publicó" de "se publicó y no lo veo", y en el muro de desahogo eso se lee como
      // que a nadie le importó. El borrador NO se borra: es lo que ella escribió.
      setErrorEnvio(copy.muro.noSePudo);
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
          Todavía estamos preparando las meditaciones y la música. Cuando estén, van a aparecer acá.
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
            etiqueta="¿Cómo vas?"
            valor={borrador}
            onChange={setBorrador}
            placeholder="Escribí lo que quieras dejar acá"
            multilinea
          />
          <BotonPrincipal disabled={enviando || !borrador.trim()} onClick={publicar}>
            {enviando ? 'Publicando…' : 'Publicar'}
          </BotonPrincipal>
          {errorEnvio && (
            <Typography
              role="alert"
              sx={{ fontFamily: qeFont.ui, fontSize: 14, color: t.alert, mt: 1.25, lineHeight: 1.5 }}
            >
              {errorEnvio}
            </Typography>
          )}
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
        <>
          <Typography sx={{ fontFamily: qeFont.ui, fontSize: 14, color: t.muted, mb: 1.5 }}>
            No pudimos cargar el muro. Puede ser la conexión.
          </Typography>
          <BotonSecundario onClick={cargar}>Reintentar</BotonSecundario>
        </>
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
            <Box sx={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 1.5 }}>
              <Typography sx={{ fontFamily: qeFont.ui, fontSize: 13, color: t.subtle }}>
                {m.authorName ?? 'Alguien de la tribu'}
              </Typography>
              {reportados.has(m.id) ? (
                <Typography role="status" sx={{ fontFamily: qeFont.ui, fontSize: 12.5, color: t.subtle }}>
                  Gracias por avisar. Alguien lo va a revisar.
                </Typography>
              ) : (
                <Box
                  component="button"
                  type="button"
                  onClick={() => {
                    setReportados((prev) => new Set(prev).add(m.id));
                    // Sin await: el reporte es señal, no transacción — si falla, la bandeja
                    // del equipo no lo ve, pero a quien reporta no se le castiga con un error.
                    void reportarMensaje(m.id).catch(() => {});
                  }}
                  sx={{ fontFamily: qeFont.ui, fontSize: 12.5, color: t.subtle, background: 'none', border: 0, p: 0.5, m: -0.5, cursor: 'pointer', textDecoration: 'underline', textUnderlineOffset: 3, borderRadius: 999, ...anilloFoco(t) }}
                >
                  Reportar
                </Box>
              )}
            </Box>
          </Box>
        ))}

      {Array.isArray(mensajes) && mensajes.length === 0 && (
        <Typography sx={{ fontFamily: qeFont.ui, fontSize: 15, color: t.muted, mb: 3 }}>
          El muro está vacío. Podés ser quien lo empiece.
        </Typography>
      )}

      <Box sx={{ mt: 2 }}>
        <BotonSecundario onClick={() => navegar(credencial ? `/renacer/b/${credencial.cardNumber}?t=${credencial.cardToken}` : '/renacer')}>
          {credencial ? 'Volver a mi carnet' : 'Volver'}
        </BotonSecundario>
      </Box>
    </RenacerLayout>
  );
}
