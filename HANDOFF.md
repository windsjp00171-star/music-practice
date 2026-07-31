# Claude Code 交接：樂器練習系統（增補至現有 MVP）

> **這是使用者的個人練習工具。** 使用者想學木吉他與鋼琴,所以做這個。設計判斷一律以「幫不幫得上練習」為準,不需要其他理由。

## 這些 HTML 檔就是參考實作

隨附的十個 HTML 檔**不是草稿,是已驗證可運作的實作**。裡面的繪圖邏輯、音訊參數、偵測演算法、版面比例都已經調過。

抽共用模組時**從這些檔案裡搬出來**,不要照規格重新發明。規格說明的是「為什麼這樣做」,檔案本身是「怎麼做」。

`chord-trainer.html` 為本次最新版（已含按法圖與三段顯示模式）,若 repo 內已有舊版,以此份為準。

---

## 前置動作

**這個 repo 已經有 MVP,不是從零開始。**

開工前先做盤點,不要直接覆蓋:

1. `ls` 現有檔案結構,確認已存在哪些模組與共用檔
2. 讀 `CHANGELOG.md`（若存在）確認目前版本
3. 比對下方「目標狀態」與現況,列出差異清單再動手
4. **既有可運作的功能不得因為整併而退化**

本文件描述的是**目標狀態**,不是全新建置步驟。

---

## 定位

**這個系統存在是為了讓初學者知道「按哪裡、聽起來該是什麼樣、手怎麼動、彈得準不準」,因此它刻意不做課程、不做曲庫授權、不做音檔處理、不做多使用者、不做遊戲化。**

教學內容不自建（使用 JustinGuitar 免費課程）。

與 PitchPal 的關係：**只擷取樂理與音色邏輯,執行期完全不依賴。** 不呼叫其 API,不共用 repo。

---

## 目標狀態：十個模組

| 檔案 | 內容 | 儲存 | 需 HTTPS |
|---|---|---|---|
| `zero.html` | 零階：弦名、格數、手指編號、鍵盤地標、怎麼看指法圖 | — | — |
| `fingering.html` | 吉他指法圖（10 和弦）＋ 鋼琴三種轉位 ＋ 個人註記 | ✓ | — |
| `demo.html` | 換和弦動畫（自動算支點手指）、三和弦音訊、踏板三種踩法對比 | — | — |
| `chord-trainer.html` | 節拍器 ＋ 隨機和弦提示 ＋ 按法圖（吉他指板／鋼琴鍵盤,三段顯示模式）,含級數模式 | — | — |
| `progress.html` | 能力制八關進度（吉他／鋼琴各八關）＋ 通過條件 ＋ 卡點紀錄 | ✓ | — |
| `listen.html` | 麥克風：調音器／逐弦檢查／認音 | — | **✓** |
| `playalong.html` | 跟著彈：六首曲目、伴奏、時間差回饋 | — | 選用 |
| `falling.html` | 掉落練習 · 鋼琴：五個練習,canvas 鍵盤 | — | 選用 |
| `falling-guitar.html` | 掉落練習 · 吉他：六個練習,canvas 六弦道 | — | 選用 |
| `songs.html` | 我的曲目：自行輸入和弦譜,支援級數輸入與即時移調 | ✓ | — |

---

## 架構決定

原本規劃「不部署、純本機」。**麥克風功能推翻了這個決定**：`getUserMedia` 只在安全環境可用,`file://` 拿不到麥克風,這是瀏覽器硬性規則。

**決定：GitHub Pages 靜態部署。**

- 純靜態,無後端,無建置流程 → 維護成本仍接近零
- **非麥克風功能必須維持 `file://` 直接開啟也能跑**（Rule 14 離線閱讀器的基礎,不可妥協）
- `listen` / `playalong` / `falling` / `falling-guitar` 在 `file://` 下,麥克風區塊要顯示清楚說明而非崩潰;**其餘功能照常運作**（目前已如此實作,保留該行為）

---

## 重複程式碼（本次主要工作）

九個模組累積的重複：

| 重複內容 | 出現在 | 抽成 |
|---|---|---|
| CSS 設計 token | 全部 9 檔 | `shared/tokens.css` |
| 自相關音高偵測 `detect()` | `listen`, `playalong`, `falling`, `falling-guitar` | `shared/pitch.js` |
| 麥克風啟動 ＋ `insecure()` 檢查 | 同上 4 檔 | `shared/pitch.js` |
| 節拍器 click 合成 | `chord-trainer`, `playalong`, `falling`, `falling-guitar` | `shared/audio.js` |
| 鋼琴泛音參數 | `demo`, `playalong`, `falling` | `shared/audio.js` |
| 吉他撥弦合成 | `demo`, `falling-guitar` | `shared/audio.js` |
| 吉他指型資料 | `fingering`, `demo`, `listen`, `falling-guitar` | `shared/chords.js` |
| 鋼琴三和弦／轉位 | `fingering`, `demo`, `falling` | `shared/chords.js` |
| lookahead 排程器 | `chord-trainer`, `playalong`, `falling`, `falling-guitar` | `shared/clock.js` |
| 時間差統計 ＋ 回饋文案 | `playalong`, `falling`, `falling-guitar` | `shared/timing.js` |
| `window.storage` 讀寫 | `fingering`, `progress` | `shared/store.js` |
| 級數 → 和弦（硬寫,僅 6 key） | `chord-trainer` | `shared/theory.js` |
| 級數 → 和弦（完整演算法＋升降修正） | `songs.html` | **已是正確實作,直接抽成 `shared/theory.js`** |

### 抽象化的界線（重要）

`falling.html` 與 `falling-guitar.html` 有約七成邏輯相同（排程、拍線、掉落計算、循環、時間差）。

**可以共用的**：時間軸與排程（`shared/clock.js`）、時間差統計（`shared/timing.js`）。

**不要共用的**：兩者的 canvas 繪製與「音符 → 螢幕座標」映射。鋼琴是黑白鍵幾何,吉他是六弦道,強行抽成一個通用 renderer 會產出比重複更難改的東西。

判準：**共用「什麼時候」,不共用「畫成什麼樣」。**

設計 token（目前九份複製）：

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

> ⚠️ **該 repo 的 `CLAUDE.md` 已嚴重過期**,描述的是「app.py 單檔 Gradio」,實際上該 branch 是 FastAPI + React/TS + Docker + HF Actions,且兩套 UI 並存。**不要依據那份 CLAUDE.md 判讀架構。**

### A. 樂理資料 → `shared/theory.js`

來源 `backend/jianpu.py`：

```
JIANPU_INTERVALS = { 1:0, 2:2, 3:4, 4:5, 5:7, 6:9, 7:11 }
MELODY_KEY_ROOTS = { C:60, C#:61, D:62, D#:63, E:64, F:65,
                     F#:66, G:67, G#:68, A:69, A#:70, B:71 }
```

`get_diatonic_chords(key)` 演算法（非查表,12 key 皆可）：

```
root      = MELODY_KEY_ROOTS[key] - 60
scale     = [(root + s) % 12 for s in [0,2,4,5,7,9,11]]
qualities = ["", "m", "m", "", "", "m", "dim"]
→ note_names[scale[i]] + qualities[i]
```

**取代 `chord-trainer.html` 現有硬寫的六個 key 對照表**,並多支援第七級。

⚠️ **移植時必修**：原始碼 `note_names` 只用升記號,key of F 會產出 `A#` 而非 `Bb`。實務上和弦譜寫 Bb。需加每個 key 的升降偏好（F、Bb、Eb 用降記號,其餘用升）。

`_CHORD_QUALITIES` 整份帶入（後續擴充的資料基礎,本次不做 UI）：

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

**實作方式（重要）**：不要用 `OscillatorNode` 逼近。改成**在 JS 用同樣的數學算出取樣緩衝,再用 `AudioBufferSourceNode` 播放**。逐行移植,聲音一致;吉他的 Karplus–Strong 本來就不可能用 oscillator 做出來。

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

0. **盤點現有 MVP,列出差異清單**（見文首）
1. 補齊九個模組（缺哪個補哪個,已存在的不重寫）
2. `shared/tokens.css` — 抽出設計 token
3. `shared/theory.js` — A ＋ B 移植,含升降記號修正
4. `shared/chords.js` — 去重吉他指型與鋼琴 voicing
5. `shared/pitch.js` — 去重音高偵測、麥克風啟動、安全環境檢查
6. `shared/audio.js` — 去重 click,音色改 C 段緩衝生成
7. `shared/clock.js` — 去重 lookahead 排程器
8. `shared/timing.js` — 去重時間差統計與回饋文案
9. `shared/store.js` — `window.storage` wrapper
10. `chord-trainer.html` 改用 `theory.js`,刪硬寫對照表,級數模式加 capo 建議
11. `playalong.html` 與兩個掉落模組改為可讀取 `songs.html` 存的本機曲庫（無曲庫時只顯示內建公有領域曲目）
12. `.gitignore` 加入本機曲庫檔案
13. `index.html` — 十個模組入口導航,各模組頁加返回連結
14. **Rule 14 匯出** — 一鍵匯出 `fingering` 註記 ＋ `progress` 進度與卡點 ＋ `songs` 曲庫為單一 markdown
15. 更新 `CHANGELOG.md`（Rule 16）
16. GitHub Pages 部署設定
17. commit

---

## 硬性約束

- **非麥克風功能必須在 `file://` 下正常運作**。共用資源用相對路徑,載入失敗要有 inline fallback,不可整頁壞掉。**這條不可妥協**
- 無框架、無打包工具、無 npm 相依。純 HTML/CSS/JS
- 儲存只用 `window.storage`,不得用 localStorage / sessionStorage
- 執行期不呼叫 PitchPal 或任何外部 API。字體以外不連網
- 不做登入、不做多使用者、不做雲端同步
- **不加遊戲化**：無連續天數、無排行、無分數、無星等、無 combo。掉落練習刻意做成**永遠不會失敗中斷**,速度可降到 BPM 30。這是設計決定,與使用者其他專案（天父日記）的不施壓哲學一致
- **曲庫版權界線**：repo 內建曲目只收 1929 年前的公有領域作品。有版權的歌一律不進 repo,由使用者自行透過 `songs.html` 輸入,存於本機
- **`songs-local.js` / 本機曲庫必須寫進 `.gitignore`**,不得 commit,不得部署
- 繁體中文介面,語氣面向非技術使用者

---

## 驗收標準

- [ ] 十個模組功能與整併前完全一致,既有 MVP 功能無退化
- [ ] 本機曲庫不在 git 追蹤範圍內
- [ ] 非麥克風功能以 `file://` 開啟正常運作
- [ ] `theory.js` 的 `getDiatonicChords()` 在 12 個 key 都正確,且 F/Bb/Eb 用降記號
- [ ] capo 建議在 `chord-trainer` 級數模式可見
- [ ] 音色以緩衝生成,吉他為真正的 Karplus–Strong
- [ ] 兩個掉落模組的 canvas renderer **未被強行合併**
- [ ] 匯出的 markdown 含註記與進度,可離線閱讀
- [ ] `CHANGELOG.md` 符合 Rule 16
- [ ] GitHub Pages 部署後麥克風功能正常
- [ ] 全程未新增 npm 相依

---

## 給後續 session 的備註

**所有內容尚未經任何一天實際練習驗證** —— 建立當下使用者是第一天學吉他與鋼琴。八關的通過條件、和弦清單、練習曲目、掉落練習的內容,預期會大幅修改。

因此：資料與呈現嚴格分離,和弦、關卡、練習內容維持在明顯可編輯的常數區塊。**不要為了「彈性」做抽象化。** 改內容應該是改一個陣列,不是改架構。

### 回饋可靠度分層（設計原則,不要動）

| 判斷 | 可靠度 | 處理 |
|---|---|---|
| 單音音高 | 高 | 調音器、認音、逐弦檢查、吉他分解和弦、鋼琴音階 |
| 彈奏時機（onset） | 高 | `playalong` 與兩個掉落模組的時間差回饋 |
| 根音是否落在和弦內 | 中 | `playalong` 顯示,並標明僅為粗略檢查 |
| 整個和弦是否乾淨 | 低 | **不做即時判斷** |

最後一列是刻意的：即時多音辨識對初學者最常犯的錯（某條弦被悶掉）最測不出來,會給出錯誤的肯定,比沒有回饋更糟。

替代方案已實作：`listen.html` 的逐弦檢查、`falling-guitar.html` 的分解和弦模式——把多音問題拆成單音問題。這是設計上的核心取捨,不要用「加個和弦辨識」推翻它。

### 已知未做

- 練習日誌（每次練習記錄）。目前只有關卡進度,刻意不做日曆與連續天數
- 動態姿勢回饋（手腕角度、施力、坐姿）。程式看不到使用者身體,靠鏡子與錄影,不自建
- MIDI 輸入。目前使用的鋼琴無 MIDI 輸出。若日後有電鋼琴,Web MIDI API 可讓掉落練習達到 Synthesia 等級的判定精度——這是唯一值得未來加的判定升級
