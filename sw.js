const CACHE_NAME = 'study-progress-v3';

// self.location.pathname からベースパスを取得
// 例: /exam-manage/sw.js → /exam-manage/
const BASE = self.location.pathname.replace(/sw\.js$/, '');

const CORE_ASSETS = [
  BASE,
  BASE + 'index.html',
  BASE + 'bundle.js',
  BASE + 'manifest.json',
  BASE + 'firebase-config.js',
  BASE + 'firebase-auth-ui.js',
  BASE + 'firebase-bridge.js',
  BASE + 'icons/icon-192.png',
  BASE + 'icons/icon-512.png',
];

// Firebase CDN と Google Fonts はネットワーク優先で取得
const NETWORK_FIRST_DOMAINS = [
  'www.gstatic.com',
  'apis.google.com',
  'firestore.googleapis.com',
  'identitytoolkit.googleapis.com',
  'securetoken.googleapis.com',
  'fonts.googleapis.com',
  'fonts.gstatic.com',
  'cdn.tailwindcss.com',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(CORE_ASSETS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) =>
        Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Firebase API リクエストはネットワーク直接（キャッシュしない）
  if (NETWORK_FIRST_DOMAINS.some(d => url.hostname === d || url.hostname.endsWith('.' + d))) {
    event.respondWith(
      fetch(event.request).catch(() => {
        // オフライン時はキャッシュからフォールバック
        return caches.match(event.request);
      })
    );
    return;
  }

  // その他のリクエストはキャッシュ優先
  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;
      return fetch(event.request).then((response) => {
        if (response && response.ok) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        }
        return response;
      }).catch(() => {
        if (event.request.destination === 'document') {
          return caches.match(BASE + 'index.html');
        }
      });
    })
  );
});
