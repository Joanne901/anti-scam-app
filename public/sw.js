// 防詐小衛的背景程式（Service Worker）：只負責收推播、顯示通知、點通知打開 App。
// 不攔截任何網路請求，所以不會影響網頁更新。

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (e) => e.waitUntil(self.clients.claim()));

self.addEventListener('push', (event) => {
  let data = {};
  try { data = event.data ? event.data.json() : {}; } catch { data = { body: event.data && event.data.text() }; }
  const base = self.registration.scope;
  event.waitUntil(self.registration.showNotification(data.title || '防詐小衛', {
    body: data.body || '有新消息,點一下打開。',
    icon: base + 'icon-192.png',
    badge: base + 'badge-96.png',
    tag: 'app-update',      // 同一種通知只留最新一則
    renotify: true,
    data: { url: data.url || base },
  }));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url) || self.registration.scope;
  event.waitUntil((async () => {
    const wins = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    for (const w of wins) {
      if (w.url.startsWith(self.registration.scope)) {
        await w.focus();
        // 已經開著的話重新整理，直接換成新版
        if ('navigate' in w) { try { await w.navigate(url); } catch {} }
        return;
      }
    }
    await self.clients.openWindow(url);
  })());
});
