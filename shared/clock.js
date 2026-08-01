/* shared/clock.js — lookahead 排程器

   四個模組都要「提前一點把聲音排進 Web Audio 的時間軸」：
   chord-trainer、playalong、falling、falling-guitar。
   setTimeout 的精度不足以直接當節拍器，正確做法是用 setInterval 定期
   往前看一小段，把該響的東西用絕對時間排好，交給音訊執行緒去準時播。

   界線：共用的是「什麼時候」，不是「畫成什麼樣」。
   鋼琴的黑白鍵幾何與吉他的六弦道各自留在自己的檔案裡。
   時間→座標的換算（spb / leadSec / pps）刻意留在各自模組——
   那是三行算式，抽出來只會多一層轉手，不會比較好改。

   對外：window.MP.clock
     createBeatClock(ctx, opts)  → { start, stop, isRunning }
       start(firstBeatTime, getSpb, onBeat)   onBeat(index, time)
     roundRect(g, x, y, w, h, r)
*/
(function(global){
  "use strict";
  var MP = global.MP = global.MP || {};

  /* ---------- lookahead 排程器 ---------- */

  function createBeatClock(ctx, opts){
    opts = opts || {};
    var ahead      = opts.ahead      === undefined ? 0.1 : opts.ahead;
    var intervalMs = opts.intervalMs === undefined ? 25  : opts.intervalMs;

    var timer = null, index = 0, next = 0;
    var getSpb = null, onBeat = null;

    function pump(){
      /* 每次只往前排 ahead 秒。getSpb 每拍重新問一次，
         所以播放中改 BPM 會從下一拍生效，不必重新開始。 */
      while(next < ctx.currentTime + ahead){
        onBeat(index, next);
        index++;
        next += getSpb();
      }
    }

    return {
      start: function(firstBeatTime, spbFn, beatFn){
        this.stop();
        index = 0;
        next = firstBeatTime;
        getSpb = spbFn;
        onBeat = beatFn;
        pump();                       // 先排一次，不要等第一個 interval
        timer = setInterval(pump, intervalMs);
      },
      stop: function(){
        if(timer !== null){ clearInterval(timer); timer = null; }
      },
      isRunning: function(){ return timer !== null; }
    };
  }

  /* 圓角矩形。兩個掉落模組畫塊都要用，跟樂器無關。 */
  function roundRect(g, x, y, w, h, r){
    g.beginPath();
    g.moveTo(x + r, y);
    g.arcTo(x + w, y,     x + w, y + h, r);
    g.arcTo(x + w, y + h, x,     y + h, r);
    g.arcTo(x,     y + h, x,     y,     r);
    g.arcTo(x,     y,     x + w, y,     r);
    g.closePath();
    g.fill();
  }

  MP.clock = {
    createBeatClock: createBeatClock,
    roundRect: roundRect
  };
})(window);
