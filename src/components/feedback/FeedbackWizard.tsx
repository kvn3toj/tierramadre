/**
 * FeedbackWizard - Chatbot-style Feedback Modal
 *
 * Step-by-step wizard for collecting admin feedback:
 * 1. Capture screenshot (manual mode with floating button)
 * 2. Annotate with highlight box
 * 3. Categorize issue type
 * 4. Describe the problem
 * 5. Success confirmation
 */

import { useState, useCallback } from 'react';
import {
  Dialog,
  DialogContent,
  Box,
  Typography,
  IconButton,
  LinearProgress,
  Slide,
  Portal,
} from '@mui/material';
import { TransitionProps } from '@mui/material/transitions';
import CloseIcon from '@mui/icons-material/Close';
import { alpha } from '@mui/material/styles';
import { forwardRef } from 'react';
import { useLocation } from 'react-router-dom';
import { useGoogleAuth } from '../../contexts/GoogleAuthContext';
import { emeraldCore } from '../../design-system/tokens/colors';
import { blurValues } from '../../design-system';
import type {
  WizardStep,
  FeedbackCategory,
  FeedbackPriority,
  HighlightBox,
} from '../../types/feedback';

// Wizard steps
import CaptureStep from './steps/CaptureStep';
import AnnotateStep from './steps/AnnotateStep';
import CategorizeStep from './steps/CategorizeStep';
import DescribeStep from './steps/DescribeStep';
import SuccessStep from './steps/SuccessStep';
import FloatingCaptureButton from './FloatingCaptureButton';

// =============================================================================
// TYPES
// =============================================================================

interface FeedbackWizardProps {
  open: boolean;
  onClose: () => void;
  onCaptureStart?: () => void; // Called when capture mode starts (to close parent menus)
}

interface WizardState {
  step: WizardStep;
  screenshot: string | null;
  highlightBox: HighlightBox | null;
  category: FeedbackCategory | null;
  priority: FeedbackPriority;
  description: string;
  isSubmitting: boolean;
  submittedId: string | null;
  error: string | null;
  isCaptureMode: boolean; // When true, dialog is hidden and floating button is shown
}

// =============================================================================
// TRANSITION
// =============================================================================

const Transition = forwardRef(function Transition(
  props: TransitionProps & { children: React.ReactElement },
  ref: React.Ref<unknown>,
) {
  return <Slide direction="up" ref={ref} {...props} />;
});

// =============================================================================
// STEP CONFIG
// =============================================================================

const STEPS: WizardStep[] = [
  'capture',
  'annotate',
  'categorize',
  'describe',
  'success',
];

const STEP_PROGRESS: Record<WizardStep, number> = {
  capture: 20,
  annotate: 40,
  categorize: 60,
  describe: 80,
  success: 100,
};

// =============================================================================
// COMPONENT
// =============================================================================

export default function FeedbackWizard({
  open,
  onClose,
  onCaptureStart,
}: FeedbackWizardProps) {
  const location = useLocation();
  const { user } = useGoogleAuth();

  const [state, setState] = useState<WizardState>({
    step: 'capture',
    screenshot: null,
    highlightBox: null,
    category: null,
    priority: 'medium',
    description: '',
    isSubmitting: false,
    submittedId: null,
    error: null,
    isCaptureMode: false,
  });

  // Reset wizard state
  const resetWizard = useCallback(() => {
    setState({
      step: 'capture',
      screenshot: null,
      highlightBox: null,
      category: null,
      priority: 'medium',
      description: '',
      isSubmitting: false,
      submittedId: null,
      error: null,
      isCaptureMode: false,
    });
  }, []);

  // Start capture mode - hide dialog, show floating button
  const startCaptureMode = useCallback(() => {
    // Notify parent to close any menus (e.g., IOSMoreSheet)
    onCaptureStart?.();
    setState((prev) => ({ ...prev, isCaptureMode: true }));
  }, [onCaptureStart]);

  // Handle capture from floating button
  const handleFloatingCapture = useCallback((screenshot: string) => {
    setState((prev) => ({
      ...prev,
      screenshot,
      isCaptureMode: false,
      step: 'annotate',
    }));
  }, []);

  // Cancel capture mode
  const handleCaptureCancel = useCallback(() => {
    setState((prev) => ({ ...prev, isCaptureMode: false }));
  }, []);

  // Navigate to next/prev step
  const goToStep = useCallback((step: WizardStep) => {
    setState((prev) => ({ ...prev, step, error: null }));
  }, []);

  const nextStep = useCallback(() => {
    const currentIndex = STEPS.indexOf(state.step);
    if (currentIndex < STEPS.length - 1) {
      goToStep(STEPS[currentIndex + 1]);
    }
  }, [state.step, goToStep]);

  const prevStep = useCallback(() => {
    const currentIndex = STEPS.indexOf(state.step);
    if (currentIndex > 0) {
      goToStep(STEPS[currentIndex - 1]);
    }
  }, [state.step, goToStep]);

  // Update state helpers
  const setScreenshot = useCallback((screenshot: string) => {
    setState((prev) => ({ ...prev, screenshot }));
  }, []);

  const setHighlightBox = useCallback((highlightBox: HighlightBox | null) => {
    setState((prev) => ({ ...prev, highlightBox }));
  }, []);

  const setCategory = useCallback((category: FeedbackCategory) => {
    setState((prev) => ({ ...prev, category }));
  }, []);

  const setPriority = useCallback((priority: FeedbackPriority) => {
    setState((prev) => ({ ...prev, priority }));
  }, []);

  const setDescription = useCallback((description: string) => {
    setState((prev) => ({ ...prev, description }));
  }, []);

  // Submit feedback
  const submitFeedback = useCallback(async () => {
    if (!state.screenshot || !state.category || !state.description.trim()) {
      setState((prev) => ({
        ...prev,
        error: 'Por favor completa todos los campos requeridos',
      }));
      return;
    }

    setState((prev) => ({ ...prev, isSubmitting: true, error: null }));

    try {
      const response = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          page: location.pathname,
          category: state.category,
          priority: state.priority,
          description: state.description,
          screenshot: state.screenshot,
          highlightBox: state.highlightBox,
          adminEmail: user?.email || '',
          adminName: user?.name || '',
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Error al enviar feedback');
      }

      setState((prev) => ({
        ...prev,
        isSubmitting: false,
        submittedId: data.id,
        step: 'success',
      }));
    } catch (error) {
      console.error('Submit feedback error:', error);
      setState((prev) => ({
        ...prev,
        isSubmitting: false,
        error:
          error instanceof Error ? error.message : 'Error al enviar feedback',
      }));
    }
  }, [state, location.pathname, user]);

  // Handle close
  const handleClose = useCallback(() => {
    resetWizard();
    onClose();
  }, [resetWizard, onClose]);

  // Render current step
  const renderStep = () => {
    switch (state.step) {
      case 'capture':
        return (
          <CaptureStep
            onCapture={(screenshot) => {
              setScreenshot(screenshot);
              nextStep();
            }}
            onClose={handleClose}
            onStartCaptureMode={startCaptureMode}
            existingScreenshot={state.screenshot}
          />
        );
      case 'annotate':
        return (
          <AnnotateStep
            screenshot={state.screenshot!}
            highlightBox={state.highlightBox}
            onHighlight={setHighlightBox}
            onNext={nextStep}
            onBack={prevStep}
            onSkip={nextStep}
          />
        );
      case 'categorize':
        return (
          <CategorizeStep
            category={state.category}
            priority={state.priority}
            onCategoryChange={setCategory}
            onPriorityChange={setPriority}
            onNext={nextStep}
            onBack={prevStep}
          />
        );
      case 'describe':
        return (
          <DescribeStep
            description={state.description}
            onChange={setDescription}
            onSubmit={submitFeedback}
            onBack={prevStep}
            isSubmitting={state.isSubmitting}
            error={state.error}
          />
        );
      case 'success':
        return (
          <SuccessStep
            feedbackId={state.submittedId!}
            onClose={handleClose}
            onViewDashboard={() => {
              handleClose();
              window.location.href = '/admin/feedback';
            }}
          />
        );
      default:
        return null;
    }
  };

  // Show floating capture button when in capture mode
  if (state.isCaptureMode && open) {
    return (
      <Portal>
        <FloatingCaptureButton
          onCapture={handleFloatingCapture}
          onCancel={handleCaptureCancel}
        />
      </Portal>
    );
  }

  return (
    <Dialog
      open={open && !state.isCaptureMode}
      onClose={state.step === 'success' ? handleClose : undefined}
      TransitionComponent={Transition}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        // Fixed dark glass surface regardless of app theme — scope --tm-*
        // tokens to dark mode locally so the canonical Button/Badge/etc.
        // consumed inside resolve correct (AA) colors either way.
        'data-theme': 'dark',
        sx: {
          borderRadius: 3,
          overflow: 'hidden',
          bgcolor: alpha('#000', 0.95),
          backdropFilter: `blur(${blurValues.xl})`,
          border: `1px solid ${alpha(emeraldCore.primary, 0.2)}`,
        },
      }}
    >
      {/* Header */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          px: 3,
          py: 2,
          borderBottom: `1px solid ${alpha(emeraldCore.primary, 0.1)}`,
        }}
      >
        <Typography
          variant="h6"
          sx={{
            color: 'white',
            fontWeight: 600,
            display: 'flex',
            alignItems: 'center',
            gap: 1,
          }}
        >
          <span role="img" aria-label="bug">
            🐛
          </span>
          Reportar Problema
        </Typography>
        <IconButton
          onClick={handleClose}
          sx={{ color: alpha('#fff', 0.7), '&:hover': { color: 'white' } }}
        >
          <CloseIcon />
        </IconButton>
      </Box>

      {/* Progress bar */}
      <LinearProgress
        variant="determinate"
        value={STEP_PROGRESS[state.step]}
        sx={{
          height: 3,
          bgcolor: alpha(emeraldCore.primary, 0.1),
          '& .MuiLinearProgress-bar': {
            bgcolor: emeraldCore.primary,
          },
        }}
      />

      {/* Content */}
      <DialogContent
        sx={{
          p: 3,
          minHeight: 300,
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {renderStep()}
      </DialogContent>
    </Dialog>
  );
}
