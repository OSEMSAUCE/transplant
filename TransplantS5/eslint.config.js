import js from '@eslint/js';
import tsParser from '@typescript-eslint/parser';
import tsPlugin from '@typescript-eslint/eslint-plugin';
import sveltePlugin from 'eslint-plugin-svelte';
import svelteParser from 'svelte-eslint-parser';
import prettier from 'eslint-config-prettier';

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
      // TypeScript rules
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
      
      // Svelte rules
      'svelte/valid-compile': 'error',
      'svelte/no-unused-svelte-ignore': 'error',
      'svelte/html-quotes': ['error', { prefer: 'single' }],
      'svelte/spaced-html-comment': 'error',
      
      // General rules
      'no-console': ['warn', { allow: ['warn', 'error'] }],
      'no-debugger': 'warn',
    },
  },
  {
    // Special config for Svelte files
    files: ['**/*.svelte'],
    languageOptions: {
      parser: svelteParser,
      parserOptions: {
        parser: tsParser,  // Use TypeScript parser for script blocks
      },
    },
  },
  prettier,  // Apply prettier last to avoid conflicts
];
