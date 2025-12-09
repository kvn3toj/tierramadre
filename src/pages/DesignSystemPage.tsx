/**
 * Tierra Madre Design System - Showcase Page
 *
 * Visual documentation of all design tokens and components.
 * Access at /design-system route.
 */

import React from 'react';
import {
  Box,
  Typography,
  Divider,
  Chip,
  IconButton,
  Avatar,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import SendIcon from '@mui/icons-material/Send';
import DeleteIcon from '@mui/icons-material/Delete';
import DiamondIcon from '@mui/icons-material/Diamond';
import FavoriteIcon from '@mui/icons-material/Favorite';

// Design System Token Imports (direct imports to avoid barrel export conflicts)
import {
  emeraldCore,
  goldAccent,
  qualityTiers,
  originColors,
  semanticColors,
  surfacesLight,
} from '../design-system/tokens/colors';
import { spacing } from '../design-system/tokens/spacing';
import { typography } from '../design-system/tokens/typography';
import { shadows } from '../design-system/tokens/shadows';
import { glass } from '../design-system/tokens/glass';
import { gradients } from '../design-system/tokens/gradients';

// Design System Component Imports
import { Button } from '../design-system/components/Button';
import { Card, CardHeader, CardContent, CardFooter } from '../design-system/components/Card';
import { VStack, HStack, Container } from '../design-system/components/Layout';

// =============================================================================
// COLOR SWATCH COMPONENT
// =============================================================================

const ColorSwatch: React.FC<{
  color: string;
  name: string;
  value: string;
}> = ({ color, name, value }) => (
  <Box sx={{ textAlign: 'center' }}>
    <Box
      sx={{
        width: 80,
        height: 80,
        borderRadius: 2,
        bgcolor: color,
        mb: 1,
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
      }}
    />
    <Typography variant="caption" sx={{ fontWeight: 600, display: 'block' }}>
      {name}
    </Typography>
    <Typography variant="caption" color="text.secondary">
      {value}
    </Typography>
  </Box>
);

// =============================================================================
// SECTION COMPONENT
// =============================================================================

const Section: React.FC<{
  title: string;
  description?: string;
  children: React.ReactNode;
}> = ({ title, description, children }) => (
  <Box sx={{ mb: 6 }}>
    <Typography variant="h4" sx={{ mb: 1, fontWeight: 700 }}>
      {title}
    </Typography>
    {description && (
      <Typography color="text.secondary" sx={{ mb: 3 }}>
        {description}
      </Typography>
    )}
    {children}
  </Box>
);

// =============================================================================
// MAIN PAGE
// =============================================================================

const DesignSystemPage: React.FC = () => {
  return (
    <Box sx={{ bgcolor: '#F9FAFB', minHeight: '100vh', py: 4 }}>
      <Container maxWidth="lg">
        {/* Header */}
        <Box sx={{ mb: 6, textAlign: 'center' }}>
          <Typography
            variant="h2"
            sx={{
              fontWeight: 700,
              background: gradients.emerald.deep,
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              mb: 2,
            }}
          >
            Tierra Madre Design System
          </Typography>
          <Typography variant="h6" color="text.secondary">
            iOS HIG compliant tokens and components for Colombian emerald commerce
          </Typography>
          <HStack spacing={2} justify="center" sx={{ mt: 2 }}>
            <Chip label="100% iOS HIG" color="primary" size="small" />
            <Chip label="WCAG 2.2 AA" variant="outlined" size="small" />
            <Chip label="TypeScript" variant="outlined" size="small" />
          </HStack>
        </Box>

        <Divider sx={{ mb: 6 }} />

        {/* =================================================================
            COLORS
        ================================================================= */}
        <Section
          title="Colors"
          description="Brand colors, quality tiers, and semantic colors"
        >
          {/* Emerald Palette */}
          <Typography variant="h6" sx={{ mb: 2 }}>
            Emerald Palette
          </Typography>
          <HStack spacing={3} wrap sx={{ mb: 4 }}>
            <ColorSwatch color={emeraldCore.lightest} name="lightest" value="#E6F7F1" />
            <ColorSwatch color={emeraldCore.lighter} name="lighter" value="#66D4AE" />
            <ColorSwatch color={emeraldCore.light} name="light" value="#33C194" />
            <ColorSwatch color={emeraldCore.primary} name="primary" value="#00AE7A" />
            <ColorSwatch color={emeraldCore.dark} name="dark" value="#008C61" />
            <ColorSwatch color={emeraldCore.darker} name="darker" value="#006A48" />
            <ColorSwatch color={emeraldCore.darkest} name="darkest" value="#004830" />
          </HStack>

          {/* Gold Palette */}
          <Typography variant="h6" sx={{ mb: 2 }}>
            Gold Accent
          </Typography>
          <HStack spacing={3} wrap sx={{ mb: 4 }}>
            <ColorSwatch color={goldAccent.lightest} name="lightest" value="#FDF8E8" />
            <ColorSwatch color={goldAccent.light} name="light" value="#E5C866" />
            <ColorSwatch color={goldAccent.primary} name="primary" value="#D4AF37" />
            <ColorSwatch color={goldAccent.dark} name="dark" value="#B8941F" />
            <ColorSwatch color={goldAccent.darkest} name="darkest" value="#665210" />
          </HStack>

          {/* Quality Tiers */}
          <Typography variant="h6" sx={{ mb: 2 }}>
            Quality Tiers
          </Typography>
          <HStack spacing={3} wrap sx={{ mb: 4 }}>
            {Object.entries(qualityTiers).map(([name, tier]) => (
              <Box key={name} sx={{ textAlign: 'center' }}>
                <Box
                  sx={{
                    width: 100,
                    height: 60,
                    borderRadius: 2,
                    background: tier.gradient,
                    mb: 1,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'white',
                    fontWeight: 600,
                    fontSize: '0.75rem',
                    boxShadow: tier.glow,
                  }}
                >
                  {tier.frequency}
                </Box>
                <Typography variant="caption" sx={{ fontWeight: 600 }}>
                  {name}
                </Typography>
              </Box>
            ))}
          </HStack>

          {/* Origin Colors */}
          <Typography variant="h6" sx={{ mb: 2 }}>
            Origin Regions
          </Typography>
          <HStack spacing={3} wrap sx={{ mb: 4 }}>
            {Object.entries(originColors).map(([key, origin]) => (
              <ColorSwatch
                key={key}
                color={origin.primary}
                name={origin.name}
                value={origin.primary}
              />
            ))}
          </HStack>

          {/* Semantic Colors */}
          <Typography variant="h6" sx={{ mb: 2 }}>
            Semantic Colors
          </Typography>
          <HStack spacing={3} wrap>
            <ColorSwatch color={semanticColors.success.main} name="success" value={semanticColors.success.main} />
            <ColorSwatch color={semanticColors.warning.main} name="warning" value={semanticColors.warning.main} />
            <ColorSwatch color={semanticColors.error.main} name="error" value={semanticColors.error.main} />
            <ColorSwatch color={semanticColors.info.main} name="info" value={semanticColors.info.main} />
          </HStack>
        </Section>

        <Divider sx={{ mb: 6 }} />

        {/* =================================================================
            TYPOGRAPHY
        ================================================================= */}
        <Section
          title="Typography"
          description="iOS Dynamic Type scale with SF Pro Display"
        >
          <VStack spacing={3} align="start">
            <Box>
              <Typography variant="caption" color="text.secondary">largeTitle - 34px / 700</Typography>
              <Typography sx={{ ...typography.largeTitle }}>The quick brown fox</Typography>
            </Box>
            <Box>
              <Typography variant="caption" color="text.secondary">title1 - 28px / 700</Typography>
              <Typography sx={{ ...typography.title1 }}>The quick brown fox</Typography>
            </Box>
            <Box>
              <Typography variant="caption" color="text.secondary">title2 - 22px / 700</Typography>
              <Typography sx={{ ...typography.title2 }}>The quick brown fox</Typography>
            </Box>
            <Box>
              <Typography variant="caption" color="text.secondary">title3 - 20px / 600</Typography>
              <Typography sx={{ ...typography.title3 }}>The quick brown fox</Typography>
            </Box>
            <Box>
              <Typography variant="caption" color="text.secondary">headline - 17px / 600</Typography>
              <Typography sx={{ ...typography.headline }}>The quick brown fox</Typography>
            </Box>
            <Box>
              <Typography variant="caption" color="text.secondary">body - 17px / 400</Typography>
              <Typography sx={{ ...typography.body }}>The quick brown fox</Typography>
            </Box>
            <Box>
              <Typography variant="caption" color="text.secondary">footnote - 13px / 400</Typography>
              <Typography sx={{ ...typography.footnote }}>The quick brown fox</Typography>
            </Box>
            <Box>
              <Typography variant="caption" color="text.secondary">caption1 - 12px / 400</Typography>
              <Typography sx={{ ...typography.caption1 }}>The quick brown fox</Typography>
            </Box>
            <Box>
              <Typography variant="caption" color="text.secondary">price (monospace)</Typography>
              <Typography sx={{ ...typography.price, color: emeraldCore.primary }}>$1,234,567 COP</Typography>
            </Box>
          </VStack>
        </Section>

        <Divider sx={{ mb: 6 }} />

        {/* =================================================================
            SPACING
        ================================================================= */}
        <Section
          title="Spacing"
          description="8pt grid system with golden ratio proportions"
        >
          <HStack spacing={4} wrap align="end">
            {Object.entries(spacing).slice(0, 8).map(([name, value]) => (
              <VStack key={name} spacing={1} align="center">
                <Box
                  sx={{
                    width: value,
                    height: value,
                    bgcolor: emeraldCore.primary,
                    borderRadius: 1,
                  }}
                />
                <Typography variant="caption" sx={{ fontWeight: 600 }}>{name}</Typography>
                <Typography variant="caption" color="text.secondary">{value}px</Typography>
              </VStack>
            ))}
          </HStack>
        </Section>

        <Divider sx={{ mb: 6 }} />

        {/* =================================================================
            SHADOWS
        ================================================================= */}
        <Section
          title="Shadows"
          description="iOS-style soft shadows with emerald-tinted variants"
        >
          <HStack spacing={4} wrap>
            {['xs', 'sm', 'md', 'lg', 'xl'].map((size) => (
              <VStack key={size} spacing={1} align="center">
                <Box
                  sx={{
                    width: 80,
                    height: 80,
                    bgcolor: 'white',
                    borderRadius: 2,
                    boxShadow: shadows.default[size as keyof typeof shadows.default],
                  }}
                />
                <Typography variant="caption" sx={{ fontWeight: 600 }}>{size}</Typography>
              </VStack>
            ))}
          </HStack>

          <Typography variant="subtitle2" sx={{ mt: 4, mb: 2 }}>
            Emerald Tinted
          </Typography>
          <HStack spacing={4} wrap>
            {['sm', 'md', 'lg', 'primary', 'glow'].map((size) => (
              <VStack key={size} spacing={1} align="center">
                <Box
                  sx={{
                    width: 80,
                    height: 80,
                    bgcolor: 'white',
                    borderRadius: 2,
                    boxShadow: shadows.emerald[size as keyof typeof shadows.emerald],
                  }}
                />
                <Typography variant="caption" sx={{ fontWeight: 600 }}>{size}</Typography>
              </VStack>
            ))}
          </HStack>
        </Section>

        <Divider sx={{ mb: 6 }} />

        {/* =================================================================
            GLASSMORPHISM
        ================================================================= */}
        <Section
          title="Glassmorphism"
          description="iOS-style translucent materials with backdrop blur"
        >
          <Box
            sx={{
              background: gradients.emerald.medium,
              borderRadius: 3,
              p: 4,
              position: 'relative',
              overflow: 'hidden',
            }}
          >
            <HStack spacing={4} wrap>
              {['default', 'frosted', 'ultraThin'].map((variant) => {
                const glassEffect = glass.light[variant];
                return (
                  <VStack key={variant} spacing={1} align="center">
                    <Box
                      sx={{
                        width: 120,
                        height: 80,
                        borderRadius: 2,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        ...glassEffect,
                      }}
                    >
                      <Typography variant="caption" sx={{ fontWeight: 600, color: 'white' }}>
                        {variant}
                      </Typography>
                    </Box>
                  </VStack>
                );
              })}
            </HStack>
          </Box>
        </Section>

        <Divider sx={{ mb: 6 }} />

        {/* =================================================================
            BUTTONS
        ================================================================= */}
        <Section
          title="Buttons"
          description="4 variants (primary, secondary, tertiary, danger) x 3 sizes"
        >
          {/* Variants */}
          <Typography variant="subtitle2" sx={{ mb: 2 }}>
            Variants
          </Typography>
          <HStack spacing={2} wrap sx={{ mb: 4 }}>
            <Button variant="primary">Primary</Button>
            <Button variant="secondary">Secondary</Button>
            <Button variant="tertiary">Tertiary</Button>
            <Button variant="danger">Danger</Button>
          </HStack>

          {/* Sizes */}
          <Typography variant="subtitle2" sx={{ mb: 2 }}>
            Sizes
          </Typography>
          <HStack spacing={2} align="center" wrap sx={{ mb: 4 }}>
            <Button size="sm">Small</Button>
            <Button size="md">Medium</Button>
            <Button size="lg">Large</Button>
          </HStack>

          {/* With Icons */}
          <Typography variant="subtitle2" sx={{ mb: 2 }}>
            With Icons
          </Typography>
          <HStack spacing={2} wrap sx={{ mb: 4 }}>
            <Button startIcon={<AddIcon />}>Add Item</Button>
            <Button variant="secondary" endIcon={<SendIcon />}>Send</Button>
            <Button variant="danger" startIcon={<DeleteIcon />}>Delete</Button>
          </HStack>

          {/* States */}
          <Typography variant="subtitle2" sx={{ mb: 2 }}>
            States
          </Typography>
          <HStack spacing={2} wrap>
            <Button loading>Loading</Button>
            <Button disabled>Disabled</Button>
            <Button fullWidth>Full Width</Button>
          </HStack>
        </Section>

        <Divider sx={{ mb: 6 }} />

        {/* =================================================================
            CARDS
        ================================================================= */}
        <Section
          title="Cards"
          description="3 variants (elevated, outlined, filled) with compound pattern"
        >
          <HStack spacing={4} wrap align="start">
            {/* Elevated Card */}
            <Card variant="elevated" sx={{ width: 280 }}>
              <CardHeader
                title="Elevated Card"
                subtitle="With shadow"
                avatar={<Avatar sx={{ bgcolor: emeraldCore.primary }}><DiamondIcon /></Avatar>}
              />
              <CardContent>
                <Typography variant="body2" color="text.secondary">
                  Cards elevados usan sombras sutiles para crear profundidad visual.
                </Typography>
              </CardContent>
              <CardFooter>
                <Button size="sm" variant="tertiary">Action</Button>
              </CardFooter>
            </Card>

            {/* Outlined Card */}
            <Card variant="outlined" sx={{ width: 280 }}>
              <CardHeader
                title="Outlined Card"
                subtitle="With border"
              />
              <CardContent>
                <Typography variant="body2" color="text.secondary">
                  Cards con borde son ideales para listas y contenido secundario.
                </Typography>
              </CardContent>
              <CardFooter>
                <Button size="sm" variant="tertiary">Action</Button>
              </CardFooter>
            </Card>

            {/* Filled Card */}
            <Card variant="filled" sx={{ width: 280 }}>
              <CardHeader
                title="Filled Card"
                subtitle="Solid background"
              />
              <CardContent>
                <Typography variant="body2" color="text.secondary">
                  Cards rellenos usan un fondo sólido para destacar secciones.
                </Typography>
              </CardContent>
              <CardFooter>
                <Button size="sm" variant="tertiary">Action</Button>
              </CardFooter>
            </Card>

            {/* Interactive Card */}
            <Card
              variant="elevated"
              interactive
              onClick={() => alert('Card clicked!')}
              sx={{ width: 280 }}
            >
              <CardHeader
                title="Clickable Card"
                action={<IconButton size="small"><FavoriteIcon /></IconButton>}
              />
              <CardContent>
                <Typography variant="body2" color="text.secondary">
                  Haz click en esta card. El efecto hover y focus son automáticos.
                </Typography>
              </CardContent>
            </Card>
          </HStack>
        </Section>

        <Divider sx={{ mb: 6 }} />

        {/* =================================================================
            LAYOUT
        ================================================================= */}
        <Section
          title="Layout Components"
          description="Primitivos de layout: Stack (VStack/HStack) y Container"
        >
          {/* VStack Demo */}
          <Typography variant="subtitle2" sx={{ mb: 2 }}>
            VStack (Vertical Stack)
          </Typography>
          <Box sx={{ bgcolor: surfacesLight.background.tertiary, p: 2, borderRadius: 2, mb: 4, maxWidth: 200 }}>
            <VStack spacing={2}>
              <Box sx={{ p: 2, bgcolor: emeraldCore.light, borderRadius: 1, color: 'white' }}>Item 1</Box>
              <Box sx={{ p: 2, bgcolor: emeraldCore.primary, borderRadius: 1, color: 'white' }}>Item 2</Box>
              <Box sx={{ p: 2, bgcolor: emeraldCore.dark, borderRadius: 1, color: 'white' }}>Item 3</Box>
            </VStack>
          </Box>

          {/* HStack Demo */}
          <Typography variant="subtitle2" sx={{ mb: 2 }}>
            HStack (Horizontal Stack)
          </Typography>
          <Box sx={{ bgcolor: surfacesLight.background.tertiary, p: 2, borderRadius: 2, mb: 4 }}>
            <HStack spacing={2} justify="space-between">
              <Box sx={{ p: 2, bgcolor: emeraldCore.light, borderRadius: 1, color: 'white' }}>Left</Box>
              <Box sx={{ p: 2, bgcolor: emeraldCore.primary, borderRadius: 1, color: 'white' }}>Center</Box>
              <Box sx={{ p: 2, bgcolor: emeraldCore.dark, borderRadius: 1, color: 'white' }}>Right</Box>
            </HStack>
          </Box>

          {/* Container Demo */}
          <Typography variant="subtitle2" sx={{ mb: 2 }}>
            Container (Max-width)
          </Typography>
          <Box sx={{ bgcolor: surfacesLight.background.tertiary, p: 2, borderRadius: 2 }}>
            <Container maxWidth="sm">
              <Box sx={{ p: 2, bgcolor: emeraldCore.lightest, borderRadius: 1, textAlign: 'center' }}>
                <Typography variant="body2">Container maxWidth="sm" (600px)</Typography>
              </Box>
            </Container>
          </Box>
        </Section>

        <Divider sx={{ mb: 6 }} />

        {/* =================================================================
            GRADIENTS
        ================================================================= */}
        <Section
          title="Gradients"
          description="Emerald-inspired gradients for buttons, cards, and backgrounds"
        >
          <HStack spacing={3} wrap>
            {Object.entries(gradients.emerald).map(([name, gradient]) => (
              <VStack key={name} spacing={1} align="center">
                <Box
                  sx={{
                    width: 120,
                    height: 60,
                    borderRadius: 2,
                    background: gradient,
                    boxShadow: shadows.default.sm,
                  }}
                />
                <Typography variant="caption" sx={{ fontWeight: 600 }}>{name}</Typography>
              </VStack>
            ))}
          </HStack>

          <Typography variant="subtitle2" sx={{ mt: 4, mb: 2 }}>
            Button Gradients
          </Typography>
          <HStack spacing={3} wrap>
            {['primary', 'secondary', 'danger'].map((name) => (
              <VStack key={name} spacing={1} align="center">
                <Box
                  sx={{
                    width: 120,
                    height: 40,
                    borderRadius: 2,
                    background: gradients.button[name as keyof typeof gradients.button],
                    boxShadow: shadows.default.sm,
                  }}
                />
                <Typography variant="caption" sx={{ fontWeight: 600 }}>{name}</Typography>
              </VStack>
            ))}
          </HStack>
        </Section>

        {/* Footer */}
        <Box sx={{ textAlign: 'center', mt: 8, mb: 4 }}>
          <Typography variant="caption" color="text.secondary">
            Maintained by ARIA + MOKSART + EUNOIA | December 2025
          </Typography>
        </Box>
      </Container>
    </Box>
  );
};

export default DesignSystemPage;
