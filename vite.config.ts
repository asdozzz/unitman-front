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
    // `define` подставляет значение в код как выражение, поэтому сырой URL
    // без кавычек ломает сборку (`{ "VITE_API_HOST": /api }`). Значение
    // сериализуется в валидную JS-строку; если переменная не задана —
    // подставляется пустая строка.
    VITE_API_HOST: JSON.stringify(process.env.VITE_API_HOST ?? ""),
  },
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))
    }
  }
})
