import assert from "node:assert/strict";
import { test } from "node:test";
import { classifyJob } from "../src/core/classify";
import { filterJobs, industryOptions, type JobFilters } from "../src/core/filter";
import type { JobView } from "../src/core/types";
import { job } from "./fixtures";

const view = (source = job()): JobView => ({ ...source, ...classifyJob(source), firstSeenAt: source.collectedAt, lastSeenAt: source.collectedAt, changes: [] });
const filters: JobFilters = { roles: [], regions: [], industry: "all", query: "", reason: "all" };

test("공고·검토·제외 목록에서 같은 업종 필터를 적용하고 미확인을 따로 표시", () => {
  const entries = [view(), view(job({ id: "2", experience: "" })), view(job({ id: "3", title: "보충역 산업기능요원 백엔드 개발자", serviceType: "보충역" })), view(job({ id: "4", industry: "기계", duties: "생산직" })), view(job({ id: "5", industry: "" }))];
  for (const group of ["jobs", "review", "excluded"] as const) {
    const result = filterJobs(entries, { ...filters, group, industry: "정보처리" });
    assert.equal(result.length, 1);
    assert.equal(result[0].industry, "정보처리");
  }
  assert.deepEqual(industryOptions(entries), ["기계", "업종 미확인", "정보처리"]);
  assert.deepEqual(filterJobs(entries, { ...filters, industry: "업종 미확인" }).map(entry => entry.id), ["5"]);
});

test("분야·직무·지역·검색·제외 사유는 AND로 조합하고 같은 직무 선택은 OR", () => {
  const supplementary = { title: "보충역 산업기능요원 백엔드 개발자", serviceType: "보충역" };
  const entries = [view(job({ id: "1", ...supplementary })), view(job({ id: "2", industry: "전자", ...supplementary })), view(job({ id: "3", location: "경기도 성남시", ...supplementary }))];
  assert.deepEqual(filterJobs(entries, { ...filters, group: "excluded", industry: "정보처리", roles: ["백엔드", "풀스택"], regions: ["서울"], query: "  API  ", reason: "보충역" }).map(entry => entry.id), ["1"]);
});
