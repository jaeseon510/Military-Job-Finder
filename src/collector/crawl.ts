import { eq } from "drizzle-orm";
import { collectorConfig as config } from "../../config/collector";
import type { CrawlReport, JobSource } from "../core/types";
import { openDatabase } from "../db/client";
import { saveJob } from "../db/repository";
import { jobs } from "../db/schema";
import { PublicClient } from "./http";
import { parseDetail, parseList, type Listing } from "./parser";
import { koreaToday } from "../core/date";

export async function crawl(options: { force?: boolean; maxJobs?: number } = {}): Promise<CrawlReport> {
  const startedAt = new Date().toISOString();
  const report: CrawlReport = { startedAt, completedAt: "", discovered: 0, updated: 0, errors: [], complete: true };
  const { db, sqlite } = openDatabase();
  const http = new PublicClient(undefined, options.force);
  const listings = new Map<string, Listing>();
  let expected = 0;
  let pages = 1;
  try {
    for (let page = 1; page <= pages; page++) {
      try {
        const url = new URL(config.listPath, config.origin);
        url.search = new URLSearchParams({ ...config.searchParams, pageIndex: String(page), pageUnit: String(config.pageSize) }).toString();
        const parsed = parseList(await http.get(url.href));
        if (page === 1) {
          expected = parsed.total;
          pages = Math.min(config.maxPages, Math.ceil(parsed.total / config.pageSize));
        }
        for (const listing of parsed.listings) listings.set(listing.id, listing);
      } catch (error) {
        report.errors.push({ id: `list:${page}`, message: error instanceof Error ? error.message : String(error) });
        report.complete = false;
      }
    }
    if (listings.size < expected) {
      report.complete = false;
      report.errors.push({ id: "list:coverage", message: `전체 ${expected}건 중 ${listings.size}건 발견 · 상한·페이지 이동 중 목록 변경 확인` });
    }
    report.discovered = listings.size;
    let processed = 0;
    for (const listing of listings.values()) {
      if (options.maxJobs !== undefined && processed >= options.maxJobs) { report.complete = false; break; }
      processed++;
      try {
        const now = new Date().toISOString();
        const detail = parseDetail(await http.get(listing.url), listing, now);
        if (detail === "closed") {
          const previous = db.select().from(jobs).where(eq(jobs.id, listing.id)).get();
          if (previous) saveJob(db, { ...previous.source, closed: true, collectedAt: now });
          else throw new Error("최초 수집 전 마감됨 · 원문 상세 데이터 없음");
        } else saveJob(db, detail);
        report.updated++;
      } catch (error) {
        report.errors.push({ id: listing.id, message: error instanceof Error ? error.message : String(error) });
        report.complete = false;
      }
      if (processed % 25 === 0) console.info(`수집 ${processed}/${listings.size} · 오류 ${report.errors.length}`);
    }
    // 검색 누락만으로 마감 처리하지 않고, 저장된 공고의 상세 페이지·마감일을 확인합니다.
    for (const previous of db.select().from(jobs).all()) {
      if (listings.has(previous.id) || previous.source.closed) continue;
      const now = new Date().toISOString();
      try {
        let source: JobSource | "closed";
        if (previous.source.deadline && previous.source.deadline < koreaToday()) source = "closed";
        else source = parseDetail(await http.get(previous.source.url), previous.source, now);
        saveJob(db, source === "closed" ? { ...previous.source, closed: true, collectedAt: now } : source);
      } catch (error) {
        report.errors.push({ id: previous.id, message: error instanceof Error ? error.message : String(error) });
        report.complete = false;
      }
    }
  } finally {
    sqlite.pragma("wal_checkpoint(TRUNCATE)");
    sqlite.close();
    report.completedAt = new Date().toISOString();
  }
  return report;
}
