import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss()
  ],
  server: {
    proxy: {
      '/kakao-place-api': {
        target: 'https://place-api.map.kakao.com',
        changeOrigin: true,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Referer': 'https://place.map.kakao.com/',
          'appVersion': '6.6.0',
          'pf': 'PC'
        },
        rewrite: (path) => path.replace(/^\/kakao-place-api/, '')
      }
    }
  }
})
