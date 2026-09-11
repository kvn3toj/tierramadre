/**
 * Elección de montura, y el enganche con la URL.
 *
 * La montura vive en el query string (`?metal=oro-blanco`) y no en la ruta:
 * modifica un recurso, tiene que sobrevivir al salto rejilla → ficha y a un
 * refresco, y es opcional. Como segmento de ruta obligaría a una forma
 * `/:producto/:metal?` con redirección para el caso ausente.
 *
 * `replace: true` a propósito: pasar por las cuatro monturas no debe dejar
 * cuatro entradas de historial entre el cliente y el botón Atrás.
 */
import { useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useLanguage } from '../../../contexts/LanguageContext';
import { SegmentedControl } from '../../../design-system';
import { METAL_KEYS } from '../../../data/tienda';
import { parseMetalParam } from '../../../utils/tienda';
import type { MetalKey } from '../../../types/tienda';

/** Lee y escribe `?metal=`. Un valor desconocido cae en Plata, nunca rompe. */
export function useMetalParam(): [MetalKey, (next: MetalKey) => void] {
  const [searchParams, setSearchParams] = useSearchParams();
  const metal = parseMetalParam(searchParams.get('metal'));

  const setMetal = useCallback(
    (next: MetalKey) => {
      const params = new URLSearchParams(searchParams);
      params.set('metal', next);
      setSearchParams(params, { replace: true });
    },
    [searchParams, setSearchParams],
  );

  return [metal, setMetal];
}

export interface MetalSelectorProps {
  value: MetalKey;
  onChange: (next: MetalKey) => void;
  block?: boolean;
}

export default function MetalSelector({
  value,
  onChange,
  block = false,
}: MetalSelectorProps) {
  const { t } = useLanguage();

  return (
    <SegmentedControl<MetalKey>
      options={METAL_KEYS.map((k) => ({
        value: k,
        label: t.tienda.metalesCorto[k],
      }))}
      value={value}
      onChange={onChange}
      ariaLabel={t.tienda.montura}
      block={block}
    />
  );
}
