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
			svelte: sveltePlugin
		},
		languageOptions: {
			parser: tsParser,
			parserOptions: {
				sourceType: 'module',
				ecmaVersion: 'latest',
				extraFileExtensions: ['.svelte']
			},
			globals: {
				window: true,
				document: true,
				Event: true,
				DragEvent: true,
				HTMLElement: true,
				HTMLInputElement: true,
				File: true,
				sessionStorage: true,
				console: true,
				process: true
			}
		},

		rules: {
			// 🔥 Enforce Svelte 5 Runes
			'svelte/require-runes': 'error', // Forces Svelte 5 runes (`@runes`)
			'svelte/prefer-runes': 'error', // Suggests Runes over old Svelte 4 syntax
			'svelte/no-legacy-reactive-declarations': 'error', // Disallow `$:` reactivity
			'svelte/no-legacy-reactive-assignments': 'error', // Prevent old `$var = value` syntax

			// ✅ Ensure Valid Svelte Code
			'svelte/valid-compile': 'error',
			'svelte/no-unused-svelte-ignore': 'error',
			'svelte/spaced-html-comment': 'error',
			curly: 'error',
			// 🚀 TypeScript Best Practices
			'@typescript-eslint/no-explicit-any': 'warn',
			'@typescript-eslint/no-unused-vars': [
				'warn',
				{
					argsIgnorePattern: '^_',
					varsIgnorePattern: '^\\$' // Ignore Svelte store variables
				}
			],
			'no-unused-vars': 'off', // Disable base rule in favor of TypeScript one

			// 🔧 General Best Practices
			'no-console': 'off', // Keep console logs during development
			'no-debugger': 'warn'
		}
	},
	{
		files: ['**/*.svelte'],
		languageOptions: {
			parser: svelteParser,
			parserOptions: {
				parser: tsParser // Use TypeScript parser for `<script>` blocks
			}
		}
	},
	prettier,
	...sveltePlugin.configs['flat/prettier']
];
