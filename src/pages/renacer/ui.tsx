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
import { qeFont } from '../../design-system';

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
        fontFamily: qeFont.ui,
        fontSize: 16,
        py: 1.75,
        minHeight: 48,
        '&:hover': { bgcolor: t.accentStrong },
        '&.Mui-disabled': { bgcolor: t.surface2, color: t.subtle },
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
        fontFamily: qeFont.ui,
        fontSize: 16,
        py: 1.5,
        minHeight: 48,
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
          '& .MuiOutlinedInput-root': { bgcolor: t.surface },
          '& input, & textarea': { fontFamily: qeFont.ui, fontSize: 16, color: t.text },
          '& fieldset': { borderColor: t.border },
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
        sx={{ color: t.border, p: 1, '&.Mui-checked': { color: t.accent } }}
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
            height: 3,
            flex: 1,
            borderRadius: 2,
            bgcolor: i < actual ? t.accent : t.surface2,
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
        borderRadius: 2,
        border: `1px dashed ${t.border}`,
        bgcolor: t.surface,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        px: 3,
        py: 3,
        mb: 3,
      }}
    >
      <Typography
        sx={{ fontFamily: qeFont.ui, fontSize: 14, color: t.subtle, textAlign: 'center' }}
      >
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
                px: 1.5,
                borderRadius: 999,
                cursor: 'pointer',
                border: `1px solid ${activa ? t.accent : t.border}`,
                bgcolor: activa ? t.accent : t.surface,
                color: activa ? t.onAccent : t.text,
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
            '& .MuiOutlinedInput-root': { bgcolor: t.surface },
            '& input': { fontFamily: qeFont.ui, fontSize: 15, color: t.text },
            '& fieldset': { borderColor: t.border },
          }}
        />
        <Button
          type="button"
          onClick={agregarLibre}
          disabled={!libre.trim()}
          sx={{ fontFamily: qeFont.ui, color: t.accent, minHeight: 40, whiteSpace: 'nowrap' }}
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
        border: `1px solid ${t.border}`,
        bgcolor: t.surface,
        borderRadius: 3,
        p: 2.5,
        mb: 1.5,
        cursor: deshabilitada ? 'default' : 'pointer',
        opacity: deshabilitada ? 0.7 : 1,
        '&:hover': deshabilitada ? undefined : { borderColor: t.accent },
      }}
    >
      <Typography sx={{ fontFamily: qeFont.serif, fontSize: 22, color: t.text, mb: 0.5 }}>
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
