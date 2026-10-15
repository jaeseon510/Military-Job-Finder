import assert from "node:assert/strict";
import { test } from "node:test";
import { openDatabase } from "../src/db/client";
import { readHistory, readJobs, reclassify, saveJob } from "../src/db/repository";
import { isHistoricalCandidate, referenceHistory } from "../src/core/history";
import { job } from "./fixtures";

const now = new Date("2026-10-15T03:00:00.000Z");

test("마감 후에도 접수 중 원문과 당시 TO를 보존하고 현재 공고로 재노출하지 않음", () => {
  const { db, sqlite } = openDatabase(":memory:");
  try {
    const source = job({ deadline: "2026-10-14", applicationPeriod: "2026-10-14", collectedAt: "2026-10-13T03:00:00.000Z", remarks: "현역 신규편입 가능" });
    saveJob(db, source);
    saveJob(db, { ...source, closed: true, activeAssigned: 0, collectedAt: now.toISOString() });
    reclassify(db, now);
    const current = readJobs(db)[0];
    const archived = readHistory(db, now)[0];
    assert.equal(current.excluded, true);
    assert.equal(current.activeAssigned, 0);
    assert.equal(archived.military.status, "CONFIRMED_NEW_ENTRY");
    assert.equal(archived.activeAssigned, 1);
    assert.equal(archived.closed, true);
    assert.equal(archived.historical?.assessedAt, source.collectedAt);
    assert.equal(archived.historical?.basis, "snapshot");
    assert.equal(archived.military.userEligibility, "unknown");
    assert.equal(isHistoricalCandidate(archived), true);
    assert.equal(readJobs(db)[0].changes.length, 2);
    assert.ok(archived.changes[0].types.includes("CLOSED"));
    assert.equal(readHistory(db, now).length, 1);
  } finally { sqlite.close(); }
});

test("후반에 경력 전용으로 바뀌어도 과거에 신입에게 맞았던 마지막 기록을 찾음", () => {
  const { db, sqlite } = openDatabase(":memory:");
  try {
    const source = job({ remarks: "현역 신규편입 가능", collectedAt: "2026-10-10T03:00:00.000Z" });
    saveJob(db, source);
    saveJob(db, { ...source, experience: "경력 3년 이상", collectedAt: "2026-10-11T03:00:00.000Z" });
    saveJob(db, { ...source, experience: "경력 3년 이상", closed: true, collectedAt: now.toISOString() });
    const archived = readHistory(db, now)[0];
    assert.equal(archived.experience, "신입");
    assert.equal(archived.historical?.assessedAt, source.collectedAt);
    assert.equal(isHistoricalCandidate(archived), true);
  } finally { sqlite.close(); }
});

test("최초 수집부터 마감이면 날짜를 되돌려 신규편입 가능으로 추론하지 않음", () => {
  const { db, sqlite } = openDatabase(":memory:");
  try {
    saveJob(db, job({ deadline: "2025-12-31", applicationPeriod: "2025-12-31", remarks: "현역 신규편입 가능" }));
    const archived = readHistory(db, now)[0];
    assert.equal(archived.historical?.basis, "unverified");
    assert.equal(archived.military.status, "UNKNOWN");
    assert.equal(archived.military.newEntryAllowed, "unknown");
    assert.ok(archived.reviewReasons.some(reason => reason.includes("접수 중")));
    assert.equal(archived.excluded, false);
  } finally { sqlite.close(); }
});

test("과거에도 전직·보충역·경력 전용이던 공고는 기본 과거 후보에서 제외", () => {
  const { db, sqlite } = openDatabase(":memory:");
  try {
    const sources = [job({ id: "transfer", remarks: "현역 전직 전용" }), job({ id: "supplementary", title: "보충역 산업기능요원 백엔드", serviceType: "보충역" }), job({ id: "career", experience: "경력 3년 이상" })];
    for (const source of sources) {
      saveJob(db, source);
      saveJob(db, { ...source, closed: true });
    }
    assert.equal(readHistory(db, now).filter(isHistoricalCandidate).length, 0);
    assert.equal(readHistory(db, now).length, 3);
  } finally { sqlite.close(); }
});

test("진행 중 공고는 과거 목록에 중복 추가하지 않고 공개 참고자료는 확인 필요로 보관", () => {
  const { db, sqlite } = openDatabase(":memory:");
  try {
    saveJob(db, job());
    assert.equal(readHistory(db, now).length, 0);
    const references = referenceHistory(now);
    assert.ok(references.length > 0);
    for (const reference of references) {
      assert.equal(reference.historical?.basis, "reference");
      assert.equal(reference.historical?.assessedAt, null);
      assert.equal(reference.closed, true);
      assert.equal(reference.military.status, "UNKNOWN");
      assert.equal(reference.military.userEligibility, "unknown");
      assert.ok(reference.reviewReasons.includes("신입·경력무관 명시 미확인"));
      assert.ok(reference.url.startsWith("https://"));
    }
  } finally { sqlite.close(); }
});
