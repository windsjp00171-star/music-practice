# CHANGELOG

本專案的版本歷史。格式參考 Keep a Changelog，版本號採 Semantic Versioning。

---

## [0.3.0] — 2026-07-31

十個模組全部接上共用模組，整併完成。

### Added

- `shared/clock.js` — lookahead 排程器與時間軸幾何。`chord-trainer`、`playalong`、
  `falling`、`falling-guitar` 四個模組原本各有一份 `setInterval` 排程迴圈，現在共用。
  另含兩個掉落模組共用的「時間 → 螢幕座標」換算與圓角矩形。
- `shared/timing.js` — 音頭偵測、時間差統計、回饋列。`playalong` 與兩個掉落模組共用。
- `shared/stages.js` — 八關關卡資料，`progress` 與 `index` 的匯出共用。
- `index.html` 補齊十個模組導航，新增「今天練什麼」樂器選擇：
  選一次，`zero`／`fingering`／`demo`／`progress`／`chord-trainer` 五個模組
  就以該樂器為預設。透過 URL 參數 `?inst=` 傳遞，`file://` 下同樣有效。
  不分樂器的模組會把參數原樣帶回，來回切換不會被重設。
- `chord-trainer` 級數模式新增 **capo 建議**與該 key 的完整順階和弦，並多了第七級。
- `B` 和弦補進 `shared/chords.js`。`chord-trainer` 的和弦池本來就有 B，
  現在 `fingering` 也查得到它的按法（吉他從 10 個變 11 個和弦）。
- `playalong` 新增吉他伴奏（只有節拍／吉他／鋼琴）。吉他用真正的開放和弦指型
  逐弦 Karplus–Strong 合成，聽到的就是手上要按的那個和弦。
- 匯出的 markdown 增加自建曲庫。
- `.gitignore` 加入本機曲庫檔案。

### Changed

- **儲存改為兩層後端**。`window.storage` 在 Chrome／Safari／Firefox 裡並不存在，
  只靠它的話指法圖註記、關卡進度、自建曲庫在 `file://` 與網頁版**都存不住**。
  `shared/store.js` 改為先試 `window.storage`，沒有就用 `localStorage`。
  注意 `localStorage` 綁 origin，`file://` 與網頁版是不同的儲存空間，資料不互通——
  要搬資料請用匯出。
- **音色全面改為取樣緩衝生成**，不再用 `OscillatorNode` 逼近。
  吉他是真正的 Karplus–Strong 弦模擬，鋼琴是五個泛音各自獨立衰減，
  參數移植自 PitchPal。低通用兩級 biquad 串接近似四階 Butterworth。
  影響 `demo`、`playalong`、`falling`、`falling-guitar`。
- `shared/audio.js` 加入音色快取。掉落練習每個循環都要重放同樣的音，
  不快取會每輪重算三秒長的緩衝而掉幀。代價是同一個音每次完全一樣，
  少了原本每次微調音的隨機感——這裡選不掉幀。
- `chord-trainer` 刪掉硬寫的六 key 級數對照表，改用 `shared/theory.js`：
  十二個 key 都正確，F／Bb／Eb／Ab 依實務慣例用降記號。
  Key 從六個按鈕改成十二個 key 的下拉選單。
- `chord-trainer` 的按法圖改用 `shared/chords.js`，與 `fingering` 是同一份資料，
  調整任一和弦的按法兩邊會一起變。`triad()` 改用 `theory.parseChordToken()`。
- `songs` 的級數解析改用 `shared/theory.js` 的 `degreeToChord()`，
  保留原本「`6m`、`5sus4` 明寫品質」的行為。
- 十個模組的設計 token 全部改用 `shared/tokens.css`，各頁保留一份 inline fallback。

### Fixed

- **`file://` 下麥克風說明不會出現**。原本的安全環境檢查只看 `window.isSecureContext`，
  但 Chrome 把 `file://` 當成 secure context（`isSecureContext === true`），
  實際上 `getUserMedia` 仍因 opaque origin 被拒。結果使用者只會看到籠統的
  「麥克風被拒絕」而不是真正的原因與解法。現在明確排除 `file:` protocol。
  影響 `listen`、`playalong`、`falling`、`falling-guitar`。

### 抽象化界線（刻意保留的重複）

依 HANDOFF 的判準：**共用「什麼時候」，不共用「畫成什麼樣」**。

- 兩個掉落模組的 canvas renderer **未合併**。鋼琴的黑白鍵幾何與吉他的六弦道
  各自留在自己的檔案裡。共用的只有排程、時間軸換算與圓角矩形。
- 回饋建議文案**未合併**。鋼琴慢了是「找鍵找太久」，吉他慢了是「換和弦來不及」，
  那是兩件不同的事。共用的只有統計與列的呈現。

---

## [0.2.0] — 2026-07-30

### Added

- `index.html` 樂器選擇與模組導航。
- 「跟著彈」吉他伴奏。

---

## [0.1.0] — 2026-07-30

第一版。七個原本各自獨立的單檔 HTML 整併成一包，共用程式碼抽出到 `shared/`。

### Added

- `shared/tokens.css`、`theory.js`、`chords.js`、`pitch.js`、`audio.js`、`store.js`。
- 一鍵匯出進度與註記為單一 markdown。
- GitHub Pages 部署設定：`.nojekyll`、`README.md`。

### Removed

- 七份重複的設計 token、兩份重複的音高偵測與麥克風程式碼、
  兩份重複的節拍 click、三份重複的吉他指型資料。
