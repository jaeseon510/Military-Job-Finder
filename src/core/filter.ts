import { jobGroup } from "./classify";
import type { JobView, MilitaryStatus, Role } from "./types";

export interface JobFilters {
  group?: "jobs" | "review" | "excluded";
  statuses?: MilitaryStatus[];
  roles: Role[];
  regions: string[];
  industry: string;
  query: string;
  reason: string;
  trackedCompanies?: string[];
}

export const industryLabel = (job: Pick<JobView, "industry">) => job.industry.trim() || "업종 미확인";
export const industryOptions = (jobs: JobView[]) => [...new Set(jobs.map(industryLabel))].sort((a, b) => a.localeCompare(b, "ko"));

export function filterJobs(jobs: JobView[], filters: JobFilters): JobView[] {
  return jobs.filter(job => {
    if (filters.group && jobGroup(job) !== filters.group) return false;
    if (filters.statuses && !filters.statuses.includes(job.military.status)) return false;
    if (filters.roles.length && !filters.roles.some(role => job.roles.includes(role))) return false;
    if (filters.regions.length && !filters.regions.some(region => job.location.startsWith(region))) return false;
    if (filters.industry !== "all" && industryLabel(job) !== filters.industry) return false;
    if (filters.trackedCompanies && !filters.trackedCompanies.includes(job.companyCode)) return false;
    if (filters.reason !== "all" && !(filters.group === "review" ? job.reviewReasons : job.exclusionReasons).some(reason => reason.includes(filters.reason))) return false;
    return !filters.query.trim() || [job.companyName, job.title, job.industry, job.duties, job.remarks, ...job.keywords].join(" ").toLowerCase().includes(filters.query.trim().toLowerCase());
  });
}
