import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { viteSingleFile } from 'vite-plugin-singlefile';

// JS/CSS を index.html にインライン化し、ダブルクリックで遊べる play/index.html を作る
export default defineConfig({
  base: './',
  plugins: [react(), viteSingleFile()],
  build: { outDir: 'play', emptyOutDir: true },
});
