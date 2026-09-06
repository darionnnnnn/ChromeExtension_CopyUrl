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

    const exec = { calls: [], fail: false };
    window.document.execCommand = (cmd) => {
        exec.calls.push(cmd);
        return !exec.fail;
    };

    // jsdom 未實作：以替身補上，讓捲動路徑可被測試控制
    const elementAtPoint = { current: null };
    window.document.elementFromPoint = () => elementAtPoint.current;

    window.document.hasFocus = () => true;

    window.eval(fs.readFileSync(BUNDLE_PATH, 'utf8'));

    return { dom, window, document: window.document, clipboard, exec, elementAtPoint };
}

/** 讀出提示膠囊的文字（需要 shadow root 為 open） */
export function toastText(env) {
    for (const el of env.document.body.querySelectorAll('*')) {
        const capsule = el.shadowRoot?.querySelector('.capsule');
        if (capsule) return capsule.textContent;
    }
    return null;
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

/** 覆蓋複製的修飾鍵組合（依平台） */
export const COPY = (mac) => (mac ? { meta: true } : { ctrl: true });

/** 等待 content.js 內的 async 剪貼簿流程走完 */
export const flush = async () => {
    for (let i = 0; i < 5; i += 1) await new Promise((r) => setTimeout(r, 0));
};
