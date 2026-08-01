/* sw.js — 離線快取
   目的：第一次連過網路之後，整包就能完全離線使用。
   琴房、教會這種網路差的地方照樣練。

   策略：**自家檔案一律網路優先，離線才用快取。**

   為什麼不是快取優先：這個工具還在持續修改。快取優先的話，
   改完推上去，平板會一直開舊版，除非每次都記得改 VERSION——
   那是遲早會忘記的事，而且症狀（「我明明改了啊」）很難聯想到快取。
   網路優先只是多花零點幾秒，離線能力完全不變。

   字體之類的外部資源仍走快取優先，那些不會變。

   注意：Service Worker 只在 https:// 或 localhost 下運作，
   file:// 不會註冊——那是瀏覽器規則，不是設定問題。 */

var VERSION = "v5";
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
  "./shared/skin.css",
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
    /* 自家檔案：網路優先，成功就順手更新快取；失敗（離線）才回頭用快取 */
    e.respondWith(
      fetch(req).then(function(res){
        if(res && res.status === 200){
          var copy = res.clone();
          caches.open(CACHE).then(function(c){ c.put(req, copy); });
        }
        return res;
      }).catch(function(){
        return caches.match(req).then(function(hit){
          if(hit) return hit;
          /* 離線且沒快取：導頁請求退回首頁，其他就讓它失敗 */
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
