import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { test } from "node:test";

test("수집 상태 브랜치 백업·복원으로 캐시 없이 이력 파일 보존", () => {
  const temp = mkdtempSync(join(tmpdir(), "mjf-state-"));
  const work = join(temp, "work");
  const remote = join(temp, "remote.git");
  const script = resolve("scripts/state.ts");
  const tsx = resolve("node_modules/.bin/tsx");
  mkdirSync(work);
  const git = (args: string[]) => execFileSync("git", args, { cwd: work, stdio: "pipe" });
  try {
    git(["init", "--bare", remote]);
    git(["init"]);
    git(["remote", "add", "origin", remote]);
    mkdirSync(join(work, "data"));
    const original = Buffer.from("test snapshot with stable firstSeenAt and hash");
    writeFileSync(join(work, "data/military-jobs.sqlite"), original);
    writeFileSync(join(work, "data/crawl-report.json"), '{"complete":true}');
    execFileSync(tsx, [script, "save"], { cwd: work, stdio: "pipe" });
    rmSync(join(work, "data"), { recursive: true });
    execFileSync(tsx, [script, "restore"], { cwd: work, stdio: "pipe" });
    assert.deepEqual(readFileSync(join(work, "data/military-jobs.sqlite")), original);
    assert.equal(readFileSync(join(work, "data/crawl-report.json"), "utf8"), '{"complete":true}');
    assert.match(git(["ls-remote", "origin", "refs/heads/chore/crawl-state"]).toString(), /refs\/heads\/chore\/crawl-state/);
  } finally { rmSync(temp, { recursive: true, force: true }); }
});
