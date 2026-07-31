/* shared/audio.js — 節拍 click 與音色合成
   音色參數移植自 PitchPal（backend/jianpu.py 的 _tone_piano / _tone_guitar）。

   做法：不用 OscillatorNode 逼近，而是用同樣的數學在 JS 算出取樣緩衝，
   再用 AudioBufferSourceNode 播放。吉他的 Karplus–Strong 本來就不可能
   用 oscillator 做出來，鋼琴的泛音衰減率也只有這樣才對得上。

   對外：window.MP.audio
     click(ctx, dest, t, isDownbeat, opts)
     PIANO_HARMONICS, LOWPASS
     pianoBuffer(ctx, freq, dur)
     guitarBuffer(ctx, freq, dur)
     playBuffer(ctx, dest, buffer, t, opts)   opts: { cutoff, gain }
*/
(function(global){
  "use strict";
  var MP = global.MP = global.MP || {};

  /* ---------- 節拍 click ---------- */

  function click(ctx, dest, t, isDownbeat, opts){
    opts = opts || {};
    var gain = isDownbeat
      ? (opts.gainDown === undefined ? 0.5  : opts.gainDown)
      : (opts.gainUp   === undefined ? 0.26 : opts.gainUp);
    var freq = isDownbeat
      ? (opts.freqDown === undefined ? 1550 : opts.freqDown)
      : (opts.freqUp   === undefined ? 920  : opts.freqUp);
    var decay = opts.decay === undefined ? 0.05 : opts.decay;

    var o = ctx.createOscillator(), g = ctx.createGain();
    o.frequency.value = freq;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(gain, t + 0.001);
    g.gain.exponentialRampToValueAtTime(0.0001, t + decay);
    o.connect(g); g.connect(dest);
    o.start(t); o.stop(t + decay + 0.01);
  }

  /* ---------- 音色 ---------- */

  /* [泛音, 振幅, 衰減率] */
  var PIANO_HARMONICS = [
    [1, 1.00,  3.0],
    [2, 0.60,  5.0],
    [3, 0.25,  8.0],
    [4, 0.10, 12.0],
    [5, 0.04, 18.0]
  ];

  /* 低通截止（Hz）。原始碼是 4 階 Butterworth，這裡用兩級 biquad 串接近似。 */
  var LOWPASS = {
    piano:  8000,
    guitar: 6000,
    flute:  9000,
    organ:  7000,
    harp:   8000,
    violin: 8500
  };

  /* 4 階 Butterworth 拆成兩個二階節的 Q 值 */
  var BUTTER_Q = [0.5412, 1.3065];

  function rand(lo, hi){ return lo + Math.random() * (hi - lo); }

  function applyEnvelope(d, sampleRate, attackSec, releaseSec, gain){
    var N = d.length, i;
    var a = Math.min(N, Math.round(sampleRate * attackSec));
    for(i = 0; i < a; i++) d[i] *= Math.sqrt(i / a);          // 曲線 linspace(0,1)^0.5
    var r = Math.min(N, Math.round(sampleRate * releaseSec));
    for(i = 0; i < r; i++) d[N - r + i] *= 1 - i / r;         // 線性 fade out
    for(i = 0; i < N; i++) d[i] *= gain;
  }

  function pianoBuffer(ctx, freq, dur){
    var sr = ctx.sampleRate, N = Math.max(1, Math.round(sr * dur));
    var buffer = ctx.createBuffer(1, N, sr), d = buffer.getChannelData(0);

    var f = freq * rand(0.998, 1.002);                        // detune 1.0 ± 0.002

    for(var h = 0; h < PIANO_HARMONICS.length; h++){
      var mult = PIANO_HARMONICS[h][0];
      var amp  = PIANO_HARMONICS[h][1];
      var dec  = PIANO_HARMONICS[h][2];
      var w = 2 * Math.PI * f * mult / sr;
      for(var n = 0; n < N; n++){
        d[n] += amp * Math.sin(w * n) * Math.exp(-dec * (n / N));
      }
    }

    applyEnvelope(d, sr, 0.006, 0.015, 0.38 * rand(0.88, 1.12));
    return buffer;
  }

  /* 撥下去之後每秒衰減多少。
     原始碼寫的是 exp(-0.8 · progress)，progress 是「在這個音長裡的百分比」，
     等於讓衰減被音長綁架：音長設多久，就到最後才衰減到同一個比例，
     然後被淡出硬切掉——聽起來是「一直響、然後突然斷」。
     真實的弦不是這樣，撥完就照自己的速度衰減，跟你想讓它響多久無關。
     所以改成以秒計算。 */
  var GUITAR_DECAY_PER_SEC = 1.5;

  function guitarBuffer(ctx, freq, dur){
    var sr = ctx.sampleRate, N = Math.max(1, Math.round(sr * dur));
    var buffer = ctx.createBuffer(1, N, sr), d = buffer.getChannelData(0);

    var period = Math.max(2, Math.round(sr / freq));
    var impulse = new Float32Array(period);
    for(var i = 0; i < period; i++){
      var saw = 2 * (i / period) - 1;
      impulse[i] = (Math.random() * 2 - 1) * 0.6 + saw * 0.4;
    }

    var c = rand(0.996, 0.999);                               // feedback
    for(var n = 0; n < N; n++){
      var x  = n < period ? impulse[n] : 0;
      var p1 = n - period     >= 0 ? d[n - period]     : 0;
      var p2 = n - period - 1 >= 0 ? d[n - period - 1] : 0;
      d[n] = x + c * 0.5 * p1 + c * 0.5 * p2;
    }
    for(var m = 0; m < N; m++) d[m] *= Math.exp(-GUITAR_DECAY_PER_SEC * (m / sr));

    /* Karplus–Strong 的起振已經含在 impulse 裡，不再加 attack */
    applyEnvelope(d, sr, 0, 0.020, 0.70 * rand(0.85, 1.15));
    return buffer;
  }

  function playBuffer(ctx, dest, buffer, t, opts){
    opts = opts || {};
    var src = ctx.createBufferSource();
    src.buffer = buffer;

    var node = src;
    if(opts.cutoff){
      BUTTER_Q.forEach(function(q){
        var f = ctx.createBiquadFilter();
        f.type = "lowpass";
        f.frequency.value = opts.cutoff;
        f.Q.value = q;
        node.connect(f);
        node = f;
      });
    }
    if(opts.gain !== undefined && opts.gain !== 1){
      var g = ctx.createGain();
      g.gain.value = opts.gain;
      node.connect(g);
      node = g;
    }
    node.connect(dest);
    src.start(t);
    return src;
  }

  /* ---------- 快取 ----------
     掉落練習每個循環都要重放同樣的音。三秒長的緩衝重算一次要幾十毫秒，
     每輪都算會卡住畫面，所以照 (音色, 頻率, 長度, 取樣率) 快取。
     副作用：同一個音每次聽起來完全一樣，沒有原本每次微調音的隨機感。
     這裡選穩定不卡頓。 */
  var cache = {}, cacheOrder = [], CACHE_MAX = 240;

  function noteBuffer(kind, ctx, freq, dur){
    var key = kind + ":" + freq.toFixed(2) + ":" + dur.toFixed(3) + ":" + ctx.sampleRate;
    var buf = cache[key];
    if(!buf){
      buf = kind === "guitar" ? guitarBuffer(ctx, freq, dur) : pianoBuffer(ctx, freq, dur);
      cache[key] = buf;
      cacheOrder.push(key);
      if(cacheOrder.length > CACHE_MAX) delete cache[cacheOrder.shift()];
    }
    return buf;
  }

  /* 一行播一個音：kind 是 "piano" 或 "guitar" */
  function playNote(kind, ctx, dest, freq, t, dur, opts){
    opts = opts || {};
    return playBuffer(ctx, dest, noteBuffer(kind, ctx, freq, dur), t, {
      cutoff: opts.cutoff === undefined ? LOWPASS[kind] : opts.cutoff,
      gain: opts.gain
    });
  }

  MP.audio = {
    click: click,
    PIANO_HARMONICS: PIANO_HARMONICS,
    LOWPASS: LOWPASS,
    pianoBuffer: pianoBuffer,
    guitarBuffer: guitarBuffer,
    noteBuffer: noteBuffer,
    playNote: playNote,
    playBuffer: playBuffer
  };
})(window);
