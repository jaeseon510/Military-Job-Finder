import { createHash } from "node:crypto";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { setTimeout as delay } from "node:timers/promises";
import { collectorConfig as config } from "../../config/collector";

export class PublicClient {
  private lastRequest = 0;
  private queue: Promise<unknown> = Promise.resolve();
  constructor(private cacheDir = ".cache/http", private force = false) {}

  get(url: string): Promise<string> {
    const request = this.queue.then(() => this.request(url));
    this.queue = request.catch(() => {});
    return request;
  }

  private async request(input: string): Promise<string> {
    const url = new URL(input);
    if (url.origin !== config.origin || ![config.listPath, config.detailPath].includes(url.pathname)) throw new Error("허용된 병역일터 공개 검색/상세 URL이 아닙니다");
    await mkdir(this.cacheDir, { recursive: true });
    const cachePath = `${this.cacheDir}/${createHash("sha256").update(url.href).digest("hex")}.json`;
    if (!this.force) {
      try {
        const entry = JSON.parse(await readFile(cachePath, "utf8")) as { at: number; html: string };
        if (Date.now() - entry.at < config.cacheTtlMs) return entry.html;
      } catch { /* 캐시 부재·손상 시 공개 페이지를 다시 요청합니다. */ }
    }
    for (let attempt = 0; attempt <= config.retries; attempt++) {
      await delay(Math.max(0, config.intervalMs - (Date.now() - this.lastRequest)));
      this.lastRequest = Date.now();
      try {
        const response = await fetch(url, { headers: { "User-Agent": config.userAgent, Accept: "text/html" }, signal: AbortSignal.timeout(config.timeoutMs), redirect: "error" });
        if (response.status === 429 || response.status >= 500) {
          const retryAfter = Number(response.headers.get("retry-after"));
          if (attempt < config.retries) {
            await delay(Math.min(60000, Math.max(config.intervalMs * 2 ** (attempt + 1), Number.isFinite(retryAfter) ? retryAfter * 1000 : 0)));
            continue;
          }
        }
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const html = await response.text();
        if (!html.includes('id="content"')) throw new Error("정상 공개 페이지 구조가 아닙니다");
        await writeFile(`${cachePath}.tmp`, JSON.stringify({ at: Date.now(), html }));
        await rename(`${cachePath}.tmp`, cachePath);
        return html;
      } catch (error) {
        if (attempt === config.retries) throw error;
        await delay(config.intervalMs * 2 ** (attempt + 1));
      }
    }
    throw new Error("공개 페이지 요청 실패");
  }
}
