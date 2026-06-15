import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react-swc';

// https://vitejs.dev/config/
export default defineConfig({
    plugins: [react()],
    // Read shared env vars from monorepo root (VITE_CONTRACT_ADDRESS, VITE_API_URL, etc.)
    envDir: '../',
    server: {
        port: 3001,
        open: false,
    },
    build: {
        outDir: 'build',
        sourcemap: false,
    },
    // CAD kernel runs in an ES-module Web Worker (src/cad/cad.worker.js)
    worker: {
        format: 'es',
    },
    // Configure for monorepo - look for dependencies in root node_modules
    optimizeDeps: {
        include: ['react', 'react-dom', 'opencascade.js', 'three'],
    },
    // WASM support for OpenCascade.js
    assetsInclude: ['**/*.wasm'],
});
