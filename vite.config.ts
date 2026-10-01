import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

// base を './' にして GitHub Pages でもローカルでも同じビルドが動くようにする
export default defineConfig({
  base: './',
  plugins: [react()],
  test: { include: ['src/**/*.test.ts'] },
});
