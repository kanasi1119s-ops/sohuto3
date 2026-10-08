import { readFileSync, writeFileSync } from "node:fs";
const p = "dist/index.html";
let h = readFileSync(p, "utf8");
// <script type="module" crossorigin src=...> → <script defer src=...> (file:// 対応)
h = h.replace(/<script type="module" crossorigin src="([^"]+)"><\/script>/, '<script defer src="$1"></script>');
if (!/<script defer src=/.test(h)) { console.error("postbuild: script tag not rewritten"); process.exit(1); }
writeFileSync(p, h);
