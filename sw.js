/* sw.js — 離線快取
   目的：第一次連過網路之後，整包就能完全離線使用。
   琴房、教會這種網路差的地方照樣練。

   策略：
   - 自家檔案（HTML／JS／CSS／圖示）預先快取，之後一律先讀快取
   - Google Fonts 執行期才快取；拿不到就退回系統字體，不影響功能
   - 換版本只要改 VERSION，舊快取會在啟用時清掉

   注意：Service Worker 只在 https:// 或 localhost 下運作，
   file:// 不會註冊——那是瀏覽器規則，不是設定問題。 */

var VERSION = "v1";
var CACHE = "music-practice-" + VERSION;

/* 應用程式本體。少一個檔案會讓整批 addAll 失敗，所以清單要跟實際檔案一致。 */
var SHELL = [
  "./",
  "./index.html",
  "./zero.html",
  "./fingering.html",
  "./demo.html",
  "./chord-trainer.html",
  "./progress.html",
  "./listen.html",
  "./playalong.html",
  "./falling.html",
  "./falling-guitar.html",
  "./songs.html",
  "./shared/tokens.css",
  "./shared/theory.js",
  "./shared/chords.js",
  "./shared/pitch.js",
  "./shared/audio.js",
  "./shared/clock.js",
  "./shared/timing.js",
  "./shared/store.js",
  "./shared/stages.js",
  "./shared/sw-register.js",
  "./manifest.json",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
  "./icons/icon-maskable-512.png"
];

self.addEventListener("install", function(e){
  e.waitUntil(
    caches.open(CACHE).then(function(c){
      /* 逐一加入而不用 addAll：任何一個檔案 404 都不該讓整包離線功能失效 */
      return Promise.all(SHELL.map(function(url){
        return c.add(url).catch(function(){ /* 這個檔案沒快取到，之後走網路 */ });
      }));
    }).then(function(){ return self.skipWaiting(); })
  );
});

self.addEventListener("activate", function(e){
  e.waitUntil(
    caches.keys().then(function(keys){
      return Promise.all(keys.map(function(k){
        if(k !== CACHE) return caches.delete(k);
      }));
    }).then(function(){ return self.clients.claim(); })
  );
});

self.addEventListener("fetch", function(e){
  var req = e.request;
  if(req.method !== "GET") return;

  var url = new URL(req.url);
  var sameOrigin = url.origin === self.location.origin;

  if(sameOrigin){
    /* 自家檔案：先快取，沒有才走網路，順便補進快取 */
    e.respondWith(
      caches.match(req).then(function(hit){
        if(hit) return hit;
        return fetch(req).then(function(res){
          if(res && res.status === 200){
            var copy = res.clone();
            caches.open(CACHE).then(function(c){ c.put(req, copy); });
          }
          return res;
        }).catch(function(){
          /* 離線且沒快取：導頁請求就退回首頁，其他就讓它失敗 */
          if(req.mode === "navigate") return caches.match("./index.html");
        });
      })
    );
    return;
  }

  /* 字體之類的外部資源：有快取先用，否則抓下來存著。
     完全拿不到也沒關係，字體會退回系統預設。 */
  e.respondWith(
    caches.match(req).then(function(hit){
      if(hit) return hit;
      return fetch(req).then(function(res){
        var copy = res.clone();
        caches.open(CACHE).then(function(c){ c.put(req, copy); });
        return res;
      }).catch(function(){ return hit; });
    })
  );
});
