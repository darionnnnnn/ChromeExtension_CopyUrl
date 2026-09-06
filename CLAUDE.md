# Link Quick Copier

Chrome 擴充功能(Manifest V3):滑鼠指著連結,用鍵盤把網址複製走。

## 從哪裡開始讀

| 想知道什麼 | 看哪裡 |
|---|---|
| 目前的行為契約(按鍵、連結偵測、清單語意、文案) | `docs/SPEC.md` |
| 怎麼裝、怎麼建置、怎麼跑測試 | `README.md` |
| 過去每一輪的規劃與決策 | `docs/archive/` |

## 專案形狀

原始碼 `src/`(ES module)→ esbuild → `publish/`(IIFE,**進版控**)。
MV3 的 content script 不支援 ES module,所以打包是必要的。

`src/content.js` 只做組裝;邏輯分在 `pointer` / `link-target` / `hotkeys` /
`clipboard` / `toast` / `state` 六個模組。

## 測試基線

**37 條,全綠**(`npm test`)。`scripts/verify-modules.sh` 以此為下限把關,
新增測試要同步調高 `MIN_TESTS`,刪測試會被擋下。

## 動手前要知道的三件事

1. **改完 `src/` 一定要 `npm run build`。** `publish/` 是進版控的產物,
   CI 會重新建置並比對 diff,沒同步就紅。
2. **測試跑在 `publish/` 的產物上,不是 `src/`。** 這個擴充功能歷來壞掉的原因
   都在事件接線層(監聽階段、Shadow DOM retarget),只測純函式抓不到。
   加測試時請沿用 `tests/helpers/env.js` 派發真實 DOM 事件的做法。
3. **`src/` 裡解釋「為什麼」的註解不要刪。** 那些記的是踩過的坑
   (capture 階段、composedPath、charset ascii),不是對程式碼的重述。

## 不要做

- **不要寫「比對來源與其建置產物」的檢查。** 產物是從來源建出來的,這種比對恆真,
  永遠不會失敗。要驗行為交給測試,要驗不變式就把數字寫死(見 `verify-build.sh`
  的 `EXPECTED_LISTENERS`)。本輪有一條這樣的檢查一路綠燈跟跑六段,等於不存在。
- **不要把委派端修不了的條件放進 forge 的 `--verify` 閘門。** 例如檔尾換行是 forge
  寫檔時剝掉的,模型連續四輪都改不掉,而每輪產出的程式碼都是對的。
  工具鏈造成的差異事後正規化,交給 `verify-hygiene.sh` 與 CI。
- **不要為單一階段設的圍籬留到後續階段。** 本輪有兩條(「只數 content.js 的監聽器」、
  「manifest 不得被動到」)在後續作業變成誤擋合法改動的地雷。
- **新增任何檢查都要做一次突變確認,而且突變要改在來源、不是產物。**
  改產物的突變會被腳本開頭的重建洗掉,造成假性通過。

## 開發流程

一輪開發走 `project-lifecycle`:規劃寫成 `docs/<代號>-N-PLAN.md`,
收尾時搬進 `docs/archive/`。實作委派走 `local-llm-delegate`(forge)。
