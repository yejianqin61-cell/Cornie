import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { resolve } from 'node:path'

export default defineConfig({
  plugins: [vue()],
  server: {
    host: '127.0.0.1',
    port: 5173
  },
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        cornie: resolve(__dirname, 'cornie.html')
      }
    }
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./tests/frontend/setup.mjs'],
    include: ['tests/frontend/**/*.test.mjs'],
    fileParallelism: false,
    maxWorkers: 1,
    minWorkers: 1,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json-summary', 'html'],
      reportsDirectory: './coverage/frontend'
    }
  }
})

