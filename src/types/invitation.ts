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
  pin: string; // 4-digit PIN shared separately by asesor
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
  creatorEmail?: string;
  shortCode?: string;
  error?: string;
  guestName?: string | null;
  guestContact?: string | null;
  contactType?: ContactType | null;
  isPinBound?: boolean;
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
 * Result from PIN verification API
 */
export interface PinVerificationResult {
  success: boolean;
  pinVerified?: boolean;
  isPinWrong?: boolean;
  isIpBlocked?: boolean;
  guestName?: string | null;
  guestContact?: string | null;
  error?: string;
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
  // Inviter data for WhatsApp contact functionality
  INVITER_NAME: 'invitation-inviter-name',
  INVITER_EMAIL: 'invitation-inviter-email',
  INVITER_WHATSAPP: 'invitation-inviter-whatsapp',
  // Guest contact for duplicate invitation check
  GUEST_NAME: 'invitation-guest-name',
  GUEST_CONTACT: 'invitation-guest-contact',
  // PIN verification flag (survives tab refresh)
  PIN_VERIFIED: 'invitation-pin-verified',
} as const;
