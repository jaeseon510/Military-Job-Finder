export const collectorConfig = {
  origin: "https://work.mma.go.kr",
  listPath: "/caisBYIS/search/cygonggogeomsaek.do",
  detailPath: "/caisBYIS/search/cygonggogeomsaekView.do",
  intervalMs: 2000,
  cacheTtlMs: 6 * 60 * 60 * 1000,
  timeoutMs: 25000,
  retries: 2,
  pageSize: 50,
  maxPages: 30,
  userAgent: "MilitaryJobFinder/0.1 (+https://github.com/jaeseon510/Military-Job-Finder)",
  // 공개 채용 전체를 수집해 제외 사유까지 보존합니다. 검색 범위를 줄이려면 여기에 추가합니다.
  searchParams: { menu_id: "m_m7_1", search_cd: "2" } as Record<string, string>,
};
