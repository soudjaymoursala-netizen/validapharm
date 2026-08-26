import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vitest/config'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  test: {
    environment: 'jsdom',
    // `workers/**` = code serveur (Cloudflare Workers, TD-001), pas la PWA,
    // mais couvert par la même suite de tests pour rester dans le même
    // portail de qualité (SDS §4) sans fragmenter le pipeline.
    include: ['src/**/*.test.ts', 'workers/**/*.test.ts'],
  },
})
