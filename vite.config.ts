import { copyFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import vue from '@vitejs/plugin-vue'
import { defineConfig } from 'vitest/config'

const src = (path: string) => fileURLToPath(new URL(`./src/${path}`, import.meta.url))

// Library build. theme.css ships unprocessed: it holds `@theme default` tokens that the
// consumer's own Tailwind build reads, so running it through Tailwind here would strip them.
export default defineConfig({
  plugins: [
    vue(),
    {
      name: 'copy-theme-css',
      apply: 'build',
      closeBundle() {
        copyFileSync(src('theme.css'), fileURLToPath(new URL('./dist/theme.css', import.meta.url)))
      },
    },
  ],
  publicDir: false,
  build: {
    lib: {
      entry: src('index.ts'),
      formats: ['es'],
      fileName: 'vue-json-query-builder',
    },
    rollupOptions: {
      external: ['vue'],
    },
    sourcemap: true,
  },
  test: {
    environment: 'jsdom',
    include: ['tests/**/*.test.ts'],
    setupFiles: ['tests/setup.ts'],
  },
})
