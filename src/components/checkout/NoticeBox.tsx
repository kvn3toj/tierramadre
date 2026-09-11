/**
 * NoticeBox — el aviso en línea del checkout (DS3 §6.2 «error»).
 *
 * Reemplaza al `Alert` de MUI, que trae su propia paleta (azules, ámbares y
 * rojos de Material) y por lo tanto sus propios literales de color: dentro de
 * una hoja DS3 era la única cosa que no hablaba en `--tm-*`.
 *
 * Es una caja con borde, no un relleno saturado: en la vitrina la ÚNICA cosa
 * saturada debe ser la esmeralda (§8, «vitrine test»). El tono vive en el
 * borde y en el ícono; el texto se queda en `--tm-text` para no perder
 * contraste AA.
 *
 * `role` no es decorativo. `warn`/`danger` son resultados de una acción que la
 * persona acaba de hacer y necesitan interrumpir al lector de pantalla
 * (`alert`); `info` es contexto que ya estaba ahí y solo se anuncia cuando
 * haya un hueco (`status`). Poner `alert` en todo entrena a ignorarlo.
 *
 * API deliberadamente mínima: la usan `CheckoutSheet` y `CartPage`. El `icon`
 * es OPCIONAL y cae al del tono: el ícono suele ser parte del mensaje (por eso
 * se puede pasar), pero una caja sin ícono queda distinguiéndose sólo por el
 * color del borde, y el color nunca es la única señal (WCAG 1.4.1). Así que el
 * default no es cosmético — es el cumplimiento del criterio cuando el
 * consumidor no dice nada.
 */
import React from 'react';
import { Box } from '@mui/material';
import { AlertTriangle, Info } from 'lucide-react';

export type NoticeTone = 'warn' | 'danger' | 'info';

export interface NoticeBoxProps {
  tone: NoticeTone;
  /** Ícono ya dimensionado por el consumidor (16–20px). Omitirlo usa el del tono. */
  icon?: React.ReactNode;
  children: React.ReactNode;
}

const bordePorTono: Record<NoticeTone, string> = {
  warn: 'var(--tm-warning)',
  danger: 'var(--tm-danger)',
  info: 'var(--tm-border)',
};

const iconoPorTono: Record<NoticeTone, React.ReactNode> = {
  warn: <AlertTriangle size={18} color="var(--tm-warning)" />,
  danger: <AlertTriangle size={18} color="var(--tm-danger)" />,
  info: <Info size={18} color="var(--tm-muted)" />,
};

export const NoticeBox: React.FC<NoticeBoxProps> = ({
  tone,
  icon,
  children,
}) => (
  <Box
    role={tone === 'info' ? 'status' : 'alert'}
    sx={{
      display: 'flex',
      alignItems: 'flex-start',
      gap: '10px',
      padding: '12px 14px',
      border: `1px solid ${bordePorTono[tone]}`,
      borderRadius: 'var(--tm-radius-card)',
      backgroundColor: 'var(--tm-surface)',
      color: 'var(--tm-text)',
      fontFamily: 'var(--tm-font-ui)',
      fontSize: '0.875rem',
      lineHeight: 1.5,
    }}
  >
    <Box aria-hidden sx={{ display: 'flex', flexShrink: 0, marginTop: '2px' }}>
      {icon ?? iconoPorTono[tone]}
    </Box>
    <Box>{children}</Box>
  </Box>
);

export default NoticeBox;
