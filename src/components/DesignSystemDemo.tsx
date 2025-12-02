import React, { useState } from 'react';
import { useTheme } from '../design-system/ThemeProvider';
import { IOSCard, IOSButton, IOSTextField, IOSProgress } from './ios';

/**
 * Design System Demo
 *
 * Showcases all iOS components with interactive examples.
 * Use this to test the design system visually.
 */
export const DesignSystemDemo: React.FC = () => {
  const { mode, toggleTheme } = useTheme();
  const [textValue, setTextValue] = useState('');
  const [progress, setProgress] = useState(45);

  return (
    <div
      style={{
        minHeight: '100vh',
        backgroundColor: 'var(--surface-primary)',
        padding: 'var(--spacing-xl)',
      }}
    >
      {/* Header */}
      <div
        style={{
          maxWidth: '1200px',
          margin: '0 auto',
          marginBottom: 'var(--spacing-xxl)',
        }}
      >
        <h1
          style={{
            fontFamily: 'var(--font-display)',
            fontSize: '34px',
            fontWeight: 700,
            color: 'var(--text-primary)',
            marginBottom: 'var(--spacing-xs)',
          }}
        >
          Emerald iOS Design System
        </h1>
        <p
          style={{
            fontFamily: 'var(--font-text)',
            fontSize: '17px',
            color: 'var(--text-secondary)',
            marginBottom: 'var(--spacing-lg)',
          }}
        >
          Where Colombian emerald luxury meets Apple's minimalist precision.
        </p>

        <IOSButton variant="tinted" onClick={toggleTheme}>
          {mode === 'light' ? '🌙 Dark Mode' : '☀️ Light Mode'}
        </IOSButton>
      </div>

      {/* Component Grid */}
      <div
        style={{
          maxWidth: '1200px',
          margin: '0 auto',
          display: 'grid',
          gap: 'var(--spacing-lg)',
        }}
      >
        {/* Buttons Section */}
        <IOSCard variant="elevated" padding="lg">
          <h2
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: '22px',
              fontWeight: 700,
              color: 'var(--text-primary)',
              marginBottom: 'var(--spacing-md)',
            }}
          >
            Buttons
          </h2>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--spacing-sm)' }}>
            <IOSButton variant="filled" size="large">
              Filled Large
            </IOSButton>
            <IOSButton variant="filled" size="medium">
              Filled Medium
            </IOSButton>
            <IOSButton variant="filled" size="small">
              Filled Small
            </IOSButton>
          </div>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--spacing-sm)', marginTop: 'var(--spacing-md)' }}>
            <IOSButton variant="tinted">Tinted</IOSButton>
            <IOSButton variant="plain">Plain</IOSButton>
            <IOSButton variant="outlined">Outlined</IOSButton>
            <IOSButton variant="destructive">Destructive</IOSButton>
          </div>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--spacing-sm)', marginTop: 'var(--spacing-md)' }}>
            <IOSButton variant="filled" loading>
              Loading
            </IOSButton>
            <IOSButton variant="tinted" disabled>
              Disabled
            </IOSButton>
          </div>
        </IOSCard>

        {/* Cards Section */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 'var(--spacing-md)' }}>
          <IOSCard variant="elevated" padding="md">
            <h3
              style={{
                fontFamily: 'var(--font-display)',
                fontSize: '20px',
                fontWeight: 600,
                color: 'var(--text-primary)',
                marginBottom: 'var(--spacing-xs)',
              }}
            >
              Elevated Card
            </h3>
            <p style={{ fontFamily: 'var(--font-text)', fontSize: '15px', color: 'var(--text-secondary)' }}>
              Standard card with shadow elevation. Perfect for primary content.
            </p>
          </IOSCard>

          <IOSCard variant="glass" padding="md">
            <h3
              style={{
                fontFamily: 'var(--font-display)',
                fontSize: '20px',
                fontWeight: 600,
                color: 'var(--text-primary)',
                marginBottom: 'var(--spacing-xs)',
              }}
            >
              Glass Card
            </h3>
            <p style={{ fontFamily: 'var(--font-text)', fontSize: '15px', color: 'var(--text-secondary)' }}>
              Glassmorphic with backdrop blur. Use for overlays and modals.
            </p>
          </IOSCard>

          <IOSCard variant="flat" padding="md">
            <h3
              style={{
                fontFamily: 'var(--font-display)',
                fontSize: '20px',
                fontWeight: 600,
                color: 'var(--text-primary)',
                marginBottom: 'var(--spacing-xs)',
              }}
            >
              Flat Card
            </h3>
            <p style={{ fontFamily: 'var(--font-text)', fontSize: '15px', color: 'var(--text-secondary)' }}>
              Flat with border only. Subtle container for list items.
            </p>
          </IOSCard>
        </div>

        {/* Text Fields Section */}
        <IOSCard variant="elevated" padding="lg">
          <h2
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: '22px',
              fontWeight: 700,
              color: 'var(--text-primary)',
              marginBottom: 'var(--spacing-md)',
            }}
          >
            Text Fields
          </h2>

          <div style={{ display: 'grid', gap: 'var(--spacing-md)', maxWidth: '500px' }}>
            <IOSTextField
              label="Emerald Name"
              placeholder="e.g., Esmeralda Reina"
              value={textValue}
              onChange={setTextValue}
              clearButton
            />

            <IOSTextField label="Email" type="email" placeholder="your@email.com" />

            <IOSTextField label="Password" type="password" placeholder="Enter password" success />

            <IOSTextField label="With Error" error="This field is required" />

            <IOSTextField label="With Helper" helperText="Enter your full name" />

            <IOSTextField label="Multiline" multiline rows={3} placeholder="Write your message here..." />
          </div>
        </IOSCard>

        {/* Progress Section */}
        <IOSCard variant="elevated" padding="lg">
          <h2
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: '22px',
              fontWeight: 700,
              color: 'var(--text-primary)',
              marginBottom: 'var(--spacing-md)',
            }}
          >
            Progress Indicators
          </h2>

          <div style={{ display: 'grid', gap: 'var(--spacing-lg)' }}>
            <div>
              <p style={{ fontFamily: 'var(--font-text)', fontSize: '15px', color: 'var(--text-secondary)', marginBottom: 'var(--spacing-sm)' }}>
                Linear Progress (Determinate)
              </p>
              <IOSProgress variant="linear" value={progress} showLabel />
              <div style={{ display: 'flex', gap: 'var(--spacing-xs)', marginTop: 'var(--spacing-sm)' }}>
                <IOSButton variant="plain" size="small" onClick={() => setProgress(Math.max(0, progress - 10))}>
                  - 10%
                </IOSButton>
                <IOSButton variant="plain" size="small" onClick={() => setProgress(Math.min(100, progress + 10))}>
                  + 10%
                </IOSButton>
              </div>
            </div>

            <div>
              <p style={{ fontFamily: 'var(--font-text)', fontSize: '15px', color: 'var(--text-secondary)', marginBottom: 'var(--spacing-sm)' }}>
                Linear Progress (Indeterminate)
              </p>
              <IOSProgress variant="linear" indeterminate />
            </div>

            <div>
              <p style={{ fontFamily: 'var(--font-text)', fontSize: '15px', color: 'var(--text-secondary)', marginBottom: 'var(--spacing-sm)' }}>
                Circular Progress
              </p>
              <div style={{ display: 'flex', gap: 'var(--spacing-md)', alignItems: 'center' }}>
                <IOSProgress variant="circular" size="small" value={progress} />
                <IOSProgress variant="circular" size="medium" value={progress} />
                <IOSProgress variant="circular" size="large" value={progress} />
                <IOSProgress variant="circular" size="medium" indeterminate />
              </div>
            </div>

            <div>
              <p style={{ fontFamily: 'var(--font-text)', fontSize: '15px', color: 'var(--text-secondary)', marginBottom: 'var(--spacing-sm)' }}>
                Custom Colors
              </p>
              <div style={{ display: 'flex', gap: 'var(--spacing-md)' }}>
                <IOSProgress variant="linear" value={75} color="success" size="small" />
                <IOSProgress variant="linear" value={50} color="warning" size="small" />
                <IOSProgress variant="linear" value={25} color="error" size="small" />
              </div>
            </div>
          </div>
        </IOSCard>

        {/* Color Palette */}
        <IOSCard variant="elevated" padding="lg">
          <h2
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: '22px',
              fontWeight: 700,
              color: 'var(--text-primary)',
              marginBottom: 'var(--spacing-md)',
            }}
          >
            Color Palette
          </h2>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))', gap: 'var(--spacing-sm)' }}>
            {[
              { name: 'Emerald 500', color: '#00AE7A' },
              { name: 'Emerald 400', color: '#33FFBF' },
              { name: 'Emerald 600', color: '#008C62' },
              { name: 'Silver 100', color: '#E8ECEF' },
              { name: 'Silver 500', color: '#6B7A8A' },
              { name: 'Silver 900', color: '#121821' },
            ].map((item) => (
              <div key={item.name}>
                <div
                  style={{
                    height: '80px',
                    backgroundColor: item.color,
                    borderRadius: 'var(--border-radius-sm)',
                    marginBottom: 'var(--spacing-xxs)',
                    border: '1px solid var(--border-subtle)',
                  }}
                />
                <p style={{ fontFamily: 'var(--font-text)', fontSize: '12px', color: 'var(--text-secondary)', textAlign: 'center' }}>
                  {item.name}
                </p>
              </div>
            ))}
          </div>
        </IOSCard>
      </div>
    </div>
  );
};

export default DesignSystemDemo;
