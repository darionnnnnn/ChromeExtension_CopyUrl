# Link Quick Copier

滑鼠指著連結,直接用鍵盤把網址複製走的 Chrome 擴充功能(Manifest V3)。不用右鍵、不用開選單。

## 用法

| 按鍵 | 動作 |
|---|---|
| `Cmd`/`Ctrl` + `C` | 覆蓋複製滑鼠所指的連結網址 |
| `Opt`/`Alt` + `C` | 把連結累加成一份清單(每行一筆) |

- 已選取網頁文字時,`Cmd+C` 會讓瀏覽器做原生複製,不會被攔截。
- `Cmd+C` 會重置累加清單。
- 重複的連結不會被加入第二次,並會提示「此連結已存在,未重複加入」,
  讓你知道筆數沒變是因為重複,不是操作失敗。

## 安裝

1. Clone 或下載這個 repo。建置產物已隨版控提供,**不需要安裝 Node**。
2. 開啟 `chrome://extensions`,右上角打開「開發人員模式」。
3. 點「載入未封裝項目」,選擇 repo 裡的 **`publish/`** 資料夾(不是專案根目錄)。
4. 重新載入要使用的分頁 —— content script 只會注入新載入的頁面,舊分頁不會生效。

## 開發

原始碼在 `src/`,以 ES module 撰寫,由 esbuild 打包成 `publish/content.js`。
MV3 的 content script 是傳統腳本、不支援 ES module,所以打包是必要的而非選配。

```bash
npm ci          # 安裝相依套件
npm run build   # 建置到 publish/
npm run watch   # 監看模式
npm test        # 建置後跑測試（vitest + jsdom）
```

**改完 `src/` 一定要重新建置**,`publish/` 是進版控的產物,CI 會比對它是否為最新。

### 專案結構

| 路徑 | 內容 |
|---|---|
| `src/content.js` | 入口,只做組裝與註冊 |
| `src/pointer.js` | 游標追蹤:滑鼠移入移出、捲動、失焦 |
| `src/link-target.js` | 從事件找出連結、判斷網址可用性(純函式) |
| `src/hotkeys.js` | 按鍵分派 |
| `src/clipboard.js` | 剪貼簿寫入與後備路徑 |
| `src/toast.js` | 提示膠囊 UI |
| `src/state.js` | 跨模組共享的可變狀態 |
| `tests/` | vitest;測試對象是 `publish/` 的建置產物 |
| `docs/SPEC.md` | 現況行為規格 |

測試刻意跑在**建置產物**上而非 `src/`:這個擴充功能過去壞掉的原因都在事件接線層,
模組拆分後單元測試可能全綠而擴充是壞的。

## 實作細節

- `keydown` 監聽在 **capture 階段**,才不會被 Gmail、Notion 這類會 `stopPropagation()` 的 SPA 吃掉。
- 用 `composedPath()` 尋找連結,可以穿透 Shadow DOM(現代網站常見的 web component)。
- 累加清單存在擴充自己的記憶體裡,不使用 `clipboardRead`,因此 manifest 只需要 `clipboardWrite`。
- 剪貼簿寫入失敗時(http 頁面、非安全情境)會退回 `document.execCommand('copy')`。
- 提示膠囊掛在 Shadow DOM 中,不會被頁面的 `!important` CSS 破壞。

完整行為契約見 [docs/SPEC.md](docs/SPEC.md)。

### 已知限制

- 累加模式**不會**接續剪貼簿中既有的內容,只累加本擴充複製過的連結。
- 因為啟用了 `all_frames`,清單是每個 frame 各自一份,跨 iframe 不會合併。

## 授權

MIT
