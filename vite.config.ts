import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  root: 'frontend',
  plugins: [react()],
  build: {
    outDir: '../dist/frontend',
    emptyOutDir: true,
    manifest: true,
  },
  server: {
    port: 5173,
    host: true,
    allowedHosts: ['wife-buses-magazines-ordering.trycloudflare.com'],
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:3001',
        changeOrigin: true,
        ws: true,
        configure(proxy) {
          proxy.on('error', (_error, _req, response) => {
            const res=response as any
            if (res.headersSent || res.destroyed) return
            res.writeHead(503, {'Content-Type': 'application/json'})
            res.end(JSON.stringify({error:'Local API is unavailable. Run npm run dev to start the frontend and API together.'}))
          })
        },
      },
    },
  },
  preview: {
    port: 4173,
    host: true,
  },
})
