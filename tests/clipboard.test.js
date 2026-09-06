import { describe, it, expect } from 'vitest';
import { createEnv, hover, pressC, COPY, toastText, flush } from './helpers/env.js';

const LINK = '<a id="l" href="https://a.test/c">x</a>';

async function copyLink(env) {
    hover(env, env.document.getElementById('l'));
    pressC(env, COPY(false));
    await flush();
}

describe('剪貼簿寫入', () => {
    it('正常路徑寫入並顯示成功提示', async () => {
        const env = createEnv({ body: LINK });
        await copyLink(env);
        expect(env.clipboard.writes).toEqual(['https://a.test/c']);
        expect(toastText(env)).toBe('已複製連結');
        expect(env.exec.calls).toHaveLength(0);
    });

    it('Clipboard API 失敗時改走 execCommand，仍顯示成功提示', async () => {
        const env = createEnv({ body: LINK });
        env.clipboard.fail = true;
        await copyLink(env);
        expect(env.exec.calls).toContain('copy');
        expect(toastText(env)).toBe('已複製連結');
    });

    // 只驗「有沒有呼叫 execCommand」抓不到 fallback 複製到錯誤內容的迴歸
    it('fallback 實際複製的內容就是該連結網址', async () => {
        const env = createEnv({ body: LINK });
        env.clipboard.fail = true;
        await copyLink(env);
        expect(env.exec.values).toEqual(['https://a.test/c']);
    });

    it('fallback 也適用於累加清單的完整內容', async () => {
        const env = createEnv({
            body: '<a id="l" href="https://a.test/c">x</a><a id="m" href="https://a.test/d">y</a>',
        });
        env.clipboard.fail = true;
        hover(env, env.document.getElementById('l'));
        pressC(env, { alt: true });
        await flush();
        hover(env, env.document.getElementById('m'));
        pressC(env, { alt: true });
        await flush();
        expect(env.exec.values.at(-1)).toBe('https://a.test/c\nhttps://a.test/d');
    });

    it('文件沒有焦點時先取得焦點再寫入', async () => {
        const env = createEnv({ body: LINK });
        env.focus.hasFocus = false;
        await copyLink(env);
        expect(env.focus.focusCalls).toBe(1);
        expect(env.clipboard.writes).toEqual(['https://a.test/c']);
    });

    it('兩條路徑都失敗時顯示錯誤提示', async () => {
        const env = createEnv({ body: LINK });
        env.clipboard.fail = true;
        env.exec.fail = true;
        await copyLink(env);
        expect(toastText(env)).toBe('存取剪貼簿失敗');
    });

    it('fallback 用的 textarea 不會殘留在頁面上', async () => {
        const env = createEnv({ body: LINK });
        env.clipboard.fail = true;
        await copyLink(env);
        expect(env.document.querySelectorAll('textarea')).toHaveLength(0);
    });
});
