import { sql } from 'drizzle-orm';
import {
  index,
  jsonb,
  pgTable,
  timestamp,
  varchar,
  text,
  decimal,
  serial,
  integer,
  boolean,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { relations } from "drizzle-orm";

// Session storage table for Replit Auth
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

// User storage table for Replit Auth
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: varchar("email").unique(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  userType: varchar("user_type", { length: 50 }).default('customer'), // 'printer' or 'customer'
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const printers = pgTable("printers", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").references(() => users.id).notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  location: varchar("location", { length: 255 }).notNull(),
  materials: jsonb("materials").notNull(), // ['PLA', 'ABS', 'PETG']
  pricePerGram: decimal("price_per_gram", { precision: 10, scale: 2 }).notNull(),
  status: varchar("status", { length: 50 }).default('available').notNull(),
  description: text("description"),
  rating: decimal("rating", { precision: 3, scale: 2 }).default('0'),
  completedJobs: integer("completed_jobs").default(0),
  createdAt: timestamp("created_at").defaultNow(),
});

export const jobs = pgTable("jobs", {
  id: serial("id").primaryKey(),
  customerId: varchar("customer_id").references(() => users.id).notNull(),
  printerId: integer("printer_id").references(() => printers.id),
  stlFileUrl: varchar("stl_file_url", { length: 255 }),
  fileName: varchar("file_name", { length: 255 }),
  material: varchar("material", { length: 50 }),
  estimatedWeight: decimal("estimated_weight", { precision: 8, scale: 2 }),
  estimatedCost: decimal("estimated_cost", { precision: 10, scale: 2 }),
  finalCost: decimal("final_cost", { precision: 10, scale: 2 }),
  status: varchar("status", { length: 50 }).default('pending').notNull(),
  lightningInvoice: text("lightning_invoice"),
  paymentHash: varchar("payment_hash", { length: 255 }),
  qualityPhotos: jsonb("quality_photos"), // Array of photo URLs
  qualityScore: decimal("quality_score", { precision: 5, scale: 2 }), // AI quality score 0-100
  aiAnalysis: jsonb("ai_analysis"), // AI analysis results
  notes: text("notes"),
  startedAt: timestamp("started_at"),
  completedAt: timestamp("completed_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Notifications table for real-time updates
export const notifications = pgTable("notifications", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").references(() => users.id).notNull(),
  type: varchar("type", { length: 50 }).notNull(), // 'job_update', 'payment', 'dispute', etc
  title: varchar("title", { length: 255 }).notNull(),
  message: text("message").notNull(),
  data: jsonb("data"), // Additional context data
  read: boolean("read").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

// Disputes table for dispute resolution system  
export const disputes = pgTable("disputes", {
  id: serial("id").primaryKey(),
  jobId: integer("job_id").references(() => jobs.id).notNull(),
  initiatorId: varchar("initiator_id").references(() => users.id).notNull(),
  respondentId: varchar("respondent_id").references(() => users.id).notNull(),
  type: varchar("type", { length: 50 }).notNull(), // 'quality', 'payment', 'delivery', etc
  description: text("description").notNull(),
  status: varchar("status", { length: 50 }).default('open').notNull(), // 'open', 'resolved', 'escalated'
  resolution: text("resolution"),
  resolvedBy: varchar("resolved_by").references(() => users.id),
  evidenceUrls: jsonb("evidence_urls"), // Photos, documents
  createdAt: timestamp("created_at").defaultNow(),
  resolvedAt: timestamp("resolved_at"),
});

// Escrow table for payment management
export const escrow = pgTable("escrow", {
  id: serial("id").primaryKey(),
  jobId: integer("job_id").references(() => jobs.id).notNull(),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  status: varchar("status", { length: 50 }).default('held').notNull(), // 'held', 'released', 'disputed'
  releaseCondition: varchar("release_condition", { length: 100 }), // 'auto_on_completion', 'manual_approval'
  heldAt: timestamp("held_at").defaultNow(),
  releasedAt: timestamp("released_at"),
});

// Printer analytics table for performance tracking
export const printerAnalytics = pgTable("printer_analytics", {
  id: serial("id").primaryKey(),
  printerId: integer("printer_id").references(() => printers.id).notNull(),
  period: varchar("period", { length: 20 }).notNull(), // 'daily', 'weekly', 'monthly'
  periodDate: timestamp("period_date").notNull(),
  jobsCompleted: integer("jobs_completed").default(0),
  totalEarnings: decimal("total_earnings", { precision: 10, scale: 2 }).default('0'),
  avgQualityScore: decimal("avg_quality_score", { precision: 5, scale: 2 }),
  avgCompletionTime: integer("avg_completion_time"), // in hours
  materialsUsed: jsonb("materials_used"), // {material: weight_grams}
  customerRating: decimal("customer_rating", { precision: 3, scale: 2 }),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_printer_analytics_period").on(table.printerId, table.period, table.periodDate)
]);

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  printers: many(printers),
  jobs: many(jobs),
  notifications: many(notifications),
  disputesInitiated: many(disputes, { relationName: "initiatedDisputes" }),
  disputesReceived: many(disputes, { relationName: "receivedDisputes" }),
  disputesResolved: many(disputes, { relationName: "resolvedDisputes" }),
}));

export const printersRelations = relations(printers, ({ one, many }) => ({
  user: one(users, {
    fields: [printers.userId],
    references: [users.id],
  }),
  jobs: many(jobs),
  analytics: many(printerAnalytics),
}));

export const jobsRelations = relations(jobs, ({ one, many }) => ({
  customer: one(users, {
    fields: [jobs.customerId],
    references: [users.id],
  }),
  printer: one(printers, {
    fields: [jobs.printerId],
    references: [printers.id],
  }),
  disputes: many(disputes),
  escrow: one(escrow),
}));

export const notificationsRelations = relations(notifications, ({ one }) => ({
  user: one(users, {
    fields: [notifications.userId],
    references: [users.id],
  }),
}));

export const disputesRelations = relations(disputes, ({ one }) => ({
  job: one(jobs, {
    fields: [disputes.jobId],
    references: [jobs.id],
  }),
  initiator: one(users, {
    fields: [disputes.initiatorId],
    references: [users.id],
    relationName: "initiatedDisputes",
  }),
  respondent: one(users, {
    fields: [disputes.respondentId],
    references: [users.id],
    relationName: "receivedDisputes",
  }),
  resolver: one(users, {
    fields: [disputes.resolvedBy],
    references: [users.id],
    relationName: "resolvedDisputes",
  }),
}));

export const escrowRelations = relations(escrow, ({ one }) => ({
  job: one(jobs, {
    fields: [escrow.jobId],
    references: [jobs.id],
  }),
}));

export const printerAnalyticsRelations = relations(printerAnalytics, ({ one }) => ({
  printer: one(printers, {
    fields: [printerAnalytics.printerId],
    references: [printers.id],
  }),
}));

// Insert schemas
export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertPrinterSchema = createInsertSchema(printers).omit({
  id: true,
  createdAt: true,
  rating: true,
  completedJobs: true,
}).extend({
  pricePerGram: z.number().or(z.string()).transform((val) => String(val)),
});

export const insertJobSchema = createInsertSchema(jobs).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertNotificationSchema = createInsertSchema(notifications).omit({
  id: true,
  createdAt: true,
});

export const insertDisputeSchema = createInsertSchema(disputes).omit({
  id: true,
  createdAt: true,
  resolvedAt: true,
});

export const insertEscrowSchema = createInsertSchema(escrow).omit({
  id: true,
  heldAt: true,
  releasedAt: true,
});

export const insertPrinterAnalyticsSchema = createInsertSchema(printerAnalytics).omit({
  id: true,
  createdAt: true,
});

// Types
export type UpsertUser = typeof users.$inferInsert;
export type User = typeof users.$inferSelect;
export type InsertPrinter = z.infer<typeof insertPrinterSchema>;
export type Printer = typeof printers.$inferSelect;
export type InsertJob = z.infer<typeof insertJobSchema>;
export type Job = typeof jobs.$inferSelect;
export type InsertNotification = z.infer<typeof insertNotificationSchema>;
export type Notification = typeof notifications.$inferSelect;
export type InsertDispute = z.infer<typeof insertDisputeSchema>;
export type Dispute = typeof disputes.$inferSelect;
export type InsertEscrow = z.infer<typeof insertEscrowSchema>;
export type Escrow = typeof escrow.$inferSelect;
export type InsertPrinterAnalytics = z.infer<typeof insertPrinterAnalyticsSchema>;
export type PrinterAnalytics = typeof printerAnalytics.$inferSelect;
