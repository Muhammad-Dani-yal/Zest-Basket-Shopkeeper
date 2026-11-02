// Only cache the offline document. Authenticated API responses are never cached.
self.addEventListener('install',e=>{self.skipWaiting()});
self.addEventListener('activate',e=>e.waitUntil(self.clients.claim()));
self.addEventListener('fetch',e=>{if(e.request.mode==='navigate')e.respondWith(fetch(e.request).catch(()=>new Response('<html><meta name="viewport" content="width=device-width"><body style="font:18px sans-serif;text-align:center;padding:64px;color:#5708e8"><h1>ZestBasket</h1><h2>Network Error</h2><p>Connect to the internet and try again.</p><button onclick="location.reload()">Retry</button></body></html>',{headers:{'Content-Type':'text/html'}})))});
