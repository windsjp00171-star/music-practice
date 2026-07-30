/* shared/theory.js — 樂理計算
   移植自 PitchPal（backend/jianpu.py、backend/core.py），執行期不依賴該專案。

   對外：window.MP.theory
     NOTE_NAMES_SHARP / NOTE_NAMES_FLAT
     JIANPU_INTERVALS      簡譜級數 → 半音
     MELODY_KEY_ROOTS      key → MIDI（中央 C = 60）
     CHORD_QUALITIES       和弦性質 → 音程表
     KEYS                  介面用的十二個 key（實用拼法）
     DEGREES               級數 token（含第七級）
     keySemitone(key)
     noteNames(key)        依 key 回傳升記號或降記號表
     getDiatonicChords(key)  → 七個順階和弦
     chordForDegree(key, degree)
     capoSuggestions(key)  → [{shape, capo}]
     parseChordToken(tok)  → {root, quality, bass, notes}
*/
(function(global){
  "use strict";
  var MP = global.MP = global.MP || {};

  var SHARP = ["C","C#","D","D#","E","F","F#","G","G#","A","A#","B"];
  var FLAT  = ["C","Db","D","Eb","E","F","Gb","G","Ab","A","Bb","B"];

  var JIANPU_INTERVALS = { 1:0, 2:2, 3:4, 4:5, 5:7, 6:9, 7:11 };

  var MELODY_KEY_ROOTS = {
    "C":60, "C#":61, "D":62, "D#":63, "E":64, "F":65,
    "F#":66, "G":67, "G#":68, "A":69, "A#":70, "B":71
  };

  /* 降記號拼法對應到 MELODY_KEY_ROOTS 的升記號拼法 */
  var ENHARMONIC = { "Db":"C#", "Eb":"D#", "Gb":"F#", "Ab":"G#", "Bb":"A#" };

  /* 原始碼只用升記號，key of F 會產出 A# 而非 Bb。
     教會和弦譜寫 Bb，所以這些 key 改用降記號書寫。 */
  var FLAT_KEYS = { "F":1, "Bb":1, "Eb":1, "Ab":1, "Db":1, "Gb":1 };

  /* 介面上提供的十二個 key，用實務上常見的拼法 */
  var KEYS = ["C","C#","D","Eb","E","F","F#","G","Ab","A","Bb","B"];

  var MAJOR_SCALE = [0,2,4,5,7,9,11];
  var DIATONIC_QUALITIES = ["", "m", "m", "", "", "m", "dim"];
  var DEGREES = ["1","2m","3m","4","5","6m","7dim"];

  var CHORD_QUALITIES = {
    "maj7":[0,4,7,11], "maj9":[0,4,7,11,14], "M7":[0,4,7,11],
    "m7b5":[0,3,6,10], "add9":[0,4,7,14],    "add2":[0,2,4,7],
    "sus4":[0,5,7],    "sus2":[0,2,7],       "sus":[0,5,7],
    "dim7":[0,3,6,9],  "dim":[0,3,6],        "aug":[0,4,8],
    "m7":[0,3,7,10],   "m9":[0,3,7,10,14],
    "7":[0,4,7,10],    "9":[0,4,7,10,14],
    "2":[0,2,4,7],     "m":[0,3,7],          "":[0,4,7]
  };

  /* 比對 root 時兩字元音名必須排在單字元前面，
     否則 "C#" 會被誤判成 "C"。 */
  var ROOT_TOKENS = ["C#","D#","F#","G#","A#","Db","Eb","Gb","Ab","Bb",
                     "C","D","E","F","G","A","B"];

  /* 吉他上按得順的 key（開放和弦），用來算 capo */
  var GUITAR_KEYS = [["C",0],["D",2],["E",4],["G",7],["A",9]];

  function normalizeKey(key){ return ENHARMONIC[key] || key; }

  function keySemitone(key){
    var m = MELODY_KEY_ROOTS[normalizeKey(key)];
    return m === undefined ? null : m - 60;
  }

  function noteNames(key){ return FLAT_KEYS[key] ? FLAT : SHARP; }

  function rootSemitone(name){
    var i = SHARP.indexOf(name);
    if(i >= 0) return i;
    i = FLAT.indexOf(name);
    return i >= 0 ? i : null;
  }

  function getDiatonicChords(key){
    var root = keySemitone(key);
    if(root === null) return null;
    var names = noteNames(key);
    return MAJOR_SCALE.map(function(step, i){
      return names[(root + step) % 12] + DIATONIC_QUALITIES[i];
    });
  }

  function chordForDegree(key, degree){
    var i = DEGREES.indexOf(degree);
    if(i < 0) return "";
    var list = getDiatonicChords(key);
    return list ? list[i] : "";
  }

  function capoSuggestions(key, maxCapo){
    var target = keySemitone(key);
    if(target === null) return [];
    var limit = maxCapo === undefined ? 7 : maxCapo;
    return GUITAR_KEYS
      .map(function(pair){
        return { shape: pair[0], capo: ((target - pair[1]) % 12 + 12) % 12 };
      })
      .filter(function(x){ return x.capo <= limit; })
      .sort(function(a,b){ return a.capo - b.capo; });
  }

  function parseChordToken(tok){
    if(!tok) return null;
    var t = String(tok).trim();

    var slash = t.indexOf("/");
    if(slash >= 0) t = t.slice(0, slash);   // 分數和弦的低音不使用

    var root = null;
    for(var i = 0; i < ROOT_TOKENS.length; i++){
      if(t.indexOf(ROOT_TOKENS[i]) === 0){ root = ROOT_TOKENS[i]; break; }
    }
    if(root === null) return null;

    var quality = t.slice(root.length);
    var intervals = CHORD_QUALITIES[quality];
    if(!intervals) return null;

    var semi = rootSemitone(root);
    return {
      root: root,
      quality: quality,
      bass: 48 + semi,
      notes: intervals.map(function(iv){
        var n = 60 + semi + iv;
        return n > 76 ? n - 12 : n;
      })
    };
  }

  MP.theory = {
    NOTE_NAMES_SHARP: SHARP,
    NOTE_NAMES_FLAT: FLAT,
    JIANPU_INTERVALS: JIANPU_INTERVALS,
    MELODY_KEY_ROOTS: MELODY_KEY_ROOTS,
    CHORD_QUALITIES: CHORD_QUALITIES,
    KEYS: KEYS,
    DEGREES: DEGREES,
    GUITAR_KEYS: GUITAR_KEYS,
    keySemitone: keySemitone,
    noteNames: noteNames,
    rootSemitone: rootSemitone,
    getDiatonicChords: getDiatonicChords,
    chordForDegree: chordForDegree,
    capoSuggestions: capoSuggestions,
    parseChordToken: parseChordToken
  };
})(window);
