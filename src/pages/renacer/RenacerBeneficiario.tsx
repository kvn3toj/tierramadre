/**
 * `/renacer/k/:codigo` — **la URL que va impresa en cada estuche.**
 *
 * Contrato permanente desde el 2026-08-25 (compuerta §3.4 · G-A.1). Este path no se
 * renombra, no se reusa y no se borra: hay estuches impresos que apuntan acá.
 *
 * **El orden de los pasos es una decisión ratificada, no una preferencia de UX.**
 * Necesidades PRIMERO, datos DESPUÉS (§6, 25-08). Está hecho estructura —un stepper
 * cuyo paso 1 son las necesidades— para que invertirlo requiera reescribir el
 * componente y no reordenar dos bloques de JSX sin darse cuenta de lo que se rompe.
 *
 * El porqué del orden: a alguien que acaba de perder la casa se le pregunta primero qué
 * necesita, no su cédula. Un formulario que abre pidiendo datos convierte la ayuda en
 * un trámite.
 */

import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Box, CircularProgress, Typography } from '@mui/material';
import RenacerLayout, { useRenacerTokens } from './RenacerLayout';
import { BotonPrincipal, BotonSecundario, Campo, Consentimiento, HuecoDeVideo, Pasos } from './ui';
import { guardarCredencial, registrar, resolverKit, type KitResuelto } from './renacerApi';
import { qeFont } from '../../design-system';

const TOTAL_PASOS = 4;

interface NecesidadBorrador {
  whatINeed: string;
  whyItMatters: string;
}

export default function RenacerBeneficiario() {
  const { codigo = '' } = useParams();
  const navegar = useNavigate();
  const t = useRenacerTokens();

  const [kit, setKit] = useState<KitResuelto | 'cargando' | 'error'>('cargando');
  const [paso, setPaso] = useState(1);

  const [necesidades, setNecesidades] = useState<NecesidadBorrador[]>([
    { whatINeed: '', whyItMatters: '' },
  ]);

  const [nombre, setNombre] = useState('');
  const [ubicacion, setUbicacion] = useState('');
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
    resolverKit(codigo)
      .then((k) => vigente && setKit(k))
      .catch(() => vigente && setKit('error'));
    return () => {
      vigente = false;
    };
  }, [codigo]);

  if (kit === 'cargando') {
    return (
      <RenacerLayout titulo="Un momento…">
        <CircularProgress size={24} sx={{ color: t.accent }} />
      </RenacerLayout>
    );
  }

  // Código con formato malo, inexistente, o el endpoint caído: pantalla honesta con
  // salida. Nunca un 404 crudo, nunca la pantalla de bienvenida del catálogo.
  if (kit === 'error' || !kit.existe) {
    return (
      <RenacerLayout
        titulo="No reconocemos ese código"
        bajada="Puede que falte un número o sobre alguno. Está impreso debajo del QR, en el estuche."
      >
        <BotonSecundario onClick={() => navegar('/renacer')}>Escribirlo de nuevo</BotonSecundario>
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

  async function enviar() {
    setEnviando(true);
    setErrorEnvio(null);
    try {
      const credencial = await registrar({
        kitCode: Number(codigo),
        name: nombre.trim(),
        ubicacion: ubicacion.trim(),
        edad: edadNumero,
        genero: genero.trim(),
        email: email.trim() || undefined,
        habeasData,
        donorVisibilityConsent: visibilidad,
        imageConsent: imagen,
        assistedBy: asistido ? facilitador.trim() : undefined,
        needs: necesidadesValidas,
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

  // ── Paso 1 · Bienvenida ────────────────────────────────────────────────────
  if (paso === 1) {
    return (
      <RenacerLayout
        resetScrollKey={paso}
        titulo="Bienvenida. Bienvenido."
        bajada="Alguien compró un kit y dejó esta manilla para vos. Lo que sigue es contarnos qué necesitás — eso es lo que hace que la ayuda llegue a donde tiene que llegar."
      >
        <Pasos actual={1} total={TOTAL_PASOS} />
        <HuecoDeVideo nota="Acá va el video de bienvenida. Todavía no está grabado." />
        <Box
          sx={{ border: `1px solid ${t.border}`, bgcolor: t.surface, borderRadius: 2, p: 2, mb: 3 }}
        >
          <Typography sx={{ fontFamily: qeFont.ui, fontSize: 13, color: t.subtle }}>
            Código del estuche
          </Typography>
          <Typography sx={{ fontFamily: qeFont.serif, fontSize: 32, color: t.text }}>
            {codigo}
          </Typography>
        </Box>
        <BotonPrincipal onClick={() => setPaso(2)}>Contarles qué necesito</BotonPrincipal>
      </RenacerLayout>
    );
  }

  // ── Paso 2 · Necesidades. PRIMERO. ─────────────────────────────────────────
  if (paso === 2) {
    return (
      <RenacerLayout
        resetScrollKey={paso}
        titulo="¿Qué necesitás?"
        bajada="Escribilo con tus palabras. No hay una lista de opciones — nadie sabe mejor que vos qué hace falta en tu casa."
      >
        <Pasos actual={2} total={TOTAL_PASOS} />

        {necesidades.map((n, i) => (
          <Box
            key={i}
            sx={{
              border: `1px solid ${t.border}`,
              bgcolor: t.surface,
              borderRadius: 2,
              p: 2,
              mb: 2,
            }}
          >
            <Campo
              etiqueta={`Necesidad ${i + 1}`}
              valor={n.whatINeed}
              onChange={(v) =>
                setNecesidades((prev) =>
                  prev.map((x, j) => (j === i ? { ...x, whatINeed: v } : x)),
                )
              }
              placeholder="Tejas para el techo"
              requerido
            />
            <Campo
              etiqueta="¿Por qué importa?"
              valor={n.whyItMatters}
              onChange={(v) =>
                setNecesidades((prev) =>
                  prev.map((x, j) => (j === i ? { ...x, whyItMatters: v } : x)),
                )
              }
              placeholder="Se nos llueve la casa y hay dos niños"
              multilinea
              requerido
            />
            {necesidades.length > 1 && (
              <Typography
                component="button"
                onClick={() => setNecesidades((prev) => prev.filter((_, j) => j !== i))}
                sx={{
                  fontFamily: qeFont.ui,
                  fontSize: 14,
                  color: t.subtle,
                  background: 'none',
                  border: 0,
                  p: 0,
                  cursor: 'pointer',
                }}
              >
                Quitar esta
              </Typography>
            )}
          </Box>
        ))}

        <Box sx={{ mb: 3 }}>
          <BotonSecundario
            onClick={() =>
              setNecesidades((prev) => [...prev, { whatINeed: '', whyItMatters: '' }])
            }
          >
            Agregar otra necesidad
          </BotonSecundario>
        </Box>

        <BotonPrincipal disabled={necesidadesValidas.length === 0} onClick={() => setPaso(3)}>
          Continuar
        </BotonPrincipal>

        <Box sx={{ mt: 1.5 }}>
          <BotonSecundario onClick={() => setPaso(1)}>Volver</BotonSecundario>
        </Box>
      </RenacerLayout>
    );
  }

  // ── Paso 3 · Datos. DESPUÉS, y con su razón dicha. ─────────────────────────
  if (paso === 3) {
    return (
      <RenacerLayout
        resetScrollKey={paso}
        titulo="¿Dónde te llevamos la ayuda?"
        bajada="Solo lo necesario para llegar hasta vos. No pedimos documento, ni ingresos, ni cuántos viven en la casa."
      >
        <Pasos actual={3} total={TOTAL_PASOS} />

        <Campo etiqueta="Tu nombre" valor={nombre} onChange={setNombre} requerido />
        <Campo
          etiqueta="Dónde vivís"
          razon="Es la dirección a la que llega la ayuda. Un barrio y una referencia alcanzan si no hay nomenclatura."
          valor={ubicacion}
          onChange={setUbicacion}
          multilinea
          requerido
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
          <Campo
            etiqueta="Nombre de quien te está ayudando"
            valor={facilitador}
            onChange={setFacilitador}
            requerido
          />
        )}

        <Box sx={{ height: 1, bgcolor: t.hairline, my: 3 }} />

        {/* §10.1 — el consentimiento se recoge EN PRESENCIA, guiado por el facilitador,
            ANTES del registro digital. Esta casilla lo deja registrado con su timestamp.
            ⚠️ TEXTO PROVISORIO — [PENDIENTE revisión legal real]: la silla Legal está
            vacía (§10 del spec) y este aviso es diseño, no asesoría jurídica. */}
        <Consentimiento
          texto="Autorizo el uso de mis datos para organizar y entregar la ayuda"
          detalle="Guardamos tu nombre, dónde vivís, tu edad y tu género, y los usamos solo para hacerte llegar la ayuda. Podés pedir que los borremos cuando quieras."
          marcado={habeasData}
          onChange={setHabeasData}
        />
        <Consentimiento
          texto="Quiero que quien compró el kit pueda saber mi nombre"
          detalle="Si no marcás esto, esa persona solo ve cuántas manillas se registraron — nunca quién."
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
          <BotonPrincipal disabled={!datosValidos} onClick={() => setPaso(4)}>
            Continuar
          </BotonPrincipal>
        </Box>
        <Box sx={{ mt: 1.5 }}>
          <BotonSecundario onClick={() => setPaso(2)}>Volver</BotonSecundario>
        </Box>
      </RenacerLayout>
    );
  }

  // ── Paso 4 · Capacidades (opcional) y cierre ───────────────────────────────
  return (
    <RenacerLayout
      resetScrollKey={paso}
      titulo="¿Qué sabés hacer?"
      bajada="Esto es opcional. Alguien que necesita ayuda hoy también tiene algo que ofrecer — y así es como la tribu se sostiene sola."
    >
      <Pasos actual={4} total={TOTAL_PASOS} />

      {capacidades.map((c, i) => (
        <Box
          key={i}
          sx={{ border: `1px solid ${t.border}`, bgcolor: t.surface, borderRadius: 2, p: 2, mb: 2 }}
        >
          <Campo
            etiqueta={`Lo que sé hacer ${i + 1}`}
            valor={c.title}
            onChange={(v) =>
              setCapacidades((prev) => prev.map((x, j) => (j === i ? { ...x, title: v } : x)))
            }
            placeholder="Cocinar para muchos"
          />
          <Campo
            etiqueta="Contanos un poco más"
            valor={c.description}
            onChange={(v) =>
              setCapacidades((prev) =>
                prev.map((x, j) => (j === i ? { ...x, description: v } : x)),
              )
            }
            multilinea
          />
        </Box>
      ))}

      <Box sx={{ mb: 3 }}>
        <BotonSecundario
          onClick={() => setCapacidades((prev) => [...prev, { title: '', description: '' }])}
        >
          {capacidades.length === 0 ? 'Quiero enlistar mis capacidades' : 'Agregar otra'}
        </BotonSecundario>
      </Box>

      {errorEnvio && (
        <Typography
          role="alert"
          sx={{ fontFamily: qeFont.ui, fontSize: 14, color: t.accent, mb: 2, lineHeight: 1.45 }}
        >
          {errorEnvio}
        </Typography>
      )}

      <BotonPrincipal disabled={enviando} onClick={enviar}>
        {enviando ? 'Guardando…' : 'Terminar mi registro'}
      </BotonPrincipal>
      <Box sx={{ mt: 1.5 }}>
        <BotonSecundario onClick={() => setPaso(3)}>Volver</BotonSecundario>
      </Box>
    </RenacerLayout>
  );
}
