/* ============================================================
   MUNICIPALITY — Service Worker
   Offline Caching & Background Sync
   ============================================================ */

const CACHE_NAME = 'municipality-v1';
const ASSETS = [
  '/',
  '/index.html',
  '/dashboard.html',
  '/form.html',
  '/digitizer.html',
  '/submissions.html',
  '/admin.html',
  '/print.html',
  '/manifest.json',
  '/assets/css/style.css',
  '/assets/js/app.js',
  '/assets/js/auth.js',
  '/assets/js/api.js',
  '/assets/js/map.js',
  'https://fonts.googleapis.com/css2?family=IBM+Plex+Sans+Arabic:wght@400;500;600;700;800&display=swap',
  'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css',
  'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js',
  'https://mt1.google.com/vt/lyrs=s&x=0&y=0&z=0',
  'https://tile.openstreetmap.org/0/0/0.png',
];

// Install: cache all static assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS);
    }).then(() => {
      return self.skipWaiting();
    })
  );
});

// Activate: clean old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keyList) => {
      return Promise.all(
        keyList.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    }).then(() => {
      return self.clients.claim();
    })
  );
});

// Fetch: serve from cache first, fallback to network
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Only cache same-origin and known CDN resources
  if (
    url.origin === self.location.origin ||
    url.hostname === 'unpkg.com' ||
    url.hostname === 'fonts.googleapis.com' ||
    url.hostname === 'fonts.gstatic.com' ||
    url.hostname === 'mt1.google.com' ||
    url.hostname === 'tile.openstreetmap.org'
  ) {
    event.respondWith(
      caches.match(event.request).then((cached) => {
        if (cached) return cached;

        return fetch(event.request).then((response) => {
          // Cache successful responses
          if (response && response.status === 200) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, clone);
            });
          }
          return response;
        }).catch(() => {
          // Offline fallback for navigation requests
          if (event.request.mode === 'navigate') {
            return caches.match('/index.html');
          }
          return new Response('Offline', { status: 503 });
        });
      })
    );
  } else {
    // For other requests (API calls), try network first, then cache
    event.respondWith(
      fetch(event.request).catch(() => {
        return caches.match(event.request);
      })
    );
  }
});

// Background Sync: retry failed submissions
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-submissions') {
    event.waitUntil(syncSubmissions());
  }
});

async function syncSubmissions() {
  try {
    const db = await openDB();
    const pending = await db.getAll('pending-submissions');

    for (const submission of pending) {
      try {
        const response = await fetch(submission.url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(submission.data),
        });
        if (response.ok) {
          await db.delete('pending-submissions', submission.id);
        }
      } catch (err) {
        console.error('Sync failed for submission', submission.id, err);
      }
    }
  } catch (err) {
    console.error('Background sync error', err);
  }
}

// IndexedDB helper for pending submissions
function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('MunicipalityDB', 1);
    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains('pending-submissions')) {
        db.createObjectStore('pending-submissions', { keyPath: 'id' });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}
