const CACHE_NAME = 'flashcards-app-v1';
const STATIC_CACHE_NAME = 'flashcards-static-v1';
const DYNAMIC_CACHE_NAME = 'flashcards-dynamic-v1';

// Các file cần cache khi cài đặt
const STATIC_ASSETS = [
  './',
  './index.html',
  './assets/css/style.css',
  './assets/js/app.js',
  './assets/js/flashcards.js',
  './assets/js/quiz.js',
  './manifest.json',
  // Thêm offline fallback page
  './offline.html'
];

// Install event - cache static assets
self.addEventListener('install', (event) => {
  console.log('Service Worker: Installing...');
  event.waitUntil(
    caches.open(STATIC_CACHE_NAME)
      .then((cache) => {
        console.log('Service Worker: Caching static assets');
        return cache.addAll(STATIC_ASSETS);
      })
      .then(() => {
        console.log('Service Worker: Static assets cached');
        return self.skipWaiting();
      })
      .catch((error) => {
        console.error('Service Worker: Error caching static assets', error);
      })
  );
});

// Activate event - cleanup old caches
self.addEventListener('activate', (event) => {
  console.log('Service Worker: Activating...');
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== STATIC_CACHE_NAME && cacheName !== DYNAMIC_CACHE_NAME) {
              console.log('Service Worker: Deleting old cache', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      })
      .then(() => {
        console.log('Service Worker: Activated');
        return self.clients.claim();
      })
  );
});

// Fetch event - serve from cache, fallback to network
self.addEventListener('fetch', (event) => {
  // Skip non-GET requests
  if (event.request.method !== 'GET') {
    return;
  }

  // Handle navigation requests
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          // Network success - clone and cache
          const responseClone = response.clone();
          caches.open(DYNAMIC_CACHE_NAME)
            .then((cache) => {
              cache.put(event.request, responseClone);
            });
          return response;
        })
        .catch(() => {
          // Network failed - serve from cache or offline page
          return caches.match(event.request)
            .then((cachedResponse) => {
              return cachedResponse || caches.match('./offline.html');
            });
        })
    );
    return;
  }

  // Handle other requests (CSS, JS, images, etc.)
  event.respondWith(
    caches.match(event.request)
      .then((cachedResponse) => {
        // Cache hit - return cached version
        if (cachedResponse) {
          return cachedResponse;
        }

        // No cache hit - fetch from network
        return fetch(event.request)
          .then((response) => {
            // Check if response is valid
            if (!response || response.status !== 200 || response.type !== 'basic') {
              return response;
            }

            // Clone the response (can only be consumed once)
            const responseToCache = response.clone();

            // Add to dynamic cache
            caches.open(DYNAMIC_CACHE_NAME)
              .then((cache) => {
                cache.put(event.request, responseToCache);
              });

            return response;
          })
          .catch(() => {
            // Network failed and no cache
            console.log('Service Worker: Network failed and no cache for', event.request.url);
            
            // Return offline fallback for HTML requests
            if (event.request.destination === 'document') {
              return caches.match('./offline.html');
            }
            
            // For images, return a placeholder or just fail
            return new Response('Offline - Content not available', {
              status: 408,
              headers: { 'Content-Type': 'text/plain' }
            });
          });
      })
  );
});

// Background sync for saving flashcards when online
self.addEventListener('sync', (event) => {
  console.log('Service Worker: Background sync', event.tag);
  
  if (event.tag === 'save-flashcard') {
    event.waitUntil(
      // Process any pending flashcard saves
      self.registration.sync.register('save-flashcard')
    );
  }
});

// Push notification support (optional for future features)
self.addEventListener('push', (event) => {
  console.log('Service Worker: Push received');
  
  const options = {
    body: event.data ? event.data.text() : 'Đã có thẻ từ vựng mới!',
    icon: './assets/icons/icon-192x192.png',
    badge: './assets/icons/icon-72x72.png',
    vibrate: [200, 100, 200],
    data: {
      dateOfArrival: Date.now(),
      primaryKey: '1'
    }
  };

  event.waitUntil(
    self.registration.showNotification('Flashcards App', options)
  );
});

// Notification click handler
self.addEventListener('notificationclick', (event) => {
  console.log('Service Worker: Notification clicked');
  
  event.notification.close();
  
  event.waitUntil(
    clients.openWindow('./')
  );
});