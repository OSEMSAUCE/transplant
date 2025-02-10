import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';
import type { UserConfig } from 'vite';
import type { UserConfig as VitestConfig } from 'vitest/config';

export default defineConfig({
  plugins: [sveltekit()],
  test: {
    include: ['src/**/*.{test,spec}.{js,ts}'],
    globals: true,
    environment: 'jsdom'
  },
  server: {
    fs: {
      allow: ['..'],
    },
    port: 5174
  }
} as UserConfig & VitestConfig);

