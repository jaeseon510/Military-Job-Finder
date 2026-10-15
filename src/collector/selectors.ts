// 2026-10-15 공개 검색/상세 HTML에서 확인한 선택자와 필드명입니다.
export const selectors = {
  listRows: "#content table.brd_list_n tbody tr",
  detailLink: "td.title a[href*='cygonggogeomsaekView.do']",
  listCells: "td",
  total: ".brd_top_n .topics",
  content: "#content",
  tables: "table.table_row",
  rows: "tr",
  label: "th",
  value: "td",
  caption: "caption",
  remarksCaption: "비고",
  closedText: "이미 마감된 채용공고입니다",
  fields: {
    title: "채용공고", companyName: "업체명", industry: "업종", location: "주소", duties: "담당업무",
    experience: "자격요원", education: "최종학력", salary: "급여조건", applicationPeriod: "접수기간",
    publishedAt: "등록일자", serviceType: "요원형태", employmentType: "고용형태",
    activeAssigned: "현역배정인원", activeEnrolled: "현역편입인원",
    supplementaryAssigned: "보충역배정인원", supplementaryEnrolled: "보충역편입인원", transferAllowed: "전직자채용가능",
  },
};
