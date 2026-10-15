import { load } from "cheerio";
import { collectorConfig } from "../../config/collector";
import type { JobSource } from "../core/types";
import { selectors as s } from "./selectors";
import { koreaToday } from "../core/date";

export const normalize = (text: string) => text.normalize("NFKC").replace(/\s+/g, " ").trim();
const label = (text: string) => normalize(text).replace(/\s/g, "");
const count = (text: string): number | null => /^\d[\d,]*\s*명?$/.test(text) ? Number(text.replace(/[^\d]/g, "")) : null;

export function parseDate(text: string): string | null {
  const matches = [...text.matchAll(/(20\d{2})[-./](\d{1,2})[-./](\d{1,2})/g)];
  const match = matches.at(-1);
  if (!match) return null;
  const value = `${match[1]}-${match[2].padStart(2, "0")}-${match[3].padStart(2, "0")}`;
  return Number.isNaN(Date.parse(value)) ? null : value;
}

export interface Listing { id: string; companyCode: string; companyName: string; title: string; url: string; deadline: string | null; publishedAt: string | null }

export function parseList(html: string): { listings: Listing[]; total: number } {
  const $ = load(html);
  if (!$(s.total).length || !$(s.listRows).length) throw new Error("검색 목록 구조를 확인할 수 없습니다. selectors.ts 확인 필요");
  const totalText = normalize($(s.total).text());
  const totalMatch = totalText.match(/총\s*게시물\s*:\s*([\d,]+)건/);
  if (!totalMatch) throw new Error("검색 결과 건수 구조 변경 감지");
  const listings: Listing[] = [];
  $(s.listRows).each((_, row) => {
    const link = $(row).find(s.detailLink);
    if (!link.length) return;
    const url = new URL(link.attr("href")!, collectorConfig.origin);
    const id = url.searchParams.get("cygonggo_no");
    const companyCode = url.searchParams.get("byjjeopche_cd");
    if (!id || !companyCode || !/^\d+$/.test(id) || !/^\d+$/.test(companyCode)) throw new Error("공고번호/업체코드 누락 또는 형식 변경");
    const canonical = new URL(collectorConfig.detailPath, collectorConfig.origin);
    canonical.search = new URLSearchParams({ cygonggo_no: id, byjjeopche_cd: companyCode }).toString();
    const cells = $(row).find(s.listCells);
    listings.push({ id, companyCode, title: normalize(link.text()), companyName: normalize(cells.eq(1).text()), deadline: parseDate(cells.eq(2).text()), publishedAt: parseDate(cells.eq(3).text()), url: canonical.href });
  });
  const total = Number(totalMatch[1].replaceAll(",", ""));
  if (total > 0 && listings.length === 0) throw new Error("채용공고 링크 구조 변경 감지");
  return { listings, total };
}

export function parseDetail(html: string, listing: Listing, collectedAt = new Date().toISOString()): JobSource | "closed" {
  const $ = load(html);
  const content = $(s.content);
  if (!content.length) throw new Error("상세 본문이 없습니다 (오류/로그인/구조 변경)");
  if (normalize(content.text()).includes(s.closedText)) return "closed";
  const values: Record<string, string> = {};
  const raw: string[] = [];
  let remarks = "";
  content.find(s.tables).each((_, table) => {
    const caption = label($(table).find(s.caption).text());
    // 담당자 개인정보와 로그인 안내는 판정/공개 데이터에 포함하지 않습니다.
    if (["담당자정보", "접수방법"].includes(caption)) {
      $(table).find(s.label).each((_, th) => { values[label($(th).text())] = normalize($(th).next(s.value).text()); });
      return;
    }
    $(table).find(s.label).each((_, th) => {
      const key = label($(th).text());
      const value = normalize($(th).next(s.value).text());
      values[key] = value;
      raw.push(`${key}: ${value}`);
    });
    if (caption === s.remarksCaption) {
      $(table).find("br").replaceWith("\n");
      remarks = $(table).find(s.value).text().split(/\n/).map(normalize).filter(Boolean).join("\n");
      raw.push(`비고: ${remarks}`);
    }
  });
  const get = (key: keyof typeof s.fields) => values[label(s.fields[key])] || "";
  if (!get("companyName") || !get("title") || !get("employmentType") || !get("serviceType") || !get("experience")) throw new Error("필수 상세 항목 누락: 선택자/필드명 확인 필요");
  const deadline = parseDate(get("applicationPeriod"));
  const employees = remarks.match(/(?:직원|임직원|재직자|사원)\s*(?:수|규모)?\s*[:：]?\s*(\d+)\s*명/);
  return {
    ...listing, title: get("title"), companyName: get("companyName"),
    industry: get("industry"), location: get("location"), duties: get("duties"), experience: get("experience"),
    education: get("education"), salary: get("salary"), applicationPeriod: get("applicationPeriod"),
    deadline, publishedAt: parseDate(get("publishedAt")) || listing.publishedAt,
    serviceType: get("serviceType"), employmentType: get("employmentType"),
    activeAssigned: count(get("activeAssigned")), activeEnrolled: count(get("activeEnrolled")),
    supplementaryAssigned: count(get("supplementaryAssigned")), supplementaryEnrolled: count(get("supplementaryEnrolled")),
    transferAllowed: get("transferAllowed") === "예" ? "yes" : get("transferAllowed") === "아니오" ? "no" : "unknown",
    remarks, rawText: raw.join("\n"), employeeCount: employees ? Number(employees[1]) : null,
    closed: deadline !== null && deadline < koreaToday(new Date(collectedAt)), collectedAt,
  };
}
