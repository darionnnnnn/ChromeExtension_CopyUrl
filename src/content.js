// Link Quick Copier - content script
// Cmd/Ctrl+C：覆蓋複製滑鼠所指連結；Opt/Alt+C：累加成清單

import { toast } from './toast.js';
import { copy } from './clipboard.js';
import { anchorFromEvent, usableUrl } from './link-target.js';

let hoveredLinkUrl = null;
let lastPointer = null;      // 最後一次滑鼠座標，供捲動後重新判定
let buffer = [];             // 累加模式的內部清單（不依賴 clipboardRead）

const isMac = /mac/i.test(
    navigator.userAgentData?.platform || navigator.platform || ''
);

// --- 連結偵測 -------------------------------------------------------------

document.addEventListener('mouseover', (event) => {
    if (typeof event.clientX === 'number') {
        lastPointer = { x: event.clientX, y: event.clientY };
    }
    const url = usableUrl(anchorFromEvent(event));
    if (url) hoveredLinkUrl = url;
}, true);

document.addEventListener('mouseout', (event) => {
    // relatedTarget 是滑鼠移入的目標；還在同一個 <a > 裡面就別清空。
    // 註：規範保證 mouseout 後必有 mouseover，紀錄會被重設，所以少了這段也沒有
    // 可觀測的行為差異（2026-09-06 突變驗收證實）。留著是為了消掉兩個事件之間
    // hoveredLinkUrl 為 null 的空窗，屬防禦性強化，不是 bug 修復。
    const from = anchorFromEvent(event);
    if (!from) return;
    const to = event.relatedTarget;
    if (to && from.contains(to)) return;
    hoveredLinkUrl = null;
}, true);

// 捲動時滑鼠不動也不會發 mouseover，游標下的元素卻換了 → 重新判定一次
document.addEventListener('scroll', () => {
    if (!lastPointer) return;
    const el = document.elementFromPoint(lastPointer.x, lastPointer.y);
    const anchor = el?.closest?.('a[href]');
    hoveredLinkUrl = usableUrl(anchor);
}, true);

window.addEventListener('blur', () => { hoveredLinkUrl = null; });

// --- 鍵盤 -----------------------------------------------------------------

// capture: true —— Gmail / Notion / YouTube 這類 app 會在自己的 handler 裡
// stopPropagation()，冒泡階段的監聽根本收不到 keydown。
document.addEventListener('keydown', (event) => {
    if (event.code !== 'KeyC' || event.repeat) return;
    if (!hoveredLinkUrl) return;

    const isCmdCtrl = isMac ? event.metaKey : event.ctrlKey;
    const isOptAlt = event.altKey;

    // 覆蓋複製：使用者有選取文字時讓瀏覽器做原生複製
    if (isCmdCtrl && !isOptAlt) {
        const selection = window.getSelection();
        if (selection && selection.toString().length > 0) return;
        event.preventDefault();
        event.stopPropagation();
        const url = hoveredLinkUrl;
        buffer = [url];
        copy(url, '已複製連結');
        return;
    }

    // 累加複製
    if (isOptAlt && !isCmdCtrl) {
        event.preventDefault();
        event.stopPropagation();
        const url = hoveredLinkUrl;
        if (buffer.includes(url)) {
            toast(`此連結已存在,未重複加入 (共 ${buffer.length} 筆)`);
            return;
        }
        buffer.push(url);
        copy(buffer.join('\n'), `已加入連結 (共 ${buffer.length} 筆)`);
    }
}, true);
