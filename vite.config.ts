import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

export default defineConfig({
	plugins: [sveltekit()],
	css: {
		preprocessorOptions: {
			scss: {
				quietDeps: true,
				logger: {
					warn: () => {}
				}
			}
		}
	},
	optimizeDeps: {
		include: ['svelte-french-toast']
	},
	logLevel: 'error', // Suppress warnings in console
	server: {
		fs: {
			allow: ['..'] // Allow access to parent directories if needed
		}
	}
});
