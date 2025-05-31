import adapter from '@sveltejs/adapter-static';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

const dev = process.env.NODE_ENV === 'development';

/** @type {import('@sveltejs/kit').Config} */
const config = {
	// Consult https://svelte.dev/docs/kit/integrations
	// for more information about preprocessors
	preprocess: vitePreprocess(),

	kit: {
		// Use static adapter for GitHub Pages
		adapter: adapter({
			// default options are fine
			fallback: 'index.html' // SPA fallback
		}),

		// Base path for custom domain
		paths: {
			base: ''
		}
	},

	// Suppress specific warnings while keeping important ones
	onwarn: (warning, handler) => {
		if (warning.code === 'slot_element_deprecated') return;
		handler(warning);
	}
};
export default config;
