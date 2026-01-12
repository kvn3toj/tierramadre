/**
 * useWhatsAppContact Hook
 *
 * Handles WhatsApp contact functionality for sending product inquiries.
 * - Guests contact their inviter
 * - Staff (asesor/ambassador/admin) contact selected admin
 */
import { useState, useCallback, useEffect } from 'react';
import { INVITATION_STORAGE_KEYS } from '../types/invitation';
import type { CartItem } from '../types/cart';
import type { Asesor } from './useAsesores';

// Admin contacts - these are the only people staff can contact
const ADMIN_NAMES = [
  'Martiza campuzano',  // Note: "Martiza" (not Maritza) matches Google Sheet
  'Isa La Negra Vikinga',
  'Juan Manuel',
];

// Admin to receive duplicate invitation notifications
const NOTIFICATION_ADMIN = 'Martiza campuzano';

interface GuestHistoryResult {
  success: boolean;
  hasMultipleInviters: boolean;
  totalInvitations?: number;
  uniqueCreators?: number;
  invitations?: Array<{
    invitationId: string;
    creatorName: string;
    creatorEmail: string;
    creatorRole: string;
    createdAt: string;
    status: string;
  }>;
  error?: string;
}

interface AdminInfo {
  name: string;
  whatsapp: string | null;
}

interface UseWhatsAppContactReturn {
  // Actions
  openWhatsAppToInviter: (items: CartItem[]) => Promise<void>;
  openWhatsAppToAdmin: (items: CartItem[], adminName: string) => Promise<void>;
  checkGuestHistory: () => Promise<GuestHistoryResult>;
  fetchAdmins: () => Promise<AdminInfo[]>;
  // State
  isLoading: boolean;
  error: string | null;
  admins: AdminInfo[];
  inviterName: string | null;
  inviterWhatsApp: string | null;
  hasInviter: boolean;
}

/**
 * Format phone number for WhatsApp API
 * Removes +, spaces, dashes, parentheses
 */
function formatPhoneNumber(phone: string): string {
  return phone.replace(/[\s\-+()]/g, '');
}

/**
 * Format cart items into WhatsApp message
 */
function formatCartMessage(items: CartItem[], senderName?: string): string {
  const productLines = items
    .map((item) => `- Item #${item.item}: ${item.nombre}`)
    .join('\n');

  let message = `Hola! Estoy interesado/a en los siguientes productos de Tierra Madre:\n\n${productLines}\n\nMe gustaria recibir mas informacion.`;

  if (senderName) {
    message += `\n\n[Enviado por: ${senderName}]`;
  }

  message += '\n\n[Enviado desde Tierra Madre Studio]';

  return message;
}

/**
 * Format duplicate invitation notification message
 */
function formatDuplicateNotification(
  guestName: string,
  guestContact: string,
  currentInviter: string,
  previousInviters: string[]
): string {
  return `[NOTIFICACION - INVITACION DUPLICADA]

El cliente ${guestName} (${guestContact}) fue previamente invitado por:
${previousInviters.map((name) => `- ${name}`).join('\n')}

Invitador actual: ${currentInviter}

Este cliente acaba de enviar una consulta de productos.`;
}

/**
 * Open WhatsApp with pre-filled message
 */
function openWhatsApp(phone: string, message: string): void {
  const cleanPhone = formatPhoneNumber(phone);
  const encodedMessage = encodeURIComponent(message);
  const url = `https://wa.me/${cleanPhone}?text=${encodedMessage}`;
  window.open(url, '_blank');
}

export function useWhatsAppContact(): UseWhatsAppContactReturn {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [admins, setAdmins] = useState<AdminInfo[]>([]);

  // Get inviter data from sessionStorage
  const inviterName = sessionStorage.getItem(INVITATION_STORAGE_KEYS.INVITER_NAME);
  const inviterWhatsApp = sessionStorage.getItem(INVITATION_STORAGE_KEYS.INVITER_WHATSAPP);
  const hasInviter = Boolean(inviterName && inviterWhatsApp);

  // Fetch admin contacts on mount
  useEffect(() => {
    fetchAdmins();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /**
   * Fetch admin contacts from asesores API
   */
  const fetchAdmins = useCallback(async (): Promise<AdminInfo[]> => {
    try {
      const response = await fetch('/api/get-asesores');
      const data = await response.json();

      if (data.success && data.asesores) {
        // Map admin names to their WhatsApp contacts
        // Show all admins even if WhatsApp not found (dialog will show "Sin WhatsApp")
        const adminContacts = ADMIN_NAMES.map((name) => {
          const asesor = data.asesores.find(
            (a: Asesor) =>
              a.name.toLowerCase().includes(name.toLowerCase()) ||
              name.toLowerCase().includes(a.name.toLowerCase())
          );
          return {
            name,
            whatsapp: asesor?.whatsapp || null,
          };
        });

        setAdmins(adminContacts);
        return adminContacts;
      }
      return [];
    } catch (err) {
      console.error('Error fetching admins:', err);
      return [];
    }
  }, []);

  /**
   * Check if guest has been invited by multiple users
   */
  const checkGuestHistory = useCallback(async (): Promise<GuestHistoryResult> => {
    const guestContact = sessionStorage.getItem(INVITATION_STORAGE_KEYS.GUEST_CONTACT);

    if (!guestContact) {
      return { success: true, hasMultipleInviters: false };
    }

    try {
      const response = await fetch(
        `/api/invitations?action=check-guest&guestContact=${encodeURIComponent(guestContact)}`
      );
      const data = await response.json();
      return data;
    } catch (err) {
      console.error('Error checking guest history:', err);
      return {
        success: false,
        hasMultipleInviters: false,
        error: 'Error al verificar historial',
      };
    }
  }, []);

  /**
   * Open WhatsApp to inviter (for guests)
   */
  const openWhatsAppToInviter = useCallback(
    async (items: CartItem[]): Promise<void> => {
      setIsLoading(true);
      setError(null);

      try {
        if (!inviterWhatsApp) {
          setError('No se encontro el contacto del invitador');
          return;
        }

        const guestName = sessionStorage.getItem(INVITATION_STORAGE_KEYS.GUEST_NAME) || '';
        const guestContact = sessionStorage.getItem(INVITATION_STORAGE_KEYS.GUEST_CONTACT) || '';

        // Check for duplicate invitations
        const historyResult = await checkGuestHistory();

        if (historyResult.hasMultipleInviters && historyResult.invitations) {
          // Get previous inviters (excluding current)
          const previousInviters = historyResult.invitations
            .filter((inv) => inv.creatorName !== inviterName)
            .map((inv) => inv.creatorName);

          // Notify admin Maritza about the duplicate
          if (previousInviters.length > 0) {
            const notificationAdmin = admins.find(
              (a) => a.name.toLowerCase().includes(NOTIFICATION_ADMIN.toLowerCase())
            );

            if (notificationAdmin?.whatsapp) {
              const notificationMessage = formatDuplicateNotification(
                guestName,
                guestContact,
                inviterName || 'Desconocido',
                previousInviters
              );
              // Open notification in a new tab (user can close it)
              openWhatsApp(notificationAdmin.whatsapp, notificationMessage);
              // Small delay before opening main contact
              await new Promise((resolve) => setTimeout(resolve, 500));
            }
          }
        }

        // Open WhatsApp to inviter with product list
        const message = formatCartMessage(items, guestName || undefined);
        openWhatsApp(inviterWhatsApp, message);
      } catch (err) {
        console.error('Error opening WhatsApp to inviter:', err);
        setError('Error al abrir WhatsApp');
      } finally {
        setIsLoading(false);
      }
    },
    [inviterWhatsApp, inviterName, admins, checkGuestHistory]
  );

  /**
   * Open WhatsApp to selected admin (for staff)
   */
  const openWhatsAppToAdmin = useCallback(
    async (items: CartItem[], adminName: string): Promise<void> => {
      setIsLoading(true);
      setError(null);

      try {
        // Find admin's WhatsApp
        let admin = admins.find(
          (a) =>
            a.name.toLowerCase().includes(adminName.toLowerCase()) ||
            adminName.toLowerCase().includes(a.name.toLowerCase())
        );

        // If not in cache, try fetching again
        if (!admin?.whatsapp) {
          const freshAdmins = await fetchAdmins();
          admin = freshAdmins.find(
            (a) =>
              a.name.toLowerCase().includes(adminName.toLowerCase()) ||
              adminName.toLowerCase().includes(a.name.toLowerCase())
          );
        }

        if (!admin?.whatsapp) {
          setError(`No se encontro el WhatsApp de ${adminName}`);
          return;
        }

        const message = formatCartMessage(items);
        openWhatsApp(admin.whatsapp, message);
      } catch (err) {
        console.error('Error opening WhatsApp to admin:', err);
        setError('Error al abrir WhatsApp');
      } finally {
        setIsLoading(false);
      }
    },
    [admins, fetchAdmins]
  );

  return {
    openWhatsAppToInviter,
    openWhatsAppToAdmin,
    checkGuestHistory,
    fetchAdmins,
    isLoading,
    error,
    admins,
    inviterName,
    inviterWhatsApp,
    hasInviter,
  };
}

export default useWhatsAppContact;
