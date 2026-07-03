// Service worker mínimo do Nacional 2 — necessário para a app ser instalável
// (PWA) e para um offline básico. Estratégia conservadora: não faz cache de
// APIs nem de conteúdo dinâmico, para nunca servir dados desatualizados.

const CACHE = "n2-static-v1";
const OFFLINE_URL = "/";

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE).then((c) => c.addAll(["/site.webmanifest"]))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))
        )
      )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;

  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return; // só mesmo domínio
  if (url.pathname.startsWith("/api/")) return; // nunca cache de API

  // Navegações: rede primeiro, fallback à página inicial em cache (offline).
  if (req.mode === "navigate") {
    event.respondWith(
      fetch(req).catch(() =>
        caches.match(req).then((r) => r || caches.match(OFFLINE_URL))
      )
    );
    return;
  }

  // Estáticos do Next (/_next/static) e imagens: cache-first.
  if (
    url.pathname.startsWith("/_next/static/") ||
    /\.(?:png|jpg|jpeg|webp|svg|ico|woff2?)$/.test(url.pathname)
  ) {
    event.respondWith(
      caches.match(req).then(
        (cached) =>
          cached ||
          fetch(req).then((res) => {
            const copy = res.clone();
            caches.open(CACHE).then((c) => c.put(req, copy));
            return res;
          })
      )
    );
  }
});
