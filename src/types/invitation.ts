/**
 * Invitation System Types
 *
 * Types for the guest invitation system using short codes.
 * NO JWT - Google Sheets is the single source of truth.
 */

export type PricingMode = 'with_prices' | 'no_prices';
export type InvitationStatus = 'pending' | 'active' | 'expired' | 'used';
export type ContactType = 'email' | 'phone';

// Fixed 24-hour duration for all invitations
export const INVITATION_DURATION_HOURS = 24;

/**
 * Options for generating a new invitation
 */
export interface GenerateInvitationOptions {
  pricingMode?: PricingMode;
  guestName?: string;
  guestContact?: string;
  contactType?: ContactType;
}

/**
 * Response from generating an invitation
 */
export interface InvitationData {
  token: string; // Short code (e.g., ABC123)
  url: string; // Full URL with short code
  shortCode: string | null;
  shortUrl: string | null;
  createdAt: string;
  durationHours: number;
  pricingMode: PricingMode;
  createdBy: {
    email: string;
    name: string;
    role: string;
  };
}

/**
 * Response from validating an invitation
 */
export interface ValidationResult {
  success: boolean;
  isValid: boolean;
  status: 'pending' | 'active' | 'expired';
  invitationId?: string;
  activatedAt?: string;
  expiresAt?: string;
  timeRemaining?: number;
  timeRemainingMinutes?: number;
  durationHours?: number;
  pricingMode?: PricingMode;
  createdBy?: string;
  shortCode?: string;
  error?: string;
}

/**
 * Guest registration data
 */
export interface GuestRegistration {
  invitationId: string;
  guestName: string;
  guestContact: string;
  contactType: ContactType;
}

/**
 * Full invitation record from Google Sheets
 */
export interface GuestInvitation {
  invitationId: string;
  shortCode: string;
  creatorEmail: string;
  creatorName: string;
  guestName: string | null;
  guestContact: string | null;
  createdAt: string;
  activatedAt: string | null;
  expiresAt: string | null;
  pricingMode: PricingMode;
  durationHours: number;
  status: InvitationStatus;
}

/**
 * Session storage keys for invitation data
 */
export const INVITATION_STORAGE_KEYS = {
  EXPIRES: 'invitation-expires',
  TOKEN: 'invitation-token',
  PRICING_MODE: 'guest-pricing-mode',
  DURATION_HOURS: 'invitation-duration',
  INVITATION_ID: 'invitation-id',
} as const;
