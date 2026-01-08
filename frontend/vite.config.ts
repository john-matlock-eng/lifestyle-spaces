/// <reference types="vitest" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          // Group node_modules by package
          if (id.includes('node_modules')) {
            // React core
            if (id.includes('react-dom') || (id.includes('/react/') && !id.includes('react-router'))) {
              return 'vendor-react';
            }
            // React Router
            if (id.includes('react-router')) {
              return 'vendor-router';
            }
            // React Query and state management
            if (id.includes('@tanstack/react-query') || id.includes('zustand')) {
              return 'vendor-state';
            }
            // TipTap editor (heavy)
            if (id.includes('@tiptap') || id.includes('prosemirror')) {
              return 'vendor-tiptap';
            }
            // Framer Motion (animation library)
            if (id.includes('framer-motion')) {
              return 'vendor-motion';
            }
            // Emoji picker
            if (id.includes('emoji-picker-react')) {
              return 'vendor-emoji';
            }
            // AWS Amplify
            if (id.includes('aws-amplify') || id.includes('@aws-sdk')) {
              return 'vendor-aws';
            }
            // Lucide icons
            if (id.includes('lucide-react')) {
              return 'vendor-icons';
            }
          }
        },
      },
    },
    // Increase warning limit since we're optimizing
    chunkSizeWarningLimit: 600,
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/tests/setup.ts',
    css: true,
    exclude: ['**/node_modules/**', '**/e2e/**'],
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
          branches: 95,
          functions: 95,
          lines: 95,
          statements: 95
        }
      },
      all: true,
      include: ['src/**/*.{ts,tsx}'],
      reportsDirectory: './coverage'
    }
  },
})
