/**
 * `/renacer/k/:codigo` — el registro del beneficiario. Contrato permanente (§3.4 · G-A.1):
 * este path no se renombra, no se reusa y no se borra.
 *
 * Desde el 31-08 el código no viene de un estuche sino de **quien invita** (la raíz).
 * La primera pantalla le devuelve a la persona quién la invitó, para que reconozca de
 * dónde viene la puerta.
 *
 * **El orden de los pasos vive en `flujo.ts` (`ORDEN_PASOS`), no acá.** El componente
 * renderiza el paso que le toca según ese arreglo; invertir necesidades↔datos es
 * cambiar una línea allá (D-0831-4), no reordenar JSX.
 */

import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Box, CircularProgress, Typography } from '@mui/material';
import RenacerLayout, { useRenacerTokens } from './RenacerLayout';
import {
  BotonPrincipal,
  BotonSecundario,
  Campo,
  Consentimiento,
  HuecoDeVideo,
  LoQueFalta,
  Pasos,
  SelectorDeEtiquetas,
  anilloFoco,
} from './ui';
import { guardarCredencial, leerCredencial, registrar, resolverCodigo, type CodigoResuelto } from './renacerApi';
import { ORDEN_PASOS, type PasoId } from './flujo';
import { copy } from './renacerCopy';
import { BOLSAS_SUGERIDAS } from '../../../convex-renacer/convex/lib/bolsas';
import { renacerFont } from '../../design-system';
const qeFont = { ui: renacerFont.ui, serif: renacerFont.display };

const GENEROS = ['Mujer', 'Hombre', 'Otro', 'Prefiero no decir'] as const;

const TOTAL_PASOS = ORDEN_PASOS.length;

interface NecesidadBorrador {
  whatINeed: string;
  whyItMatters: string;
  categoria: string[];
}

const necesidadVacia = (): NecesidadBorrador => ({ whatINeed: '', whyItMatters: '', categoria: [] });

export default function RenacerBeneficiario() {
  const { codigo = '' } = useParams();
  const navegar = useNavigate();
  const t = useRenacerTokens();

  const [resuelto, setResuelto] = useState<CodigoResuelto | 'cargando' | 'error'>('cargando');
  const [intento, setIntento] = useState(0);
  const [indice, setIndice] = useState(0);
  const paso: PasoId = ORDEN_PASOS[indice] ?? 'bienvenida';

  const [necesidades, setNecesidades] = useState<NecesidadBorrador[]>([necesidadVacia()]);

  const [nombre, setNombre] = useState('');
  const [ubicacion, setUbicacion] = useState('');
  const [telefono, setTelefono] = useState('');
  const [edad, setEdad] = useState('');
  const [genero, setGenero] = useState<string[]>([]);
  const [email, setEmail] = useState('');

  const [habeasData, setHabeasData] = useState(false);
  const [visibilidad, setVisibilidad] = useState(false);
  const [imagen, setImagen] = useState(false);

  const [asistido, setAsistido] = useState(false);
  const [facilitador, setFacilitador] = useState('');

  const [capacidades, setCapacidades] = useState<Array<{ title: string; description: string }>>([]);

  const [enviando, setEnviando] = useState(false);
  const [errorEnvio, setErrorEnvio] = useState<string | null>(null);

  useEffect(() => {
    let vigente = true;
    setResuelto('cargando');
    resolverCodigo(codigo)
      .then((r) => vigente && setResuelto(r))
      // Un fallo de red NO es "código malo": se distingue y se ofrece reintentar el mismo código.
      .catch(() => vigente && setResuelto('error'));
    return () => {
      vigente = false;
    };
  }, [codigo, intento]);

  if (resuelto === 'cargando') {
    return (
      <RenacerLayout titulo="Un momento…">
        <CircularProgress size={24} sx={{ color: t.accent }} />
      </RenacerLayout>
    );
  }

  if (resuelto === 'error') {
    return (
      <RenacerLayout centrado marca titulo={copy.beneficiario.sinConexion} bajada={copy.beneficiario.sinConexionBajada}>
        <BotonPrincipal onClick={() => setIntento((i) => i + 1)}>Reintentar</BotonPrincipal>
        <Box sx={{ mt: 1.5 }}>
          <BotonSecundario onClick={() => navegar('/renacer')}>Volver al inicio</BotonSecundario>
        </Box>
      </RenacerLayout>
    );
  }
  // Código con formato malo, inexistente, ya usado, o inactivo: pantalla honesta con
  // salida. Nunca un 404 crudo, nunca la pantalla de bienvenida del catálogo.
  const miCarnet = leerCredencial();
  if (!resuelto.existe) {
    return (
      <RenacerLayout centrado marca titulo={copy.beneficiario.codigoNoReconocido} bajada={copy.beneficiario.codigoNoReconocidoBajada}>
        <BotonPrincipal onClick={() => navegar('/renacer')}>Escribirlo de nuevo</BotonPrincipal>
      </RenacerLayout>
    );
  }
  if (resuelto.usado) {
    return (
      <RenacerLayout centrado marca titulo={copy.beneficiario.codigoUsado} bajada={copy.beneficiario.codigoUsadoBajada}>
        {miCarnet && (
          <BotonPrincipal onClick={() => navegar(`/renacer/b/${miCarnet.cardNumber}?t=${miCarnet.cardToken}`)}>
            {copy.puerta.botonMiCarnet}
          </BotonPrincipal>
        )}
        <Box sx={{ mt: miCarnet ? 1.5 : 0 }}>
          <BotonSecundario onClick={() => navegar('/renacer')}>Volver al inicio</BotonSecundario>
        </Box>
      </RenacerLayout>
    );
  }
  if (!resuelto.activa) {
    return (
      <RenacerLayout centrado marca titulo={copy.beneficiario.codigoInactivo} bajada={copy.beneficiario.codigoInactivoBajada}>
        <BotonSecundario onClick={() => navegar('/renacer')}>Volver al inicio</BotonSecundario>
      </RenacerLayout>
    );
  }

  // "Por qué importa" es opcional (01-09): pedirle a alguien que justifique cada necesidad por
  // escrito era una barrera, no un dato.
  const necesidadesValidas = necesidades.filter((n) => n.whatINeed.trim());
  const edadNumero = Number(edad);
  const faltanDatos: string[] = [];
  if (!nombre.trim()) faltanDatos.push('tu nombre');
  if (!ubicacion.trim()) faltanDatos.push('dónde vivís');
  if (!(Number.isInteger(edadNumero) && edadNumero > 0 && edadNumero <= 120)) faltanDatos.push('tu edad');
  if (genero.length === 0) faltanDatos.push('tu género');
  if (asistido && !facilitador.trim()) faltanDatos.push('quién te está ayudando');
  if (!habeasData) faltanDatos.push('autorizar el uso de tus datos');
  const datosValidos = faltanDatos.length === 0;

  const avanzar = () => setIndice((i) => Math.min(i + 1, TOTAL_PASOS - 1));
  const retroceder = () => setIndice((i) => Math.max(i - 1, 0));
  const esUltimo = indice === TOTAL_PASOS - 1;

  async function enviar() {
    setEnviando(true);
    setErrorEnvio(null);
    try {
      const credencial = await registrar({
        codigo: Number(codigo),
        name: nombre.trim(),
        ubicacion: ubicacion.trim(),
        telefono: telefono.trim() || undefined,
        edad: edadNumero,
        genero: genero[0] ?? '',
        email: email.trim() || undefined,
        habeasData,
        donorVisibilityConsent: visibilidad,
        imageConsent: imagen,
        assistedBy: asistido ? facilitador.trim() : undefined,
        // En el orden en que la persona las escribió: ese orden ES la prioridad (31-08).
        needs: necesidadesValidas.map((n) => ({
          whatINeed: n.whatINeed.trim(),
          whyItMatters: n.whyItMatters.trim(),
          categoria: n.categoria[0],
        })),
        capacities: capacidades.filter((c) => c.title.trim() && c.description.trim()),
      });

      // El token se entrega UNA vez. Se guarda antes de navegar: si la navegación
      // falla, la credencial ya está a salvo y la persona no pierde su carnet.
      guardarCredencial(credencial);
      navegar(`/renacer/b/${credencial.cardNumber}?t=${credencial.cardToken}`, { replace: true });
    } catch (e) {
      setErrorEnvio(
        e instanceof Error ? e.message : 'No pudimos guardar el registro. Intentá de nuevo.',
      );
      setEnviando(false);
    }
  }

  const invito =
    resuelto.origen === 'raiz' && resuelto.raiz
      ? copy.beneficiario.teInvito(resuelto.raiz.nombre, resuelto.raiz.comunidad)
      : null;

  // ── Bienvenida ─────────────────────────────────────────────────────────────
  if (paso === 'bienvenida') {
    return (
      <RenacerLayout
        resetScrollKey={indice}
        titulo={copy.beneficiario.bienvenidaTitulo}
        bajada={copy.beneficiario.bienvenidaBajada}
      >
        <Pasos actual={indice + 1} total={TOTAL_PASOS} />
        <HuecoDeVideo nota="Pronto, un video corto de bienvenida." />
        <Box
          sx={{ border: `1px solid ${t.border}`, bgcolor: t.surface, borderRadius: 2, p: 2, mb: 3 }}
        >
          <Typography sx={{ fontFamily: qeFont.ui, fontSize: 13, color: t.subtle }}>
            {copy.beneficiario.etiquetaCodigo}
          </Typography>
          <Typography sx={{ fontFamily: qeFont.serif, fontSize: 32, color: t.text }}>
            {codigo}
          </Typography>
          {invito && (
            <Typography sx={{ fontFamily: qeFont.ui, fontSize: 14.5, color: t.muted, mt: 0.5 }}>
              {invito}
            </Typography>
          )}
        </Box>
        <BotonPrincipal onClick={avanzar}>
          {ORDEN_PASOS[1] === 'necesidades' ? copy.beneficiario.bienvenidaBoton : 'Empezar'}
        </BotonPrincipal>
      </RenacerLayout>
    );
  }

  // ── Necesidades ────────────────────────────────────────────────────────────
  if (paso === 'necesidades') {
    return (
      <RenacerLayout
        resetScrollKey={indice}
        titulo="¿Qué necesitás?"
        bajada="Escribí con tus palabras lo que hace falta. Poné primero lo que más urge."
      >
        <Pasos actual={indice + 1} total={TOTAL_PASOS} />

        {necesidades.map((n, i) => (
          <Box
            key={i}
            sx={{ border: `1px solid ${t.border}`, bgcolor: t.surface, borderRadius: 2, p: 2, mb: 2 }}
          >
            <Typography sx={{ fontFamily: renacerFont.display, fontWeight: 600, fontSize: 12.5, letterSpacing: '0.08em', textTransform: 'uppercase', color: t.subtle, mb: 1 }}>
              {i === 0 ? 'Necesidad 1 · la que más urge' : `Necesidad ${i + 1}`}
            </Typography>
            <Campo
              etiqueta="Lo que necesitás"
              valor={n.whatINeed}
              onChange={(v) =>
                setNecesidades((prev) => prev.map((x, j) => (j === i ? { ...x, whatINeed: v } : x)))
              }
              placeholder="Tejas para el techo"
              requerido
            />
            <Campo
              etiqueta="Por qué importa (opcional)"
              valor={n.whyItMatters}
              onChange={(v) =>
                setNecesidades((prev) => prev.map((x, j) => (j === i ? { ...x, whyItMatters: v } : x)))
              }
              placeholder="Se nos llueve la casa y hay dos niños"
              multilinea
            />
            <SelectorDeEtiquetas
              etiqueta="De qué tipo es (opcional)"
              sugeridas={BOLSAS_SUGERIDAS}
              elegidas={n.categoria}
              onChange={(v) =>
                setNecesidades((prev) => prev.map((x, j) => (j === i ? { ...x, categoria: v } : x)))
              }
              maximo={1}
              placeholderLibre="Otro tipo"
            />
            {necesidades.length > 1 && (
              <Typography
                component="button"
                type="button"
                onClick={() => setNecesidades((prev) => prev.filter((_, j) => j !== i))}
                sx={{ fontFamily: qeFont.ui, fontSize: 14, color: t.muted, background: 'none', border: 0, px: 1.5, ml: -1.5, minHeight: 48, display: 'inline-flex', alignItems: 'center', cursor: 'pointer', borderRadius: 999, ...anilloFoco(t) }}
              >
                Quitar esta necesidad
              </Typography>
            )}
          </Box>
        ))}

        <Box sx={{ mb: 3 }}>
          <BotonSecundario onClick={() => setNecesidades((prev) => [...prev, necesidadVacia()])}>
            Agregar otra necesidad
          </BotonSecundario>
        </Box>

        <LoQueFalta faltantes={necesidadesValidas.length === 0 ? ['escribir al menos una necesidad'] : []} />
        <BotonPrincipal disabled={necesidadesValidas.length === 0 || (esUltimo && enviando)} onClick={esUltimo ? enviar : avanzar}>
          {esUltimo ? 'Terminar mi registro' : 'Continuar'}
        </BotonPrincipal>
        <Box sx={{ mt: 1.5 }}>
          <BotonSecundario onClick={retroceder}>Atrás</BotonSecundario>
        </Box>
      </RenacerLayout>
    );
  }

  // ── Datos ──────────────────────────────────────────────────────────────────
  if (paso === 'datos') {
    return (
      <RenacerLayout
        resetScrollKey={indice}
        titulo="¿Dónde te llevamos la ayuda?"
        bajada="Solo lo necesario para llegar hasta vos. No pedimos documento, ni ingresos, ni cuántos viven en la casa."
      >
        <Pasos actual={indice + 1} total={TOTAL_PASOS} />

        <Campo etiqueta="Tu nombre" valor={nombre} onChange={setNombre} requerido autoComplete="name" />
        <Campo
          etiqueta="Dónde vivís"
          razon="Es la zona a la que llega la ayuda. Con el barrio y una referencia basta si no hay nomenclatura. Quien te invitó puede moverse entre varias zonas; por eso te lo preguntamos a vos."
          valor={ubicacion}
          onChange={setUbicacion}
          multilinea
          requerido
          autoComplete="street-address"
          placeholder={resuelto.raiz ? `${resuelto.raiz.comunidad}, …` : undefined}
        />
        <Campo
          etiqueta="Teléfono (opcional)"
          razon="Para avisarte cuando la ayuda esté en camino."
          valor={telefono}
          onChange={(v) => setTelefono(v.replace(/[^0-9+()\s-]/g, '').slice(0, 40))}
          autoComplete="tel"
          numerico
        />
        <Campo
          etiqueta="Edad"
          razon="Algunas ayudas se organizan por edad; por ejemplo, las que priorizan adultos mayores."
          valor={edad}
          onChange={(v) => setEdad(v.replace(/[^0-9]/g, '').slice(0, 3))}
          numerico
          requerido
        />
        <SelectorDeEtiquetas
          etiqueta="Género"
          razon="Algunas ayudas se organizan por género; por ejemplo, las que priorizan mujeres cabeza de hogar."
          sugeridas={GENEROS}
          elegidas={genero}
          onChange={setGenero}
          maximo={1}
          placeholderLibre="Otra forma de decirlo"
        />
        <Campo
          etiqueta="Correo (opcional)"
          razon="Solo si querés que te escribamos cuando haya novedades."
          valor={email}
          onChange={setEmail}
          tipo="email"
          autoComplete="email"
        />

        <Box sx={{ height: '1px', bgcolor: t.hairline, my: 3 }} />

        <Consentimiento
          texto="Alguien me está ayudando a hacer este registro"
          detalle="Si preferís que otra persona lo llene por vos, se puede. Queda anotado quién te ayudó."
          marcado={asistido}
          onChange={setAsistido}
        />
        {asistido && (
          <Campo etiqueta="Nombre de quien te está ayudando" valor={facilitador} onChange={setFacilitador} requerido />
        )}

        <Box sx={{ height: '1px', bgcolor: t.hairline, my: 3 }} />

        {/* §10.1 — el consentimiento se recoge EN PRESENCIA, guiado por el facilitador,
            ANTES del registro digital. ⚠️ TEXTO PROVISORIO — [PENDIENTE revisión legal
            real]: la silla Legal está vacía (§10 del spec). */}
        <Consentimiento
          texto="Autorizo el uso de mis datos para organizar y entregar la ayuda"
          detalle="Guardamos lo que escribís en este registro (incluido tu correo si lo diste, y lo que necesitás) y lo usamos solo para hacerte llegar la ayuda. Podés pedir que lo borremos cuando quieras."
          marcado={habeasData}
          onChange={setHabeasData}
        />
        <Consentimiento
          texto={copy.beneficiario.consentimientoVisibilidad}
          detalle={copy.beneficiario.consentimientoVisibilidadDetalle}
          marcado={visibilidad}
          onChange={setVisibilidad}
        />
        <Consentimiento
          texto="Autorizo que me tomen fotos y que se usen en la campaña"
          detalle="Podés recibir la ayuda igual sin marcar esto. Nunca se publican fotos de menores de edad."
          marcado={imagen}
          onChange={setImagen}
        />

        <Box sx={{ mt: 3 }}>
          <LoQueFalta faltantes={faltanDatos} />
          <BotonPrincipal disabled={!datosValidos || (esUltimo && enviando)} onClick={esUltimo ? enviar : avanzar}>
            {esUltimo ? 'Terminar mi registro' : 'Continuar'}
          </BotonPrincipal>
        </Box>
        <Box sx={{ mt: 1.5 }}>
          <BotonSecundario onClick={retroceder}>Atrás</BotonSecundario>
        </Box>
      </RenacerLayout>
    );
  }

  // ── Capacidades (opcional) y cierre ────────────────────────────────────────
  const listoParaEnviar = necesidadesValidas.length > 0 && datosValidos;
  return (
    <RenacerLayout
      resetScrollKey={indice}
      titulo="¿Querés ayudar vos también?"
      bajada="Es opcional. Hoy te hace falta algo; mañana lo que vos sabés hacer le puede hacer falta a alguien más."
    >
      <Pasos actual={indice + 1} total={TOTAL_PASOS} />

      {capacidades.map((c, i) => (
        <Box key={i} sx={{ border: `1px solid ${t.border}`, bgcolor: t.surface, borderRadius: 2, p: 2, mb: 2 }}>
          <Typography sx={{ fontFamily: renacerFont.display, fontWeight: 600, fontSize: 12.5, letterSpacing: '0.08em', textTransform: 'uppercase', color: t.subtle, mb: 1 }}>
            {`Lo que sé hacer · ${i + 1}`}
          </Typography>
          <Campo
            etiqueta="Lo que sé hacer"
            valor={c.title}
            onChange={(v) => setCapacidades((prev) => prev.map((x, j) => (j === i ? { ...x, title: v } : x)))}
            placeholder="Cocinar para muchos"
          />
          <Campo
            etiqueta="Contanos un poco más"
            valor={c.description}
            onChange={(v) => setCapacidades((prev) => prev.map((x, j) => (j === i ? { ...x, description: v } : x)))}
            multilinea
          />
        </Box>
      ))}

      <Box sx={{ mb: 3 }}>
        <BotonSecundario onClick={() => setCapacidades((prev) => [...prev, { title: '', description: '' }])}>
          {capacidades.length === 0 ? 'Ofrecer lo que sé hacer' : 'Agregar otra'}
        </BotonSecundario>
      </Box>

      {errorEnvio && (
        <Typography role="alert" sx={{ fontFamily: qeFont.ui, fontSize: 14, color: t.alert, mb: 2, lineHeight: 1.45 }}>
          No pudimos guardar el registro. Intentá de nuevo. <Box component="span" sx={{ color: t.subtle }}>({errorEnvio})</Box>
        </Typography>
      )}

      <LoQueFalta faltantes={listoParaEnviar ? [] : [...(necesidadesValidas.length === 0 ? ['al menos una necesidad'] : []), ...faltanDatos]} />
      <BotonPrincipal disabled={enviando || !listoParaEnviar} onClick={enviar}>
        {enviando ? 'Guardando…' : 'Terminar mi registro'}
      </BotonPrincipal>
      <Box sx={{ mt: 1.5 }}>
        <BotonSecundario onClick={retroceder}>Atrás</BotonSecundario>
      </Box>
    </RenacerLayout>
  );
}
