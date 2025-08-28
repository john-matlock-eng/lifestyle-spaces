/// <reference types="vitest" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/tests/setup.ts',
    css: true,
    coverage: {
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'src/tests/setup.ts',
        '**/*.d.ts',
        '**/*.types.ts',
        'dist/',
        'coverage/',
        '**/*.config.{js,ts}',
        'src/main.tsx', // Entry point file
        'src/vite-env.d.ts',
        'src/types/**' // Type definition files
      ],
      thresholds: {
        global: {
          branches: 90,
          functions: 90,
          lines: 90,
          statements: 90
        }
      },
      all: true,
      include: ['src/**/*.{ts,tsx}'],
      reportsDirectory: './coverage'
    }
  },
})
