import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import path from 'node:path';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: { '@': path.resolve(import.meta.dirname, 'src') },
  },
  server: {
    host: '0.0.0.0', // Garante escuta explícita IPv4 para aceitar conexões locais e de celulares
    port: 5173,
    cors: true,
  },
  preview: {
    host: '0.0.0.0',
    port: 4173,
    cors: true,
  },
});

