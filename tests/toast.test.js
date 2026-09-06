import { describe, it, expect } from 'vitest';
import { createEnv, hover, pressC, COPY, toastCapsule, toastText, flush, nextFrame } from './helpers/env.js';

const LINK = '<a id="l" href="https://a.test/t">x</a>';

async function copyLink(env) {
    hover(env, env.document.getElementById('l'));
    pressC(env, COPY(false));
    await flush();
}

describe('提示膠囊', () => {
    it('成功時不套用錯誤樣式', async () => {
        const env = createEnv({ body: LINK });
        await copyLink(env);
        expect(toastCapsule(env).classList.contains('error')).toBe(false);
    });

    // SPEC 寫明錯誤提示是紅底，靠的是 .error 類別
    it('兩條寫入路徑都失敗時套用錯誤樣式', async () => {
        const env = createEnv({ body: LINK });
        env.clipboard.fail = true;
        env.exec.fail = true;
        await copyLink(env);
        expect(toastCapsule(env).classList.contains('error')).toBe(true);
    });

    it('錯誤之後再成功一次，錯誤樣式要被清掉', async () => {
        const env = createEnv({ body: LINK });
        env.clipboard.fail = true;
        env.exec.fail = true;
        await copyLink(env);
        expect(toastCapsule(env).classList.contains('error')).toBe(true);

        env.clipboard.fail = false;
        await copyLink(env);
        expect(toastCapsule(env).classList.contains('error')).toBe(false);
        expect(toastText(env)).toBe('已複製連結');
    });

    it('提示會在計時器到期後淡出', async () => {
        const env = createEnv({ body: LINK });
        await copyLink(env);
        await nextFrame(env);
        expect(toastCapsule(env).classList.contains('show')).toBe(true);

        env.timers.runAll();
        expect(toastCapsule(env).classList.contains('show')).toBe(false);
    });

    it('連續兩次提示共用同一個宿主元素，不會堆疊', async () => {
        const env = createEnv({ body: LINK });
        await copyLink(env);
        await copyLink(env);
        const hosts = [...env.document.body.querySelectorAll('*')]
            .filter((el) => el.shadowRoot?.querySelector('.capsule'));
        expect(hosts).toHaveLength(1);
    });
});
