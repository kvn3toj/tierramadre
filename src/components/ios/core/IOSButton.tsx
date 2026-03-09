import React, { CSSProperties, ReactNode, ButtonHTMLAttributes } from 'react';
import TouchRipple from './TouchRipple';

/**
 * IOSButton Variants
 */
export type IOSButtonVariant = 'filled' | 'tinted' | 'plain' | 'outlined' | 'destructive';

/**
 * IOSButton Sizes
 */
export type IOSButtonSize = 'small' | 'medium' | 'large';

/**
 * IOSButton Props
 */
export interface IOSButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'size'> {
  /** Button content */
  children: ReactNode;

  /** Visual variant */
  variant?: IOSButtonVariant;

  /** Button size */
  size?: IOSButtonSize;

  /** Full width */
  fullWidth?: boolean;

  /** Loading state */
  loading?: boolean;

  /** Disabled state */
  disabled?: boolean;

  /** Icon (left side) */
  icon?: ReactNode;

  /** Icon position */
  iconPosition?: 'left' | 'right';

  /** Haptic feedback on press (mobile) */
  haptic?: boolean;

  /** Custom className */
  className?: string;

  /** Custom inline styles */
  style?: CSSProperties;

  /** Click handler */
  onClick?: () => void;

  /** Test ID */
  'data-testid'?: string;
}

/**
 * Get button height from size
 */
function getButtonHeight(size: IOSButtonSize): string {
  switch (size) {
    case 'small':
      return 'var(--button-height-sm)'; // 36px
    case 'medium':
      return 'var(--button-height-md)'; // 50px
    case 'large':
      return 'var(--button-height-lg)'; // 56px
    default:
      return 'var(--button-height-md)';
  }
}

/**
 * Get button padding from size
 */
function getButtonPadding(size: IOSButtonSize): string {
  switch (size) {
    case 'small':
      return '0 var(--spacing-sm)'; // 0 12px
    case 'medium':
      return '0 var(--spacing-md)'; // 0 16px
    case 'large':
      return '0 var(--spacing-lg)'; // 0 20px
    default:
      return '0 var(--spacing-md)';
  }
}

/**
 * Get font size from size
 */
function getFontSize(size: IOSButtonSize): string {
  switch (size) {
    case 'small':
      return '15px';
    case 'medium':
      return '17px'; // iOS body size
    case 'large':
      return '17px';
    default:
      return '17px';
  }
}

/**
 * Trigger haptic feedback (mobile only)
 */
function triggerHaptic(): void {
  if ('vibrate' in navigator) {
    navigator.vibrate(10); // Light haptic
  }
}

/**
 * IOSButton Component
 *
 * iOS-style button component with five visual variants:
 * - filled: Primary brand button (emerald gradient)
 * - tinted: Secondary button (emerald tint)
 * - plain: Tertiary button (transparent)
 * - outlined: Outlined button (border only)
 * - destructive: Destructive action (red)
 *
 * @example Primary button
 * <IOSButton variant="filled" size="medium">
 *   Continue
 * </IOSButton>
 *
 * @example With icon
 * <IOSButton variant="tinted" icon={<CameraIcon />} iconPosition="left">
 *   Take Photo
 * </IOSButton>
 */
export const IOSButton: React.FC<IOSButtonProps> = ({
  children,
  variant = 'filled',
  size = 'medium',
  fullWidth = false,
  loading = false,
  disabled = false,
  icon,
  iconPosition = 'left',
  haptic = false,
  className = '',
  style = {},
  onClick,
  'data-testid': testId,
  ...restProps
}) => {
  const [isPressed, setIsPressed] = React.useState(false);

  const isDisabled = disabled || loading;

  // Base styles
  const baseStyles: CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 'var(--spacing-xs)', // 8px between icon and text
    height: getButtonHeight(size),
    padding: getButtonPadding(size),
    fontSize: getFontSize(size),
    fontWeight: 600,
    fontFamily: 'var(--font-text)',
    borderRadius: 'var(--border-radius-sm)', // 10px
    border: 'none',
    outline: 'none',
    cursor: isDisabled ? 'not-allowed' : 'pointer',
    transition: `transform 300ms cubic-bezier(0.2, 1.4, 0.4, 1), box-shadow 400ms ease-out, opacity var(--duration-fast) var(--easing-spring)`,
    overflow: 'hidden',
    width: fullWidth ? '100%' : 'auto',
    minWidth: size === 'small' ? '64px' : '88px', // iOS minimum touch target
    opacity: isDisabled ? 0.4 : 1,
    userSelect: 'none' as const,
    WebkitUserSelect: 'none' as const,
    WebkitTapHighlightColor: 'transparent',
    position: 'relative',
  };

  // Variant-specific styles
  const variantStyles: CSSProperties = (() => {
    switch (variant) {
      case 'filled':
        return {
          background: 'var(--button-primary-bg)',
          color: 'var(--button-primary-text)',
          boxShadow: 'var(--shadow-emerald)',
        };

      case 'tinted':
        return {
          background: 'var(--button-secondary-bg)',
          color: 'var(--button-secondary-text)',
          boxShadow: 'none',
        };

      case 'plain':
        return {
          background: 'transparent',
          color: 'var(--brand-primary)',
          boxShadow: 'none',
        };

      case 'outlined':
        return {
          background: 'transparent',
          color: 'var(--brand-primary)',
          boxShadow: 'none',
          border: '2px solid var(--brand-primary)',
        };

      case 'destructive':
        return {
          background: 'var(--status-error)',
          color: '#FFFFFF',
          boxShadow: '0 2px 8px rgba(255, 59, 48, 0.3)',
        };

      default:
        return {};
    }
  })();

  // Pressed state: 0.96 scale + emerald glow for filled variant
  const pressedStyles: CSSProperties = isPressed
    ? {
        transform: 'scale(0.96)',
        transition: 'transform 100ms ease-out, box-shadow 200ms ease-out, opacity var(--duration-fast) var(--easing-spring)',
        ...(variant === 'filled' ? {
          boxShadow: '0 0 20px rgba(0, 174, 122, 0.3), var(--shadow-emerald)',
        } : {}),
      }
    : {};

  // Combined styles
  const combinedStyles: CSSProperties = {
    ...baseStyles,
    ...variantStyles,
    ...pressedStyles,
    ...style,
  };

  // Event handlers
  const handleClick = () => {
    if (!isDisabled) {
      if (haptic) {
        triggerHaptic();
      }
      onClick?.();
    }
  };

  const handleMouseDown = () => {
    if (!isDisabled) {
      setIsPressed(true);
    }
  };

  const handleMouseUp = () => {
    setIsPressed(false);
  };

  const handleMouseLeave = () => {
    setIsPressed(false);
  };

  // Loading spinner
  const loadingSpinner = (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      style={{
        animation: 'spin 1s linear infinite',
      }}
    >
      <circle
        cx="8"
        cy="8"
        r="6"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeDasharray="32"
        strokeDashoffset="8"
        opacity="0.6"
      />
      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </svg>
  );

  return (
    <button
      className={`ios-button ios-button--${variant} ios-button--${size} ${className}`}
      style={combinedStyles}
      onClick={handleClick}
      onMouseDown={handleMouseDown}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseLeave}
      disabled={isDisabled}
      data-testid={testId}
      {...restProps}
    >
      {!isDisabled && <TouchRipple />}
      {loading ? (
        <>
          {loadingSpinner}
          <span style={{ opacity: 0.7, position: 'relative', zIndex: 1 }}>{children}</span>
        </>
      ) : (
        <>
          {icon && iconPosition === 'left' && <span className="ios-button__icon" style={{ position: 'relative', zIndex: 1 }}>{icon}</span>}
          <span className="ios-button__text" style={{ position: 'relative', zIndex: 1 }}>{children}</span>
          {icon && iconPosition === 'right' && <span className="ios-button__icon" style={{ position: 'relative', zIndex: 1 }}>{icon}</span>}
        </>
      )}
    </button>
  );
};

IOSButton.displayName = 'IOSButton';

export default IOSButton;
