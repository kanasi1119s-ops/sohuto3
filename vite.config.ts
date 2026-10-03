import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { viteSingleFile } from 'vite-plugin-singlefile'

// SINGLE=1 のとき、JS/CSSを全部index.htmlに埋め込んだ「ダブルクリックで遊べる版」を play/ に出力する
const single = process.env.SINGLE === '1'

export default defineConfig({
  base: './',
  plugins: single ? [react(), viteSingleFile()] : [react()],
  build: {
    outDir: single ? 'play' : 'dist',
    emptyOutDir: true,
  },
  test: { include: ['src/**/*.test.ts'] },
})
