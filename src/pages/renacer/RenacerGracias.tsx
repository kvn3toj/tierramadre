/**
 * `/renacer/gracias` — el muro de gratitud (reunión 31-08). Ruta no impresa, cambiable.
 *
 * «Va a dejar esa gratitud en la web.» Era la única parte del bucle del aportador que no
 * existía en ninguna capa: el esquema ya tenía el muro `gratitud` desde el pivote, pero
 * nada lo servía y ninguna pantalla lo escribía ni lo leía.
 *
 * **Escribe quien recibió; lee cualquiera.** Esa asimetría es el punto — es lo único que
 * le vuelve a quien aportó, y por eso la pantalla es pública sin credencial y el hub del
 * aportador enlaza acá. Escribir sí exige el carnet: un muro que cualquiera puede firmar
 * en nombre de una familia damnificada no es un muro, es una superficie de suplantación.
 *
 * Se firma con **nombre de pila** — lo recorta el backend, no esta pantalla (§10.3).
 *
 * Lo que este muro NO es todavía: el QR de la tarjeta física («esta esperanza fue sembrada
 * por…»), que necesita el símbolo con precio y SKU (D-0831-1) y una tirada impresa. Cuando
 * exista, esa tarjeta apunta acá — el destino ya está de pie.
 */

import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, CircularProgress, Typography } from '@mui/material';
import RenacerLayout, { useRenacerTokens } from './RenacerLayout';
import { BotonPrincipal, BotonSecundario, Campo, anilloFoco } from './ui';
import { leerCredencial, leerMuro, publicarEnMuro, reportarMensaje, type MensajeMuro } from './renacerApi';
import { copy } from './renacerCopy';
import { qeFont, renacerFont } from '../../design-system';

export default function RenacerGracias() {
  const t = useRenacerTokens();
  const navegar = useNavigate();
  const [mensajes, setMensajes] = useState<MensajeMuro[] | 'cargando' | 'error'>('cargando');
  // Ids ya reportados en esta visita: el botón se vuelve confirmación, no se repite.
  const [reportados, setReportados] = useState<Set<string>>(new Set());
  const [borrador, setBorrador] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [listo, setListo] = useState(false);
  const [errorEnvio, setErrorEnvio] = useState<string | null>(null);
  const credencial = leerCredencial();

  const cargar = useCallback(() => {
    leerMuro('gratitud')
      .then(setMensajes)
      .catch(() => setMensajes('error'));
  }, []);

  useEffect(cargar, [cargar]);

  async function publicar() {
    if (!credencial || !borrador.trim()) return;
    setEnviando(true);
    setErrorEnvio(null);
    try {
      await publicarEnMuro(borrador.trim(), credencial, 'gratitud');
      setBorrador('');
      setListo(true);
      cargar();
    } catch {
      // Peor que en el desahogo: `setListo(true)` estaba DESPUÉS del await, así que un
      // fallo no dejaba ni confirmación ni error — la pantalla quedaba idéntica a antes
      // de tocar el botón. El borrador se conserva.
      setErrorEnvio(copy.muro.noSePudo);
    } finally {
      setEnviando(false);
    }
  }

  return (
    <RenacerLayout titulo={copy.gracias.titulo} bajada={copy.gracias.bajada}>
      {credencial ? (
        <Box sx={{ mb: 3.5 }}>
          <Campo
            etiqueta={copy.gracias.etiqueta}
            razon={copy.gracias.razon}
            valor={borrador}
            onChange={(v) => {
              setBorrador(v);
              if (listo) setListo(false);
            }}
            multilinea
            placeholder="Gracias por…"
          />
          <BotonPrincipal onClick={publicar} disabled={enviando || borrador.trim().length === 0}>
            {copy.gracias.enviar}
          </BotonPrincipal>
          {errorEnvio && (
            <Typography
              role="alert"
              sx={{ fontFamily: qeFont.ui, fontSize: 14, color: t.alert, mt: 1.25, lineHeight: 1.5 }}
            >
              {errorEnvio}
            </Typography>
          )}
          {listo && (
            <Typography
              role="status"
              sx={{ fontFamily: qeFont.ui, fontSize: 14, color: t.accent, mt: 1.25 }}
            >
              {copy.gracias.enviado}
            </Typography>
          )}
        </Box>
      ) : (
        <Typography
          sx={{ fontFamily: qeFont.ui, fontSize: 14.5, color: t.muted, lineHeight: 1.55, mb: 3.5 }}
        >
          {copy.gracias.sinCarnet}
        </Typography>
      )}

      <Typography
        sx={{ fontFamily: qeFont.ui, fontSize: 13, letterSpacing: '0.1em', textTransform: 'uppercase', color: t.subtle, mb: 1.5 }}
      >
        {copy.gracias.tituloPublico}
      </Typography>

      {mensajes === 'cargando' && <CircularProgress size={20} sx={{ color: t.accent }} />}

      {mensajes === 'error' && (
        <Typography sx={{ fontFamily: qeFont.ui, fontSize: 14.5, color: t.muted }}>
          No pudimos cargar el muro. Recargá la página.
        </Typography>
      )}

      {Array.isArray(mensajes) && mensajes.length === 0 && (
        <Typography sx={{ fontFamily: qeFont.ui, fontSize: 14.5, color: t.muted }}>
          {copy.gracias.vacio}
        </Typography>
      )}

      {Array.isArray(mensajes) &&
        mensajes.map((m) => (
          <Box
            key={m.id}
            sx={{
              border: `1px solid ${t.border}`,
              bgcolor: t.surface,
              backdropFilter: 'blur(10px)',
              borderRadius: '18px',
              p: 2,
              mb: 1.25,
            }}
          >
            <Typography
              sx={{ fontFamily: qeFont.ui, fontSize: 15, color: t.text, lineHeight: 1.55, whiteSpace: 'pre-wrap' }}
            >
              {m.body}
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 1.5, mt: 1 }}>
              <Typography
                sx={{
                  fontFamily: renacerFont.display,
                  fontWeight: 700,
                  fontSize: 13.5,
                  color: m.authorName ? t.accent : t.subtle,
                }}
              >
                {m.authorName ?? copy.gracias.anonimo}
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

      <Box sx={{ display: 'grid', gap: 1.5, mt: 3 }}>
        <BotonSecundario onClick={() => navegar('/renacer/ayudar')}>
          Quiero ayudar
        </BotonSecundario>
        <BotonSecundario onClick={() => navegar('/renacer')}>Volver al inicio</BotonSecundario>
      </Box>
    </RenacerLayout>
  );
}
