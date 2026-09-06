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
