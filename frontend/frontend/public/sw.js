// 🚀 PHASE 3: Service Worker for Instant 1v1 Gaming
// Smart caching for competitive gaming performance

const CACHE_NAME = 'pv3-gaming-v1';
const GAME_CACHE = 'pv3-games-v1';
const API_CACHE = 'pv3-api-v1';

// Critical assets for instant 1v1 gaming
const CRITICAL_ASSETS = [
  // Game engines - must be instant
  '/game-covers/coinflip.webm',
  '/game-covers/crash.webm', 
  '/game-covers/chess.webm',
  '/game-covers/rps.webm',
  
  // Audio for immediate feedback
  '/sounds/game-sounds-sprite.webm',
  '/sounds/audio-sprite-map.json',
  
  // Core UI assets
  '/logos/PV3-Logo.webp',
  '/logos/solana.webp',
  '/logos/phantom.webp',
  
  // Essential pages
  '/games',
  '/games/coinflip',
  '/games/crash',
  '/games/chess'
];

// Install - cache critical assets immediately
self.addEventListener('install', (event) => {
  console.log('🚀 PV3 Service Worker installing...');
  
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('📦 Caching critical gaming assets...');
        return cache.addAll(CRITICAL_ASSETS);
      })
      .then(() => {
        console.log('✅ Critical assets cached - games will load instantly!');
        return self.skipWaiting(); // Activate immediately
      })
  );
});

// Activate - clean old caches
self.addEventListener('activate', (event) => {
  console.log('⚡ PV3 Service Worker activated');
  
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME && cacheName !== GAME_CACHE && cacheName !== API_CACHE) {
            console.log('🗑️ Cleaning old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      return self.clients.claim(); // Take control immediately
    })
  );
});

// Fetch - smart caching strategies for 1v1 gaming
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);
  
  // Game assets - cache first for instant loading
  if (url.pathname.includes('/game-covers/') || 
      url.pathname.includes('/sounds/') ||
      url.pathname.includes('/logos/')) {
    event.respondWith(cacheFirstStrategy(request, GAME_CACHE));
    return;
  }
  
  // API calls - network first with cache fallback
  if (url.pathname.includes('/api/')) {
    event.respondWith(networkFirstStrategy(request, API_CACHE));
    return;
  }
  
  // Game pages - stale while revalidate for instant loading + fresh content
  if (url.pathname.includes('/games')) {
    event.respondWith(staleWhileRevalidateStrategy(request, CACHE_NAME));
    return;
  }
  
  // Everything else - network first
  event.respondWith(fetch(request));
});

// Cache-first strategy - for game assets that rarely change
async function cacheFirstStrategy(request, cacheName) {
  try {
    const cache = await caches.open(cacheName);
    const cachedResponse = await cache.match(request);
    
    if (cachedResponse) {
      console.log('⚡ Serving from cache:', request.url);
      // Update cache in background
      fetch(request).then(response => {
        if (response.ok) {
          cache.put(request, response.clone());
        }
      }).catch(() => {}); // Silent fail for background updates
      
      return cachedResponse;
    }
    
    // Not in cache - fetch and cache
    const response = await fetch(request);
    if (response.ok) {
      cache.put(request, response.clone());
      console.log('📦 Cached new asset:', request.url);
    }
    return response;
    
  } catch (error) {
    console.log('❌ Cache-first failed:', error);
    return fetch(request);
  }
}

// Network-first strategy - for API calls that need fresh data
async function networkFirstStrategy(request, cacheName) {
  try {
    const response = await fetch(request);
    
    if (response.ok) {
      const cache = await caches.open(cacheName);
      cache.put(request, response.clone());
      console.log('🔄 Updated API cache:', request.url);
    }
    
    return response;
    
  } catch (error) {
    // Network failed - try cache
    const cache = await caches.open(cacheName);
    const cachedResponse = await cache.match(request);
    
    if (cachedResponse) {
      console.log('📱 Serving stale API data:', request.url);
      return cachedResponse;
    }
    
    throw error;
  }
}

// Stale-while-revalidate - for pages that should load instantly but stay fresh
async function staleWhileRevalidateStrategy(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cachedResponse = await cache.match(request);
  
  // Always try to update cache in background
  const fetchPromise = fetch(request).then(response => {
    if (response.ok) {
      cache.put(request, response.clone());
      console.log('🔄 Background updated:', request.url);
    }
    return response;
  }).catch(() => {}); // Silent fail
  
  // Return cached version immediately if available
  if (cachedResponse) {
    console.log('⚡ Instant load from cache:', request.url);
    return cachedResponse;
  }
  
  // No cache - wait for network
  return fetchPromise;
}

// Background sync for when network returns
self.addEventListener('sync', (event) => {
  if (event.tag === 'background-sync') {
    console.log('🔄 Background sync triggered');
    event.waitUntil(updateCriticalAssets());
  }
});

// Update critical assets in background
async function updateCriticalAssets() {
  try {
    const cache = await caches.open(GAME_CACHE);
    
    // Update game covers and sounds
    const updatePromises = [
      '/game-covers/coinflip.webm',
      '/game-covers/crash.webm',
      '/sounds/game-sounds-sprite.webm'
    ].map(async (url) => {
      try {
        const response = await fetch(url);
        if (response.ok) {
          await cache.put(url, response);
          console.log('✅ Background updated:', url);
        }
      } catch (error) {
        console.log('⚠️ Background update failed:', url);
      }
    });
    
    await Promise.all(updatePromises);
    
  } catch (error) {
    console.log('❌ Background sync failed:', error);
  }
} 