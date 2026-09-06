import * as esbuild from 'esbuild';
import { copyFileSync, cpSync, mkdirSync, rmSync, existsSync, watch } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = dirname(__dirname);

const SRC_DIR = join(rootDir, 'src');
const PUBLISH_DIR = join(rootDir, 'publish');
const ENTRY_POINT = join(SRC_DIR, 'content.js');
const MANIFEST_SRC = join(rootDir, 'manifest.json');
const MANIFEST_DEST = join(PUBLISH_DIR, 'manifest.json');
const ICONS_SRC = join(rootDir, 'icons');
const ICONS_DEST = join(PUBLISH_DIR, 'icons');
const OUTPUT_JS = join(PUBLISH_DIR, 'content.js');

const BUILD_OPTIONS = {
  entryPoints: [ENTRY_POINT],
  bundle: true,
  outfile: OUTPUT_JS,
  // 格式必須是 IIFE：MV3 的 content script 是傳統腳本，頂層 import/export 會讓擴充直接壞掉
  format: 'iife',
  platform: 'browser',
  target: 'chrome120',
  // 不壓縮，產物要保持可讀以便除錯與審查
  minify: false,
  sourcemap: false,
  // 預設 charset 是 ascii，會把中文提示字串轉成 \uXXXX，產物就不可讀了
  charset: 'utf8',
};

const isWatchMode = process.argv.includes('--watch');

async function build() {
  try {
    // 1. 清空 publish 目錄
    if (existsSync(PUBLISH_DIR)) {
      rmSync(PUBLISH_DIR, { recursive: true, force: true });
    }
    mkdirSync(PUBLISH_DIR, { recursive: true });

    // 2. 複製 manifest.json (逐位元組完全相同)
    copyFileSync(MANIFEST_SRC, MANIFEST_DEST);

    // 2b. 複製圖示 —— manifest 以相對路徑引用，publish/ 少了它們擴充會顯示預設灰塊
    cpSync(ICONS_SRC, ICONS_DEST, { recursive: true });

    // 3. 使用 esbuild 打包 content.js
    await esbuild.build(BUILD_OPTIONS);

    console.log('Build successful.');
  } catch (error) {
    console.error('Build failed:', error.message);
    process.exit(1);
  }
}

if (isWatchMode) {
  await build();

  // esbuild 的 watch 只重建 JS。manifest 與圖示也要跟著看，
  // 否則開發時改了 manifest.json，載入中的 publish/ 不會更新。
  const copyStatics = () => {
    copyFileSync(MANIFEST_SRC, MANIFEST_DEST);
    cpSync(ICONS_SRC, ICONS_DEST, { recursive: true });
    console.log('Static assets copied.');
  };
  watch(MANIFEST_SRC, copyStatics);
  watch(ICONS_SRC, { recursive: true }, copyStatics);

  let ctx;
  try {
    ctx = await esbuild.context(BUILD_OPTIONS);
    await ctx.watch();
    console.log('Watching for changes...');
  } catch (error) {
    console.error('Watch mode error:', error.message);
    process.exit(1);
  }
} else {
  // 單次建置模式
  await build();
}
