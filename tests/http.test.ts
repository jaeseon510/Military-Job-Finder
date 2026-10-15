import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { PublicClient } from "../src/collector/http";

test("공개 URL 제한과 디스크 캐시로 반복 요청 방지", async t => {
  const cache = await mkdtemp(join(tmpdir(), "mjf-http-"));
  let requests = 0;
  t.mock.method(globalThis, "fetch", async () => { requests++; return new Response('<div id="content">공개 공고</div>'); });
  try {
    const url = "https://work.mma.go.kr/caisBYIS/search/cygonggogeomsaek.do?pageIndex=1";
    const client = new PublicClient(cache);
    const results = await Promise.all([client.get(url), client.get(url)]);
    assert.equal(requests, 1);
    assert.equal(results[0], results[1]);
    assert.equal(await new PublicClient(cache).get(url), results[0]);
    assert.equal(requests, 1);
    await assert.rejects(client.get("https://example.com/login"), /공개 검색\/상세 URL/);
    await new PublicClient(cache, true).get(url);
    assert.equal(requests, 2);
  } finally { await rm(cache, { recursive: true, force: true }); }
});
