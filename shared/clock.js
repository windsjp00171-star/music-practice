/* shared/clock.js — lookahead 排程器與時間軸幾何

   四個模組都要「提前一點把聲音排進 Web Audio 的時間軸」：
   chord-trainer、playalong、falling、falling-guitar。
   setTimeout 的精度不足以直接當節拍器，正確做法是用 setInterval 定期
   往前看一小段，把該響的東西用絕對時間排好，交給音訊執行緒去準時播。

   這裡也放兩個掉落模組共用的「時間 → 螢幕座標」換算。
   注意界線：共用的是「什麼時候」，不是「畫成什麼樣」。
   鋼琴的黑白鍵幾何與吉他的六弦道各自留在自己的檔案裡。

   對外：window.MP.clock
     createBeatClock(ctx, opts)  → { start, stop, isRunning }
       start(firstBeatTime, getSpb, onBeat)   onBeat(index, time)
     timeline(opts)              → { spb, leadSec, pps, yAt, beatLines }
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

  /* ---------- 時間軸幾何（兩個掉落模組共用） ---------- */

  /* getBpm / getLead 傳函式，因為使用者會在播放中調整 */
  function timeline(o){
    var api = {
      spb: function(){ return 60 / o.getBpm(); },
      leadSec: function(){ return o.getLead() * api.spb(); },
      /* 每秒掉幾個像素：前導拍數要正好填滿判定線以上的高度 */
      pps: function(){ return o.hitY / api.leadSec(); },
      /* 某個絕對時刻在畫面上的 y。t 是「相對於起始時刻」的秒數 */
      yAt: function(eventT, t){ return o.hitY - (eventT - t) * api.pps(); },
      /* 目前畫面上看得到的拍線 y 座標 */
      beatLines: function(t, count){
        var sp = api.spb(), P = api.pps(), out = [];
        for(var k = 0; k <= count; k++){
          var bt = Math.ceil(t / sp) * sp + k * sp;
          var y = o.hitY - (bt - t) * P;
          if(y >= 0 && y <= o.hitY) out.push(y);
        }
        return out;
      }
    };
    return api;
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
    timeline: timeline,
    roundRect: roundRect
  };
})(window);
