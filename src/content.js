// Link Quick Copier - content script
// Cmd/Ctrl+C：覆蓋複製滑鼠所指連結；Opt/Alt+C：累加成清單

let hoveredLinkUrl = null;
let lastPointer = null;      // 最後一次滑鼠座標，供捲動後重新判定
let buffer = [];             // 累加模式的內部清單（不依賴 clipboardRead）

const isMac = /mac/i.test(
    navigator.userAgentData?.platform || navigator.platform || ''
);

// --- 連結偵測 -------------------------------------------------------------

// 用 composedPath 才能穿透 Shadow DOM；event.target 在 document 層級會被 retarget
// 成 shadow host，導致大量現代網站（web component）的連結偵測不到。
function anchorFromEvent(event) {
    const path = typeof event.composedPath === 'function' ? event.composedPath() : [];
    for (const node of path) {
        if (node instanceof HTMLAnchorElement && node.href) return node;
        if (node?.nodeName === 'A' && node.getAttribute?.('href')) return node;
    }
    return event.target?.closest?.('a[href]') || null;
}

function usableUrl(anchor) {
    const href = anchor?.href;
    if (!href) return null;
    // javascript: / about:blank 之類複製了也沒用
    if (/^(javascript|about|data):/i.test(href)) return null;
    return href;
}

document.addEventListener('mouseover', (event) => {
    if (typeof event.clientX === 'number') {
        lastPointer = { x: event.clientX, y: event.clientY };
    }
    const url = usableUrl(anchorFromEvent(event));
    if (url) hoveredLinkUrl = url;
}, true);

document.addEventListener('mouseout', (event) => {
    // relatedTarget 是滑鼠移入的目標；還在同一個 <a> 裡面就別清空，
    // 否則在有子元素（icon/span）的連結上會反覆清掉紀錄。
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

// --- 剪貼簿 ---------------------------------------------------------------

async function copy(text, okMsg) {
    // navigator.clipboard 需要文件有焦點，否則直接丟 NotAllowedError
    if (!document.hasFocus()) {
        try { window.focus(); } catch (_) { /* ignore */ }
    }
    try {
        await navigator.clipboard.writeText(text);
        toast(okMsg);
        return;
    } catch (err) {
        // http 頁面、iframe、權限被擋 → 退回 execCommand
        if (legacyCopy(text)) {
            toast(okMsg);
            return;
        }
        console.error('[Link Quick Copier] 複製失敗:', err);
        toast('存取剪貼簿失敗', true);
    }
}

function legacyCopy(text) {
    try {
        const ta = document.createElement('textarea');
        ta.value = text;
        ta.setAttribute('readonly', '');
        Object.assign(ta.style, {
            position: 'fixed', top: '0', left: '-9999px', opacity: '0'
        });
        (document.body || document.documentElement).appendChild(ta);
        ta.select();
        const ok = document.execCommand('copy');
        ta.remove();
        return ok;
    } catch (_) {
        return false;
    }
}

// --- 提示 UI --------------------------------------------------------------

let toastHost = null;
let toastTimer = null;

// 掛在 Shadow DOM 裡，頁面的 !important CSS 才動不到它
function toast(message, isError = false) {
    const root = document.body || document.documentElement;
    if (!root) return;

    if (!toastHost || !toastHost.isConnected) {
        toastHost = document.createElement('div');
        toastHost.style.cssText = 'all:initial;position:fixed;z-index:2147483647;';
        const shadow = toastHost.attachShadow({ mode: 'open' });
        shadow.innerHTML = `
            <style>
                .capsule {
                    position: fixed; bottom: 60px; left: 50%;
                    transform: translateX(-50%);
                    padding: 10px 24px; border-radius: 99px;
                    font: 14px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                    color: #fff; background: #202124;
                    box-shadow: 0 2px 6px rgba(0,0,0,.2);
                    white-space: nowrap; pointer-events: none;
                    opacity: 0; transition: opacity .2s ease-in-out;
                }
                .capsule.error { background: #d93025; }
                .capsule.show { opacity: 1; }
            </style>
            <div class="capsule"></div>`;
        toastHost._capsule = shadow.querySelector('.capsule');
        root.appendChild(toastHost);
    }

    const capsule = toastHost._capsule;
    capsule.textContent = message;
    capsule.classList.toggle('error', isError);
    requestAnimationFrame(() => capsule.classList.add('show'));

    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => capsule.classList.remove('show'), 2000);
}
