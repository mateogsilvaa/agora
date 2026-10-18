import { defineConfig } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import tailwindcss from '@tailwindcss/vite';
import { seo } from './build/seo';

export default defineConfig({
  plugins: [svelte(), tailwindcss(), seo()],
});
