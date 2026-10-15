import assert from "node:assert/strict";
import { test } from "node:test";
import { parseDetail, parseList } from "../src/collector/parser";
import { job } from "./fixtures";

const listing = job();
const table = (caption: string, rows: string) => `<table class="table_row"><caption>${caption}</caption><tbody>${rows}</tbody></table>`;
const row = (key: string, value: string) => `<tr><th scope="row">${key}</th><td>${value}</td></tr>`;

test("실제 공개 HTML의 표·라벨 구조 파싱 및 세션 제거", () => {
  const html = `<div id="content"><div class="brd_top_n"><div class="topics">총 게시물 : 1건 (1/1 페이지)</div></div><table class="brd_list_n"><tbody><tr><th>1</th><td class="title"><a href="/caisBYIS/search/cygonggogeomsaekView.do;jsessionid=secret?cygonggo_no=1234&amp;byjjeopche_cd=5678">백엔드 개발</a></td><td>회사</td><td>2099-12-31</td><td>2026-10-15</td><td>5</td></tr></tbody></table></div>`;
  const result = parseList(html);
  assert.equal(result.total, 1);
  assert.equal(result.listings[0].companyCode, "5678");
  assert.ok(!result.listings[0].url.includes("jsessionid"));
});

test("상세 수치·알 수 없음·비고·개인정보 범위 파싱", () => {
  const html = `<div id="content">${table("채용공고", row("채용공고", "현역 백엔드") + row("업체명", "회사"))}${table("근무조건", row("요원형태", "현역") + row("고용형태", "산업기능요원") + row("자격요원", "신입") + row("현역배정인원", "1,234명") + row("현역편입인원", "미공개") + row("전직자 채용가능", "예"))}${table("접수방법", row("접수기간", "2026-10-01 ~ 2099-12-31") + "<tr><td>로그인 안내</td></tr>")}${table("담당자정보", row("담당자", "홍길동"))}${table("비 고", "<tr><td>현역 신규편입 가능<br>직원 55명</td></tr>")}</div>`;
  const parsed = parseDetail(html, listing);
  assert.notEqual(parsed, "closed");
  if (parsed === "closed") return;
  assert.equal(parsed.activeAssigned, 1234);
  assert.equal(parsed.activeEnrolled, null);
  assert.equal(parsed.employeeCount, 55);
  assert.equal(parsed.deadline, "2099-12-31");
  assert.equal(parsed.transferAllowed, "yes");
  assert.ok(!parsed.rawText.includes("홍길동"));
  assert.ok(!parsed.rawText.includes("로그인 안내"));
});

test("마감 페이지는 상세 데이터 덮어쓰기 대신 마감 신호", () => {
  assert.equal(parseDetail('<div id="content">이미 마감된 채용공고입니다.</div>', listing), "closed");
  assert.throws(() => parseDetail("<html>오류</html>", listing), /상세 본문/);
  assert.throws(() => parseList("<html>로그인</html>"), /검색 목록/);
  assert.throws(() => parseDetail('<div id="content">빈 내용</div>', listing), /필수 상세/);
});
