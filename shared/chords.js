/* shared/chords.js — 和弦指型與 voicing 資料
   這裡是「資料」，不是邏輯。要改和弦清單就改下面的常數，不要改架構。

   對外：window.MP.chords
     GUITAR_TUNING   六條空弦 MIDI（第6弦 → 第1弦）
     STRING_NAMES    ["E","A","D","G","B","e"]
     GUITAR_SHAPES   和弦名 → { adv, desc, frets, fingers, barre? }
                     frets:   0 = 空弦, null = 不彈, n = 第 n 格
                     fingers: 1食 2中 3無名 4小指
     PIANO_CHORDS    和弦名 → { adv, root, q }  root = 半音, q = "maj"|"min"
     TRIAD_INTERVALS
     triad(root, q)      → 三個半音值
     voicings(root, q)   → 原位／第一轉位／第二轉位（含鋼琴手指編號）
     fingerPositions(shape) → { 手指編號: {s, f} }
     commonFingers(a, b)    → 兩個指型共用不動的手指
*/
(function(global){
  "use strict";
  var MP = global.MP = global.MP || {};

  var GUITAR_TUNING = [40, 45, 50, 55, 59, 64];
  var STRING_NAMES  = ["E", "A", "D", "G", "B", "e"];

  var GUITAR_SHAPES = {
    "A":  { adv:false, desc:"三根手指擠在第二格。手指立起來，不要壓到旁邊的弦。",
            frets:[null,0,2,2,2,0], fingers:[0,0,1,2,3,0] },
    "Am": { adv:false, desc:"跟 E 是同一個形狀往高音弦移一條。",
            frets:[null,0,2,2,1,0], fingers:[0,0,2,3,1,0] },
    "C":  { adv:false, desc:"手指斜著排。第六弦不彈，右手注意別掃到。",
            frets:[null,3,2,0,1,0], fingers:[0,3,2,0,1,0] },
    "D":  { adv:false, desc:"三角形。只彈四條弦，第五、六弦不彈。",
            frets:[null,null,0,2,3,2], fingers:[0,0,0,1,3,2] },
    "Dm": { adv:false, desc:"D 的第一弦從第二格降到第一格。",
            frets:[null,null,0,2,3,1], fingers:[0,0,0,2,3,1] },
    "E":  { adv:false, desc:"六條弦全彈，聲音最厚的和弦。",
            frets:[0,2,2,1,0,0], fingers:[0,2,3,1,0,0] },
    "Em": { adv:false, desc:"最好按的和弦，只要兩根手指。第一週就能按乾淨。",
            frets:[0,2,2,0,0,0], fingers:[0,2,3,0,0,0] },
    "G":  { adv:false, desc:"手要張得比較開。JustinGuitar 教的是這個版本。",
            frets:[3,2,0,0,0,3], fingers:[2,1,0,0,0,3] },
    "B":  { adv:true,  desc:"食指橫壓第二格。跟 Bm 同一個位置，只差中間那根手指。",
            frets:[null,2,4,4,4,2], fingers:[0,1,2,3,4,1],
            barre:{ from:1, to:5, fret:2, finger:1 } },
    "F":  { adv:true,  desc:"食指同時壓住第一、二弦（小封閉）。第五、六弦不彈。第二個月再說。",
            frets:[null,null,3,2,1,1], fingers:[0,0,3,2,1,1],
            barre:{ from:4, to:5, fret:1, finger:1 } },
    "Bm": { adv:true,  desc:"食指橫壓第二格五條弦。需要手指力量，急不得。",
            frets:[null,2,4,4,3,2], fingers:[0,1,3,4,2,1],
            barre:{ from:1, to:5, fret:2, finger:1 } }
  };

  var PIANO_CHORDS = {
    "C":   { adv:false, root:0,  q:"maj" },
    "Dm":  { adv:false, root:2,  q:"min" },
    "Em":  { adv:false, root:4,  q:"min" },
    "F":   { adv:false, root:5,  q:"maj" },
    "G":   { adv:false, root:7,  q:"maj" },
    "Am":  { adv:false, root:9,  q:"min" },
    "D":   { adv:false, root:2,  q:"maj" },
    "E":   { adv:false, root:4,  q:"maj" },
    "A":   { adv:false, root:9,  q:"maj" },
    "Bm":  { adv:true,  root:11, q:"min" },
    "F#m": { adv:true,  root:6,  q:"min" },
    "Bb":  { adv:true,  root:10, q:"maj" }
  };

  var TRIAD_INTERVALS = { maj:[0,4,7], min:[0,3,7] };

  function triad(root, q){
    return TRIAD_INTERVALS[q].map(function(iv){ return root + iv; });
  }

  function voicings(root, q){
    var base = triad(root, q);
    var out = [
      { label:"原位",     notes:base.slice(),                        fingers:[1,3,5] },
      { label:"第一轉位", notes:[base[1], base[2], base[0]+12],      fingers:[1,2,5] },
      { label:"第二轉位", notes:[base[2], base[0]+12, base[1]+12],   fingers:[1,3,5] }
    ];
    out.forEach(function(v){
      while(Math.max.apply(null, v.notes) >= 24){
        v.notes = v.notes.map(function(n){ return n - 12; });
      }
    });
    return out;
  }

  /* 指型 → { 手指編號: {s:弦index, f:格} }，只含實際按下去的手指 */
  function fingerPositions(shape){
    var map = {};
    shape.frets.forEach(function(fr, s){
      if(fr) map[shape.fingers[s]] = { s:s, f:fr };
    });
    return map;
  }

  /* 換和弦時位置完全沒變的手指 —— 支點手指 */
  function commonFingers(shapeA, shapeB){
    var a = fingerPositions(shapeA), b = fingerPositions(shapeB), out = [];
    Object.keys(a).forEach(function(f){
      if(b[f] && b[f].s === a[f].s && b[f].f === a[f].f) out.push(f);
    });
    return out;
  }

  MP.chords = {
    GUITAR_TUNING: GUITAR_TUNING,
    STRING_NAMES: STRING_NAMES,
    GUITAR_SHAPES: GUITAR_SHAPES,
    PIANO_CHORDS: PIANO_CHORDS,
    TRIAD_INTERVALS: TRIAD_INTERVALS,
    triad: triad,
    voicings: voicings,
    fingerPositions: fingerPositions,
    commonFingers: commonFingers
  };
})(window);
