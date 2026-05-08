importScripts('https://www.gstatic.com/firebasejs/10.7.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.7.0/firebase-messaging-compat.js');

// These values must be copied from firebase-applet-config.json
firebase.initializeApp({
  apiKey: "AIzaSyAvLqGaRSj1YsrxBjliZEH_2fXVkOv3UB8",
  authDomain: "gen-lang-client-0941109476.firebaseapp.com",
  databaseURL: "https://gen-lang-client-0941109476-default-rtdb.firebaseio.com",
  projectId: "gen-lang-client-0941109476",
  storageBucket: "gen-lang-client-0941109476.firebasestorage.app",
  messagingSenderId: "592686170890"
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  const notificationTitle = payload.notification?.title || 'Nova mensagem VemK!';
  const notificationOptions = {
    body: payload.notification?.body || '',
    icon: '/icons/icon-192x192.png',
    badge: payload.notification?.badge || '',
    data: {
      url: payload.data?.url || '/'
    }
  };
  
  self.registration.showNotification(notificationTitle, notificationOptions);
});
