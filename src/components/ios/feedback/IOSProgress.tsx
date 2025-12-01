import React, { CSSProperties } from 'react';

/**
 * IOSProgress Variants
 */
export type IOSProgressVariant = 'linear' | 'circular';

/**
 * IOSProgress Sizes
 */
export type IOSProgressSize = 'small' | 'medium' | 'large';

/**
 * IOSProgress Props
 */
export interface IOSProgressProps {
  /** Progress variant */
  variant?: IOSProgressVariant;

  /** Progress value (0-100) */
  value?: number;

  /** Indeterminate (animated, no specific progress) */
  indeterminate?: boolean;

  /** Size */
  size?: IOSProgressSize;

  /** Show percentage label (linear only) */
  showLabel?: boolean;

  /** Custom label text (overrides percentage) */
  label?: string;

  /** Color */
  color?: 'emerald' | 'success' | 'warning' | 'error' | 'info';

  /** Custom className */
  className?: string;

  /** Custom inline styles */
  style?: CSSProperties;

  /** Test ID */
  'data-testid'?: string;
}

/**
 * Get color value from color prop
 */
function getColorValue(color: IOSProgressProps['color']): string {
  switch (color) {
    case 'emerald':
      return 'var(--brand-primary)';
    case 'success':
      return 'var(--status-success)';
    case 'warning':
      return 'var(--status-warning)';
    case 'error':
      return 'var(--status-error)';
    case 'info':
      return 'var(--status-info)';
    default:
      return 'var(--brand-primary)';
  }
}

/**
 * Get size value from size prop
 */
function getSizeValue(size: IOSProgressSize, variant: IOSProgressVariant): number {
  if (variant === 'circular') {
    switch (size) {
      case 'small':
        return 20;
      case 'medium':
        return 32;
      case 'large':
        return 48;
      default:
        return 32;
    }
  } else {
    // Linear height
    switch (size) {
      case 'small':
        return 4;
      case 'medium':
        return 6;
      case 'large':
        return 8;
      default:
        return 6;
    }
  }
}

/**
 * Linear Progress Component
 */
const LinearProgress: React.FC<IOSProgressProps> = ({
  value = 0,
  indeterminate = false,
  size = 'medium',
  showLabel = false,
  label,
  color = 'emerald',
  className = '',
  style = {},
  'data-testid': testId,
}) => {
  const height = getSizeValue(size, 'linear');
  const colorValue = getColorValue(color);
  const progressValue = Math.min(100, Math.max(0, value));

  // Container styles
  const containerStyles: CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    gap: 'var(--spacing-xs)',
    width: '100%',
    ...style,
  };

  // Track styles
  const trackStyles: CSSProperties = {
    position: 'relative',
    width: '100%',
    height: `${height}px`,
    backgroundColor: 'var(--border-default)',
    borderRadius: `${height / 2}px`,
    overflow: 'hidden',
  };

  // Bar styles
  const barStyles: CSSProperties = {
    position: 'absolute',
    top: 0,
    left: 0,
    height: '100%',
    backgroundColor: colorValue,
    borderRadius: `${height / 2}px`,
    transition: indeterminate ? 'none' : 'width var(--duration-normal) var(--easing-standard)',
    width: indeterminate ? '30%' : `${progressValue}%`,
  };

  // Indeterminate animation
  const indeterminateAnimation = indeterminate
    ? `
    @keyframes indeterminate {
      0% {
        left: -30%;
      }
      100% {
        left: 100%;
      }
    }
  `
    : '';

  if (indeterminate) {
    barStyles.animation = 'indeterminate 1.5s ease-in-out infinite';
  }

  // Label
  const displayLabel = label || (showLabel && !indeterminate ? `${Math.round(progressValue)}%` : null);

  return (
    <div className={`ios-progress ios-progress--linear ${className}`} style={containerStyles} data-testid={testId}>
      <style>{indeterminateAnimation}</style>

      {displayLabel && (
        <div
          style={{
            fontSize: '13px',
            color: 'var(--text-secondary)',
            fontFamily: 'var(--font-text)',
            fontWeight: 500,
          }}
        >
          {displayLabel}
        </div>
      )}

      <div style={trackStyles}>
        <div style={barStyles} />
      </div>
    </div>
  );
};

/**
 * Circular Progress Component
 */
const CircularProgress: React.FC<IOSProgressProps> = ({
  value = 0,
  indeterminate = false,
  size = 'medium',
  color = 'emerald',
  className = '',
  style = {},
  'data-testid': testId,
}) => {
  const sizeValue = getSizeValue(size, 'circular');
  const colorValue = getColorValue(color);
  const progressValue = Math.min(100, Math.max(0, value));

  const strokeWidth = size === 'small' ? 2 : size === 'large' ? 4 : 3;
  const radius = (sizeValue - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (progressValue / 100) * circumference;

  // Container styles
  const containerStyles: CSSProperties = {
    display: 'inline-flex',
    position: 'relative',
    width: `${sizeValue}px`,
    height: `${sizeValue}px`,
    ...style,
  };

  // SVG styles
  const svgStyles: CSSProperties = {
    transform: 'rotate(-90deg)', // Start from top
    width: '100%',
    height: '100%',
  };

  // Circle styles
  const circleStyles: React.SVGProps<SVGCircleElement> = {
    cx: sizeValue / 2,
    cy: sizeValue / 2,
    r: radius,
    fill: 'none',
    strokeWidth,
  };

  // Indeterminate animation
  const indeterminateAnimation = indeterminate
    ? `
    @keyframes spin {
      from {
        transform: rotate(-90deg);
      }
      to {
        transform: rotate(270deg);
      }
    }
  `
    : '';

  const animationStyles: CSSProperties = indeterminate
    ? {
        animation: 'spin 1s linear infinite',
      }
    : {};

  return (
    <div className={`ios-progress ios-progress--circular ${className}`} style={containerStyles} data-testid={testId}>
      <style>{indeterminateAnimation}</style>

      <svg style={{ ...svgStyles, ...animationStyles }}>
        {/* Background circle */}
        <circle {...circleStyles} stroke="var(--border-default)" />

        {/* Progress circle */}
        <circle
          {...circleStyles}
          stroke={colorValue}
          strokeDasharray={circumference}
          strokeDashoffset={indeterminate ? circumference * 0.75 : offset}
          strokeLinecap="round"
          style={{
            transition: indeterminate ? 'none' : 'stroke-dashoffset var(--duration-normal) var(--easing-standard)',
          }}
        />
      </svg>
    </div>
  );
};

/**
 * IOSProgress Component
 *
 * iOS-style progress indicator with linear and circular variants.
 * Supports both determinate (with value) and indeterminate (animated) modes.
 *
 * @example Linear progress
 * <IOSProgress variant="linear" value={75} showLabel />
 *
 * @example Circular indeterminate
 * <IOSProgress variant="circular" indeterminate />
 *
 * @example With custom color
 * <IOSProgress variant="linear" value={50} color="success" />
 */
export const IOSProgress: React.FC<IOSProgressProps> = ({
  variant = 'linear',
  ...props
}) => {
  if (variant === 'circular') {
    return <CircularProgress {...props} />;
  }

  return <LinearProgress {...props} />;
};

IOSProgress.displayName = 'IOSProgress';

export default IOSProgress;
