# CHANGELOG

本專案的版本歷史。格式參考 Keep a Changelog，版本號採 Semantic Versioning。

---

## [0.1.0] — 2026-07-30

第一版。七個原本各自獨立的單檔 HTML 整併成一包，共用程式碼抽出到 `shared/`。

### Added

- `index.html` 模組入口導航，七個模組分四組（先看這個／按哪裡／練／確認彈得準不準），各模組頁左上角加返回連結。
- `shared/tokens.css` — 設計 token 集中一處。每個 HTML 的 `<head>` 另有一份 inline fallback，共用檔案載入失敗時頁面仍然看得懂。
- `shared/theory.js` — 樂理計算。`getDiatonicChords()` 用演算法產生順階和弦，十二個 key 都可用；另含 `capoSuggestions()`、`parseChordToken()` 與完整的和弦性質音程表。
- `shared/chords.js` — 吉他十個指型、鋼琴十二個和弦與三種轉位、支點手指計算。
- `shared/pitch.js` — 自相關音高偵測、麥克風啟動、安全環境檢查。
- `shared/audio.js` — 節拍 click，以及以取樣緩衝生成的鋼琴與吉他音色。
- `shared/store.js` — `window.storage` 讀寫封裝，含 markdown 匯出。
- `shared/stages.js` — 吉他／鋼琴各八關的關卡資料。
- **一鍵匯出**：把關卡進度、卡點紀錄與指法圖註記匯出成單一 markdown，可離線閱讀。入口在 `index.html` 與 `progress.html`。
- 「和弦轉換練習」級數模式新增 **capo 建議**，同時顯示該 key 的完整順階和弦。
- 級數模式新增**第七級**（`7dim`）。
- GitHub Pages 部署設定：`.nojekyll`、`README.md`。

### Changed

- 「和弦轉換練習」的 Key 從六個按鈕改成十二個 key 的下拉選單，改用 `shared/theory.js` 計算。
- **鋼琴與吉他音色改為取樣緩衝生成**，不再用 `OscillatorNode` 逼近。吉他是真正的 Karplus–Strong 弦模擬，鋼琴是五個泛音各自獨立衰減，參數移植自 PitchPal。低通改用兩級 biquad 串接近似四階 Butterworth。
- 「跟著彈」的伴奏和弦緩衝加入快取與開始前預熱，避免每小節重算造成聲音中斷。
- 「示範」的和弦與琶音改成先算完所有緩衝再決定起始時間，避免前幾個音被切掉。

### Fixed

- **`file://` 下麥克風說明不會出現的問題**。原本的安全環境檢查只看 `window.isSecureContext`，但 Chrome 把 `file://` 當成 secure context（`isSecureContext === true`），實際上 `getUserMedia` 仍因 opaque origin 被拒。結果使用者在 `file://` 只會看到籠統的「麥克風被拒絕」，而不是真正的原因與解法。現在明確排除 `file:` protocol。

### Removed

- 「和弦轉換練習」中硬寫的六個 key 級數對照表（只支援 C／D／E／F／G／A，且 key of F 的第四級寫成 `A#`）。改由 `shared/theory.js` 計算，十二個 key 都正確，且 F／Bb／Eb／Ab 依教會和弦譜慣例使用降記號。
- 七份重複的設計 token、兩份重複的音高偵測與麥克風程式碼、兩份重複的節拍 click、三份重複的吉他指型資料、兩份重複的鋼琴 voicing 計算、兩份重複的 `window.storage` 讀寫。
