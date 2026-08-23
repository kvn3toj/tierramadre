/**
 * Cuándo vence una vitrina, y por qué vence.
 *
 * Una vitrina **es una cotización**: lleva un precio que alguien negoció para
 * un cliente concreto. Una cotización que no vence es una promesa sin fecha —
 * y cuando el catálogo pase a publicar precios (ver
 * `docs/superpowers/specs/2026-08-23-marketplace-checkout-design.md`), un link
 * viejo con markup quedaría compitiendo contra el precio de lista, ganando o
 * perdiendo por accidente según qué número quedó más bajo.
 *
 * ## Retroactivo desde `createdAt`, y eso es deliberado
 *
 * El vencimiento se deriva de cuándo se acuñó la vitrina, no de cuándo se
 * desplegó esta regla. Medido el 2026-08-23: las 48 vitrinas vivas tenían
 * entre 2 y 30 días, ocho de ellas de esa misma semana. Arrancar el reloj en
 * el despliegue las habría dejado a todas otro mes en pie; arrancarlo en
 * `createdAt` vacía el parque solo, sin un día de corte donde alguien pierda
 * una negociación en curso.
 *
 * ## Módulo puro
 *
 * Sin imports de Convex ni de React: lo usan la query pública
 * (`vitrinas.getByToken`), el resolvedor de grant del catálogo
 * (`api/_lib/vitrinaLookup.ts`) y la mutation que cobra
 * (`ghl.createOrder`). Las tres tienen que coincidir en la respuesta, y la
 * única forma de garantizarlo es que hagan la misma cuenta.
 */

/**
 * Cuánto vive una vitrina desde que se acuña.
 *
 * 30 días es el número que NO corta ninguna conversación viva: la vitrina más
 * antigua medida el 2026-08-23 tenía exactamente 30 días. Bajarlo es una
 * decisión de negocio —más disciplina comercial, a cambio de apagar links que
 * alguien está usando hoy— y se hace acá, en una línea.
 */
export const VITRINA_TTL_MS = 30 * 24 * 60 * 60 * 1000;

export interface VitrinaFechas {
  /** ISO de cuándo se acuñó. Es el ancla del vencimiento. */
  createdAt?: string | null;
  /**
   * Vencimiento explícito, si algún día se permite elegirlo al compartir.
   * Cuando está, MANDA sobre el TTL — así una vitrina puede durar menos (o
   * más) que el default sin tocar esta constante.
   */
  expiraEn?: string | null;
}

/** Milisegundos de un ISO, o `null` si no se puede leer. */
function ms(iso: string | null | undefined): number | null {
  if (typeof iso !== 'string' || iso.trim() === '') return null;
  const t = Date.parse(iso);
  return Number.isFinite(t) ? t : null;
}

/**
 * El instante en que la vitrina vence, o `null` si no se puede determinar.
 *
 * `null` NO significa «vencida»: significa «no sabemos». Ver `estaVencida`
 * para qué se hace con eso.
 */
export function venceEn(v: VitrinaFechas): number | null {
  const explicito = ms(v.expiraEn);
  if (explicito !== null) return explicito;
  const creada = ms(v.createdAt);
  return creada === null ? null : creada + VITRINA_TTL_MS;
}

/**
 * ¿Está vencida a la hora `ahora`?
 *
 * **Una fecha ilegible cuenta como VIGENTE, no como vencida.** Es la
 * dirección segura: dar por vencida una vitrina que no lo está le rompe la
 * compra a un cliente legítimo y le borra el precio que le prometieron,
 * mientras que dejar viva una que debía vencer sólo posterga un cambio de
 * precio. El error caro es el primero.
 *
 * (Nótese que esto va en sentido contrario a `ORIGEN_INVALIDO`, donde un
 * origen que no resuelve se RECHAZA. No es contradicción: allá el dato es
 * afirmado por el cliente y no se puede probar; acá el dato es nuestro y lo
 * único que falla es su formato.)
 */
export function estaVencida(v: VitrinaFechas, ahora: number): boolean {
  const vence = venceEn(v);
  if (vence === null) return false;
  return ahora >= vence;
}

/** Milisegundos que le quedan; 0 si ya venció, `null` si no se sabe. */
export function tiempoRestanteMs(
  v: VitrinaFechas,
  ahora: number,
): number | null {
  const vence = venceEn(v);
  if (vence === null) return null;
  return Math.max(0, vence - ahora);
}
