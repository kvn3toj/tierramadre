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
  Pasos,
  SelectorDeEtiquetas,
} from './ui';
import { guardarCredencial, registrar, resolverCodigo, type CodigoResuelto } from './renacerApi';
import { ORDEN_PASOS, type PasoId } from './flujo';
import { copy } from './renacerCopy';
import { BOLSAS_SUGERIDAS } from '../../../convex-renacer/convex/lib/bolsas';
import { qeFont } from '../../design-system';

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
  const [indice, setIndice] = useState(0);
  const paso: PasoId = ORDEN_PASOS[indice] ?? 'bienvenida';

  const [necesidades, setNecesidades] = useState<NecesidadBorrador[]>([necesidadVacia()]);

  const [nombre, setNombre] = useState('');
  const [ubicacion, setUbicacion] = useState('');
  const [telefono, setTelefono] = useState('');
  const [edad, setEdad] = useState('');
  const [genero, setGenero] = useState('');
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
    resolverCodigo(codigo)
      .then((r) => vigente && setResuelto(r))
      .catch(() => vigente && setResuelto('error'));
    return () => {
      vigente = false;
    };
  }, [codigo]);

  if (resuelto === 'cargando') {
    return (
      <RenacerLayout titulo="Un momento…">
        <CircularProgress size={24} sx={{ color: t.accent }} />
      </RenacerLayout>
    );
  }

  // Código con formato malo, inexistente, ya usado, o inactivo: pantalla honesta con
  // salida. Nunca un 404 crudo, nunca la pantalla de bienvenida del catálogo.
  if (resuelto === 'error' || !resuelto.existe) {
    return (
      <RenacerLayout
        titulo={copy.beneficiario.codigoNoReconocido}
        bajada={copy.beneficiario.codigoNoReconocidoBajada}
      >
        <BotonSecundario onClick={() => navegar('/renacer')}>Escribirlo de nuevo</BotonSecundario>
      </RenacerLayout>
    );
  }
  if (resuelto.usado) {
    return (
      <RenacerLayout titulo={copy.beneficiario.codigoUsado} bajada={copy.beneficiario.codigoUsadoBajada}>
        <BotonSecundario onClick={() => navegar('/renacer')}>Volver al inicio</BotonSecundario>
      </RenacerLayout>
    );
  }
  if (!resuelto.activa) {
    return (
      <RenacerLayout titulo={copy.beneficiario.codigoInactivo} bajada={copy.beneficiario.codigoInactivoBajada}>
        <BotonSecundario onClick={() => navegar('/renacer')}>Volver al inicio</BotonSecundario>
      </RenacerLayout>
    );
  }

  const necesidadesValidas = necesidades.filter(
    (n) => n.whatINeed.trim() && n.whyItMatters.trim(),
  );
  const edadNumero = Number(edad);
  const datosValidos =
    nombre.trim().length > 0 &&
    ubicacion.trim().length > 0 &&
    genero.trim().length > 0 &&
    Number.isInteger(edadNumero) &&
    edadNumero > 0 &&
    edadNumero <= 120 &&
    habeasData &&
    (!asistido || facilitador.trim().length > 0);

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
        genero: genero.trim(),
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
        <HuecoDeVideo nota="Acá va el video de bienvenida." />
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
          {ORDEN_PASOS[1] === 'necesidades' ? 'Contarles qué necesito' : 'Empezar'}
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
        bajada="Escribilo con tus palabras y en orden: la primera es la que más urge. Si querés, elegí de qué tipo es — y si ninguno encaja, escribí uno."
      >
        <Pasos actual={indice + 1} total={TOTAL_PASOS} />

        {necesidades.map((n, i) => (
          <Box
            key={i}
            sx={{ border: `1px solid ${t.border}`, bgcolor: t.surface, borderRadius: 2, p: 2, mb: 2 }}
          >
            <Typography sx={{ fontFamily: qeFont.ui, fontSize: 13, color: t.subtle, mb: 1 }}>
              {i === 0 ? '1 · la que más urge' : `${i + 1}`}
            </Typography>
            <Campo
              etiqueta="Qué necesitás"
              valor={n.whatINeed}
              onChange={(v) =>
                setNecesidades((prev) => prev.map((x, j) => (j === i ? { ...x, whatINeed: v } : x)))
              }
              placeholder="Tejas para el techo"
              requerido
            />
            <Campo
              etiqueta="¿Por qué importa?"
              valor={n.whyItMatters}
              onChange={(v) =>
                setNecesidades((prev) => prev.map((x, j) => (j === i ? { ...x, whyItMatters: v } : x)))
              }
              placeholder="Se nos llueve la casa y hay dos niños"
              multilinea
              requerido
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
                sx={{ fontFamily: qeFont.ui, fontSize: 14, color: t.subtle, background: 'none', border: 0, p: 0, cursor: 'pointer' }}
              >
                Quitar esta
              </Typography>
            )}
          </Box>
        ))}

        <Box sx={{ mb: 3 }}>
          <BotonSecundario onClick={() => setNecesidades((prev) => [...prev, necesidadVacia()])}>
            Agregar otra necesidad
          </BotonSecundario>
        </Box>

        <BotonPrincipal disabled={necesidadesValidas.length === 0 || (esUltimo && enviando)} onClick={esUltimo ? enviar : avanzar}>
          {esUltimo ? 'Terminar mi registro' : 'Continuar'}
        </BotonPrincipal>
        <Box sx={{ mt: 1.5 }}>
          <BotonSecundario onClick={retroceder}>Volver</BotonSecundario>
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

        <Campo etiqueta="Tu nombre" valor={nombre} onChange={setNombre} requerido />
        <Campo
          etiqueta="Dónde vivís"
          razon="Es la zona a la que llega la ayuda. Un barrio y una referencia alcanzan si no hay nomenclatura. Quien te invitó puede moverse entre varias zonas — por eso te lo preguntamos a vos."
          valor={ubicacion}
          onChange={setUbicacion}
          multilinea
          requerido
        />
        <Campo
          etiqueta="Teléfono (opcional)"
          razon="Para avisarte por WhatsApp cuando la ayuda esté en camino."
          valor={telefono}
          onChange={(v) => setTelefono(v.replace(/[^0-9+()\s-]/g, '').slice(0, 40))}
          tipo="text"
        />
        <Campo
          etiqueta="Edad"
          razon="Algunas ayudas se organizan por edad — por ejemplo, las que priorizan adultos mayores."
          valor={edad}
          onChange={(v) => setEdad(v.replace(/[^0-9]/g, '').slice(0, 3))}
          tipo="number"
          requerido
        />
        <Campo etiqueta="Género" valor={genero} onChange={setGenero} requerido />
        <Campo
          etiqueta="Correo (opcional)"
          razon="Solo si querés que te escribamos cuando haya novedades."
          valor={email}
          onChange={setEmail}
          tipo="email"
        />

        <Box sx={{ height: 1, bgcolor: t.hairline, my: 3 }} />

        <Consentimiento
          texto="Alguien me está ayudando a hacer este registro"
          detalle="Si no tenés cómo hacerlo solo, un facilitador puede registrarte. Queda anotado quién fue."
          marcado={asistido}
          onChange={setAsistido}
        />
        {asistido && (
          <Campo etiqueta="Nombre de quien te está ayudando" valor={facilitador} onChange={setFacilitador} requerido />
        )}

        <Box sx={{ height: 1, bgcolor: t.hairline, my: 3 }} />

        {/* §10.1 — el consentimiento se recoge EN PRESENCIA, guiado por el facilitador,
            ANTES del registro digital. ⚠️ TEXTO PROVISORIO — [PENDIENTE revisión legal
            real]: la silla Legal está vacía (§10 del spec). */}
        <Consentimiento
          texto="Autorizo el uso de mis datos para organizar y entregar la ayuda"
          detalle="Guardamos tu nombre, dónde vivís, tu edad, tu género y tu teléfono, y los usamos solo para hacerte llegar la ayuda. Podés pedir que los borremos cuando quieras."
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
          texto="Autorizo que me tomen fotos para la campaña"
          detalle="Podés recibir la ayuda igual sin marcar esto. Nunca se publican fotos de menores de edad."
          marcado={imagen}
          onChange={setImagen}
        />

        <Box sx={{ mt: 3 }}>
          <BotonPrincipal disabled={!datosValidos || (esUltimo && enviando)} onClick={esUltimo ? enviar : avanzar}>
            {esUltimo ? 'Terminar mi registro' : 'Continuar'}
          </BotonPrincipal>
        </Box>
        <Box sx={{ mt: 1.5 }}>
          <BotonSecundario onClick={retroceder}>Volver</BotonSecundario>
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
      bajada="Esto es opcional. Alguien que necesita ayuda hoy también tiene algo que ofrecer — y así es como la tribu se sostiene sola."
    >
      <Pasos actual={indice + 1} total={TOTAL_PASOS} />

      {capacidades.map((c, i) => (
        <Box key={i} sx={{ border: `1px solid ${t.border}`, bgcolor: t.surface, borderRadius: 2, p: 2, mb: 2 }}>
          <Campo
            etiqueta={`Lo que sé hacer ${i + 1}`}
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
          {capacidades.length === 0 ? 'Quiero enlistar mis capacidades' : 'Agregar otra'}
        </BotonSecundario>
      </Box>

      {errorEnvio && (
        <Typography role="alert" sx={{ fontFamily: qeFont.ui, fontSize: 14, color: t.accent, mb: 2, lineHeight: 1.45 }}>
          {errorEnvio}
        </Typography>
      )}

      <BotonPrincipal disabled={enviando || !listoParaEnviar} onClick={enviar}>
        {enviando ? 'Guardando…' : 'Terminar mi registro'}
      </BotonPrincipal>
      <Box sx={{ mt: 1.5 }}>
        <BotonSecundario onClick={retroceder}>Volver</BotonSecundario>
      </Box>
    </RenacerLayout>
  );
}
