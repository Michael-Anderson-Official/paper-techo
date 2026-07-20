// 手ざわり手帳 Service Worker
// 方針:
// - アプリ本体（シェル）はインストール時に事前キャッシュ。ページ表示はネット優先→落ちたらキャッシュ
//   （更新がすぐ届き、オフラインでも開ける）
// - 手書きフォント（Google Fonts）はキャッシュ優先の使い回し。一度表示した字の
//   サブセットから順にオフラインで使えるようになる
var CACHE = 'tezawari-v28';
var SHELL = [
  './',
  './manifest.webmanifest',
  './apple-touch-icon.png',
  './icon-192.png',
  './icon-512.png',
  './chalk-mask.png',
  './img/board-tree-spring.webp',
  './img/board-tree-summer.webp',
  './img/board-tree-autumn.webp',
  './img/board-tree-winter.webp'
];

self.addEventListener('install', function (ev) {
  ev.waitUntil(
    caches.open(CACHE).then(function (cache) {
      return cache.addAll(SHELL);
    }).then(function () {
      return self.skipWaiting();
    })
  );
});

self.addEventListener('activate', function (ev) {
  ev.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(keys.map(function (k) {
        if (k !== CACHE) return caches.delete(k);
      }));
    }).then(function () {
      return self.clients.claim();
    })
  );
});

self.addEventListener('fetch', function (ev) {
  var req = ev.request;
  if (req.method !== 'GET') return;
  var url = new URL(req.url);

  // ページ本体: ネット優先（更新を届ける）→ オフラインならキャッシュ
  // cache:'reload' でブラウザのHTTPキャッシュ(GitHub Pagesのmax-age)も飛ばし、常に最新HTMLを取る
  if (req.mode === 'navigate') {
    ev.respondWith(
      fetch(req, { cache: 'reload' }).then(function (res) {
        var copy = res.clone();
        caches.open(CACHE).then(function (cache) { cache.put('./', copy); });
        return res;
      }).catch(function () {
        return caches.match('./');
      })
    );
    return;
  }

  // フォントと自分のアセット: キャッシュ優先。無ければ取りに行って貯める
  var cacheable = url.origin === location.origin ||
    url.hostname === 'fonts.googleapis.com' ||
    url.hostname === 'fonts.gstatic.com';
  if (!cacheable) return;

  ev.respondWith(
    caches.match(req).then(function (hit) {
      if (hit) return hit;
      return fetch(req).then(function (res) {
        if (res.ok || res.type === 'opaque') {
          var copy = res.clone();
          caches.open(CACHE).then(function (cache) { cache.put(req, copy); });
        }
        return res;
      });
    })
  );
});
