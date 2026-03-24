// Racing Intel Service Worker — checks for new articles and sends notifications

const CACHE_KEY = 'ri-last-check';
const CHECK_INTERVAL = 5 * 60 * 1000; // 5 minutes

// Install — activate immediately
self.addEventListener('install', function(e) {
  self.skipWaiting();
});

self.addEventListener('activate', function(e) {
  e.waitUntil(self.clients.claim());
});

// Listen for messages from the main page
self.addEventListener('message', function(e) {
  if (e.data && e.data.type === 'CHECK_NEW') {
    checkForNew();
  }
  if (e.data && e.data.type === 'SET_ARTICLE_COUNT') {
    caches.open('ri-data').then(function(cache) {
      cache.put('article-count', new Response(String(e.data.count)));
    });
  }
});

// Periodic check via the page's setInterval calling postMessage
async function checkForNew() {
  try {
    var response = await fetch(self.registration.scope, { cache: 'no-store' });
    var text = await response.text();

    // Count articles in the HTML
    var matches = text.match(/id:\s*"/g);
    var newCount = matches ? matches.length : 0;

    // Get previously known count
    var cache = await caches.open('ri-data');
    var prev = await cache.match('article-count');
    var prevCount = prev ? parseInt(await prev.text()) : 0;

    if (prevCount > 0 && newCount > prevCount) {
      var diff = newCount - prevCount;
      self.registration.showNotification('Racing Intel', {
        body: diff + ' new email' + (diff > 1 ? 's' : '') + ' pulled in',
        icon: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect width="100" height="100" rx="20" fill="%23000"/><text x="50" y="68" font-family="Arial" font-size="55" font-weight="bold" fill="white" text-anchor="middle">R</text></svg>',
        badge: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect width="100" height="100" rx="20" fill="%23000"/><text x="50" y="68" font-family="Arial" font-size="55" font-weight="bold" fill="white" text-anchor="middle">R</text></svg>',
        tag: 'ri-new-emails',
        renotify: true
      });
    }

    // Update stored count
    await cache.put('article-count', new Response(String(newCount)));
  } catch (err) {
    // Silently fail — network issue or similar
  }
}

// When notification is clicked, open the app
self.addEventListener('notificationclick', function(e) {
  e.notification.close();
  e.waitUntil(
    self.clients.matchAll({ type: 'window' }).then(function(clients) {
      for (var i = 0; i < clients.length; i++) {
        if (clients[i].url.indexOf('racing-intel') !== -1 && 'focus' in clients[i]) {
          return clients[i].focus();
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow(self.registration.scope);
      }
    })
  );
});
