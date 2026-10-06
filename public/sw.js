const CACHE_NAME = 'siga-shell-v1';
const PRECACHE_URLS = [
  '/manifest.webmanifest',
  '/assets/siga-icon-192.png',
  '/assets/siga-icon-512.png',
  '/assets/siga-icon-180.png',
  '/assets/siga-logo.jpeg',
  '/assets/siga-pin.jpeg',
];

self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    const page = await fetch('/', { cache: 'reload' });
    if (!page.ok) throw new Error('Não foi possível preparar o SIGA para uso offline.');

    const html = await page.clone().text();
    await cache.put('/', page);
    await cache.addAll(PRECACHE_URLS);

    const appAssets = [...html.matchAll(/(?:src|href)="(\/assets\/[^\"]+\.(?:js|css))"/g)]
      .map((match) => match[1]);
    await Promise.all(appAssets.map(async (assetUrl) => {
      const response = await fetch(assetUrl, { cache: 'reload' });
      if (response.ok) await cache.put(assetUrl, response);
    }));

    await self.skipWaiting();
  })());
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const cacheNames = await caches.keys();
    await Promise.all(cacheNames.filter((name) => name.startsWith('siga-shell-') && name !== CACHE_NAME)
      .map((name) => caches.delete(name)));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const requestUrl = new URL(request.url);

  if (request.method !== 'GET' || requestUrl.origin !== self.location.origin || requestUrl.pathname.startsWith('/api/')) return;

  if (request.mode === 'navigate') {
    event.respondWith((async () => {
      const cache = await caches.open(CACHE_NAME);
      try {
        const response = await fetch(request);
        if (response.ok) await cache.put('/', response.clone());
        return response;
      } catch {
        return (await cache.match('/')) || Response.error();
      }
    })());
    return;
  }

  if (!['script', 'style', 'image', 'font'].includes(request.destination)) return;
  if (requestUrl.pathname.startsWith('/materiais/')) return;

  event.respondWith((async () => {
    const cache = await caches.open(CACHE_NAME);
    const cached = await cache.match(request);
    if (cached) return cached;

    try {
      const response = await fetch(request);
      if (response.ok) await cache.put(request, response.clone());
      return response;
    } catch {
      return Response.error();
    }
  })());
});
