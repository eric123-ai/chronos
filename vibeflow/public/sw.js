self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

// Receive messages to show a notification
self.addEventListener('message', (event) => {
  const data = event.data || {};
  if (data && data.type === 'SHOW_NOTIFICATION') {
    const title = data.title || '提醒';
    const options = Object.assign({ body: data.body || '', icon: '/icons/icon-192.png', badge: '/icons/icon-192.png' }, data.options || {});
    event.waitUntil(self.registration.showNotification(title, options));
  }
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil((async () => {
    const allClients = await self.clients.matchAll({ includeUncontrolled: true, type: 'window' });
    if (allClients.length > 0) {
      allClients[0].focus();
    } else if (self.registration && self.registration.scope) {
      self.clients.openWindow('/');
    }
  })());
});
