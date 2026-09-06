(() => {
  // src/toast.js
  var toastHost = null;
  var toastTimer = null;
  function toast(message, isError = false) {
    const root = document.body || document.documentElement;
    if (!root) return;
    if (!toastHost || !toastHost.isConnected) {
      toastHost = document.createElement("div");
      toastHost.style.cssText = "all:initial;position:fixed;z-index:2147483647;";
      const shadow = toastHost.attachShadow({ mode: "open" });
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
      toastHost._capsule = shadow.querySelector(".capsule");
      root.appendChild(toastHost);
    }
    const capsule = toastHost._capsule;
    capsule.textContent = message;
    capsule.classList.toggle("error", isError);
    requestAnimationFrame(() => capsule.classList.add("show"));
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => capsule.classList.remove("show"), 2e3);
  }

  // src/clipboard.js
  async function copy(text, okMsg) {
    if (!document.hasFocus()) {
      try {
        window.focus();
      } catch (_) {
      }
    }
    try {
      await navigator.clipboard.writeText(text);
      toast(okMsg);
      return;
    } catch (err) {
      if (legacyCopy(text)) {
        toast(okMsg);
        return;
      }
      console.error("[Link Quick Copier] 複製失敗:", err);
      toast("存取剪貼簿失敗", true);
    }
  }
  function legacyCopy(text) {
    try {
      const ta = document.createElement("textarea");
      ta.value = text;
      ta.setAttribute("readonly", "");
      Object.assign(ta.style, {
        position: "fixed",
        top: "0",
        left: "-9999px",
        opacity: "0"
      });
      (document.body || document.documentElement).appendChild(ta);
      ta.select();
      const ok = document.execCommand("copy");
      ta.remove();
      return ok;
    } catch (_) {
      return false;
    }
  }

  // src/state.js
  var state = {
    hoveredLinkUrl: null,
    lastPointer: null,
    // 最後一次滑鼠座標，供捲動後重新判定
    buffer: []
    // 累加模式的內部清單（不依賴 clipboardRead）
  };

  // src/link-target.js
  function anchorFromEvent(event) {
    const path = typeof event.composedPath === "function" ? event.composedPath() : [];
    for (const node of path) {
      if (node instanceof HTMLAnchorElement && node.href) return node;
      if (node?.nodeName === "A" && node.getAttribute?.("href")) return node;
    }
    return event.target?.closest?.("a[href]") || null;
  }
  function usableUrl(anchor) {
    const href = anchor?.href;
    if (!href) return null;
    if (/^(javascript|about|data):/i.test(href)) return null;
    return href;
  }

  // src/pointer.js
  function registerPointerTracking() {
    document.addEventListener("mouseover", (event) => {
      if (typeof event.clientX === "number") {
        state.lastPointer = { x: event.clientX, y: event.clientY };
      }
      const url = usableUrl(anchorFromEvent(event));
      if (url) state.hoveredLinkUrl = url;
    }, true);
    document.addEventListener("mouseout", (event) => {
      const from = anchorFromEvent(event);
      if (!from) return;
      const to = event.relatedTarget;
      if (to && from.contains(to)) return;
      state.hoveredLinkUrl = null;
    }, true);
    document.addEventListener("scroll", () => {
      if (!state.lastPointer) return;
      const el = document.elementFromPoint(state.lastPointer.x, state.lastPointer.y);
      const anchor = el?.closest?.("a[href]");
      state.hoveredLinkUrl = usableUrl(anchor);
    }, true);
    window.addEventListener("blur", () => {
      state.hoveredLinkUrl = null;
    });
  }

  // src/content.js
  var isMac = /mac/i.test(
    navigator.userAgentData?.platform || navigator.platform || ""
  );
  registerPointerTracking();
  document.addEventListener("keydown", (event) => {
    if (event.code !== "KeyC" || event.repeat) return;
    if (!state.hoveredLinkUrl) return;
    const isCmdCtrl = isMac ? event.metaKey : event.ctrlKey;
    const isOptAlt = event.altKey;
    if (isCmdCtrl && !isOptAlt) {
      const selection = window.getSelection();
      if (selection && selection.toString().length > 0) return;
      event.preventDefault();
      event.stopPropagation();
      const url = state.hoveredLinkUrl;
      state.buffer = [url];
      copy(url, "已複製連結");
      return;
    }
    if (isOptAlt && !isCmdCtrl) {
      event.preventDefault();
      event.stopPropagation();
      const url = state.hoveredLinkUrl;
      if (state.buffer.includes(url)) {
        toast(`此連結已存在,未重複加入 (共 ${state.buffer.length} 筆)`);
        return;
      }
      state.buffer.push(url);
      copy(state.buffer.join("\n"), `已加入連結 (共 ${state.buffer.length} 筆)`);
    }
  }, true);
})();
