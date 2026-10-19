/* 모의투자 리그 서비스워커: 앱 껍데기·data.json 모두 네트워크 우선, 오프라인일 때만 캐시 */
const CACHE = 'league-shell-v11';
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
  // 껍데기: 네트워크 우선(옛 화면 방지), 오프라인일 때만 캐시
  e.respondWith(fetch(e.request, {cache: 'no-cache'}).then(r => {
    if (r.ok) { const c2 = r.clone(); caches.open(CACHE).then(c => c.put(e.request, c2)); }
    return r;
  }).catch(() => caches.match(e.request)));
});
