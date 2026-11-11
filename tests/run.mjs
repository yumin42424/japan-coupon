// `npm test` — 순수 로직(포인트 정책/검증)을 컴파일해서 Node 내장 테스트 러너로 실행한다.
// (별도 테스트 프레임워크 없이 동작. DB 쪽 테스트는 db/tests/ 참고)
import { execSync, spawnSync } from "node:child_process";
import { rmSync } from "node:fs";

rmSync(".test-build", { recursive: true, force: true });
execSync(
  "npx tsc src/lib/point-policy.ts src/lib/point-use.ts src/lib/date.ts src/lib/safe-redirect.ts src/lib/business-hours.ts src/lib/reissue.ts src/lib/email-config.ts src/lib/issue-policy.ts src/lib/signup-schema.ts src/lib/taxonomy.ts src/lib/coupon-list.ts src/lib/map-link.ts src/lib/audit.ts src/lib/redeem-access.ts src/lib/coupon-code.ts --outDir .test-build --module commonjs --target es2022 --skipLibCheck --strict",
  { stdio: "inherit" }
);
// src/i18n 은 하위 폴더(messages/)가 있어 위 목록에 섞으면 출력 경로가 바뀐다. 따로 컴파일한다.
execSync(
  "npx tsc src/i18n/config.ts src/i18n/translate.ts src/i18n/content-core.ts src/i18n/messages/index.ts --outDir .test-build/i18n --module commonjs --target es2022 --skipLibCheck --strict",
  { stdio: "inherit" }
);
const r = spawnSync(process.execPath, ["--test", "tests/*.test.mjs"], { stdio: "inherit" });
rmSync(".test-build", { recursive: true, force: true });
process.exit(r.status ?? 1);
