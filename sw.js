/* Snail Royale - service worker.
   Regra: sempre tenta a versão NOVA na internet (assim as atualizações chegam sozinhas);
   se estiver sem internet, abre a última versão guardada no aparelho. */
const CACHE = 'snail-royale-v1';
const FILES = ['./', 'index.html', 'manifest.json'];
const THREE = 'https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js';

self.addEventListener('install', e => {
  e.waitUntil((async () => {
    const c = await caches.open(CACHE);
    await Promise.allSettled(FILES.map(f => c.add(new Request(f, {cache: 'reload'}))));
    try { await c.add(new Request(THREE, {mode: 'no-cors'})); } catch (err) {}
    self.skipWaiting();
  })());
});

self.addEventListener('activate', e => {
  e.waitUntil((async () => {
    for (const k of await caches.keys()) if (k !== CACHE) await caches.delete(k);
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  const mesmoSite = url.origin === self.location.origin;
  if (!mesmoSite && req.url !== THREE) return; /* resto (internet do jogo) passa direto */

  if (req.url === THREE) { /* biblioteca 3D: usa a guardada e atualiza por trás */
    e.respondWith((async () => {
      const c = await caches.open(CACHE), antigo = await c.match(req);
      const rede = fetch(req).then(r => { c.put(req, r.clone()); return r; }).catch(() => null);
      return antigo || (await rede) || Response.error();
    })());
    return;
  }

  e.respondWith((async () => { /* arquivos do jogo: internet primeiro, guardado se falhar */
    const c = await caches.open(CACHE);
    try {
      const r = await fetch(req, {cache: 'no-cache'});
      if (r && r.ok) c.put(req, r.clone());
      return r;
    } catch (err) {
      return (await c.match(req)) || (req.mode === 'navigate' ? await c.match('index.html') : null) || Response.error();
    }
  })());
});
