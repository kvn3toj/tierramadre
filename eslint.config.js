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
    // design-system/** is the token source of truth — it legitimately defines
    // hex/rgba color values, so it is exempt from the color-literal guardrails
    // (DS3 constraint: "Design-system source is exempt from the hex ban").
    ignores: ['src/design-system/**'],
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
          selector: 'Literal[value=/#[0-9a-fA-F]{3,8}\\b/]',
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
          selector: 'TemplateElement[value.raw=/100d?vh/]',
          message:
            'DS3: no calc(100vh ...) in template strings. Measure the height instead.',
        },
        {
          selector: "Property[key.name='zIndex'] > Literal[raw=/^-?[0-9]+$/]",
          message:
            'DS3: no raw zIndex integers. Use the zIndex scale from @/design-system (zIndex.base/modal/...).',
        },
      ],
      'no-restricted-imports': [
        'warn',
        {
          patterns: [
            {
              group: [
                '**/design-system/tokens/legacy-compat',
                '**/tokens/legacy-compat',
              ],
              message:
                'DS3: legacy-compat is retired. Import DS3 tokens from @/design-system.',
            },
            {
              group: ['**/design-system/tokens/colors'],
              message:
                'DS3: emeraldCore/goldAccent are legacy named exports. Use getQuietEmerald(mode) from @/design-system (see the Fase-2 migration plan).',
            },
          ],
        },
      ],
    },
  },
  {
    // Directories already migrated to DS3: the same guardrails, but as ERRORS.
    // Add a directory here the moment it reaches zero DS3 debt (see Fase-2 plan).
    files: [
      'src/components/treasure/browser/**/*.{ts,tsx}',
      'eslint-fixtures/migrated/**/*.{ts,tsx}',
    ],
    languageOptions: {
      parser: tseslint.parser,
      parserOptions: { ecmaFeatures: { jsx: true } },
      globals: { ...globals.browser },
    },
    rules: {
      'no-restricted-syntax': [
        'error',
        {
          selector: 'Literal[value=/#[0-9a-fA-F]{3,8}\\b/]',
          message:
            'DS3: no hex color literals. Use getQuietEmerald(mode) tokens.',
        },
        {
          selector: 'Literal[value=/rgba?\\(/]',
          message: 'DS3: no rgba()/rgb() literals. Use alpha(qe.token, n).',
        },
        {
          selector: 'Literal[value=/100vh|100dvh/]',
          message: 'DS3: no 100vh/100dvh offsets. Measure the height.',
        },
        {
          selector: 'TemplateElement[value.raw=/100d?vh/]',
          message: 'DS3: no calc(100vh ...) in template strings.',
        },
        {
          selector: "Property[key.name='zIndex'] > Literal[raw=/^-?[0-9]+$/]",
          message: 'DS3: no raw zIndex integers. Use the zIndex scale.',
        },
      ],
    },
  },
);
