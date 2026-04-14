/**
 * Composes app-shell contexts (tracking, notifications, loading, etc.)
 * so App.tsx avoids deep provider nesting.
 */

import { ReactNode } from 'react';
import { ConvexProvider, ConvexReactClient } from 'convex/react';
import { LiquidGlassProvider } from './LiquidGlassContext';
import { TrackingProvider } from './TrackingContext';
import { ScreenProtectionProvider } from './ScreenProtectionContext';
import { LiveRegionProvider } from '../components/shared/LiveRegion';
import { NotificationProvider } from './NotificationContext';
import { NetworkStatusProvider } from './NetworkStatusContext';
import { GlobalLoadingProvider } from './GlobalLoadingContext';

const convexUrl = import.meta.env.VITE_CONVEX_URL as string;
const convex = convexUrl ? new ConvexReactClient(convexUrl) : null;

export function AppShellProviders({ children }: { children: ReactNode }) {
  const inner = (
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

  if (convex) {
    return <ConvexProvider client={convex}>{inner}</ConvexProvider>;
  }
  return inner;
}
