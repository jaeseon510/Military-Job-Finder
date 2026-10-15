export const militaryStatuses = ["CONFIRMED_NEW_ENTRY", "LIKELY_NEW_ENTRY", "CONDITIONAL_FUTURE", "TRANSFER_ONLY", "SUPPLEMENTARY_ONLY", "RESEARCH_ONLY", "NO_ACTIVE_TO", "UNKNOWN"] as const;
export type MilitaryStatus = (typeof militaryStatuses)[number];
export type Answer = "yes" | "no" | "unknown";
export type Role = "백엔드" | "플랫폼" | "DevOps" | "풀스택";
export type Change = "NEW" | "CLOSED" | "REOPENED" | "TO_CHANGED" | "ENROLLED_CHANGED" | "MILITARY_CHANGED" | "SALARY_CHANGED" | "DEADLINE_CHANGED" | "CONTENT_CHANGED";

export interface JobSource {
  id: string;
  companyCode: string;
  companyName: string;
  title: string;
  industry: string;
  location: string;
  duties: string;
  experience: string;
  education: string;
  salary: string;
  applicationPeriod: string;
  deadline: string | null;
  publishedAt: string | null;
  serviceType: string;
  employmentType: string;
  activeAssigned: number | null;
  activeEnrolled: number | null;
  supplementaryAssigned: number | null;
  supplementaryEnrolled: number | null;
  transferAllowed: Answer;
  url: string;
  rawText: string;
  remarks: string;
  employeeCount: number | null;
  closed: boolean;
  collectedAt: string;
}

export interface MilitaryVerdict {
  status: MilitaryStatus;
  reason: string;
  toAvailable: Answer;
  newEntryAllowed: Answer;
  userEligibility: "unknown";
  eligibilityNote: string;
}

export interface Classification {
  military: MilitaryVerdict;
  roles: Role[];
  keywords: string[];
  flags: string[];
  excluded: boolean;
  exclusionReasons: string[];
  reviewReasons: string[];
  score: number;
}

export interface JobView extends JobSource, Classification {
  firstSeenAt: string;
  lastSeenAt: string;
  changes: { at: string; types: Change[] }[];
  historical?: {
    basis: "snapshot" | "reference" | "unverified";
    assessedAt: string | null;
    year: string | null;
    note: string;
  };
}

export interface CrawlReport {
  startedAt: string;
  completedAt: string;
  discovered: number;
  updated: number;
  errors: { id: string; message: string }[];
  complete: boolean;
}

export interface Dataset {
  generatedAt: string;
  report: CrawlReport | null;
  jobs: JobView[];
  history?: JobView[];
}
