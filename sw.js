/* 모의투자 리그 서비스워커: 앱 껍데기는 캐시, data.json은 항상 네트워크 우선 */
const CACHE = 'league-shell-v4';
const SHELL = ['./', './index.html', './style.css', './app.js', './manifest.webmanifest',
  './icons/icon-192.png', './icons/icon-512.png', './icons/apple-touch-icon.png', './fonts/Pretendard-Regular.subset.woff2', './fonts/Pretendard-SemiBold.subset.woff2'];
self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET' || url.origin !== location.origin) return;
  if (url.pathname.endsWith('/data.json')) {
    // 네트워크 우선, 실패 시 마지막으로 받은 data.json
    e.respondWith(fetch(e.request, {cache: 'no-store'}).then(r => {
      const copy = r.clone(); caches.open(CACHE).then(c => c.put('./data.json', copy)); return r;
    }).catch(() => caches.match('./data.json')));
    return;
  }
  // 껍데기: 캐시 우선 + 백그라운드 갱신
  e.respondWith(caches.match(e.request).then(hit => {
    const net = fetch(e.request).then(r => { if (r.ok) { const c2 = r.clone(); caches.open(CACHE).then(c => c.put(e.request, c2)); } return r; }).catch(() => hit);
    return hit || net;
  }));
});
