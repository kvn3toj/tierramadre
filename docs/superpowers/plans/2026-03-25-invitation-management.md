# Invitation Management Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Allow asesores to see the multiplier assigned to each guest invitation, edit it, and expire/revoke invitations from their profile.

**Architecture:** Two new API actions (`update`, `expire`) in `api/invitations.js` using the existing `findInvitationByCode()` + Sheets row update pattern. Hook methods in `useMyInvitations.ts` with optimistic updates. Expanded UI in `InvitationSummary.tsx` with multiplier chip + popover + expire button.

**Tech Stack:** Vercel serverless (JS), React 18 + MUI v6, Google Sheets API

**Spec:** `docs/superpowers/specs/2026-03-25-invitation-management-design.md`

---

## File Structure

| File | Action | Responsibility |
|------|--------|----------------|
| `api/invitations.js` | Modify | Add `updateInvitation()` and `expireInvitation()` functions + route handlers |
| `src/hooks/useMyInvitations.ts` | Modify | Add `updateMultiplier()`, `expireInvitation()`, `mutatingCodes` |
| `src/pages/mi-perfil/components/InvitationSummary.tsx` | Modify | Multiplier chip, edit popover, expire button, remove 5-item cap |

---

## Task 1: API — Add `updateInvitation()` function

**Files:**
- Modify: `api/invitations.js:471` (before `export default withApiHandler`)

- [ ] **Step 1: Add the `updateInvitation` function**

Insert before the `export default withApiHandler` line (~line 473):

```javascript
/**
 * Update invitation fields (POST action=update)
 * Currently supports: guestMultiplier
 */
async function updateInvitation(sheets, body) {
  const { shortCode, creatorEmail, fields } = body;

  if (!shortCode || !creatorEmail) {
    return { success: false, error: 'shortCode and creatorEmail are required' };
  }

  const invitation = await findInvitationByCode(sheets, shortCode);
  if (!invitation) {
    return { success: false, error: 'Invitación no encontrada' };
  }

  // Ownership check (case-insensitive)
  if (invitation.data.creatorEmail.toLowerCase().trim() !== creatorEmail.toLowerCase().trim()) {
    return { success: false, error: 'No tienes permiso para editar esta invitación' };
  }

  // Only active/pending can be edited
  if (invitation.data.status !== 'active' && invitation.data.status !== 'pending') {
    return { success: false, error: 'Solo se pueden editar invitaciones activas o pendientes' };
  }

  // Update multiplier if provided
  if (fields?.guestMultiplier !== undefined) {
    const safe = sanitizeMultiplier(fields.guestMultiplier);
    if (safe == null) {
      return { success: false, error: 'Multiplicador inválido' };
    }

    await sheets.spreadsheets.values.update({
      spreadsheetId: APP_SPREADSHEET_ID,
      range: `'${SHEET_NAME}'!R${invitation.rowIndex}`,
      valueInputOption: 'RAW',
      requestBody: { values: [[String(safe)]] },
    });

    return {
      success: true,
      invitation: { shortCode, guestMultiplier: safe },
    };
  }

  return { success: false, error: 'No fields to update' };
}
```

- [ ] **Step 2: Add the route handler for `update`**

Insert after the `register` handler block (after line ~497) and before the `GET - Validate` block:

```javascript
  // POST - Update invitation (multiplier, etc.)
  if (req.method === 'POST' && action === 'update') {
    const result = await updateInvitation(sheets, req.body);
    return res.status(200).json(result);
  }
```

- [ ] **Step 3: Verify no syntax errors**

Run: `npm run build 2>&1 | tail -3`
Expected: `✓ built in` with no errors

- [ ] **Step 4: Commit**

```bash
git add api/invitations.js
git commit -m "feat(invitation): add update action for guest multiplier"
```

---

## Task 2: API — Add `expireInvitation()` function

**Files:**
- Modify: `api/invitations.js` (after `updateInvitation`, before `export default`)

- [ ] **Step 1: Add the `expireInvitation` function**

Insert after `updateInvitation`:

```javascript
/**
 * Expire/revoke an invitation (POST action=expire)
 */
async function expireInvitationAction(sheets, body) {
  const { shortCode, creatorEmail } = body;

  if (!shortCode || !creatorEmail) {
    return { success: false, error: 'shortCode and creatorEmail are required' };
  }

  const invitation = await findInvitationByCode(sheets, shortCode);
  if (!invitation) {
    return { success: false, error: 'Invitación no encontrada' };
  }

  // Ownership check (case-insensitive)
  if (invitation.data.creatorEmail.toLowerCase().trim() !== creatorEmail.toLowerCase().trim()) {
    return { success: false, error: 'No tienes permiso para expirar esta invitación' };
  }

  // Already expired is a no-op success
  if (invitation.data.status === 'expired') {
    return { success: true };
  }

  // Only active/pending can be expired
  if (invitation.data.status !== 'active' && invitation.data.status !== 'pending') {
    return { success: false, error: 'Solo se pueden expirar invitaciones activas o pendientes' };
  }

  // Update expiresAt (col K) and status (col N)
  const now = new Date().toISOString();
  await sheets.spreadsheets.values.update({
    spreadsheetId: APP_SPREADSHEET_ID,
    range: `'${SHEET_NAME}'!K${invitation.rowIndex}`,
    valueInputOption: 'RAW',
    requestBody: { values: [[now]] },
  });
  await sheets.spreadsheets.values.update({
    spreadsheetId: APP_SPREADSHEET_ID,
    range: `'${SHEET_NAME}'!N${invitation.rowIndex}`,
    valueInputOption: 'RAW',
    requestBody: { values: [['expired']] },
  });

  return { success: true };
}
```

- [ ] **Step 2: Add the route handler for `expire`**

Insert right after the `update` handler:

```javascript
  // POST - Expire/revoke invitation
  if (req.method === 'POST' && action === 'expire') {
    const result = await expireInvitationAction(sheets, req.body);
    return res.status(200).json(result);
  }
```

- [ ] **Step 3: Verify build**

Run: `npm run build 2>&1 | tail -3`
Expected: `✓ built in` with no errors

- [ ] **Step 4: Commit**

```bash
git add api/invitations.js
git commit -m "feat(invitation): add expire action to revoke invitations"
```

---

## Task 3: Hook — Add mutation methods to `useMyInvitations`

**Files:**
- Modify: `src/hooks/useMyInvitations.ts`

- [ ] **Step 1: Update the return interface**

Replace `UseMyInvitationsReturn` (lines 33-38):

```typescript
interface UseMyInvitationsReturn {
  invitations: Invitation[];
  metrics: InvitationMetrics;
  isLoading: boolean;
  mutatingCodes: Set<string>;
  refresh: () => void;
  updateMultiplier: (shortCode: string, multiplier: number) => Promise<boolean>;
  expireInvitation: (shortCode: string) => Promise<boolean>;
}
```

- [ ] **Step 2: Add `mutatingCodes` state**

After `const [isLoading, setIsLoading] = useState(false);` (line 50), add:

```typescript
  const [mutatingCodes, setMutatingCodes] = useState<Set<string>>(new Set());
```

- [ ] **Step 3: Add `updateMultiplier` method**

After the `metrics` useMemo (after line 80), add:

```typescript
  const updateMultiplier = useCallback(async (shortCode: string, multiplier: number): Promise<boolean> => {
    if (!creatorEmail) return false;
    setMutatingCodes(prev => new Set(prev).add(shortCode));

    // Optimistic update
    const prevInvitations = invitations;
    setInvitations(prev => prev.map(inv =>
      inv.shortCode === shortCode ? { ...inv, guestMultiplier: multiplier } : inv
    ));

    try {
      const res = await fetch('/api/invitations?action=update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ shortCode, creatorEmail, fields: { guestMultiplier: multiplier } }),
      });
      const data = await res.json();
      if (!data.success) {
        setInvitations(prevInvitations); // Revert
        return false;
      }
      return true;
    } catch {
      setInvitations(prevInvitations); // Revert
      return false;
    } finally {
      setMutatingCodes(prev => { const next = new Set(prev); next.delete(shortCode); return next; });
    }
  }, [creatorEmail]);
```

- [ ] **Step 4: Add `expireInvitation` method**

Right after `updateMultiplier`:

```typescript
  const expireInvitation = useCallback(async (shortCode: string): Promise<boolean> => {
    if (!creatorEmail) return false;
    setMutatingCodes(prev => new Set(prev).add(shortCode));

    // Optimistic: remove from list (listByCreator only returns active/pending)
    const prevInvitations = invitations;
    setInvitations(prev => prev.filter(inv => inv.shortCode !== shortCode));

    try {
      const res = await fetch('/api/invitations?action=expire', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ shortCode, creatorEmail }),
      });
      const data = await res.json();
      if (!data.success) {
        setInvitations(prevInvitations); // Revert
        return false;
      }
      return true;
    } catch {
      setInvitations(prevInvitations); // Revert
      return false;
    } finally {
      setMutatingCodes(prev => { const next = new Set(prev); next.delete(shortCode); return next; });
    }
  }, [creatorEmail]);
```

- [ ] **Step 5: Update the return statement**

Find and replace the existing return statement `return { invitations, metrics, isLoading, refresh: fetchInvitations };` with:

```typescript
  return { invitations, metrics, isLoading, mutatingCodes, refresh: fetchInvitations, updateMultiplier, expireInvitation };
```

- [ ] **Step 6: Verify build**

Run: `npm run build 2>&1 | tail -3`
Expected: `✓ built in` with no errors

- [ ] **Step 7: Commit**

```bash
git add src/hooks/useMyInvitations.ts
git commit -m "feat(invitation): add updateMultiplier and expireInvitation to useMyInvitations"
```

---

## Task 4: UI — Update InvitationSummary with multiplier chip and actions

**Files:**
- Modify: `src/pages/mi-perfil/components/InvitationSummary.tsx`

- [ ] **Step 1: Update imports and props interface**

Replace the imports and interface (lines 1-17):

```typescript
/**
 * InvitationSummary Component
 *
 * 3 metric cards (total, active, pending) + invitation list with multiplier + actions.
 */

import { useState } from 'react';
import {
  Box, Typography, Chip, alpha, IconButton,
  Popover, Slider, Button, Dialog, DialogTitle,
  DialogContent, DialogContentText, DialogActions,
} from '@mui/material';
import { Link2, CheckCircle, Clock, XCircle, Send, Ban } from 'lucide-react';
import { emeraldCore, accentColors, iosTypographyScale, primitiveSpacing as spacing, radius, fontFamilies } from '../../../design-system';
import { useLanguage } from '../../../contexts/LanguageContext';
import type { Invitation } from '../../../hooks/useMyInvitations';

interface InvitationSummaryProps {
  invitations: Invitation[];
  metrics: { total: number; active: number; pending: number };
  isLoading: boolean;
  mutatingCodes: Set<string>;
  onUpdateMultiplier: (shortCode: string, multiplier: number) => Promise<boolean>;
  onExpire: (shortCode: string) => Promise<boolean>;
}
```

- [ ] **Step 2: Update function signature and remove slice(0, 5)**

Replace line 30 (`export function InvitationSummary...`) and update the invitations render loop:

```typescript
export function InvitationSummary({
  invitations, metrics, isLoading,
  mutatingCodes, onUpdateMultiplier, onExpire,
}: InvitationSummaryProps) {
  const { t } = useLanguage();
  const [editAnchor, setEditAnchor] = useState<HTMLElement | null>(null);
  const [editCode, setEditCode] = useState<string | null>(null);
  const [editValue, setEditValue] = useState(1);
  const [expireCode, setExpireCode] = useState<string | null>(null);
  const expireTarget = invitations.find(i => i.shortCode === expireCode);
```

- [ ] **Step 3: Add multiplier edit handlers**

After the state declarations:

```typescript
  const handleEditOpen = (event: React.MouseEvent<HTMLElement>, inv: Invitation) => {
    setEditAnchor(event.currentTarget);
    setEditCode(inv.shortCode);
    setEditValue(inv.guestMultiplier ?? 1);
  };

  const handleEditSave = async () => {
    if (!editCode) return;
    await onUpdateMultiplier(editCode, editValue);
    setEditAnchor(null);
    setEditCode(null);
  };

  const handleExpireConfirm = async () => {
    if (!expireCode) return;
    await onExpire(expireCode);
    setExpireCode(null);
  };
```

- [ ] **Step 4: Update the invitation list rendering**

Replace the `{/* Invitation List */}` block (lines 91-161). Remove `slice(0, 5)`. Add multiplier chip and actions between the status chip and date:

```tsx
      {/* Invitation List */}
      <Box sx={{ display: 'grid', gap: spacing.xxs }}>
        {invitations.map((inv) => {
          const statusConf = STATUS_CONFIG[inv.status] || STATUS_CONFIG.pending;
          const isEditable = inv.status === 'active' || inv.status === 'pending';
          const isMutating = mutatingCodes.has(inv.shortCode);

          return (
            <Box
              key={inv.invitationId}
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: spacing.sm,
                p: spacing.sm,
                borderRadius: radius.md,
                bgcolor: 'var(--surface-primary)',
                opacity: isMutating ? 0.6 : 1,
                transition: 'opacity 0.2s',
              }}
            >
              <Box
                sx={{
                  width: 28, height: 28,
                  borderRadius: radius.sm,
                  bgcolor: alpha(statusConf.color, 0.1),
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <Send size={12} style={{ color: statusConf.color }} />
              </Box>

              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Typography
                  variant="body2"
                  sx={{
                    fontSize: iosTypographyScale.footnote, fontWeight: 500,
                    color: 'var(--text-primary)',
                    whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                  }}
                >
                  {inv.guestName || inv.guestContact || inv.shortCode}
                </Typography>
              </Box>

              {/* Multiplier chip — tappable to edit */}
              <Chip
                label={`x${inv.guestMultiplier ?? 1}`}
                size="small"
                onClick={isEditable ? (e) => handleEditOpen(e, inv) : undefined}
                sx={{
                  height: 20, fontSize: '0.6rem', fontWeight: 700,
                  bgcolor: alpha(emeraldCore.primary, isEditable ? 0.1 : 0.05),
                  color: isEditable ? emeraldCore.primary : 'var(--text-tertiary)',
                  border: `1px solid ${alpha(emeraldCore.primary, isEditable ? 0.2 : 0.08)}`,
                  cursor: isEditable ? 'pointer' : 'default',
                  '&:hover': isEditable ? { bgcolor: alpha(emeraldCore.primary, 0.15) } : {},
                }}
              />

              <Chip
                label={statusConf.label}
                size="small"
                sx={{
                  height: 20, fontSize: '0.6rem', fontWeight: 600,
                  bgcolor: alpha(statusConf.color, 0.1),
                  color: statusConf.color,
                  border: `1px solid ${alpha(statusConf.color, 0.2)}`,
                }}
              />

              {/* Expire button */}
              {isEditable && (
                <IconButton
                  size="small"
                  disabled={isMutating}
                  onClick={() => setExpireCode(inv.shortCode)}
                  sx={{
                    width: 24, height: 24, p: 0,
                    color: 'var(--text-tertiary)',
                    '&:hover': { color: accentColors.error?.light || '#f44336' },
                  }}
                >
                  <Ban size={13} />
                </IconButton>
              )}

              <Typography
                variant="caption"
                sx={{ fontSize: iosTypographyScale.caption2, color: 'var(--text-tertiary)', flexShrink: 0 }}
              >
                {formatDate(inv.createdAt)}
              </Typography>
            </Box>
          );
        })}
      </Box>

      {/* Multiplier Edit Popover */}
      <Popover
        open={Boolean(editAnchor)}
        anchorEl={editAnchor}
        onClose={() => setEditAnchor(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
        transformOrigin={{ vertical: 'top', horizontal: 'center' }}
        slotProps={{ paper: { sx: { p: 2, borderRadius: radius.lg, width: 220 } } }}
      >
        <Typography variant="caption" sx={{ fontWeight: 600, mb: 1, display: 'block' }}>
          Multiplicador: x{editValue}
        </Typography>
        <Slider
          value={editValue}
          onChange={(_, v) => setEditValue(v as number)}
          min={1} max={4} step={0.1}
          valueLabelDisplay="auto"
          valueLabelFormat={(v) => `x${v}`}
          sx={{ color: emeraldCore.primary, '& .MuiSlider-thumb': { width: 16, height: 16 } }}
        />
        <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1, mt: 1 }}>
          <Button size="small" onClick={() => setEditAnchor(null)} sx={{ textTransform: 'none', fontSize: '0.75rem' }}>
            Cancelar
          </Button>
          <Button
            size="small" variant="contained"
            disabled={editCode ? mutatingCodes.has(editCode) : false}
            onClick={handleEditSave}
            sx={{
              textTransform: 'none', fontSize: '0.75rem',
              bgcolor: emeraldCore.primary, '&:hover': { bgcolor: emeraldCore.dark },
            }}
          >
            Guardar
          </Button>
        </Box>
      </Popover>

      {/* Expire Confirmation Dialog */}
      <Dialog
        open={Boolean(expireCode)}
        onClose={() => setExpireCode(null)}
        PaperProps={{ sx: { borderRadius: radius.lg } }}
      >
        <DialogTitle sx={{ fontSize: '1rem', fontWeight: 600 }}>
          Expirar invitación
        </DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ fontSize: '0.85rem' }}>
            ¿Expirar la invitación de {expireTarget?.guestName || expireTarget?.guestContact || expireTarget?.shortCode}?
            El invitado perderá acceso en su próxima sesión.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setExpireCode(null)} sx={{ textTransform: 'none' }}>
            Cancelar
          </Button>
          <Button
            onClick={handleExpireConfirm}
            color="error"
            variant="contained"
            sx={{ textTransform: 'none' }}
          >
            Expirar
          </Button>
        </DialogActions>
      </Dialog>
```

- [ ] **Step 5: Verify build**

Run: `npm run build 2>&1 | tail -3`
Expected: `✓ built in` with no errors

- [ ] **Step 6: Commit**

```bash
git add src/pages/mi-perfil/components/InvitationSummary.tsx
git commit -m "feat(invitation): add multiplier chip, edit popover, and expire button to InvitationSummary"
```

---

## Task 5: Wire up — Pass new props from MyProfilePage

**Files:**
- Modify: `src/pages/mi-perfil/MyProfilePage.tsx:34` (where `useMyInvitations` is destructured)

- [ ] **Step 1: Update the destructuring of `useMyInvitations`**

Change line 34 from:

```typescript
const { invitations, metrics, isLoading: invitationsLoading } = useMyInvitations(googleUser?.email);
```

to:

```typescript
const { invitations, metrics, isLoading: invitationsLoading, mutatingCodes, updateMultiplier, expireInvitation } = useMyInvitations(googleUser?.email);
```

- [ ] **Step 2: Pass new props to `InvitationSummary`**

Find the `<InvitationSummary` JSX usage and add the new props:

```tsx
<InvitationSummary
  invitations={invitations}
  metrics={metrics}
  isLoading={invitationsLoading}
  mutatingCodes={mutatingCodes}
  onUpdateMultiplier={updateMultiplier}
  onExpire={expireInvitation}
/>
```

- [ ] **Step 3: Build + visual check**

Run: `npm run build 2>&1 | tail -3`
Expected: `✓ built in` with no errors

- [ ] **Step 4: Commit all remaining changes**

```bash
git add src/pages/mi-perfil/MyProfilePage.tsx index.html public/version.json
git commit -m "feat(invitation): wire up multiplier edit and expire in profile page"
```

---

## Task 6: Final verification

- [ ] **Step 1: Full build**

Run: `npm run build 2>&1 | tail -5`
Expected: `✓ built` with no errors

- [ ] **Step 2: Review the diff**

Run: `git diff HEAD~4 --stat`
Expected: 4 files changed — `api/invitations.js`, `useMyInvitations.ts`, `InvitationSummary.tsx`, `MyProfilePage.tsx`

- [ ] **Step 3: Push**

```bash
git push
```
