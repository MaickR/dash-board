const CACHE_NAME = 'aria-v55-cache';
const OFFLINE_URLS = ['/', '/index.html'];

// Offline mutation queue stored in IndexedDB
const DB_NAME = 'aria-offline';
const STORE_NAME = 'mutations';

function openDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE_NAME, { keyPath: 'id', autoIncrement: true });
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function queueMutation(request) {
  try {
    const body = await request.clone().text();
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).add({
      url: request.url,
      method: request.method,
      headers: Object.fromEntries(request.headers.entries()),
      body,
      timestamp: Date.now(),
    });
    return new Response(JSON.stringify({ queued: true }), {
      status: 202,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch {
    return new Response('Offline', { status: 503 });
  }
}

async function replayMutations() {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const all = await new Promise((resolve) => {
      const req = store.getAll();
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => resolve([]);
    });

    for (const item of all) {
      try {
        await fetch(item.url, {
          method: item.method,
          headers: item.headers,
          body: item.body,
          credentials: 'include',
        });
        // Remove from queue on success
        const delTx = db.transaction(STORE_NAME, 'readwrite');
        delTx.objectStore(STORE_NAME).delete(item.id);
      } catch {
        // Still offline, stop replaying
        break;
      }
    }
  } catch {
    // DB error, skip
  }
}

// Install: cache shell and key routes
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(OFFLINE_URLS))
  );
  self.skipWaiting();
});

// Activate: clean old caches and replay queued mutations
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    ).then(() => replayMutations())
  );
  self.clients.claim();
});

// Fetch handler
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Non-GET mutations: queue if offline
  if (event.request.method !== 'GET') {
    if (url.pathname.startsWith('/api/')) {
      event.respondWith(
        fetch(event.request.clone()).catch(() => queueMutation(event.request))
      );
    }
    return;
  }

  // API calls: network first, cache fallback
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          }
          return response;
        })
        .catch(() => caches.match(event.request).then(r => r || new Response('{"error":"offline"}', { status: 503, headers: { 'Content-Type': 'application/json' } })))
    );
    return;
  }

  // Static assets: cache first, network fallback
  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;
      return fetch(event.request).then((response) => {
        if (response.ok) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        }
        return response;
      }).catch(() => {
        // For navigation requests, return cached index
        if (event.request.mode === 'navigate') {
          return caches.match('/') || new Response('Offline', { status: 503 });
        }
        return new Response('Offline', { status: 503 });
      });
    })
  );
});

// Listen for online event to replay mutations
self.addEventListener('message', (event) => {
  if (event.data === 'REPLAY_MUTATIONS') {
    replayMutations().then(() => {
      self.clients.matchAll().then(clients => {
        clients.forEach(c => c.postMessage({ type: 'MUTATIONS_REPLAYED' }));
      });
    });
  }
});
