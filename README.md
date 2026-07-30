# 樂器練習

木吉他與鋼琴的初學輔助工具。

這個系統存在是為了讓初學者知道「按哪裡、聽起來該是什麼樣、手怎麼動、彈得準不準」，
因此它**刻意不做**課程、不做曲庫授權、不做音檔處理、不做多使用者、不做遊戲化。

教學內容不自建，使用 [JustinGuitar](https://www.justinguitar.com/) 的免費課程。

---

## 怎麼用

從 `index.html` 進去。

| 模組 | 做什麼 | 需要麥克風 |
|---|---|---|
| `zero.html` | 弦名、格數、手指編號、鍵盤地標、指法圖怎麼看 | — |
| `fingering.html` | 吉他十個指型、鋼琴三種轉位、個人註記 | — |
| `demo.html` | 換和弦動畫（自動算支點手指）、三和弦音訊、踏板三種踩法對比 | — |
| `chord-trainer.html` | 節拍器 ＋ 隨機和弦提示，含級數模式與 capo 建議 | — |
| `progress.html` | 能力制八關進度 ＋ 通過條件 ＋ 卡點紀錄 ＋ 匯出 | — |
| `playalong.html` | 跟著彈：六首曲目、伴奏、時間差回饋 | 選用 |
| `listen.html` | 調音器／逐弦檢查／認音 | **是** |

**五個非麥克風模組直接雙擊開啟就能用**（`file://`）。

### 麥克風功能需要 HTTPS

瀏覽器只在 `https://` 或 `localhost` 給麥克風權限，`file://` 拿不到——這是硬性安全規則，
不是設定問題。要用 `listen.html`，二選一：

本機測試：

```bash
python3 -m http.server 8000
```

然後開 `http://localhost:8000`。

或部署到 GitHub Pages（見下）。

---

## 部署到 GitHub Pages

純靜態，無後端，無建置流程。

1. 把整個資料夾推到 GitHub repo。
2. repo → **Settings** → **Pages**。
3. Source 選 **Deploy from a branch**，branch 選 `main`，資料夾選 `/ (root)`。
4. 存檔，等一兩分鐘，網址會是 `https://<帳號>.github.io/<repo>/`。

`.nojekyll` 已經放好了，不需要其他設定。

---

## 資料存在哪裡

指法圖註記與關卡進度存在 `window.storage`（不是 localStorage）。

**如果執行環境沒有 `window.storage`，資料不會保存**，頁面會直接說出來。
這種情況下請用 `index.html` 或 `progress.html` 的「匯出 markdown」把紀錄帶走。

---

## 目錄結構

```
index.html            模組入口
zero / fingering / demo / chord-trainer / progress / listen / playalong .html
shared/
  tokens.css          設計 token
  theory.js           樂理計算（順階和弦、capo、和弦解析）
  chords.js           指型與 voicing 資料
  pitch.js            音高偵測、麥克風
  audio.js            節拍 click、音色合成
  store.js            儲存與匯出
  stages.js           八關的關卡資料
```

### 改東西的時候

**和弦清單、關卡條件、曲目都是純資料**，放在明顯的常數區塊裡：

- 吉他指型、鋼琴和弦 → `shared/chords.js`
- 八關的通過條件 → `shared/stages.js`
- 曲目 → `playalong.html` 的 `SONGS`
- 各模組要顯示哪幾個和弦 → 各 HTML 裡的 `GUITAR_LIST` / `PIANO_LIST` / `CHORD_LIST`

改內容應該是改一個陣列，不是改架構。**不要為了「彈性」做抽象化。**

---

## 約束

- 無框架、無打包工具、無 npm 相依。純 HTML/CSS/JS。
- 共用資源用相對路徑；載入失敗有 inline fallback，不會整頁壞掉。
- 執行期不呼叫任何外部 API。字體以外不連網。
- 不做登入、不做多使用者、不做雲端同步。
- **不加遊戲化**：無連續天數、無排行、無分數、無星等。這是刻意的設計決定。
- **曲庫版權界線**：只收 1929 年前的公有領域聖詩。

---

## 回饋可靠度分層

這是設計原則，不要改：

| 判斷 | 可靠度 | 處理 |
|---|---|---|
| 單音音高 | 高 | 調音器、認音、逐弦檢查 |
| 彈奏時機（onset） | 高 | `playalong` 的時間差回饋 |
| 根音是否落在和弦內 | 中 | `playalong` 顯示，並標明僅為粗略檢查 |
| 整個和弦是否乾淨 | 低 | **不做即時判斷**，改由 `listen.html` 逐弦檢查 |

最後一列是刻意的：即時多音辨識對初學者最常犯的錯（某條弦被悶掉）最測不出來，
會給出錯誤的肯定，比沒有回饋更糟。

---

## 狀態

所有內容尚未經任何一天實際練習驗證。八關的通過條件、和弦清單、練習曲目、文案，
預期會大幅修改。

版本歷史見 [CHANGELOG.md](CHANGELOG.md)。
