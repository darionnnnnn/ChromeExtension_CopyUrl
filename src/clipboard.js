import { toast } from './toast.js';

export async function copy(text, okMsg) {
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
