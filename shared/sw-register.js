/* shared/sw-register.js — 註冊離線快取

   Service Worker 只在 https:// 或 localhost 下運作。
   file:// 直接雙擊開啟時不會註冊，這裡靜靜跳過，不能讓頁面出錯。 */
(function(){
  "use strict";
  if(!("serviceWorker" in navigator)) return;
  if(location.protocol !== "https:" && location.hostname !== "localhost"
     && location.hostname !== "127.0.0.1") return;

  window.addEventListener("load", function(){
    /* sw.js 放在根目錄，scope 才涵蓋得到所有模組頁 */
    navigator.serviceWorker.register("sw.js").catch(function(){
      /* 註冊失敗就只是不能離線用，其他功能照常 */
    });
  });
})();
