# Claude Code 交接：樂器練習系統

## 定位

**這個系統存在是為了讓初學者知道「按哪裡、聽起來該是什麼樣、手怎麼動、彈得準不準」,因此它刻意不做課程、不做曲庫授權、不做音檔處理、不做多使用者、不做遊戲化。**

教學內容不自建（使用 JustinGuitar 免費課程）。本系統只做上述四件事。

與 PitchPal 的關係：**只擷取樂理與音色邏輯,執行期完全不依賴。** 不呼叫其 API,不共用 repo。

---

## 素材：七個獨立單檔 HTML（功能已驗證可跑）

| 檔案 | 內容 | 儲存 | 需 HTTPS |
|---|---|---|---|
| `zero.html` | 零階：弦名、格數、手指編號、鍵盤地標、怎麼看指法圖 | — | — |
| `fingering.html` | 吉他指法圖（10 和弦）＋ 鋼琴三種轉位 ＋ 個人註記 | ✓ | — |
| `demo.html` | 換和弦動畫（自動算支點手指）、三和弦音訊、踏板三種踩法對比 | — | — |
| `chord-trainer.html` | 節拍器 ＋ 隨機和弦提示,含級數模式 | — | — |
| `progress.html` | 能力制八關進度（吉他／鋼琴各八關）＋ 通過條件 ＋ 卡點紀錄 | ✓ | — |
| `listen.html` | 麥克風：調音器／逐弦檢查／認音 | — | **✓** |
| `playalong.html` | 跟著彈：六首曲目、伴奏、時間差回饋 | — | 選用 |

---

## 架構決定（已變更,請注意）

原本規劃「不部署、純本機」。**麥克風功能推翻了這個決定**：`getUserMedia` 只在安全環境可用,`file://` 拿不到麥克風,這是瀏覽器硬性規則。

**新決定：GitHub Pages 靜態部署。**

- 純靜態,無後端,無建置流程 → 維護成本仍然接近零
- **但五個非麥克風模組必須維持 `file://` 直接開啟也能跑**（Rule 14 離線閱讀器的基礎,不可妥協）
- `listen.html` 在 `file://` 下要顯示清楚的說明而非壞掉（目前已實作,保留該行為）

---

## 目前的重複程式碼（本次主要工作）

| 重複內容 | 出現在 | 抽成 |
|---|---|---|
| CSS 設計 token | 全部 7 檔 | `shared/tokens.css` |
| 自相關音高偵測 `detect()` | `listen`, `playalong` | `shared/pitch.js` |
| 麥克風啟動 ＋ 安全環境檢查 | `listen`, `playalong` | `shared/pitch.js` |
| 節拍器 click 合成 | `chord-trainer`, `playalong` | `shared/audio.js` |
| 鋼琴泛音參數 | `demo`, `playalong` | `shared/audio.js` |
| 吉他指型資料 | `fingering`, `demo`, `listen` | `shared/chords.js` |
| 鋼琴三和弦／轉位計算 | `fingering`, `demo` | `shared/chords.js` |
| `window.storage` 讀寫 | `fingering`, `progress` | `shared/store.js` |
| 級數 → 和弦對照（硬寫,只六個 key） | `chord-trainer` | `shared/theory.js`（見下） |

設計 token（目前七份複製）：

```
--ink:#121A18  --ink-2:#1A2523  --ink-3:#243230
--line:#2E3E3A --paper:#F2EFE6  --dim:#7E8C87  --amber:#E9A63C
--good:#5FBF8F --bad:#D8695E
字體：Archivo（數字／和弦名）＋ Noto Sans TC（中文）
```

---

## 從 PitchPal 擷取

來源 repo：`windsjp00171-star/pitchpal`
來源 branch：`claude/music-key-transposer-G7apB`

> ⚠️ **該 repo 的 `CLAUDE.md` 已嚴重過期**,描述的是「app.py 單檔 Gradio」,實際上該 branch 是 FastAPI + React/TS + Docker + HF Actions,且 Gradio 與 React 兩套 UI 並存。**不要依據那份 CLAUDE.md 判讀架構。**

### A. 樂理資料 → `shared/theory.js`

來源 `backend/jianpu.py`：

```
JIANPU_INTERVALS  = { 1:0, 2:2, 3:4, 4:5, 5:7, 6:9, 7:11 }
MELODY_KEY_ROOTS  = { C:60, C#:61, D:62, D#:63, E:64, F:65,
                      F#:66, G:67, G#:68, A:69, A#:70, B:71 }
```

`get_diatonic_chords(key)` 演算法（非查表,12 key 皆可）：

```
root  = MELODY_KEY_ROOTS[key] - 60
scale = [(root + s) % 12 for s in [0,2,4,5,7,9,11]]
qualities = ["", "m", "m", "", "", "m", "dim"]
→ note_names[scale[i]] + qualities[i]
```

**取代 `chord-trainer.html` 現有硬寫的六個 key 對照表**,並多支援第七級。

⚠️ **移植時必修**：原始碼 `note_names` 只用升記號,key of F 會產出 `A#` 而非 `Bb`。教會和弦譜寫 Bb。需加入每個 key 的升降偏好（F、Bb、Eb 用降記號,其餘用升）。

`_CHORD_QUALITIES` 整份帶入（後續擴充的資料基礎,本次不需做 UI）：

```
maj7 [0,4,7,11]   maj9 [0,4,7,11,14]   M7   [0,4,7,11]
m7b5 [0,3,6,10]   add9 [0,4,7,14]      add2 [0,2,4,7]
sus4 [0,5,7]      sus2 [0,2,7]         sus  [0,5,7]
dim7 [0,3,6,9]    dim  [0,3,6]         aug  [0,4,8]
m7   [0,3,7,10]   m9   [0,3,7,10,14]
7    [0,4,7,10]   9    [0,4,7,10,14]
2    [0,2,4,7]    m    [0,3,7]         ""   [0,4,7]
```

`_parse_chord_token(tok)` 移植要點：
- 先切掉 `/` 後的分數和弦低音
- 比對 root 時**兩字元音名（C#、Db…）必須排在單字元前**,否則 `C#` 會被誤判成 `C`
- bass = `48 + root_semi`;上聲部 = `60 + root_semi + interval`,超過 76 降八度

### B. Capo 計算 → `shared/theory.js`

來源 `backend/core.py`：

```
GUITAR_KEYS = [(C,0), (D,2), (E,4), (G,7), (A,9)]
capo = (target_semitone - key_semitone) % 12
保留 capo <= 7,依 capo 升冪排序
```

約十行。接到 `chord-trainer.html` 級數模式旁邊。

### C. 音色參數 → `shared/audio.js`

來源 `backend/jianpu.py` 的 `_tone_piano` / `_tone_guitar`。**本次擷取最有價值的部分**——現有 Web Audio 合成是憑感覺調的,PitchPal 這邊是調好的。

**實作方式（重要）**：不要用 `OscillatorNode` 逼近。改成**在 JS 用同樣的數學算出取樣緩衝,再用 `AudioBufferSourceNode` 播放**。逐行移植,聲音一致,而且吉他的 Karplus–Strong 本來就不可能用 oscillator 做出來。

鋼琴：
```
detune    = 1.0 ± 0.002
harmonics = [(1,1.00,3.0), (2,0.60,5.0), (3,0.25,8.0),
             (4,0.10,12.0), (5,0.04,18.0)]   # (泛音, 振幅, 衰減率)
每泛音    = amp · sin(2π·f·h·t) · exp(-decay_rate · progress)
attack    = 6ms,曲線 linspace(0,1)^0.5
fade out  = 15ms 線性
總增益    = 0.38 × random(0.88, 1.12)
```

吉他（Karplus–Strong）：
```
period    = max(2, round(sr / freq))
impulse   = random(-1,1)·0.6 + sawtooth·0.4        # 長度 = period
feedback  = random(0.996, 0.999)
遞迴      = out[n] = x[n] + c·0.5·out[n-period] + c·0.5·out[n-period-1]
整體衰減  = exp(-0.8 · progress)
fade out  = 20ms
總增益    = 0.70 × random(0.85, 1.15)
```

低通截止（4 階 Butterworth,可用串接 `BiquadFilterNode` 近似）：
```
鋼琴 8000 / 吉他 6000 / 長笛 9000 / 管風琴 7000 / 豎琴 8000 / 小提琴 8500
```

### D. 明確不擷取

| 內容 | 原因 |
|---|---|
| `detect_key` / `transpose_audio` | 依賴 librosa,伺服器端。本系統不處理音檔 |
| `transcribe.py` | 同上 |
| FastAPI / React / Vite / Docker / HF Actions | 架構不同,本系統維持無建置 |
| `app.py`（Gradio） | 同上 |

---

## 本次任務

1. 建 repo,七個 HTML 放入
2. `shared/tokens.css` — 抽出設計 token
3. `shared/theory.js` — A ＋ B 移植,含升降記號修正
4. `shared/chords.js` — 去重吉他指型與鋼琴 voicing
5. `shared/pitch.js` — 去重音高偵測、麥克風啟動、安全環境檢查
6. `shared/audio.js` — 去重 click,音色改 C 段緩衝生成
7. `shared/store.js` — `window.storage` wrapper
8. `chord-trainer.html` 改用 `theory.js`,刪硬寫對照表,級數模式加 capo 建議
9. `index.html` — 七個模組入口導航,各模組頁加返回連結
10. **Rule 14 匯出** — 一鍵匯出 `fingering` 註記 ＋ `progress` 進度與卡點為單一 markdown
11. `CHANGELOG.md`（Rule 16）,寫入第一筆
12. GitHub Pages 部署設定
13. `git init` ＋ 首次 commit

---

## 硬性約束

- **五個非麥克風模組必須維持 `file://` 單獨開啟可跑**。共用資源用相對路徑,載入失敗要有 inline fallback,不可整頁壞掉。**這條不可妥協**
- 無框架、無打包工具、無 npm 相依。純 HTML/CSS/JS
- 儲存只用 `window.storage`,不得用 localStorage / sessionStorage
- 執行期不呼叫 PitchPal 或任何外部 API。字體以外不連網
- 不做登入、不做多使用者、不做雲端同步
- **不加遊戲化**：無連續天數、無排行、無分數、無星等。這是刻意的設計決定,與使用者其他專案（天父日記）的不施壓哲學一致
- **曲庫版權界線**：只收 1929 年前的公有領域聖詩。讚美之泉、Hillsong 等現代敬拜歌不可加入
- 繁體中文介面,語氣面向非技術使用者

---

## 驗收標準

- [ ] 七個檔案功能與整併前完全一致
- [ ] 五個非麥克風模組以 `file://` 開啟正常運作
- [ ] `theory.js` 的 `getDiatonicChords()` 在 12 個 key 都正確,且 F/Bb/Eb 用降記號
- [ ] capo 建議在 `chord-trainer` 級數模式可見
- [ ] `demo` 與 `playalong` 音色以緩衝生成,吉他為真正的 Karplus–Strong
- [ ] `listen.html` 在 `file://` 下顯示說明而非崩潰
- [ ] 匯出的 markdown 含註記與進度,可離線閱讀
- [ ] `CHANGELOG.md` 符合 Rule 16
- [ ] GitHub Pages 部署後麥克風功能正常
- [ ] 全程未新增 npm 相依

---

## 給後續 session 的備註

**所有內容尚未經任何一天實際練習驗證** —— 建立當下使用者是第一天學吉他與鋼琴。八關的通過條件、和弦清單、練習曲目、文案,預期會大幅修改。

因此：資料與呈現嚴格分離,和弦與關卡資料維持在明顯可編輯的常數區塊。**不要為了「彈性」做抽象化。** 改內容應該是改一個陣列,不是改架構。

### 回饋可靠度分層（設計原則,不要動）

| 判斷 | 可靠度 | 處理 |
|---|---|---|
| 單音音高 | 高 | 調音器、認音、逐弦檢查 |
| 彈奏時機（onset） | 高 | `playalong` 的時間差回饋 |
| 根音是否落在和弦內 | 中 | `playalong` 顯示,並標明僅為粗略檢查 |
| 整個和弦是否乾淨 | 低 | **不做即時判斷**,改由 `listen.html` 逐弦檢查 |

最後一列是刻意的：即時多音辨識對初學者最常犯的錯（某條弦被悶掉）最測不出來,會給出錯誤的肯定,比沒有回饋更糟。

### 已知未做

- 練習日誌（每次練習記錄）。目前只有關卡進度,刻意不做日曆與連續天數
- 動態姿勢回饋（手腕角度、施力、坐姿）。程式看不到使用者身體,這部分靠鏡子與錄影,不自建
