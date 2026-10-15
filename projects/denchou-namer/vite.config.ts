import { defineConfig, type Plugin } from 'vite';

// ZIP展開して index.html を直接開く(file://)配布でも動くよう、
// CSS は public/style.css をそのままリンクし、JS は ES module ではなく単一の classic script(IIFE)として出力する。
const classicScript = (): Plugin => ({
  name: 'classic-script',
  enforce: 'post',
  transformIndexHtml(html) {
    return html.replace(/<script type="module" crossorigin/g, '<script defer');
  },
});

export default defineConfig({
  base: './',
  plugins: [classicScript()],
  build: { rollupOptions: { output: { format: 'iife', inlineDynamicImports: true } } },
  test: { include: ['tests/unit/**/*.test.ts'] },
} as never);
