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
