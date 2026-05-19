// For more info, see https://github.com/storybookjs/eslint-plugin-storybook#configuration-flat-config-format
import storybook from "eslint-plugin-storybook";

import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores(['dist', 'storybook-static']),

  // ── JavaScript + JSX ──────────────────────────────────────────────────────
  {
    files: ['**/*.{js,jsx}'],
    extends: [
      js.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      globals: globals.browser,
      parserOptions: { ecmaFeatures: { jsx: true } },
    },
  },

  // ── TypeScript ─────────────────────────────────────────────────────────────
  {
    files: ['src/**/*.ts', 'src/**/*.tsx'],
    extends: [
      ...tseslint.configs.recommended,
    ],
    languageOptions: {
      globals: globals.browser,
    },
    rules: {
      // Allow 'any' at JS interop boundaries — we cast explicitly where needed
      '@typescript-eslint/no-explicit-any': 'warn',
      // Allow non-null assertions on values we know are defined
      '@typescript-eslint/no-non-null-assertion': 'warn',
    },
  },

  // ── Node scripts & server ──────────────────────────────────────────────────
  {
    files: ['server/**/*.js', 'scripts/**/*.js', 'scripts/**/*.mjs', 'vite.config.js', 'playwright.config.js'],
    languageOptions: {
      globals: globals.node,
    },
  },

  ...storybook.configs["flat/recommended"],
])
