import assert from "node:assert/strict";
import { test } from "node:test";
import { openDatabase } from "../src/db/client";
import { readJobs, reclassify, saveJob } from "../src/db/repository";
import { detectChanges, sourceHash } from "../src/core/changes";
import { job } from "./fixtures";
import { jobGroup } from "../src/core/classify";

test("정규화 hash는 수집 시각·불필요한 공백에 영향받지 않음", () => {
  const source = job();
  assert.equal(sourceHash(source), sourceHash({ ...source, companyName: " 테스트   회사 ", collectedAt: "2099-01-01" }));
  assert.deepEqual(detectChanges(source, { ...source, collectedAt: "2099-01-01" }), []);
});

test("미확인 사유를 DB에 보존하고 재분류해도 새 공고 이력을 만들지 않음", () => {
  const { db, sqlite } = openDatabase(":memory:");
  try {
    saveJob(db, job({ experience: "" }));
    assert.equal(jobGroup(readJobs(db)[0]), "review");
    assert.ok(readJobs(db)[0].reviewReasons.includes("신입·경력무관 명시 미확인"));
    reclassify(db);
    assert.equal(jobGroup(readJobs(db)[0]), "review");
    assert.equal(readJobs(db)[0].changes.length, 1);
    saveJob(db, job());
    assert.equal(jobGroup(readJobs(db)[0]), "jobs");
    assert.deepEqual(readJobs(db)[0].reviewReasons, []);
  } finally { sqlite.close(); }
});

test("DB 중복 방지·변경 종류·최초 발견시각 보존·재분류", () => {
  const { db, sqlite } = openDatabase(":memory:");
  try {
    const first = job();
    assert.deepEqual(saveJob(db, first), ["NEW"]);
    assert.deepEqual(saveJob(db, { ...first, collectedAt: "2026-10-16T01:00:00.000Z" }), []);
    assert.equal(readJobs(db).length, 1);
    assert.equal(readJobs(db)[0].changes.length, 1);
    const changes = saveJob(db, { ...first, salary: "4000만원", activeAssigned: 2, activeEnrolled: 1, deadline: "2099-11-30", remarks: "현역 신규편입 가능", collectedAt: "2026-10-17T01:00:00.000Z" });
    for (const type of ["TO_CHANGED", "ENROLLED_CHANGED", "SALARY_CHANGED", "DEADLINE_CHANGED", "MILITARY_CHANGED"]) assert.ok(changes.includes(type as typeof changes[number]));
    assert.equal(readJobs(db)[0].firstSeenAt, first.collectedAt);
    assert.equal(readJobs(db)[0].military.status, "CONFIRMED_NEW_ENTRY");
    saveJob(db, { ...first, closed: true });
    assert.ok(readJobs(db)[0].changes[0].types.includes("CLOSED"));
    assert.equal(reclassify(db), 1);
    assert.equal(readJobs(db)[0].military.userEligibility, "unknown");
  } finally { sqlite.close(); }
});
