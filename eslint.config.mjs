import { defineConfig, globalIgnores } from 'eslint/config';
import nextVitals from 'eslint-config-next/core-web-vitals';
import nextTs from 'eslint-config-next/typescript';

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    '.next/**',
    'out/**',
    'build/**',
    'next-env.d.ts',
    // Additional ignores
    'coverage/**',
    'e2e/reports/**',
    'playwright-report/**',
    'public/sw.js',
    'public/workbox-*.js',
    'public/serwist-*.js',
  ]),
  // Custom rule overrides
  {
    rules: {
      // Allow setState in useCallback functions called from useEffect
      // This is a valid pattern for async data fetching
      'react-hooks/set-state-in-effect': 'off',
      // Downgrade explicit any to warning (cleanup later)
      '@typescript-eslint/no-explicit-any': 'warn',
      // Downgrade unused vars to warning
      '@typescript-eslint/no-unused-vars': 'warn',
      // Console warnings (allow in dev, catch in review)
      'no-console': ['warn', { allow: ['warn', 'error'] }],
      // Enforce best practices
      'prefer-const': 'error',
      eqeqeq: ['error', 'always', { null: 'ignore' }],
      'no-var': 'error',
    },
  },
  // E2E tests - allow console, unused vars, and any type (test debugging)
  {
    files: ['e2e/**/*.ts', 'e2e/**/*.spec.ts'],
    rules: {
      'no-console': 'off',
      '@typescript-eslint/no-unused-vars': 'off',
      '@typescript-eslint/no-explicit-any': 'off',
    },
  },
  // Scripts - allow console for CLI output
  {
    files: ['scripts/**/*.ts'],
    rules: {
      'no-console': 'off',
      '@typescript-eslint/no-unused-vars': 'off',
    },
  },
  // Public JS files - allow console for service worker
  {
    files: ['public/**/*.js'],
    rules: {
      'no-console': 'off',
      '@typescript-eslint/no-unused-vars': 'off',
    },
  },
  // Unit tests - allow console, unused vars (test debugging)
  {
    files: ['src/__tests__/**/*.ts', 'src/__tests__/**/*.tsx'],
    rules: {
      'no-console': 'off',
      '@typescript-eslint/no-unused-vars': 'off',
      '@typescript-eslint/no-explicit-any': 'off',
    },
  },
]);

export default eslintConfig;
