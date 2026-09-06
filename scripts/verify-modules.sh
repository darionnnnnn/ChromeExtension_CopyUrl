#!/usr/bin/env bash
# 行為與文件的迴歸閘門：測試全綠、建置管線正常、設計理由註解與使用者可見字串未被改動。
# 原本還有一條「manifest/tests 不得被動到」，那是作業 D（模組拆分）專用的圍籬，
# 在後續作業裡會誤擋合法改動（E-2 加圖示就踩到），且它比對 HEAD、任何未提交的
# 正當修改都會紅。作業 D 結束後移除。
set -uo pipefail
fail() { echo "FAIL: $*"; exit 1; }

# 1. 建置 + 全套測試必須綠（這是本作業唯一的成功判準）
# NO_COLOR 關掉 vitest 上色，再用 sed 剝一次 ANSI 逃脫序列當保險：
# CI（非 TTY）上 vitest 仍會上色，色碼會插在 "Tests" 與數字之間，
# 讓下面的 regex 對不上而誤判成「讀不到測試條數」（2026-09-06 CI 實測）。
NO_COLOR=1 npm test >/tmp/lqc_test.raw 2>&1 || { tail -30 /tmp/lqc_test.raw; fail "npm test 未通過"; }
sed $'s/\033\[[0-9;]*[a-zA-Z]//g' /tmp/lqc_test.raw > /tmp/lqc_test.log
# 下限而非固定值：日後新增測試不該讓閘門變紅，但刪測試要被抓到
MIN_TESTS=24
passed=$(grep -oE 'Tests +[0-9]+ passed' /tmp/lqc_test.log | grep -oE '[0-9]+' | head -1)
[ -n "$passed" ] || { grep -E 'Tests +' /tmp/lqc_test.log; fail "讀不到測試條數"; }
[ "$passed" -ge "$MIN_TESTS" ] || fail "測試只剩 $passed 條，低於下限 $MIN_TESTS，測試被刪了"
grep -q 'failed' /tmp/lqc_test.log && fail "有測試失敗"

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

echo "PASS: 迴歸閘門通過"
