import path from "path"
import react from "@vitejs/plugin-react"
import { defineConfig } from "vite"
import { nodePolyfills } from 'vite-plugin-node-polyfills'
import mkcert from 'vite-plugin-mkcert'

export default defineConfig({
    plugins: [
        mkcert(),
        react(),
        nodePolyfills({
            globals: {
                Buffer: true,
                global: true,
                process: true
            },
            include: [
                'buffer',
                'crypto',
                'stream',
                'util'
            ],
            protocolImports: true,
        }),
    ],
    resolve: {
        alias: {
            "@": path.resolve(__dirname, "./src"),
            buffer: 'buffer',
        },
    },
    build: {
        target: 'esnext'
    },
    server: {
        headers: {
            'Cross-Origin-Embedder-Policy': 'require-corp',
            'Cross-Origin-Opener-Policy': 'same-origin',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Headers': '*',
            'Access-Control-Allow-Methods': "POST, GET, OPTIONS",
            'Access-Control-Allow-Credentials': "true",
        },
        proxy: {
            '/api/auth': {
                target: 'https://asher.local:7006',
                changeOrigin: true,
                secure: false
            },
            '/api/account': {
                target: 'https://asher.local:7006',
                changeOrigin: true,
                secure: false
            },
            '/api/hub': {
                target: 'https://asher.local:7006',
                changeOrigin: true,
                secure: false,
                ws: true
            },
            '/api/invite': {
                target: 'https://asher.local:7006',
                changeOrigin: true,
                secure: false
            }
        }
    },
    define: {
        global: 'globalThis',
    },
    optimizeDeps: {
        esbuildOptions: {
            define: {
                global: 'globalThis',
            },
        },
        exclude: ['@swc/wasm-web'],
    },
    appType: 'spa',
})