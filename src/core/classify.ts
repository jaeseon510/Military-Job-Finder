import { rules } from "../../config/rules";
import { koreaToday } from "./date";
import type { Classification, JobSource, MilitaryStatus, MilitaryVerdict, Role } from "./types";

const regex = (pattern: string) => new RegExp(pattern, "i");
const escape = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
export function contains(text: string, keyword: string): boolean {
  const pattern = escape(keyword);
  return new RegExp(/^[\x00-\x7f]+$/.test(keyword) ? `(?<![a-z0-9])${pattern}(?![a-z0-9])` : pattern, "i").test(text);
}
const hits = (text: string, words: readonly string[]) => words.filter(word => contains(text, word));

export function classifyMilitary(job: JobSource, now = new Date()): MilitaryVerdict {
  const m = rules.military;
  const text = [job.title, job.duties, job.remarks].join("\n");
  const active = contains(job.serviceType, m.active) || /현역/.test(text);
  const activeOnly = contains(job.serviceType, m.active) && !contains(job.serviceType, m.supplementary);
  const industrial = contains(job.employmentType, m.industrial) || contains(job.title, m.industrial);
  const research = contains(job.employmentType, m.research) || contains(job.title, m.research);
  const supplementaryOnly = contains(job.serviceType, m.supplementary) && !contains(job.serviceType, m.active) && !/현역/.test(text);
  const clauses = text.split(/[\n;。!?]|\.(?:\s|$)/).filter(Boolean);
  const activeNew = clauses.some(clause => {
    if (regex(m.newEntryDenied).test(clause) || /신규\s*편입\s*가능\s*여부/.test(clause)) return false;
    if (!regex(m.newEntry).test(clause)) return false;
    if (/보충역\s*신규/.test(clause) && !/현역[^\n/|,]{0,40}신규/.test(clause)) return false;
    return /현역[^\n/|,]{0,60}(?:신규\s*편입|신규\s*입사|신규\s*지원)/.test(clause)
      || /(?:신규\s*편입|신규\s*입사|신규\s*지원)[^\n/|,]{0,30}현역/.test(clause)
      || (activeOnly && !/보충역|전문연구요원/.test(clause));
  });
  const denied = clauses.some(clause => regex(m.newEntryDenied).test(clause) && (/현역/.test(clause) || (activeOnly && !/보충역/.test(clause))));
  const transfer = regex(m.transfer).test(text) && !activeNew;
  const year = Number(koreaToday(now).slice(0, 4));
  const futureYear = [...text.matchAll(/(?:20)?(\d{2})\s*년[^\n]{0,25}(?:편입|배정|TO)/gi)].some(match => 2000 + Number(match[1]) > year);
  const future = active && ((regex(m.future).test(text) && regex(m.futureIntent).test(text)) || futureYear);
  const { activeAssigned: assigned, activeEnrolled: enrolled } = job;
  const available = assigned !== null && enrolled !== null ? assigned > enrolled : null;
  const quota = `현역 TO ${assigned ?? "미확인"}명 / 편입 ${enrolled ?? "미확인"}명`;
  const valid = !job.closed && (job.deadline !== null ? job.deadline >= koreaToday(now) : /채용\s*시|상시/.test(job.applicationPeriod));
  const result = (status: MilitaryStatus, reason: string, allowed: MilitaryVerdict["newEntryAllowed"]): MilitaryVerdict => ({
    status, reason,
    toAvailable: available === null ? "unknown" : available ? "yes" : "no",
    newEntryAllowed: allowed,
    userEligibility: "unknown",
    eligibilityNote: "대학 학력이 있는 지원자의 TO 사용 가능 여부·우선배정 자격은 회사/병무청 확인 필요",
  });
  if (research && !industrial) return result("RESEARCH_ONLY", "전문연구요원 전용 공고", "no");
  if (supplementaryOnly) return result("SUPPLEMENTARY_ONLY", "보충역 전용 공고", "no");
  if (transfer || denied) return result("TRANSFER_ONLY", "현역 전직 전용 또는 현역 신규편입 불가 명시", "no");
  if (!valid) return result("UNKNOWN", job.closed || (job.deadline && job.deadline < koreaToday(now)) ? "접수 마감 · 현재 신규편입 가능 공고가 아님" : "현재 유효한 접수기간 확인 필요", "unknown");
  if (!industrial || !active) return result("UNKNOWN", "현역 산업기능요원 모집 근거 부족", "unknown");
  if (future) return result("CONDITIONAL_FUTURE", "향후 현역 TO 신청·배정 또는 편입 예정 · 현재 편입 가능으로 표시하지 않음", "unknown");
  if (activeNew) return result("CONFIRMED_NEW_ENTRY", `현역 신규편입 명시 / ${quota}${available === false ? " · 수치 불일치로 실제 TO 확인 필요" : ""}`, "yes");
  if (available === true) return result("LIKELY_NEW_ENTRY", `${quota}이나 신규편입 문구 미확인 · 회사 문의 필요`, "unknown");
  if (available === false) return result("NO_ACTIVE_TO", `${quota} · 현재 TO 없음`, "unknown");
  return result("UNKNOWN", "현역 신규편입 여부 또는 현역 TO 정보 부족 · 회사 문의 필요", "unknown");
}

export function classifyJob(job: JobSource, now = new Date()): Classification {
  const military = classifyMilitary(job, now);
  const roleText = [job.title, job.duties, job.remarks].join("\n");
  const dutyText = [job.title, job.duties].join(" ");
  const roles = (Object.keys(rules.roles) as Role[]).filter(role => hits(roleText, rules.roles[role]).length > 0);
  const keywords = [...new Set(roles.flatMap(role => hits(roleText, rules.roles[role])))];
  const exclusionReasons: string[] = [];
  const flags: string[] = [];
  if (!["CONFIRMED_NEW_ENTRY", "LIKELY_NEW_ENTRY", "CONDITIONAL_FUTURE"].includes(military.status)) exclusionReasons.push(military.reason);
  if (!roles.length) exclusionReasons.push("희망 개발직 근거 부족");
  const deniedDuties = hits(dutyText, rules.excludedDuties);
  if (deniedDuties.length) exclusionReasons.push(`제외 직무: ${deniedDuties.join(", ")}`);
  const experienceText = [job.experience, job.title, job.remarks].join(" ");
  const acceptsEntry = /신입|경력\s*무관/.test(experienceText);
  const deniedExperience = hits(experienceText, rules.experienceDenied);
  const years = experienceText.match(/(?:경력\s*[:：()]*\s*)?\d+\s*년\s*(?:이상|↑|\+)|경력\s*\d+\s*[~～-]\s*\d+\s*년/);
  if (!acceptsEntry) exclusionReasons.push(years || deniedExperience.length ? `경력 전용: ${years?.[0] || deniedExperience.join(", ")}` : "신입·경력무관 명시 미확인");
  if (!rules.regions.some(region => job.location.startsWith(region))) exclusionReasons.push("희망 지역 외 또는 근무지 미확인");
  if (roles.includes("DevOps") && !hits(roleText, rules.codingEvidence).length) exclusionReasons.push("DevOps/SRE의 실제 코드 작성 근거 부족");
  if (hits(roleText, rules.siKeywords).length) flags.push("SI_RISK");
  if (hits(dutyText, rules.cautionKeywords).length) flags.push("DUTY_REVIEW");
  const product = hits(roleText, rules.productEvidence).length > 0;
  if (product) flags.push("PRODUCT_EVIDENCE");
  else flags.push("PRODUCT_UNKNOWN");
  if (job.employeeCount === null) flags.push("COMPANY_SIZE_UNKNOWN");
  else if (job.employeeCount < rules.minimumProductEmployeeCount || (job.employeeCount < rules.preferredEmployeeCount && !product)) flags.push("COMPANY_SIZE_REVIEW");
  if (military.toAvailable === "no" && military.newEntryAllowed === "yes") flags.push("TO_CONFLICT");
  const closed = job.closed || (!!job.deadline && job.deadline < koreaToday(now));
  if (closed && !exclusionReasons.some(reason => reason.includes("마감"))) exclusionReasons.push("접수 마감");
  return {
    military, roles, keywords, flags,
    excluded: exclusionReasons.length > 0, exclusionReasons,
    score: (product ? 30 : 0) + (job.employeeCount !== null && job.employeeCount >= rules.preferredEmployeeCount ? 20 : 0) + (roles.includes("백엔드") ? 15 : 0) + (military.status === "CONFIRMED_NEW_ENTRY" ? 20 : 0) - (flags.includes("SI_RISK") ? 20 : 0),
  };
}
