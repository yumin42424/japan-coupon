// `npm test` — 순수 로직(포인트 정책/검증)을 컴파일해서 Node 내장 테스트 러너로 실행한다.
// (별도 테스트 프레임워크 없이 동작. DB 쪽 테스트는 db/tests/ 참고)
import { execSync, spawnSync } from "node:child_process";
import { rmSync } from "node:fs";

rmSync(".test-build", { recursive: true, force: true });
execSync(
  "npx tsc src/lib/point-policy.ts src/lib/point-use.ts src/lib/date.ts src/lib/safe-redirect.ts src/lib/business-hours.ts src/lib/reissue.ts --outDir .test-build --module commonjs --target es2022 --skipLibCheck --strict",
  { stdio: "inherit" }
);
const r = spawnSync(process.execPath, ["--test", "tests/*.test.mjs"], { stdio: "inherit" });
rmSync(".test-build", { recursive: true, force: true });
process.exit(r.status ?? 1);
