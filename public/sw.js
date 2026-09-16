// Service Worker do ContrateJá
// Guarda em cache as páginas e arquivos visitados, pra funcionar
// mesmo com internet instável, e mostra uma página de aviso quando
// uma página nova (nunca visitada) é aberta sem internet.

const CACHE_NAME = 'contrateja-v1'

self.addEventListener('install', (event) => {
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((chaves) =>
      Promise.all(
        chaves
          .filter((chave) => chave !== CACHE_NAME)
          .map((chave) => caches.delete(chave))
      )
    )
  )
  self.clients.claim()
})

self.addEventListener('fetch', (event) => {
  const { request } = event

  // Só cuida de navegação de páginas (GET). Chamadas ao Supabase (API)
  // seguem direto pra rede — dados nunca ficam "presos" em cache velho.
  if (request.method !== 'GET') return
  if (request.url.includes('supabase.co')) return

  event.respondWith(
    caches.open(CACHE_NAME).then(async (cache) => {
      try {
        const resposta = await fetch(request)
        if (resposta && resposta.status === 200) {
          cache.put(request, resposta.clone())
        }
        return resposta
      } catch (erro) {
        const emCache = await cache.match(request)
        if (emCache) return emCache
        if (request.mode === 'navigate') {
          const fallback = await cache.match('/offline.html')
          if (fallback) return fallback
        }
        throw erro
      }
    })
  )
})
