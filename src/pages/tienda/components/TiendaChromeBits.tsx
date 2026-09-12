/**
 * Piezas pequeñas de la cabecera: el interruptor de tema, el de idioma y el
 * de colocación del menú.
 *
 * Todas viven aquí y no en `src/design-system/` porque son específicas de una
 * cabecera pública sin shell — el resto de la app ya resuelve tema e idioma
 * dentro de `IOSSettingsSheet`, que sólo monta `IOSLayout`. La tienda no lo
 * monta, así que un visitante que llega en modo oscuro del sistema, o con un
 * 'dark' viejo en localStorage, no tendría salida en la única ruta a la que
 * llega un desconocido.
 */
import { Box, Typography } from '@mui/material';
import { Moon, Sun } from 'lucide-react';
import { useLanguage } from '../../../contexts/LanguageContext';
import { useThemeMode } from '../../../contexts/ThemeContext';
import { LANGUAGE_OPTIONS } from '../../../locales';
import { qeType, hitSlop } from '../../../design-system';
import { useMenuPlacement, type MenuPlacement } from '../useTienda';

/** Alto/ancho mínimo de toque. 44px es el piso del contrato de accesibilidad
 *  del proyecto, con 8px de separación entre objetivos vecinos. */
const TOUCH = 44;

const iconButtonSx = {
  width: TOUCH,
  height: TOUCH,
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  flexShrink: 0,
  border: 'none',
  background: 'transparent',
  cursor: 'pointer',
  borderRadius: 'var(--tm-radius-control)',
  color: 'var(--tm-muted)',
  padding: 0,
  transition: 'color var(--tm-fast) var(--tm-ease)',
  '&:hover': { color: 'var(--tm-accent)' },
  '&:focus-visible': { outline: 'none', boxShadow: 'var(--tm-focus-ring)' },
  '&:active': { opacity: 0.85 },
} as const;

export function ThemeToggle() {
  const { mode, toggleTheme } = useThemeMode();
  const { t } = useLanguage();
  const goingDark = mode === 'light';

  return (
    <Box
      component="button"
      type="button"
      onClick={toggleTheme}
      aria-label={goingDark ? t.tienda.shell.toDark : t.tienda.shell.toLight}
      sx={iconButtonSx}
    >
      {goingDark ? (
        <Moon size={18} strokeWidth={1.75} aria-hidden="true" />
      ) : (
        <Sun size={18} strokeWidth={1.75} aria-hidden="true" />
      )}
    </Box>
  );
}

/**
 * Selector de idioma. Un `<select>` nativo a propósito: en un teléfono abre la
 * rueda del sistema, ya sabe teclado y lector de pantalla, y no arrastra un
 * portal ni una capa más a una cabecera pública.
 */
export function LanguagePicker() {
  const { language, setLanguage, t } = useLanguage();

  return (
    <Box
      component="select"
      value={language}
      onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
        setLanguage(e.target.value as typeof language)
      }
      aria-label={t.tienda.shell.language}
      sx={{
        height: TOUCH,
        minWidth: 64,
        border: 'none',
        background: 'transparent',
        color: 'var(--tm-muted)',
        cursor: 'pointer',
        borderRadius: 'var(--tm-radius-control)',
        paddingInline: '6px',
        ...qeType.overline,
        transition: 'color var(--tm-fast) var(--tm-ease)',
        '&:hover': { color: 'var(--tm-accent)' },
        '&:focus-visible': {
          outline: 'none',
          boxShadow: 'var(--tm-focus-ring)',
        },
      }}
    >
      {LANGUAGE_OPTIONS.map((o) => (
        <option key={o.code} value={o.code}>
          {o.code.toUpperCase()}
        </option>
      ))}
    </Box>
  );
}

/**
 * El interruptor que enseña las dos opciones de menú.
 *
 * No es una preferencia de producto: es el instrumento para elegir entre la
 * navegación en cabecera y la barra inferior mirándolas en vivo. Vive en el
 * pie, en voz baja, y desaparece en cuanto la decisión esté tomada.
 */
export function MenuPlacementSwitch() {
  const [placement, setPlacement] = useMenuPlacement();

  const opciones: { value: MenuPlacement; label: string }[] = [
    { value: 'header', label: 'Cabecera' },
    { value: 'bottom', label: 'Barra inferior' },
  ];

  return (
    <Box
      role="group"
      aria-label="Vista previa: colocación del menú"
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        flexWrap: 'wrap',
      }}
    >
      <Typography sx={{ ...qeType.spec, color: 'var(--tm-muted)' }}>
        Vista previa · menú
      </Typography>
      <Box sx={{ display: 'inline-flex', gap: '8px' }}>
        {opciones.map((o) => {
          const activa = placement === o.value;
          return (
            <Box
              key={o.value}
              component="button"
              type="button"
              aria-pressed={activa}
              onClick={() => setPlacement(o.value)}
              sx={{
                // Medidos 32px de alto y 4px de separación. Es un instrumento
                // de vista previa, no contenido: pintarlo a 44px lo pondría a
                // competir con los enlaces del pie. `hitSlop` sube el alcance
                // a 44 sin subir la tinta —la cápsula sólo se desborda arriba
                // y abajo, 6px, donde no hay ningún otro objetivo— y el hueco
                // pasa a 8px, que aquí sí es hueco táctil real porque los dos
                // botones son más anchos que 44 y la cápsula no los ensancha.
                ...hitSlop(TOUCH),
                ...qeType.spec,
                minHeight: 32,
                paddingInline: '10px',
                cursor: 'pointer',
                borderRadius: 'var(--tm-radius-pill)',
                border: '1px solid',
                borderColor: activa ? 'var(--tm-accent)' : 'var(--tm-border)',
                backgroundColor: activa
                  ? 'var(--tm-accent-wash)'
                  : 'transparent',
                color: activa ? 'var(--tm-accent)' : 'var(--tm-muted)',
                transition:
                  'color var(--tm-fast) var(--tm-ease), border-color var(--tm-fast) var(--tm-ease), background-color var(--tm-fast) var(--tm-ease)',
                '&:focus-visible': {
                  outline: 'none',
                  boxShadow: 'var(--tm-focus-ring)',
                },
                '&:active': { opacity: 0.85 },
              }}
            >
              {o.label}
            </Box>
          );
        })}
      </Box>
    </Box>
  );
}

export { TOUCH, iconButtonSx };
