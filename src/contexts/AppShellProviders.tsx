/**
 * Composes app-shell contexts (tracking, notifications, loading, etc.)
 * so App.tsx avoids deep provider nesting.
 *
 * Note: ConvexProvider is mounted at the root (main.tsx) so it wraps
 * CurrencyProvider, which depends on useQuery for live multiplier sync.
 */

import { ReactNode } from 'react';
import { LiquidGlassProvider } from './LiquidGlassContext';
import { TrackingProvider } from './TrackingContext';
import { ScreenProtectionProvider } from './ScreenProtectionContext';
import { LiveRegionProvider } from '../components/shared/LiveRegion';
import { NotificationProvider } from './NotificationContext';
import { NetworkStatusProvider } from './NetworkStatusContext';
import { GlobalLoadingProvider } from './GlobalLoadingContext';

export function AppShellProviders({ children }: { children: ReactNode }) {
  return (
    <LiquidGlassProvider>
      <TrackingProvider>
        <ScreenProtectionProvider>
          <LiveRegionProvider>
            <NotificationProvider>
              <NetworkStatusProvider>
                <GlobalLoadingProvider>{children}</GlobalLoadingProvider>
              </NetworkStatusProvider>
            </NotificationProvider>
          </LiveRegionProvider>
        </ScreenProtectionProvider>
      </TrackingProvider>
    </LiquidGlassProvider>
  );
}
