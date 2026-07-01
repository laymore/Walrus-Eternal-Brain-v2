import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  base: './',
  plugins: [react()],
  server: {
    proxy: {
      '/walrus-relayer': {
        target: 'https://relayer.memory.walrus.xyz',
        changeOrigin: true,
        secure: false,
        rewrite: (path) => path.replace(/^\/walrus-relayer/, '')
      },
      '/api/mcp': {
        target: 'http://localhost:3030',
        changeOrigin: true,
        secure: false,
        rewrite: (path) => path.replace(/^\/api\/mcp/, '')
      }
    }
  }
})
