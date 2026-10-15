import { mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { openDatabase } from "../src/db/client";
import { readJobs, reclassify } from "../src/db/repository";
import type { CrawlReport, Dataset } from "../src/core/types";

export function exportData() {
  const { db, sqlite } = openDatabase();
  try {
    reclassify(db);
    let report: CrawlReport | null = null;
    try { report = JSON.parse(readFileSync("data/crawl-report.json", "utf8")); } catch { /* 최초 실행은 수집 이력이 없습니다. */ }
    const dataset: Dataset = { generatedAt: new Date().toISOString(), report, jobs: readJobs(db) };
    mkdirSync("data", { recursive: true });
    writeFileSync("data/jobs.json.tmp", JSON.stringify(dataset));
    renameSync("data/jobs.json.tmp", "data/jobs.json");
    return dataset;
  } finally { sqlite.close(); }
}

const data = exportData();
console.info(`화면 데이터 생성: ${data.jobs.length}개 공고`);
