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

/**
 * La etiqueta del botón del beneficiario en `/renacer`.
 *
 * Vive en su propia constante porque se dice en DOS lugares: el botón mismo y el mensaje
 * que la raíz le pasa a la persona («tocá «…»»). El 2026-09-01 las dos copias se
 * desincronizaron —el botón cambió a «Me dieron un código» y el mensaje seguía diciendo
 * «Tengo un código de invitación»— y una invitación que manda a tocar un botón que no
 * existe es una persona parada en la puerta sin saber qué hacer. Una sola fuente.
 */
export const BOTON_CODIGO = 'Me dieron un código';

export const copy = {
  puerta: {
    titulo: 'El terremoto se llevó casas enteras. Lo que sigue lo hacemos entre todos.',
    lead: 'El terremoto se llevó casas enteras. Lo que sigue no lo levanta nadie solo.',
    pregunta: '¿Cómo vamos a renacer?',
    bajada:
      'Cada compra en Tierra Mädre aporta a una bolsa común para las familias que perdieron su casa. Y cada familia llega por alguien de su comunidad que la invita: con ese código nos cuenta qué necesita.',
    botonAyudar: 'Quiero ayudar',
    botonCodigo: BOTON_CODIGO,
    botonMiCarnet: 'Ver mi carnet',
    instruccionCodigo:
      'Escribí el código que te dio quien te invitó. Es un número de tres o cuatro cifras.',
    codigoIncompleto: 'El código tiene tres o cuatro cifras y no empieza por cero.',
    ariaCodigo: 'Código de invitación',
  },
  beneficiario: {
    bienvenidaTitulo: 'Qué bueno que llegaste.',
    bienvenidaBajada:
      'Si estás acá es porque alguien de tu comunidad te invitó. Lo que sigue es contarnos qué necesitás. Con eso sabemos qué comprar y a dónde llevarlo.',
    bienvenidaBoton: 'Contar qué necesito',
    etiquetaCodigo: 'Tu código de invitación',
    teInvito: (nombre: string, comunidad: string) => `Te invitó ${nombre} · ${comunidad}`,
    /**
     * El código de la raíz misma (2026-09-01). El backend siempre lo distinguió
     * (`motivo: 'es_raiz'`) y la pantalla lo trataba como un número mal escrito: le decía
     * «puede que falte un número o sobre alguno» a la persona con MÁS probabilidad de
     * teclear ese código — la raíz, probando su propio bloque. Decirle que se equivocó
     * cuando escribió exactamente lo que le dimos es la peor manera de recibirla.
     */
    envioFalloTransitorio:
      'No pudimos guardar el registro. Nada se perdió: lo que escribiste sigue acá.',
    /** Se muestra cuando reintentar NO va a servir. */
    envioFalloTerminalSalida: 'Volver al inicio',
    borradorRestaurado:
      'Retomamos donde ibas. Lo que ya habías escrito quedó guardado en este teléfono.',
    codigoEsDeRaiz: 'Ese es tu código de raíz',
    codigoEsDeRaizBajada:
      'Con ese número te identificamos a vos, así que no se reparte. Los que entregás son los que siguen — el 101, el 102, y así. Están todos en tu panel, en el enlace que te enviamos.',
    codigoNoReconocido: 'No reconocemos ese código',
    codigoNoReconocidoBajada:
      'Puede que le falte o le sobre un número. Es el que te dio quien te invitó.',
    sinConexion: 'No pudimos verificar el código',
    sinConexionBajada: 'Puede ser la conexión. Intentá de nuevo en un momento.',
    codigoUsado: 'Ese código ya fue usado',
    codigoUsadoBajada:
      'Cada código es de una sola persona. Pedile uno nuevo a quien te invitó.',
    codigoInactivo: 'Esa invitación ya no está activa',
    codigoInactivoBajada: 'Puede que la comunidad ya haya usado todos sus cupos. Hablá con quien te invitó para que te dé otro.',
    consentimientoVisibilidad: 'Quiero que quien aporta pueda saber mi nombre de pila',
    consentimientoVisibilidadDetalle:
      'Lo que pediste se ve igual, pero sin tu nombre: aparece como “Una familia de la comunidad”.',
  },
  carnet: {
    codigo: (codigo: number) => `Código ${codigo}`,
    raiz: (nombre: string, comunidad: string) => `Invitó ${nombre} · ${comunidad}`,
    queSigue: 'La ayuda se organiza con quien te invitó. Guardá este carnet: es lo que te van a pedir cuando llegue.',
    noSeMuestra: 'Este carnet se abre solo desde el enlace que te quedó al terminar el registro. Si lo perdiste, pedile ayuda a quien te invitó.',
  },
  tribu: {
    sinCarnet:
      'Para decir “a mí también” hace falta tu carnet. Se genera cuando terminás tu registro con el código que te dieron.',
    boton: 'A mí también me hace falta',
    yaEstabas: 'Ya te habías sumado.',
    sumaron: (n: number) => (n === 1 ? '1 familia más lo necesita' : `${n} familias más lo necesitan`),
  },
  /** Los dos muros comparten el aviso de fallo: el mismo hecho, dicho igual. */
  muro: {
    noSePudo:
      'No pudimos publicar tu mensaje. Sigue escrito acá abajo — probá de nuevo en un momento.',
  },
  /** El panel de quien invita (2026-09-01). Término de trabajo "raíz" — D-0831-9. */
  raiz: {
    titulo: (nombre: string) => `Hola, ${nombre}.`,
    bajada: (comunidad: string, desde: number, hasta: number) =>
      `Estos son los códigos de ${comunidad}: del ${desde} al ${hasta}. Cada uno es para una sola persona, y vos decidís a quién se lo das.`,
    /**
     * El mensaje que la raíz pasa por WhatsApp. Va en el copy y no armado en la pantalla
     * porque es texto de campaña: lo va a revisar kira, y se cambia acá en una línea.
     */
    invitacion: (codigo: number, origen: string) =>
      `Te quiero invitar a Renacer, de Tierra Mädre.

Entrá a ${origen}/renacer, tocá «${BOTON_CODIGO}» y escribí el código ${codigo}.

Ese código es solo tuyo. Ahí nos contás qué necesitás.`,
    agotado:
      'Ya entregaste todos los códigos de tu bloque. Escribinos y te habilitamos más.',
    pausada:
      'Tu bloque está pausado: los códigos que entregues ahora no van a funcionar. Escribinos antes de seguir repartiendo.',
    sinAccesoBajada:
      'Este panel se abre con el enlace que te enviamos cuando te habilitamos tus códigos. Buscalo en tu chat, o escribinos y te lo mandamos de nuevo.',
    sinAcceso: 'Este panel no se puede mostrar',
  },
  /** El muro de gratitud (reunión 31-08: «esa gratitud la deja en la web»). */
  gracias: {
    titulo: 'Dar las gracias',
    bajada:
      'Lo que escribas acá lo lee quien aportó. Es lo único que les vuelve — y es lo que hace que sigan.',
    etiqueta: 'Tu mensaje',
    razon: 'Se publica con tu nombre de pila, nunca con el completo.',
    enviar: 'Publicar mi agradecimiento',
    enviado: 'Gracias. Tu mensaje ya está en el muro.',
    vacio: 'Todavía no hay mensajes. El primero puede ser el tuyo.',
    sinCarnet:
      'Para escribir en el muro necesitás tu carnet. Se genera al completar el registro con tu código de invitación.',
    tituloPublico: 'Lo que dicen las familias',
    /**
     * Sin consentimiento de visibilidad, el mensaje se firma así — la MISMA fórmula que
     * usa la tribu (D-0831-5). Un mensaje sin ninguna firma se lee como un mensaje sin
     * autor; este dice que hay una persona detrás, sin decir cuál.
     */
    anonimo: 'Una familia de la comunidad',
  },
} as const;
