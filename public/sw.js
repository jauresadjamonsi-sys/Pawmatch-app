const CACHE_VERSION = 'pawly-v4';
const STATIC_CACHE = `${CACHE_VERSION}-static`;
const DYNAMIC_CACHE = `${CACHE_VERSION}-dynamic`;

const STATIC_ASSETS = [
  '/',
  '/offline.html',
  '/favicon.svg',
  '/manifest.json',
];

// Install: pre-cache essential static assets
self.addEventListener('install', function(event) {
  event.waitUntil(
    caches.open(STATIC_CACHE).then(function(cache) {
      return cache.addAll(STATIC_ASSETS);
    }).then(function() {
      return self.skipWaiting();
    })
  );
});

// Activate: clean up old caches
self.addEventListener('activate', function(event) {
  event.waitUntil(
    caches.keys().then(function(keys) {
      return Promise.all(
        keys.filter(function(key) {
          return key !== STATIC_CACHE && key !== DYNAMIC_CACHE;
        }).map(function(key) {
          return caches.delete(key);
        })
      );
    }).then(function() {
      return self.clients.claim();
    })
  );
});

// Fetch: routing strategies
self.addEventListener('fetch', function(event) {
  const url = new URL(event.request.url);

  // Skip non-GET requests
  if (event.request.method !== 'GET') return;

  // Network-first for API calls
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(networkFirst(event.request));
    return;
  }

  // Network-first for Next.js build assets (they have unique hashes, always fresh)
  if (url.pathname.startsWith('/_next/')) {
    event.respondWith(networkFirst(event.request));
    return;
  }

  // Cache-first for other static assets (images, fonts, icons)
  if (isStaticAsset(url.pathname)) {
    event.respondWith(cacheFirst(event.request));
    return;
  }

  // Network-first for navigation (HTML pages)
  if (event.request.mode === 'navigate') {
    event.respondWith(
      networkFirst(event.request).catch(function() {
        return caches.match('/offline.html');
      })
    );
    return;
  }

  // Default: network-first with cache fallback
  event.respondWith(networkFirst(event.request));
});

function isStaticAsset(pathname) {
  return /\.(js|css|png|jpg|jpeg|gif|svg|webp|ico|woff|woff2|ttf|eot)$/i.test(pathname);
}

// Cache-first strategy: serve from cache, fall back to network
function cacheFirst(request) {
  return caches.match(request).then(function(cached) {
    if (cached) return cached;
    return fetch(request).then(function(response) {
      if (response && response.status === 200 && response.type === 'basic') {
        var clone = response.clone();
        caches.open(STATIC_CACHE).then(function(cache) {
          cache.put(request, clone);
        });
      }
      return response;
    });
  });
}

// Network-first strategy: try network, fall back to cache
function networkFirst(request) {
  return fetch(request).then(function(response) {
    if (response && response.status === 200) {
      var clone = response.clone();
      caches.open(DYNAMIC_CACHE).then(function(cache) {
        cache.put(request, clone);
      });
    }
    return response;
  }).catch(function() {
    return caches.match(request);
  });
}

// Background sync for failed requests
self.addEventListener('sync', function(event) {
  if (event.tag === 'pawly-sync') {
    event.waitUntil(replayFailedRequests());
  }
});

function replayFailedRequests() {
  // Open the queued requests from IndexedDB and replay them
  return self.indexedDB ? openSyncQueue().then(function(requests) {
    return Promise.all(requests.map(function(req) {
      return fetch(req.url, req.options).then(function() {
        return removeSyncRequest(req.id);
      }).catch(function() {
        // Still offline, will retry on next sync
      });
    }));
  }) : Promise.resolve();
}

function openSyncQueue() {
  return new Promise(function(resolve, reject) {
    var request = indexedDB.open('pawly-sync-db', 1);
    request.onupgradeneeded = function(event) {
      var db = event.target.result;
      if (!db.objectStoreNames.contains('requests')) {
        db.createObjectStore('requests', { keyPath: 'id', autoIncrement: true });
      }
    };
    request.onsuccess = function(event) {
      var db = event.target.result;
      var tx = db.transaction('requests', 'readonly');
      var store = tx.objectStore('requests');
      var getAll = store.getAll();
      getAll.onsuccess = function() {
        resolve(getAll.result || []);
      };
      getAll.onerror = function() {
        resolve([]);
      };
    };
    request.onerror = function() {
      resolve([]);
    };
  });
}

function removeSyncRequest(id) {
  return new Promise(function(resolve) {
    var request = indexedDB.open('pawly-sync-db', 1);
    request.onsuccess = function(event) {
      var db = event.target.result;
      var tx = db.transaction('requests', 'readwrite');
      var store = tx.objectStore('requests');
      store.delete(id);
      tx.oncomplete = function() { resolve(); };
      tx.onerror = function() { resolve(); };
    };
    request.onerror = function() { resolve(); };
  });
}

// Push notification handling (preserved from original)
self.addEventListener('push', function(event) {
  if (!event.data) return;
  const data = event.data.json();
  event.waitUntil(
    self.registration.showNotification(data.title || 'Pawly 🐾', {
      body: data.body || '',
      icon: '/icon-192.png',
      badge: '/icon-192.png',
      data: { url: data.url || '/' },
      vibrate: [100, 50, 100],
    })
  );
});

self.addEventListener('notificationclick', function(event) {
  event.notification.close();
  event.waitUntil(
    clients.openWindow(event.notification.data.url || '/')
  );
});
