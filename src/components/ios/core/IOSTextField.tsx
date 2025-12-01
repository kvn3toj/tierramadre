import React, { CSSProperties, InputHTMLAttributes, useState, useRef, useEffect } from 'react';

/**
 * IOSTextField Props
 */
export interface IOSTextFieldProps extends Omit<InputHTMLAttributes<HTMLInputElement | HTMLTextAreaElement>, 'size' | 'onChange' | 'onFocus' | 'onBlur'> {
  /** Input label */
  label?: string;

  /** Placeholder text */
  placeholder?: string;

  /** Input value */
  value?: string;

  /** Error message */
  error?: string;

  /** Helper text */
  helperText?: string;

  /** Success state */
  success?: boolean;

  /** Multiline (textarea) */
  multiline?: boolean;

  /** Number of rows (for multiline) */
  rows?: number;

  /** Show clear button when focused and has value */
  clearButton?: boolean;

  /** Left icon/accessory */
  leftIcon?: React.ReactNode;

  /** Right accessory (custom content) */
  rightAccessory?: React.ReactNode;

  /** Full width */
  fullWidth?: boolean;

  /** Disabled state */
  disabled?: boolean;

  /** Read-only state */
  readOnly?: boolean;

  /** On change handler */
  onChange?: (value: string) => void;

  /** On focus handler */
  onFocus?: () => void;

  /** On blur handler */
  onBlur?: () => void;

  /** On clear handler */
  onClear?: () => void;

  /** Custom className */
  className?: string;

  /** Custom inline styles */
  style?: CSSProperties;

  /** Test ID */
  'data-testid'?: string;
}

/**
 * IOSTextField Component
 *
 * iOS-style text input with floating label animation.
 * Supports validation states, icons, and clear button.
 *
 * @example Basic usage
 * <IOSTextField
 *   label="Email"
 *   placeholder="Enter your email"
 *   value={email}
 *   onChange={setEmail}
 * />
 *
 * @example With validation
 * <IOSTextField
 *   label="Password"
 *   type="password"
 *   error="Password must be at least 8 characters"
 * />
 */
export const IOSTextField: React.FC<IOSTextFieldProps> = ({
  label,
  placeholder,
  value = '',
  error,
  helperText,
  success = false,
  multiline = false,
  rows = 4,
  clearButton = true,
  leftIcon,
  rightAccessory,
  fullWidth = false,
  disabled = false,
  readOnly = false,
  onChange,
  onFocus,
  onBlur,
  onClear,
  className = '',
  style = {},
  'data-testid': testId,
  ...restProps
}) => {
  const [isFocused, setIsFocused] = useState(false);
  const [internalValue, setInternalValue] = useState(value);
  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement>(null);

  // Sync external value changes
  useEffect(() => {
    setInternalValue(value);
  }, [value]);

  const hasValue = internalValue.length > 0;
  const hasError = !!error;
  const showLabel = hasValue || isFocused || !!placeholder;

  // Container styles
  const containerStyles: CSSProperties = {
    position: 'relative',
    width: fullWidth ? '100%' : 'auto',
    marginBottom: (error || helperText) ? '4px' : '0',
    ...style,
  };

  // Input wrapper styles
  const wrapperStyles: CSSProperties = {
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
    gap: 'var(--spacing-xs)', // 8px
    minHeight: multiline ? 'auto' : 'var(--input-height-mobile)',
    padding: multiline ? 'var(--spacing-sm)' : '0 var(--spacing-sm)',
    paddingTop: label ? 'var(--spacing-md)' : 'var(--spacing-sm)',
    paddingBottom: label ? 'var(--spacing-xs)' : 'var(--spacing-sm)',
    backgroundColor: 'var(--input-bg)',
    border: '1px solid var(--input-border)',
    borderRadius: 'var(--border-radius-sm)', // 10px
    transition: `all var(--duration-fast) var(--easing-standard)`,
    cursor: disabled ? 'not-allowed' : 'text',
    opacity: disabled ? 0.6 : 1,
  };

  // Focus/error state styles
  if (isFocused && !hasError) {
    wrapperStyles.borderColor = 'var(--input-focus-border)';
    wrapperStyles.backgroundColor = 'var(--surface-primary)';
    wrapperStyles.boxShadow = `0 0 0 3px ${success ? 'var(--status-success)' : 'var(--brand-primary)'}20`;
  }

  if (hasError) {
    wrapperStyles.borderColor = 'var(--status-error)';
  }

  if (success && !hasError) {
    wrapperStyles.borderColor = 'var(--status-success)';
  }

  // Label styles (floating)
  const labelStyles: CSSProperties = {
    position: 'absolute',
    left: leftIcon ? 'calc(var(--spacing-sm) + 24px + var(--spacing-xs))' : 'var(--spacing-sm)',
    top: showLabel ? 'var(--spacing-xs)' : '50%',
    transform: showLabel ? 'translateY(0)' : 'translateY(-50%)',
    fontSize: showLabel ? '12px' : '17px',
    color: hasError
      ? 'var(--status-error)'
      : isFocused
        ? 'var(--brand-primary)'
        : 'var(--text-tertiary)',
    transition: `all var(--duration-fast) var(--easing-standard)`,
    pointerEvents: 'none',
    userSelect: 'none',
    fontWeight: showLabel ? 600 : 400,
    fontFamily: 'var(--font-text)',
  };

  // Input styles
  const inputStyles: CSSProperties = {
    flex: 1,
    border: 'none',
    outline: 'none',
    background: 'transparent',
    fontSize: '17px',
    fontFamily: 'var(--font-text)',
    color: 'var(--text-primary)',
    paddingLeft: leftIcon ? 'calc(24px + var(--spacing-xs))' : '0',
    paddingRight: (clearButton && hasValue && isFocused) || rightAccessory ? 'calc(24px + var(--spacing-xs))' : '0',
    paddingTop: label ? 'var(--spacing-xs)' : '0',
    resize: multiline ? 'vertical' as const : 'none',
    minHeight: multiline ? `${rows * 22}px` : 'auto',
  };

  // Placeholder styles
  const placeholderStyles = `
    .ios-textfield input::placeholder,
    .ios-textfield textarea::placeholder {
      color: var(--text-placeholder);
      opacity: ${showLabel ? 1 : 0};
      transition: opacity var(--duration-fast) var(--easing-standard);
    }
  `;

  // Event handlers
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const newValue = e.target.value;
    setInternalValue(newValue);
    onChange?.(newValue);
  };

  const handleFocus = () => {
    setIsFocused(true);
    onFocus?.();
  };

  const handleBlur = () => {
    setIsFocused(false);
    onBlur?.();
  };

  const handleClear = () => {
    setInternalValue('');
    onChange?.('');
    onClear?.();
    inputRef.current?.focus();
  };

  const handleWrapperClick = () => {
    if (!disabled && !readOnly) {
      inputRef.current?.focus();
    }
  };

  // Clear button
  const clearButtonElement = clearButton && hasValue && isFocused && !disabled && !readOnly ? (
    <button
      type="button"
      onClick={handleClear}
      style={{
        position: 'absolute',
        right: 'var(--spacing-sm)',
        top: '50%',
        transform: 'translateY(-50%)',
        width: '20px',
        height: '20px',
        borderRadius: '50%',
        border: 'none',
        backgroundColor: 'var(--text-tertiary)',
        color: 'var(--surface-primary)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: 'pointer',
        padding: 0,
        fontSize: '14px',
        fontWeight: 'bold',
        transition: 'background-color var(--duration-fast)',
      }}
      onMouseDown={(e) => e.preventDefault()} // Prevent input blur
      aria-label="Clear"
    >
      ×
    </button>
  ) : null;

  // Left icon
  const leftIconElement = leftIcon ? (
    <div
      style={{
        position: 'absolute',
        left: 'var(--spacing-sm)',
        top: '50%',
        transform: 'translateY(-50%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: '24px',
        height: '24px',
        color: isFocused ? 'var(--brand-primary)' : 'var(--text-tertiary)',
        transition: 'color var(--duration-fast)',
      }}
    >
      {leftIcon}
    </div>
  ) : null;

  // Right accessory
  const rightAccessoryElement = rightAccessory && !clearButtonElement ? (
    <div
      style={{
        position: 'absolute',
        right: 'var(--spacing-sm)',
        top: '50%',
        transform: 'translateY(-50%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      {rightAccessory}
    </div>
  ) : null;

  // Helper/error text
  const messageText = error || helperText;
  const messageElement = messageText ? (
    <div
      style={{
        marginTop: 'var(--spacing-xxs)', // 4px
        fontSize: '13px',
        color: hasError ? 'var(--status-error)' : 'var(--text-secondary)',
        paddingLeft: 'var(--spacing-sm)',
        fontFamily: 'var(--font-text)',
      }}
    >
      {messageText}
    </div>
  ) : null;

  const InputComponent = multiline ? 'textarea' : 'input';

  return (
    <div
      className={`ios-textfield ${className}`}
      style={containerStyles}
      data-testid={testId}
    >
      <style>{placeholderStyles}</style>

      <div style={wrapperStyles} onClick={handleWrapperClick}>
        {leftIconElement}

        {label && <label style={labelStyles}>{label}</label>}

        <InputComponent
          ref={inputRef as any}
          value={internalValue}
          placeholder={placeholder}
          disabled={disabled}
          readOnly={readOnly}
          onChange={handleChange}
          onFocus={handleFocus}
          onBlur={handleBlur}
          style={inputStyles}
          rows={multiline ? rows : undefined}
          {...(restProps as any)}
        />

        {clearButtonElement}
        {rightAccessoryElement}
      </div>

      {messageElement}
    </div>
  );
};

IOSTextField.displayName = 'IOSTextField';

export default IOSTextField;
