# Invitation Management in Asesor Profile

## Problem

Asesores create invitation links with a multiplier factor (x1.0-x4.0) that affects the prices guests see. Currently there is no way to:
1. See which multiplier was assigned to each guest
2. Edit the multiplier after the invitation was sent
3. Manually expire/revoke an active invitation

## Solution

Expand the existing `InvitationSummary.tsx` component in the asesor profile page to show multiplier info and provide inline actions. Add two new API actions (`update` and `expire`) to `api/invitations.js`.

## Scope

### In scope
- Show multiplier chip per invitation in the existing InvitationSummary list
- Inline popover to edit multiplier (slider 1.0-4.0, step 0.1)
- Expire/revoke button with confirmation
- New API actions: `update` (multiplier) and `expire`
- Ownership validation (asesor can only manage their own invitations)
- Optimistic UI updates in `useMyInvitations`
- Remove the 5-item cap so all active/pending invitations are visible

### Out of scope
- Editing currency mode or pricing mode post-creation
- Re-sending invitation links
- Real-time guest notification of multiplier changes
- Bulk operations on multiple invitations

## Architecture

### API Changes (`api/invitations.js`)

#### New action: `update`
- **Method**: POST
- **Params**: `action=update`
- **Body**: `{ shortCode, creatorEmail, fields: { guestMultiplier: number } }`
- **Validation**:
  - `shortCode` must exist via `findInvitationByCode()`
  - Ownership: `body.creatorEmail.toLowerCase().trim() === data.creatorEmail.toLowerCase().trim()`
  - `guestMultiplier` validated via `sanitizeMultiplier()` — clamps to [1.0, 4.0], rounds to 0.1. Values like 0.5 become 1.0 (clamped, not rejected). NaN/Infinity/null return error.
  - Invitation status must be `active` or `pending` (cannot edit expired)
- **Action**: Update column R (guestMultiplier) in the matched Sheets row
- **Response**: `{ success: true, invitation: { shortCode, guestMultiplier } }`

#### New action: `expire`
- **Method**: POST
- **Params**: `action=expire`
- **Body**: `{ shortCode, creatorEmail }`
- **Validation**:
  - `shortCode` must exist via `findInvitationByCode()`
  - Ownership: same case-insensitive email comparison
  - Status must be `active` or `pending` (already-expired returns success as no-op)
- **Action**: Update columns K (expiresAt = now) and N (status = 'expired')
- **Response**: `{ success: true }`

### Hook Changes (`src/hooks/useMyInvitations.ts`)

The hook already receives `creatorEmail` as its parameter. The two new methods close over this value internally — callers only need to pass `shortCode`:

```typescript
updateMultiplier(shortCode: string, multiplier: number): Promise<boolean>
expireInvitation(shortCode: string): Promise<boolean>
```

Returns `true` on success, `false` on error (for UI feedback).

**Optimistic updates**:
- `updateMultiplier`: Updates local `guestMultiplier` immediately, calls API, reverts on error with toast
- `expireInvitation`: Removes the invitation from the local list immediately (since `listByCreator` only returns active/pending), calls API. On error: reverts by re-inserting the row + toast. This is the expected UX: expired invitations disappear from the manageable list.

**Loading states**: Each method sets a per-shortCode loading flag to prevent double-submission. The hook exposes `mutatingCodes: Set<string>` so the UI can disable buttons during in-flight mutations.

### UI Changes (`src/pages/mi-perfil/components/InvitationSummary.tsx`)

#### List limit
Remove the `.slice(0, 5)` cap. Show all invitations returned by `listByCreator` (active + pending only). If the list grows long, it scrolls within the existing card container.

#### Per-invitation row (expanded)
Current: `[Icon] [Guest Name] [Status Chip] [Date]`
New: `[Icon] [Guest Name] [Multiplier Chip] [Status Chip] [Actions] [Date]`

#### Multiplier chip
- Shows `x2.5` in a small chip (emerald-tinted for active, muted for pending)
- If `guestMultiplier` is null, show `x1` (default)
- Tapping the chip opens a Popover with:
  - Slider (1.0-4.0, step 0.1) pre-set to current value
  - Save button (disabled while `mutatingCodes` includes this shortCode)
  - Cancel (close popover)
- Only interactive for `active` or `pending` invitations

#### Expire action
- Small icon button (block/cancel icon)
- Disabled while `mutatingCodes` includes this shortCode
- On tap: confirmation dialog "Expirar invitacion de {guestName}?"
- On confirm: calls `expireInvitation(shortCode)` — row disappears from list
- Only shown for `active` or `pending` invitations

### Guest-side behavior
- Guest multiplier comes from Sheets via `validateInvitation()` on each session start
- When asesor updates multiplier, the change takes effect on guest's next page refresh/new session
- No real-time notification needed

## Data Flow

```
Asesor taps "x3.0" chip on invitation row
  -> Popover opens with Slider at 3.0
  -> Asesor drags to 2.5, taps Save
  -> useMyInvitations.updateMultiplier('ABC123', 2.5)
    -> Optimistic: local list updates chip to "x2.5"
    -> POST /api/invitations?action=update
       Body: { shortCode: 'ABC123', creatorEmail: 'asesor@email.com', fields: { guestMultiplier: 2.5 } }
      -> API: ownership check (case-insensitive) -> sanitizeMultiplier(2.5) -> update Sheets col R
    -> On error: revert local state, show toast
  -> Guest on next refresh: validateInvitation returns new multiplier from Sheets
    -> CurrencyContext reads from sessionStorage -> convertPrice() uses 2.5
```

## Security

- **Ownership check**: API validates `creatorEmail` matches the invitation's `creatorEmail` column, case-insensitive with `.toLowerCase().trim()`
- **Input validation**: `sanitizeMultiplier()` clamps out-of-range to [1.0, 4.0], rejects NaN/Infinity/null
- **Irreversibility**: Expired invitations cannot be un-expired
- **No auth escalation**: These actions use the same creatorEmail-based check as `list-by-creator`

## Files to modify

1. `api/invitations.js` - Add `updateInvitation()` and `expireInvitation()` functions + route handlers
2. `src/hooks/useMyInvitations.ts` - Add `updateMultiplier`, `expireInvitation`, and `mutatingCodes`
3. `src/pages/mi-perfil/components/InvitationSummary.tsx` - Multiplier chip, popover, expire button, remove 5-item cap
