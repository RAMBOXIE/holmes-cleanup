/// <reference types="vitest" />
import { defineConfig } from 'vite';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  // GitHub Pages deploys to /vanish/ by default; override via --base when using custom domain
  base: process.env.VITE_BASE_PATH || '/vanish/',

  // The monorepo root is one level up; allow Vite to import shared modules from there.
  resolve: {
    alias: {
      '@scanner': path.resolve(__dirname, '..', 'src', 'scanner'),
      '@ai-scanner': path.resolve(__dirname, '..', 'src', 'ai-scanner'),
      '@face-scanner': path.resolve(__dirname, '..', 'src', 'face-scanner'),
      '@catalog': path.resolve(__dirname, '..', 'src', 'adapters', 'brokers', 'config', 'broker-catalog.json'),
      '@ai-catalog': path.resolve(__dirname, '..', 'src', 'ai-scanner', 'ai-platforms-catalog.json'),
      '@face-catalog': path.resolve(__dirname, '..', 'src', 'face-scanner', 'face-services-catalog.json')
    }
  },

  // The parent repo has files Vite's default fs.allow list blocks. Widen scope.
  server: {
    fs: {
      allow: [path.resolve(__dirname, '..')]
    }
  },

  build: {
    outDir: 'dist',
    emptyOutDir: true,
    // Fail the build if any dynamic import goes over 500KB — forces us to keep the bundle tight
    chunkSizeWarningLimit: 500
  },

  test: {
    environment: 'jsdom',
    include: ['tests/**/*.test.js']
  }
});
