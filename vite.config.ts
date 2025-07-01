import { defineConfig } from 'vite'
import { fileURLToPath, URL } from 'url';
import vue from '@vitejs/plugin-vue'
import { quasar, transformAssetUrls } from '@quasar/vite-plugin'
import { resolve, dirname } from 'node:path';

// https://vitejs.dev/config/
export default defineConfig({
  server: {
    host: '0.0.0.0',
    port: 5173
  },
  plugins: [
    vue({
      template: { transformAssetUrls },
    }),
    quasar(),
  ],
  define: {
    VITE_API_HOST: process.env.VITE_API_HOST,
  },
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))
    }
  }
})
