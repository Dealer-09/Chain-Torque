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
    // Handle .js files containing JSX
    esbuild: {
        loader: 'jsx',
        include: /src\/.*\.js$/,
        exclude: [],
    },
    // WASM support for OpenCascade.js
    optimizeDeps: {
        exclude: ['opencascade.js'],
        esbuildOptions: {
            loader: {
                '.js': 'jsx',
            },
        },
    },
    assetsInclude: ['**/*.wasm'],
});
