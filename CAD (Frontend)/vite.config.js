import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react-swc';

// https://vitejs.dev/config/
export default defineConfig({
    plugins: [react()],
    server: {
        port: 3001,
        open: false,
    },
    build: {
        outDir: 'build',
        sourcemap: false,
    },
    // Configure for monorepo - look for dependencies in root node_modules
    optimizeDeps: {
        include: ['react', 'react-dom', 'opencascade.js', 'three'],
    },
    // WASM support for OpenCascade.js
    assetsInclude: ['**/*.wasm'],
});
