import * as esbuild from 'esbuild';
import { copyFileSync, mkdirSync, rmSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = dirname(__dirname);

const SRC_DIR = join(rootDir, 'src');
const PUBLISH_DIR = join(rootDir, 'publish');
const ENTRY_POINT = join(SRC_DIR, 'content.js');
const MANIFEST_SRC = join(rootDir, 'manifest.json');
const MANIFEST_DEST = join(PUBLISH_DIR, 'manifest.json');
const OUTPUT_JS = join(PUBLISH_DIR, 'content.js');

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

    // 3. 使用 esbuild 打包 content.js
    await esbuild.build({
      entryPoints: [ENTRY_POINT],
      bundle: true,
      outfile: OUTPUT_JS,
      format: 'iife',
      platform: 'browser',
      target: 'chrome120',
      minify: false,
      sourcemap: false,
      // 預設 charset 是 ascii，會把中文提示字串轉成 \uXXXX，產物就不可讀了
      charset: 'utf8',
    });

    console.log('Build successful.');
  } catch (error) {
    console.error('Build failed:', error.message);
    process.exit(1);
  }
}

if (isWatchMode) {
  // Watch 模式
  // 注意：watch 模式下 esbuild 會持續執行，我們需要處理目錄清空邏輯
  // 為了避免 watch 模式下每次重新建置都刪除整個目錄導致 esbuild 報錯，
  // 我們在第一次執行前先清空，之後只針對檔案進行覆蓋。
  
  // 執行初始建置
  await build();

  // 設定監看
  let ctx;
  try {
    ctx = await esbuild.context({
      entryPoints: [ENTRY_POINT],
      bundle: true,
      outfile: OUTPUT_JS,
      format: 'iife',
      platform: 'browser',
      target: 'chrome120',
      minify: false,
      sourcemap: false,
      // 預設 charset 是 ascii，會把中文提示字串轉成 \uXXXX，產物就不可讀了
      charset: 'utf8',
    });

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