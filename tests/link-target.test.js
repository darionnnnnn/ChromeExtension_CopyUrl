import { describe, it, expect } from 'vitest';
import { createEnv, hover, unhover, pressC, COPY, flush } from './helpers/env.js';

/** 指向連結後按覆蓋複製鍵，回傳剪貼簿收到的內容（沒收到則為 undefined） */
async function copyAfterHover(env, el) {
    hover(env, el);
    pressC(env, COPY(false));
    await flush();
    return env.clipboard.writes.at(-1);
}

describe('連結偵測', () => {
    it('一般 <a href> 可偵測', async () => {
        const env = createEnv({ body: '<a id="l" href="https://a.test/1">x</a>' });
        expect(await copyAfterHover(env, env.document.getElementById('l')))
            .toBe('https://a.test/1');
    });

    // 對應 composedPath 修復：event.target 在 document 層級會被 retarget 成 shadow host
    it('Shadow DOM 內的連結可偵測', async () => {
        const env = createEnv({ body: '<div id="host"></div>' });
        const root = env.document.getElementById('host').attachShadow({ mode: 'open' });
        root.innerHTML = '<a id="l" href="https://a.test/shadow">x</a>';
        const link = root.getElementById('l');
        expect(await copyAfterHover(env, link)).toBe('https://a.test/shadow');
    });

    // 註：這條測試對「有沒有 relatedTarget 判斷」都會通過，這是預期的。
    // 規範保證 mouseout 之後必定緊接著對新元素發 mouseover，紀錄會立刻被重設，
    // 因此該判斷擋的只是兩個事件之間的極短空窗，不是可觀測的 bug。
    // 突變驗收時此處刻意不列為必須轉紅的項目。見 docs/SPEC.md。
    it('連結子元素之間移動後仍能複製到該連結', async () => {
        const env = createEnv({
            body: '<a id="l" href="https://a.test/2"><span id="s1">a</span><span id="s2">b</span></a>',
        });
        const link = env.document.getElementById('l');
        const s1 = env.document.getElementById('s1');
        const s2 = env.document.getElementById('s2');

        hover(env, s1);
        unhover(env, s1, s2);   // 離開 s1，但進入的仍在同一個 <a> 內
        hover(env, s2);
        pressC(env, COPY(false));
        await flush();
        expect(env.clipboard.writes.at(-1)).toBe('https://a.test/2');
        void link;
    });

    it('移出連結到外部元素時清空紀錄', async () => {
        const env = createEnv({
            body: '<a id="l" href="https://a.test/3">x</a><p id="out">out</p>',
        });
        const link = env.document.getElementById('l');
        const out = env.document.getElementById('out');

        hover(env, link);
        unhover(env, link, out);
        pressC(env, COPY(false));
        await flush();
        expect(env.clipboard.writes).toHaveLength(0);
    });

    it.each(['javascript:void(0)', 'about:blank', 'data:text/plain,x'])(
        '不採用 %s',
        async (href) => {
            const env = createEnv({ body: `<a id="l" href="${href}">x</a>` });
            await copyAfterHover(env, env.document.getElementById('l'));
            expect(env.clipboard.writes).toHaveLength(0);
        },
    );
});
