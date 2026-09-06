let toastHost = null;
let toastCapsule = null;
let toastTimer = null;

// 掛在 Shadow DOM 裡，頁面的 !important CSS 才動不到它
export function toast(message, isError = false) {
    const root = document.body || document.documentElement;
    if (!root) return;

    if (!toastHost || !toastHost.isConnected) {
        toastHost = document.createElement('div');
        toastHost.style.cssText = 'all:initial;position:fixed;z-index:2147483647;';
        const shadow = toastHost.attachShadow({ mode: 'open' });
        shadow.innerHTML = `
            <style>
                .capsule {
                    position: fixed; bottom: 60px; left: 50%;
                    transform: translateX(-50%);
                    padding: 10px 24px; border-radius: 99px;
                    font: 14px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                    color: #fff; background: #202124;
                    box-shadow: 0 2px 6px rgba(0,0,0,.2);
                    white-space: nowrap; pointer-events: none;
                    opacity: 0; transition: opacity .2s ease-in-out;
                }
                .capsule.error { background: #d93025; }
                .capsule.show { opacity: 1; }
            </style>
            <div class="capsule"></div>`;
        toastCapsule = shadow.querySelector('.capsule');
        root.appendChild(toastHost);
    }

    const capsule = toastCapsule;
    capsule.textContent = message;
    capsule.classList.toggle('error', isError);
    requestAnimationFrame(() => capsule.classList.add('show'));

    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => capsule.classList.remove('show'), 2000);
}
