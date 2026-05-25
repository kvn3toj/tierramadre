/**
 * Cliente final form — used inside `VentaPage` when `compradorTipo === "final"`.
 *
 * Mirrors the ProveedorNuevoDrawer pattern: inline duplicate detection as
 * the user types `nombre` / `documento`, with two CTAs ("Usar ese cliente" /
 * "Crear uno nuevo") when an existing tipo=final client matches. On submit
 * calls `clients.create({ tipo: "final", ... })` and hands the new
 * Id<"clients"> back to the parent via `onCreated`.
 *
 * Layout note: this component renders inline (no Dialog) — it replaces the
 * embajador picker block in the Comprador section.
 */

import {
  useCallback,
  useDeferredValue,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Box } from "@mui/material";
import { alpha } from "@mui/material/styles";
import { AlertTriangle, Check, CheckCircle2 } from "lucide-react";
import { getFoto, fontFamilies } from "../../../../design-system";
import { useConvexMutation, convexApi } from "../../../../lib/convex-safe";
import { verifyNit } from "../../../../utils/nitVerify";
import { FieldLabel } from "./FieldLabel";
import { properName, streetAddress, noSpellCheck } from "../utils/fieldLang";
import { SegmentedControl } from "./SegmentedControl";
import { EntityPicker } from "./EntityPicker";
import type { Id } from "../../../../../convex/_generated/dataModel";

type TipoDoc = "NIT" | "Cédula";

/** Shape returned by `clients.list` — kept loose so we don't re-derive the
 *  full Convex Doc<"clients"> type for the few fields we need here. */
export interface ClienteRow {
  _id: Id<"clients">;
  nombre: string;
  nit?: string;
  cedula?: string;
  direccion?: string;
  telefono?: string;
  email?: string;
  tipo: "embajador" | "final";
}

interface ClienteFinalFormProps {
  /** All clients from the cached query — filtered for tipo=final here. */
  allClients: readonly ClienteRow[];
  /** Currently selected client (so we can render a compact summary card
   *  instead of the form once the operator has chosen one). */
  selectedClient: ClienteRow | null;
  /** Fired when a new client is created OR an existing dup is reused. */
  onCreated: (clientId: Id<"clients">) => void;
  /** Fired when the operator clicks "Cambiar cliente" on the summary card. */
  onChange: () => void;
}

function normalizeDocDigits(s: string | undefined | null): string {
  return (s ?? "").replace(/[^0-9]/g, "");
}

function formatColombianPhone(raw: string): string {
  let digits = (raw ?? "").replace(/[^0-9]/g, "");
  // Drop a leading +57 country code if present so it isn't counted as part of
  // the national number. Colombian national numbers never start with "57"
  // (mobiles start with "3", landlines with "60"), so this is safe to strip
  // unconditionally — including during incremental typing, where the controlled
  // input re-feeds its own "+57 ..." formatted value back into this function.
  if (digits.startsWith("57")) {
    digits = digits.slice(2);
  }
  if (digits.length === 0) return "";
  const parts: string[] = ["+57"];
  if (digits.length > 0) parts.push(digits.slice(0, 3));
  if (digits.length > 3) parts.push(digits.slice(3, 6));
  if (digits.length > 6) parts.push(digits.slice(6, 10));
  return parts.join(" ");
}

export function ClienteFinalForm({
  allClients,
  selectedClient,
  onCreated,
  onChange,
}: ClienteFinalFormProps) {
  const foto = getFoto("light");

  // ── State ────────────────────────────────────────────────────────────
  // Mode toggles the inline UI between the searchable picker (default) and
  // the full creation form. The form is only shown after the operator clicks
  // "+ Crear «typed»" inside the picker, or "Crear cliente nuevo" from the
  // empty-picker fallback button.
  const [mode, setMode] = useState<"picker" | "creating">("picker");
  const [nombre, setNombre] = useState("");
  const [tipoDoc, setTipoDoc] = useState<TipoDoc>("Cédula");
  const [documento, setDocumento] = useState("");
  const [direccion, setDireccion] = useState("");
  const [telefono, setTelefono] = useState("");
  const [email, setEmail] = useState("");
  const [dupDismissed, setDupDismissed] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const nombreRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (selectedClient || mode !== "creating") return;
    const t = window.setTimeout(() => nombreRef.current?.focus(), 40);
    return () => window.clearTimeout(t);
  }, [selectedClient, mode]);

  // When the parent clears the selection (operator clicked "Cambiar"),
  // return to picker mode and discard any half-typed creation form so the
  // next session starts at the directory, not at a stale form.
  useEffect(() => {
    if (selectedClient) return;
    setMode("picker");
    setNombre("");
    setDocumento("");
    setDireccion("");
    setTelefono("");
    setEmail("");
    setDupDismissed(false);
    setSubmitError(null);
  }, [selectedClient]);

  // ── Convex wiring ────────────────────────────────────────────────────
  const createClient = useConvexMutation(convexApi.clients.create);

  // ── NIT inline validation ────────────────────────────────────────────
  const nitResult = useMemo(() => {
    if (tipoDoc !== "NIT") return null;
    const digits = normalizeDocDigits(documento);
    if (digits.length < 9) return null;
    return verifyNit(documento);
  }, [documento, tipoDoc]);

  // ── Duplicate detection (only against tipo=final) ───────────────────
  const finalClients = useMemo(
    () => allClients.filter((c) => c.tipo === "final"),
    [allClients],
  );
  const deferredNombre = useDeferredValue(nombre);
  const deferredDoc = useDeferredValue(documento);
  const duplicate = useMemo<ClienteRow | null>(() => {
    if (dupDismissed) return null;
    const nameNorm = deferredNombre.trim().toLowerCase();
    const docNorm = normalizeDocDigits(deferredDoc);
    if (nameNorm.length < 3 && docNorm.length < 6) return null;
    for (const row of finalClients) {
      const rowName = row.nombre.trim().toLowerCase();
      const rowNit = normalizeDocDigits(row.nit);
      const rowCedula = normalizeDocDigits(row.cedula);
      const nameMatch = nameNorm.length >= 3 && rowName === nameNorm;
      const docMatch =
        docNorm.length >= 6 && (rowNit === docNorm || rowCedula === docNorm);
      if (nameMatch || docMatch) return row;
    }
    return null;
  }, [finalClients, deferredNombre, deferredDoc, dupDismissed]);

  // ── Submit ───────────────────────────────────────────────────────────
  const missingFields = useMemo(() => {
    const missing: string[] = [];
    if (nombre.trim().length < 3) missing.push("nombre");
    if (documento.trim().length < 4) missing.push(tipoDoc.toLowerCase());
    if (direccion.trim().length === 0) missing.push("dirección");
    return missing;
  }, [nombre, documento, direccion, tipoDoc]);
  const canSubmit = !submitting && missingFields.length === 0;

  const handleSubmit = useCallback(async () => {
    if (!canSubmit) return;
    setSubmitting(true);
    setSubmitError(null);
    try {
      const payload: {
        tipo: "final";
        nombre: string;
        nit?: string;
        cedula?: string;
        direccion?: string;
        telefono?: string;
        email?: string;
      } = {
        tipo: "final",
        nombre: nombre.trim(),
        direccion: direccion.trim() || undefined,
      };
      const docTrim = documento.trim();
      if (docTrim.length > 0) {
        if (tipoDoc === "NIT") payload.nit = docTrim;
        else payload.cedula = docTrim;
      }
      if (telefono.trim().length > 0) payload.telefono = telefono.trim();
      if (email.trim().length > 0) payload.email = email.trim();

      const result = (await createClient(payload)) as { id: Id<"clients"> };
      onCreated(result.id);
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : "No se pudo crear el cliente.";
      setSubmitError(msg);
      setSubmitting(false);
    }
  }, [
    canSubmit,
    createClient,
    direccion,
    documento,
    email,
    nombre,
    onCreated,
    telefono,
    tipoDoc,
  ]);

  const handleUseDuplicate = useCallback(() => {
    if (duplicate) onCreated(duplicate._id);
  }, [duplicate, onCreated]);

  // ── Selected client summary (read-only card) ─────────────────────────
  if (selectedClient) {
    const idLabel = selectedClient.nit ?? selectedClient.cedula;
    return (
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          gap: "14px",
          padding: "14px 16px",
          border: `1px solid ${foto.accent.glow}`,
          borderRadius: "11px",
          background: foto.accent.soft,
        }}
      >
        <Box
          aria-hidden
          sx={{
            width: 38,
            height: 38,
            borderRadius: "50%",
            background: foto.accent.primary,
            color: "#fff",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontFamily: fontFamilies.serif,
            fontSize: 16,
            fontWeight: 500,
            flexShrink: 0,
          }}
        >
          {selectedClient.nombre.slice(0, 1).toUpperCase()}
        </Box>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Box
            sx={{
              fontSize: 14,
              fontWeight: 600,
              color: foto.ink.primary,
              letterSpacing: "-0.012em",
            }}
          >
            {selectedClient.nombre}
          </Box>
          <Box
            sx={{
              fontSize: 11.5,
              color: foto.ink.tertiary,
              marginTop: "2px",
            }}
          >
            {[idLabel, selectedClient.email, selectedClient.telefono]
              .filter(Boolean)
              .join(" · ") || "Cliente final"}
          </Box>
        </Box>
        <Box
          component="button"
          type="button"
          onClick={onChange}
          sx={{
            fontSize: 11.5,
            fontWeight: 600,
            color: foto.accent.deep,
            background: "transparent",
            border: `1px solid ${foto.accent.glow}`,
            borderRadius: "7px",
            padding: "6px 12px",
            cursor: "pointer",
            fontFamily: "inherit",
          }}
        >
          Cambiar
        </Box>
      </Box>
    );
  }

  // ── Picker (default when nothing is selected and we're not creating) ──
  if (mode === "picker") {
    return (
      <Box sx={{ display: "flex", flexDirection: "column", gap: "10px" }}>
        <EntityPicker<ClienteRow>
          label="Cliente final"
          placeholder="Buscar por nombre o documento…"
          options={finalClients}
          value={null}
          onChange={(next) => {
            if (next) onCreated(next._id);
          }}
          getOptionId={(c) => c._id as string}
          getOptionLabel={(c) => c.nombre}
          getOptionMeta={(c) =>
            [
              c.nit ? `NIT ${c.nit}` : c.cedula ? `CC ${c.cedula}` : null,
              c.email ?? c.telefono ?? null,
            ]
              .filter(Boolean)
              .join(" · ") || null
          }
          getOptionAvatar={(c) => c.nombre.slice(0, 1).toUpperCase()}
          onCreateRequest={(typed) => {
            setNombre(typed);
            setMode("creating");
          }}
          createLabel={(t) => `Crear «${t}» como nuevo cliente`}
        />
        {finalClients.length === 0 ? (
          <Box
            sx={{
              fontSize: 11.5,
              color: foto.ink.tertiary,
              lineHeight: 1.5,
              padding: "0 2px",
            }}
          >
            Todavía no hay clientes finales registrados.{" "}
            <Box
              component="button"
              type="button"
              onClick={() => setMode("creating")}
              sx={{
                background: "transparent",
                border: "none",
                color: foto.accent.deep,
                fontWeight: 600,
                fontSize: "inherit",
                cursor: "pointer",
                textDecoration: "underline",
                padding: 0,
                fontFamily: "inherit",
              }}
            >
              Crear el primero
            </Box>
            .
          </Box>
        ) : null}
      </Box>
    );
  }

  // ── Form ──────────────────────────────────────────────────────────────
  return (
    <Box
      sx={{
        padding: "18px 18px 20px",
        border: `1px solid ${foto.surfaces.rule}`,
        borderRadius: "11px",
        background: foto.surfaces.panel,
        display: "flex",
        flexDirection: "column",
        gap: "16px",
      }}
    >
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "baseline",
          gap: "12px",
        }}
      >
        <Box
          sx={{
            fontSize: 9,
            fontWeight: 500,
            letterSpacing: "0.18em",
            textTransform: "uppercase",
            color: foto.ink.tertiary,
          }}
        >
          Crear cliente final
        </Box>
        <Box
          component="button"
          type="button"
          onClick={() => {
            setMode("picker");
            setNombre("");
            setDocumento("");
            setDireccion("");
            setTelefono("");
            setEmail("");
            setDupDismissed(false);
            setSubmitError(null);
          }}
          sx={{
            background: "transparent",
            border: "none",
            color: foto.accent.deep,
            fontSize: 11.5,
            fontWeight: 600,
            cursor: "pointer",
            padding: 0,
            fontFamily: "inherit",
          }}
        >
          ← Volver a buscar
        </Box>
      </Box>
      <Box
        sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px" }}
      >
        <Box sx={{ gridColumn: "1 / -1" }}>
          <FieldLabel>Nombre completo ·</FieldLabel>
          <Box
            ref={nombreRef}
            component="input"
            value={nombre}
            {...properName}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
              setNombre(e.target.value)
            }
            placeholder="Ana María Pérez"
            sx={inputBaseSx(foto)}
          />
        </Box>

        <Box sx={{ gridColumn: "1 / -1" }}>
          <FieldLabel>Tipo de documento</FieldLabel>
          <SegmentedControl<TipoDoc>
            ariaLabel="Tipo de documento"
            block
            options={[
              { value: "Cédula", label: "Cédula" },
              { value: "NIT", label: "NIT" },
            ]}
            value={tipoDoc}
            onChange={setTipoDoc}
          />
        </Box>

        <Box sx={{ gridColumn: "1 / -1" }}>
          <FieldLabel>{tipoDoc === "NIT" ? "NIT ·" : "Cédula ·"}</FieldLabel>
          <Box
            sx={{
              display: "flex",
              alignItems: "stretch",
              border: `1px solid ${foto.surfaces.rule}`,
              borderRadius: "9px",
              background: foto.surfaces.canvas,
              overflow: "hidden",
              "&:focus-within": {
                borderColor: foto.accent.primary,
                boxShadow: `0 0 0 3px ${foto.accent.glow}`,
              },
            }}
          >
            <Box
              component="input"
              value={documento}
              {...noSpellCheck}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                setDocumento(e.target.value)
              }
              placeholder={
                tipoDoc === "NIT" ? "900.123.456-7" : "1.020.345.678"
              }
              inputMode="numeric"
              sx={{
                flex: 1,
                minWidth: 0,
                border: "none",
                outline: "none",
                padding: "11px 13px",
                fontFamily: fontFamilies.mono,
                fontVariantNumeric: "tabular-nums",
                fontSize: "13.5px",
                color: foto.ink.primary,
                background: "transparent",
              }}
            />
            {nitResult?.valid ? (
              <Box
                sx={{
                  padding: "11px 14px",
                  background: foto.accent.soft,
                  color: foto.accent.deep,
                  fontSize: "11px",
                  fontWeight: 600,
                  borderLeft: `1px solid ${foto.accent.glow}`,
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "6px",
                  whiteSpace: "nowrap",
                }}
              >
                <Check size={12} strokeWidth={2.5} />
                NIT válido
              </Box>
            ) : null}
          </Box>
          {tipoDoc === "NIT" &&
          nitResult &&
          !nitResult.valid &&
          nitResult.suggested ? (
            <Box
              sx={{
                fontSize: "11.5px",
                color: foto.status.consigned,
                marginTop: "4px",
                lineHeight: 1.5,
              }}
            >
              DV no coincide · sugerencia{" "}
              <Box
                component="span"
                sx={{ fontFamily: fontFamilies.mono, fontWeight: 600 }}
              >
                {nitResult.suggested}
              </Box>
            </Box>
          ) : null}
        </Box>

        <Box sx={{ gridColumn: "1 / -1" }}>
          <FieldLabel>Dirección ·</FieldLabel>
          <Box
            component="input"
            value={direccion}
            {...streetAddress}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
              setDireccion(e.target.value)
            }
            placeholder="Calle 73 #11-22, Bogotá D.C."
            sx={inputBaseSx(foto)}
          />
        </Box>

        <Box>
          <FieldLabel>Teléfono</FieldLabel>
          <Box
            component="input"
            value={telefono}
            {...noSpellCheck}
            autoComplete="tel"
            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
              setTelefono(formatColombianPhone(e.target.value))
            }
            placeholder="+57 311 555 8801"
            inputMode="tel"
            sx={{
              ...inputBaseSx(foto),
              fontFamily: fontFamilies.mono,
              fontVariantNumeric: "tabular-nums",
            }}
          />
        </Box>
        <Box>
          <FieldLabel>Email</FieldLabel>
          <Box
            component="input"
            type="email"
            value={email}
            {...noSpellCheck}
            autoComplete="email"
            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
              setEmail(e.target.value)
            }
            placeholder="ana@correo.com"
            sx={inputBaseSx(foto)}
          />
        </Box>
      </Box>

      {duplicate ? (
        <Box
          role="alert"
          sx={{
            background: alpha(foto.status.consigned, 0.1),
            border: `1px solid ${alpha(foto.status.consigned, 0.25)}`,
            borderRadius: "10px",
            padding: "13px 14px",
            display: "grid",
            gridTemplateColumns: "auto 1fr",
            gap: "11px",
            alignItems: "start",
          }}
        >
          <Box
            sx={{
              width: 26,
              height: 26,
              borderRadius: "50%",
              background: foto.status.consigned,
              color: "#fff",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            <AlertTriangle size={14} strokeWidth={2.2} />
          </Box>
          <Box sx={{ fontSize: "11.5px", color: "#7a5a1a", lineHeight: 1.5 }}>
            <Box component="strong" sx={{ color: "#5a4014" }}>
              Atención · ya existe un cliente parecido
            </Box>
            <Box sx={{ marginTop: "3px" }}>
              Encontramos{" "}
              <Box component="strong" sx={{ color: "#5a4014" }}>
                “{duplicate.nombre}”
              </Box>{" "}
              en tu directorio. ¿Es el mismo?
            </Box>
            <Box sx={{ display: "flex", gap: "6px", marginTop: "8px" }}>
              <Box
                component="button"
                type="button"
                onClick={handleUseDuplicate}
                sx={dupButtonSx(foto, true)}
              >
                Usar ese cliente
              </Box>
              <Box
                component="button"
                type="button"
                onClick={() => setDupDismissed(true)}
                sx={dupButtonSx(foto, false)}
              >
                Crear uno nuevo
              </Box>
            </Box>
          </Box>
        </Box>
      ) : null}

      {submitError ? (
        <Box
          role="alert"
          sx={{
            background: alpha(foto.status.sold, 0.07),
            border: `1px solid ${alpha(foto.status.sold, 0.3)}`,
            borderRadius: "10px",
            padding: "11px 13px",
            fontSize: "12px",
            color: foto.status.sold,
          }}
        >
          {submitError}
        </Box>
      ) : null}

      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "flex-end",
          gap: "14px",
        }}
      >
        {missingFields.length > 0 ? (
          <Box
            id="cliente-final-missing"
            sx={{
              fontSize: 11.5,
              color: foto.ink.tertiary,
              lineHeight: 1.4,
            }}
          >
            Falta: {missingFields.join(", ")}.
          </Box>
        ) : null}
        <Box
          component="button"
          type="button"
          onClick={() => void handleSubmit()}
          disabled={!canSubmit}
          aria-busy={submitting}
          aria-describedby={
            missingFields.length > 0 ? "cliente-final-missing" : undefined
          }
          sx={{
            display: "inline-flex",
            alignItems: "center",
            gap: "8px",
            padding: "10px 16px",
            borderRadius: "9px",
            border: "none",
            background: canSubmit
              ? `linear-gradient(180deg, ${foto.accent.primary} 0%, ${foto.accent.deep} 100%)`
              : foto.surfaces.inset,
            color: canSubmit ? foto.ink.inverse : foto.ink.mute,
            fontSize: 13,
            fontWeight: 600,
            cursor: canSubmit ? "pointer" : "not-allowed",
            fontFamily: "inherit",
          }}
        >
          {submitting ? (
            "Creando…"
          ) : (
            <>
              <CheckCircle2 size={14} strokeWidth={1.8} aria-hidden />
              Crear cliente
            </>
          )}
        </Box>
      </Box>
    </Box>
  );
}

// ─── Tiny local style helpers ──────────────────────────────────────────────

function inputBaseSx(foto: ReturnType<typeof getFoto>) {
  return {
    border: `1px solid ${foto.surfaces.rule}`,
    borderRadius: "9px",
    background: foto.surfaces.canvas,
    padding: "11px 13px",
    fontFamily: fontFamilies.system,
    fontSize: "13.5px",
    color: foto.ink.primary,
    width: "100%",
    transition: "border-color 120ms ease, box-shadow 120ms ease",
    outline: "none",
    "&:focus": {
      borderColor: foto.accent.primary,
      boxShadow: `0 0 0 3px ${foto.accent.glow}`,
    },
    "&::placeholder": { color: foto.ink.mute },
  };
}

function dupButtonSx(foto: ReturnType<typeof getFoto>, primary: boolean) {
  return {
    fontSize: "10.5px",
    padding: "5px 10px",
    borderRadius: "6px",
    background: primary ? foto.status.consigned : foto.surfaces.canvas,
    border: `1px solid ${primary ? foto.status.consigned : alpha(foto.status.consigned, 0.3)}`,
    color: primary ? "#fff" : "#7a5a1a",
    cursor: "pointer",
    fontWeight: 600,
    fontFamily: "inherit",
    "&:hover": {
      background: primary
        ? alpha(foto.status.consigned, 0.85)
        : foto.surfaces.canvas,
    },
  } as const;
}

export default ClienteFinalForm;
