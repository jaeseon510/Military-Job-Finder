import { desc, eq } from "drizzle-orm";
import { classifyJob } from "../core/classify";
import { detectChanges, sourceHash } from "../core/changes";
import { historicalView, isClosed } from "../core/history";
import { koreaToday } from "../core/date";
import type { JobSource, JobView } from "../core/types";
import type { JobDatabase } from "./client";
import { companies, jobs, militaryInfo, snapshots } from "./schema";

export function saveJob(db: JobDatabase, source: JobSource) {
  const hash = sourceHash(source);
  const previous = db.select().from(jobs).where(eq(jobs.id, source.id)).get();
  const changes = detectChanges(previous?.source, source);
  const classification = classifyJob(source);
  db.transaction(tx => {
    const company = { code: source.companyCode, name: source.companyName, industry: source.industry, location: source.location, employeeCount: source.employeeCount, lastSeenAt: source.collectedAt };
    tx.insert(companies).values(company).onConflictDoUpdate({ target: companies.code, set: company }).run();
    tx.insert(jobs).values({ id: source.id, companyCode: source.companyCode, source, classification, hash, firstSeenAt: source.collectedAt, lastSeenAt: source.collectedAt })
      .onConflictDoUpdate({ target: jobs.id, set: { source, classification, hash, lastSeenAt: source.collectedAt } }).run();
    const info = { jobId: source.id, activeAssigned: source.activeAssigned, activeEnrolled: source.activeEnrolled, supplementaryAssigned: source.supplementaryAssigned, supplementaryEnrolled: source.supplementaryEnrolled, verdict: classification.military };
    tx.insert(militaryInfo).values(info).onConflictDoUpdate({ target: militaryInfo.jobId, set: info }).run();
    if (changes.length) tx.insert(snapshots).values({ jobId: source.id, hash, source, changes, createdAt: source.collectedAt }).run();
  });
  return changes;
}

export function reclassify(db: JobDatabase, now = new Date()) {
  const all = db.select().from(jobs).all();
  db.transaction(tx => {
    for (const job of all) {
      const classification = classifyJob(job.source, now);
      tx.update(jobs).set({ classification }).where(eq(jobs.id, job.id)).run();
      tx.update(militaryInfo).set({ verdict: classification.military }).where(eq(militaryInfo.jobId, job.id)).run();
    }
  });
  return all.length;
}

export function readJobs(db: JobDatabase): JobView[] {
  const history = db.select({ jobId: snapshots.jobId, at: snapshots.createdAt, types: snapshots.changes }).from(snapshots).orderBy(desc(snapshots.id)).all();
  const byJob = new Map<string, { at: string; types: typeof history[number]["types"] }[]>();
  for (const entry of history) {
    const entries = byJob.get(entry.jobId) || [];
    if (entries.length < 20) entries.push({ at: entry.at, types: entry.types });
    byJob.set(entry.jobId, entries);
  }
  return db.select().from(jobs).all().map(job => ({ ...job.source, ...job.classification, firstSeenAt: job.firstSeenAt, lastSeenAt: job.lastSeenAt, changes: byJob.get(job.id) || [] }));
}

export function readHistory(db: JobDatabase, now = new Date()): JobView[] {
  const closed = db.select().from(jobs).all().filter(job => isClosed(job.source, now));
  const closedIds = new Set(closed.map(job => job.id));
  const lastOpen = new Map<string, { source: JobSource; at: string; candidate: boolean }>();
  const changes = new Map<string, JobView["changes"]>();
  for (const snapshot of db.select().from(snapshots).orderBy(desc(snapshots.id)).all()) {
    if (closedIds.has(snapshot.jobId)) {
      const entries = changes.get(snapshot.jobId) || [];
      if (entries.length < 20) entries.push({ at: snapshot.createdAt, types: snapshot.changes });
      changes.set(snapshot.jobId, entries);
    }
    if (!closedIds.has(snapshot.jobId) || lastOpen.get(snapshot.jobId)?.candidate || isClosed(snapshot.source, new Date(snapshot.createdAt))) continue;
    const source = snapshot.source;
    if (!source.deadline && !/채용\s*시|상시/.test(source.applicationPeriod)) continue;
    const classification = classifyJob(source, new Date(snapshot.createdAt));
    const candidate = !classification.excluded && classification.reviewReasons.length === 0;
    if (!lastOpen.has(snapshot.jobId) || candidate) lastOpen.set(snapshot.jobId, { source, at: snapshot.createdAt, candidate });
  }
  return closed.map(job => {
    const recorded = lastOpen.get(job.id);
    const source = recorded?.source || job.source;
    const record = historicalView(source, {
      basis: recorded ? "snapshot" : "unverified", assessedAt: recorded?.at || null,
      year: source.publishedAt?.slice(0, 4) || (recorded ? koreaToday(new Date(recorded.at)).slice(0, 4) : null),
      note: recorded?.candidate ? "접수 중 원문에 현재 필터 기준을 적용해 후보였던 마지막 기록을 보관합니다. 현재 모집 조건·TO와 다를 수 있으며 개인 자격은 별도 확인 필요." : recorded ? "접수 중이던 마지막 원문과 제외·미확인 근거를 함께 보관합니다. 현재 모집 조건·TO는 별도 확인 필요." : "접수 중이던 시점의 기록이 없어 당시 지원 가능으로 확정하지 않습니다.",
    }, now);
    return { ...record, firstSeenAt: job.firstSeenAt, lastSeenAt: job.lastSeenAt, changes: changes.get(job.id) || [] };
  });
}
