export interface HistoricalReference {
  id: string;
  companyName: string;
  title: string;
  location: string;
  industry: string;
  year: string | null;
  experience: string;
  duties: string;
  evidence: string;
  note: string;
  url: string;
  checkedAt: string;
}

// 과거 공개 채용사례의 요약입니다. 현재 TO·개인 지원 자격·합격 가능성을 보장하지 않습니다.
export const historicalReferences: HistoricalReference[] = [
  {
    id: "inflab-backend", companyName: "인프랩(인프런)", title: "산업기능요원 Node.js 백엔드 모집 이력",
    location: "경기 성남시 분당구", industry: "정보처리", year: null,
    experience: "미확인", duties: "자체 교육·채용 서비스의 Node.js·TypeScript API 및 DB 개발. PostgreSQL·SQL·기초 Linux 사용을 요구하며 NestJS 경험을 우대함.",
    evidence: "공개 본문에서 현역 신규편입과 전직을 모두 모집했던 근거를 확인함.",
    note: "공고는 마감 상태. 정확한 모집 연도와 당시 신입 허용 여부는 재확인 필요. 백엔드 기본기와 프로젝트 경험을 요구하므로 초급자 합격을 의미하지 않음.",
    url: "https://www.rallit.com/positions/2135/산업기능요원-백엔드-개발자-node-js", checkedAt: "2026-10-15",
  },
  {
    id: "grepp-backend-2021", companyName: "그렙(프로그래머스)", title: "2021년 현역 산업기능요원 백엔드 모집 이력",
    location: "", industry: "정보처리", year: "2021",
    experience: "미확인", duties: "자체 채용·평가·교육 서비스의 API 개발. 웹 프레임워크와 관계형 DB 활용 경험을 요구함. 백엔드와 프론트엔드를 나눠 모집했으며 여기서는 백엔드 직무를 참고함.",
    evidence: "채용담당자가 게시한 2021년 현역 산업기능요원 모집 자료. 당시 관련 대학 전공 2년 이수와 정보처리산업기사 보유 조건을 안내함.",
    note: "2021년 12월에 종료된 모집. 현역 신규편입 문구·신입 허용·실제 근무지 확인이 필요하며, 당시 제도를 현재 대학 학력자의 TO 사용 자격에 적용하면 안 됨.",
    url: "https://cscareer.kaist.ac.kr/job/b421c136-321d-4863-8abf-f3af58bfb02f?lang=ko", checkedAt: "2026-10-15",
  },
];
