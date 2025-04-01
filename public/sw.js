const CACHE_NAME = 'workout-app-cache-v1';

// Add whichever URLs you want to cache
const urlsToCache = [
  '/',
  '/dashboard',
  '/workouts',
  '/mesocycle',
  '/offline.html',
  '/manifest.json',
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png'
];

// Install event - cache assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        return cache.addAll(urlsToCache);
      })
  );
  
  // Force the waiting service worker to become the active service worker
  self.skipWaiting();
});

// Fetch event - serve from cache or network
self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        // Cache hit - return response
        if (response) {
          return response;
        }

        return fetch(event.request)
          .then((response) => {
            // Check if we received a valid response
            if (!response || response.status !== 200 || response.type !== 'basic') {
              return response;
            }

            // Clone the response as it can only be consumed once
            const responseToCache = response.clone();

            caches.open(CACHE_NAME)
              .then((cache) => {
                // Don't cache if it's an API request
                if (!event.request.url.includes('/api/')) {
                  cache.put(event.request, responseToCache);
                }
              });

            return response;
          })
          .catch(() => {
            // If the network request fails, try to return the offline page
            if (event.request.mode === 'navigate') {
              return caches.match('/offline.html');
            }
          });
      })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  const cacheWhitelist = [CACHE_NAME];
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (!cacheWhitelist.includes(cacheName)) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  
  // Make sure the service worker takes control of all clients immediately
  event.waitUntil(self.clients.claim());
});

// Message event - handle messages from client
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SHOW_NOTIFICATION') {
    const { title, options } = event.data;
    
    self.registration.showNotification(title, {
      body: options.body || 'Notification from Workout App',
      icon: options.icon || '/icons/icon-192x192.png',
      badge: '/icons/notification-badge.png',
      vibrate: options.vibrate || [200, 100, 200],
      tag: options.tag || 'workout-timer',
      requireInteraction: options.requireInteraction || false,
      renotify: options.renotify || false,
      silent: options.silent || false,
      actions: options.actions || [],
      data: options.data || {}
    }).then(() => {
      console.log('Notification shown successfully');
    }).catch(error => {
      console.error('Error showing notification:', error);
    });
  }
});

// Notification click event
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  
  // Focus on or open the workout page when notification is clicked
  event.waitUntil(
    self.clients.matchAll({ type: 'window' }).then(clientList => {
      // Try to find an existing window/tab
      for (const client of clientList) {
        if (client.url.includes('/workout/') && 'focus' in client) {
          return client.focus();
        }
      }
      
      // If no existing window found, open a new one
      if (self.clients.openWindow) {
        const url = event.notification.data?.url || '/dashboard';
        return self.clients.openWindow(url);
      }
    })
  );
}); 