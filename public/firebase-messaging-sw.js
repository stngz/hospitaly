/* eslint-disable no-undef */
importScripts('https://www.gstatic.com/firebasejs/10.13.2/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.13.2/firebase-messaging-compat.js');

firebase.initializeApp({
  projectId: 'glossy-bonus-m8chg',
  appId: '1:353649721596:web:b192305045f5ee05d35779',
  apiKey: 'AIzaSyBPfhPSsHgVQFLruBoI9RxRzKSUgD3SAHE',
  authDomain: 'glossy-bonus-m8chg.firebaseapp.com',
  storageBucket: 'glossy-bonus-m8chg.firebasestorage.app',
  messagingSenderId: '353649721596',
});

const messaging = firebase.messaging();

// Background FCM push handler when app/tab is closed or in background
messaging.onBackgroundMessage((payload) => {
  const notificationTitle =
    (payload.notification && payload.notification.title) ||
    (payload.data && payload.data.title) ||
    'New request · Shekin';
  const requestId = (payload.data && payload.data.requestId) || '';
  const targetUrl =
    (payload.data && payload.data.url) ||
    (requestId ? `/staff?request=${encodeURIComponent(requestId)}` : '/staff');

  const notificationOptions = {
    body:
      (payload.notification && payload.notification.body) ||
      (payload.data && payload.data.body) ||
      'Tap to view request in Shekin Staff',
    icon: '/icons/icon-192.png',
    badge: '/icons/icon-192.png',
    tag: requestId ? `req-${requestId}` : 'shekin-staff-alert',
    renotify: true,
    data: {
      url: targetUrl,
      requestId,
    },
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});

// Notification click handler: focus or open /staff?request={id}
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl =
    (event.notification && event.notification.data && event.notification.data.url) ||
    '/staff';

  event.waitUntil(
    clients
      .matchAll({ type: 'window', includeUncontrolled: true })
      .then((windowClients) => {
        for (const client of windowClients) {
          if ('focus' in client) {
            client.navigate(targetUrl);
            return client.focus();
          }
        }
        if (clients.openWindow) {
          return clients.openWindow(targetUrl);
        }
        return null;
      })
  );
});

self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});
