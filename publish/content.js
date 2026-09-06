(() => {
  // src/content.js
  var hoveredLinkUrl = null;
  var lastPointer = null;
  var buffer = [];
  var isMac = /mac/i.test(
    navigator.userAgentData?.platform || navigator.platform || ""
  );
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
  document.addEventListener("mouseover", (event) => {
    if (typeof event.clientX === "number") {
      lastPointer = { x: event.clientX, y: event.clientY };
    }
    const url = usableUrl(anchorFromEvent(event));
    if (url) hoveredLinkUrl = url;
  }, true);
  document.addEventListener("mouseout", (event) => {
    const from = anchorFromEvent(event);
    if (!from) return;
    const to = event.relatedTarget;
    if (to && from.contains(to)) return;
    hoveredLinkUrl = null;
  }, true);
  document.addEventListener("scroll", () => {
    if (!lastPointer) return;
    const el = document.elementFromPoint(lastPointer.x, lastPointer.y);
    const anchor = el?.closest?.("a[href]");
    hoveredLinkUrl = usableUrl(anchor);
  }, true);
  window.addEventListener("blur", () => {
    hoveredLinkUrl = null;
  });
  document.addEventListener("keydown", (event) => {
    if (event.code !== "KeyC" || event.repeat) return;
    if (!hoveredLinkUrl) return;
    const isCmdCtrl = isMac ? event.metaKey : event.ctrlKey;
    const isOptAlt = event.altKey;
    if (isCmdCtrl && !isOptAlt) {
      const selection = window.getSelection();
      if (selection && selection.toString().length > 0) return;
      event.preventDefault();
      event.stopPropagation();
      const url = hoveredLinkUrl;
      buffer = [url];
      copy(url, "\u5DF2\u8907\u88FD\u9023\u7D50");
      return;
    }
    if (isOptAlt && !isCmdCtrl) {
      event.preventDefault();
      event.stopPropagation();
      const url = hoveredLinkUrl;
      if (buffer.includes(url)) {
        toast(`\u5DF2\u5728\u6E05\u55AE\u4E2D (\u5171 ${buffer.length} \u7B46)`);
        return;
      }
      buffer.push(url);
      copy(buffer.join("\n"), `\u5DF2\u52A0\u5165\u9023\u7D50 (\u5171 ${buffer.length} \u7B46)`);
    }
  }, true);
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
      console.error("[Link Quick Copier] \u8907\u88FD\u5931\u6557:", err);
      toast("\u5B58\u53D6\u526A\u8CBC\u7C3F\u5931\u6557", true);
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
  var toastHost = null;
  var toastTimer = null;
  function toast(message, isError = false) {
    const root = document.body || document.documentElement;
    if (!root) return;
    if (!toastHost || !toastHost.isConnected) {
      toastHost = document.createElement("div");
      toastHost.style.cssText = "all:initial;position:fixed;z-index:2147483647;";
      const shadow = toastHost.attachShadow({ mode: "closed" });
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
})();
