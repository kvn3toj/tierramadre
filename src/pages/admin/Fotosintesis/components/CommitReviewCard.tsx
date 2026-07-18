/**
 * CommitReviewCard — the single human-approval gate of the Fotosynthia
 * propose→commit flow.
 *
 * Renders the server-authored summary of a `direct` GuidedAction and, on the
 * operator's one "Confirmar y guardar", dispatches it through useExecuteAction
 * (which resolves refs → calls the Convex mutation → schedules the Sheets push).
 * Destructive kinds require a two-step gesture. The button is disabled in-flight
 * (double-submit guard) and a per-action clientToken makes a retry idempotent.
 * Errors surface inline with a retry; success shows a sync badge.
 */

import { useMemo, useRef, useState } from 'react';
import { Box } from '@mui/material';
import { Check, RotateCcw, ShieldAlert, Sparkles } from 'lucide-react';
import { getFoto, Badge } from '../../../../design-system';
import { getSyncStatusBadge } from '../../../../utils/syncStatus';
import {
  useExecuteAction,
  type CommitContext,
  type CommitOutcome,
  type CommitEntity,
} from '../copilot/executeAction';
import type { GuidedAction } from '../copilot/flowSchemas';

function genToken(): string {
  try {
    if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
      return crypto.randomUUID();
    }
  } catch {
    /* fall through */
  }
  return `tok-${Date.now().toString(36)}-${Math.floor(Math.random() * 1e9).toString(36)}`;
}

type Phase = 'idle' | 'arming' | 'committing' | 'done' | 'error';

export interface CommitReviewCardProps {
  action: GuidedAction;
  ctx: CommitContext;
  /** Online — the commit button is disabled offline. */
  online: boolean;
  /** Clear the envelope (called after success acknowledgement or cancel). */
  onClose: () => void;
  /** Notified once on a successful commit so the panel can log it + track sync. */
  onCommitted?: (entry: {
    kind: GuidedAction['kind'];
    summary: string;
    syncsToSheet: boolean;
    /** The committed row, when derivable — lets the log subscribe to its sync. */
    entity?: CommitEntity;
  }) => void;
}

export function CommitReviewCard({
  action,
  ctx,
  online,
  onClose,
  onCommitted,
}: CommitReviewCardProps) {
  const foto = getFoto('light');
  const execute = useExecuteAction();
  const [phase, setPhase] = useState<Phase>('idle');
  const [error, setError] = useState<string | null>(null);
  const [outcome, setOutcome] = useState<CommitOutcome | null>(null);
  const armTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // One token per logical action → a retry of the SAME proposal is idempotent.
  const clientToken = useMemo(() => genToken(), [action.kind, action.summary]);

  const busy = phase === 'committing';

  const commit = async () => {
    if (busy) return;
    if (action.twoStep && phase !== 'arming') {
      setPhase('arming');
      if (armTimer.current) clearTimeout(armTimer.current);
      armTimer.current = setTimeout(() => {
        setPhase((p) => (p === 'arming' ? 'idle' : p));
      }, 4000);
      return;
    }
    if (armTimer.current) clearTimeout(armTimer.current);
    setPhase('committing');
    setError(null);
    try {
      const result = await execute(action, ctx, clientToken);
      setOutcome(result);
      setPhase('done');
      onCommitted?.({
        kind: action.kind,
        summary: action.summary,
        syncsToSheet: action.syncsToSheet,
        entity: result.entity,
      });
    } catch (e) {
      setError(
        e instanceof Error ? e.message : 'No pude guardar. Intentá de nuevo.',
      );
      setPhase('error');
    }
  };

  const accent = action.destructive ? foto.status.sold : foto.accent.primary;

  return (
    <Box
      sx={{
        margin: '0 18px',
        border: `1px solid ${action.destructive ? foto.status.sold : foto.accent.primary}`,
        background: action.destructive ? foto.surfaces.panel : foto.accent.soft,
        borderRadius: '12px',
        padding: '12px 14px',
        display: 'flex',
        flexDirection: 'column',
        gap: '9px',
      }}
    >
      <Box
        sx={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '6px',
          fontSize: '9px',
          fontWeight: 600,
          letterSpacing: '0.14em',
          textTransform: 'uppercase',
          color: action.destructive ? foto.status.sold : foto.accent.deep,
        }}
      >
        {action.destructive ? (
          <ShieldAlert size={11} strokeWidth={2} />
        ) : (
          <Sparkles size={11} strokeWidth={2} />
        )}
        Acción · {action.destructive ? 'irreversible' : 'lista para guardar'}
      </Box>

      {/* Server-authored summary of exactly what gets written */}
      <Box
        sx={{ fontSize: '12.5px', lineHeight: 1.5, color: foto.ink.primary }}
      >
        {action.summary}
      </Box>

      {/* Names the client will resolve to real records on commit */}
      {action.needsRefs.length > 0 && phase !== 'done' && (
        <Box sx={{ fontSize: '10.5px', color: foto.ink.tertiary }}>
          Resuelvo:{' '}
          {action.needsRefs.map((r) => `${r.refKind} “${r.hint}”`).join(' · ')}
        </Box>
      )}

      {phase === 'done' ? (
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '8px',
          }}
        >
          <Box
            sx={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '12px',
              fontWeight: 600,
              color: foto.accent.deep,
            }}
          >
            <Check size={14} strokeWidth={2.4} />
            Guardado
            <Badge
              {...getSyncStatusBadge(outcome?.syncsToSheet ? 'pending' : 'na')}
              compact
            />
          </Box>
          <Box
            component="button"
            type="button"
            onClick={onClose}
            sx={pillButton(foto, false)}
          >
            Listo
          </Box>
        </Box>
      ) : (
        <>
          {phase === 'error' && error && (
            <Box
              role="alert"
              sx={{
                fontSize: '11px',
                color: foto.status.sold,
                lineHeight: 1.4,
              }}
            >
              {error}
            </Box>
          )}
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'flex-end',
              gap: '8px',
            }}
          >
            <Box
              component="button"
              type="button"
              onClick={onClose}
              disabled={busy}
              sx={pillButton(foto, false)}
            >
              Cancelar
            </Box>
            <Box
              component="button"
              type="button"
              onClick={commit}
              disabled={busy || !online}
              aria-label={action.confirmLabel}
              sx={{
                ...pillButton(foto, true, accent),
                opacity: busy || !online ? 0.6 : 1,
                cursor: busy || !online ? 'not-allowed' : 'pointer',
              }}
            >
              {busy ? (
                <Badge {...getSyncStatusBadge('pending')} compact />
              ) : phase === 'error' ? (
                <RotateCcw size={13} strokeWidth={2} />
              ) : null}
              {busy
                ? 'Guardando…'
                : phase === 'arming'
                  ? 'Tocá de nuevo para confirmar'
                  : phase === 'error'
                    ? 'Reintentar'
                    : action.confirmLabel}
            </Box>
          </Box>
        </>
      )}
    </Box>
  );
}

function pillButton(
  foto: ReturnType<typeof getFoto>,
  primary: boolean,
  accent?: string,
) {
  return {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    border: primary ? 'none' : `1px solid ${foto.surfaces.rule}`,
    borderRadius: '9px',
    padding: '8px 14px',
    background: primary ? (accent ?? foto.accent.primary) : 'transparent',
    color: primary ? foto.ink.inverse : foto.ink.secondary,
    fontSize: '12px',
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'background 120ms ease, transform 120ms ease',
    '&:hover': { transform: 'translateY(-1px)' },
    '&:disabled': { transform: 'none' },
  } as const;
}

export default CommitReviewCard;
