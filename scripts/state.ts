import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { gunzipSync, gzipSync } from "node:zlib";

const ref = "refs/heads/chore/crawl-state";
const tracking = "refs/remotes/origin/chore/crawl-state";
const git = (args: string[], input?: string | Buffer) => execFileSync("git", args, { input, maxBuffer: 100 * 1024 * 1024, env: { ...process.env, GIT_AUTHOR_NAME: "github-actions[bot]", GIT_AUTHOR_EMAIL: "41898282+github-actions[bot]@users.noreply.github.com", GIT_COMMITTER_NAME: "github-actions[bot]", GIT_COMMITTER_EMAIL: "41898282+github-actions[bot]@users.noreply.github.com" } });
const remote = git(["ls-remote", "origin", ref]).toString().trim();
let parent: string | undefined;
if (remote) {
  git(["fetch", "--no-tags", "origin", `${ref}:${tracking}`]);
  parent = git(["rev-parse", tracking]).toString().trim();
}

const command = process.argv[2];
if (command === "restore") {
  if (!parent) console.info("최초 수집: 저장된 원격 DB가 없습니다.");
  else {
    mkdirSync("data", { recursive: true });
    writeFileSync("data/military-jobs.sqlite", gunzipSync(git(["show", `${parent}:military-jobs.sqlite.gz`])));
    writeFileSync("data/crawl-report.json", git(["show", `${parent}:crawl-report.json`]));
    console.info("이전 수집 DB와 변경 이력을 복원했습니다.");
  }
} else if (command === "save") {
  if (!existsSync("data/crawl-report.json")) throw new Error("수집 보고서가 없어 원격 상태를 덮어쓰지 않습니다.");
  const database = gzipSync(readFileSync("data/military-jobs.sqlite"));
  const dbBlob = git(["hash-object", "-w", "--stdin"], database).toString().trim();
  const reportBlob = git(["hash-object", "-w", "data/crawl-report.json"]).toString().trim();
  const tree = git(["mktree"], `100644 blob ${reportBlob}\tcrawl-report.json\n100644 blob ${dbBlob}\tmilitary-jobs.sqlite.gz\n`).toString().trim();
  const commit = git(["commit-tree", tree, ...(parent ? ["-p", parent] : []), "-m", "chore: 병역일터 수집 상태 업데이트"]).toString().trim();
  git(["push", "origin", `${commit}:${ref}`]);
  console.info("수집 상태 전용 브랜치에 DB를 보존했습니다.");
} else throw new Error("사용법: pnpm exec tsx scripts/state.ts restore|save");
