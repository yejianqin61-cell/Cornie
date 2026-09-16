import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { resolve } from 'path'

export default defineConfig({
  plugins: [vue()],
  base: './',
  root: '.',
  resolve: {
    alias: {
      'neobrutalism-vue/style.css':
        resolve(__dirname, 'node_modules/neobrutalism-vue/dist/style.css'),
      'neobrutalism-vue/styles/neobrutalism.css':
        resolve(__dirname, 'node_modules/neobrutalism-vue/styles/neobrutalism.css'),
      'neobrutalism-vue': resolve(
        __dirname,
        'node_modules/neobrutalism-vue/dist/index.mjs'
      ),
    },
  },
  build: {
    outDir: 'dist',
    rollupOptions: {
      input: {
        main: 'index.html',
      },
    },
  },
})