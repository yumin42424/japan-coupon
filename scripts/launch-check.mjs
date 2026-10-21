// 정식 공개를 막는 항목을 코드에서 찾아 알려준다 (읽기 전용). 종료 코드 1 = 아직 막는 항목이 남아 있음.
//   npm run launch-check
// 운영자가 확정해야 하는 값(사업자 정보 등)은 개발자가 임의로 채우지 않는다 — 이 점검이 0건이 될 때까지 정식 공개를 하지 않는다.
import { readFileSync } from "node:fs";

const files = ["src/app/terms/page.tsx", "src/app/privacy/page.tsx", "src/app/support/page.tsx", "src/app/about/page.tsx", "src/app/partnership/page.tsx"];
const blockers = [];

for (const file of files) {
  const lines = readFileSync(file, "utf8").split(/\r?\n/);
  lines.forEach((line, i) => {
    // 문장 속 설명("［　］で示した箇所は…")이 아니라, 값이 들어가야 할 자리표시자만 센다
    const m = line.match(/［[^］]+］/g);
    if (m && !/で示した箇所/.test(line)) blockers.push({ file, line: i + 1, what: `placeholder ${[...new Set(m)].join(" ")}` });
    if (/\+?\d{1,3}[ -]\d{2,4}-\d{3,4}-\d{4}|\b0\d{1,2}-\d{3,4}-\d{4}\b/.test(line)) blockers.push({ file, line: i + 1, what: "a phone number is published in the page source" });
  });
}

if (blockers.length === 0) {
  console.log("launch-check: no public-launch blockers found in the legal pages.");
  process.exit(0);
}
console.log("launch-check: items that block a PUBLIC launch (fill in with the operator's confirmed information):\n");
for (const b of blockers) console.log(`  ${b.file}:${b.line}  ${b.what}`);
console.log(`\n${blockers.length} blocker(s). These values must come from the operator — do not invent them.`);
process.exit(1);
