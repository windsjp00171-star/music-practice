/* shared/store.js — 儲存與匯出
   儲存只用 window.storage，不用 localStorage / sessionStorage。
   window.storage 不存在時 available() 回 false，呼叫端要顯示「此環境無法儲存」。

   對外：window.MP.store
     KEYS                          兩個模組的儲存 key
     available()
     get(key)  → Promise<解析後的值 | null>
     set(key, value) → Promise
     exportMarkdown(opts) → Promise<string>
     download(filename, text)
*/
(function(global){
  "use strict";
  var MP = global.MP = global.MP || {};

  var KEYS = {
    progress:  "practice-progress-v1",
    fingering: "fingering-notes-v1"
  };

  var INST_LABEL = { guitar:"木吉他", piano:"鋼琴" };
  var STATE_LABEL = { idle:"未開始", working:"練習中", cleared:"過關" };

  function available(){ return !!global.storage; }

  function get(key){
    if(!available()) return Promise.resolve(null);
    return global.storage.get(key).then(function(r){
      if(!r || !r.value) return null;
      try { return JSON.parse(r.value); } catch(e){ return null; }
    });
  }

  function set(key, value){
    if(!available()) return Promise.reject(new Error("no storage"));
    return global.storage.set(key, JSON.stringify(value));
  }

  function today(){
    var d = new Date();
    return d.getFullYear() + "-" +
           String(d.getMonth() + 1).padStart(2, "0") + "-" +
           String(d.getDate()).padStart(2, "0");
  }

  /* 把進度與註記寫成一份可離線閱讀的 markdown。
     opts.stages = { guitar:[{h,c}], piano:[{h,c}] }   關卡標題由呼叫端提供 */
  function exportMarkdown(opts){
    opts = opts || {};
    var stages = opts.stages || {};

    return Promise.all([get(KEYS.progress), get(KEYS.fingering)])
      .then(function(res){
        var progress = res[0], notes = res[1] || {};
        var out = [];

        out.push("# 樂器練習紀錄");
        out.push("");
        out.push("匯出日期：" + today());
        out.push("");
        if(!available()){
          out.push("> 這個環境沒有 `window.storage`，以下內容可能是空的。");
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
        var keys = Object.keys(notes).filter(function(k){ return notes[k]; });
        out.push("## 指法圖註記");
        out.push("");
        if(!keys.length){
          out.push("（還沒有任何註記）");
        } else {
          ["guitar", "piano"].forEach(function(inst){
            var mine = keys.filter(function(k){ return k.indexOf(inst + ":") === 0; });
            if(!mine.length) return;
            out.push("### " + (INST_LABEL[inst] || inst));
            out.push("");
            mine.forEach(function(k){
              out.push("- **" + k.slice(inst.length + 1) + "**：" + oneLine(notes[k]));
            });
            out.push("");
          });
        }
        out.push("");

        return out.join("\n");
      });
  }

  function stripTags(s){ return String(s).replace(/<[^>]*>/g, ""); }
  function oneLine(s){ return String(s).replace(/\s*\n+\s*/g, " / ").trim(); }

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
    get: get,
    set: set,
    today: today,
    exportMarkdown: exportMarkdown,
    download: download
  };
})(window);
