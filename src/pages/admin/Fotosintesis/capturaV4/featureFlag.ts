/**
 * Captura de lote v4 (W1 «Cerebro Racional») — feature flag.
 *
 * El wizard v4 vive en su propia ruta (`/admin/fotosintesis/lots/new-v4`) en vez
 * de evolucionar `CapturaLotePage` in-place, porque esa página tiene 3315 líneas
 * y la operación la usa a diario: mezclar los dos modelos en un mismo componente
 * arriesga el riel que hoy da de comer, y los modelos se contradicen (v4 captura
 * el costo por pieza; el viejo lo prorratea por preponderancia).
 *
 * - Producción: opt-in con `VITE_CAPTURA_V4=1`.
 * - Dev: encendido por defecto, salvo `VITE_CAPTURA_V4=0`.
 *
 * Mismo patrón que `workbench/featureFlag.ts`.
 */
const raw = import.meta.env?.VITE_CAPTURA_V4 as string | undefined;

export const CAPTURA_V4_ENABLED: boolean =
  raw === '1' || raw === 'true'
    ? true
    : raw === '0' || raw === 'false'
      ? false
      : !!import.meta.env?.DEV;
