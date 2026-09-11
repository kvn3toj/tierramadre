/**
 * `/tienda/terminos` · `/tienda/privacidad` · `/tienda/retracto` · `/tienda/contacto`
 *
 * Un solo componente para los cuatro documentos del pie. Cuatro archivos casi
 * idénticos habrían divergido en la primera corrección de maquetación, y lo
 * único que cambia de verdad entre ellos es el índice de secciones.
 *
 * LA REGLA QUE MANDA AQUÍ: en esta página no se redacta derecho. En Colombia
 * la venta al consumidor la gobiernan la ley 1480 y la 1581, y el NIT del
 * vendedor, el procedimiento real de retracto y el canal ante la SIC sólo los
 * tiene la empresa. Una prosa legal verosímil escrita por la casa del software
 * sería una representación legal inventada: peor que un dato inventado, porque
 * un comprador la leería como el compromiso que la tienda adquirió con él.
 * Por eso los tres documentos legales muestran el aviso de «en preparación» y
 * un índice de titulares sin cuerpo, que le sirve al dueño de plantilla para
 * rellenar.
 *
 * Contacto es la excepción: no es texto legal, son los canales que ya existen
 * y verificamos en `constants/contact`. Se muestra completo, salvo la fila de
 * identificación del vendedor, que queda marcada como pendiente por lo mismo.
 */
import { Box, Typography } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import TiendaShell from './TiendaShell';
import { useLanguage } from '../../contexts/LanguageContext';
import { Button, qeType } from '../../design-system';
import {
  HOUSE_WHATSAPP_DISPLAY,
  INSTAGRAM_URL,
  houseWhatsAppLink,
} from '../../constants/contact';

/** Los cuatro documentos que cuelgan del pie. */
export type LegalKind = 'terminos' | 'privacidad' | 'retracto' | 'contacto';

export interface LegalPageProps {
  /** Qué documento se está viendo. Lo fija la ruta en App.tsx: explícito y
   *  tipado, sin leer el último segmento de la URL y sin caso por defecto. */
  kind: LegalKind;
}

/** La medida de lectura. 68ch cae dentro de las 65-75 que pide el sistema. */
const MEDIDA = '68ch';

/** El arroba sale de la propia URL del perfil, no se escribe a mano: así un
 *  cambio de cuenta en `constants/contact` no deja aquí un handle fantasma. */
const INSTAGRAM_HANDLE = `@${new URL(INSTAGRAM_URL).pathname.replace(/\//g, '')}`;

const filaSx = {
  paddingInline: '16px',
  paddingBlock: '12px',
  '& + &': { borderTop: '1px solid var(--tm-hairline)' },
} as const;

const enlaceSx = {
  ...qeType.body,
  fontSize: '0.9375rem',
  display: 'flex',
  alignItems: 'center',
  minHeight: 44,
  textDecoration: 'none',
  color: 'var(--tm-accent)',
  transition: 'opacity var(--tm-fast) var(--tm-ease)',
  '&:hover': { opacity: 0.72 },
  '&:focus-visible': { outline: 'none', boxShadow: 'var(--tm-focus-ring)' },
} as const;

export default function LegalPage({ kind }: LegalPageProps) {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const legal = t.tienda.legal;
  const esContacto = kind === 'contacto';

  return (
    <TiendaShell>
      <Box sx={{ maxWidth: MEDIDA }}>
        <Typography
          component="h1"
          sx={{
            ...qeType.display,
            fontSize: 'clamp(1.875rem, 6vw, 2.5rem)',
            color: 'var(--tm-text)',
          }}
        >
          {legal[kind]}
        </Typography>
        <Typography
          sx={{
            ...qeType.body,
            fontSize: '1.0625rem',
            color: 'var(--tm-muted)',
            marginBlockStart: '12px',
          }}
        >
          {legal.lead[kind]}
        </Typography>

        {esContacto ? (
          <>
            {/* Los canales de verdad. El teléfono y el perfil salen de
                constants/contact, que es donde ya viven verificados. */}
            <Box
              component="dl"
              sx={{
                margin: 0,
                marginBlockStart: '28px',
                border: '1px solid var(--tm-border)',
                borderRadius: 'var(--tm-radius-card)',
                overflow: 'hidden',
              }}
            >
              <Box sx={filaSx}>
                <Typography component="dt" sx={{ ...qeType.overline, color: 'var(--tm-muted)' }}>
                  WhatsApp
                </Typography>
                <Box component="dd" sx={{ margin: 0 }}>
                  <Box
                    component="a"
                    href={houseWhatsAppLink()}
                    target="_blank"
                    rel="noopener noreferrer"
                    sx={enlaceSx}
                  >
                    {HOUSE_WHATSAPP_DISPLAY}
                  </Box>
                </Box>
              </Box>

              <Box sx={filaSx}>
                <Typography component="dt" sx={{ ...qeType.overline, color: 'var(--tm-muted)' }}>
                  Instagram
                </Typography>
                <Box component="dd" sx={{ margin: 0 }}>
                  <Box
                    component="a"
                    href={INSTAGRAM_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    sx={enlaceSx}
                  >
                    {INSTAGRAM_HANDLE}
                  </Box>
                </Box>
              </Box>

              <Box sx={filaSx}>
                <Typography component="dt" sx={{ ...qeType.overline, color: 'var(--tm-muted)' }}>
                  {legal.sellerLabel}
                </Typography>
                {/* Marcado como pendiente a propósito. Una razón social o un
                    NIT plausibles aquí serían una identidad de vendedor
                    inventada, y es justo el dato con el que un comprador
                    reclama. */}
                <Typography
                  component="dd"
                  sx={{
                    ...qeType.body,
                    fontSize: '0.9375rem',
                    color: 'var(--tm-muted)',
                    margin: 0,
                    minHeight: 44,
                    display: 'flex',
                    alignItems: 'center',
                  }}
                >
                  {legal.sellerPending}
                </Typography>
              </Box>
            </Box>

            {/* Sin `target`: el Button de DS3 tipa sólo `href` (no acepta
                `target` ni `component`), y en la misma pestaña wa.me no deja
                `window.opener` abierto, así que tampoco hace falta `rel`. */}
            <Box sx={{ marginBlockStart: '20px' }}>
              <Button href={houseWhatsAppLink()} variant="primary">
                {t.tienda.laCasa.contact}
              </Button>
            </Box>
          </>
        ) : (
          <>
            {/* El aviso lleva borde y fondo de pozo porque tiene que leerse
                como un estado del documento, no como su primer párrafo. */}
            <Box
              component="section"
              aria-labelledby="legal-pendiente"
              sx={{
                marginBlockStart: '28px',
                border: '1px solid var(--tm-border)',
                backgroundColor: 'var(--tm-well)',
                borderRadius: 'var(--tm-radius-card)',
                paddingInline: { xs: '16px', sm: '20px' },
                paddingBlock: { xs: '16px', sm: '20px' },
              }}
            >
              <Typography
                component="h2"
                id="legal-pendiente"
                sx={{ ...qeType.overline, color: 'var(--tm-muted)' }}
              >
                {legal.pendingTitle}
              </Typography>
              <Typography
                sx={{
                  ...qeType.body,
                  fontSize: '0.9375rem',
                  color: 'var(--tm-text)',
                  marginBlockStart: '8px',
                }}
              >
                {legal.pendingBody}
              </Typography>
            </Box>

            {/* Titulares sin cuerpo: el esqueleto que el dueño rellena. Poner
                aquí una frase de ejemplo debajo de cada uno sería exactamente
                el texto legal que esta página se niega a redactar. */}
            <Typography
              component="h2"
              sx={{
                ...qeType.title,
                color: 'var(--tm-text)',
                marginBlockStart: '32px',
              }}
            >
              {legal.indexTitle}
            </Typography>
            <Box
              component="ol"
              sx={{
                listStyle: 'none',
                margin: 0,
                padding: 0,
                marginBlockStart: '12px',
                border: '1px solid var(--tm-border)',
                borderRadius: 'var(--tm-radius-card)',
                overflow: 'hidden',
              }}
            >
              {legal.secciones[kind].map((titular) => (
                <Box
                  key={titular}
                  component="li"
                  sx={{
                    ...qeType.body,
                    fontSize: '0.9375rem',
                    color: 'var(--tm-muted)',
                    ...filaSx,
                  }}
                >
                  {titular}
                </Box>
              ))}
            </Box>

            {/* Salida útil: mientras el documento no exista, la duda se
                resuelve hablando con la casa. */}
            <Box sx={{ marginBlockStart: '24px' }}>
              <Button variant="tinted" onClick={() => navigate('/tienda/contacto')}>
                {legal.contacto}
              </Button>
            </Box>
          </>
        )}
      </Box>

      <Box aria-hidden="true" sx={{ height: 72 }} />
    </TiendaShell>
  );
}
