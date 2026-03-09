/**
 * ImageWatermark Component
 * Displays a logo watermark overlay on images with 0.2 opacity.
 * Used for loading states and products without images.
 */
import { Box } from '@mui/material';
import { zIndex } from '../../design-system';
import logoSymbol from '../../assets/logo-symbol.png';

interface ImageWatermarkProps {
  /** Position of the watermark */
  position?: 'center' | 'bottom-right' | 'bottom-left';
  /** Size of the watermark (percentage of container width) */
  size?: 'small' | 'medium' | 'large';
  /** Custom opacity (default: 0.2) */
  opacity?: number;
}

const sizeMap = {
  small: '15%',
  medium: '25%',
  large: '35%',
};

const positionMap = {
  center: {
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
  },
  'bottom-right': {
    bottom: '8%',
    right: '8%',
    transform: 'none',
  },
  'bottom-left': {
    bottom: '8%',
    left: '8%',
    transform: 'none',
  },
};

export default function ImageWatermark({
  position = 'center',
  size = 'medium',
  opacity = 0.2,
}: ImageWatermarkProps) {
  const posStyles = positionMap[position];

  return (
    <Box
      component="img"
      src={logoSymbol}
      alt=""
      aria-hidden="true"
      draggable={false}
      onContextMenu={(e) => e.preventDefault()}
      sx={{
        position: 'absolute',
        ...posStyles,
        width: sizeMap[size],
        maxWidth: 120,
        minWidth: 32,
        height: 'auto',
        opacity,
        pointerEvents: 'none',
        userSelect: 'none',
        zIndex: zIndex.base,
        filter: 'brightness(1.1) contrast(0.9)',
      }}
    />
  );
}
