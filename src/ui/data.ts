import { readFileSync } from "node:fs";
import type { Dataset } from "../core/types";

export function loadDataset(): Dataset {
  try { return JSON.parse(readFileSync("data/jobs.json", "utf8")); }
  catch { return { generatedAt: "", report: null, jobs: [] }; }
}
