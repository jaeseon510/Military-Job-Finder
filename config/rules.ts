import type { MilitaryStatus } from "../src/core/types";

// 기준 변경은 이 파일에서 시작하고 pnpm classify로 기존 공고에 다시 적용합니다.
export const rules = {
  version: 2,
  regions: ["서울", "경기", "인천"],
  otherRegions: ["강원", "충북", "충청북", "충남", "충청남", "전북", "전라북", "전남", "전라남", "경북", "경상북", "경남", "경상남", "부산", "대구", "광주", "대전", "울산", "세종", "제주"],
  defaultStatuses: ["CONFIRMED_NEW_ENTRY", "LIKELY_NEW_ENTRY", "CONDITIONAL_FUTURE"] as MilitaryStatus[],
  roles: {
    백엔드: ["백엔드", "backend", "back-end", "API", "Go", "Golang", "TypeScript", "Node", "Node.js", "NestJS", "Java", "Spring", "Spring Boot", "PostgreSQL", "MySQL", "Redis", "Kafka"],
    플랫폼: ["서버", "server", "플랫폼", "platform"],
    DevOps: ["DevOps", "SRE", "Docker", "Kubernetes", "AWS", "GCP", "Terraform", "ArgoCD"],
    풀스택: ["풀스택", "풀 스택", "fullstack", "full-stack", "full stack"],
  },
  excludedDuties: ["PLC", "생산직", "생산관리", "생산설비", "설비관리", "설비보전", "반도체 생산", "NOC", "헬프데스크", "현장지원", "기술지원", "고객사 상주", "파견"],
  cautionKeywords: ["생산", "설비"],
  codingEvidence: ["개발", "코드", "코딩", "프로그래밍", "소프트웨어", "자동화", "IaC", "Terraform", "Golang", "TypeScript", "Python", "Java", "Go"],
  productEvidence: ["자체 제품", "자체 서비스", "자사 서비스", "자사 제품", "SaaS", "자체 플랫폼", "자사 플랫폼"],
  siKeywords: ["SI", "시스템 통합", "시스템통합", "외주", "수탁"],
  experienceDenied: ["주니어", "시니어", "junior", "senior", "lead", "tech lead"],
  experienceAllowed: "신입|경력\\s*무관",
  experienceYears: "(?:경력\\s*[:：()]*\\s*)?\\d+\\s*년\\s*(?:이상|↑|\\+)|경력\\s*\\d+\\s*[~～-]\\s*\\d+\\s*년",
  experienceOnly: "^경력(?:직|자)?$|경력(?:직|자)?\\s*(?:만|전용)",
  preferredEmployeeCount: 50,
  minimumProductEmployeeCount: 30,
  military: {
    active: "현역",
    industrial: "산업기능요원",
    research: "전문연구요원",
    supplementary: "보충역",
    newEntry: "신규\\s*편입",
    newEntryDenied: "(?:신규\\s*편입|신규\\s*입사|신규\\s*지원)(?:\\s*(?:은|는|이|가)?\\s*(?:없음|없습니다|아님|아닙니다)|[^\\n.!?;]{0,100}(?:불가|불가능|불허|미채용|제외|(?:채용|모집|진행)하지|받지\\s*않|배정\\s*인원(?:이|은)?\\s*없|TO(?:가|는)?\\s*없|안\\s*됨|어렵))",
    transfer: "(?:현역\\s*(?:산업기능요원\\s*)?(?:전직|이직)|(?:전직|이직)\\s*(?:현역)|전직(?:자)?\\s*(?:만|전용)|신규\\s*편입\\s*(?:불가|불가능))",
    future: "(?:다음\\s*(?:년|해|년도)|내년|차년도|배정\\s*(?:후|결과)|TO\\s*(?:신청|결과|대기)|배정\\s*신청|배정\\s*대기)",
    futureIntent: "(?:예정|대기|신청|결과|배정\\s*후|가능)",
  },
};

export const statusLabels: Record<MilitaryStatus, string> = {
  CONFIRMED_NEW_ENTRY: "신규편입 확정", LIKELY_NEW_ENTRY: "문의 필요", CONDITIONAL_FUTURE: "조건부 · 향후 TO",
  TRANSFER_ONLY: "현역 전직 전용", SUPPLEMENTARY_ONLY: "보충역 전용", RESEARCH_ONLY: "전문연구요원 전용",
  NO_ACTIVE_TO: "현재 TO 없음", UNKNOWN: "정보 부족",
};
