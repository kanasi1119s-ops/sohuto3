import { readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { defineConfig, type Plugin } from 'vitest/config'

// Kinko Vault ships as a ZIP that users open by double-clicking dist/index.html
// (file:// protocol, no server). Vite's default `crossorigin` attribute on the
// entry script/stylesheet forces a CORS-mode fetch, which browsers refuse for
// file:// origins ("origin 'null'"), leaving the app blank. Strip it post-build.
function stripCrossoriginForFileProtocol(): Plugin {
  return {
    name: 'strip-crossorigin-for-file-protocol',
    apply: 'build',
    closeBundle() {
      const htmlPath = resolve(__dirname, 'dist/index.html')
      const html = readFileSync(htmlPath, 'utf-8')
      writeFileSync(
        htmlPath,
        html
          .replace(/\s+crossorigin(="[^"]*")?/g, '')
          // Rollup's iife format already wraps the bundle as a classic script,
          // but Vite's HTML plugin still tags it type="module" - drop that too.
          // Module scripts defer automatically; a classic script in <head>
          // does not, so add `defer` or it runs before <body id="app"> exists.
          .replace(/<script type="module" src=/, '<script defer src='),
      )
    },
  }
}

export default defineConfig({
  root: '.',
  base: './',
  plugins: [stripCrossoriginForFileProtocol()],
  build: {
    outDir: 'dist',
    target: 'es2022',
    // Classic (non-module) script output: ES module scripts require a
    // CORS-mode fetch, which browsers refuse entirely for file:// origins.
    // A classic IIFE script has no such restriction, so index.html keeps
    // working when opened directly by double-click.
    rollupOptions: {
      output: {
        format: 'iife',
        entryFileNames: 'assets/index.js',
        assetFileNames: 'assets/[name][extname]',
      },
    },
  },
  server: {
    port: 5173,
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./tests/unit/setup.ts'],
    include: ['tests/unit/**/*.test.ts'],
  },
})
