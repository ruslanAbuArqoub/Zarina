importScripts('https://www.gstatic.com/firebasejs/12.13.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/12.13.0/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: "AIzaSyDhsdX9OxDVA88J5TzV_1-rXgp-cuaJlEU",
  authDomain: "zarinastore-cc94b.firebaseapp.com",
  projectId: "zarinastore-cc94b",
  storageBucket: "zarinastore-cc94b.firebasestorage.app",
  messagingSenderId: "480818656021",
  appId: "1:480818656021:web:128bb7885a8daceff02f1c",
  measurementId: "G-LRVB4HV79L"
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  const notification = payload.notification || {};
  const data = payload.data || {};
  const title = notification.title || data.title || 'ZARINA';
  const options = {
    body: notification.body || data.body || 'You have a new update.',
    icon: '/zarina-logo-mark.png',
    badge: '/zarina-logo-mark.png',
    tag: data.tag || data.orderId || 'zarina-admin-order',
    data: {
      url: data.url || '/admin-orders.html',
      orderId: data.orderId || ''
    },
    requireInteraction: true
  };

  self.registration.showNotification(title, options);
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = event.notification.data?.url || '/admin-orders.html';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if ('focus' in client) {
          client.navigate(targetUrl);
          return client.focus();
        }
      }
      return clients.openWindow(targetUrl);
    })
  );
});
