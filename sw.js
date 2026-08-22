// Minimal service worker for Kadiyala's Household.
// Purpose: satisfy "installable as an app" requirements and let the app shell
// (index.html + manifest + icons) load even with a flaky connection.
// It deliberately does NOT cache or intercept anything cross-origin (Firebase,
// the xlsx CDN script) — those always go straight to the network untouched.

var CACHE_NAME = "kadiyala-household-v2";
var APP_SHELL = ["./index.html", "./manifest.json", "./icon192.png", "./icon512.png"];

self.addEventListener("install", function (event) {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then(function (cache) {
      return cache.addAll(APP_SHELL);
    })
  );
});

self.addEventListener("activate", function (event) {
  event.waitUntil(
    caches
      .keys()
      .then(function (names) {
        return Promise.all(
          names
            .filter(function (n) { return n !== CACHE_NAME; })
            .map(function (n) { return caches.delete(n); })
        );
      })
      .then(function () { return self.clients.claim(); })
  );
});

self.addEventListener("fetch", function (event) {
  var req = event.request;
  if (req.method !== "GET" || new URL(req.url).origin !== self.location.origin) {
    return; // let cross-origin (Firebase/CDN) and non-GET requests pass through untouched
  }
  event.respondWith(
    fetch(req)
      .then(function (res) {
        var resClone = res.clone();
        caches.open(CACHE_NAME).then(function (cache) { cache.put(req, resClone); });
        return res;
      })
      .catch(function () {
        return caches.match(req).then(function (cached) {
          return cached || caches.match("./index.html");
        });
      })
  );
});
