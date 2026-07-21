import tseslint from 'typescript-eslint';
import globals from 'globals';
import reactHooks from 'eslint-plugin-react-hooks';

export default tseslint.config(
  {
    ignores: [
      'dist/**',
      'node_modules/**',
      'convex/_generated/**',
      '**/*.d.ts',
    ],
  },
  {
    files: ['src/**/*.{ts,tsx}', 'eslint-fixtures/**/*.{ts,tsx}'],
    languageOptions: {
      parser: tseslint.parser,
      parserOptions: { ecmaFeatures: { jsx: true } },
      globals: { ...globals.browser },
    },
    // Plugins are registered (but not enabled below) purely so that
    // pre-existing `// eslint-disable-next-line <rule>` comments in the
    // codebase resolve to a known rule ID — ESLint 9 flat config errors
    // with "Definition for rule 'x' was not found" otherwise, even though
    // we never turn these rules on.
    plugins: {
      '@typescript-eslint': tseslint.plugin,
      'react-hooks': reactHooks,
    },
    // The registered plugins above are never enabled via `rules`, so any
    // pre-existing disable comment for them is technically "unused" from
    // this config's point of view — don't flag that; it's not DS3's concern.
    linterOptions: { reportUnusedDisableDirectives: 'off' },
    // DS3 guardrails only — added in later tasks. Intentionally NOT extending
    // recommended: this config exists to enforce Quiet Emerald, not to lint
    // the whole codebase.
    rules: {
      'no-restricted-syntax': [
        'warn',
        {
          selector: 'Literal[value=/#[0-9a-fA-F]{6}\\b/]',
          message:
            'DS3: no hex color literals in feature code. Use getQuietEmerald(mode) tokens or var(--tm-*).',
        },
        {
          selector: 'Literal[value=/rgba?\\(/]',
          message:
            'DS3: no rgba()/rgb() literals. Use alpha(qe.token, n) from @mui/material/styles with a DS3 token.',
        },
        {
          selector: 'Literal[value=/100vh|100dvh/]',
          message:
            'DS3: no 100vh/100dvh magic offsets. Use a measured height (ResizeObserver / the shell layout tokens) — heights are measured, never guessed.',
        },
        {
          selector: 'TemplateElement[value.raw=/100vh|calc\\(100vh/]',
          message:
            'DS3: no calc(100vh ...) in template strings. Measure the height instead.',
        },
      ],
    },
  },
);
