/**
 * Provider / Client workbench canvas (PR2).
 *
 * A net-new, small live form bound directly to the shared draft
 * (`useWorkbenchDraft`): every field reads `draft[key]` and writes through
 * `patchDraft`, so the conversation and the canvas stay in lock-step. This is
 * where the card-flash highlight lands — the fields are net-new (no shared
 * standalone component to disturb), so `recentlyFilledKeys` flashes the field
 * that a guided turn just filled.
 *
 * It does NOT commit. The committable, server-hardened action comes from the
 * conversation envelope; `WorkbenchCommitBar` renders the CommitReviewCard.
 *
 * Field keys mirror PROVIDER_KEYS / CLIENT_KEYS in flowSchemas.ts so the server
 * whitelist + `executeAction` (`provider.create` / `client.create`) consume them
 * unchanged.
 */
import { Box, keyframes } from "@mui/material";
import { fontFamilies, getFoto } from "../../../../../design-system";
import { PROVIDER_TIPOS, CLIENT_TIPOS } from "../../../../../data/vocabularies";
import { FieldLabel } from "../../components/FieldLabel";
import { SegmentedControl } from "../../components/SegmentedControl";
import { properName, streetAddress, noSpellCheck } from "../../utils/fieldLang";
import { useWorkbenchDraft } from "../WorkbenchDraftContext";

type DocTipo = "Cédula" | "NIT";

const TIPO_PROVIDER_OPTIONS = PROVIDER_TIPOS.map((t) => ({
  value: t as string,
  label: t.charAt(0).toUpperCase() + t.slice(1),
}));
const TIPO_CLIENT_OPTIONS = CLIENT_TIPOS.map((t) => ({
  value: t as string,
  label: t === "embajador" ? "Embajador" : "Cliente final",
}));

export function ProviderClientCanvas() {
  const foto = getFoto("light");
  const { flow, draft, recentlyFilledKeys, patchDraft } = useWorkbenchDraft();
  const isProvider = flow === "provider";

  const str = (k: string) => {
    const v = draft[k];
    return typeof v === "string" ? v : v == null ? "" : String(v);
  };
  const set = (k: string, v: unknown) => patchDraft({ [k]: v }, "human");
  const flashed = (k: string) => recentlyFilledKeys.includes(k);

  const nameKey = isProvider ? "nombreORazonSocial" : "nombre";
  const docTipo: DocTipo = str("tipoDocumento").toLowerCase().includes("nit")
    ? "NIT"
    : "Cédula";

  return (
    <Box
      sx={{
        padding: { xs: "20px 16px 28px", md: "28px 32px 36px" },
        display: "flex",
        flexDirection: "column",
        gap: "26px",
        maxWidth: 720,
      }}
    >
      {/* Live contact ficha preview */}
      <ContactFicha
        foto={foto}
        name={str(nameKey)}
        tipo={str("tipo")}
        isProvider={isProvider}
        doc={str("documento")}
        docTipo={docTipo}
        email={str("email")}
        telefono={str("telefono")}
        direccion={str("direccion")}
      />

      <Box sx={{ display: "flex", flexDirection: "column", gap: "18px" }}>
        <Field
          foto={foto}
          label={isProvider ? "Razón social o nombre ·" : "Nombre completo ·"}
          flash={flashed(nameKey)}
        >
          <Box
            component="input"
            value={str(nameKey)}
            {...properName}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
              set(nameKey, e.target.value)
            }
            placeholder={
              isProvider ? "Esmeraldas del Quindío S.A.S." : "Ana María Pérez"
            }
            sx={inputSx(foto)}
          />
        </Field>

        <Field
          foto={foto}
          label={isProvider ? "Tipo de proveedor" : "Tipo"}
          flash={flashed("tipo")}
        >
          <SegmentedControl<string>
            ariaLabel={isProvider ? "Tipo de proveedor" : "Tipo de cliente"}
            block
            options={isProvider ? TIPO_PROVIDER_OPTIONS : TIPO_CLIENT_OPTIONS}
            value={str("tipo") || (isProvider ? "gemas" : "final")}
            onChange={(v) => set("tipo", v)}
          />
        </Field>

        <Field
          foto={foto}
          label="Documento"
          flash={flashed("documento") || flashed("tipoDocumento")}
        >
          <Box sx={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            <SegmentedControl<DocTipo>
              ariaLabel="Tipo de documento"
              block
              options={[
                { value: "Cédula", label: "Cédula" },
                { value: "NIT", label: "NIT" },
              ]}
              value={docTipo}
              onChange={(v) => set("tipoDocumento", v)}
            />
            <Box
              component="input"
              value={str("documento")}
              {...noSpellCheck}
              inputMode="numeric"
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                set("documento", e.target.value)
              }
              placeholder={
                docTipo === "NIT" ? "900.123.456-7" : "1.020.345.678"
              }
              sx={{
                ...inputSx(foto),
                fontFamily: fontFamilies.mono,
                fontVariantNumeric: "tabular-nums",
              }}
            />
          </Box>
        </Field>

        <Field
          foto={foto}
          label={isProvider ? "Dirección" : "Dirección ·"}
          flash={flashed("direccion")}
        >
          <Box
            component="input"
            value={str("direccion")}
            {...streetAddress}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
              set("direccion", e.target.value)
            }
            placeholder="Calle 73 #11-22, Bogotá D.C."
            sx={inputSx(foto)}
          />
        </Field>

        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" },
            gap: "18px",
          }}
        >
          <Field foto={foto} label="Teléfono" flash={flashed("telefono")}>
            <Box
              component="input"
              value={str("telefono")}
              {...noSpellCheck}
              inputMode="tel"
              autoComplete="tel"
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                set("telefono", e.target.value)
              }
              placeholder="+57 311 555 8801"
              sx={{
                ...inputSx(foto),
                fontFamily: fontFamilies.mono,
                fontVariantNumeric: "tabular-nums",
              }}
            />
          </Field>
          <Field foto={foto} label="Email" flash={flashed("email")}>
            <Box
              component="input"
              type="email"
              value={str("email")}
              {...noSpellCheck}
              autoComplete="email"
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                set("email", e.target.value)
              }
              placeholder="ana@correo.com"
              sx={inputSx(foto)}
            />
          </Field>
        </Box>

        {isProvider && (
          <Field foto={foto} label="Notas" flash={flashed("notas")}>
            <Box
              component="textarea"
              value={str("notas")}
              {...noSpellCheck}
              rows={2}
              onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                set("notas", e.target.value)
              }
              placeholder="Condiciones, referidos, observaciones…"
              sx={{ ...inputSx(foto), resize: "vertical", minHeight: 56 }}
            />
          </Field>
        )}
      </Box>
    </Box>
  );
}

// ─── Field wrapper with the anti-blink card-flash highlight ────────────────

const flashKeyframe = (glow: string, soft: string) => keyframes`
  0%   { box-shadow: 0 0 0 0 ${glow}; background: ${soft}; }
  70%  { box-shadow: 0 0 0 3px ${glow}; background: ${soft}; }
  100% { box-shadow: 0 0 0 0 transparent; background: transparent; }
`;

function Field({
  foto,
  label,
  flash,
  children,
}: {
  foto: ReturnType<typeof getFoto>;
  label: string;
  flash: boolean;
  children: React.ReactNode;
}) {
  return (
    <Box
      sx={{
        position: "relative",
        borderRadius: "11px",
        padding: "4px",
        margin: "-4px",
        // Decoration only — value text always swaps instantly; only the
        // box-shadow/background pulse, and it is disabled under reduced motion.
        ...(flash
          ? {
              "@media (prefers-reduced-motion: no-preference)": {
                animation: `${flashKeyframe(foto.accent.glow, foto.accent.soft)} 1.2s ease`,
              },
              "@media (prefers-reduced-motion: reduce)": {
                boxShadow: `0 0 0 2px ${foto.accent.glow}`,
                background: foto.accent.soft,
              },
            }
          : {}),
      }}
    >
      <FieldLabel>{label}</FieldLabel>
      {children}
    </Box>
  );
}

function ContactFicha({
  foto,
  name,
  tipo,
  isProvider,
  doc,
  docTipo,
  email,
  telefono,
  direccion,
}: {
  foto: ReturnType<typeof getFoto>;
  name: string;
  tipo: string;
  isProvider: boolean;
  doc: string;
  docTipo: DocTipo;
  email: string;
  telefono: string;
  direccion: string;
}) {
  const initial = (name.trim()[0] ?? (isProvider ? "P" : "C")).toUpperCase();
  const meta = [
    doc ? `${docTipo === "NIT" ? "NIT" : "CC"} ${doc}` : null,
    email || null,
    telefono || null,
  ]
    .filter(Boolean)
    .join(" · ");
  const tipoLabel = tipo
    ? tipo.charAt(0).toUpperCase() + tipo.slice(1)
    : isProvider
      ? "Proveedor"
      : "Cliente";

  return (
    <Box
      sx={{
        // Persistent preview shell (anti-reflow): the card is always mounted at
        // a stable height; its inner rows fill in place as slots arrive.
        minHeight: 96,
        display: "flex",
        alignItems: "center",
        gap: "16px",
        padding: "16px 18px",
        border: `1px solid ${foto.surfaces.rule}`,
        borderRadius: "14px",
        background: foto.surfaces.panel,
      }}
    >
      <Box
        aria-hidden
        sx={{
          width: 46,
          height: 46,
          borderRadius: "50%",
          flexShrink: 0,
          background: foto.accent.primary,
          color: foto.ink.inverse,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: fontFamilies.brand,
          fontSize: 20,
          fontWeight: 600,
        }}
      >
        {initial}
      </Box>
      <Box sx={{ minWidth: 0, flex: 1 }}>
        <Box
          sx={{
            fontSize: "9px",
            letterSpacing: "0.18em",
            textTransform: "uppercase",
            color: foto.ink.tertiary,
            marginBottom: "3px",
          }}
        >
          {isProvider ? "Proveedor" : "Cliente"} · {tipoLabel}
        </Box>
        <Box
          sx={{
            fontFamily: fontFamilies.brand,
            fontSize: "19px",
            fontWeight: 600,
            letterSpacing: "-0.015em",
            color: name ? foto.ink.primary : foto.ink.mute,
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
        >
          {name || (isProvider ? "Nuevo proveedor" : "Nuevo cliente")}
        </Box>
        <Box
          sx={{
            fontSize: "12px",
            color: foto.ink.tertiary,
            marginTop: "2px",
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
        >
          {meta || direccion || "—"}
        </Box>
      </Box>
    </Box>
  );
}

function inputSx(foto: ReturnType<typeof getFoto>) {
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
  } as const;
}
