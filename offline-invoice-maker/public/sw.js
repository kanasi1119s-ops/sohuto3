// 同一オリジンのみを扱う。install時にトップページと参照アセットをプリキャッシュし、
// 以降はネットワーク優先・失敗時キャッシュ。外部通信はしない。
const CACHE = 'oim-v1';
self.addEventListener('install', (e) => {
  self.skipWaiting();
  e.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE);
      const res = await fetch('./', { cache: 'reload' });
      const html = await res.clone().text();
      await cache.put('./', res);
      const urls = [...html.matchAll(/(?:src|href)="(\.\/[^"]+)"/g)].map((m) => m[1]);
      await Promise.all(urls.map((u) => cache.add(u).catch(() => undefined)));
    })(),
  );
});
self.addEventListener('activate', (e) => e.waitUntil(self.clients.claim()));
self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== location.origin) return;
  e.respondWith(
    fetch(req)
      .then((res) => {
        const copy = res.clone();
        caches.open(CACHE).then((c) => c.put(req, copy));
        return res;
      })
      .catch(() => caches.match(req, { ignoreSearch: true, ignoreVary: true }).then((r) => r || caches.match('./', { ignoreVary: true }))),
  );
});
