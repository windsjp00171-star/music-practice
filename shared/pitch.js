/* shared/pitch.js — 音高偵測與麥克風
   對外：window.MP.pitch
     NOTE_NAMES, MIN_F, MAX_F
     mtof(midi) / ftom(freq) / nameOf(midi) / octOf(midi)
     detect(buf, sampleRate, opts) → { rms, freq }   freq 為 null 表示這一幀沒有可信音高
     isInsecure()          true 表示這個環境拿不到麥克風（file:// 就是這種）
     requestMic(opts)      → Promise<{ stream, ctx, analyser, buf, ownsCtx }>
                             失敗時 reject({ code, name })
                             code: "insecure" | "unsupported" | "denied"
     releaseMic(handle)
*/
(function(global){
  "use strict";
  var MP = global.MP = global.MP || {};

  var NOTE_NAMES = ["C","C#","D","D#","E","F","F#","G","G#","A","A#","B"];

  /* 偵測範圍：吉他最低 E2 約 82Hz，上限蓋過鋼琴常用音域 */
  var MIN_F = 68, MAX_F = 1100;

  function mtof(m){ return 440 * Math.pow(2, (m - 69) / 12); }
  function ftom(f){ return 12 * Math.log2(f / 440) + 69; }
  function nameOf(m){ return NOTE_NAMES[((Math.round(m) % 12) + 12) % 12]; }
  function octOf(m){ return Math.floor(Math.round(m) / 12) - 1; }

  /* 自相關，限定 lag 範圍，峰值做拋物線內插 */
  function detect(buf, sampleRate, opts){
    opts = opts || {};
    var minRms = opts.minRms === undefined ? 0.01 : opts.minRms;
    var minF = opts.minF || MIN_F, maxF = opts.maxF || MAX_F;

    var N = buf.length, rms = 0, i;
    for(i = 0; i < N; i++) rms += buf[i] * buf[i];
    rms = Math.sqrt(rms / N);
    if(rms < minRms) return { rms:rms, freq:null };

    var loMin = Math.floor(sampleRate / maxF);
    var loMax = Math.min(Math.floor(sampleRate / minF), Math.floor(N / 2));
    var best = -1, bestLag = -1, c = new Float32Array(loMax + 2);

    for(var lag = loMin; lag <= loMax; lag++){
      var s = 0;
      for(var j = 0; j < N - lag; j++) s += buf[j] * buf[j + lag];
      s /= (N - lag);
      c[lag] = s;
      if(s > best){ best = s; bestLag = lag; }
    }
    if(bestLag < 0 || best <= 0) return { rms:rms, freq:null };

    var x1 = c[bestLag - 1] || 0, x2 = c[bestLag], x3 = c[bestLag + 1] || 0;
    var a = (x1 + x3 - 2 * x2) / 2, b = (x3 - x1) / 2, T = bestLag;
    if(a !== 0) T = bestLag - b / (2 * a);

    var f = sampleRate / T;
    return { rms:rms, freq:(f >= minF && f <= maxF) ? f : null };
  }

  /* getUserMedia 只在安全環境可用。file:// 拿不到，這是瀏覽器硬性規則。

     注意 file:// 要單獨排除：Chrome 把 file:// 當成 secure context
     （window.isSecureContext === true），但它的 origin 是 opaque，
     getUserMedia 還是會被拒。只靠 isSecureContext 判斷會漏掉這一種，
     使用者就只會看到籠統的「麥克風被拒絕」而不是真正的原因。 */
  function isInsecure(){
    if(location.protocol === "file:") return true;
    return !(global.isSecureContext ||
             location.protocol === "https:" ||
             location.hostname === "localhost" ||
             location.hostname === "127.0.0.1");
  }

  function requestMic(opts){
    opts = opts || {};
    return new Promise(function(resolve, reject){
      if(isInsecure()) return reject({ code:"insecure" });
      if(!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia){
        return reject({ code:"unsupported" });
      }
      navigator.mediaDevices.getUserMedia({
        audio:{ echoCancellation:false, noiseSuppression:false, autoGainControl:false }
      }).then(function(stream){
        var ownsCtx = !opts.ctx;
        var ctx = opts.ctx || new (global.AudioContext || global.webkitAudioContext)();
        var analyser = ctx.createAnalyser();
        analyser.fftSize = opts.fftSize || 2048;
        ctx.createMediaStreamSource(stream).connect(analyser);
        resolve({
          stream: stream,
          ctx: ctx,
          analyser: analyser,
          buf: new Float32Array(analyser.fftSize),
          ownsCtx: ownsCtx
        });
      }).catch(function(err){
        reject({ code:"denied", name: err && err.name ? err.name : "unknown" });
      });
    });
  }

  function releaseMic(handle){
    if(!handle) return;
    if(handle.stream) handle.stream.getTracks().forEach(function(t){ t.stop(); });
    if(handle.ownsCtx && handle.ctx) handle.ctx.close();
  }

  MP.pitch = {
    NOTE_NAMES: NOTE_NAMES,
    MIN_F: MIN_F,
    MAX_F: MAX_F,
    mtof: mtof,
    ftom: ftom,
    nameOf: nameOf,
    octOf: octOf,
    detect: detect,
    isInsecure: isInsecure,
    requestMic: requestMic,
    releaseMic: releaseMic
  };
})(window);
