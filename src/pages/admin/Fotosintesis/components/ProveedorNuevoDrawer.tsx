import {
  useCallback,
  useDeferredValue,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from 'react';
import { Box, Dialog } from '@mui/material';
import { alpha } from '@mui/material/styles';
import { AlertTriangle, Check, X as XIcon } from 'lucide-react';
import { getFoto, fontFamilies } from '../../../../design-system';
import {
  useAuthedConvexAction,
  useConvexQuery,
  convexApi,
} from '../../../../lib/convex-safe';
import { FieldLabel } from './FieldLabel';
import { KbdKey } from './KbdKey';
import {
  spanishText,
  properName,
  streetAddress,
  noSpellCheck,
} from '../utils/fieldLang';
import { SegmentedControl } from './SegmentedControl';
import { verifyNit } from '../../../../utils/nitVerify';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type ProveedorTipo = 'gemas' | 'joyas' | 'insumos' | 'otros';
type TipoDocumento = 'NIT' | 'Cédula' | 'Pasaporte' | 'Otro';

interface ProveedorNuevoDrawerProps {
  open: boolean;
  onClose: () => void;
  /**
   * Fired after a successful create OR after the operator picks an existing
   * provider via the duplicate-detection banner. Returns both the id and the
   * canonical name so the caller can render the selection without round-trip
   * `providers.get`.
   */
  onSuccess: (provider: { id: string; nombre: string }) => void;
  /** Optional breadcrumb shown in the header, e.g. "B-008 · sin salir de la captura". */
  contextLabel?: string;
  /**
   * Optional pre-fill for the "Nombre o razón social" field. Used when the
   * drawer is opened from EntityPicker's inline "+ Crear «typed»" row, so the
   * operator doesn't retype what they already typed in the picker.
   */
  initialName?: string;
  /**
   * Optional full pre-fill from Fotosynthia's guided "provider" flow. Seeds
   * every field on open; the human reviews + Crear. `initialName` still wins
   * for the name field when both are present.
   */
  initialData?: ProviderInitialData;
}

/** Guided-capture pre-fill for the provider drawer (Fotosynthia v2). */
export interface ProviderInitialData {
  nombreORazonSocial?: string;
  tipo?: string;
  tipoDocumento?: string;
  documento?: string;
  telefono?: string;
  email?: string;
  direccion?: string;
  notas?: string;
}

/** Map a free-text doc type from the AI draft onto the drawer's enum. */
function coerceTipoDocumento(raw: unknown): TipoDocumento {
  if (typeof raw !== 'string') return 'NIT';
  const s = raw.trim().toLowerCase();
  if (s.includes('nit')) return 'NIT';
  if (s.includes('céd') || s.includes('ced')) return 'Cédula';
  if (s.includes('pas')) return 'Pasaporte';
  if (!s) return 'NIT';
  return 'Otro';
}

// Loose shape — the canonical type lives in convex/_generated/dataModel but we
// only need a handful of fields here for dup-detection rendering.
interface ProviderRow {
  _id: string;
  nombreORazonSocial: string;
  nit?: string;
  cedula?: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const TIPO_OPTIONS: { value: ProveedorTipo; label: string }[] = [
  { value: 'gemas', label: 'Gemas' },
  { value: 'joyas', label: 'Joyas' },
  { value: 'insumos', label: 'Insumos' },
  { value: 'otros', label: 'Otros' },
];

const TIPO_DOC_OPTIONS: { value: TipoDocumento; label: string }[] = [
  { value: 'NIT', label: 'NIT' },
  { value: 'Cédula', label: 'Cédula' },
  { value: 'Pasaporte', label: 'Pasaporte' },
  { value: 'Otro', label: 'Otro' },
];

/** Strip non-digits from a NIT-ish string for cross-comparison. */
function normalizeDocDigits(s: string | undefined | null): string {
  return (s ?? '').replace(/[^0-9]/g, '');
}

/**
 * Format raw digits into the Colombian mobile-phone pattern "+57 NNN NNN NNNN".
 * Strips any +57 country prefix the user might have typed so we don't double it.
 * Returns the formatted display string.
 */
function formatColombianPhone(raw: string): string {
  let digits = (raw ?? '').replace(/[^0-9]/g, '');
  // Drop a leading +57 country code if present so it isn't counted as part of
  // the national number. Colombian national numbers never start with "57"
  // (mobiles start with "3", landlines with "60"), so this is safe to strip
  // unconditionally — including during incremental typing, where the controlled
  // input re-feeds its own "+57 ..." formatted value back into this function.
  if (digits.startsWith('57')) {
    digits = digits.slice(2);
  }
  if (digits.length === 0) return '';
  const parts: string[] = ['+57'];
  if (digits.length > 0) parts.push(digits.slice(0, 3));
  if (digits.length > 3) parts.push(digits.slice(3, 6));
  if (digits.length > 6) parts.push(digits.slice(6, 10));
  return parts.join(' ');
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function ProveedorNuevoDrawer({
  open,
  onClose,
  onSuccess,
  contextLabel,
  initialName,
  initialData,
}: ProveedorNuevoDrawerProps) {
  const foto = getFoto('light');
  const titleId = useId();

  // Form state — kept local; nothing leaks until submit.
  // `tipo` is widened to string so the operator can write a category that
  // isn't in TIPO_OPTIONS (selecting "Otros" reveals a free-text input). The
  // four known values stay the common path; persisted via providers.tipo,
  // whose Convex validator accepts free text.
  const [tipo, setTipo] = useState<string>('gemas');
  const [nombre, setNombre] = useState('');
  const [tipoDocumento, setTipoDocumento] = useState<TipoDocumento>('NIT');
  const [documento, setDocumento] = useState('');
  const [telefono, setTelefono] = useState('');
  const [email, setEmail] = useState('');
  const [direccion, setDireccion] = useState('');
  const [notas, setNotas] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [dupDismissed, setDupDismissed] = useState(false);

  const nombreInputRef = useRef<HTMLInputElement | null>(null);

  // Reset when drawer reopens so the next session starts clean. If an
  // `initialName` was passed (typically from EntityPicker's "+ Crear «typed»"
  // row), prefill the nombre field so the operator continues where they left
  // off in the picker.
  useEffect(() => {
    if (open) {
      const d = initialData ?? {};
      setTipo(typeof d.tipo === 'string' && d.tipo ? d.tipo : 'gemas');
      setNombre(initialName ?? d.nombreORazonSocial ?? '');
      setTipoDocumento(coerceTipoDocumento(d.tipoDocumento));
      setDocumento(typeof d.documento === 'string' ? d.documento : '');
      setTelefono(
        typeof d.telefono === 'string' ? formatColombianPhone(d.telefono) : '',
      );
      setEmail(typeof d.email === 'string' ? d.email : '');
      setDireccion(typeof d.direccion === 'string' ? d.direccion : '');
      setNotas(typeof d.notas === 'string' ? d.notas : '');
      setSubmitting(false);
      setSubmitError(null);
      setDupDismissed(false);
    }
  }, [open, initialName, initialData]);

  // Focus the name input after MUI's Dialog finishes its enter transition.
  useEffect(() => {
    if (!open) return;
    const timer = window.setTimeout(() => {
      nombreInputRef.current?.focus();
    }, 60);
    return () => window.clearTimeout(timer);
  }, [open]);

  // ---- Convex wiring ----------------------------------------------------
  const allProviders = useConvexQuery(convexApi.providers.list, {
    search: '',
  }) as ProviderRow[] | undefined;
  const createProvider = useAuthedConvexAction(convexApi.providers.create);

  // ---- NIT validation ---------------------------------------------------
  const nitResult = useMemo(() => {
    if (tipoDocumento !== 'NIT') return null;
    const digits = normalizeDocDigits(documento);
    if (digits.length < 9) return null;
    return verifyNit(documento);
  }, [documento, tipoDocumento]);

  // ---- Duplicate detection (debounced via useDeferredValue) -------------
  const deferredNombre = useDeferredValue(nombre);
  const deferredDoc = useDeferredValue(documento);
  const duplicate = useMemo<ProviderRow | null>(() => {
    if (!allProviders || dupDismissed) return null;
    const nameNorm = deferredNombre.trim().toLowerCase();
    const docNorm = normalizeDocDigits(deferredDoc);
    if (nameNorm.length < 3 && docNorm.length < 6) return null;
    for (const row of allProviders) {
      const rowName = row.nombreORazonSocial.trim().toLowerCase();
      const rowNit = normalizeDocDigits(row.nit);
      const rowCedula = normalizeDocDigits(row.cedula);
      const nameMatch = nameNorm.length >= 3 && rowName === nameNorm;
      const docMatch =
        docNorm.length >= 6 && (rowNit === docNorm || rowCedula === docNorm);
      if (nameMatch || docMatch) return row;
    }
    return null;
  }, [allProviders, deferredNombre, deferredDoc, dupDismissed]);

  // ---- Dirty-aware close -------------------------------------------------
  const isDirty =
    nombre.length > 0 ||
    documento.length > 0 ||
    telefono.length > 0 ||
    email.length > 0 ||
    direccion.length > 0 ||
    notas.length > 0;

  const requestClose = useCallback(() => {
    if (submitting) return;
    if (isDirty) {
      const ok = window.confirm('¿Descartar cambios?');
      if (!ok) return;
    }
    onClose();
  }, [isDirty, onClose, submitting]);

  // Esc key — Dialog already handles this via onClose, but we route through
  // the dirty-aware path. MUI's Dialog passes "escapeKeyDown" as the reason.
  const handleDialogClose = useCallback(
    (_event: object, reason: 'backdropClick' | 'escapeKeyDown') => {
      if (reason === 'backdropClick' || reason === 'escapeKeyDown') {
        requestClose();
      }
    },
    [requestClose],
  );

  // True when `tipo` holds an operator write-in rather than one of the four
  // known categories — drives the "Otros" highlight + the reveal of the input.
  const tipoIsCustom = !TIPO_OPTIONS.some((o) => o.value === tipo);

  // ---- Submission --------------------------------------------------------
  const canSubmit = nombre.trim().length > 0 && !submitting;

  const handleSubmit = useCallback(async () => {
    if (!canSubmit) return;
    setSubmitting(true);
    setSubmitError(null);
    try {
      // Map our UI fields to the convex schema (`providers.create`):
      //   - nombreORazonSocial (required)
      //   - tipo (required, lowercase enum)
      //   - nit / cedula chosen by tipoDocumento
      //   - telefono / email / direccion / notas (all optional)
      const payload: Record<string, unknown> = {
        nombreORazonSocial: nombre.trim(),
        tipo,
      };
      const docTrimmed = documento.trim();
      if (docTrimmed.length > 0) {
        if (tipoDocumento === 'NIT') payload.nit = docTrimmed;
        else if (tipoDocumento === 'Cédula') payload.cedula = docTrimmed;
        else payload.nit = docTrimmed; // Pasaporte / Otro → still goes in NIT slot
      }
      if (telefono.trim().length > 0) payload.telefono = telefono.trim();
      if (email.trim().length > 0) payload.email = email.trim();
      if (direccion.trim().length > 0) payload.direccion = direccion.trim();
      if (notas.trim().length > 0) payload.notas = notas.trim();

      const result = (await createProvider(
        // Convex's generated types are precise; we know the shape matches.
        payload as Parameters<typeof createProvider>[0],
      )) as { id: string } | string;
      const providerId =
        typeof result === 'string' ? result : (result?.id ?? '');
      onSuccess({ id: providerId, nombre: nombre.trim() });
      onClose();
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'No se pudo crear el proveedor.';
      setSubmitError(message);
      setSubmitting(false);
    }
  }, [
    canSubmit,
    createProvider,
    direccion,
    documento,
    email,
    nombre,
    notas,
    onClose,
    onSuccess,
    telefono,
    tipo,
    tipoDocumento,
  ]);

  // Keyboard: Cmd/Ctrl+Enter submits from any focus inside the drawer.
  const handleBodyKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
        e.preventDefault();
        void handleSubmit();
      }
    },
    [handleSubmit],
  );

  const handlePickDuplicate = useCallback(() => {
    if (!duplicate) return;
    onSuccess({ id: duplicate._id, nombre: duplicate.nombreORazonSocial });
    onClose();
  }, [duplicate, onSuccess, onClose]);

  // ---- Styles cache ------------------------------------------------------
  const inputBaseSx = useMemo(
    () => ({
      border: `1px solid ${foto.surfaces.rule}`,
      borderRadius: '9px',
      background: foto.surfaces.canvas,
      padding: '11px 13px',
      fontFamily: fontFamilies.system,
      fontSize: '13.5px',
      color: foto.ink.primary,
      width: '100%',
      transition: 'border-color 120ms ease, box-shadow 120ms ease',
      outline: 'none',
      '&:focus': {
        borderColor: foto.accent.primary,
        boxShadow: `0 0 0 3px ${foto.accent.glow}`,
      },
      '&::placeholder': { color: foto.ink.mute },
    }),
    [foto],
  );

  // ---- Render ------------------------------------------------------------
  return (
    <Dialog
      open={open}
      onClose={handleDialogClose}
      maxWidth={false}
      aria-labelledby={titleId}
      aria-modal
      // Anchor the paper to the right edge with no MUI padding so we own the
      // drawer chrome completely.
      slotProps={{
        backdrop: {
          sx: {
            background: 'rgba(11,16,14,0.32)',
            backdropFilter: 'saturate(80%)',
          },
        },
      }}
      PaperProps={{
        sx: {
          position: 'fixed',
          right: 0,
          top: 0,
          bottom: 0,
          margin: 0,
          width: { xs: '100vw', sm: 560 },
          maxWidth: '100vw',
          height: '100vh',
          maxHeight: '100vh',
          borderRadius: 0,
          boxShadow: '-30px 0 80px rgba(11,16,14,0.18)',
          background: foto.surfaces.canvas,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        },
      }}
    >
      {/* HEADER ---------------------------------------------------------- */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          gap: '14px',
          padding: '22px 26px 18px',
          borderBottom: `1px solid ${foto.surfaces.rule}`,
        }}
      >
        <Box sx={{ minWidth: 0 }}>
          {contextLabel ? (
            <Box
              sx={{
                fontSize: 9,
                letterSpacing: '0.2em',
                textTransform: 'uppercase',
                color: foto.ink.tertiary,
                fontWeight: 500,
              }}
            >
              {contextLabel}
            </Box>
          ) : null}
          <Box
            id={titleId}
            component="h2"
            sx={{
              fontSize: '22px',
              fontWeight: 600,
              letterSpacing: '-0.02em',
              marginTop: contextLabel ? '6px' : 0,
              color: foto.ink.primary,
              lineHeight: 1.2,
            }}
          >
            Crear proveedor
          </Box>
          <Box
            sx={{
              fontSize: '12.5px',
              color: foto.ink.secondary,
              marginTop: '5px',
              lineHeight: 1.55,
            }}
          >
            Datos contables mínimos para que el lote tenga trazabilidad.
          </Box>
        </Box>
        <Box
          component="button"
          type="button"
          onClick={requestClose}
          aria-label="Cerrar"
          sx={{
            width: 32,
            height: 32,
            minWidth: 44,
            minHeight: 44,
            borderRadius: '8px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: foto.ink.tertiary,
            cursor: 'pointer',
            border: `1px solid ${foto.surfaces.edge}`,
            background: foto.surfaces.canvas,
            flexShrink: 0,
            transition: 'background 120ms ease, color 120ms ease',
            '&:hover': {
              background: foto.surfaces.inset,
              color: foto.ink.primary,
            },
          }}
        >
          <XIcon size={14} strokeWidth={2} />
        </Box>
      </Box>

      {/* BODY ------------------------------------------------------------ */}
      <Box
        onKeyDown={handleBodyKeyDown}
        sx={{
          flex: 1,
          overflowY: 'auto',
          padding: '24px 26px',
        }}
      >
        {/* GROUP — Tipo */}
        <FormGroup label="Tipo de proveedor">
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: {
                xs: 'repeat(2, 1fr)',
                sm: 'repeat(4, 1fr)',
              },
              gap: '8px',
            }}
          >
            {TIPO_OPTIONS.map((opt) => {
              // "Otros" stays highlighted while a custom value is being typed.
              const active =
                opt.value === tipo || (opt.value === 'otros' && tipoIsCustom);
              return (
                <Box
                  key={opt.value}
                  component="button"
                  type="button"
                  onClick={() => setTipo(opt.value)}
                  aria-pressed={active}
                  sx={{
                    padding: '10px 12px',
                    borderRadius: '9px',
                    border: `1px solid ${active ? foto.accent.primary : foto.surfaces.rule}`,
                    background: active
                      ? foto.accent.soft
                      : foto.surfaces.canvas,
                    color: active ? foto.accent.deep : foto.ink.secondary,
                    fontSize: '12.5px',
                    fontWeight: active ? 600 : 500,
                    textAlign: 'center',
                    cursor: 'pointer',
                    transition:
                      'border-color 120ms ease, background-color 120ms ease, color 120ms ease',
                    '&:hover': {
                      borderColor: active
                        ? foto.accent.primary
                        : foto.surfaces.edgeStrong,
                    },
                  }}
                >
                  {opt.label}
                </Box>
              );
            })}
          </Box>
          {tipo === 'otros' || tipoIsCustom ? (
            <Box
              component="input"
              value={tipoIsCustom ? tipo : ''}
              {...spanishText}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                const next = e.target.value;
                setTipo(next.trim().length > 0 ? next : 'otros');
              }}
              placeholder="Especificar otro tipo (opcional)…"
              aria-label="Especificar otro tipo de proveedor"
              sx={{ ...inputBaseSx, marginTop: '8px' }}
            />
          ) : null}
        </FormGroup>

        {/* GROUP — Identidad */}
        <FormGroup label="Identidad">
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' },
              gap: '14px',
            }}
          >
            <Box sx={{ gridColumn: '1 / -1' }}>
              <FieldLabel>Nombre o razón social ·</FieldLabel>
              <Box
                ref={nombreInputRef}
                component="input"
                value={nombre}
                {...properName}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setNombre(e.target.value)
                }
                placeholder="Mauro Confederados"
                sx={inputBaseSx}
              />
              <Box
                sx={{
                  fontSize: '11.5px',
                  color: foto.ink.tertiary,
                  marginTop: '4px',
                  lineHeight: 1.5,
                }}
              >
                Como va a aparecer en la factura y el Kardex.
              </Box>
            </Box>

            <Box sx={{ gridColumn: '1 / -1' }}>
              <FieldLabel>Tipo de documento</FieldLabel>
              <SegmentedControl
                ariaLabel="Tipo de documento"
                block
                options={TIPO_DOC_OPTIONS}
                value={tipoDocumento}
                onChange={(v) => setTipoDocumento(v as TipoDocumento)}
              />
            </Box>

            <Box sx={{ gridColumn: '1 / -1' }}>
              <FieldLabel>
                Documento {tipoDocumento === 'NIT' ? '·' : ''}
              </FieldLabel>
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'stretch',
                  border: `1px solid ${foto.surfaces.rule}`,
                  borderRadius: '9px',
                  background: foto.surfaces.canvas,
                  overflow: 'hidden',
                  transition: 'border-color 120ms ease, box-shadow 120ms ease',
                  '&:focus-within': {
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
                    tipoDocumento === 'NIT' ? '900.123.456-7' : 'Documento'
                  }
                  sx={{
                    flex: 1,
                    minWidth: 0,
                    border: 'none',
                    outline: 'none',
                    padding: '11px 13px',
                    fontFamily: fontFamilies.mono,
                    fontVariantNumeric: 'tabular-nums',
                    fontSize: '13.5px',
                    color: foto.ink.primary,
                    background: 'transparent',
                  }}
                />
                {nitResult?.valid ? (
                  <Box
                    sx={{
                      padding: '11px 14px',
                      background: foto.accent.soft,
                      color: foto.accent.deep,
                      fontSize: '11px',
                      fontWeight: 600,
                      borderLeft: `1px solid ${foto.accent.glow}`,
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    <Check size={12} strokeWidth={2.5} />
                    NIT válido
                  </Box>
                ) : null}
              </Box>
              {/* Helper line */}
              {tipoDocumento === 'NIT' && nitResult ? (
                nitResult.valid ? (
                  <Box
                    sx={{
                      fontSize: '11.5px',
                      color: foto.accent.deep,
                      marginTop: '4px',
                      lineHeight: 1.5,
                    }}
                  >
                    <strong>DV verificado</strong> · formato colombiano
                    detectado
                  </Box>
                ) : nitResult.suggested ? (
                  <Box
                    sx={{
                      fontSize: '11.5px',
                      color: foto.status.consigned,
                      marginTop: '4px',
                      lineHeight: 1.5,
                    }}
                  >
                    DV no coincide · sugerencia{' '}
                    <Box
                      component="span"
                      sx={{
                        fontFamily: fontFamilies.mono,
                        fontWeight: 600,
                      }}
                    >
                      {nitResult.suggested}
                    </Box>
                  </Box>
                ) : null
              ) : null}
            </Box>
          </Box>

          {/* Duplicate warning */}
          {duplicate ? (
            <Box
              role="alert"
              sx={{
                background: alpha(foto.status.consigned, 0.1),
                border: `1px solid ${alpha(foto.status.consigned, 0.25)}`,
                borderRadius: '10px',
                padding: '13px 14px',
                marginTop: '10px',
                display: 'grid',
                gridTemplateColumns: 'auto 1fr',
                gap: '11px',
                alignItems: 'start',
              }}
            >
              <Box
                sx={{
                  width: 26,
                  height: 26,
                  borderRadius: '50%',
                  background: foto.status.consigned,
                  color: '#fff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <AlertTriangle size={14} strokeWidth={2.2} />
              </Box>
              <Box
                sx={{
                  fontSize: '11.5px',
                  color: '#7a5a1a',
                  lineHeight: 1.5,
                }}
              >
                <Box component="strong" sx={{ color: '#5a4014' }}>
                  Atención · ya existe un proveedor parecido
                </Box>
                <Box sx={{ marginTop: '3px' }}>
                  Encontramos{' '}
                  <Box component="strong" sx={{ color: '#5a4014' }}>
                    “{duplicate.nombreORazonSocial}”
                  </Box>{' '}
                  en el directorio. ¿Es el mismo?
                </Box>
                <Box sx={{ display: 'flex', gap: '6px', marginTop: '8px' }}>
                  <Box
                    component="button"
                    type="button"
                    onClick={handlePickDuplicate}
                    sx={dupButtonSx(foto, true)}
                  >
                    Usar ese proveedor
                  </Box>
                  <Box
                    component="button"
                    type="button"
                    onClick={() => setDupDismissed(true)}
                    sx={dupButtonSx(foto, false)}
                  >
                    Crear nuevo de todas formas
                  </Box>
                </Box>
              </Box>
            </Box>
          ) : null}
        </FormGroup>

        {/* GROUP — Contacto */}
        <FormGroup label="Contacto" optional="opcional pero recomendado">
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' },
              gap: '14px',
            }}
          >
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
                  ...inputBaseSx,
                  fontFamily: fontFamilies.mono,
                  fontVariantNumeric: 'tabular-nums',
                }}
              />
              <Box
                sx={{
                  fontSize: '11.5px',
                  color: foto.ink.tertiary,
                  marginTop: '4px',
                  lineHeight: 1.5,
                }}
              >
                Auto-formateado a estándar colombiano.
              </Box>
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
                placeholder="contacto@dominio.co"
                sx={inputBaseSx}
              />
            </Box>
            <Box sx={{ gridColumn: '1 / -1' }}>
              <FieldLabel>Dirección</FieldLabel>
              <Box
                component="textarea"
                rows={2}
                value={direccion}
                {...streetAddress}
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                  setDireccion(e.target.value)
                }
                placeholder="Calle 73 #11-22, of. 401 · Bogotá D.C."
                sx={{
                  ...inputBaseSx,
                  resize: 'none',
                  minHeight: 60,
                  lineHeight: 1.5,
                }}
              />
            </Box>
          </Box>
        </FormGroup>

        {/* GROUP — Notas */}
        <FormGroup
          label="Notas internas"
          optional="solo visibles para el equipo"
        >
          <Box
            component="textarea"
            rows={2}
            value={notas}
            {...spanishText}
            onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
              setNotas(e.target.value)
            }
            placeholder="Particularidades del proveedor, condiciones, contactos alternos…"
            sx={{
              ...inputBaseSx,
              resize: 'none',
              minHeight: 60,
              lineHeight: 1.5,
            }}
          />
        </FormGroup>

        {/* Submit error banner */}
        {submitError ? (
          <Box
            role="alert"
            sx={{
              background: alpha(foto.status.sold, 0.07),
              border: `1px solid ${alpha(foto.status.sold, 0.3)}`,
              borderRadius: '10px',
              padding: '11px 13px',
              fontSize: '12px',
              color: foto.status.sold,
              marginTop: '12px',
              lineHeight: 1.5,
            }}
          >
            {submitError}
          </Box>
        ) : null}
      </Box>

      {/* FOOTER ---------------------------------------------------------- */}
      <Box
        sx={{
          padding: '18px 26px',
          borderTop: `1px solid ${foto.surfaces.rule}`,
          background: foto.surfaces.panel,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '12px',
        }}
      >
        <Box
          sx={{
            fontSize: '11px',
            color: foto.ink.tertiary,
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            flexWrap: 'wrap',
          }}
        >
          <KbdKey size="sm">Esc</KbdKey>
          <Box component="span">cierra</Box>
          <Box component="span" sx={{ marginLeft: '4px' }}>
            ·
          </Box>
          <KbdKey size="sm">⌘</KbdKey>
          <KbdKey size="sm">↵</KbdKey>
          <Box component="span">guarda</Box>
        </Box>
        <Box sx={{ display: 'flex', gap: '8px' }}>
          <Box
            component="button"
            type="button"
            onClick={requestClose}
            disabled={submitting}
            sx={{
              fontFamily: fontFamilies.system,
              fontSize: '12.5px',
              fontWeight: 600,
              padding: '11px 18px',
              borderRadius: '9px',
              cursor: submitting ? 'not-allowed' : 'pointer',
              background: 'transparent',
              color: foto.ink.secondary,
              border: `1px solid ${foto.surfaces.edgeStrong}`,
              transition: 'background 120ms ease, color 120ms ease',
              '&:hover': {
                background: foto.surfaces.canvas,
                color: foto.ink.primary,
              },
              opacity: submitting ? 0.6 : 1,
            }}
          >
            Cancelar
          </Box>
          <Box
            component="button"
            type="button"
            onClick={() => void handleSubmit()}
            disabled={!canSubmit}
            aria-busy={submitting}
            sx={{
              fontFamily: fontFamilies.system,
              fontSize: '12.5px',
              fontWeight: 600,
              padding: '11px 18px',
              borderRadius: '9px',
              cursor: canSubmit ? 'pointer' : 'not-allowed',
              background: foto.accent.primary,
              color: foto.ink.inverse,
              border: '1px solid transparent',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              transition: 'background 120ms ease, transform 120ms ease',
              '&:hover': canSubmit
                ? {
                    background: foto.accent.deep,
                    transform: 'translateY(-1px)',
                  }
                : undefined,
              opacity: canSubmit ? 1 : 0.55,
            }}
          >
            {submitting ? 'Creando…' : 'Crear proveedor'}
            <Box
              component="span"
              sx={{
                fontFamily: fontFamilies.mono,
                fontSize: '10px',
                opacity: 0.75,
                background: 'rgba(255,255,255,0.15)',
                padding: '1px 5px',
                borderRadius: '3px',
                marginLeft: '4px',
              }}
            >
              ⌘↵
            </Box>
          </Box>
        </Box>
      </Box>
    </Dialog>
  );
}

export default ProveedorNuevoDrawer;

// ---------------------------------------------------------------------------
// Small local primitives — kept colocated to avoid drive-by file additions
// (this PR is scoped strictly to the drawer + nitVerify pair).
// ---------------------------------------------------------------------------

function FormGroup({
  label,
  optional,
  children,
}: {
  label: string;
  optional?: string;
  children: React.ReactNode;
}) {
  const foto = getFoto('light');
  return (
    <Box sx={{ marginBottom: '24px' }}>
      <Box
        sx={{
          fontSize: 9,
          letterSpacing: '0.2em',
          textTransform: 'uppercase',
          color: foto.ink.tertiary,
          fontWeight: 500,
          marginBottom: '12px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'baseline',
        }}
      >
        <Box component="span">{label}</Box>
        {optional ? (
          <Box
            component="span"
            sx={{
              fontFamily: fontFamilies.system,
              fontSize: '10.5px',
              color: foto.ink.mute,
              textTransform: 'none',
              letterSpacing: 0,
              fontWeight: 500,
            }}
          >
            {optional}
          </Box>
        ) : null}
      </Box>
      {children}
    </Box>
  );
}

function dupButtonSx(foto: ReturnType<typeof getFoto>, primary: boolean) {
  return {
    fontSize: '10.5px',
    padding: '5px 10px',
    borderRadius: '6px',
    background: primary ? foto.status.consigned : foto.surfaces.canvas,
    border: `1px solid ${primary ? foto.status.consigned : alpha(foto.status.consigned, 0.3)}`,
    color: primary ? '#fff' : '#7a5a1a',
    cursor: 'pointer',
    fontWeight: 600,
    transition: 'background 120ms ease',
    '&:hover': {
      background: primary
        ? alpha(foto.status.consigned, 0.85)
        : foto.surfaces.canvas,
    },
  } as const;
}
