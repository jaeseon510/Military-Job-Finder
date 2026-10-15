import { index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core";
import type { Change, Classification, JobSource, MilitaryVerdict } from "../core/types";

export const companies = sqliteTable("Company", {
  code: text("code").primaryKey(),
  name: text("name").notNull(),
  industry: text("industry").notNull(),
  location: text("location").notNull(),
  employeeCount: integer("employee_count"),
  lastSeenAt: text("last_seen_at").notNull(),
});

export const jobs = sqliteTable("Job", {
  id: text("id").primaryKey(),
  companyCode: text("company_code").notNull().references(() => companies.code),
  source: text("source", { mode: "json" }).$type<JobSource>().notNull(),
  classification: text("classification", { mode: "json" }).$type<Classification>().notNull(),
  hash: text("hash").notNull(),
  firstSeenAt: text("first_seen_at").notNull(),
  lastSeenAt: text("last_seen_at").notNull(),
}, table => [index("job_company_idx").on(table.companyCode)]);

export const militaryInfo = sqliteTable("MilitaryInfo", {
  jobId: text("job_id").primaryKey().references(() => jobs.id, { onDelete: "cascade" }),
  activeAssigned: integer("active_assigned"),
  activeEnrolled: integer("active_enrolled"),
  supplementaryAssigned: integer("supplementary_assigned"),
  supplementaryEnrolled: integer("supplementary_enrolled"),
  verdict: text("verdict", { mode: "json" }).$type<MilitaryVerdict>().notNull(),
});

export const snapshots = sqliteTable("JobSnapshot", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  jobId: text("job_id").notNull().references(() => jobs.id, { onDelete: "cascade" }),
  hash: text("hash").notNull(),
  source: text("source", { mode: "json" }).$type<JobSource>().notNull(),
  changes: text("changes", { mode: "json" }).$type<Change[]>().notNull(),
  createdAt: text("created_at").notNull(),
}, table => [index("snapshot_job_idx").on(table.jobId, table.createdAt)]);
