// Focus Board service worker: offline cache, reminders and the morning summary.
const VERSION = '665a0ebd77';
const CACHE = 'focus-board-' + VERSION;
const ASSETS = [
  "./",
  "./fonts/fonts.css",
  "./fonts/ibm-plex-mono-latin-400-normal.woff2",
  "./fonts/ibm-plex-mono-latin-500-normal.woff2",
  "./fonts/ibm-plex-sans-hebrew-hebrew-400-normal.woff2",
  "./fonts/ibm-plex-sans-hebrew-hebrew-500-normal.woff2",
  "./fonts/ibm-plex-sans-hebrew-hebrew-600-normal.woff2",
  "./fonts/ibm-plex-sans-latin-400-normal.woff2",
  "./fonts/ibm-plex-sans-latin-500-normal.woff2",
  "./fonts/ibm-plex-sans-latin-600-normal.woff2",
  "./fonts/rubik-hebrew-500-normal.woff2",
  "./fonts/rubik-hebrew-600-normal.woff2",
  "./fonts/rubik-hebrew-700-normal.woff2",
  "./fonts/rubik-latin-500-normal.woff2",
  "./fonts/rubik-latin-600-normal.woff2",
  "./fonts/rubik-latin-700-normal.woff2",
  "./icons/apple-touch-icon.png",
  "./icons/badge-96.png",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
  "./icons/maskable-512.png",
  "./icons/shortcut-capture-96.png",
  "./index.html",
  "./manifest.webmanifest",
  "./vendor/hooks.umd.js",
  "./vendor/htm.umd.js",
  "./vendor/immer.umd.production.min.js",
  "./vendor/jspdf.umd.min.js",
  "./vendor/preact.umd.js"
];
const ICON = 'icons/icon-192.png', BADGE = 'icons/badge-96.png';

self.addEventListener('install', e => {
  e.waitUntil((async () => {
    const c = await caches.open(CACHE);
    await c.addAll(ASSETS);
    // the first install takes over right away; later updates wait until the app asks
    if (!self.registration.active) await self.skipWaiting();
  })());
});
self.addEventListener('activate', e => {
  e.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(k => k.startsWith('focus-board-') && k !== CACHE).map(k => caches.delete(k)));
    await self.clients.claim();
  })());
});
self.addEventListener('message', e => { if (e.data && e.data.type === 'skip-waiting') self.skipWaiting(); });

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  if (req.mode === 'navigate') {
    e.respondWith(caches.match('./index.html', { ignoreSearch: true }).then(r => r || fetch(req)));
    return;
  }
  e.respondWith(caches.match(req, { ignoreSearch: true }).then(r => r || fetch(req)));
});

// ---- data shared with the app (IndexedDB key-value store) ----
function idb() {
  return new Promise(res => {
    try {
      const r = indexedDB.open('focus-board-sw', 1);
      r.onupgradeneeded = () => r.result.createObjectStore('kv');
      r.onsuccess = () => res(r.result);
      r.onerror = () => res(null);
    } catch (err) { res(null); }
  });
}
async function kvGet(key) {
  const db = await idb(); if (!db) return null;
  return new Promise(res => { const q = db.transaction('kv').objectStore('kv').get(key); q.onsuccess = () => res(q.result || null); q.onerror = () => res(null); });
}
async function kvPut(key, val) {
  const db = await idb(); if (!db) return;
  return new Promise(res => { const tx = db.transaction('kv', 'readwrite'); tx.objectStore('kv').put(val, key); tx.oncomplete = () => res(); tx.onerror = () => res(); });
}
const pad2 = n => String(n).padStart(2, '0');
const ymd = d => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;

async function sweep() {
  const snap = await kvGet('snapshot');
  if (!snap) return;
  const st = (await kvGet('swstate')) || { notified: [], digestDay: null };
  st.notified = Array.isArray(st.notified) ? st.notified : [];
  const seen = new Set(st.notified);
  const now = Date.now(), today = ymd(new Date()), hour = new Date().getHours();
  if (snap.reminders) {
    for (const t of snap.tasks) for (const r of t.reminders || []) {
      if (Date.parse(r.at) <= now && !seen.has(r.id)) {
        await self.registration.showNotification(t.title, { body: snap.strings.reminder, tag: 'r-' + r.id, data: { task: t.id }, icon: ICON, badge: BADGE });
        st.notified.push(r.id); seen.add(r.id);
      }
    }
  }
  if (snap.digest && st.digestDay !== today && hour >= 7 && hour < 22) {
    const due = snap.tasks.filter(t => t.dueDate && t.dueDate <= today).sort((a, b) => a.dueDate.localeCompare(b.dueDate));
    if (due.length) {
      const title = due.length === 1 ? snap.strings.digest1 : snap.strings.digestN.replace('{n}', due.length);
      const lines = due.slice(0, 4).map(t => '• ' + t.title);
      if (due.length > 4) lines.push(snap.strings.more.replace('{n}', due.length - 4));
      await self.registration.showNotification(title, { body: lines.join('\n'), tag: 'digest', data: { route: '#home' }, icon: ICON, badge: BADGE });
    }
    st.digestDay = today;
  }
  st.notified = st.notified.slice(-500);
  await kvPut('swstate', st);
}
self.addEventListener('periodicsync', e => { if (e.tag === 'fb-daily') e.waitUntil(sweep()); });

self.addEventListener('notificationclick', e => {
  e.notification.close();
  const d = e.notification.data || {};
  e.waitUntil((async () => {
    const scope = self.registration.scope;
    const wins = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    const win = wins.find(c => c.url.startsWith(scope));
    if (win) {
      await win.focus();
      win.postMessage(d.task ? { type: 'open-task', id: d.task } : { type: 'open-route', route: d.route || '#home' });
      return;
    }
    await self.clients.openWindow(scope + (d.task ? '?task=' + encodeURIComponent(d.task) : (d.route || '')));
  })());
});
