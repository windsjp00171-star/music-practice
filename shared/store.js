/* shared/store.js — 儲存與匯出

   兩層後端，依序嘗試：
     1. window.storage  —— 沙箱環境提供的 API，有就優先用
     2. localStorage    —— 真實瀏覽器（file:// 與 GitHub Pages 都可用）

   為什麼要第二層：window.storage 在 Chrome／Safari／Firefox 裡根本不存在，
   只靠它的話，指法圖註記、關卡進度、自建曲庫在所有實際使用的環境都存不住。

   localStorage 綁 origin，這幾個互不相通：
     file://  ／  http://localhost:PORT（連 port 不同都算）  ／  https://…github.io
   所以「匯出 markdown」仍然是唯一能跨環境、跨裝置搬資料的方式。

   對外：window.MP.store
     KEYS, available(), backend()
     get(key) → Promise<值|null>
     set(key, value) → Promise
     remove(key) → Promise
     today(), download(filename, text)
     exportMarkdown(opts) → Promise<string>
*/
(function(global){
  "use strict";
  var MP = global.MP = global.MP || {};

  var KEYS = {
    progress:  "practice-progress-v1",
    fingering: "fingering-notes-v1",
    songs:     "songs-local-v1"
  };

  /* file:// 底下所有本機 HTML 共用同一個 origin，加前綴避免跟別的工具撞名 */
  var PREFIX = "mp:";

  var INST_LABEL  = { guitar:"木吉他", piano:"鋼琴" };
  var STATE_LABEL = { idle:"未開始", working:"練習中", cleared:"過關" };

  function hasWindowStorage(){
    return !!(global.storage && typeof global.storage.get === "function");
  }

  var lsOk = null;
  function hasLocalStorage(){
    if(lsOk !== null) return lsOk;
    try{
      var k = PREFIX + "__probe";
      global.localStorage.setItem(k, "1");
      lsOk = global.localStorage.getItem(k) === "1";
      global.localStorage.removeItem(k);
    }catch(e){ lsOk = false; }               // 無痕模式或被政策擋掉
    return lsOk;
  }

  function backend(){
    if(hasWindowStorage()) return "window.storage";
    if(hasLocalStorage())  return "localStorage";
    return null;
  }

  function available(){ return backend() !== null; }

  function parse(raw){
    if(raw === null || raw === undefined || raw === "") return null;
    try{ return JSON.parse(raw); }catch(e){ return null; }
  }

  function get(key){
    if(hasWindowStorage()){
      return global.storage.get(key).then(function(r){
        return parse(r && r.value);
      });
    }
    if(hasLocalStorage()){
      return Promise.resolve(parse(global.localStorage.getItem(PREFIX + key)));
    }
    return Promise.resolve(null);
  }

  function set(key, value){
    var raw = JSON.stringify(value);
    if(hasWindowStorage()) return global.storage.set(key, raw);
    if(hasLocalStorage()){
      try{
        global.localStorage.setItem(PREFIX + key, raw);
        return Promise.resolve();
      }catch(e){
        return Promise.reject(e);            // 多半是容量爆掉
      }
    }
    return Promise.reject(new Error("no storage"));
  }

  function remove(key){
    if(hasWindowStorage()) return global.storage.set(key, "");
    if(hasLocalStorage()){
      global.localStorage.removeItem(PREFIX + key);
      return Promise.resolve();
    }
    return Promise.reject(new Error("no storage"));
  }

  function today(){
    var d = new Date();
    return d.getFullYear() + "-" +
           String(d.getMonth() + 1).padStart(2, "0") + "-" +
           String(d.getDate()).padStart(2, "0");
  }

  function stripTags(s){ return String(s).replace(/<[^>]*>/g, ""); }
  function oneLine(s){ return String(s).replace(/\s*\n+\s*/g, " / ").trim(); }

  /* 把進度、註記與自建曲庫寫成一份可離線閱讀的 markdown。
     opts.stages = { guitar:[{h,c}], piano:[{h,c}] }   關卡標題由呼叫端提供 */
  function exportMarkdown(opts){
    opts = opts || {};
    var stages = opts.stages || {};

    return Promise.all([get(KEYS.progress), get(KEYS.fingering), get(KEYS.songs)])
      .then(function(res){
        var progress = res[0], notes = res[1] || {}, songs = res[2] || [];
        var out = [];

        out.push("# 樂器練習紀錄");
        out.push("");
        out.push("匯出日期：" + today());
        out.push("");
        if(!available()){
          out.push("> 這個環境沒有可用的儲存，以下內容可能是空的。");
          out.push("");
        }

        /* ---- 關卡進度 ---- */
        Object.keys(stages).forEach(function(inst){
          var list = stages[inst];
          var recs = (progress && progress[inst]) || [];
          var done = recs.filter(function(r){ return r && r.st === "cleared"; }).length;

          out.push("## " + (INST_LABEL[inst] || inst) + " 進度　" + done + " / " + list.length);
          out.push("");
          list.forEach(function(stage, i){
            var rec = recs[i] || { st:"idle", note:"", on:null };
            var line = "- **" + String(i + 1).padStart(2, "0") + " " + stage.h + "**　" +
                       (STATE_LABEL[rec.st] || rec.st);
            if(rec.st === "cleared" && rec.on) line += "（" + rec.on + "）";
            out.push(line);
            out.push("  - 通過條件：" + stripTags(stage.c));
            if(rec.note) out.push("  - 卡點：" + oneLine(rec.note));
          });
          out.push("");
        });

        /* ---- 指法圖註記 ---- */
        var noteKeys = Object.keys(notes).filter(function(k){ return notes[k]; });
        out.push("## 指法圖註記");
        out.push("");
        if(!noteKeys.length){
          out.push("（還沒有任何註記）");
          out.push("");
        } else {
          ["guitar", "piano"].forEach(function(inst){
            var mine = noteKeys.filter(function(k){ return k.indexOf(inst + ":") === 0; });
            if(!mine.length) return;
            out.push("### " + (INST_LABEL[inst] || inst));
            out.push("");
            mine.forEach(function(k){
              out.push("- **" + k.slice(inst.length + 1) + "**：" + oneLine(notes[k]));
            });
            out.push("");
          });
        }

        /* ---- 自建曲庫 ---- */
        out.push("## 我的曲目");
        out.push("");
        if(!songs.length){
          out.push("（還沒有自建曲目）");
        } else {
          songs.forEach(function(s){
            out.push("### " + s.title);
            out.push("");
            out.push("- " + (s.mode === "degree" ? "級數輸入 · key of " + s.key : "和弦名輸入") +
                     "　" + s.beats + "/4　" + s.bars.length + " 小節");
            out.push("- 小節：`" + s.bars.join(" ") + "`");
            out.push("");
          });
        }
        out.push("");

        return out.join("\n");
      });
  }

  function download(filename, text){
    var blob = new Blob([text], { type:"text/markdown;charset=utf-8" });
    var url = URL.createObjectURL(blob);
    var a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(function(){ URL.revokeObjectURL(url); }, 1000);
  }

  MP.store = {
    KEYS: KEYS,
    available: available,
    backend: backend,
    get: get,
    set: set,
    remove: remove,
    today: today,
    exportMarkdown: exportMarkdown,
    download: download
  };
})(window);
