import { fileURLToPath } from 'node:url'
import tailwindcss from '@tailwindcss/vite'
import vue from '@vitejs/plugin-vue'
import { defineConfig } from 'vite'

// Demo app, deployed to GitHub Pages at /vue-json-query-builder/.
export default defineConfig({
  root: fileURLToPath(new URL('.', import.meta.url)),
  base: process.env.GITHUB_PAGES ? '/vue-json-query-builder/' : '/',
  plugins: [vue(), tailwindcss()],
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  },
})
