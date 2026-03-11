/**
 * DescribeStep - Issue Description Step
 *
 * Text input for describing the problem.
 */

import { Box, Typography, Button, Stack, TextField, Alert, CircularProgress } from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import SendIcon from '@mui/icons-material/Send';
import { alpha } from '@mui/material/styles';
import { useLanguage } from '../../../contexts/LanguageContext';
import { emeraldCore } from '../../../design-system/tokens/colors';

interface DescribeStepProps {
  description: string;
  onChange: (description: string) => void;
  onSubmit: () => void;
  onBack: () => void;
  isSubmitting: boolean;
  error: string | null;
}

export default function DescribeStep({
  description,
  onChange,
  onSubmit,
  onBack,
  isSubmitting,
  error,
}: DescribeStepProps) {
  const { t } = useLanguage();
  const canSubmit = description.trim().length >= 10;

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, flex: 1 }}>
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
          <strong>Describe el problema.</strong>
          <br />
          ¿Qué esperabas que pasara? ¿Qué pasó en realidad?
        </Typography>
      </Box>

      {/* Description input */}
      <TextField
        multiline
        rows={5}
        value={description}
        onChange={(e) => onChange(e.target.value)}
        placeholder={t.feedback.exampleDescription}
        sx={{
          flex: 1,
          '& .MuiOutlinedInput-root': {
            bgcolor: alpha('#fff', 0.05),
            color: 'white',
            '& fieldset': {
              borderColor: alpha('#fff', 0.2),
            },
            '&:hover fieldset': {
              borderColor: alpha(emeraldCore.primary, 0.5),
            },
            '&.Mui-focused fieldset': {
              borderColor: emeraldCore.primary,
            },
          },
          '& .MuiInputBase-input::placeholder': {
            color: alpha('#fff', 0.4),
            opacity: 1,
          },
        }}
      />

      {/* Character count hint */}
      <Typography
        sx={{
          color: description.length < 10 ? alpha('#fff', 0.4) : emeraldCore.light,
          fontSize: '0.75rem',
          textAlign: 'right',
        }}
      >
        {description.length < 10
          ? `Mínimo 10 caracteres (${description.length}/10)`
          : `${description.length} caracteres`}
      </Typography>

      {/* Error message */}
      {error && (
        <Alert severity="error" sx={{ py: 0.5 }}>
          {error}
        </Alert>
      )}

      {/* Action buttons */}
      <Stack direction="row" spacing={1} justifyContent="space-between">
        <Button
          startIcon={<ArrowBackIcon />}
          onClick={onBack}
          disabled={isSubmitting}
          sx={{ color: alpha('#fff', 0.7) }}
        >
          Atrás
        </Button>
        <Button
          variant="contained"
          endIcon={
            isSubmitting ? (
              <CircularProgress size={18} color="inherit" />
            ) : (
              <SendIcon />
            )
          }
          onClick={onSubmit}
          disabled={!canSubmit || isSubmitting}
          sx={{
            bgcolor: emeraldCore.primary,
            '&:hover': { bgcolor: emeraldCore.dark },
            '&:disabled': {
              bgcolor: alpha(emeraldCore.primary, 0.3),
              color: alpha('#fff', 0.5),
            },
          }}
        >
          {isSubmitting ? t.feedback.submitting : t.feedback.send}
        </Button>
      </Stack>
    </Box>
  );
}
