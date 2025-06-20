import adapter from '@sveltejs/adapter-vercel';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

const dev = process.env.NODE_ENV === 'development';

/** @type {import('@sveltejs/kit').Config} */
const config = {
	// Consult https://svelte.dev/docs/kit/integrations
	// for more information about preprocessors
	preprocess: vitePreprocess(),

	kit: {
		adapter: adapter()
	},

	// Suppress specific warnings while keeping important ones
	onwarn: (warning, handler) => {
		if (warning.code === 'slot_element_deprecated') return;
		handler(warning);
	}
};
export default config;
