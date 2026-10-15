import type { JobSource } from "../src/core/types";

export function job(overrides: Partial<JobSource> = {}): JobSource {
  return {
    id: "1234", companyCode: "5678", companyName: "테스트 회사", title: "현역 산업기능요원 백엔드 개발자",
    industry: "정보처리", location: "서울특별시 성동구", duties: "Go API 개발", experience: "신입", education: "고등학교졸업 이상",
    salary: "면접 후 결정", applicationPeriod: "2099-12-31", deadline: "2099-12-31", publishedAt: "2026-10-15",
    serviceType: "현역", employmentType: "산업기능요원", activeAssigned: 1, activeEnrolled: 0,
    supplementaryAssigned: 0, supplementaryEnrolled: 0, transferAllowed: "no",
    url: "https://work.mma.go.kr/caisBYIS/search/cygonggogeomsaekView.do?cygonggo_no=1234&byjjeopche_cd=5678",
    rawText: "현역 산업기능요원", remarks: "", employeeCount: null, closed: false, collectedAt: "2026-10-15T01:00:00.000Z", ...overrides,
  };
}
