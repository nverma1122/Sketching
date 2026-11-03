import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
// Relative base: the built app works from any folder or sub-path.
export default defineConfig({ base: './', plugins: [react()], build: { chunkSizeWarningLimit: 900 }, server: { host: true }, preview: { host: true } });
