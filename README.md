# 樂器練習

木吉他與鋼琴的初學輔助工具。

這個系統存在是為了讓初學者知道「按哪裡、聽起來該是什麼樣、手怎麼動、彈得準不準」，
因此它**刻意不做**課程、不做曲庫授權、不做音檔處理、不做多使用者、不做遊戲化。

教學內容不自建，使用 [JustinGuitar](https://www.justinguitar.com/) 的免費課程。

---

## 啟動指令

### 平常練習 —— 不用指令

瀏覽器開 <https://windsjp00171-star.github.io/music-practice/>，
平板已「加到主畫面」的話點桌面圖示即可。

### 改完程式要上線

```powershell
cd "C:\Users\user\Desktop\富毅共享資料夾\程式\MUSIC PRACTICE"; git add -A; git commit -m "改了什麼"; git push
```

推上去約 30 秒後 GitHub Pages 自動重建生效。快取是網路優先，
**不需要**再改 `sw.js` 的 VERSION。

### 本機預覽

```powershell
cd "C:\Users\user\Desktop\富毅共享資料夾\程式\MUSIC PRACTICE"; python -m http.server 8000
```

開 `http://localhost:8000`，`Ctrl+C` 停止。

> **本機預覽與線上版的資料是分開的**（不同 origin）。
> 真正的練習紀錄只在線上版累積，本機只拿來看畫面。

### 改了畫面卻沒變

多半是瀏覽器快取。用無痕視窗確認是程式沒改到還是快取問題：

```powershell
start chrome --new-window --incognito "https://windsjp00171-star.github.io/music-practice/"
```

查部署狀態（回 `built` 即完成）：

```powershell
& "C:\Program Files\GitHub CLI\gh.exe" api repos/windsjp00171-star/music-practice/pages --jq .status
```

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
| `playalong.html` | 跟著彈：六首曲目、吉他／鋼琴伴奏、時間差回饋 | 選用 |
| `falling-guitar.html` | 掉落練習 · 吉他：六個練習，canvas 六弦道 | 選用 |
| `falling.html` | 掉落練習 · 鋼琴：五個練習，canvas 鍵盤 | 選用 |
| `songs.html` | 我的曲目：自行輸入和弦譜，支援級數輸入與即時移調 | — |
| `listen.html` | 調音器／逐弦檢查／認音 | **是** |

**非麥克風功能在 `file://` 下全部正常**：掉落塊、示範音、節拍器、指法圖、進度都照跑。

### 今天練什麼

`index.html` 上方可以選木吉他或鋼琴，它會把選擇寫進下面的模組連結（`?inst=piano`）。

- `zero`、`fingering`、`demo`、`progress` 會拿它當預設樂器，頁內的切換仍然隨時可改
- `chord-trainer`、`playalong`、`listen` 不分樂器，但會把參數原樣帶回 index，來回切換不會被重設

用 URL 參數而不是儲存，是因為 `file://` 下沒有可用的儲存。

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

指法圖註記、關卡進度、自建曲目存在瀏覽器裡。`shared/store.js` 會先找
`window.storage`（沙箱環境才有），沒有就用 `localStorage`。

**`localStorage` 綁 origin**，下面這幾個互不相通：

```
file://                       雙擊開啟
http://localhost:8000         本機 server
https://<帳號>.github.io/...   部署後
```

在一個地方填的進度，換到另一個看不到。要搬資料只能用「匯出 markdown」。

---

## 目錄結構

```
index.html            模組入口
zero / fingering / demo / chord-trainer / progress / listen /
playalong / falling / falling-guitar / songs .html
shared/
  tokens.css          設計 token
  clock.js            lookahead 排程器、時間軸幾何
  timing.js           音頭偵測、時間差統計
  stages.js           八關關卡資料
  theory.js           樂理計算（順階和弦、capo、和弦解析）
  chords.js           指型與 voicing 資料
  pitch.js            音高偵測、麥克風
  audio.js            節拍 click、音色合成
  store.js            儲存與匯出
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
