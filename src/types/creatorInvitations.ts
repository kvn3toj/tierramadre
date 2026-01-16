/**
 * Creator Invitations Types
 *
 * Types for listing invitations by creator email.
 * Used for cotizacion client validation against invited guests.
 */

import type { InvitationStatus, PricingMode } from './invitation';

/**
 * Invitation summary returned by list-by-creator API
 */
export interface CreatorInvitation {
  invitationId: string;
  shortCode: string;
  guestName: string | null;
  guestContact: string | null;
  contactType: string | null;
  status: InvitationStatus;
  createdAt: string;
  activatedAt: string | null;
  expiresAt: string | null;
  pricingMode: PricingMode;
}

/**
 * API response for list-by-creator action
 */
export interface ListByCreatorResponse {
  success: boolean;
  invitations: CreatorInvitation[];
  total: number;
  error?: string;
}

/**
 * Guest validation status for client autocomplete
 */
export type GuestValidationStatus = 'valid' | 'warning' | 'none';

/**
 * Combined option for Autocomplete (recent client or invited guest)
 */
export interface ClientOption {
  name: string;
  phone?: string;
  email?: string;
  document?: string;
  source: 'invited' | 'recent';
  shortCode?: string;
  invitationStatus?: InvitationStatus;
  lastUsed?: number;
  useCount?: number;
}

/**
 * Mismatch report for logging when client is not in invited guests
 */
export interface ClientMismatchReport {
  timestamp: string;
  asesorEmail: string;
  asesorName: string;
  clientNameEntered: string;
  clientPhone?: string;
  clientEmail?: string;
  expectedGuests: string[];
  quotationNumber: string;
}
