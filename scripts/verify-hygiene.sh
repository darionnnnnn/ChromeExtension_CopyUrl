#!/usr/bin/env bash
# 版控衛生檢查。刻意不放進委派用的 verify 腳本裡：
# 檔尾換行是 forge 寫檔時被剝掉的，委派端連續 4 輪都修不掉，
# 把它當閘門只會空燒輪數。改由 Claude 於每段之後正規化、CI 最終把關。
set -uo pipefail
fail() { echo "FAIL: $*"; exit 1; }

for f in src/*.js scripts/*.mjs scripts/*.sh tests/*.js tests/helpers/*.js; do
  [ -e "$f" ] || continue
  [ -n "$(tail -c 1 "$f")" ] && fail "檔尾缺換行: $f"
done
echo "PASS: 版控衛生檢查通過"
