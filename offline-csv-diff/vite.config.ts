import { defineConfig } from "vite";
// file:// で開けるよう、クラシックスクリプト(iife)で出力する(scripts/postbuild.mjs で type=module を除去)
export default defineConfig({
  base: "./",
  build: { modulePreload: false, rollupOptions: { output: { format: "iife", inlineDynamicImports: true } } },
  test: { include: ["tests/**/*.test.ts"] },
} as never);
