import { desc, eq } from "drizzle-orm";
import { classifyJob } from "../core/classify";
import { detectChanges, sourceHash } from "../core/changes";
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
