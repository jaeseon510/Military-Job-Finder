# Military Job Finder

병역일터의 **공개 채용공고**를 수집하고, 현역 산업기능요원 신규편입 개발직을 보수적으로 분류하는 개인용 웹앱입니다. Next.js · TypeScript · SQLite · Drizzle · Cheerio · Tailwind CSS · pnpm을 사용합니다.

## 설치와 실행

Node.js 24 LTS, pnpm 11.25.0을 권장합니다.

```sh
pnpm install --frozen-lockfile
pnpm crawl
pnpm dev
```

[공고 목록](http://localhost:3000/jobs/) · [검토 대기](http://localhost:3000/review/) · [제외 공고](http://localhost:3000/excluded/)

| 명령 | 동작 |
| --- | --- |
| `pnpm crawl` | 공개 목록 전체를 조회하고 상세 수집·재분류·변경 기록·화면 데이터 생성 |
| `pnpm crawl --max-jobs 20` | 빠른 점검용 일부 수집. 전체 수집 완료로 표시하지 않음 |
| `pnpm crawl --force` | 6시간 캐시 무시. 2초 요청 간격은 유지 |
| `pnpm classify` | 네트워크 요청 없이 저장된 공고 재분류 및 화면 데이터 갱신 |
| `pnpm dev` | 개발 화면 실행. 수집/재분류 후 브라우저 새로고침 |
| `pnpm test` | 분류·파서·중복/변경 추적 테스트 |
| `pnpm typecheck` / `pnpm lint` | 타입·코드 검사 |
| `pnpm build` | 현재 DB에서 데이터를 생성하고 `out/`으로 정적 웹앱 출력 |

DB는 첫 실행에 `data/military-jobs.sqlite`로 자동 생성됩니다. 환경변수 `DATABASE_PATH`로 DB 위치를 바꿀 수 있습니다. `data/`, `.cache/`, `.env*`는 소스 커밋에서 제외합니다. 로컬 환경변수는 쉘에서 지정하세요. Next.js만 `.env.local`을 자동 로드하므로 CLI에서는 `DATABASE_PATH=다른경로 pnpm crawl`처럼 지정합니다.

## 기준 수정 — 먼저 볼 파일

| 수정할 내용 | 파일 |
| --- | --- |
| 희망 지역, 직무·기술 키워드, 제외 직무, SI 위험, 회사 규모 우선순위, 병역 문구 | [`config/rules.ts`](config/rules.ts) |
| 수집 범위·페이지 상한·캐시·요청 간격 | [`config/collector.ts`](config/collector.ts) |
| 사이트 HTML 변경·필드명 변경 | [`src/collector/selectors.ts`](src/collector/selectors.ts) |
| 병역·경력·직무 판정 순서 | [`src/core/classify.ts`](src/core/classify.ts) |
| 문의문 | [`src/core/inquiry.ts`](src/core/inquiry.ts) |
| 화면 | [`src/ui/dashboard.tsx`](src/ui/dashboard.tsx), [`src/app/globals.css`](src/app/globals.css) |

**일반적인 변경은 `config/rules.ts` 수정 → `pnpm test` → `pnpm classify` → `pnpm build`면 끝납니다.** 설정을 배포하면 Actions도 기존 DB를 새 기준으로 다시 분류합니다. 테스트 입력 예시는 `tests/fixtures.ts`, 예외 사례는 `tests/classify.test.ts`에 있습니다.

## 필터 기준

- 지역: 서울·경기·인천. 다른 시·도가 명시되면 제외하고, 근무지 미확인은 검토 대기로 보관합니다.
- 직무: 백엔드·서버/플랫폼·풀스택. 개발직 키워드가 없거나 DevOps/SRE의 코드 작성 근거가 부족하면 검토 대기로 보관합니다.
- 경력: 신입 또는 경력무관 명시가 필요합니다. 경력 N년 이상·주니어·시니어·Lead 전용은 제외합니다. 신입/경력처럼 신입을 명시적으로 포함하면 허용합니다.
- PLC·생산직·생산관리·NOC·헬프데스크·현장/기술지원·파견·고객사 상주를 담당업무/공고명에서 확인하면 제외합니다. 일반적인 생산·설비 언급은 검토 표시합니다.
- SI만으로 자동 제외하지 않습니다. `SI_RISK`를 표시하고 자체 제품 개발 근거와 함께 검토합니다.
- 자체 제품/SaaS 근거와 직원 50명 이상에 추천 가점을 줍니다. 확인된 직원 수가 30명 미만이면 제외합니다. 30~49명 회사에 제품 근거가 부족하면 규모 검토를 표시합니다. 공개 원문에서 직원 수·제품회사 여부를 확인할 수 없으면 추정하지 않고 미확인으로 표시합니다. 이 MVP는 회사 안정성을 자동 확정하지 않습니다.
- 연봉 하한은 없습니다. 선호 기술은 역할 분류에 사용하며, 급여보다 제품·개발경력 근거에 추천 가중치를 둡니다.

공고·검토 대기·제외 공고 모두 **업종·분야**를 선택할 수 있습니다. 정보처리·기계·전자 등 수집된 업종을 그대로 제공하고 빈 업종은 `업종 미확인`으로 구분합니다. 기존 백엔드·플랫폼·DevOps·풀스택 직무 필터와 함께 사용할 수 있습니다. 업종·직무·지역·검색·제외 사유는 AND, 같은 범주의 여러 직무·지역은 OR입니다. 필터 초기화 시 모든 업종으로 돌아갑니다.

공고는 다음 세 목록에 중복 없이 보관합니다.

| 화면 | 기준 |
| --- | --- |
| `/jobs` | 확정·문의 필요·향후 조건부 중 직무·경력·지역 필수 근거를 충족한 공고 |
| `/review` | 명확한 제외 근거가 없으나 병역조건·TO·개발직·신입 허용·근무지·접수기간 등 필수 정보가 불명확한 공고 |
| `/excluded` | 전직/보충역/전문연구 전용, 현재 TO 없음, 경력 전용, 제외 직무, 희망 지역 외, 직원 30명 미만, 접수 마감 등 명확한 제외 사유가 있는 공고 |

명확한 제외 사유가 하나라도 있으면 `/excluded`가 우선하며, 미확인 항목도 상세에서 함께 보여줍니다. 제외 근거는 `exclusionReasons`, 미확인 근거는 `reviewReasons`에 별도로 저장합니다. 검토 대기는 지원 가능이나 신규편입 가능으로 확정하지 않습니다. 잔여 TO 근거를 충족한 `LIKELY_NEW_ENTRY`는 기존처럼 회사 문의가 필요한 지원 검토 대상으로 유지합니다.

‘신규편입 확정만’은 확정 상태만 선택합니다. 각 목록에서 원문과 변경 이력을 확인할 수 있습니다. 직원 수·제품 여부 미확인 및 SI 위험은 우선순위 검토 플래그이며 단독 제외·검토 대기 사유가 아닙니다. 기업 추적은 브라우저 저장소를 사용하므로 기기 간 동기화되지 않습니다.

## 병역 판정과 한계

| 상태 | 의미 |
| --- | --- |
| `CONFIRMED_NEW_ENTRY` | 유효한 공고에서 현역 산업기능요원 신규편입을 명시 |
| `LIKELY_NEW_ENTRY` | 현역 산업기능요원, 배정 > 편입, 전직 전용 근거 없음. **회사 문의 필요** |
| `CONDITIONAL_FUTURE` | 다음년도 TO 신청·배정 대기·향후 편입. **현재 편입 가능으로 안내하지 않음** |
| `TRANSFER_ONLY` | 현역 전직 전용 또는 신규편입 불가 명시 |
| `SUPPLEMENTARY_ONLY` | 보충역 전용 |
| `RESEARCH_ONLY` | 전문연구요원 전용 |
| `NO_ACTIVE_TO` | 신규편입 확정 근거 없이 공개 현역 배정 잔여 인원이 없음 |
| `UNKNOWN` | 정보 부족·접수기간 미확인·마감 등 |

`현역`이나 `신규 입사`만으로 신규편입을 확정하지 않습니다. 보충역 신규편입과 현역 전직이 함께 적힌 공고를 분리해 판단합니다. `전직자 채용가능: 예`는 전직 **전용**을 뜻하지 않습니다. 접수 마감 당일은 한국 시간 23:59:59까지 유효합니다.

- `TO_AVAILABLE`: 공개 배정/편입 수치 기준 `yes/no/unknown`. 사용자에게 사용 가능한 TO라는 뜻은 아닙니다.
- `NEW_ENTRY_ALLOWED`: 명시적으로 확인할 때만 `yes/no`, 나머지는 `unknown`입니다.
- `USER_ELIGIBILITY`: **항상 `unknown`**. 대학 학력이 있는 지원자의 TO 사용 여부와 우선배정 조건은 **회사/병무청 확인 필요**로 표시합니다.
- 명시적 신규편입과 TO 수치가 충돌하면 `TO_CONFLICT`를 붙여 실제 TO 재확인을 요청합니다.
- 문구 기반 분류에는 오분류가 있을 수 있습니다. 회사의 현재 TO, 개인 학력·자격, 실제 코딩 비중, 안정성은 공개 공고만으로 보장하지 않습니다. 공고 상세/원문과 문의문을 함께 사용하세요.

## 수집·변경 추적

2026-10-15에 공개 [검색 페이지](https://work.mma.go.kr/caisBYIS/search/cygonggogeomsaek.do?menu_id=m_m7_1&pageIndex=1&pageUnit=50)와 실제 상세 HTML을 확인했습니다. [구조 확인 기록](docs/source-structure.md)에 URL·선택자·필드명·마감 응답을 정리했습니다.

- 로그인 없이 공개 목록/상세만 수집합니다. 현재 결과는 서버가 HTML로 렌더링하므로 Cheerio만 사용합니다. 동적 렌더링이 실제로 필요한 페이지가 생길 때만 Playwright를 추가합니다.
- 요청은 한 번에 하나, 최소 2초 간격입니다. 응답 캐시는 6시간입니다. 기본 페이지 크기 50·상한 30페이지이며, 상한 도달·목록 건수 불일치는 일부 수집으로 기록합니다.
- 429/서버 오류·타임아웃은 제한적으로 재시도합니다. 공고별 오류는 `data/crawl-report.json`에 기록하고 다음 공고를 계속 처리합니다. 전체 목록 실패로 확인 공고가 0개면 CLI가 실패 상태를 반환합니다.
- 정상 HTML이 아니거나 필수 항목이 사라지면 기존 데이터를 덮어쓰지 않습니다. 검색에서 사라졌다는 이유만으로 마감 처리하지 않습니다. 저장된 마감일 또는 상세의 명시적 마감 응답을 확인합니다.
- 공개 원문 텍스트는 공고·회사·근무조건·비고를 보존하며, 담당자 연락처 표와 로그인 안내는 제외합니다. 캐시에는 원래 HTML이 들어가므로 공개 배포하지 않습니다.
- 공고번호를 고유 키로 사용합니다. 수집 시각을 제외하고 공백·유니코드·키 순서를 정규화한 SHA-256을 비교합니다. 동일 공고 재수집은 새 공고/스냅샷으로 추가하지 않습니다.
- `Company`, `Job`, `MilitaryInfo`, `JobSnapshot`으로 회사, 최신 원문·판정, TO, 변경 이력을 저장합니다. 마이그레이션은 `migrations/*.sql`을 순서대로 한 번씩 적용합니다.
- 신규·마감/재개·TO·편입인원·병역조건/본문·급여·마감일 변경을 기록합니다. 화면에서는 공고별 최근 20개 이력을 보여주며 DB에는 전체 이력을 보존합니다.
- 비정상 종료 후 잠금이 남으면 실행 중인 수집기가 없는지 확인한 뒤 `data/crawl.lock`을 삭제합니다. 여러 수집기를 동시에 실행하지 마세요.

## GitHub Pages 배포

GitHub Pages는 정적 파일을 제공하므로 수집기·SQLite를 직접 실행하지 못합니다. **Actions에서 수집 → SQLite 저장 → 정적 빌드 → Pages 배포**로 동작합니다. [Next.js 정적 내보내기](https://nextjs.org/docs/app/guides/static-exports), [Pages 사용자 지정 워크플로](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages)를 따릅니다.

1. 기본 브랜치는 `develop`입니다. 기능 브랜치 → `develop` PR을 검토·머지합니다.
2. `develop` → `main` 릴리스 PR을 만든 뒤 사용자가 머지합니다.
3. 저장소 **Settings → Pages → Source: GitHub Actions**를 선택합니다.
4. `main` 변경 시 자동 배포합니다. 수동 실행은 Actions의 `병역일터 수집 및 Pages 배포` → Run workflow → `main`입니다.

배포 주소: `https://jaeseon510.github.io/Military-Job-Finder/jobs/`

매일 **한국 시간 오전 9:17** 수집·재배포합니다. GitHub 스케줄은 지연될 수 있고, 공개 저장소의 장기 비활성 시 스케줄이 중단될 수 있습니다. 마지막 확인 시간을 화면에서 확인하세요. 수집 전체가 실패하면 기존 배포를 유지합니다.

정기 실행은 [GitHub의 기본 브랜치 실행 규칙](https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows#schedule)에 따라 `develop`의 `schedule.yml`이 `main`의 `pages.yml`을 실행하도록 구성했습니다. 실제 수집·빌드·배포와 Pages 환경의 허용 브랜치는 `main`으로 제한합니다. 예약 작업을 수동 점검할 때는 `일일 main 수집 예약` → `develop`을 선택합니다.

DB와 보고서는 **`chore/crawl-state` 브랜치**에 압축 저장합니다. Actions 캐시가 만료돼도 최초 발견시각·이전 hash·변경 이력이 유지됩니다. 이 브랜치는 소스에 머지하지 마세요. HTTP 캐시는 Actions 캐시에만 보관합니다. 저장소가 공개이므로 상태 브랜치도 공개됩니다. 수집 데이터는 공개 공고 본문에 한정하며 자격·개인정보를 입력하지 않습니다.

로컬에서 배포 경로를 검증하려면:

```sh
NEXT_PUBLIC_BASE_PATH=/Military-Job-Finder pnpm build
```

`main`만 Pages에 배포하며 `develop`·기능 PR은 테스트·타입·린트·정적 빌드 검사를 수행합니다. 머지는 사용자가 합니다. GitHub 기본 토큰에 수집 상태 브랜치 쓰기 권한이 제한되면 저장소 Actions 권한 설정을 확인하세요.

## 작업 구조

```text
config/          변경하기 쉬운 판정·수집 기준
src/collector/   공개 HTTP 수집·HTML 선택자·파서
src/core/        타입·판정·hash/변경 감지·문의문
src/db/          Drizzle schema·DB 연결·저장
src/ui/          대시보드와 화면용 데이터 읽기
src/app/         /jobs, /review, /excluded, 정적 진입점
scripts/         crawl / classify / export / 원격 상태 보존
tests/           네트워크 없이 실행하는 단위 테스트
migrations/      SQLite 버전별 변경
.github/         CI·일일 수집·Pages 배포·PR 템플릿
```

외부 채용사이트·로그인 수집·지원 자동화는 포함하지 않습니다. 2단계 수집원이 생기면 기존 공고 타입·판정·저장 흐름을 재사용하고 해당 수집기만 추가하세요.
