/**
 * `/admin/renacer` — la consola de operación de la campaña (01-09).
 *
 * La definición de terminado del hand-off: una persona que no programa corre la campaña
 * sin abrir una terminal. Seis superficies en orden de urgencia — DESPACHO (la cola del
 * §9 con ubicación y teléfono), PERSONAS (rectificación y supresión, habeas data),
 * RAÍCES (emitir, ampliar, pausar, enlace del panel), MUROS (moderar y des-moderar),
 * MANOS (voluntarios contactables), CONEXIONES (propuesta → aceptada → entregada, con
 * una persona decidiendo cada paso) — más la AUDITORÍA de quién hizo qué.
 *
 * Decisión A (01-09): sin bandeja de aprobación — las anomalías se SEÑALAN arriba, no
 * frenan la cola. Decisión B: la consola propone candidatos; comprometer es humano.
 *
 * Identidad: `AdminRoute` corta la ruta en el cliente, pero la llave real está en el
 * servidor — `/api/renacer-admin` exige un correo verificado en `ADMIN_EMAILS` y es el
 * único que conoce `RENACER_OPS_TOKEN`. Cada mutación deja `actorEmail` en `auditoria`.
 */

import { useCallback, useEffect, useState } from 'react';
import { Box, CircularProgress, MenuItem, Typography } from '@mui/material';
import { Inbox } from 'lucide-react';
import { Badge, Button, EmptyState, TextField } from '../../../design-system';
import { llamarConsola, ConsolaError } from '../../../hooks/useRenacerAdmin';

// ── Tipos (espejo de convex-renacer/convex/admin.ts) ─────────────────────────

interface FilaDespacho {
  id: string;
  whatINeed: string;
  whyItMatters: string;
  categoria: string | null;
  createdAt: number;
  supportCount: number;
  estadoEntrega: 'en_camino' | null;
  persona: {
    id: string;
    cardNumber: number;
    nombre: string;
    telefono: string | null;
    ubicacion: string;
    comunidad: string | null;
    asistidoPor: string | null;
  };
}

interface PersonaFila {
  id: string;
  cardNumber: number;
  nombre: string;
  telefono: string | null;
  ubicacion: string;
  edad: number;
  genero: string;
  codigo: number | null;
  comunidad: string | null;
  updatedAt: number | null;
}

interface PersonaDetalle extends PersonaFila {
  email: string | null;
  raizNombre: string | null;
  asistidoPor: string | null;
  necesidades: { id: string; whatINeed: string; status: string; estadoEntrega: string | null }[];
  capacidades: { id: string; title: string; description: string }[];
  avisos: { canal: string; mensaje: string; estado: string; at: number; por: string }[];
}

interface RaizFila {
  codigoBase: number;
  tamano: number;
  nombre?: string;
  comunidad?: string;
  zona?: string | null;
  estado?: string;
  registrados?: number;
}

interface MensajeAdmin {
  id: string;
  authorName: string;
  body: string;
  createdAt: number;
  hiddenAt: number | null;
  hiddenBy: string | null;
  reportedAt: number | null;
  reportCount: number;
}

interface VoluntarioFila {
  id: string;
  nombre: string;
  contacto: string;
  procedencia: string | null;
  motivo: string | null;
  createdAt: number;
  capacidades: { id: string; title: string; description: string }[];
}

interface Candidato {
  capacityId: string;
  title: string;
  description: string;
  origen: string;
  puntos: number;
  quien: string;
  contacto: string | null;
  voluntarioId?: string;
}

interface ConexionFila {
  id: string;
  estado: 'propuesta' | 'aceptada' | 'entregada' | 'cancelada';
  notas: string | null;
  actorEmail: string;
  updatedAt: number;
  necesidad: { id: string; whatINeed: string; categoria: string | null; status: string } | null;
  capacidad: { id: string; title: string } | null;
  aportadorRef: string | null;
}

interface Anomalia { tipo: string; detalle: string; gravedad: 'alta' | 'media' }
interface LineaAuditoria { id: string; actorEmail: string; accion: string; objetivo: string; detalle: string | null; at: number }

const PESTANAS = ['Despacho', 'Personas', 'Raíces', 'Muros', 'Manos', 'Conexiones', 'Auditoría'] as const;
type Pestana = (typeof PESTANAS)[number];

function cuando(ms: number): string {
  const d = new Date(ms);
  return d.toLocaleDateString('es-CO', { day: '2-digit', month: 'short' }) + ' ' + d.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' });
}

function mensajeDe(e: unknown): string {
  return e instanceof ConsolaError || e instanceof Error ? e.message : 'Error inesperado.';
}

/** Carga por pestaña: lista + estado de error + recarga, el mismo esqueleto en las seis. */
function useLista<T>(action: string, payload?: Record<string, unknown>) {
  const [filas, setFilas] = useState<T[] | 'cargando' | 'error'>('cargando');
  const [detalleError, setDetalleError] = useState('');
  const clavePayload = JSON.stringify(payload ?? {});
  const cargar = useCallback(() => {
    setFilas('cargando');
    llamarConsola<{ filas: T[] }>(action, JSON.parse(clavePayload) as Record<string, unknown>)
      .then((r) => setFilas(r.filas))
      .catch((e) => {
        setDetalleError(mensajeDe(e));
        setFilas('error');
      });
  }, [action, clavePayload]);
  useEffect(cargar, [cargar]);
  return { filas, cargar, detalleError };
}

function Cargando() {
  return <Box sx={{ py: 6, textAlign: 'center' }}><CircularProgress size={22} /></Box>;
}

function Fallo({ detalle, onReintentar }: { detalle: string; onReintentar: () => void }) {
  return (
    <Box sx={{ py: 3 }}>
      <Typography sx={{ fontSize: 14, mb: 1.5 }} color="error">{detalle}</Typography>
      <Button variant="outlined" size="sm" onClick={onReintentar}>Reintentar</Button>
    </Box>
  );
}

function Tarjeta({ children }: { children: React.ReactNode }) {
  return (
    <Box sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2.5, p: 2, mb: 1.5, bgcolor: 'background.paper' }}>
      {children}
    </Box>
  );
}

// ── DESPACHO ─────────────────────────────────────────────────────────────────

function TabDespacho() {
  const { filas, cargar, detalleError } = useLista<FilaDespacho>('despacho');
  const [ocupada, setOcupada] = useState<string | null>(null);
  const [aviso, setAviso] = useState('');
  const [candidatosDe, setCandidatosDe] = useState<string | null>(null);
  const [candidatos, setCandidatos] = useState<Candidato[] | 'cargando' | null>(null);

  async function marcar(needId: string, estado: 'en_camino' | 'entregada') {
    setOcupada(needId);
    setAviso('');
    try {
      await llamarConsola('marcarEntrega', { needId, estado });
      cargar();
    } catch (e) {
      setAviso(mensajeDe(e));
    } finally {
      setOcupada(null);
    }
  }

  async function verCandidatos(needId: string) {
    if (candidatosDe === needId) { setCandidatosDe(null); return; }
    setCandidatosDe(needId);
    setCandidatos('cargando');
    try {
      const r = await llamarConsola<{ filas: Candidato[] }>('candidatos', { needId });
      setCandidatos(r.filas);
    } catch (e) {
      setAviso(mensajeDe(e));
      setCandidatos(null);
    }
  }

  async function proponer(needId: string, c: Candidato) {
    setAviso('');
    try {
      await llamarConsola('crearConexion', { needId, capacityId: c.capacityId, voluntarioId: c.voluntarioId, notas: `Candidato: ${c.title}` });
      setAviso(`Propuesta creada con ${c.quien || c.title}. Se sigue en Conexiones.`);
      setCandidatosDe(null);
    } catch (e) {
      setAviso(mensajeDe(e));
    }
  }

  if (filas === 'cargando') return <Cargando />;
  if (filas === 'error') return <Fallo detalle={detalleError} onReintentar={cargar} />;
  if (filas.length === 0) return <EmptyState icon={Inbox} title="La cola está vacía" subtitle="Cuando una familia registre una necesidad, aparece acá en su turno." compact />;

  // Agrupadas por bolsa, y dentro de cada bolsa por turno (el servidor ya viene FIFO).
  const bolsas = new Map<string, FilaDespacho[]>();
  for (const f of filas) {
    const b = f.categoria ?? 'Sin bolsa';
    bolsas.set(b, [...(bolsas.get(b) ?? []), f]);
  }

  return (
    <Box>
      {aviso && <Typography role="status" sx={{ fontSize: 13.5, mb: 1.5 }} color="text.secondary">{aviso}</Typography>}
      {[...bolsas.entries()].map(([bolsa, lista]) => (
        <Box key={bolsa} sx={{ mb: 2.5 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
            <Typography sx={{ fontWeight: 700, fontSize: 15 }}>{bolsa}</Typography>
            <Badge tone="neutral" label={String(lista.length)} dot={false} />
          </Box>
          {lista.map((f, i) => (
            <Tarjeta key={f.id}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 1.5, flexWrap: 'wrap' }}>
                <Box sx={{ minWidth: 0 }}>
                  <Typography sx={{ fontSize: 15, fontWeight: 600 }}>
                    <Box component="span" sx={{ color: 'text.secondary', fontWeight: 400 }}>#{i + 1} · </Box>
                    {f.whatINeed}
                  </Typography>
                  <Typography sx={{ fontSize: 13, color: 'text.secondary', mt: 0.25 }}>{f.whyItMatters}</Typography>
                  <Typography sx={{ fontSize: 13, mt: 0.75 }}>
                    Carnet {f.persona.cardNumber} · {f.persona.nombre} · {f.persona.ubicacion}
                    {f.persona.comunidad ? ` · ${f.persona.comunidad}` : ''}
                    {f.persona.telefono ? ` · ${f.persona.telefono}` : ' · sin teléfono'}
                  </Typography>
                  <Typography sx={{ fontSize: 12, color: 'text.secondary', mt: 0.25 }}>
                    Pedida el {cuando(f.createdAt)}{f.supportCount > 0 ? ` · a ${f.supportCount} más también les hace falta` : ''}
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', gap: 1, alignItems: 'flex-start', flexWrap: 'wrap' }}>
                  {f.estadoEntrega === 'en_camino' && <Badge tone="accent" label="En camino" />}
                  {f.estadoEntrega !== 'en_camino' && (
                    <Button variant="tinted" size="sm" loading={ocupada === f.id} onClick={() => marcar(f.id, 'en_camino')}>En camino</Button>
                  )}
                  <Button variant="primary" size="sm" loading={ocupada === f.id} onClick={() => marcar(f.id, 'entregada')}>Entregada</Button>
                  <Button variant="plain" size="sm" onClick={() => verCandidatos(f.id)}>Candidatos</Button>
                </Box>
              </Box>
              {candidatosDe === f.id && (
                <Box sx={{ mt: 1.5, pt: 1.5, borderTop: '1px solid', borderColor: 'divider' }}>
                  {candidatos === 'cargando' && <CircularProgress size={16} />}
                  {Array.isArray(candidatos) && candidatos.length === 0 && (
                    <Typography sx={{ fontSize: 13, color: 'text.secondary' }}>Ninguna capacidad registrada se parece a este pedido. Se puede proponer desde Manos.</Typography>
                  )}
                  {Array.isArray(candidatos) && candidatos.map((c) => (
                    <Box key={c.capacityId} sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 1, py: 0.5 }}>
                      <Typography sx={{ fontSize: 13.5 }}>
                        {c.title} — {c.quien || c.origen}{c.contacto ? ` (${c.contacto})` : ''}
                      </Typography>
                      <Button variant="outlined" size="sm" onClick={() => proponer(f.id, c)}>Proponer</Button>
                    </Box>
                  ))}
                </Box>
              )}
            </Tarjeta>
          ))}
        </Box>
      ))}
    </Box>
  );
}

// ── PERSONAS ─────────────────────────────────────────────────────────────────

function TabPersonas() {
  const { filas, cargar, detalleError } = useLista<PersonaFila>('personas');
  const [abierta, setAbierta] = useState<string | null>(null);
  const [detalle, setDetalle] = useState<PersonaDetalle | 'cargando' | null>(null);
  const [edicion, setEdicion] = useState<Record<string, string>>({});
  const [motivoBorrado, setMotivoBorrado] = useState('');
  const [borrando, setBorrando] = useState(false);
  const [aviso, setAviso] = useState('');

  async function abrir(id: string) {
    if (abierta === id) { setAbierta(null); return; }
    setAbierta(id);
    setDetalle('cargando');
    setMotivoBorrado('');
    setBorrando(false);
    setAviso('');
    try {
      const r = await llamarConsola<{ persona: PersonaDetalle | null }>('persona', { id });
      setDetalle(r.persona);
      if (r.persona) {
        setEdicion({
          name: r.persona.nombre,
          telefono: r.persona.telefono ?? '',
          email: r.persona.email ?? '',
          ubicacion: r.persona.ubicacion,
          edad: String(r.persona.edad),
          genero: r.persona.genero,
        });
      }
    } catch (e) {
      setAviso(mensajeDe(e));
      setDetalle(null);
    }
  }

  async function guardar(id: string) {
    setAviso('');
    try {
      const r = await llamarConsola<{ cambios: string[] }>('actualizarPersona', {
        id,
        name: edicion.name,
        telefono: edicion.telefono,
        email: edicion.email,
        ubicacion: edicion.ubicacion,
        genero: edicion.genero,
        edad: Number(edicion.edad) || undefined,
      });
      setAviso(r.cambios.length ? `Corregido: ${r.cambios.join(', ')}. Quedó en la auditoría.` : 'No había nada distinto que guardar.');
      cargar();
    } catch (e) {
      setAviso(mensajeDe(e));
    }
  }

  async function borrar(id: string) {
    setAviso('');
    try {
      await llamarConsola('borrarPersona', { id, motivo: motivoBorrado });
      setAbierta(null);
      setAviso('Registro suprimido. En la auditoría queda que se borró y por quién — no qué decía.');
      cargar();
    } catch (e) {
      setAviso(mensajeDe(e));
    }
  }

  if (filas === 'cargando') return <Cargando />;
  if (filas === 'error') return <Fallo detalle={detalleError} onReintentar={cargar} />;
  if (filas.length === 0) return <EmptyState icon={Inbox} title="Nadie registrado todavía" compact />;

  const campos: { clave: string; rotulo: string }[] = [
    { clave: 'name', rotulo: 'Nombre' },
    { clave: 'telefono', rotulo: 'Teléfono' },
    { clave: 'email', rotulo: 'Correo' },
    { clave: 'ubicacion', rotulo: 'Ubicación' },
    { clave: 'edad', rotulo: 'Edad' },
    { clave: 'genero', rotulo: 'Género' },
  ];

  return (
    <Box>
      {aviso && <Typography role="status" sx={{ fontSize: 13.5, mb: 1.5 }} color="text.secondary">{aviso}</Typography>}
      {filas.map((p) => (
        <Tarjeta key={p.id}>
          <Box onClick={() => void abrir(p.id)} sx={{ cursor: 'pointer', display: 'flex', justifyContent: 'space-between', gap: 1, flexWrap: 'wrap' }}>
            <Typography sx={{ fontSize: 14.5, fontWeight: 600 }}>
              {p.cardNumber} · {p.nombre}
              <Box component="span" sx={{ color: 'text.secondary', fontWeight: 400 }}> — {p.ubicacion}{p.comunidad ? ` · ${p.comunidad}` : ''}</Box>
            </Typography>
            <Typography sx={{ fontSize: 12.5, color: 'text.secondary' }}>
              {p.telefono ?? 'sin teléfono'}{p.updatedAt ? ` · corregida ${cuando(p.updatedAt)}` : ''}
            </Typography>
          </Box>
          {abierta === p.id && (
            <Box sx={{ mt: 1.5, pt: 1.5, borderTop: '1px solid', borderColor: 'divider' }}>
              {detalle === 'cargando' && <CircularProgress size={16} />}
              {detalle && detalle !== 'cargando' && (
                <>
                  <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 1.5, mb: 1.5 }}>
                    {campos.map((c) => (
                      <TextField
                        key={c.clave}
                        label={c.rotulo}
                        value={edicion[c.clave] ?? ''}
                        onChange={(e) => setEdicion((prev) => ({ ...prev, [c.clave]: e.target.value }))}
                      />
                    ))}
                  </Box>
                  <Typography sx={{ fontSize: 12.5, color: 'text.secondary', mb: 1 }}>
                    Código {detalle.codigo ?? '—'}{detalle.raizNombre ? ` · raíz ${detalle.raizNombre}` : ''}{detalle.asistidoPor ? ` · asistió ${detalle.asistidoPor}` : ''}
                  </Typography>
                  {detalle.necesidades.length > 0 && (
                    <Typography sx={{ fontSize: 12.5, color: 'text.secondary', mb: 1 }}>
                      Pedidos: {detalle.necesidades.map((n) => `${n.whatINeed} (${n.status === 'resolved' ? 'entregada' : (n.estadoEntrega ?? 'en turno')})`).join(' · ')}
                    </Typography>
                  )}
                  <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', alignItems: 'center' }}>
                    <Button variant="primary" size="sm" onClick={() => void guardar(p.id)}>Guardar corrección</Button>
                    {!borrando && <Button variant="plain" size="sm" onClick={() => setBorrando(true)}>Suprimir registro…</Button>}
                  </Box>
                  {borrando && (
                    <Box sx={{ mt: 1.5, display: 'flex', gap: 1, flexWrap: 'wrap', alignItems: 'center' }}>
                      <TextField
                        label="Motivo de la supresión (queda en la auditoría)"
                        value={motivoBorrado}
                        onChange={(e) => setMotivoBorrado(e.target.value)}
                        sx={{ minWidth: 280 }}
                      />
                      <Button variant="danger" size="sm" disabled={motivoBorrado.trim().length < 5} onClick={() => void borrar(p.id)}>
                        Borrar todo lo de esta persona
                      </Button>
                      <Button variant="plain" size="sm" onClick={() => setBorrando(false)}>Cancelar</Button>
                    </Box>
                  )}
                </>
              )}
            </Box>
          )}
        </Tarjeta>
      ))}
    </Box>
  );
}

// ── RAÍCES ───────────────────────────────────────────────────────────────────

function TabRaices() {
  const { filas, cargar, detalleError } = useLista<RaizFila>('raices');
  const [aviso, setAviso] = useState('');
  const [nueva, setNueva] = useState({ codigoBase: '', tamano: '', nombre: '', comunidad: '', zona: '' });
  const [ampliando, setAmpliando] = useState<number | null>(null);
  const [tamanoNuevo, setTamanoNuevo] = useState('');

  async function emitir() {
    setAviso('');
    try {
      await llamarConsola('emitirRaiz', {
        codigoBase: Number(nueva.codigoBase),
        tamano: Number(nueva.tamano),
        nombre: nueva.nombre.trim(),
        comunidad: nueva.comunidad.trim(),
        zona: nueva.zona.trim() || undefined,
      });
      setNueva({ codigoBase: '', tamano: '', nombre: '', comunidad: '', zona: '' });
      setAviso('Raíz emitida. Copiá el enlace del panel y entregáselo UNA vez.');
      cargar();
    } catch (e) {
      setAviso(mensajeDe(e));
    }
  }

  async function ampliar(codigoBase: number) {
    setAviso('');
    try {
      const r = await llamarConsola<{ desde: number; hasta: number }>('ampliarRaiz', { codigoBase, tamanoNuevo: Number(tamanoNuevo) });
      setAviso(`Bloque ampliado: ahora reparte del ${r.desde} al ${r.hasta}.`);
      setAmpliando(null);
      setTamanoNuevo('');
      cargar();
    } catch (e) {
      setAviso(mensajeDe(e));
    }
  }

  async function cambiarEstado(codigoBase: number, estado: string) {
    setAviso('');
    try {
      await llamarConsola('estadoRaiz', { codigoBase, estado });
      cargar();
    } catch (e) {
      setAviso(mensajeDe(e));
    }
  }

  async function copiarEnlace(codigoBase: number) {
    setAviso('');
    try {
      const r = await llamarConsola<{ enlace: { path: string } }>('enlacePanelRaiz', { codigoBase });
      await navigator.clipboard.writeText(window.location.origin + r.enlace.path);
      setAviso(`Enlace del panel de la raíz ${codigoBase} copiado. Entregalo por un canal privado.`);
    } catch (e) {
      setAviso(mensajeDe(e));
    }
  }

  return (
    <Box>
      {aviso && <Typography role="status" sx={{ fontSize: 13.5, mb: 1.5 }} color="text.secondary">{aviso}</Typography>}
      <Tarjeta>
        <Typography sx={{ fontWeight: 700, fontSize: 14.5, mb: 1.5 }}>Emitir una raíz nueva</Typography>
        <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap', alignItems: 'center' }}>
          <TextField label="Código base (100, 200…)" value={nueva.codigoBase} onChange={(e) => setNueva({ ...nueva, codigoBase: e.target.value.replace(/\D/g, '') })} sx={{ width: 170 }} />
          <TextField label="Tamaño del bloque" value={nueva.tamano} onChange={(e) => setNueva({ ...nueva, tamano: e.target.value.replace(/\D/g, '') })} sx={{ width: 150 }} />
          <TextField label="Quién lidera" value={nueva.nombre} onChange={(e) => setNueva({ ...nueva, nombre: e.target.value })} sx={{ width: 180 }} />
          <TextField label="Comunidad" value={nueva.comunidad} onChange={(e) => setNueva({ ...nueva, comunidad: e.target.value })} sx={{ width: 180 }} />
          <TextField label="Zona (opcional)" value={nueva.zona} onChange={(e) => setNueva({ ...nueva, zona: e.target.value })} sx={{ width: 150 }} />
          <Button variant="primary" size="md" disabled={!nueva.codigoBase || !nueva.tamano || !nueva.nombre.trim() || !nueva.comunidad.trim()} onClick={() => void emitir()}>
            Emitir
          </Button>
        </Box>
      </Tarjeta>

      {filas === 'cargando' && <Cargando />}
      {filas === 'error' && <Fallo detalle={detalleError} onReintentar={cargar} />}
      {Array.isArray(filas) && filas.length === 0 && <EmptyState icon={Inbox} title="Sin raíces todavía" subtitle="Emitir la primera arriba." compact />}
      {Array.isArray(filas) && filas.map((r) => (
        <Tarjeta key={r.codigoBase}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 1.5, flexWrap: 'wrap', alignItems: 'center' }}>
            <Box>
              <Typography sx={{ fontSize: 14.5, fontWeight: 600 }}>
                {r.codigoBase} · {r.nombre ?? '—'} <Box component="span" sx={{ color: 'text.secondary', fontWeight: 400 }}>({r.comunidad ?? '—'}{r.zona ? `, ${r.zona}` : ''})</Box>
              </Typography>
              <Typography sx={{ fontSize: 12.5, color: 'text.secondary', mt: 0.25 }}>
                Reparte {r.codigoBase + 1}–{r.codigoBase + r.tamano - 1} · usados {r.registrados ?? 0} de {r.tamano - 1}
              </Typography>
            </Box>
            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', alignItems: 'center' }}>
              <Badge tone={r.estado === 'activa' ? 'success' : 'warn'} label={r.estado ?? '—'} />
              <Button variant="tinted" size="sm" onClick={() => void copiarEnlace(r.codigoBase)}>Copiar enlace del panel</Button>
              <Button variant="outlined" size="sm" onClick={() => setAmpliando(ampliando === r.codigoBase ? null : r.codigoBase)}>Ampliar</Button>
              {r.estado === 'activa'
                ? <Button variant="plain" size="sm" onClick={() => void cambiarEstado(r.codigoBase, 'pausada')}>Pausar</Button>
                : <Button variant="plain" size="sm" onClick={() => void cambiarEstado(r.codigoBase, 'activa')}>Activar</Button>}
            </Box>
          </Box>
          {ampliando === r.codigoBase && (
            <Box sx={{ mt: 1.5, display: 'flex', gap: 1, alignItems: 'center' }}>
              <TextField label={`Tamaño nuevo (hoy ${r.tamano})`} value={tamanoNuevo} onChange={(e) => setTamanoNuevo(e.target.value.replace(/\D/g, ''))} sx={{ width: 190 }} />
              <Button variant="primary" size="sm" disabled={!tamanoNuevo || Number(tamanoNuevo) <= r.tamano} onClick={() => void ampliar(r.codigoBase)}>Ampliar bloque</Button>
            </Box>
          )}
        </Tarjeta>
      ))}
    </Box>
  );
}

// ── MUROS ────────────────────────────────────────────────────────────────────

function TabMuros() {
  const [muro, setMuro] = useState<'desahogo' | 'aliento' | 'gratitud'>('desahogo');
  const { filas, cargar, detalleError } = useLista<MensajeAdmin>('muros', { wall: muro });
  const [aviso, setAviso] = useState('');

  async function moderar(id: string, accion: 'ocultar' | 'mostrar') {
    setAviso('');
    try {
      await llamarConsola('moderarMensaje', { id, accion });
      cargar();
    } catch (e) {
      setAviso(mensajeDe(e));
    }
  }

  return (
    <Box>
      <TextField select value={muro} onChange={(e) => setMuro(e.target.value as typeof muro)} sx={{ width: 200, mb: 2 }} label="Muro">
        <MenuItem value="desahogo">Desahogo</MenuItem>
        <MenuItem value="aliento">Aliento</MenuItem>
        <MenuItem value="gratitud">Gratitud</MenuItem>
      </TextField>
      {aviso && <Typography role="status" sx={{ fontSize: 13.5, mb: 1.5 }} color="text.secondary">{aviso}</Typography>}
      {filas === 'cargando' && <Cargando />}
      {filas === 'error' && <Fallo detalle={detalleError} onReintentar={cargar} />}
      {Array.isArray(filas) && filas.length === 0 && <EmptyState icon={Inbox} title="Este muro está vacío" compact />}
      {Array.isArray(filas) && filas.map((m) => (
        <Tarjeta key={m.id}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 1.5, flexWrap: 'wrap' }}>
            <Box sx={{ minWidth: 0 }}>
              <Typography sx={{ fontSize: 14, whiteSpace: 'pre-wrap' }}>{m.body}</Typography>
              <Typography sx={{ fontSize: 12.5, color: 'text.secondary', mt: 0.5 }}>
                {m.authorName} · {cuando(m.createdAt)}
                {m.hiddenAt ? ` · oculto por ${m.hiddenBy ?? '—'}` : ''}
              </Typography>
            </Box>
            <Box sx={{ display: 'flex', gap: 1, alignItems: 'flex-start' }}>
              {m.reportedAt && !m.hiddenAt && <Badge tone="warn" label={`Reportado ×${m.reportCount}`} />}
              {m.hiddenAt
                ? <Button variant="outlined" size="sm" onClick={() => void moderar(m.id, 'mostrar')}>Volver a mostrar</Button>
                : <Button variant="plain" size="sm" onClick={() => void moderar(m.id, 'ocultar')}>Ocultar</Button>}
            </Box>
          </Box>
        </Tarjeta>
      ))}
    </Box>
  );
}

// ── MANOS ────────────────────────────────────────────────────────────────────

function TabManos() {
  const { filas, cargar, detalleError } = useLista<VoluntarioFila>('voluntarios');
  if (filas === 'cargando') return <Cargando />;
  if (filas === 'error') return <Fallo detalle={detalleError} onReintentar={cargar} />;
  if (filas.length === 0) return <EmptyState icon={Inbox} title="Sin voluntarios todavía" subtitle="Cuando alguien ofrezca lo que sabe hacer, aparece acá con su contacto." compact />;
  return (
    <Box>
      {filas.map((v) => (
        <Tarjeta key={v.id}>
          <Typography sx={{ fontSize: 14.5, fontWeight: 600 }}>
            {v.nombre} <Box component="span" sx={{ color: 'text.secondary', fontWeight: 400 }}>· {v.contacto}{v.procedencia ? ` · ${v.procedencia}` : ''}</Box>
          </Typography>
          {v.motivo && <Typography sx={{ fontSize: 13, color: 'text.secondary', mt: 0.25 }}>"{v.motivo}"</Typography>}
          {v.capacidades.length > 0 && (
            <Typography sx={{ fontSize: 13, mt: 0.75 }}>
              Ofrece: {v.capacidades.map((c) => c.title).join(' · ')}
            </Typography>
          )}
        </Tarjeta>
      ))}
    </Box>
  );
}

// ── CONEXIONES ───────────────────────────────────────────────────────────────

const TONO_CONEXION = { propuesta: 'neutral', aceptada: 'accent', entregada: 'success', cancelada: 'warn' } as const;

function TabConexiones() {
  const { filas, cargar, detalleError } = useLista<ConexionFila>('conexiones');
  const [aviso, setAviso] = useState('');

  async function avanzar(id: string, estado: 'aceptada' | 'entregada' | 'cancelada') {
    setAviso('');
    try {
      await llamarConsola('avanzarConexion', { id, estado });
      if (estado === 'entregada') setAviso('Entregada: la necesidad quedó resuelta y el carnet lo muestra.');
      cargar();
    } catch (e) {
      setAviso(mensajeDe(e));
    }
  }

  if (filas === 'cargando') return <Cargando />;
  if (filas === 'error') return <Fallo detalle={detalleError} onReintentar={cargar} />;
  if (filas.length === 0) return <EmptyState icon={Inbox} title="Sin conexiones todavía" subtitle="Se proponen desde Despacho → Candidatos. Comprometer y entregar es siempre decisión humana." compact />;

  return (
    <Box>
      {aviso && <Typography role="status" sx={{ fontSize: 13.5, mb: 1.5 }} color="text.secondary">{aviso}</Typography>}
      {filas.map((c) => (
        <Tarjeta key={c.id}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 1.5, flexWrap: 'wrap', alignItems: 'center' }}>
            <Box sx={{ minWidth: 0 }}>
              <Typography sx={{ fontSize: 14, fontWeight: 600 }}>
                {c.necesidad?.whatINeed ?? '(necesidad borrada)'}
                <Box component="span" sx={{ color: 'text.secondary', fontWeight: 400 }}>
                  {' '}← {c.capacidad?.title ?? c.aportadorRef ?? 'voluntario'}
                </Box>
              </Typography>
              <Typography sx={{ fontSize: 12.5, color: 'text.secondary', mt: 0.25 }}>
                {c.notas ? `${c.notas} · ` : ''}{c.actorEmail} · {cuando(c.updatedAt)}
              </Typography>
            </Box>
            <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', flexWrap: 'wrap' }}>
              <Badge tone={TONO_CONEXION[c.estado]} label={c.estado} />
              {c.estado === 'propuesta' && <Button variant="tinted" size="sm" onClick={() => void avanzar(c.id, 'aceptada')}>Aceptar</Button>}
              {c.estado === 'aceptada' && <Button variant="primary" size="sm" onClick={() => void avanzar(c.id, 'entregada')}>Entregada</Button>}
              {(c.estado === 'propuesta' || c.estado === 'aceptada') && (
                <Button variant="plain" size="sm" onClick={() => void avanzar(c.id, 'cancelada')}>Cancelar</Button>
              )}
            </Box>
          </Box>
        </Tarjeta>
      ))}
    </Box>
  );
}

// ── AUDITORÍA ────────────────────────────────────────────────────────────────

function TabAuditoria() {
  const { filas, cargar, detalleError } = useLista<LineaAuditoria>('auditoria');
  if (filas === 'cargando') return <Cargando />;
  if (filas === 'error') return <Fallo detalle={detalleError} onReintentar={cargar} />;
  if (filas.length === 0) return <EmptyState icon={Inbox} title="Sin acciones registradas" subtitle="Cada corrección, entrega, supresión o moderación queda acá con quién la hizo." compact />;
  return (
    <Box>
      {filas.map((a) => (
        <Box key={a.id} sx={{ display: 'flex', gap: 1.5, py: 0.75, borderBottom: '1px solid', borderColor: 'divider', flexWrap: 'wrap' }}>
          <Typography sx={{ fontSize: 12.5, color: 'text.secondary', minWidth: 96 }}>{cuando(a.at)}</Typography>
          <Typography sx={{ fontSize: 13, fontWeight: 600, minWidth: 150 }}>{a.accion}</Typography>
          <Typography sx={{ fontSize: 13, color: 'text.secondary', minWidth: 0 }}>
            {a.objetivo}{a.detalle ? ` — ${a.detalle}` : ''} · {a.actorEmail}
          </Typography>
        </Box>
      ))}
    </Box>
  );
}

// ── La consola ───────────────────────────────────────────────────────────────

export default function RenacerConsola() {
  const [pestana, setPestana] = useState<Pestana>('Despacho');
  const [anomalias, setAnomalias] = useState<Anomalia[]>([]);

  useEffect(() => {
    // Decisión A: las anomalías se muestran, no bloquean. Si la carga falla, la consola sigue.
    llamarConsola<{ filas: Anomalia[] }>('anomalias')
      .then((r) => setAnomalias(r.filas))
      .catch(() => {});
  }, []);

  return (
    <Box sx={{ maxWidth: 980, mx: 'auto', px: { xs: 2, sm: 3 }, py: 3 }}>
      <Typography variant="h5" sx={{ fontWeight: 700, mb: 0.5 }}>Renacer · consola de operación</Typography>
      <Typography sx={{ fontSize: 13.5, color: 'text.secondary', mb: 2 }}>
        Cada acción queda registrada con tu correo. Los datos de contacto que ves acá no salen por las páginas públicas.
      </Typography>

      {anomalias.length > 0 && (
        <Box sx={{ border: '1px solid', borderColor: 'warning.main', borderRadius: 2.5, p: 1.5, mb: 2 }}>
          <Typography sx={{ fontSize: 13.5, fontWeight: 700, mb: 0.5 }}>Para revisar (no frena nada)</Typography>
          {anomalias.map((a, i) => (
            <Typography key={i} sx={{ fontSize: 13 }}>
              <Badge tone={a.gravedad === 'alta' ? 'danger' : 'warn'} label={a.tipo} compact /> {a.detalle}
            </Typography>
          ))}
        </Box>
      )}

      <Box role="tablist" aria-label="Superficies de la consola" sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', mb: 2.5 }}>
        {PESTANAS.map((p) => (
          <Box
            key={p}
            component="button"
            type="button"
            role="tab"
            aria-selected={pestana === p}
            onClick={() => setPestana(p)}
            sx={{
              border: '1px solid',
              borderColor: pestana === p ? 'primary.main' : 'divider',
              bgcolor: pestana === p ? 'action.selected' : 'transparent',
              color: 'text.primary',
              borderRadius: 999,
              px: 1.75,
              minHeight: 40,
              fontSize: 13.5,
              fontWeight: pestana === p ? 700 : 500,
              cursor: 'pointer',
            }}
          >
            {p}
          </Box>
        ))}
      </Box>

      {pestana === 'Despacho' && <TabDespacho />}
      {pestana === 'Personas' && <TabPersonas />}
      {pestana === 'Raíces' && <TabRaices />}
      {pestana === 'Muros' && <TabMuros />}
      {pestana === 'Manos' && <TabManos />}
      {pestana === 'Conexiones' && <TabConexiones />}
      {pestana === 'Auditoría' && <TabAuditoria />}
    </Box>
  );
}
