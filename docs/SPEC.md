# Link Quick Copier 現況規格

記錄擴充功能**目前的行為契約**。變更歷程請看 `docs/archive/`。

## 按鍵契約

| 按鍵 | 模式 | 行為 |
|---|---|---|
| `Cmd`+`C`(Mac)/ `Ctrl`+`C`(其他) | 覆蓋 | 把游標所指連結的網址寫入剪貼簿,並**重置**累加清單 |
| `Opt`/`Alt`+`C` | 累加 | 把該連結追加進清單,整份清單以換行連接後寫入剪貼簿 |

平台判定取 `navigator.userAgentData.platform`,取不到才退回已廢棄的 `navigator.platform`。

**不觸發的情況**:

- 游標沒有指向任何可用連結。
- 按鍵不是 `C`(以 `event.code` 判定,不受輸入法與鍵盤配置影響)。
- 長按產生的重複事件(`event.repeat`)。
- 兩個修飾鍵同時按下。
- **覆蓋模式專有**:使用者已選取網頁文字時完全不介入,讓瀏覽器執行原生複製。
  累加模式不受此限,因為 `Opt+C` 不是原生複製鍵。

監聽器註冊在 `document` 的**捕獲階段**。這是必要的:Gmail、Notion 這類 app 會在自己的
handler 裡呼叫 `stopPropagation()`,冒泡階段的監聽器收不到事件。

## 連結偵測

以 `event.composedPath()` 由內而外尋找第一個帶 `href` 的 `<a>`。**必須用 composedPath**:
`event.target` 在 `document` 層級會被瀏覽器 retarget 成 shadow host,
用 `closest()` 找不到 Shadow DOM 內的連結,而現代網站大量以 web component 包裝連結。

排除的協定:`javascript:`、`about:`、`data:` —— 複製了也沒有用途。

**清除**紀錄的時機:

- 滑鼠移出連結到該連結之外的元素。
- 視窗失去焦點。

**重新判定**的時機:捲動。滑鼠不動時不會發 `mouseover`,但游標下的東西已經換了,
因此捲動後以 `document.elementFromPoint` 重新查一次 —— 捲到另一個連結上會**換成**新網址,
捲到非連結區域才清空。

捲動路徑沒有事件可用,`composedPath` 派不上用場,因此改為從 `elementFromPoint` 的結果
逐層往 shadow root 遞迴查詢(`anchorAtPoint`)。少了這段遞迴,在以 web component 包裝連結的
網站上,指著連結捲一下滾輪快捷鍵就會失效。

`mouseout` 會檢查 `relatedTarget` 是否仍在同一個 `<a>` 內。這是**防禦性強化,不是 bug 修復**:
規範保證 `mouseout` 後必定緊接著 `mouseover`,紀錄會立即重設,少了這段沒有可觀測差異
(2026-09-06 突變驗收證實)。它消掉的是兩個事件之間 `hoveredLinkUrl` 為 null 的極短空窗。

## 清單語意

- 清單存在記憶體中,**不讀取剪貼簿**。因此 `clipboardRead` 權限不需要,manifest 只宣告 `clipboardWrite`。
  代價:累加模式不會接續使用者在別處複製的內容。
- 重複的連結不會被加入第二次,筆數不變,並顯示明確提示。
- 覆蓋複製會把清單重置為單一元素,其後累加從該連結開始。
- 因為 `all_frames: true`,清單是**每個 frame 各自一份**,跨 iframe 不會合併。

## 提示文案

| 情境 | 文字 |
|---|---|
| 覆蓋複製成功 | `已複製連結` |
| 累加成功 | `已加入連結 (共 N 筆)` |
| 連結重複 | `此連結已存在,未重複加入 (共 N 筆)` |
| 兩條寫入路徑都失敗 | `存取剪貼簿失敗`(紅底) |

提示出現後 2 秒淡出,期間再次觸發會重用同一個宿主元素並重設計時器,不會堆疊。
錯誤提示以 `.error` 類別上紅底,下一次成功時會被清掉。

提示掛在 `mode: 'open'` 的 Shadow DOM 中。用 shadow root 是為了讓頁面的 `!important` CSS
動不到它;用 `open` 而非 `closed` 是因為 `closed` 擋不住頁面 JS 移除宿主元素,
沒有實質防護,卻讓測試無法斷言文字。

## 剪貼簿寫入策略

1. 先確認 `document.hasFocus()`,沒有焦點就嘗試 `window.focus()` ——
   `navigator.clipboard` 在文件無焦點時會直接丟 `NotAllowedError`。
2. 走 `navigator.clipboard.writeText()`。
3. 失敗則退回 `document.execCommand('copy')`,涵蓋 http 頁面等非安全情境。
   後備用的 `textarea` 用完立即移除。
4. 兩者皆失敗才顯示錯誤提示。

## MV3 限制與因應

| 限制 | 因應 |
|---|---|
| content script 是傳統腳本,不支援 ES module | esbuild 打包成 IIFE;原始碼在 `src/` 可自由用 module |
| esbuild 預設 `charset: 'ascii'`,會把中文轉成 `\uXXXX` | 明確設定 `charset: 'utf8'`,由 `verify-build.sh` 把關 |
| content script 只注入**新載入**的頁面 | 改版後必須重新載入分頁,已寫進 README |
| `navigator.clipboard.readText()` 在 content script 常被擋 | 完全不使用,清單改存記憶體 |
