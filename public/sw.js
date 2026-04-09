var CACHE_VERSION = 'pawly-v10';
var STATIC_CACHE = CACHE_VERSION + '-static';
var DYNAMIC_CACHE = CACHE_VERSION + '-dynamic';

var STATIC_ASSETS = [
  '/',
  '/offline.html',
  '/favicon.svg',
  '/manifest.json',
];

// Guaranteed fallback — never throws, never undefined
function offlineResponse() {
  return new Response('Offline', {
    status: 503,
    headers: { 'Content-Type': 'text/plain' },
  });
}

// Safe cache lookup — always resolves, never rejects
function safeMatch(request) {
  try {
    return caches.match(request).then(function (r) { return r; }).catch(function () { return undefined; });
  } catch (e) {
    return Promise.resolve(undefined);
  }
}

// Install: pre-cache essential static assets
self.addEventListener('install', function (event) {
  event.waitUntil(
    caches.open(STATIC_CACHE).then(function (cache) {
      return cache.addAll(STATIC_ASSETS);
    }).then(function () {
      return self.skipWaiting();
    }).catch(function () {
      return self.skipWaiting();
    })
  );
});

// Activate: clean up old caches
self.addEventListener('activate', function (event) {
  event.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(
        keys.filter(function (key) {
          return key !== STATIC_CACHE && key !== DYNAMIC_CACHE;
        }).map(function (key) {
          return caches.delete(key).catch(function () {});
        })
      );
    }).then(function () {
      return self.clients.claim();
    }).catch(function () {
      return self.clients.claim();
    })
  );
});

// Fetch: routing strategies
self.addEventListener('fetch', function (event) {
  var url;
  try {
    url = new URL(event.request.url);
  } catch (e) {
    return; // malformed URL, let browser handle
  }

  // Skip non-GET
  if (event.request.method !== 'GET') return;

  // Skip chrome-extension, blob, data URLs
  if (url.protocol !== 'https:' && url.protocol !== 'http:') return;

  // Network-first for API calls
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(networkFirst(event.request));
    return;
  }

  // Network-first for Next.js build assets
  if (url.pathname.startsWith('/_next/')) {
    event.respondWith(networkFirst(event.request));
    return;
  }

  // Cache-first for static assets (images, fonts, icons)
  if (isStaticAsset(url.pathname)) {
    event.respondWith(cacheFirst(event.request));
    return;
  }

  // Network-first for navigation (HTML pages)
  if (event.request.mode === 'navigate') {
    event.respondWith(navigateHandler(event.request));
    return;
  }

  // Default: network-first with cache fallback
  event.respondWith(networkFirst(event.request));
});

function isStaticAsset(pathname) {
  // JS and CSS handled by networkFirst via /_next/ — only cache media/fonts here
  return /\.(png|jpg|jpeg|gif|svg|webp|ico|woff|woff2|ttf|eot)$/i.test(pathname);
}

// Navigation handler — bulletproof, always returns a Response
function navigateHandler(request) {
  return fetch(request)
    .then(function (response) {
      // Cache successful responses
      if (response && response.status === 200) {
        try {
          var clone = response.clone();
          caches.open(DYNAMIC_CACHE).then(function (cache) {
            cache.put(request, clone).catch(function () {});
          }).catch(function () {});
        } catch (e) {
          // clone or cache failed, ignore
        }
      }
      return response;
    })
    .catch(function () {
      // Network failed — try cache, then offline page, then plain text
      return safeMatch(request).then(function (cached) {
        if (cached) return cached;
        return safeMatch('/offline.html');
      }).then(function (result) {
        return result || offlineResponse();
      });
    })
    .then(function (response) {
      // Final safety: if somehow response is falsy, create one
      if (response && typeof response.clone === 'function') {
        return response;
      }
      return offlineResponse();
    })
    .catch(function () {
      // Ultimate fallback — nothing can go wrong here
      return offlineResponse();
    });
}

// Cache-first strategy: serve from cache, fall back to network
function cacheFirst(request) {
  return safeMatch(request)
    .then(function (cached) {
      if (cached) return cached;
      return fetch(request).then(function (response) {
        if (response && response.status === 200 && response.type === 'basic') {
          try {
            var clone = response.clone();
            caches.open(STATIC_CACHE).then(function (cache) {
              cache.put(request, clone).catch(function () {});
            }).catch(function () {});
          } catch (e) {}
        }
        return response;
      });
    })
    .catch(function () {
      // Both cache and network failed
      return offlineResponse();
    });
}

// Network-first strategy: try network, fall back to cache
function networkFirst(request) {
  return fetch(request)
    .then(function (response) {
      if (response && response.status === 200) {
        try {
          var clone = response.clone();
          caches.open(DYNAMIC_CACHE).then(function (cache) {
            cache.put(request, clone).catch(function () {});
          }).catch(function () {});
        } catch (e) {}
      }
      return response;
    })
    .catch(function () {
      return safeMatch(request).then(function (cached) {
        return cached || offlineResponse();
      });
    })
    .catch(function () {
      return offlineResponse();
    });
}

// Background sync for failed requests
self.addEventListener('sync', function (event) {
  if (event.tag === 'pawly-sync') {
    event.waitUntil(replayFailedRequests());
  }
});

function replayFailedRequests() {
  if (!self.indexedDB) return Promise.resolve();
  return openSyncQueue().then(function (requests) {
    return Promise.all(requests.map(function (req) {
      return fetch(req.url, req.options).then(function () {
        return removeSyncRequest(req.id);
      }).catch(function () {});
    }));
  }).catch(function () {});
}

function openSyncQueue() {
  return new Promise(function (resolve) {
    try {
      var request = indexedDB.open('pawly-sync-db', 1);
      request.onupgradeneeded = function (event) {
        var db = event.target.result;
        if (!db.objectStoreNames.contains('requests')) {
          db.createObjectStore('requests', { keyPath: 'id', autoIncrement: true });
        }
      };
      request.onsuccess = function (event) {
        try {
          var db = event.target.result;
          var tx = db.transaction('requests', 'readonly');
          var store = tx.objectStore('requests');
          var getAll = store.getAll();
          getAll.onsuccess = function () { resolve(getAll.result || []); };
          getAll.onerror = function () { resolve([]); };
        } catch (e) { resolve([]); }
      };
      request.onerror = function () { resolve([]); };
    } catch (e) { resolve([]); }
  });
}

function removeSyncRequest(id) {
  return new Promise(function (resolve) {
    try {
      var request = indexedDB.open('pawly-sync-db', 1);
      request.onsuccess = function (event) {
        try {
          var db = event.target.result;
          var tx = db.transaction('requests', 'readwrite');
          var store = tx.objectStore('requests');
          store.delete(id);
          tx.oncomplete = function () { resolve(); };
          tx.onerror = function () { resolve(); };
        } catch (e) { resolve(); }
      };
      request.onerror = function () { resolve(); };
    } catch (e) { resolve(); }
  });
}

// Push notification handling
self.addEventListener('push', function (event) {
  if (!event.data) return;
  try {
    var data = event.data.json();
    event.waitUntil(
      self.registration.showNotification(data.title || 'Pawly', {
        body: data.body || '',
        icon: '/icons/icon-192.png',
        badge: '/icons/icon-192.png',
        data: { url: data.url || '/' },
        vibrate: [100, 50, 100],
      })
    );
  } catch (e) {}
});

self.addEventListener('notificationclick', function (event) {
  event.notification.close();
  event.waitUntil(
    clients.openWindow(event.notification.data.url || '/')
  );
});
