/**
 * AnnotateStep - Screenshot Annotation Step
 *
 * Allows user to draw a highlight box on the screenshot.
 */

import { useState, useRef, useCallback, useEffect } from 'react';
import { Box, Typography, Button, Stack } from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import SkipNextIcon from '@mui/icons-material/SkipNext';
import RestartAltIcon from '@mui/icons-material/RestartAlt';
import { alpha } from '@mui/material/styles';
import { emeraldCore } from '../../../design-system/tokens/colors';
import type { HighlightBox } from '../../../types/feedback';

interface AnnotateStepProps {
  screenshot: string;
  highlightBox: HighlightBox | null;
  onHighlight: (box: HighlightBox | null) => void;
  onNext: () => void;
  onBack: () => void;
  onSkip: () => void;
}

export default function AnnotateStep({
  screenshot,
  highlightBox,
  onHighlight,
  onNext,
  onBack,
  onSkip,
}: AnnotateStepProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [startPos, setStartPos] = useState({ x: 0, y: 0 });
  const [currentBox, setCurrentBox] = useState<HighlightBox | null>(highlightBox);

  // Update parent when box changes
  useEffect(() => {
    onHighlight(currentBox);
  }, [currentBox, onHighlight]);

  // Get position relative to container
  const getRelativePos = useCallback(
    (e: React.MouseEvent | React.TouchEvent) => {
      if (!containerRef.current) return { x: 0, y: 0 };

      const rect = containerRef.current.getBoundingClientRect();
      const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
      const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

      return {
        x: ((clientX - rect.left) / rect.width) * 100,
        y: ((clientY - rect.top) / rect.height) * 100,
      };
    },
    []
  );

  // Mouse/touch handlers
  const handleStart = useCallback(
    (e: React.MouseEvent | React.TouchEvent) => {
      const pos = getRelativePos(e);
      setStartPos(pos);
      setIsDrawing(true);
      setCurrentBox(null);
    },
    [getRelativePos]
  );

  const handleMove = useCallback(
    (e: React.MouseEvent | React.TouchEvent) => {
      if (!isDrawing) return;

      const pos = getRelativePos(e);
      setCurrentBox({
        x: Math.min(startPos.x, pos.x),
        y: Math.min(startPos.y, pos.y),
        width: Math.abs(pos.x - startPos.x),
        height: Math.abs(pos.y - startPos.y),
      });
    },
    [isDrawing, startPos, getRelativePos]
  );

  const handleEnd = useCallback(() => {
    setIsDrawing(false);
  }, []);

  // Reset annotation
  const handleReset = useCallback(() => {
    setCurrentBox(null);
    onHighlight(null);
  }, [onHighlight]);

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
          <strong>Arrastra para marcar</strong> el área con el problema.
          {currentBox && ' Puedes ajustarlo o reiniciar.'}
        </Typography>
      </Box>

      {/* Screenshot with annotation canvas */}
      <Box
        ref={containerRef}
        onMouseDown={handleStart}
        onMouseMove={handleMove}
        onMouseUp={handleEnd}
        onMouseLeave={handleEnd}
        onTouchStart={handleStart}
        onTouchMove={handleMove}
        onTouchEnd={handleEnd}
        sx={{
          position: 'relative',
          borderRadius: 2,
          overflow: 'hidden',
          cursor: 'crosshair',
          border: `2px solid ${alpha(emeraldCore.primary, 0.3)}`,
          touchAction: 'none',
          flex: 1,
          minHeight: 200,
          maxHeight: 350,
        }}
      >
        {/* Screenshot image */}
        <img
          src={screenshot}
          alt="Screenshot"
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'contain',
            display: 'block',
            pointerEvents: 'none',
          }}
          draggable={false}
        />

        {/* Highlight box overlay */}
        {currentBox && (
          <Box
            sx={{
              position: 'absolute',
              left: `${currentBox.x}%`,
              top: `${currentBox.y}%`,
              width: `${currentBox.width}%`,
              height: `${currentBox.height}%`,
              border: `3px solid ${emeraldCore.vibrant}`,
              bgcolor: alpha(emeraldCore.primary, 0.2),
              borderRadius: 1,
              pointerEvents: 'none',
              boxShadow: `0 0 0 9999px ${alpha('#000', 0.3)}`,
            }}
          />
        )}
      </Box>

      {/* Action buttons */}
      <Stack direction="row" spacing={1} justifyContent="space-between">
        <Button
          startIcon={<ArrowBackIcon />}
          onClick={onBack}
          sx={{ color: alpha('#fff', 0.7) }}
        >
          Atrás
        </Button>

        <Stack direction="row" spacing={1}>
          {currentBox && (
            <Button
              startIcon={<RestartAltIcon />}
              onClick={handleReset}
              sx={{ color: alpha('#fff', 0.5) }}
            >
              Reiniciar
            </Button>
          )}
          <Button
            startIcon={<SkipNextIcon />}
            onClick={onSkip}
            sx={{ color: alpha('#fff', 0.5) }}
          >
            Omitir
          </Button>
          <Button
            variant="contained"
            endIcon={<ArrowForwardIcon />}
            onClick={onNext}
            sx={{
              bgcolor: emeraldCore.primary,
              '&:hover': { bgcolor: emeraldCore.dark },
            }}
          >
            Siguiente
          </Button>
        </Stack>
      </Stack>
    </Box>
  );
}
