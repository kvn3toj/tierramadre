/**
 * RenacerPage — public landing of the "Kit Renacer" campaign (`/renacer`).
 *
 * This is the destination of the QR printed on every Kit Renacer bracelet.
 * It is unauthenticated and intentionally simple: it explains the campaign and
 * makes the access rule explicit — the app (lista de necesidades y capacidades,
 * registro de beneficiarios, playlists) is reserved for people who carry a
 * bracelet. It does NOT sell the kit and it does NOT validate codes yet: the
 * primary CTA hands the person over to WhatsApp with their bracelet code
 * pre-filled, so activation stays human until the backend gate exists.
 *
 * The QR may carry the bracelet code in the path (`/renacer/TM-0042`) or as
 * `?c=CODE`; when present it is shown back and injected into the WhatsApp
 * message. The path form is the one to PRINT: index.html's version-mismatch
 * reload redirects to `window.location.pathname` and drops the query string,
 * so a `?c=` code can be lost for a returning visitor after a deploy.
 */

import { useMemo } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { Box, Button, Stack, Typography } from '@mui/material';
import { brandWhatsAppLink } from '../../constants/brand-contact';

/** Campaign palette — read from the campaign artwork, not from the app theme. */
const CAMPAIGN = {
  deep: '#04150F',
  forest: '#0A2A1E',
  emerald: '#0E5B3A',
  sprout: '#7FE07F',
  ink: '#FFFFFF',
  muted: 'rgba(255,255,255,0.72)',
  hairline: 'rgba(255,255,255,0.14)',
} as const;

const DISPLAY_FONT = "'Montserrat', system-ui, -apple-system, sans-serif";

const STEPS = [
  {
    n: '1',
    title: 'compartiendo',
    body: 'Una manilla se queda contigo y la otra tendrá la misión de reconfortar a una persona que hoy se encuentra damnificada.',
  },
  {
    n: '2',
    title: 'escuchándonos',
    body: 'Cada manilla tiene un QR para acceder a nuestra app, donde cada persona podrá crear su verdadera lista de necesidades y capacidades, y a su vez quedar enlistada para ser beneficiaria.',
  },
  {
    n: '3',
    title: 'conectándonos',
    body: 'El QR permite que contemos con una comunidad organizada y ayudemos de manera inteligente, viendo la data en tiempo real en una misma plataforma.',
  },
] as const;

export default function RenacerPage() {
  const { code } = useParams<{ code?: string }>();
  const [searchParams] = useSearchParams();
  const braceletCode = (code ?? searchParams.get('c') ?? '')
    .trim()
    .toUpperCase();

  const whatsappHref = useMemo(() => {
    const message = braceletCode
      ? `Hola, quiero activar mi acceso al Kit Renacer. Mi código de manilla es ${braceletCode}.`
      : 'Hola, quiero activar mi acceso al Kit Renacer. Ya tengo mi manilla.';
    return brandWhatsAppLink(message);
  }, [braceletCode]);

  const getKitHref = brandWhatsAppLink('Hola, quiero conseguir mi Kit Renacer.');

  return (
    <Box
      component="main"
      sx={{
        minHeight: '100dvh',
        bgcolor: CAMPAIGN.deep,
        color: CAMPAIGN.ink,
        backgroundImage: `radial-gradient(120% 80% at 50% 0%, ${CAMPAIGN.emerald}55 0%, ${CAMPAIGN.forest} 45%, ${CAMPAIGN.deep} 100%)`,
        px: 3,
        py: { xs: 6, sm: 9 },
      }}
    >
      <Stack spacing={7} sx={{ maxWidth: 520, mx: 'auto' }}>
        {/* Hero */}
        <Stack spacing={3} alignItems="center" textAlign="center">
          <Box
            component="img"
            src="/logo-symbol-white.png"
            alt="Tierra Madre"
            sx={{ width: 56, height: 'auto', opacity: 0.95 }}
          />
          <Typography
            sx={{
              fontFamily: DISPLAY_FONT,
              fontWeight: 400,
              fontSize: { xs: '1rem', sm: '1.05rem' },
              lineHeight: 1.5,
              color: CAMPAIGN.muted,
            }}
          >
            Porque después de esta gran tragedia,
            <br />
            la <strong style={{ color: CAMPAIGN.ink }}>única</strong> pregunta
            que podemos hacernos es…
          </Typography>
          <Typography
            component="h1"
            sx={{
              fontFamily: DISPLAY_FONT,
              fontWeight: 700,
              fontSize: { xs: '2.4rem', sm: '3rem' },
              lineHeight: 1.05,
              letterSpacing: '-0.02em',
            }}
          >
            ¿Cómo vamos
            <br />a renacer?
          </Typography>
        </Stack>

        {/* Access gate */}
        <Box
          sx={{
            border: `1px solid ${CAMPAIGN.hairline}`,
            borderRadius: 4,
            p: { xs: 3, sm: 4 },
            bgcolor: 'rgba(255,255,255,0.04)',
            backdropFilter: 'blur(12px)',
          }}
        >
          <Stack spacing={2.5}>
            <Typography
              sx={{
                fontFamily: DISPLAY_FONT,
                fontWeight: 700,
                fontSize: '1.35rem',
                color: CAMPAIGN.sprout,
              }}
            >
              El acceso es para quienes llevan la manilla
            </Typography>
            <Typography sx={{ fontSize: '0.98rem', lineHeight: 1.6, color: CAMPAIGN.muted }}>
              La app del Kit Renacer —tu lista de necesidades y capacidades, el
              registro de beneficiarios y las listas de Spotify— está reservada
              para quienes adquirieron un Kit Renacer. Si ya tienes tu manilla,
              actívala aquí.
            </Typography>

            {braceletCode && (
              <Box
                sx={{
                  border: `1px dashed ${CAMPAIGN.hairline}`,
                  borderRadius: 2,
                  px: 2,
                  py: 1.25,
                }}
              >
                <Typography sx={{ fontSize: '0.7rem', letterSpacing: '0.12em', color: CAMPAIGN.muted }}>
                  CÓDIGO DE TU MANILLA
                </Typography>
                <Typography sx={{ fontFamily: "'DM Mono', monospace", fontSize: '1.1rem' }}>
                  {braceletCode}
                </Typography>
              </Box>
            )}

            <Button
              href={whatsappHref}
              target="_blank"
              rel="noopener noreferrer"
              fullWidth
              sx={{
                bgcolor: CAMPAIGN.sprout,
                color: CAMPAIGN.deep,
                fontFamily: DISPLAY_FONT,
                fontWeight: 700,
                textTransform: 'none',
                fontSize: '1rem',
                py: 1.5,
                borderRadius: 999,
                '&:hover': { bgcolor: '#95E895' },
              }}
            >
              Ya tengo mi manilla — activar acceso
            </Button>

            <Button
              href={getKitHref}
              target="_blank"
              rel="noopener noreferrer"
              fullWidth
              sx={{
                color: CAMPAIGN.ink,
                border: `1px solid ${CAMPAIGN.hairline}`,
                fontFamily: DISPLAY_FONT,
                fontWeight: 500,
                textTransform: 'none',
                fontSize: '0.95rem',
                py: 1.4,
                borderRadius: 999,
              }}
            >
              Aún no tengo mi Kit Renacer
            </Button>
          </Stack>
        </Box>

        {/* Cómo funciona */}
        <Stack spacing={4}>
          <Typography
            sx={{
              fontFamily: DISPLAY_FONT,
              fontWeight: 700,
              fontSize: '1.1rem',
              letterSpacing: '0.02em',
            }}
          >
            Vamos a renacer así
          </Typography>
          {STEPS.map((step) => (
            <Stack key={step.n} direction="row" spacing={2}>
              <Typography
                sx={{
                  fontFamily: DISPLAY_FONT,
                  fontWeight: 700,
                  fontSize: '1.5rem',
                  color: CAMPAIGN.sprout,
                  lineHeight: 1.1,
                  minWidth: 28,
                }}
              >
                {step.n}
              </Typography>
              <Stack spacing={0.75}>
                <Typography
                  sx={{
                    fontFamily: DISPLAY_FONT,
                    fontWeight: 700,
                    fontSize: '1.25rem',
                    color: CAMPAIGN.sprout,
                    lineHeight: 1.1,
                  }}
                >
                  {step.title}
                </Typography>
                <Typography sx={{ fontSize: '0.95rem', lineHeight: 1.6, color: CAMPAIGN.muted }}>
                  {step.body}
                </Typography>
              </Stack>
            </Stack>
          ))}
        </Stack>

        {/* Spotify */}
        <Box
          sx={{
            border: `1px solid ${CAMPAIGN.hairline}`,
            borderRadius: 4,
            p: 3,
          }}
        >
          <Typography
            sx={{
              fontFamily: DISPLAY_FONT,
              fontStyle: 'italic',
              fontWeight: 700,
              fontSize: '1.05rem',
              mb: 1.5,
            }}
          >
            Y además recibe nuestras listas de Spotify
          </Typography>
          <Stack component="ul" spacing={0.5} sx={{ m: 0, pl: 2.5, color: CAMPAIGN.muted }}>
            <Typography component="li" sx={{ fontSize: '0.95rem' }}>
              Respiraciones guiadas
            </Typography>
            <Typography component="li" sx={{ fontSize: '0.95rem' }}>
              Meditaciones
            </Typography>
            <Typography component="li" sx={{ fontSize: '0.95rem' }}>
              Música medicina
            </Typography>
          </Stack>
        </Box>

        {/* Cierre */}
        <Stack spacing={2} alignItems="center" textAlign="center" sx={{ pt: 2 }}>
          <Typography
            sx={{
              fontFamily: DISPLAY_FONT,
              fontStyle: 'italic',
              fontSize: '1rem',
              color: CAMPAIGN.muted,
            }}
          >
            más que una manilla,
          </Typography>
          <Typography
            sx={{
              fontFamily: DISPLAY_FONT,
              fontWeight: 700,
              fontSize: '1.6rem',
              lineHeight: 1.2,
            }}
          >
            un símbolo de Paz,
            <br />
            esperanza, fé y hermandad
          </Typography>
          <Box
            component="img"
            src="/logo-symbol-white.png"
            alt=""
            sx={{ width: 44, height: 'auto', opacity: 0.8, mt: 2 }}
          />
        </Stack>
      </Stack>
    </Box>
  );
}
