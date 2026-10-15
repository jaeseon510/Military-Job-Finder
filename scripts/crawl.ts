import { mkdir, open, unlink, writeFile } from "node:fs/promises";
import { crawl } from "../src/collector/crawl";

await mkdir("data", { recursive: true });
let lock;
try { lock = await open("data/crawl.lock", "wx"); }
catch { throw new Error("다른 수집 작업이 실행 중입니다. 비정상 종료였다면 data/crawl.lock을 확인 후 삭제하세요."); }
try {
  const args = process.argv.slice(2);
  const limitIndex = args.indexOf("--max-jobs");
  const maxJobs = limitIndex >= 0 ? Number(args[limitIndex + 1]) : undefined;
  if (maxJobs !== undefined && (!Number.isInteger(maxJobs) || maxJobs <= 0)) throw new Error("--max-jobs는 양의 정수여야 합니다");
  const report = await crawl({ force: args.includes("--force"), maxJobs });
  await writeFile("data/crawl-report.json", JSON.stringify(report, null, 2));
  console.info(`완료: 발견 ${report.discovered} · 확인 ${report.updated} · 오류 ${report.errors.length} · 전체 ${report.complete ? "완료" : "일부 수집"}`);
  if (report.errors.length) console.error("개별 오류: data/crawl-report.json");
  // 개별 실패는 계속 진행하되 전체 목록 실패는 자동화에서도 실패로 보존합니다.
  if (report.updated === 0 && report.errors.length) process.exitCode = 1;
} finally {
  await lock.close();
  await unlink("data/crawl.lock");
}
await import("./export");
