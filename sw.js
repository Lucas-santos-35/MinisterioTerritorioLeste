// Nome e versão do cache — altere o número (ex: v2, v3) sempre que publicar mudanças importantes
const CACHE_NAME = 'territorios-bh-v1';

// Arquivos principais armazenados para funcionamento offline
const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './manifest.json'
];

// Instalação do Service Worker e pré-cache dos arquivos essenciais
self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE).catch((err) => {
        console.warn('Alguns arquivos não puderam ser pré-cacheados:', err);
      });
    })
  );
});

// Ativação e limpeza imediata de caches antigos
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((oldCache) => caches.delete(oldCache))
      );
    }).then(() => self.clients.claim())
  );
});

// Interceptação de requisições: Estratégia Network-First (Rede Primeiro, Cache como Fallback)
// Garante que João Vitor e Watila sempre vejam a versão mais recente do app quando estiverem online
self.addEventListener('fetch', (event) => {
  // Ignora requisições que não sejam GET ou chamadas externas de API/Firebase
  if (
    event.request.method !== 'GET' ||
    event.request.url.includes('firestore.googleapis.com') ||
    event.request.url.includes('identitytoolkit.googleapis.com')
  ) {
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then((networkResponse) => {
        // Se obteve resposta válida da rede, atualiza o cache local
        if (networkResponse && networkResponse.status === 200) {
          const responseClone = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseClone);
          });
        }
        return networkResponse;
      })
      .catch(() => {
        // Sem internet: busca a cópia salva no cache
        return caches.match(event.request).then((cachedResponse) => {
          return cachedResponse || caches.match('./index.html');
        });
      })
  );
});
