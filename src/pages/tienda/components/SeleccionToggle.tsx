/**
 * Agregar o quitar una pieza de la selección, desde la ficha.
 *
 * Anuncia el cambio por región viva: sin eso, quien navega con lector de
 * pantalla pulsa el botón y no se entera de que la cuenta subió. El estado
 * viaja además en `aria-pressed`, así que el control se lee correctamente aun
 * sin el anuncio.
 */
import { useCallback } from 'react';
import { Bookmark, BookmarkCheck } from 'lucide-react';
import { useLanguage } from '../../../contexts/LanguageContext';
import { Button } from '../../../design-system';
import { useLiveRegion } from '../../../components/shared/LiveRegion';
import type { MetalKey, StoreProductSlug } from '../../../types/tienda';
import { useSeleccion } from '../useTienda';

export interface SeleccionToggleProps {
  slug: StoreProductSlug;
  metal: MetalKey | null;
  nombre: string;
  block?: boolean;
}

export default function SeleccionToggle({
  slug,
  metal,
  nombre,
  block = false,
}: SeleccionToggleProps) {
  const { t } = useLanguage();
  const { isSelected, toggle, count } = useSeleccion();
  const { announce } = useLiveRegion();

  const item = { slug, metal };
  const elegida = isSelected(item);

  const onClick = useCallback(() => {
    const antes = elegida;
    const cambio = toggle(item);
    if (!cambio) {
      announce(t.tienda.seleccion.full.replace('{n}', String(count)));
      return;
    }
    const siguiente = antes ? count - 1 : count + 1;
    const plantilla = antes
      ? t.tienda.seleccion.announceRemoved
      : t.tienda.seleccion.announceAdded;
    announce(
      plantilla.replace('{nombre}', nombre).replace('{n}', String(siguiente)),
    );
    // `item` se reconstruye cada render pero es un par de primitivos; la
    // dependencia real es (slug, metal).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [elegida, toggle, announce, count, nombre, t, slug, metal]);

  return (
    <Button
      variant={elegida ? 'tinted' : 'outlined'}
      // `lg` (48px) y no el `md` por defecto, que mide 40 y se queda corto
      // frente a los 44 del contrato. Es el control principal de la ficha:
      // se arregla aquí, en la tienda, y no en el token compartido — ése lo
      // usa la app entera.
      size="lg"
      fullWidth={block}
      onClick={onClick}
      aria-pressed={elegida}
      startIcon={
        elegida ? (
          <BookmarkCheck size={17} strokeWidth={1.75} />
        ) : (
          <Bookmark size={17} strokeWidth={1.75} />
        )
      }
    >
      {elegida ? t.tienda.seleccion.added : t.tienda.seleccion.add}
    </Button>
  );
}
