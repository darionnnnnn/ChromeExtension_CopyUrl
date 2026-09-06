// Link Quick Copier - content script
// Cmd/Ctrl+C：覆蓋複製滑鼠所指連結；Opt/Alt+C：累加成清單

import { registerPointerTracking } from './pointer.js';
import { registerHotkeys } from './hotkeys.js';

registerPointerTracking();
registerHotkeys();
