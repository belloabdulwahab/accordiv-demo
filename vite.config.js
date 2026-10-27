import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
// The public build is static and independent; it must not forward requests to owner services.
export default defineConfig({
  plugins: [react()], base: './',
  server: { host: '127.0.0.1', port: 5174, strictPort: true },
  preview: { host: '127.0.0.1', port: 5174, strictPort: true },
});
