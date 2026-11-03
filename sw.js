// 離線快取設定
// 每次更新 APP，把下面的版本號改掉，手機才會換成新版
const CACHE = 'photo-label-v0.13';
const FILES = ['./', './index.html', './manifest.webmanifest', './icon-192.png', './icon-512.png'];

// 安裝：把 APP 的檔案存到手機
self.addEventListener('install', e => {
  // cache: 'reload'＝跳過瀏覽器暫存，一定從網路拿最新檔案
  e.waitUntil(caches.open(CACHE)
    .then(c => c.addAll(FILES.map(f => new Request(f, { cache: 'reload' }))))
    .then(() => self.skipWaiting()));
});

// 啟用：刪掉舊版本的快取
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// 讀取檔案：有網路先拿最新版（最多等 3 秒），網路不好或沒網路就用手機裡存的
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET' || !e.request.url.startsWith(self.location.origin)) return;
  e.respondWith((async () => {
    const cache = await caches.open(CACHE);
    try {
      const res = await Promise.race([
        fetch(e.request, { cache: 'no-cache' }),   // 每次都跟網站確認有沒有新版
        new Promise((_, bad) => setTimeout(() => bad(new Error('timeout')), 3000)),
      ]);
      if (res && res.ok) cache.put(e.request, res.clone());
      return res;
    } catch (err) {
      const hit = await cache.match(e.request, { ignoreSearch: true });
      if (hit) return hit;
      if (e.request.mode === 'navigate') return cache.match('./index.html');
      throw err;
    }
  })());
});
