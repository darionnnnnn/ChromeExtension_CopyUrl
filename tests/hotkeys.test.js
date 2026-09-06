import { describe, it, expect } from 'vitest';
import { createEnv, hover, pressC, COPY, selectText, flush } from './helpers/env.js';

const LINK = '<a id="l" href="https://a.test/k">x</a>';

describe('按鍵分派', () => {
    // 對應 capture 修復：Gmail / Notion 這類 app 會在自己的 handler 裡 stopPropagation()
    it('頁面攔截事件時複製仍然成立', async () => {
        const env = createEnv({ body: LINK });
        const link = env.document.getElementById('l');

        // 模擬頁面自己的攔截器：掛在 body 的捕獲階段，比 target 早、比 document 晚
        env.document.body.addEventListener('keydown', (e) => e.stopPropagation(), true);

        hover(env, link);
        pressC(env, COPY(false), link);
        await flush();
        expect(env.clipboard.writes).toEqual(['https://a.test/k']);
    });

    it('使用者已選取文字時不攔截覆蓋複製', async () => {
        const env = createEnv({ body: LINK });
        selectText(env, '使用者選起來的一段文字');
        hover(env, env.document.getElementById('l'));
        const ev = pressC(env, COPY(false));
        await flush();
        expect(env.clipboard.writes).toHaveLength(0);
        expect(ev.defaultPrevented).toBe(false);
    });

    it('累加模式不受文字選取影響', async () => {
        const env = createEnv({ body: LINK });
        selectText(env, '一段文字');
        hover(env, env.document.getElementById('l'));
        pressC(env, { alt: true });
        await flush();
        expect(env.clipboard.writes).toEqual(['https://a.test/k']);
    });

    it('長按產生的 repeat 事件不重複觸發', async () => {
        const env = createEnv({ body: LINK });
        hover(env, env.document.getElementById('l'));
        pressC(env, { ...COPY(false), repeat: true });
        await flush();
        expect(env.clipboard.writes).toHaveLength(0);
    });

    it('未指向連結時按鍵無動作', async () => {
        const env = createEnv({ body: '<p id="p">沒有連結</p>' });
        const ev = pressC(env, COPY(false));
        await flush();
        expect(env.clipboard.writes).toHaveLength(0);
        expect(ev.defaultPrevented).toBe(false);
    });

    it('覆蓋鍵與累加鍵同時按下時不觸發任一模式', async () => {
        const env = createEnv({ body: LINK });
        hover(env, env.document.getElementById('l'));
        pressC(env, { ctrl: true, alt: true });
        await flush();
        expect(env.clipboard.writes).toHaveLength(0);
    });

    it('非 C 鍵不觸發', async () => {
        const env = createEnv({ body: LINK });
        hover(env, env.document.getElementById('l'));
        const ev = new env.window.KeyboardEvent('keydown', {
            code: 'KeyV', key: 'v', bubbles: true, cancelable: true, ctrlKey: true,
        });
        env.document.body.dispatchEvent(ev);
        await flush();
        expect(env.clipboard.writes).toHaveLength(0);
    });

    it('Mac 上用 Cmd 而非 Ctrl 觸發覆蓋複製', async () => {
        const env = createEnv({ body: LINK, mac: true });
        const link = env.document.getElementById('l');

        hover(env, link);
        pressC(env, { ctrl: true });
        await flush();
        expect(env.clipboard.writes).toHaveLength(0);

        pressC(env, { meta: true });
        await flush();
        expect(env.clipboard.writes).toEqual(['https://a.test/k']);
    });
});
