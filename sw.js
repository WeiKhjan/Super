// 离线缓存：首次打开后即可离线游玩
const CACHE = 'cskyxcs-v13';
const FILES = ['./', 'index.html', 'css/style.css', 'js/data.js', 'js/stages/stages_01_09.js', 'js/stages/stages_10_18.js', 'js/stages/stages_19_27.js', 'js/stages/stages_28_35.js',
  'js/story.js', 'js/campaigns.js', 'js/g2/data2.js', 'js/g2/stages_p1n.js', 'js/g2/stages_p1e2a.js', 'js/g2/stages_p2.js', 'js/g2/stages_p3a.js', 'js/g2/stages_p3b.js', 'js/g2/stages_p4.js', 'js/g3/data3.js', 'js/g3/stages_m1.js', 'js/g3/stages_m2.js', 'js/g3/stages_m3.js', 'js/g3/stages_f1.js', 'js/g3/stages_f2.js', 'js/g3/stages_f3.js', 'js/g3/stages_p4.js', 'js/sprites.js', 'js/sprites3.js', 'js/portraits.js', 'js/audio.js', 'js/battle.js', 'js/duelfig.js', 'js/duel.js', 'js/spellfx.js', 'js/promote.js', 'js/game.js',
  'manifest.webmanifest', 'icons/icon.svg', 'icons/icon-192.png', 'icons/icon-512.png'];
self.addEventListener('install', e => { e.waitUntil(caches.open(CACHE).then(c => c.addAll(FILES))); self.skipWaiting(); });
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))));
  self.clients.claim();
});
// 网络优先，离线时回退到缓存，保证更新能及时生效
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  e.respondWith(fetch(e.request).then(r => {
    const copy = r.clone(); caches.open(CACHE).then(c => c.put(e.request, copy)); return r;
  }).catch(() => caches.match(e.request)));
});
