import { defineConfig } from 'vite';
import { viteSingleFile } from 'vite-plugin-singlefile';

// base './' : GitHub Pages(サブパス)でもローカルでも同じビルドが動く
export default defineConfig({
  base: './',
  plugins: [viteSingleFile()],
  build: { outDir: 'dist' },
  test: { include: ['tests/**/*.test.ts'] },
});
