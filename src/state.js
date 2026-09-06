export const state = {
    hoveredLinkUrl: null,
    lastPointer: null,      // 最後一次滑鼠座標，供捲動後重新判定
    buffer: [],             // 累加模式的內部清單（不依賴 clipboardRead）
};
