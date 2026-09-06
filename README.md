# Link Quick Copier

滑鼠指著連結,直接用鍵盤把網址複製走的 Chrome 擴充功能(Manifest V3)。不用右鍵、不用開選單。

## 用法

| 按鍵 | 動作 |
|---|---|
| `Cmd`/`Ctrl` + `C` | 覆蓋複製滑鼠所指的連結網址 |
| `Opt`/`Alt` + `C` | 把連結累加成一份清單(每行一筆) |

- 已選取網頁文字時,`Cmd+C` 會讓瀏覽器做原生複製,不會被攔截。
- `Cmd+C` 會重置累加清單。
- 重複的連結不會被加入第二次。

## 安裝

1. 下載或 clone 這個 repo。
2. 開啟 `chrome://extensions`,右上角打開「開發人員模式」。
3. 點「載入未封裝項目」,選擇這個資料夾。
4. 重新載入要使用的分頁 —— content script 只會注入新載入的頁面。

## 實作細節

- `keydown` 監聽在 **capture 階段**,才不會被 Gmail、Notion 這類會 `stopPropagation()` 的 SPA 吃掉。
- 用 `composedPath()` 尋找連結,可以穿透 Shadow DOM(現代網站常見的 web component)。
- 累加清單存在擴充自己的記憶體裡,不使用 `clipboardRead`,因此 manifest 只需要 `clipboardWrite`。
- 剪貼簿寫入失敗時(http 頁面、非安全情境)會退回 `document.execCommand('copy')`。
- 提示膠囊掛在 Shadow DOM 中,不會被頁面的 `!important` CSS 破壞。

### 已知限制

- 累加模式**不會**接續剪貼簿中既有的內容,只累加本擴充複製過的連結。
- 因為啟用了 `all_frames`,清單是每個 frame 各自一份,跨 iframe 不會合併。

## 授權

MIT
