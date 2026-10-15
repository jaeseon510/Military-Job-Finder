import { createHash } from "node:crypto";
import type { Change, JobSource } from "./types";

function canonical(value: unknown): unknown {
  if (typeof value === "string") return value.normalize("NFKC").replace(/\s+/g, " ").trim();
  if (Array.isArray(value)) return value.map(canonical);
  if (value !== null && typeof value === "object") return Object.fromEntries(Object.entries(value).filter(([key]) => key !== "collectedAt").sort(([a], [b]) => a.localeCompare(b)).map(([key, entry]) => [key, canonical(entry)]));
  return value;
}

export function sourceHash(source: JobSource): string {
  return createHash("sha256").update(JSON.stringify(canonical(source))).digest("hex");
}

export function detectChanges(previous: JobSource | undefined, next: JobSource): Change[] {
  if (!previous) return ["NEW"];
  if (sourceHash(previous) === sourceHash(next)) return [];
  const changes: Change[] = [];
  if (!previous.closed && next.closed) changes.push("CLOSED");
  if (previous.closed && !next.closed) changes.push("REOPENED");
  if (previous.activeAssigned !== next.activeAssigned || previous.supplementaryAssigned !== next.supplementaryAssigned) changes.push("TO_CHANGED");
  if (previous.activeEnrolled !== next.activeEnrolled || previous.supplementaryEnrolled !== next.supplementaryEnrolled) changes.push("ENROLLED_CHANGED");
  if (["serviceType", "employmentType", "transferAllowed", "education", "title", "remarks", "duties"].some(key => previous[key as keyof JobSource] !== next[key as keyof JobSource])) changes.push("MILITARY_CHANGED");
  if (previous.salary !== next.salary) changes.push("SALARY_CHANGED");
  if (previous.deadline !== next.deadline || previous.applicationPeriod !== next.applicationPeriod) changes.push("DEADLINE_CHANGED");
  return changes.length ? changes : ["CONTENT_CHANGED"];
}
