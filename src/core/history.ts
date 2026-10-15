import { historicalReferences } from "../../config/history";
import { classifyJob } from "./classify";
import { koreaToday } from "./date";
import type { JobSource, JobView } from "./types";

export const isClosed = (source: JobSource, now: Date) => source.closed || (!!source.deadline && source.deadline < koreaToday(now));

export function historicalView(source: JobSource, metadata: NonNullable<JobView["historical"]>, now = new Date()): JobView {
  const classification = classifyJob(source, metadata.assessedAt ? new Date(metadata.assessedAt) : now);
  if (!metadata.assessedAt) {
    classification.exclusionReasons = classification.exclusionReasons.filter(reason => reason !== "접수 마감");
    classification.excluded = classification.exclusionReasons.length > 0;
    classification.reviewReasons.push("접수 중이던 시점의 원문·TO 기록 미확인");
    if (classification.military.status === "UNKNOWN") classification.military.reason = "과거 채용자료 · 당시 현역 신규편입 조건과 접수 상태 재확인 필요";
  }
  return { ...source, ...classification, closed: true, firstSeenAt: source.collectedAt, lastSeenAt: source.collectedAt, changes: [], historical: metadata };
}

export function referenceHistory(now = new Date()): JobView[] {
  return historicalReferences.map(reference => {
    const source: JobSource = {
      id: `reference:${reference.id}`, companyCode: `reference:${reference.id}`, companyName: reference.companyName,
      title: reference.title, industry: reference.industry, location: reference.location, duties: reference.duties,
      experience: reference.experience, education: "원문 확인 필요", salary: "", applicationPeriod: "마감된 과거 채용사례", deadline: null, publishedAt: null,
      serviceType: "현역", employmentType: "산업기능요원", activeAssigned: null, activeEnrolled: null, supplementaryAssigned: null, supplementaryEnrolled: null,
      transferAllowed: "unknown", url: reference.url, rawText: [reference.duties, reference.evidence, reference.note].join("\n"), remarks: reference.evidence,
      employeeCount: null, closed: true, collectedAt: reference.checkedAt,
    };
    return historicalView(source, { basis: "reference", assessedAt: null, year: reference.year, note: reference.note }, now);
  });
}

export function isHistoricalCandidate(job: JobView): boolean {
  return !job.excluded && job.roles.length > 0 && job.serviceType.includes("현역") && job.employmentType.includes("산업기능요원");
}
