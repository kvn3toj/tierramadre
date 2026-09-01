/**
 * Piezas compartidas del flujo de Renacer.
 *
 * Existen para que cada pantalla se lea como lo que hace y no como una pila de `sx`.
 * Todo el color sale de los tokens (`qeTokens`) — ni un literal hexadecimal acá.
 *
 * Nota de accesibilidad, que en este flujo no es un lujo: la audiencia se registra en
 * campo, en teléfonos de gama baja, muchas veces con un facilitador leyendo en voz alta.
 * Los objetivos táctiles no bajan de 48px, las etiquetas están asociadas a sus campos, y
 * nada depende solo del color.
 */

import { useState, type ReactNode } from 'react';
import { Box, Button, Checkbox, TextField, Typography } from '@mui/material';
import { useRenacerTokens } from './RenacerLayout';
import { renacerFont, renacerRadius } from '../../design-system';
const qeFont = { ui: renacerFont.ui, serif: renacerFont.display };

export function BotonPrincipal({
  children,
  onClick,
  disabled,
  type,
}: {
  children: ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  type?: 'button' | 'submit';
}) {
  const t = useRenacerTokens();
  return (
    <Button
      fullWidth
      size="large"
      type={type ?? 'button'}
      onClick={onClick}
      disabled={disabled}
      sx={{
        bgcolor: t.accent,
        color: t.onAccent,
        fontFamily: renacerFont.display,
        fontWeight: 700,
        fontSize: 15.5,
        letterSpacing: '0.01em',
        textTransform: 'none',
        py: 1.6,
        minHeight: 52,
        borderRadius: renacerRadius.pill,
        boxShadow: t.glow,
        transition: 'transform 160ms ease, box-shadow 160ms ease, background-color 160ms ease',
        '&:hover': { bgcolor: t.accentStrong, transform: 'translateY(-1px)' },
        '&:active': { transform: 'translateY(0)' },
        '&.Mui-disabled': { bgcolor: t.surface2, color: t.subtle, boxShadow: 'none' },
      }}
    >
      {children}
    </Button>
  );
}

export function BotonSecundario({
  children,
  onClick,
}: {
  children: ReactNode;
  onClick?: () => void;
}) {
  const t = useRenacerTokens();
  return (
    <Button
      fullWidth
      size="large"
      onClick={onClick}
      sx={{
        border: `1px solid ${t.border}`,
        color: t.text,
        fontFamily: renacerFont.display,
        fontWeight: 600,
        fontSize: 15,
        textTransform: 'none',
        py: 1.5,
        minHeight: 52,
        borderRadius: renacerRadius.pill,
        bgcolor: 'transparent',
        transition: 'background-color 160ms ease, border-color 160ms ease',
        '&:hover': { bgcolor: t.glass, borderColor: t.muted },
      }}
    >
      {children}
    </Button>
  );
}

/**
 * Un campo con su etiqueta y, cuando corresponde, **la razón por la que lo pedimos**.
 *
 * El §6.6 del spec no pide los datos a secas: los pide "con su razón dicha al usuario".
 * Por eso `razon` es parte del componente y no un comentario en el diseño — a alguien
 * que acaba de perder la casa se le explica para qué se le pregunta la dirección.
 */
export function Campo({
  etiqueta,
  razon,
  valor,
  onChange,
  placeholder,
  multilinea,
  tipo,
  requerido,
}: {
  etiqueta: string;
  razon?: string;
  valor: string;
  onChange: (v: string) => void;
  placeholder?: string;
  multilinea?: boolean;
  tipo?: 'text' | 'number' | 'email';
  requerido?: boolean;
}) {
  const t = useRenacerTokens();
  return (
    <Box sx={{ mb: 2.5 }}>
      <Typography
        component="label"
        sx={{ display: 'block', fontFamily: qeFont.ui, fontSize: 15, color: t.text, mb: 0.5 }}
      >
        {etiqueta}
        {requerido && (
          <Box component="span" sx={{ color: t.accent, ml: 0.5 }} aria-hidden>
            *
          </Box>
        )}
      </Typography>

      {razon && (
        <Typography
          sx={{ fontFamily: qeFont.ui, fontSize: 13.5, color: t.subtle, mb: 1, lineHeight: 1.45 }}
        >
          {razon}
        </Typography>
      )}

      <TextField
        fullWidth
        value={valor}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        multiline={multilinea}
        minRows={multilinea ? 2 : undefined}
        type={tipo ?? 'text'}
        inputProps={{
          'aria-label': etiqueta,
          inputMode: tipo === 'number' ? 'numeric' : undefined,
        }}
        sx={{
          '& .MuiOutlinedInput-root': {
            bgcolor: t.glass,
            borderRadius: `${renacerRadius.field}px`,
            backdropFilter: 'blur(10px)',
            transition: 'box-shadow 160ms ease, background-color 160ms ease',
            '&.Mui-focused': { bgcolor: t.glassStrong, boxShadow: t.focus },
          },
          '& input, & textarea': { fontFamily: qeFont.ui, fontSize: 16, color: t.text },
          '& input::placeholder, & textarea::placeholder': { color: t.subtle, opacity: 1 },
          '& fieldset': { borderColor: t.border },
          '& .MuiOutlinedInput-root:hover fieldset': { borderColor: t.muted },
          '& .MuiOutlinedInput-root.Mui-focused fieldset': { borderColor: t.accent },
        }}
      />
    </Box>
  );
}

/**
 * Casilla de consentimiento. **Siempre arranca desmarcada** — fail-closed no es una
 * propiedad del backend nada más: un default marcado convierte el consentimiento en
 * un descuido.
 */
export function Consentimiento({
  texto,
  detalle,
  marcado,
  onChange,
}: {
  texto: string;
  detalle?: string;
  marcado: boolean;
  onChange: (v: boolean) => void;
}) {
  const t = useRenacerTokens();
  return (
    <Box sx={{ display: 'flex', gap: 1, alignItems: 'flex-start', mb: 2 }}>
      <Checkbox
        checked={marcado}
        onChange={(e) => onChange(e.target.checked)}
        inputProps={{ 'aria-label': texto }}
        sx={{ color: t.muted, p: 1, '&.Mui-checked': { color: t.accent }, '& .MuiSvgIcon-root': { fontSize: 24 } }}
      />
      <Box sx={{ pt: 1 }}>
        <Typography
          component="label"
          onClick={() => onChange(!marcado)}
          sx={{ fontFamily: qeFont.ui, fontSize: 15, color: t.text, cursor: 'pointer', lineHeight: 1.45 }}
        >
          {texto}
        </Typography>
        {detalle && (
          <Typography
            sx={{ fontFamily: qeFont.ui, fontSize: 13, color: t.subtle, mt: 0.5, lineHeight: 1.45 }}
          >
            {detalle}
          </Typography>
        )}
      </Box>
    </Box>
  );
}

/** El indicador de paso. Sin números grandes: no es un trámite, es una conversación. */
export function Pasos({ actual, total }: { actual: number; total: number }) {
  const t = useRenacerTokens();
  return (
    <Box sx={{ display: 'flex', gap: 0.75, mb: 3 }} aria-label={`Paso ${actual} de ${total}`}>
      {Array.from({ length: total }, (_, i) => (
        <Box
          key={i}
          sx={{
            height: 4,
            flex: 1,
            borderRadius: 2,
            bgcolor: i < actual ? t.accent : t.surface2,
            boxShadow: i < actual ? '0 0 12px rgba(127,224,127,0.45)' : 'none',
            transition: 'background-color 300ms ease',
          }}
        />
      ))}
    </Box>
  );
}

/**
 * El hueco del video de contexto.
 *
 * La pieza **no existe** — es el abierto §11.c del spec: "existen como decisión, no como
 * asset". Este componente lo dice en la pantalla en vez de simular un reproductor que no
 * reproduce nada. Cuando el video exista, se reemplaza acá y en ningún otro lado.
 */
export function HuecoDeVideo({ nota }: { nota: string }) {
  const t = useRenacerTokens();
  return (
    <Box
      sx={{
        // **Sin `aspectRatio` mientras no haya video, a propósito.** Un 16:9 vacío son
        // ~200px de nada en un teléfono, y empujaba el botón principal abajo del
        // pliegue: la acción más importante de la pantalla quedaba invisible. Cuando el
        // video exista, este componente vuelve a reservar 16/9 —que ahí sí evita el
        // salto de layout al cargar (regla anti-parpadeo del CLAUDE.md)—.
        width: '100%',
        borderRadius: `${renacerRadius.card}px`,
        border: `1px solid ${t.glassBorder}`,
        bgcolor: t.glass,
        backdropFilter: 'blur(12px)',
        display: 'flex',
        alignItems: 'center',
        gap: 2,
        px: 2.5,
        py: 2.25,
        mb: 3.5,
      }}
    >
      <Box
        aria-hidden
        sx={{
          width: 44,
          height: 44,
          flexShrink: 0,
          borderRadius: '50%',
          border: `1px solid ${t.border}`,
          display: 'grid',
          placeItems: 'center',
          color: t.accent,
          fontSize: 16,
          pl: '3px',
        }}
      >
        ▶
      </Box>
      <Typography sx={{ fontFamily: qeFont.ui, fontSize: 14, color: t.subtle, lineHeight: 1.45 }}>
        {nota}
      </Typography>
    </Box>
  );
}

/**
 * Selector de etiquetas: chips sugeridos + texto libre. Para bolsas (una) y para
 * capacidades (varias). Sin `<datalist>` — roto en iOS Safari, mismo criterio que
 * `SuggestInput` de Fotosíntesis — y con objetivos táctiles de 40px+.
 */
export function SelectorDeEtiquetas({
  etiqueta,
  razon,
  sugeridas,
  elegidas,
  onChange,
  maximo,
  placeholderLibre,
}: {
  etiqueta: string;
  razon?: string;
  sugeridas: readonly string[];
  elegidas: string[];
  onChange: (v: string[]) => void;
  /** 1 = elección única (bolsa); mayor = varias (capacidades). */
  maximo: number;
  placeholderLibre?: string;
}) {
  const t = useRenacerTokens();
  const [libre, setLibre] = useState('');

  function alternar(valor: string) {
    if (elegidas.includes(valor)) {
      onChange(elegidas.filter((e) => e !== valor));
      return;
    }
    if (maximo === 1) {
      onChange([valor]);
      return;
    }
    if (elegidas.length >= maximo) return;
    onChange([...elegidas, valor]);
  }

  function agregarLibre() {
    const v = libre.trim().replace(/\s+/g, ' ');
    if (!v) return;
    setLibre('');
    alternar(v);
  }

  const propias = elegidas.filter((e) => !sugeridas.includes(e));

  return (
    <Box sx={{ mb: 2.5 }}>
      <Typography
        component="p"
        sx={{ fontFamily: qeFont.ui, fontSize: 15, color: t.text, mb: 0.5 }}
      >
        {etiqueta}
      </Typography>
      {razon && (
        <Typography
          sx={{ fontFamily: qeFont.ui, fontSize: 13.5, color: t.subtle, mb: 1, lineHeight: 1.45 }}
        >
          {razon}
        </Typography>
      )}

      <Box role="group" aria-label={etiqueta} sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 1.5 }}>
        {[...sugeridas, ...propias].map((valor) => {
          const activa = elegidas.includes(valor);
          return (
            <Box
              key={valor}
              component="button"
              type="button"
              aria-pressed={activa}
              onClick={() => alternar(valor)}
              sx={{
                fontFamily: qeFont.ui,
                fontSize: 14,
                minHeight: 40,
                px: 1.75,
                borderRadius: renacerRadius.chip,
                cursor: 'pointer',
                border: `1px solid ${activa ? t.accent : t.border}`,
                bgcolor: activa ? t.accent : t.glass,
                color: activa ? t.onAccent : t.text,
                fontWeight: activa ? 600 : 400,
                transition: 'background-color 140ms ease, border-color 140ms ease',
                '&:hover': { borderColor: activa ? t.accent : t.muted },
              }}
            >
              {valor}
            </Box>
          );
        })}
      </Box>

      <Box sx={{ display: 'flex', gap: 1 }}>
        <TextField
          fullWidth
          size="small"
          value={libre}
          onChange={(e) => setLibre(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              agregarLibre();
            }
          }}
          placeholder={placeholderLibre ?? 'Otra…'}
          inputProps={{ 'aria-label': `${etiqueta} — otra` }}
          sx={{
            '& .MuiOutlinedInput-root': { bgcolor: t.glass, borderRadius: renacerRadius.pill },
            '& input': { fontFamily: qeFont.ui, fontSize: 15, color: t.text },
            '& input::placeholder': { color: t.subtle, opacity: 1 },
            '& fieldset': { borderColor: t.border },
            '& .MuiOutlinedInput-root.Mui-focused fieldset': { borderColor: t.accent },
          }}
        />
        <Button
          type="button"
          onClick={agregarLibre}
          disabled={!libre.trim()}
          sx={{ fontFamily: renacerFont.display, fontWeight: 600, textTransform: 'none', color: t.accent, minHeight: 40, whiteSpace: 'nowrap', borderRadius: renacerRadius.pill }}
        >
          Agregar
        </Button>
      </Box>
    </Box>
  );
}

/** Una opción grande del hub del aportador: título, bajada y a dónde lleva. */
export function OpcionCard({
  titulo,
  bajada,
  onClick,
  deshabilitada,
  nota,
}: {
  titulo: string;
  bajada: string;
  onClick?: () => void;
  deshabilitada?: boolean;
  nota?: string;
}) {
  const t = useRenacerTokens();
  return (
    <Box
      component="button"
      type="button"
      onClick={deshabilitada ? undefined : onClick}
      aria-disabled={deshabilitada}
      sx={{
        width: '100%',
        textAlign: 'left',
        border: `1px solid ${t.glassBorder}`,
        bgcolor: t.glass,
        backdropFilter: 'blur(12px)',
        borderRadius: `${renacerRadius.card}px`,
        p: 2.75,
        mb: 1.5,
        color: t.text,
        cursor: deshabilitada ? 'default' : 'pointer',
        opacity: deshabilitada ? 0.62 : 1,
        transition: 'transform 180ms ease, border-color 180ms ease, background-color 180ms ease',
        '&:hover': deshabilitada ? undefined : { borderColor: t.accent, bgcolor: t.glassStrong, transform: 'translateY(-2px)' },
      }}
    >
      <Typography sx={{ fontFamily: renacerFont.display, fontWeight: 700, fontSize: 20, letterSpacing: '-0.01em', color: t.text, mb: 0.75 }}>
        {titulo}
      </Typography>
      <Typography sx={{ fontFamily: qeFont.ui, fontSize: 14.5, color: t.muted, lineHeight: 1.5 }}>
        {bajada}
      </Typography>
      {nota && (
        <Typography sx={{ fontFamily: qeFont.ui, fontSize: 13, color: t.subtle, mt: 1 }}>
          {nota}
        </Typography>
      )}
    </Box>
  );
}
