import { anchorFromEvent, anchorAtPoint, usableUrl } from './link-target.js';
import { state } from './state.js';

export function registerPointerTracking() {
    // --- 連結偵測 -------------------------------------------------------------

    document.addEventListener('mouseover', (event) => {
        if (typeof event.clientX === 'number') {
            state.lastPointer = { x: event.clientX, y: event.clientY };
        }
        const url = usableUrl(anchorFromEvent(event));
        if (url) state.hoveredLinkUrl = url;
    }, true);

    document.addEventListener('mouseout', (event) => {
        // relatedTarget 是滑鼠移入的目標；還在同一個 <a> 裡面就別清空。
        // 註：規範保證 mouseout 後必有 mouseover，紀錄會被重設，所以少了這段也沒有
        // 可觀測的行為差異（2026-09-06 突變驗收證實）。留著是為了消掉兩個事件之間
        // hoveredLinkUrl 為 null 的空窗，屬防禦性強化，不是 bug 修復。
        const from = anchorFromEvent(event);
        if (!from) return;
        const to = event.relatedTarget;
        if (to && from.contains(to)) return;
        state.hoveredLinkUrl = null;
    }, true);

    // 捲動時滑鼠不動也不會發 mouseover，游標下的元素卻換了 → 重新判定一次
    document.addEventListener('scroll', () => {
        if (!state.lastPointer) return;
        const anchor = anchorAtPoint(state.lastPointer.x, state.lastPointer.y);
        state.hoveredLinkUrl = usableUrl(anchor);
    }, true);

    window.addEventListener('blur', () => { state.hoveredLinkUrl = null; });
}
