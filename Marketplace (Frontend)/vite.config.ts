import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react-swc';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// https://vitejs.dev/config/
export default defineConfig({
  server: {
    host: '::',
    port: 8080,
    allowedHosts: true, // Allow all hosts (Render, etc.)
  },
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  // Configure for monorepo - look for dependencies in root node_modules
  optimizeDeps: {
    include: ['react', 'react-dom', '@clerk/clerk-react'],
  },
  // Load .env from monorepo root (parent directory)
  envDir: path.resolve(__dirname, '..'),
  // Better development experience
  define: {
    __DEV__: JSON.stringify(true),
  },
});
