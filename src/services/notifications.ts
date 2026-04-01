/**
 * Notification Service
 *
 * Handles local push notifications for PWA.
 * - Permission management
 * - Local notifications display
 * - Meditation reminders scheduling
 */

import { createLogger } from '../utils/logger';
import { STORAGE_KEYS } from '../constants/storage-keys';

const log = createLogger('Notifications');

// Storage keys
const NOTIFICATION_PERMISSION_KEY = STORAGE_KEYS.NOTIFICATION_PERMISSION;
const MEDITATION_REMINDER_KEY = STORAGE_KEYS.MEDITATION_REMINDER;
const LAST_PRODUCT_COUNT_KEY = STORAGE_KEYS.LAST_PRODUCT_COUNT;
const KNOWN_PRODUCT_IDS_KEY = STORAGE_KEYS.KNOWN_PRODUCT_IDS;

// =============================================================================
// PERMISSION MANAGEMENT
// =============================================================================

/**
 * Check if notifications are supported in this browser
 */
export function isNotificationSupported(): boolean {
  return 'Notification' in window;
}

/**
 * Get current notification permission status
 */
export function getPermissionStatus(): NotificationPermission | 'unsupported' {
  if (!isNotificationSupported()) return 'unsupported';
  return Notification.permission;
}

/**
 * Request notification permission from user
 */
export async function requestPermission(): Promise<NotificationPermission | 'unsupported'> {
  if (!isNotificationSupported()) return 'unsupported';

  try {
    const permission = await Notification.requestPermission();
    localStorage.setItem(NOTIFICATION_PERMISSION_KEY, permission);
    return permission;
  } catch (error) {
    log.error('Error requesting notification permission:', error);
    return 'denied';
  }
}

/**
 * Check if notifications are enabled
 */
export function isNotificationEnabled(): boolean {
  return getPermissionStatus() === 'granted';
}

// =============================================================================
// LOCAL NOTIFICATIONS
// =============================================================================

interface NotificationOptions {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  tag?: string;
  data?: Record<string, unknown>;
  onClick?: () => void;
}

/**
 * Show a local notification
 */
export function showNotification(options: NotificationOptions): Notification | null {
  if (!isNotificationEnabled()) {
    log.warn('Notifications not enabled');
    return null;
  }

  try {
    const notification = new Notification(options.title, {
      body: options.body,
      icon: options.icon || '/logo-symbol.png',
      badge: options.badge || '/logo-symbol.png',
      tag: options.tag,
      data: options.data,
    });

    if (options.onClick) {
      notification.onclick = () => {
        options.onClick?.();
        notification.close();
      };
    }

    return notification;
  } catch (error) {
    log.warn('Notification constructor not supported:', error);
    return null;
  }
}

// =============================================================================
// MEDITATION REMINDERS
// =============================================================================

interface MeditationReminder {
  enabled: boolean;
  hour: number; // 0-23
  minute: number; // 0-59
  lastNotified?: string; // ISO date string
}

/**
 * Get meditation reminder settings
 */
export function getMeditationReminder(): MeditationReminder | null {
  const stored = localStorage.getItem(MEDITATION_REMINDER_KEY);
  if (!stored) return null;
  try {
    return JSON.parse(stored);
  } catch {
    return null;
  }
}

/**
 * Save meditation reminder settings
 */
export function setMeditationReminder(reminder: MeditationReminder): void {
  localStorage.setItem(MEDITATION_REMINDER_KEY, JSON.stringify(reminder));
}

/**
 * Clear meditation reminder
 */
export function clearMeditationReminder(): void {
  localStorage.removeItem(MEDITATION_REMINDER_KEY);
}

/**
 * Calculate milliseconds until next reminder time
 */
export function getTimeUntilReminder(hour: number, minute: number): number {
  const now = new Date();
  const reminderTime = new Date();
  reminderTime.setHours(hour, minute, 0, 0);

  // If time has passed today, schedule for tomorrow
  if (reminderTime <= now) {
    reminderTime.setDate(reminderTime.getDate() + 1);
  }

  return reminderTime.getTime() - now.getTime();
}

/**
 * Check if reminder should show today (hasn't been shown yet)
 */
export function shouldShowReminderToday(reminder: MeditationReminder): boolean {
  if (!reminder.lastNotified) return true;

  const today = new Date().toDateString();
  const lastNotified = new Date(reminder.lastNotified).toDateString();

  return today !== lastNotified;
}

/**
 * Mark reminder as shown for today
 */
export function markReminderShown(): void {
  const reminder = getMeditationReminder();
  if (reminder) {
    reminder.lastNotified = new Date().toISOString();
    setMeditationReminder(reminder);
  }
}

/**
 * Show meditation reminder notification
 */
export function showMeditationReminder(): void {
  showNotification({
    title: 'Momento de Meditación',
    body: 'Tu sesión diaria de meditación con esmeraldas te espera.',
    tag: 'meditation-reminder',
    onClick: () => {
      window.focus();
      window.location.href = '/home';
    },
  });
  markReminderShown();
}

// =============================================================================
// NEW PRODUCT NOTIFICATIONS
// =============================================================================

/**
 * Get last known product count (legacy - kept for backwards compatibility)
 */
export function getLastProductCount(): number {
  const stored = localStorage.getItem(LAST_PRODUCT_COUNT_KEY);
  return stored ? parseInt(stored, 10) : 0;
}

/**
 * Update last known product count (legacy - kept for backwards compatibility)
 */
export function setLastProductCount(count: number): void {
  localStorage.setItem(LAST_PRODUCT_COUNT_KEY, count.toString());
}

/**
 * Get known product IDs from localStorage
 */
export function getKnownProductIds(): Set<number> {
  try {
    const stored = localStorage.getItem(KNOWN_PRODUCT_IDS_KEY);
    if (!stored) return new Set();
    const ids = JSON.parse(stored) as number[];
    return new Set(ids);
  } catch {
    return new Set();
  }
}

/**
 * Save known product IDs to localStorage
 */
export function setKnownProductIds(ids: Set<number>): void {
  try {
    const idsArray = Array.from(ids);
    localStorage.setItem(KNOWN_PRODUCT_IDS_KEY, JSON.stringify(idsArray));
  } catch (error) {
    log.warn('Error saving known product IDs:', error);
  }
}

/**
 * Check for new products by comparing item IDs and notify if found
 * This properly detects only truly new products, not all products on first load
 */
export function checkNewProductsByIds(currentProductIds: number[]): number {
  const knownIds = getKnownProductIds();
  const currentIdsSet = new Set(currentProductIds);

  // Find products that are in current but not in known
  const newProductIds = currentProductIds.filter(id => !knownIds.has(id));
  const newProductsCount = newProductIds.length;

  // Only notify if:
  // 1. There are new products
  // 2. We have previously seen products (not first time loading)
  // 3. The new count is reasonable (not all products being "new")
  const hasSeenProductsBefore = knownIds.size > 0;
  const isReasonableNewCount = newProductsCount < currentProductIds.length * 0.5; // Less than 50% are new

  if (newProductsCount > 0 && hasSeenProductsBefore && isReasonableNewCount) {
    showNotification({
      title: 'Nuevos Productos',
      body: `${newProductsCount} nueva${newProductsCount > 1 ? 's' : ''} esmeralda${newProductsCount > 1 ? 's' : ''} disponible${newProductsCount > 1 ? 's' : ''}`,
      tag: 'new-products',
      icon: '/logo-symbol.png',
      badge: '/logo-symbol.png',
      onClick: () => {
        window.focus();
        window.location.href = '/treasure';
      },
    });
  }

  // Update known IDs with all current IDs
  setKnownProductIds(currentIdsSet);

  return hasSeenProductsBefore && isReasonableNewCount ? newProductsCount : 0;
}

/**
 * Check for new products and notify if found (legacy - uses count comparison)
 * @deprecated Use checkNewProductsByIds for accurate new product detection
 */
export function checkNewProducts(currentCount: number): number {
  const lastCount = getLastProductCount();
  const newProductsCount = currentCount - lastCount;

  if (newProductsCount > 0 && lastCount > 0) {
    // Only notify if this isn't the first time loading
    showNotification({
      title: 'Nuevos Productos',
      body: `${newProductsCount} nueva${newProductsCount > 1 ? 's' : ''} esmeralda${newProductsCount > 1 ? 's' : ''} disponible${newProductsCount > 1 ? 's' : ''}`,
      tag: 'new-products',
      icon: '/logo-symbol.png',
      badge: '/logo-symbol.png',
      onClick: () => {
        window.focus();
        window.location.href = '/treasure';
      },
    });
  }

  setLastProductCount(currentCount);
  return newProductsCount;
}

// =============================================================================
// QUOTATION NOTIFICATIONS
// =============================================================================

const LAST_REQUEST_CHECK_KEY = STORAGE_KEYS.LAST_REQUEST_CHECK;
const LAST_QUOTATION_CHECK_KEY = STORAGE_KEYS.LAST_QUOTATION_CHECK;

/**
 * Get last request check timestamp
 */
export function getLastRequestCheck(): string | null {
  return localStorage.getItem(LAST_REQUEST_CHECK_KEY);
}

/**
 * Set last request check timestamp
 */
export function setLastRequestCheck(): void {
  localStorage.setItem(LAST_REQUEST_CHECK_KEY, new Date().toISOString());
}

/**
 * Get last quotation check timestamp
 */
export function getLastQuotationCheck(): string | null {
  return localStorage.getItem(LAST_QUOTATION_CHECK_KEY);
}

/**
 * Set last quotation check timestamp
 */
export function setLastQuotationCheck(): void {
  localStorage.setItem(LAST_QUOTATION_CHECK_KEY, new Date().toISOString());
}

/**
 * Show notification for new quotation requests (for providers)
 */
export function showNewRequestNotification(count: number): void {
  showNotification({
    title: 'Nueva Solicitud de Cotización',
    body: `Tienes ${count} nueva${count > 1 ? 's' : ''} solicitud${count > 1 ? 'es' : ''} de Tierra Madre`,
    tag: 'provider-request',
    onClick: () => {
      window.focus();
      window.location.href = '/provider/requests';
    },
  });
}

/**
 * Show notification for provider response (for admin)
 */
export function showProviderResponseNotification(providerName: string): void {
  showNotification({
    title: 'Respuesta de Proveedor',
    body: `${providerName} ha respondido a tu solicitud de cotización`,
    tag: 'admin-response',
    onClick: () => {
      window.focus();
      window.location.href = '/cuentas/cotizaciones-proveedor';
    },
  });
}

/**
 * Show notification for new provider quotation upload (for admin)
 */
export function showNewProviderQuotationNotification(count: number, providerName?: string): void {
  const body = providerName
    ? `${providerName} ha enviado ${count > 1 ? count : 'una'} nueva${count > 1 ? 's' : ''} cotización${count > 1 ? 'es' : ''}`
    : `Tienes ${count} nueva${count > 1 ? 's' : ''} cotización${count > 1 ? 'es' : ''} de proveedores`;

  showNotification({
    title: 'Nueva Cotización de Proveedor',
    body,
    tag: 'admin-quotation',
    onClick: () => {
      window.focus();
      window.location.href = '/cuentas/cotizaciones-proveedor';
    },
  });
}
