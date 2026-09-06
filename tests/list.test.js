import { describe, it, expect } from 'vitest';
import { createEnv, hover, pressC, COPY, toastText, flush } from './helpers/env.js';

const THREE = `
  <a id="a" href="https://a.test/1">1</a>
  <a id="b" href="https://a.test/2">2</a>
  <a id="c" href="https://a.test/3">3</a>`;

/** 指向某個連結並以累加模式按下 */
async function append(env, id) {
    hover(env, env.document.getElementById(id));
    pressC(env, { alt: true });
    await flush();
}

describe('清單語意', () => {
    it('累加三個不同連結得到三行，順序與加入順序一致', async () => {
        const env = createEnv({ body: THREE });
        await append(env, 'a');
        await append(env, 'b');
        await append(env, 'c');
        expect(env.clipboard.writes.at(-1))
            .toBe('https://a.test/1\nhttps://a.test/2\nhttps://a.test/3');
    });

    it('空清單第一次加入顯示共 1 筆', async () => {
        const env = createEnv({ body: THREE });
        await append(env, 'a');
        expect(toastText(env)).toBe('已加入連結 (共 1 筆)');
    });

    // 本輪的需求：讓使用者知道筆數沒變是因為重複，不是失敗
    it('重複加入同一連結時筆數不變，且提示說明已存在', async () => {
        const env = createEnv({ body: THREE });
        await append(env, 'a');
        await append(env, 'b');
        const before = env.clipboard.writes.length;

        await append(env, 'b');

        expect(env.clipboard.writes).toHaveLength(before); // 沒有再寫入剪貼簿
        const msg = toastText(env);
        expect(msg).toContain('已存在');
        expect(msg).toContain('未重複加入');
        expect(msg).toContain('共 2 筆');
    });

    it('覆蓋複製會重置清單，其後從該連結重新累加', async () => {
        const env = createEnv({ body: THREE });
        await append(env, 'a');
        await append(env, 'b');

        hover(env, env.document.getElementById('c'));
        pressC(env, COPY(false));
        await flush();
        expect(env.clipboard.writes.at(-1)).toBe('https://a.test/3');

        await append(env, 'a');
        expect(env.clipboard.writes.at(-1)).toBe('https://a.test/3\nhttps://a.test/1');
    });

    it('覆蓋複製後原本重複的連結可以再次加入', async () => {
        const env = createEnv({ body: THREE });
        await append(env, 'a');

        hover(env, env.document.getElementById('b'));
        pressC(env, COPY(false));
        await flush();

        await append(env, 'a');
        expect(toastText(env)).toBe('已加入連結 (共 2 筆)');
    });
});
