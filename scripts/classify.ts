import { openDatabase } from "../src/db/client";
import { reclassify } from "../src/db/repository";

const { db, sqlite } = openDatabase();
try { console.info(`재분류 완료: ${reclassify(db)}개 공고`); }
finally { sqlite.close(); }
await import("./export");
