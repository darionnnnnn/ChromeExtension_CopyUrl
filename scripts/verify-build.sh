#!/usr/bin/env bash
# 作業 A 驗收:建置管線正確且產物與來源等價
set -uo pipefail
fail() { echo "FAIL: $*"; exit 1; }

rm -rf publish
npm run build >/dev/null 2>&1 || fail "npm run build 結束碼非 0"

[ -f publish/content.js ]   || fail "publish/content.js 未產出"
[ -f publish/manifest.json ] || fail "publish/manifest.json 未產出"
node --check publish/content.js || fail "產物語法錯誤"

# manifest 必須與根目錄來源逐位元組相同
cmp -s manifest.json publish/manifest.json || fail "publish/manifest.json 與來源不一致"

# MV3 content script 是傳統腳本:產物不得含頂層 import/export
grep -Eq '^(import|export)[[:space:]]' publish/content.js && fail "產物含頂層 import/export,不是 IIFE"

# 行為等價:v1.4 的三個修復標記必須完整出現在產物中
for marker in composedPath relatedTarget elementFromPoint execCommand attachShadow; do
  grep -q "$marker" publish/content.js || fail "產物遺失標記 $marker"
done

# 產物須保持人類可讀：非 ASCII 不得被逸出成 \uXXXX
grep -q '\\u[0-9A-Fa-f]\{4\}' publish/content.js && fail "產物含 \\uXXXX 逸出，charset 未設為 utf8"

# 使用者看得到的提示字串必須以原文出現在產物中
for msg in 已複製連結 已存在 未重複加入 存取剪貼簿失敗; do
  grep -q "$msg" publish/content.js || fail "產物遺失提示字串 $msg"
done

# 監聽器數量必須與來源一致
# 註:要數整個 src/ 而不是單一檔案 —— 監聽器會隨模組拆分散到各檔,
# 只數 content.js 會在拆分時必然不符(2026-09-06 誤擋 D-4 四輪)。
src_n=$(cat src/*.js | grep -c 'addEventListener')
out_n=$(grep -c 'addEventListener' publish/content.js)
[ "$src_n" = "$out_n" ] || fail "addEventListener 數量不符:來源 $src_n,產物 $out_n"

# watch 旗標須被接受(啟動後即殺,只驗不會立刻崩潰)
node scripts/build.mjs --watch >/dev/null 2>&1 &
wpid=$!
for _ in 1 2 3 4 5 6 7 8 9 10; do kill -0 "$wpid" 2>/dev/null || break; done
if kill -0 "$wpid" 2>/dev/null; then kill "$wpid" 2>/dev/null; else
  wait "$wpid"; [ $? -eq 0 ] || fail "--watch 立即失敗"
fi

echo "PASS: 建置管線驗收通過"
