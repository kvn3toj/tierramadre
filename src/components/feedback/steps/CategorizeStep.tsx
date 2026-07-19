/**
 * CategorizeStep - Issue Categorization Step
 *
 * Select issue category and priority.
 */

import {
  Box,
  Typography,
  Stack,
  Chip,
  ToggleButtonGroup,
  ToggleButton,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import { alpha } from '@mui/material/styles';
import { Button } from '../../../design-system/components/Button';
import { emeraldCore } from '../../../design-system/tokens/colors';
import {
  type FeedbackCategory,
  type FeedbackPriority,
  CATEGORY_OPTIONS,
  PRIORITY_OPTIONS,
} from '../../../types/feedback';

interface CategorizeStepProps {
  category: FeedbackCategory | null;
  priority: FeedbackPriority;
  onCategoryChange: (category: FeedbackCategory) => void;
  onPriorityChange: (priority: FeedbackPriority) => void;
  onNext: () => void;
  onBack: () => void;
}

export default function CategorizeStep({
  category,
  priority,
  onCategoryChange,
  onPriorityChange,
  onNext,
  onBack,
}: CategorizeStepProps) {
  const canProceed = category !== null;

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, flex: 1 }}>
      {/* Chatbot message */}
      <Box
        sx={{
          bgcolor: alpha(emeraldCore.primary, 0.1),
          borderRadius: 2,
          px: 2,
          py: 1.5,
          border: `1px solid ${alpha(emeraldCore.primary, 0.2)}`,
        }}
      >
        <Typography sx={{ color: 'white', fontSize: '0.9rem' }}>
          <strong>¿Qué tipo de problema es?</strong>
        </Typography>
      </Box>

      {/* Category selection */}
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
        {CATEGORY_OPTIONS.map((opt) => (
          <Chip
            key={opt.value}
            label={
              <Box
                sx={{ display: 'flex', alignItems: 'center', gap: 1, py: 0.5 }}
              >
                <span style={{ fontSize: '1.2rem' }}>{opt.icon}</span>
                <Box>
                  <Typography
                    sx={{
                      fontWeight: 600,
                      fontSize: '0.95rem',
                      color:
                        category === opt.value ? emeraldCore.darkest : 'white',
                    }}
                  >
                    {opt.label}
                  </Typography>
                  <Typography
                    sx={{
                      fontSize: '0.75rem',
                      color:
                        category === opt.value
                          ? alpha(emeraldCore.darkest, 0.7)
                          : alpha('#fff', 0.6),
                    }}
                  >
                    {opt.description}
                  </Typography>
                </Box>
              </Box>
            }
            onClick={() => onCategoryChange(opt.value)}
            sx={{
              height: 'auto',
              borderRadius: 2,
              px: 1,
              justifyContent: 'flex-start',
              bgcolor:
                category === opt.value
                  ? emeraldCore.primary
                  : alpha('#fff', 0.05),
              border: `1px solid ${
                category === opt.value
                  ? emeraldCore.primary
                  : alpha('#fff', 0.1)
              }`,
              '&:hover': {
                bgcolor:
                  category === opt.value
                    ? emeraldCore.dark
                    : alpha('#fff', 0.1),
              },
              '& .MuiChip-label': {
                p: 1,
                width: '100%',
              },
            }}
          />
        ))}
      </Box>

      {/* Priority selection */}
      <Box>
        <Typography
          sx={{
            color: alpha('#fff', 0.7),
            fontSize: '0.85rem',
            mb: 1,
          }}
        >
          Prioridad:
        </Typography>
        <ToggleButtonGroup
          value={priority}
          exclusive
          onChange={(_, value) => value && onPriorityChange(value)}
          size="small"
          sx={{ width: '100%' }}
        >
          {PRIORITY_OPTIONS.map((opt) => (
            <ToggleButton
              key={opt.value}
              value={opt.value}
              sx={{
                flex: 1,
                color: alpha('#fff', 0.7),
                borderColor: alpha('#fff', 0.2),
                '&.Mui-selected': {
                  bgcolor: alpha(opt.color, 0.2),
                  color: opt.color,
                  borderColor: opt.color,
                  '&:hover': {
                    bgcolor: alpha(opt.color, 0.3),
                  },
                },
              }}
            >
              {opt.label}
            </ToggleButton>
          ))}
        </ToggleButtonGroup>
      </Box>

      {/* Action buttons */}
      <Stack
        direction="row"
        spacing={1}
        justifyContent="space-between"
        sx={{ mt: 'auto' }}
      >
        <Button variant="plain" startIcon={<ArrowBackIcon />} onClick={onBack}>
          Atrás
        </Button>
        <Button
          variant="primary"
          endIcon={<ArrowForwardIcon />}
          onClick={onNext}
          disabled={!canProceed}
        >
          Siguiente
        </Button>
      </Stack>
    </Box>
  );
}
