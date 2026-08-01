/**
 * El plan de un empuje masivo al espejo, espaciado en el tiempo.
 *
 * El caso que existe para resolver: 375 casillas migradas que nunca se
 * encolaron (`migracionV4` no encola — ver `cierre-fase1.md`). `drenar` lee
 * la pestaña ENTERA por cada fila que procesa (`leerRango` en
 * `_lib/espejoSheets.ts`), así que un solo `drenar({ limite: 375 })` haría
 * ~3 llamadas a la Sheets API POR FILA sin pausa entre ninguna — exactamente
 * cómo se agota la cuota por minuto de una cuenta personal (60 req/min).
 *
 * La cura no es lógica de drenaje nueva: es espaciar en el tiempo las
 * invocaciones que ya existen. Convex ya soporta esto con
 * `ctx.scheduler.runAfter(retrasoMs, ...)` — lo único que faltaba era el
 * PLAN de cuántos pasos, con qué límite cada uno, y cuánto retraso entre
 * ellos. Eso es lo que calcula esta función.
 *
 * Puro: solo aritmética, sin IO ni reloj. El caller (una action de Convex)
 * agenda cada paso.
 */

export interface PasoDrenajeEscalonado {
  /** Milisegundos desde AHORA en que se agenda este paso. */
  retrasoMs: number;
  /** Cuántas filas drena como máximo este paso. */
  limite: number;
}

export interface PlanificarDrenajeEscalonadoInput {
  /** Filas pendientes a empujar. */
  totalFilas: number;
  /** Filas por paso — el `limite` que recibe cada `drenar`. */
  tamanoLote: number;
  /** Separación entre un paso y el siguiente. */
  intervaloMs: number;
}

export function planificarDrenajeEscalonado(
  input: PlanificarDrenajeEscalonadoInput,
): PasoDrenajeEscalonado[] {
  const { totalFilas, tamanoLote, intervaloMs } = input;

  if (tamanoLote <= 0) {
    throw new Error(
      `tamanoLote debe ser > 0 (recibí ${tamanoLote}): un paso que no drena ` +
        `nada deja el plan vivo para siempre.`,
    );
  }
  if (intervaloMs < 0) {
    throw new Error(
      `intervaloMs no puede ser negativo (recibí ${intervaloMs}): un retraso ` +
        `negativo dispararía todos los pasos de una sola vez, que es ` +
        `exactamente lo que este plan existe para evitar.`,
    );
  }
  if (totalFilas <= 0) return [];

  const pasos = Math.ceil(totalFilas / tamanoLote);
  return Array.from({ length: pasos }, (_, i) => ({
    retrasoMs: i * intervaloMs,
    limite: tamanoLote,
  }));
}
