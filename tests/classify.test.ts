import assert from "node:assert/strict";
import { test } from "node:test";
import { classifyJob, classifyMilitary, jobGroup } from "../src/core/classify";
import { job } from "./fixtures";

test("명시적 현역 신규편입 + 유효 공고", () => {
  const verdict = classifyMilitary(job({ remarks: "현역 신규편입 가능" }));
  assert.equal(verdict.status, "CONFIRMED_NEW_ENTRY");
  assert.equal(verdict.toAvailable, "yes");
  assert.equal(verdict.newEntryAllowed, "yes");
  assert.equal(verdict.userEligibility, "unknown");
  assert.match(verdict.eligibilityNote, /회사\/병무청 확인 필요/);
});

test("잔여 TO만 있으면 문의 필요, 사용자 사용 가능 확정 금지", () => {
  const verdict = classifyMilitary(job());
  assert.equal(verdict.status, "LIKELY_NEW_ENTRY");
  assert.equal(verdict.newEntryAllowed, "unknown");
  assert.match(verdict.reason, /회사 문의 필요/);
});

test("현역 전직, 보충역, 전문연구요원은 각각 제외", () => {
  assert.equal(classifyMilitary(job({ title: "현역 전직 백엔드" })).status, "TRANSFER_ONLY");
  assert.equal(classifyMilitary(job({ title: "보충역 개발자", serviceType: "보충역" })).status, "SUPPLEMENTARY_ONLY");
  assert.equal(classifyMilitary(job({ title: "전문연구요원 개발자", employmentType: "전문연구요원" })).status, "RESEARCH_ONLY");
});

test("전직 채용가능=예는 전직 전용을 뜻하지 않음", () => {
  assert.equal(classifyMilitary(job({ transferAllowed: "yes" })).status, "LIKELY_NEW_ENTRY");
  assert.equal(classifyMilitary(job({ title: "현역 전직 및 신규편입 백엔드" })).status, "CONFIRMED_NEW_ENTRY");
});

test("보충역 신규편입과 현역 전직을 혼동하지 않음", () => {
  assert.equal(classifyMilitary(job({ title: "현역 전직 / 보충역 신규편입 백엔드", serviceType: "현역, 보충역" })).status, "TRANSFER_ONLY");
});

test("신규편입 부정·질문을 긍정 판정하지 않음", () => {
  assert.equal(classifyMilitary(job({ remarks: "현역 신규편입 불가" })).status, "TRANSFER_ONLY");
  assert.notEqual(classifyMilitary(job({ remarks: "현역 신규편입 가능 여부 문의" })).status, "CONFIRMED_NEW_ENTRY");
  assert.notEqual(classifyMilitary(job({ remarks: "현역 신규편입이 가능한지 확인 필요" })).status, "CONFIRMED_NEW_ENTRY");
  assert.notEqual(classifyMilitary(job({ remarks: "현역 신규 입사 및 신규 지원 환영" })).status, "CONFIRMED_NEW_ENTRY");
  assert.equal(classifyMilitary(job({ employmentType: "전문연구요원", remarks: "현역 신규편입 가능" })).status, "RESEARCH_ONLY");
});

test("신규편입 언급 뒤 장문 부정이 이어지는 실제 경계 사례", () => {
  const transfer = job({ title: "산업기능요원 채용(현역 전직)", remarks: "현역 전직 (현 업체 복무 6개월 이상)\n현역 신규 편입은 현재 배정인원이 없어 채용하지 않습니다." });
  assert.equal(classifyMilitary(transfer).status, "TRANSFER_ONLY");
  assert.ok(classifyJob(transfer).excluded);
  assert.notEqual(classifyMilitary(job({ remarks: "현역 신규편입은 현재는 모집하지 않습니다." })).status, "CONFIRMED_NEW_ENTRY");
  assert.notEqual(classifyMilitary(job({ remarks: "현역 신규편입 없음" })).status, "CONFIRMED_NEW_ENTRY");
  assert.equal(classifyMilitary(job({ remarks: "현역 신규편입 가능하며 학력 제한 없음" })).status, "CONFIRMED_NEW_ENTRY");
});

test("향후 배정은 현재 편입 가능으로 판정하지 않음", () => {
  for (const remarks of ["다음년도 현역 TO 신청 예정", "현역 TO 배정 후 신규편입 가능", "현역 TO 결과 대기 중", "현역 2099년 편입 예정"]) {
    assert.equal(classifyMilitary(job({ remarks })).status, "CONDITIONAL_FUTURE", remarks);
  }
});

test("TO 소진·부재와 정보 부족은 구분", () => {
  assert.equal(classifyMilitary(job({ activeAssigned: 0, activeEnrolled: 0 })).status, "NO_ACTIVE_TO");
  assert.equal(classifyMilitary(job({ activeAssigned: 1, activeEnrolled: 1 })).status, "NO_ACTIVE_TO");
  assert.equal(classifyMilitary(job({ activeAssigned: null })).status, "UNKNOWN");
  const conflict = classifyJob(job({ remarks: "현역 신규편입 가능", activeAssigned: 0 }));
  assert.ok(conflict.flags.includes("TO_CONFLICT"));
  assert.equal(conflict.military.toAvailable, "no");
});

test("마감·유효성 미확인은 확정에서 제외, 마감 당일 KST는 유효", () => {
  assert.equal(classifyMilitary(job({ closed: true, remarks: "현역 신규편입 가능" })).status, "UNKNOWN");
  assert.equal(classifyMilitary(job({ deadline: null, applicationPeriod: "", remarks: "현역 신규편입 가능" })).status, "UNKNOWN");
  assert.equal(classifyMilitary(job({ deadline: "2026-10-15" }), new Date("2026-10-15T14:59:59Z")).status, "LIKELY_NEW_ENTRY");
  assert.equal(classifyMilitary(job({ deadline: "2026-10-15" }), new Date("2026-10-15T15:00:00Z")).status, "UNKNOWN");
});

test("경력 3년 이상·주니어 제외, 신입·경력/경력무관 허용", () => {
  for (const experience of ["경력 3년 이상", "경력 (1년이상)", "경력 2~5년", "주니어", "시니어", "Tech Lead", "경력", "경력직만"]) {
    assert.ok(classifyJob(job({ experience })).excluded, experience);
  }
  for (const experience of ["신입·경력", "신입/경력", "경력무관", "신입"]) assert.equal(classifyJob(job({ experience })).excluded, false, experience);
});

test("비개발직 강제 제외, SI는 검토 플래그", () => {
  for (const duties of ["PLC 개발", "NOC 서버 운영", "헬프데스크 서버 관리", "생산직", "고객사 상주 API 개발", "기술지원 서버 관리"]) assert.ok(classifyJob(job({ duties })).excluded, duties);
  const si = classifyJob(job({ remarks: "SI 및 자체 제품 SaaS 개발" }));
  assert.ok(si.flags.includes("SI_RISK"));
  assert.equal(si.excluded, false);
});

test("영문 기술 키워드는 단어 경계를 사용하고 DevOps는 코드 작성 근거 필요", () => {
  const vague = job({ title: "현역 산업기능요원 SRE", duties: "AWS 인프라 운영" });
  assert.equal(jobGroup(classifyJob(vague)), "review");
  assert.equal(classifyJob({ ...vague, duties: "Terraform 인프라 자동화 개발" }).excluded, false);
  assert.equal(classifyJob(job({ title: "디자이너", duties: "ongoing design", remarks: "" })).roles.length, 0);
  assert.ok(classifyJob(job({ duties: "자체 플랫폼 API 개발", employeeCount: 60 })).score > classifyJob(job()).score);
  assert.ok(classifyJob(job({ employeeCount: 20 })).excluded);
  assert.equal(classifyJob(job({ employeeCount: 35, remarks: "자체 제품 SaaS 개발" })).excluded, false);
});

test("필수 조건 언급이 없으면 제외·지원 대상과 분리해 검토 대기로 보관", () => {
  const cases = [
    { source: job({ experience: "" }), reason: /신입·경력무관/ },
    { source: job({ title: "채용", duties: "", remarks: "", employmentType: "" }), reason: /개발직/ },
    { source: job({ title: "백엔드 개발자", serviceType: "", employmentType: "" }), reason: /현역 산업기능요원/ },
    { source: job({ activeAssigned: null, activeEnrolled: null }), reason: /TO 정보 부족/ },
    { source: job({ deadline: null, applicationPeriod: "" }), reason: /접수기간/ },
    { source: job({ location: "" }), reason: /근무지 미확인/ },
    { source: job({ location: "협의 후 결정" }), reason: /근무지 미확인/ },
    { source: job({ title: "현역 산업기능요원 SRE", duties: "AWS 인프라 운영" }), reason: /코드 작성 근거 부족/ },
  ];
  for (const { source, reason } of cases) {
    const result = classifyJob(source);
    assert.equal(result.excluded, false);
    assert.deepEqual(result.exclusionReasons, []);
    assert.equal(jobGroup(result), "review");
    assert.ok(result.reviewReasons.some(value => reason.test(value)), String(reason));
    assert.equal(result.military.userEligibility, "unknown");
  }
});

test("명확한 제외 사유는 미확인 정보보다 우선하며 세 목록은 겹치지 않음", () => {
  for (const source of [
    job({ title: "현역 전직 백엔드", experience: "" }),
    job({ title: "보충역 채용", serviceType: "보충역", duties: "" }),
    job({ employmentType: "전문연구요원", experience: "" }),
    job({ experience: "경력 3년 이상", location: "" }),
    job({ duties: "PLC 개발", experience: "" }),
    job({ location: "부산광역시", experience: "" }),
    job({ activeAssigned: 0, experience: "" }),
    job({ closed: true, experience: "" }),
    job({ employeeCount: 20, experience: "" }),
  ]) {
    const result = classifyJob(source);
    assert.equal(jobGroup(result), "excluded");
    assert.ok(result.exclusionReasons.length);
  }
  const eligible = classifyJob(job());
  assert.equal(jobGroup(eligible), "jobs");
  assert.deepEqual(eligible.reviewReasons, []);
  assert.equal(eligible.military.status, "LIKELY_NEW_ENTRY");
  assert.equal(eligible.military.newEntryAllowed, "unknown");
});
