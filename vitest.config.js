import { defineConfig } from 'vitest/config'
import vue from '@vitejs/plugin-vue'
import { resolve } from 'path'

export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      'neobrutalism-vue': resolve(__dirname, 'node_modules/neobrutalism-vue/dist/index.mjs'),
    },
  },
  test: {
    environment: 'node',
    include: ['src/**/*.test.js'],
  },
})