import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { readFileSync } from 'node:fs';

const pkg = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8')) as { version: string };

// Relative base so the built app works from any sub-path (e.g. GitHub Pages).
export default defineConfig({
  base: './',
  plugins: [react()],
  define: { __APP_VERSION__: JSON.stringify(pkg.version) },
  server: { host: true },
  preview: { host: true },
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
});
