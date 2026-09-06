# BACKLOG

本輪定案不做、但日後可能做的事。每項附觸發條件。

## 捲動路徑無法穿透 closed shadow root

`anchorAtPoint` 逐層往 shadow root 遞迴查詢,但 `mode: 'closed'` 的 shadow root
從 `elementFromPoint` 的回傳值上取不到 `shadowRoot`,迴圈直接跳出。
事件路徑不受此限(`composedPath` 照樣穿透),所以只影響「捲動後」的重新判定。

**觸發條件**:使用者回報在某個網站上捲動後快捷鍵失效,且該網站用 closed shadow root。
目前沒有乾淨的解法,可能要改用 `document.elementsFromPoint` 搭配啟發式判斷。

## watch 模式沒有自動測試

`scripts/build.mjs` 的 `--watch` 會監看 `src/`、`manifest.json`、`icons/`,
但測試只確認它「啟動後不會立刻崩潰」,沒有驗證檔案變動真的會觸發重新複製。
`fs.watch` 的 `recursive` 選項在 Linux 與 macOS 行為不同。

**觸發條件**:watch 模式出過一次沒更新的問題,或 CI 移到別的作業系統。

## 工具列按鈕與設定頁

目前 manifest 只宣告 `icons`,沒有 `action`,所以工具列上沒有按鈕,
按鍵組合也寫死在程式碼裡,使用者不能改。

**觸發條件**:使用者想自訂按鍵,或想要一個開關能在特定網站停用擴充。

## 累加清單無法跨 iframe 合併

因為 `all_frames: true`,每個 frame 各自持有一份清單。要合併需要背景 service worker
與訊息傳遞,會把架構複雜度拉高一個層級。

**觸發條件**:使用者實際在有 iframe 的頁面上被這件事困擾。

## forge 工具本身的三個問題(屬 forge 專案,不在本 repo)

本輪委派時實測到,已記在 `docs/archive/LQC-1-PLAN.md`:

1. 失敗時回 exit 0(端點 507、規格檔不存在、驗證連續失敗三種情況皆是)。
2. 寫檔時剝掉檔尾換行。
3. 截斷保護(新內容低於原檔 30% 判定為截斷)與「刻意縮小檔案」的作業衝突,且無放寬旗標。

**觸發條件**:下次使用 forge 時一併回報給 forge 專案。
