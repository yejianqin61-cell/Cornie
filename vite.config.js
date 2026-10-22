import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { resolve } from 'path'
import { fileURLToPath, URL } from 'node:url'

const rootDir = fileURLToPath(new URL('.', import.meta.url))

export default defineConfig({
  plugins: [vue()],
  base: './',
  root: '.',
  resolve: {
    alias: {
      'neobrutalism-vue/style.css': resolve(rootDir, 'node_modules/neobrutalism-vue/dist/style.css'),
      'neobrutalism-vue/styles/neobrutalism.css': resolve(
        rootDir,
        'node_modules/neobrutalism-vue/styles/neobrutalism.css'
      ),
      'neobrutalism-vue': resolve(rootDir, 'node_modules/neobrutalism-vue/dist/index.mjs'),
    },
  },
  build: {
    outDir: 'dist',
    rollupOptions: {
      input: {
        main: 'index.html',
        cornie: 'cornie.html',
      },
    },
  },
})
