#!/usr/bin/env bash
# 作業 D 驗收:模組拆分後行為零改變、設計理由未被刪除
set -uo pipefail
fail() { echo "FAIL: $*"; exit 1; }

# 1. 建置 + 全套測試必須綠（這是本作業唯一的成功判準）
npm test >/tmp/lqc_test.log 2>&1 || { tail -30 /tmp/lqc_test.log; fail "npm test 未通過"; }
grep -q '24 passed (24)' /tmp/lqc_test.log || {
  grep -E 'Tests +' /tmp/lqc_test.log
  fail "測試條數不是 24，測試檔被改動了"
}

# 2. 建置管線驗收必須持續通過
bash scripts/verify-build.sh >/dev/null || fail "verify-build.sh 迴歸"

# 3. 解釋「為什麼」的註解不得被刪除或改寫
#    forge 的已知劣跡：把前人留下的設計理由換成對現況的平鋪描述
for phrase in \
  "在 document 層級會被 retarget" \
  "stopPropagation()，冒泡階段的監聽根本收不到" \
  "突變驗收證實" \
  "需要文件有焦點" \
  "頁面的 !important CSS 才動不到它" \
  ; do
  grep -rqF "$phrase" src/ || fail "設計理由註解遺失: $phrase"
done

# 4. 使用者可見字串一字不得改
for msg in "已複製連結" "此連結已存在,未重複加入" "已加入連結" "存取剪貼簿失敗"; do
  grep -rqF "$msg" src/ || fail "提示字串遺失或被改寫: $msg"
done

# 5. manifest 與測試檔不得被動到
git diff --quiet HEAD -- manifest.json tests/ package.json || fail "改到了不該改的檔案"

echo "PASS: 模組拆分驗收通過"
