/**
 * `/renacer/capacidades` — "Quiero ayudar → Enlistar mis capacidades" (31-08).
 *
 * Quien ofrece lo que sabe hacer sin ser beneficiario. Lista sugerida para quien "quiere
 * ayudar pero no sabe cómo" + texto libre. Habeas data fail-closed, como todo el flujo.
 */

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Typography } from '@mui/material';
import RenacerLayout, { useRenacerTokens } from './RenacerLayout';
import { BotonPrincipal, BotonSecundario, Campo, Consentimiento, SelectorDeEtiquetas } from './ui';
import { registrarVoluntario } from './renacerApi';
import { CAPACIDADES_SUGERIDAS } from '../../../convex-renacer/convex/lib/bolsas';
import { qeFont } from '../../design-system';

export default function RenacerCapacidades() {
  const t = useRenacerTokens();
  const navegar = useNavigate();

  const [nombre, setNombre] = useState('');
  const [contacto, setContacto] = useState('');
  const [procedencia, setProcedencia] = useState('');
  const [motivo, setMotivo] = useState('');
  const [capacidades, setCapacidades] = useState<string[]>([]);
  const [detalle, setDetalle] = useState('');
  const [habeasData, setHabeasData] = useState(false);

  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [listo, setListo] = useState(false);

  const valido =
    nombre.trim().length > 0 &&
    contacto.trim().length > 0 &&
    capacidades.length > 0 &&
    habeasData;

  async function enviar() {
    setEnviando(true);
    setError(null);
    try {
      await registrarVoluntario({
        nombre: nombre.trim(),
        contacto: contacto.trim(),
        procedencia: procedencia.trim() || undefined,
        motivo: motivo.trim() || undefined,
        habeasData,
        capacities: capacidades.map((c) => ({ title: c, description: detalle.trim() || undefined })),
      });
      setListo(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No pudimos guardar. Intentá de nuevo.');
      setEnviando(false);
    }
  }

  if (listo) {
    return (
      <RenacerLayout
        titulo="Gracias."
        bajada="Cuando haya un taller que dar, una cocina que atender o un techo que levantar, te escribimos."
      >
        <BotonSecundario onClick={() => navegar('/renacer/tribu')}>Conocer las necesidades</BotonSecundario>
        <Box sx={{ mt: 1.5 }}>
          <BotonSecundario onClick={() => navegar('/renacer')}>Volver al inicio</BotonSecundario>
        </Box>
      </RenacerLayout>
    );
  }

  return (
    <RenacerLayout
      titulo="¿Qué sabés hacer?"
      bajada="Todo sirve — desde cocinar hasta dar una consultoría. Elegí de la lista o escribí lo tuyo."
    >
      <SelectorDeEtiquetas
        etiqueta="Mis capacidades"
        sugeridas={CAPACIDADES_SUGERIDAS}
        elegidas={capacidades}
        onChange={setCapacidades}
        maximo={10}
        placeholderLibre="Otra cosa que sé hacer"
      />
      <Campo
        etiqueta="Contanos un poco más (opcional)"
        valor={detalle}
        onChange={setDetalle}
        multilinea
        placeholder="Tengo tiempo los fines de semana, puedo moverme hasta Potrerito…"
      />

      <Box sx={{ height: 1, bgcolor: t.hairline, my: 3 }} />

      <Campo etiqueta="Tu nombre" valor={nombre} onChange={setNombre} requerido />
      <Campo
        etiqueta="Cómo te contactamos"
        razon="WhatsApp o correo. Solo para escribirte cuando tu ayuda haga falta."
        valor={contacto}
        onChange={setContacto}
        requerido
      />
      <Campo
        etiqueta="De dónde venís (opcional)"
        razon="Ciudad o país. Nos ayuda a saber si tu ayuda es presencial o a distancia."
        valor={procedencia}
        onChange={setProcedencia}
      />
      <Campo
        etiqueta="¿Por qué querés ayudar? (opcional)"
        valor={motivo}
        onChange={setMotivo}
        multilinea
      />

      {/* ⚠️ TEXTO PROVISORIO — [PENDIENTE revisión legal real] (§10 del spec, silla Legal vacía). */}
      <Consentimiento
        texto="Autorizo el uso de mis datos para coordinar mi ayuda"
        detalle="Guardamos tu nombre y tu contacto, y los usamos solo para escribirte cuando haga falta lo que ofrecés. Podés pedir que los borremos cuando quieras."
        marcado={habeasData}
        onChange={setHabeasData}
      />

      {error && (
        <Typography role="alert" sx={{ fontFamily: qeFont.ui, fontSize: 14, color: t.accent, mb: 2 }}>
          {error}
        </Typography>
      )}

      <Box sx={{ mt: 2 }}>
        <BotonPrincipal disabled={!valido || enviando} onClick={enviar}>
          {enviando ? 'Guardando…' : 'Enlistar mis capacidades'}
        </BotonPrincipal>
      </Box>
      <Box sx={{ mt: 1.5 }}>
        <BotonSecundario onClick={() => navegar('/renacer/ayudar')}>Volver</BotonSecundario>
      </Box>
    </RenacerLayout>
  );
}
