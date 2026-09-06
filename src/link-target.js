// --- 連結偵測 -------------------------------------------------------------

// 用 composedPath 才能穿透 Shadow DOM；event.target 在 document 層級會被 retarget
// 成 shadow host，導致大量現代網站（web component）的連結偵測不到。
export function anchorFromEvent(event) {
    const path = typeof event.composedPath === 'function' ? event.composedPath() : [];
    for (const node of path) {
        if (node instanceof HTMLAnchorElement && node.href) return node;
        if (node?.nodeName === 'A' && node.getAttribute?.('href')) return node;
    }
    return event.target?.closest?.('a[href]') || null;
}

export function usableUrl(anchor) {
    const href = anchor?.href;
    if (!href) return null;
    // javascript: / about:blank 之類複製了也沒用
    if (/^(javascript|about|data):/i.test(href)) return null;
    return href;
}

// 給捲動路徑用：elementFromPoint 回傳的是 shadow host，closest 穿不過去。
// composedPath 是靠事件路徑穿透的，捲動時沒有事件可用，只能自己往 shadow root 遞迴問。
// 少了這段，在任何用 web component 包連結的網站（YouTube、Gmail）上，
// 指著連結滾一下滾輪，快捷鍵就失效。
export function anchorAtPoint(x, y) {
    let el = document.elementFromPoint(x, y);
    while (el?.shadowRoot) {
        const inner = el.shadowRoot.elementFromPoint?.(x, y);
        if (!inner || inner === el) break;
        el = inner;
    }
    return el?.closest?.('a[href]') || null;
}
