/**
 * ViewportTest Component
 * A/B Testing UI for comparing viewport responsiveness across devices.
 * Developer tool for validating iOS HIG compliance.
 *
 * Usage: Add route /dev/viewport-test in your router
 */
import React, { useState } from 'react';
import {
  Box,
  Typography,
  ToggleButton,
  ToggleButtonGroup,
  Paper,
  Stack,
  Divider,
  Chip,
  Select,
  MenuItem,
  FormControl,
  Card,
  CardContent,
  IconButton,
} from '@mui/material';
import { Monitor, Smartphone, Tablet, RefreshCw, Check, X } from 'lucide-react';
import {
  useABTest,
  ABVariant,
  deviceViewports,
  DeviceViewport,
  iosTypographyScale,
} from '../../hooks/useABTest';
import { useThemeMode } from '../../contexts/ThemeContext';

// iOS HIG Compliance checklist items
const complianceChecklist = [
  { id: 'touch-44', label: 'Touch targets ≥ 44pt', category: 'Touch' },
  { id: 'spacing-8pt', label: '8pt grid alignment', category: 'Spacing' },
  { id: 'typography-body', label: 'Body text = 17px', category: 'Typography' },
  { id: 'typography-subhead', label: 'Subhead = 15px', category: 'Typography' },
  { id: 'typography-caption', label: 'Caption = 12px', category: 'Typography' },
  { id: 'safe-area', label: 'Safe area respected', category: 'Layout' },
  { id: 'dark-mode', label: 'Dark mode contrast', category: 'Color' },
];

export default function ViewportTest() {
  const { mode } = useThemeMode();
  const isLight = mode === 'light';
  const { variant, config, setVariant } = useABTest();
  const [selectedDevice, setSelectedDevice] = useState<DeviceViewport>('iphone-12');
  const [checkedItems, setCheckedItems] = useState<Set<string>>(new Set());

  const handleVariantChange = (_: React.MouseEvent<HTMLElement>, newVariant: ABVariant | null) => {
    if (newVariant) {
      setVariant(newVariant);
    }
  };

  const toggleCheckItem = (id: string) => {
    const newChecked = new Set(checkedItems);
    if (newChecked.has(id)) {
      newChecked.delete(id);
    } else {
      newChecked.add(id);
    }
    setCheckedItems(newChecked);
  };

  const deviceInfo = deviceViewports[selectedDevice];

  return (
    <Box sx={{ p: 3, maxWidth: 1400, mx: 'auto' }}>
      {/* Header */}
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 4 }}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 700, mb: 0.5 }}>
            Viewport A/B Test
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Compare responsive variants and validate iOS HIG compliance
          </Typography>
        </Box>
        <Chip
          label={`Current: ${variant.toUpperCase()}`}
          color="primary"
          sx={{ fontWeight: 600 }}
        />
      </Stack>

      {/* Controls */}
      <Paper sx={{ p: 3, mb: 4 }}>
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={3} alignItems="flex-start">
          {/* Variant Selector */}
          <Box>
            <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600 }}>
              A/B Variant
            </Typography>
            <ToggleButtonGroup
              value={variant}
              exclusive
              onChange={handleVariantChange}
              size="small"
            >
              <ToggleButton value="control">
                Control
              </ToggleButton>
              <ToggleButton value="ios-hig">
                iOS HIG
              </ToggleButton>
              <ToggleButton value="premium">
                Premium
              </ToggleButton>
            </ToggleButtonGroup>
          </Box>

          {/* Device Selector */}
          <Box sx={{ minWidth: 200 }}>
            <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600 }}>
              Test Device
            </Typography>
            <FormControl size="small" fullWidth>
              <Select
                value={selectedDevice}
                onChange={(e) => setSelectedDevice(e.target.value as DeviceViewport)}
              >
                {Object.entries(deviceViewports).map(([key, device]) => (
                  <MenuItem key={key} value={key}>
                    <Stack direction="row" alignItems="center" spacing={1}>
                      {key.includes('iphone') ? <Smartphone size={16} /> :
                       key.includes('ipad') ? <Tablet size={16} /> :
                       <Monitor size={16} />}
                      <span>{device.name}</span>
                      <Typography variant="caption" color="text.secondary">
                        {device.width}×{device.height}
                      </Typography>
                    </Stack>
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Box>

          {/* Reset Button */}
          <Box sx={{ pt: 3 }}>
            <IconButton
              onClick={() => {
                setVariant('ios-hig');
                setCheckedItems(new Set());
              }}
              sx={{ bgcolor: 'action.hover' }}
            >
              <RefreshCw size={20} />
            </IconButton>
          </Box>
        </Stack>
      </Paper>

      {/* Main Content Grid */}
      <Stack direction={{ xs: 'column', lg: 'row' }} spacing={3}>
        {/* Configuration Panel */}
        <Paper sx={{ p: 3, flex: 1 }}>
          <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
            Variant Configuration
          </Typography>

          <Stack spacing={2}>
            {/* Grid Settings */}
            <Box>
              <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>
                Grid Settings
              </Typography>
              <Stack direction="row" spacing={2} flexWrap="wrap">
                <ConfigValue label="Gap" value={`${config.gridGap}px`} />
                <ConfigValue label="Card Height" value={`${config.mobileCardHeight}px`} />
                <ConfigValue label="Padding" value={`${config.cardPadding}px`} />
                <ConfigValue label="Border Radius" value={`${config.cardBorderRadius}px`} />
              </Stack>
            </Box>

            <Divider />

            {/* Typography */}
            <Box>
              <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>
                Typography (iOS HIG Scale)
              </Typography>
              <Stack direction="row" spacing={2} flexWrap="wrap">
                <ConfigValue label="Name" value={config.nameFontSize} highlight={config.nameFontSize === iosTypographyScale.body} />
                <ConfigValue label="Specs" value={config.specsFontSize} highlight={config.specsFontSize === iosTypographyScale.subhead} />
                <ConfigValue label="Price" value={config.priceFontSize} />
                <ConfigValue label="Caption" value={config.captionFontSize} highlight={config.captionFontSize === iosTypographyScale.caption1} />
              </Stack>
            </Box>

            <Divider />

            {/* Touch & Image */}
            <Box>
              <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>
                Touch Targets & Images
              </Typography>
              <Stack direction="row" spacing={2} flexWrap="wrap">
                <ConfigValue label="Touch Target" value={`${config.touchTargetSize}px`} highlight={config.touchTargetSize >= 44} />
                <ConfigValue label="Icon Size" value={`${config.buttonIconSize}px`} />
                <ConfigValue label="Aspect Ratio" value={config.imageAspectRatio} />
                <ConfigValue label="Image Quality" value={config.imageQuality} />
              </Stack>
            </Box>
          </Stack>
        </Paper>

        {/* iOS HIG Reference */}
        <Paper sx={{ p: 3, flex: 1 }}>
          <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
            iOS HIG Typography Reference
          </Typography>

          <Stack spacing={1.5}>
            {Object.entries(iosTypographyScale).map(([name, size]) => (
              <Stack
                key={name}
                direction="row"
                justifyContent="space-between"
                alignItems="center"
                sx={{
                  p: 1,
                  borderRadius: 1,
                  bgcolor: isLight ? 'grey.50' : 'grey.900',
                }}
              >
                <Typography
                  sx={{
                    fontSize: size,
                    fontWeight: name === 'headline' ? 600 : 400,
                    textTransform: 'capitalize',
                  }}
                >
                  {name.replace(/([A-Z])/g, ' $1').trim()}
                </Typography>
                <Chip label={size} size="small" variant="outlined" />
              </Stack>
            ))}
          </Stack>
        </Paper>

        {/* Compliance Checklist */}
        <Paper sx={{ p: 3, minWidth: 280 }}>
          <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
            iOS HIG Compliance
          </Typography>

          <Stack spacing={1}>
            {complianceChecklist.map((item) => (
              <Card
                key={item.id}
                variant="outlined"
                sx={{
                  cursor: 'pointer',
                  bgcolor: checkedItems.has(item.id)
                    ? isLight ? 'success.light' : 'success.dark'
                    : 'transparent',
                  transition: 'all 0.2s ease',
                }}
                onClick={() => toggleCheckItem(item.id)}
              >
                <CardContent sx={{ py: 1, px: 2, '&:last-child': { pb: 1 } }}>
                  <Stack direction="row" alignItems="center" spacing={1}>
                    {checkedItems.has(item.id) ? (
                      <Check size={16} color="#22c55e" />
                    ) : (
                      <X size={16} color="#94a3b8" />
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
            ))}
          </Stack>

          <Box sx={{ mt: 2, p: 2, bgcolor: isLight ? 'grey.100' : 'grey.800', borderRadius: 2 }}>
            <Typography variant="body2" sx={{ fontWeight: 600 }}>
              {checkedItems.size}/{complianceChecklist.length} Passed
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
                  width: `${(checkedItems.size / complianceChecklist.length) * 100}%`,
                  bgcolor: 'success.main',
                  transition: 'width 0.3s ease',
                }}
              />
            </Box>
          </Box>
        </Paper>
      </Stack>

      {/* Device Frame Preview Info */}
      <Paper sx={{ p: 3, mt: 4 }}>
        <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
          Selected Device: {deviceInfo.name}
        </Typography>
        <Stack direction="row" spacing={4}>
          <Box>
            <Typography variant="caption" color="text.secondary">Viewport</Typography>
            <Typography variant="body1" sx={{ fontWeight: 600 }}>
              {deviceInfo.width} × {deviceInfo.height}
            </Typography>
          </Box>
          <Box>
            <Typography variant="caption" color="text.secondary">DPR</Typography>
            <Typography variant="body1" sx={{ fontWeight: 600 }}>
              {deviceInfo.dpr}×
            </Typography>
          </Box>
          <Box>
            <Typography variant="caption" color="text.secondary">Physical Resolution</Typography>
            <Typography variant="body1" sx={{ fontWeight: 600 }}>
              {deviceInfo.width * deviceInfo.dpr} × {deviceInfo.height * deviceInfo.dpr}
            </Typography>
          </Box>
        </Stack>

        <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
          Use browser DevTools to test at this viewport size. Open DevTools → Toggle device toolbar → Set dimensions to {deviceInfo.width}×{deviceInfo.height}.
        </Typography>
      </Paper>

      {/* Console Commands */}
      <Paper sx={{ p: 3, mt: 3, bgcolor: isLight ? 'grey.900' : 'grey.900' }}>
        <Typography variant="subtitle2" sx={{ color: 'grey.400', mb: 1 }}>
          Console Commands
        </Typography>
        <Typography
          component="pre"
          sx={{
            fontFamily: 'monospace',
            fontSize: '0.875rem',
            color: '#22c55e',
            overflow: 'auto',
          }}
        >
{`// Switch variants in browser console:
window.featureFlags.enable('AB_GRID_VARIANT', 'control')
window.featureFlags.enable('AB_GRID_VARIANT', 'ios-hig')
window.featureFlags.enable('AB_GRID_VARIANT', 'premium')

// View current flags:
window.featureFlags.list()`}
        </Typography>
      </Paper>
    </Box>
  );
}

// Helper component for config values
function ConfigValue({
  label,
  value,
  highlight = false,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <Box
      sx={{
        px: 1.5,
        py: 0.75,
        borderRadius: 1,
        bgcolor: highlight ? 'success.light' : 'action.hover',
        border: highlight ? '1px solid' : 'none',
        borderColor: 'success.main',
      }}
    >
      <Typography variant="caption" color="text.secondary" display="block">
        {label}
      </Typography>
      <Typography variant="body2" sx={{ fontWeight: 600, fontFamily: 'monospace' }}>
        {value}
      </Typography>
    </Box>
  );
}
