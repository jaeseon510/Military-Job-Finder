import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { mkdirSync, readdirSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import * as schema from "./schema";

export function openDatabase(path = process.env.DATABASE_PATH || "data/military-jobs.sqlite") {
  if (path !== ":memory:") mkdirSync(dirname(resolve(path)), { recursive: true });
  const sqlite = new Database(path);
  sqlite.pragma("journal_mode = WAL");
  sqlite.pragma("foreign_keys = ON");
  sqlite.pragma("busy_timeout = 5000");
  sqlite.exec("CREATE TABLE IF NOT EXISTS _migrations (name TEXT PRIMARY KEY, applied_at TEXT NOT NULL)");
  for (const name of readdirSync(resolve("migrations")).filter(name => name.endsWith(".sql")).sort()) {
    if (!sqlite.prepare("SELECT name FROM _migrations WHERE name = ?").get(name)) {
      sqlite.transaction(() => {
        sqlite.exec(readFileSync(resolve("migrations", name), "utf8"));
        sqlite.prepare("INSERT INTO _migrations VALUES (?, ?)").run(name, new Date().toISOString());
      })();
    }
  }
  return { db: drizzle(sqlite, { schema }), sqlite };
}
export type JobDatabase = ReturnType<typeof openDatabase>["db"];
