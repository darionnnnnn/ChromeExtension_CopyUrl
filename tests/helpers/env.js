import fs from 'node:fs';
import path from 'node:path';
import { JSDOM } from 'jsdom';

const BUNDLE_PATH = path.resolve('publish/content.js');

/**
 * 把「建置產物」載入一個全新的 jsdom 環境。
 * 刻意測產物而非 src/：本輪要防的三個 bug 全在事件接線層，
 * 模組拆分後單元測試可能全綠而擴充是壞的。
 */
export function createEnv({ body = '', mac = false, url = 'https://example.com/' } = {}) {
    const dom = new JSDOM(`<!doctype html><html><body>${body}</body></html>`, {
        url,
        runScripts: 'dangerously',
        pretendToBeVisual: true,
    });
    const { window } = dom;

    // isMac 在腳本載入時就求值，平台替身必須先於 eval 設好
    Object.defineProperty(window.navigator, 'platform', {
        value: mac ? 'MacIntel' : 'Linux x86_64',
        configurable: true,
    });
    Object.defineProperty(window.navigator, 'userAgentData', {
        value: undefined, configurable: true,
    });

    const clipboard = {
        writes: [],
        fail: false,
        async writeText(text) {
            if (clipboard.fail) throw new Error('NotAllowedError');
            clipboard.writes.push(text);
        },
    };
    Object.defineProperty(window.navigator, 'clipboard', { value: clipboard, configurable: true });

    // 記下 execCommand('copy') 當下選取元素的內容。只斷言「有沒有呼叫 execCommand」
    // 會讓「fallback 複製到錯誤內容」這種迴歸完全抓不到（2026-09-06 終檢實測）。
    const exec = { calls: [], values: [], fail: false };
    window.document.execCommand = (cmd) => {
        exec.calls.push(cmd);
        // jsdom 的 textarea.select() 不會設定 activeElement，改直接看當下 DOM 裡的 textarea
        const ta = window.document.querySelector('textarea');
        exec.values.push(ta ? ta.value : window.document.activeElement?.value);
        return !exec.fail;
    };

    // jsdom 未實作：以替身補上，讓捲動路徑可被測試控制
    const elementAtPoint = { current: null };
    window.document.elementFromPoint = () => elementAtPoint.current;

    // 可切換，否則 clipboard.js 的無焦點分支永遠不執行、刪掉也全綠
    const focus = { hasFocus: true, focusCalls: 0 };
    window.document.hasFocus = () => focus.hasFocus;
    window.focus = () => { focus.focusCalls += 1; focus.hasFocus = true; };

    // 攔下 jsdom window 的 setTimeout：提示的自動消失若靠真實等待，測試要慢 2 秒
    // 且不穩定。改為記下來由測試手動觸發。（node 全域的 setTimeout 不受影響，
    // flush() 仍照常運作。）
    const timers = {
        pending: [],
        runAll() {
            const queued = timers.pending.splice(0);
            queued.forEach(({ fn }) => fn());
        },
    };
    const nativeSetTimeout = window.setTimeout.bind(window);
    window.setTimeout = (fn, ms) => {
        timers.pending.push({ fn, ms });
        return timers.pending.length;
    };
    window.clearTimeout = () => {};
    void nativeSetTimeout;

    window.eval(fs.readFileSync(BUNDLE_PATH, 'utf8'));

    return { dom, window, document: window.document, clipboard, exec, elementAtPoint, focus, timers };
}

/** 取得提示膠囊元素（需要 shadow root 為 open） */
export function toastCapsule(env) {
    for (const el of env.document.body.querySelectorAll('*')) {
        const capsule = el.shadowRoot?.querySelector('.capsule');
        if (capsule) return capsule;
    }
    return null;
}

/** 讀出提示膠囊的文字 */
export function toastText(env) {
    return toastCapsule(env)?.textContent ?? null;
}

export function hover(env, el) {
    el.dispatchEvent(new env.window.MouseEvent('mouseover', { bubbles: true, composed: true }));
}

export function unhover(env, el, relatedTarget = null) {
    el.dispatchEvent(new env.window.MouseEvent('mouseout', { bubbles: true, composed: true, relatedTarget }));
}

export function pressC(env, { meta = false, ctrl = false, alt = false, repeat = false } = {}, target = null) {
    const ev = new env.window.KeyboardEvent('keydown', {
        code: 'KeyC', key: 'c', bubbles: true, cancelable: true,
        metaKey: meta, ctrlKey: ctrl, altKey: alt, repeat,
    });
    (target || env.document.body).dispatchEvent(ev);
    return ev;
}

/** 讓 window.getSelection() 回傳一段非空選取 */
export function selectText(env, text) {
    env.window.getSelection = () => ({ toString: () => text });
}

/** 模擬捲動：先設定游標下的元素，再派發 scroll */
export function scrollTo(env, elementUnderPointer) {
    env.elementAtPoint.current = elementUnderPointer;
    env.document.dispatchEvent(new env.window.Event('scroll'));
}

/** 覆蓋複製的修飾鍵組合（依平台） */
export const COPY = (mac) => (mac ? { meta: true } : { ctrl: true });

/** 等待 content.js 內的 async 剪貼簿流程走完 */
/** 等一個 jsdom 影格。show 類別是靠 requestAnimationFrame 加上的，flush() 等不到它。 */
export const nextFrame = (env) =>
    new Promise((resolve) => env.window.requestAnimationFrame(resolve));

export const flush = async () => {
    for (let i = 0; i < 5; i += 1) await new Promise((r) => setTimeout(r, 0));
};
