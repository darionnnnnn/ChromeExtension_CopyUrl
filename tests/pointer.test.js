import { describe, it, expect } from 'vitest';
import { createEnv, hover, scrollTo, pressC, COPY, flush } from './helpers/env.js';

/** 按下覆蓋複製鍵，回傳剪貼簿收到的內容 */
async function copyNow(env) {
    pressC(env, COPY(false));
    await flush();
    return env.clipboard.writes.at(-1);
}

describe('捲動後重新判定游標下的連結', () => {
    // 滑鼠不動時捲動不會發 mouseover，但游標下的元素已經換了
    it('捲到另一個連結上時改複製新的連結', async () => {
        const env = createEnv({
            body: '<a id="a" href="https://a.test/1">1</a><a id="b" href="https://a.test/2">2</a>',
        });
        hover(env, env.document.getElementById('a'));
        scrollTo(env, env.document.getElementById('b'));
        expect(await copyNow(env)).toBe('https://a.test/2');
    });

    it('捲到非連結區域時清空紀錄', async () => {
        const env = createEnv({
            body: '<a id="a" href="https://a.test/1">1</a><p id="p">文字</p>',
        });
        hover(env, env.document.getElementById('a'));
        scrollTo(env, env.document.getElementById('p'));
        pressC(env, COPY(false));
        await flush();
        expect(env.clipboard.writes).toHaveLength(0);
    });

    // elementFromPoint 回傳的是 shadow host，closest 穿不過去；
    // 少了遞迴查詢，在 web component 包連結的網站上捲一下滾輪快捷鍵就失效
    it('捲到 Shadow DOM 內的連結上仍能偵測', async () => {
        const env = createEnv({
            body: '<a id="a" href="https://a.test/1">1</a><div id="host"></div>',
        });
        const host = env.document.getElementById('host');
        const root = host.attachShadow({ mode: 'open' });
        root.innerHTML = '<a id="s" href="https://a.test/shadow">s</a>';
        root.elementFromPoint = () => root.getElementById('s');

        hover(env, env.document.getElementById('a'));
        scrollTo(env, host);
        expect(await copyNow(env)).toBe('https://a.test/shadow');
    });

    it('游標從未落在頁面上時捲動不做任何事', async () => {
        const env = createEnv({ body: '<a id="a" href="https://a.test/1">1</a>' });
        scrollTo(env, null);
        pressC(env, COPY(false));
        await flush();
        expect(env.clipboard.writes).toHaveLength(0);
    });
});
