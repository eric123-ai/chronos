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
    const options = Object.assign({
      body: data.body || '',
      icon: '/icons/icon-192.png',
      badge: '/icons/icon-192.png',
      data: data.data || {},
      actions: [
        { action: 'snooze-10', title: '稍后10分钟' },
        { action: 'done', title: '标记完成' },
      ],
    }, data.options || {});
    event.waitUntil(self.registration.showNotification(title, options));
  }
});

self.addEventListener('notificationclick', (event) => {
  const action = event.action;
  const payload = (event.notification && event.notification.data) || {};
  event.notification.close();
  event.waitUntil((async () => {
    try {
      const allClients = await self.clients.matchAll({ includeUncontrolled: true, type: 'window' });
      const client = allClients[0];
      if (action === 'snooze-10' && client) {
        client.postMessage({ type: 'NOTIFY_SNOOZE', taskId: payload.taskId, minutes: 10 });
        await client.focus();
        return;
      }
      if (action === 'done' && client) {
        client.postMessage({ type: 'NOTIFY_DONE', taskId: payload.taskId });
        await client.focus();
        return;
      }
      if (client) {
        await client.focus();
      } else if (self.registration && self.registration.scope) {
        await self.clients.openWindow('/');
      }
    } catch {}
  })());
});
