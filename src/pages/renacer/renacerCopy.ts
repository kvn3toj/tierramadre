/**
 * Los textos de Renacer que cambian de una reunión a otra, en un solo lugar.
 *
 * D-0831-9: la sala rechazó "líder" y no cerró el término (raíz / tejedor / árbol). Se
 * trabaja con **"raíz"** — coincide con la pieza `renacer-02` («raíz a raíz, juntas») —
 * y se cambia acá, en una línea, cuando se ratifique.
 *
 * Regla de copy que atraviesa todo el directorio: lenguaje de compra, jamás "donación";
 * el relato abre por el terremoto, nunca por CoomÜnity; y desde el 31-08 **no hay
 * manilla ni estuche** en el camino del beneficiario — hay una invitación y un código.
 */

export const TERMINO_RAIZ = 'raíz';

export const copy = {
  puerta: {
    titulo: 'El terremoto se llevó casas enteras. Lo que sigue lo hacemos entre todos.',
    bajada:
      'Cada compra en Tierra Mädre aporta a una bolsa común para las familias damnificadas. Y cada familia llega por alguien de su comunidad que la invita: con ese código nos cuenta qué necesita.',
    botonAyudar: 'Quiero ayudar',
    botonCodigo: 'Tengo un código de invitación',
    instruccionCodigo:
      'Escribe el código que te dio quien te invitó. Son tres o cuatro números.',
    ariaCodigo: 'Código de invitación',
  },
  beneficiario: {
    bienvenidaTitulo: 'Bienvenida. Bienvenido.',
    bienvenidaBajada:
      'Si estás acá es porque alguien de tu comunidad te invitó. Lo que sigue es contarnos qué necesitás — eso es lo que hace que la ayuda llegue a donde tiene que llegar.',
    etiquetaCodigo: 'Tu código de invitación',
    teInvito: (nombre: string, comunidad: string) => `Te invitó ${nombre} · ${comunidad}`,
    codigoNoReconocido: 'No reconocemos ese código',
    codigoNoReconocidoBajada:
      'Puede que falte un número o sobre alguno. Es el que te dio quien te invitó.',
    codigoUsado: 'Ese código ya fue usado',
    codigoUsadoBajada:
      'Cada código es de una sola persona. Pedile uno nuevo a quien te invitó.',
    codigoInactivo: 'Esa invitación ya no está activa',
    codigoInactivoBajada: 'Hablá con quien te invitó para que te dé un código vigente.',
    consentimientoVisibilidad: 'Quiero que quien aporta pueda saber mi nombre de pila',
    consentimientoVisibilidadDetalle:
      'Si no marcás esto, quien aporta solo ve cuántas familias se registraron — nunca quién.',
  },
  carnet: {
    codigo: (codigo: number) => `Código ${codigo}`,
    raiz: (nombre: string, comunidad: string) => `Invitó ${nombre} · ${comunidad}`,
  },
  tribu: {
    sinCarnet:
      'Para sumarte a una necesidad necesitás tu carnet. Se genera al completar el registro con tu código de invitación.',
  },
} as const;
