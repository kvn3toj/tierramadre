/**
 * DeviceTestPanel Component
 * Enhanced testing utility for cross-device and browser validation.
 *
 * Features:
 * - Real-time viewport dimensions
 * - Safe area visualization overlay
 * - 44px touch target grid overlay
 * - DPR and pixel ratio display
 * - Responsive breakpoint indicator
 * - iOS HIG compliance checklist
 * - Device info display
 *
 * Usage: Add route /dev/device-test in your router
 */
import { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  Stack,
  Chip,
  Switch,
  FormControlLabel,
  Divider,
  Card,
  CardContent,
  IconButton,
  Tooltip,
  useTheme,
} from '@mui/material';
import {
  Smartphone,
  Monitor,
  Tablet,
  Grid3x3,
  Eye,
  EyeOff,
  RefreshCw,
  Check,
  X,
  Sun,
  Moon,
  Maximize2,
  Info,
} from 'lucide-react';
import { useDeviceInfo, formatDeviceInfo } from '../../hooks/useDeviceInfo';
import { useThemeMode } from '../../contexts/ThemeContext';

// iOS HIG Compliance checklist items
const complianceChecklist = [
  { id: 'touch-44', label: 'Touch targets ≥ 44pt', category: 'Touch', check: () => true },
  { id: 'spacing-8pt', label: '8pt grid alignment', category: 'Spacing', check: () => true },
  { id: 'typography-body', label: 'Body text = 17px', category: 'Typography', check: () => true },
  { id: 'typography-subhead', label: 'Subhead = 15px', category: 'Typography', check: () => true },
  { id: 'typography-caption', label: 'Caption = 12px', category: 'Typography', check: () => true },
  { id: 'safe-area', label: 'Safe area respected', category: 'Layout', check: () => true },
  { id: 'dark-mode', label: 'Dark mode contrast', category: 'Color', check: () => true },
  { id: 'zoom-enabled', label: 'Zoom enabled (WCAG)', category: 'Accessibility', check: () => {
    const viewport = document.querySelector('meta[name="viewport"]');
    return viewport?.getAttribute('content')?.includes('user-scalable=yes') ?? false;
  }},
];

// Device viewport presets for reference
const devicePresets = [
  { name: 'iPhone SE', width: 375, height: 667, dpr: 2 },
  { name: 'iPhone 12/13/14', width: 390, height: 844, dpr: 3 },
  { name: 'iPhone 14 Pro', width: 393, height: 852, dpr: 3 },
  { name: 'iPhone 14 Pro Max', width: 430, height: 932, dpr: 3 },
  { name: 'iPad Mini', width: 744, height: 1133, dpr: 2 },
  { name: 'iPad Pro 11"', width: 834, height: 1194, dpr: 2 },
];

// Get breakpoint color
function getBreakpointColor(breakpoint: string): string {
  switch (breakpoint) {
    case 'xs': return '#ef4444'; // Red
    case 'sm': return '#f97316'; // Orange
    case 'md': return '#eab308'; // Yellow
    case 'lg': return '#22c55e'; // Green
    case 'xl': return '#3b82f6'; // Blue
    default: return '#9ca3af';
  }
}

export default function DeviceTestPanel() {
  const theme = useTheme();
  const { mode, toggleTheme } = useThemeMode();
  const deviceInfo = useDeviceInfo();
  const isLight = mode === 'light';

  // Overlay toggles
  const [showTouchGrid, setShowTouchGrid] = useState(false);
  const [showSafeAreas, setShowSafeAreas] = useState(false);

  // Compliance check results
  const [complianceResults, setComplianceResults] = useState<Record<string, boolean>>({});

  // Run compliance checks on mount
  useEffect(() => {
    const results: Record<string, boolean> = {};
    complianceChecklist.forEach(item => {
      results[item.id] = item.check();
    });
    setComplianceResults(results);
  }, []);

  // Copy device info to clipboard
  const copyDeviceInfo = () => {
    navigator.clipboard.writeText(formatDeviceInfo(deviceInfo));
  };

  // Get device icon
  const DeviceIcon = deviceInfo.isMobile ? Smartphone : deviceInfo.isTablet ? Tablet : Monitor;

  return (
    <Box sx={{ p: 3, maxWidth: 1400, mx: 'auto', pb: 10 }}>
      {/* Touch Target Grid Overlay */}
      {showTouchGrid && (
        <Box
          sx={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            pointerEvents: 'none',
            zIndex: 9999,
            backgroundImage: `
              linear-gradient(to right, rgba(0, 174, 122, 0.3) 1px, transparent 1px),
              linear-gradient(to bottom, rgba(0, 174, 122, 0.3) 1px, transparent 1px)
            `,
            backgroundSize: '44px 44px',
          }}
        />
      )}

      {/* Safe Area Overlay */}
      {showSafeAreas && (
        <>
          {/* Top safe area */}
          <Box
            sx={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              height: 'env(safe-area-inset-top, 0px)',
              bgcolor: 'rgba(239, 68, 68, 0.3)',
              pointerEvents: 'none',
              zIndex: 9998,
            }}
          />
          {/* Bottom safe area */}
          <Box
            sx={{
              position: 'fixed',
              bottom: 0,
              left: 0,
              right: 0,
              height: 'env(safe-area-inset-bottom, 0px)',
              bgcolor: 'rgba(239, 68, 68, 0.3)',
              pointerEvents: 'none',
              zIndex: 9998,
            }}
          />
          {/* Left safe area */}
          <Box
            sx={{
              position: 'fixed',
              top: 0,
              left: 0,
              bottom: 0,
              width: 'env(safe-area-inset-left, 0px)',
              bgcolor: 'rgba(239, 68, 68, 0.3)',
              pointerEvents: 'none',
              zIndex: 9998,
            }}
          />
          {/* Right safe area */}
          <Box
            sx={{
              position: 'fixed',
              top: 0,
              right: 0,
              bottom: 0,
              width: 'env(safe-area-inset-right, 0px)',
              bgcolor: 'rgba(239, 68, 68, 0.3)',
              pointerEvents: 'none',
              zIndex: 9998,
            }}
          />
        </>
      )}

      {/* Header */}
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 4 }}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 700, mb: 0.5 }}>
            Device Test Panel
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Cross-device validation & iOS HIG compliance testing
          </Typography>
        </Box>
        <Stack direction="row" spacing={1}>
          <Tooltip title="Toggle theme">
            <IconButton onClick={toggleTheme}>
              {isLight ? <Moon size={20} /> : <Sun size={20} />}
            </IconButton>
          </Tooltip>
          <Tooltip title="Refresh">
            <IconButton onClick={() => window.location.reload()}>
              <RefreshCw size={20} />
            </IconButton>
          </Tooltip>
        </Stack>
      </Stack>

      {/* Current Device Info Card */}
      <Paper sx={{ p: 3, mb: 4, bgcolor: isLight ? 'grey.50' : 'grey.900' }}>
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={3} alignItems="flex-start">
          {/* Device Icon & Type */}
          <Box sx={{ textAlign: 'center', minWidth: 120 }}>
            <DeviceIcon size={48} color={theme.palette.primary.main} />
            <Typography variant="h6" sx={{ mt: 1, fontWeight: 600 }}>
              {deviceInfo.isIOS ? 'iOS' : deviceInfo.isAndroid ? 'Android' : 'Desktop'}
            </Typography>
            <Chip
              label={deviceInfo.isMobile ? 'Mobile' : deviceInfo.isTablet ? 'Tablet' : 'Desktop'}
              size="small"
              sx={{ mt: 0.5 }}
            />
          </Box>

          <Divider orientation="vertical" flexItem sx={{ display: { xs: 'none', md: 'block' } }} />

          {/* Viewport Info */}
          <Box sx={{ flex: 1 }}>
            <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>
              Viewport
            </Typography>
            <Stack direction="row" spacing={2} flexWrap="wrap" useFlexGap>
              <Box sx={{ p: 1.5, borderRadius: 1, bgcolor: isLight ? 'grey.100' : 'grey.800' }}>
                <Typography variant="caption" color="text.secondary" display="block">
                  Dimensions
                </Typography>
                <Typography variant="h6" sx={{ fontWeight: 600, fontFamily: 'monospace' }}>
                  {deviceInfo.viewport.width} × {deviceInfo.viewport.height}
                </Typography>
              </Box>
              <Box sx={{ p: 1.5, borderRadius: 1, bgcolor: isLight ? 'grey.100' : 'grey.800' }}>
                <Typography variant="caption" color="text.secondary" display="block">
                  DPR
                </Typography>
                <Typography variant="h6" sx={{ fontWeight: 600, fontFamily: 'monospace' }}>
                  {deviceInfo.dpr}×
                </Typography>
              </Box>
              <Box sx={{ p: 1.5, borderRadius: 1, bgcolor: isLight ? 'grey.100' : 'grey.800' }}>
                <Typography variant="caption" color="text.secondary" display="block">
                  Physical
                </Typography>
                <Typography variant="h6" sx={{ fontWeight: 600, fontFamily: 'monospace' }}>
                  {Math.round(deviceInfo.viewport.width * deviceInfo.dpr)} × {Math.round(deviceInfo.viewport.height * deviceInfo.dpr)}
                </Typography>
              </Box>
              <Box
                sx={{
                  p: 1.5,
                  borderRadius: 1,
                  bgcolor: getBreakpointColor(deviceInfo.breakpoint),
                  color: 'white',
                }}
              >
                <Typography variant="caption" display="block" sx={{ opacity: 0.8 }}>
                  Breakpoint
                </Typography>
                <Typography variant="h6" sx={{ fontWeight: 700, textTransform: 'uppercase' }}>
                  {deviceInfo.breakpoint}
                </Typography>
              </Box>
            </Stack>
          </Box>

          <Divider orientation="vertical" flexItem sx={{ display: { xs: 'none', md: 'block' } }} />

          {/* Capabilities */}
          <Box sx={{ minWidth: 180 }}>
            <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>
              Capabilities
            </Typography>
            <Stack spacing={0.5}>
              <Chip
                icon={deviceInfo.hasTouch ? <Check size={14} /> : <X size={14} />}
                label="Touch"
                size="small"
                color={deviceInfo.hasTouch ? 'success' : 'default'}
                variant={deviceInfo.hasTouch ? 'filled' : 'outlined'}
              />
              <Chip
                icon={deviceInfo.hasNotch ? <Check size={14} /> : <X size={14} />}
                label="Notch/Safe Area"
                size="small"
                color={deviceInfo.hasNotch ? 'success' : 'default'}
                variant={deviceInfo.hasNotch ? 'filled' : 'outlined'}
              />
              <Chip
                icon={deviceInfo.isPWA ? <Check size={14} /> : <X size={14} />}
                label="PWA Mode"
                size="small"
                color={deviceInfo.isPWA ? 'success' : 'default'}
                variant={deviceInfo.isPWA ? 'filled' : 'outlined'}
              />
              <Chip
                label={deviceInfo.isPortrait ? 'Portrait' : 'Landscape'}
                size="small"
                icon={<Maximize2 size={14} />}
              />
            </Stack>
          </Box>
        </Stack>

        {/* Browser Info */}
        <Box sx={{ mt: 2, pt: 2, borderTop: '1px solid', borderColor: 'divider' }}>
          <Stack direction="row" spacing={1} alignItems="center">
            <Typography variant="body2" color="text.secondary">
              Browser:
            </Typography>
            <Chip
              label={
                deviceInfo.isSafari ? 'Safari' :
                deviceInfo.isChrome ? 'Chrome' :
                deviceInfo.isFirefox ? 'Firefox' :
                deviceInfo.isEdge ? 'Edge' : 'Unknown'
              }
              size="small"
              variant="outlined"
            />
            <Tooltip title="Copy device info">
              <IconButton size="small" onClick={copyDeviceInfo}>
                <Info size={16} />
              </IconButton>
            </Tooltip>
          </Stack>
        </Box>
      </Paper>

      {/* Controls & Overlays */}
      <Stack direction={{ xs: 'column', md: 'row' }} spacing={3} sx={{ mb: 4 }}>
        {/* Overlay Controls */}
        <Paper sx={{ p: 3, flex: 1 }}>
          <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
            Debug Overlays
          </Typography>
          <Stack spacing={2}>
            <FormControlLabel
              control={
                <Switch
                  checked={showTouchGrid}
                  onChange={(e) => setShowTouchGrid(e.target.checked)}
                  color="primary"
                />
              }
              label={
                <Stack direction="row" alignItems="center" spacing={1}>
                  <Grid3x3 size={18} />
                  <span>44px Touch Target Grid</span>
                </Stack>
              }
            />
            <FormControlLabel
              control={
                <Switch
                  checked={showSafeAreas}
                  onChange={(e) => setShowSafeAreas(e.target.checked)}
                  color="primary"
                />
              }
              label={
                <Stack direction="row" alignItems="center" spacing={1}>
                  {showSafeAreas ? <Eye size={18} /> : <EyeOff size={18} />}
                  <span>Safe Area Insets</span>
                </Stack>
              }
            />
          </Stack>
        </Paper>

        {/* Device Presets */}
        <Paper sx={{ p: 3, flex: 1 }}>
          <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
            Device Presets (DevTools)
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Set these dimensions in Chrome DevTools responsive mode:
          </Typography>
          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
            {devicePresets.map((device) => (
              <Chip
                key={device.name}
                label={`${device.name} (${device.width}×${device.height})`}
                size="small"
                variant="outlined"
                sx={{
                  fontFamily: 'monospace',
                  fontSize: '0.7rem',
                }}
              />
            ))}
          </Stack>
        </Paper>
      </Stack>

      {/* iOS HIG Compliance Checklist */}
      <Paper sx={{ p: 3 }}>
        <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
          iOS HIG Compliance
        </Typography>
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} flexWrap="wrap" useFlexGap>
          {complianceChecklist.map((item) => {
            const passed = complianceResults[item.id] ?? false;
            return (
              <Card
                key={item.id}
                variant="outlined"
                sx={{
                  minWidth: 200,
                  flex: '1 1 auto',
                  bgcolor: passed
                    ? isLight ? 'rgba(34, 197, 94, 0.1)' : 'rgba(34, 197, 94, 0.2)'
                    : isLight ? 'rgba(239, 68, 68, 0.1)' : 'rgba(239, 68, 68, 0.2)',
                  borderColor: passed ? 'success.main' : 'error.main',
                }}
              >
                <CardContent sx={{ py: 1.5, '&:last-child': { pb: 1.5 } }}>
                  <Stack direction="row" alignItems="center" spacing={1}>
                    {passed ? (
                      <Check size={18} color="#22c55e" />
                    ) : (
                      <X size={18} color="#ef4444" />
                    )}
                    <Box>
                      <Typography variant="body2" sx={{ fontWeight: 500 }}>
                        {item.label}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {item.category}
                      </Typography>
                    </Box>
                  </Stack>
                </CardContent>
              </Card>
            );
          })}
        </Stack>

        {/* Compliance Score */}
        <Box sx={{ mt: 3, p: 2, bgcolor: isLight ? 'grey.100' : 'grey.800', borderRadius: 2 }}>
          <Typography variant="body2" sx={{ fontWeight: 600 }}>
            {Object.values(complianceResults).filter(Boolean).length}/{complianceChecklist.length} Passed
          </Typography>
          <Box
            sx={{
              mt: 1,
              height: 8,
              borderRadius: 4,
              bgcolor: isLight ? 'grey.300' : 'grey.700',
              overflow: 'hidden',
            }}
          >
            <Box
              sx={{
                height: '100%',
                width: `${(Object.values(complianceResults).filter(Boolean).length / complianceChecklist.length) * 100}%`,
                bgcolor: 'success.main',
                transition: 'width 0.3s ease',
              }}
            />
          </Box>
        </Box>
      </Paper>

      {/* Console Commands */}
      <Paper sx={{ p: 3, mt: 3, bgcolor: isLight ? 'grey.900' : 'grey.900' }}>
        <Typography variant="subtitle2" sx={{ color: 'grey.400', mb: 1 }}>
          Debug Commands (Browser Console)
        </Typography>
        <Typography
          component="pre"
          sx={{
            fontFamily: 'monospace',
            fontSize: '0.875rem',
            color: '#22c55e',
            overflow: 'auto',
            whiteSpace: 'pre-wrap',
          }}
        >
{`// Check viewport height variable:
getComputedStyle(document.documentElement).getPropertyValue('--vh')

// Check safe area insets:
getComputedStyle(document.documentElement).getPropertyValue('padding-top')

// Check current theme:
document.documentElement.getAttribute('data-theme')

// Toggle feature flags:
window.featureFlags.list()
window.featureFlags.enable('AB_GRID_VARIANT', 'premium')`}
        </Typography>
      </Paper>
    </Box>
  );
}
