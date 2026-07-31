/* shared/timing.js — 彈奏時機的偵測與統計

   playalong、falling、falling-guitar 都在做同一件事：
   聽到一個音頭（onset）→ 算它離最近的拍點差幾毫秒 → 統計平均與離散。

   共用的是「怎麼算」與「怎麼呈現數字」。
   **不共用建議文案** —— 鋼琴慢了是「找鍵找太久」，吉他慢了是「換和弦來不及」，
   那是兩件不同的事，混成一句通用的話反而幫不上忙。各模組自己傳 advice 進來。

   對外：window.MP.timing
     createOnsetDetector(opts) → { feed(rms, now) → bool, reset() }
     createOffsets(opts)       → { push(ms), stats(), reset(), count() }
     nearestOffset(loopTime, eventTimes, loopSec) → 秒差（可為負）
     rowsHtml(stats, extraHtml, advice)
     idleHtml(text)
*/
(function(global){
  "use strict";
  var MP = global.MP = global.MP || {};

  /* ---------- 音頭偵測 ----------
     判準：音量夠大、而且比最近的平均明顯突升，再加一段保護時間避免同一下算兩次。 */
  function createOnsetDetector(opts){
    opts = opts || {};
    var minRms = opts.minRms === undefined ? 0.02 : opts.minRms;
    var rise   = opts.rise   === undefined ? 1.7  : opts.rise;
    var guard  = opts.guard  === undefined ? 0.1  : opts.guard;   // 秒

    var prevRms = 0, lastOn = -1;

    return {
      feed: function(rms, now){
        var hit = rms > minRms && rms > prevRms * rise && now - lastOn > guard;
        if(hit) lastOn = now;
        prevRms = prevRms * 0.6 + rms * 0.4;
        return hit;
      },
      reset: function(){ prevRms = 0; lastOn = -1; }
    };
  }

  /* ---------- 時間差統計 ----------
     門檻各模組略有不同（跟著彈比掉落練習嚴一點），所以開放調整。 */
  function createOffsets(opts){
    opts = opts || {};
    var limit  = opts.limit  === undefined ? 16 : opts.limit;
    var okAvg  = opts.okAvg  === undefined ? 30 : opts.okAvg;
    var offAvg = opts.offAvg === undefined ? 70 : opts.offAvg;
    var okSd   = opts.okSd   === undefined ? 35 : opts.okSd;
    var offSd  = opts.offSd  === undefined ? 70 : opts.offSd;

    var list = [];

    function cls(v, ok, off){ return v < ok ? "ok" : (v < off ? "off" : "bad"); }

    return {
      push: function(ms){
        list.push(ms);
        if(list.length > limit) list.shift();
      },
      count: function(){ return list.length; },
      reset: function(){ list.length = 0; },
      stats: function(){
        if(!list.length) return null;
        var n = list.length;
        var avg = list.reduce(function(a, b){ return a + b; }, 0) / n;
        var sd = Math.sqrt(
          list.reduce(function(a, b){ return a + (b - avg) * (b - avg); }, 0) / n
        );
        return {
          n: n,
          avg: avg,
          sd: sd,
          avgClass: cls(Math.abs(avg), okAvg, offAvg),
          sdClass:  cls(sd, okSd, offSd),
          onTime:   Math.abs(avg) < okAvg,
          late:     avg > 0
        };
      }
    };
  }

  /* 循環樂句裡，某個時刻離最近事件差多少秒。跨循環邊界要繞回來。 */
  function nearestOffset(loopTime, eventTimes, loopSec){
    var best = Infinity;
    eventTimes.forEach(function(et){
      var dt = loopTime - et;
      if(dt >  loopSec / 2) dt -= loopSec;
      if(dt < -loopSec / 2) dt += loopSec;
      if(Math.abs(dt) < Math.abs(best)) best = dt;
    });
    return best === Infinity ? null : best;
  }

  /* ---------- 呈現 ---------- */

  function row(label, value, cls, style){
    return '<div class="fbrow"><span class="fblab">' + label + '</span>' +
           '<span class="fbval ' + (cls || "") + '"' +
           (style ? ' style="' + style + '"' : '') + '>' + value + '</span></div>';
  }

  function rowsHtml(stats, extraHtml, advice){
    return row("平均時間差",
               (stats.avg > 0 ? "+" : "") + Math.round(stats.avg) + " ms",
               stats.avgClass) +
           row("穩定度（越小越穩）",
               "±" + Math.round(stats.sd) + " ms",
               stats.sdClass) +
           (extraHtml || "") +
           '<p class="fbnote">' + advice + '</p>';
  }

  function idleHtml(text){
    return '<p class="fbnote" style="margin:0;padding:0;border:0">' + text + '</p>';
  }

  MP.timing = {
    createOnsetDetector: createOnsetDetector,
    createOffsets: createOffsets,
    nearestOffset: nearestOffset,
    row: row,
    rowsHtml: rowsHtml,
    idleHtml: idleHtml
  };
})(window);
