# Military Job Finder 작업 지침

- 짧은 한국어 커밋. `feat:`, `fix:`, `refactor:`, `docs:`, `chore:`, `test:`, `style:`, `perf:`, `ci:`, `hotfix:` 사용.
- 브랜치: `<type>/<짧은-영문-소문자>`. 기능 브랜치 → `develop` → `main`, 각 단계 PR 필수. 머지는 사용자만 수행.
- PR 본문은 `Summary`, `Changes`, `Test`를 포함한다. 목적별로 커밋을 나눈다.
- 판정/키워드 수정은 `config/rules.ts`부터 읽는다. 수집 설정은 `config/collector.ts`, 선택자는 `src/collector/selectors.ts`.
- 구조가 필요하면 README의 파일 표와 `docs/source-structure.md`를 먼저 읽고 필요한 파일만 확인한다.
- 현역이라는 단어·잔여 TO만으로 신규편입을 확정하지 않는다. `USER_ELIGIBILITY`는 항상 `unknown`.
- 보충역 신규편입·현역 전직·전문연구요원을 혼동하지 않는다. 조건부 향후 배정을 현재 가능으로 표시하지 않는다.
- 기준 변경 후 `pnpm test`, `pnpm typecheck`, `pnpm lint`, `pnpm classify`, `pnpm build`로 확인한다.
- 수집은 공개 검색/상세만, 최소 2초 간격·캐시 유지. 디버깅 중 반복 수집보다 캐시·합성 테스트를 우선한다.
- 불필요한 주석·디버그 로그·임시 코드는 커밋하지 않는다. CLI 진행/실패 로그는 유지한다.
- API 추가 시 Swagger 문서/UI와 예제도 업데이트한다. 현재 MVP는 별도 서버 API가 없다.
- Pages는 정적 배포. `.github/workflows/pages.yml`이 `main`에서 수집·배포한다. `chore/crawl-state`는 수집 DB 전용으로 소스에 머지하지 않는다.

<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
