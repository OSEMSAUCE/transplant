import js from '@eslint/js';
import tsParser from '@typescript-eslint/parser';
import tsPlugin from '@typescript-eslint/eslint-plugin';
import sveltePlugin from 'eslint-plugin-svelte';
import svelteParser from 'svelte-eslint-parser';

export default [
  js.configs.recommended,
  {
    files: ['**/*.{js,ts,svelte}'],
    plugins: {
      '@typescript-eslint': tsPlugin,
      svelte: sveltePlugin,
    },
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        sourceType: 'module',
        ecmaVersion: 2020,
        extraFileExtensions: ['.svelte'],
      },
    },
    rules: {
      ...tsPlugin.configs.recommended.rules,
      ...sveltePlugin.configs.recommended.rules,
      'no-unused-vars': 'error',
      'no-undef': 'error',
    },
  },
  {
    files: ['**/*.svelte'],
    languageOptions: {
      parser: svelteParser,
      parserOptions: {
        parser: tsParser,
      },
    },
  },
  {
    ignores: ['node_modules/**', '.svelte-kit/**', 'build/**', '$types.d.ts'],
  },
];
