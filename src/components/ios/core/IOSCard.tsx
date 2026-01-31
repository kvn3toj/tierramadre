import React, { CSSProperties, ReactNode } from 'react';

/**
 * IOSCard Variants
 * - elevated: Standard card with shadow
 * - glass: Classic glassmorphic card with backdrop blur
 * - flat: Flat card with border only
 * - liquidGlass: iOS 26 Liquid Glass with dynamic blur and specular highlights
 */
export type IOSCardVariant = 'elevated' | 'glass' | 'flat' | 'liquidGlass';

/**
 * IOSCard Padding Sizes
 */
export type IOSCardPadding = 'none' | 'sm' | 'md' | 'lg';

/**
 * IOSCard Props
 */
export interface IOSCardProps {
  /** Card content */
  children: ReactNode;

  /** Visual variant */
  variant?: IOSCardVariant;

  /** Internal padding */
  padding?: IOSCardPadding;

  /** Optional header section */
  header?: ReactNode;

  /** Optional footer section */
  footer?: ReactNode;

  /** Full width */
  fullWidth?: boolean;

  /** Interactive (clickable) */
  interactive?: boolean;

  /** Click handler (makes card interactive automatically) */
  onClick?: () => void;

  /** Hover handler */
  onHover?: () => void;

  /** Custom className */
  className?: string;

  /** Custom inline styles */
  style?: CSSProperties;

  /** Disabled state */
  disabled?: boolean;

  /** Test ID */
  'data-testid'?: string;
}

/**
 * Get padding value from size
 */
function getPaddingValue(size: IOSCardPadding): string {
  switch (size) {
    case 'none':
      return '0';
    case 'sm':
      return 'var(--spacing-sm)'; // 12px
    case 'md':
      return 'var(--spacing-md)'; // 16px
    case 'lg':
      return 'var(--spacing-lg)'; // 20px
    default:
      return 'var(--spacing-md)';
  }
}

/**
 * IOSCard Component
 *
 * iOS-style card component with three visual variants:
 * - elevated: Standard card with shadow
 * - glass: Glassmorphic card with backdrop blur
 * - flat: Flat card with border only
 *
 * @example
 * <IOSCard variant="elevated" padding="md">
 *   <h3>Card Title</h3>
 *   <p>Card content goes here</p>
 * </IOSCard>
 *
 * @example Glass variant
 * <IOSCard variant="glass" padding="lg">
 *   <p>Frosted glass effect with blur</p>
 * </IOSCard>
 */
export const IOSCard: React.FC<IOSCardProps> = ({
  children,
  variant = 'elevated',
  padding = 'md',
  header,
  footer,
  fullWidth = false,
  interactive = false,
  onClick,
  onHover,
  className = '',
  style = {},
  disabled = false,
  'data-testid': testId,
}) => {
  const isInteractive = interactive || !!onClick;

  // Base styles
  const baseStyles: CSSProperties = {
    borderRadius: 'var(--border-radius-md)', // 12px iOS standard
    transition: `all var(--duration-normal) var(--easing-standard)`,
    position: 'relative',
    overflow: 'hidden',
    width: fullWidth ? '100%' : 'auto',
    opacity: disabled ? 0.4 : 1,
    cursor: disabled ? 'not-allowed' : isInteractive ? 'pointer' : 'default',
    pointerEvents: disabled ? 'none' : 'auto',
  };

  // Variant-specific styles
  const variantStyles: CSSProperties = (() => {
    switch (variant) {
      case 'elevated':
        return {
          backgroundColor: 'var(--card-bg)',
          border: '1px solid var(--card-border)',
          boxShadow: 'var(--shadow-sm)',
        };

      case 'glass':
        return {
          backgroundColor: 'var(--glass-bg)',
          border: '1px solid var(--glass-border)',
          backdropFilter: 'var(--backdrop-blur-ios)',
          WebkitBackdropFilter: 'var(--backdrop-blur-ios)', // Safari support
        };

      case 'liquidGlass':
        // iOS 26 Liquid Glass with dynamic effects
        return {
          backgroundColor: 'var(--liquid-glass-bg)',
          border: '1px solid var(--liquid-glass-border)',
          backdropFilter: 'blur(16px) saturate(200%)',
          WebkitBackdropFilter: 'blur(16px) saturate(200%)',
          boxShadow: '0 8px 24px rgba(0, 0, 0, 0.12), inset 0 1px 1px var(--liquid-glass-highlight)',
          // Specular highlight gradient overlay
          backgroundImage: 'linear-gradient(135deg, var(--liquid-glass-highlight) 0%, transparent 50%)',
        };

      case 'flat':
        return {
          backgroundColor: 'var(--card-bg)',
          border: '1px solid var(--card-border)',
          boxShadow: 'none',
        };

      default:
        return {};
    }
  })();

  // Interactive styles (hover, active)
  const [isHovered, setIsHovered] = React.useState(false);
  const [isPressed, setIsPressed] = React.useState(false);

  const interactiveStyles: CSSProperties = isInteractive
    ? {
        ...(isHovered && {
          transform: 'scale(1.02)',
          boxShadow: variant === 'elevated'
            ? 'var(--shadow-md)'
            : variant === 'liquidGlass'
              ? '0 12px 32px rgba(0, 0, 0, 0.15), inset 0 1px 1px var(--liquid-glass-highlight)'
              : variantStyles.boxShadow,
          borderColor: 'var(--card-hover-border)',
          // Liquid Glass: reduce blur on hover for more clarity
          ...(variant === 'liquidGlass' && {
            backdropFilter: 'blur(12px) saturate(200%)',
            WebkitBackdropFilter: 'blur(12px) saturate(200%)',
          }),
        }),
        ...(isPressed && {
          transform: 'scale(0.98)',
          boxShadow: variant === 'elevated'
            ? 'var(--shadow-xs)'
            : variant === 'liquidGlass'
              ? '0 4px 16px rgba(0, 0, 0, 0.1), inset 0 1px 1px var(--liquid-glass-highlight)'
              : variantStyles.boxShadow,
          // Liquid Glass: minimum blur on active for maximum clarity
          ...(variant === 'liquidGlass' && {
            backdropFilter: 'blur(8px) saturate(200%)',
            WebkitBackdropFilter: 'blur(8px) saturate(200%)',
          }),
        }),
      }
    : {};

  // Combined styles
  const combinedStyles: CSSProperties = {
    ...baseStyles,
    ...variantStyles,
    ...interactiveStyles,
    ...style,
  };

  // Event handlers
  const handleClick = () => {
    if (!disabled && onClick) {
      onClick();
    }
  };

  const handleMouseEnter = () => {
    if (!disabled && isInteractive) {
      setIsHovered(true);
      onHover?.();
    }
  };

  const handleMouseLeave = () => {
    if (!disabled) {
      setIsHovered(false);
      setIsPressed(false);
    }
  };

  const handleMouseDown = () => {
    if (!disabled && isInteractive) {
      setIsPressed(true);
    }
  };

  const handleMouseUp = () => {
    if (!disabled) {
      setIsPressed(false);
    }
  };

  return (
    <div
      className={`ios-card ios-card--${variant} ${className}`}
      style={combinedStyles}
      onClick={handleClick}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onMouseDown={handleMouseDown}
      onMouseUp={handleMouseUp}
      role={isInteractive ? 'button' : undefined}
      tabIndex={isInteractive && !disabled ? 0 : undefined}
      data-testid={testId}
    >
      {header && (
        <div
          className="ios-card__header"
          style={{
            padding: getPaddingValue(padding),
            borderBottom: '1px solid var(--border-subtle)',
          }}
        >
          {header}
        </div>
      )}

      <div
        className="ios-card__content"
        style={{
          padding: getPaddingValue(padding),
        }}
      >
        {children}
      </div>

      {footer && (
        <div
          className="ios-card__footer"
          style={{
            padding: getPaddingValue(padding),
            borderTop: '1px solid var(--border-subtle)',
          }}
        >
          {footer}
        </div>
      )}
    </div>
  );
};

IOSCard.displayName = 'IOSCard';

export default IOSCard;
