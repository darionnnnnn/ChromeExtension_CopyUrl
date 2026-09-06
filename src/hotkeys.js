import { toast } from './toast.js';
import { copy } from './clipboard.js';
import { state } from './state.js';

const isMac = /mac/i.test(
    navigator.userAgentData?.platform || navigator.platform || ''
);

export function registerHotkeys() {
    // capture: true —— Gmail / Notion / YouTube 這類 app 會在自己的 handler 裡
    // stopPropagation()，冒泡階段的監聽根本收不到 keydown。
    document.addEventListener('keydown', (event) => {
        if (event.code !== 'KeyC' || event.repeat) return;
        if (!state.hoveredLinkUrl) return;

        const isCmdCtrl = isMac ? event.metaKey : event.ctrlKey;
        const isOptAlt = event.altKey;

        // 覆蓋複製：使用者有選取文字時讓瀏覽器做原生複製
        if (isCmdCtrl && !isOptAlt) {
            const selection = window.getSelection();
            if (selection && selection.toString().length > 0) return;
            event.preventDefault();
            event.stopPropagation();
            const url = state.hoveredLinkUrl;
            state.buffer = [url];
            copy(url, '已複製連結');
            return;
        }

        // 累加複製
        if (isOptAlt && !isCmdCtrl) {
            event.preventDefault();
            event.stopPropagation();
            const url = state.hoveredLinkUrl;
            if (state.buffer.includes(url)) {
                toast(`此連結已存在,未重複加入 (共 ${state.buffer.length} 筆)`);
                return;
            }
            state.buffer.push(url);
            copy(state.buffer.join('\n'), `已加入連結 (共 ${state.buffer.length} 筆)`);
        }
    }, true);
}
