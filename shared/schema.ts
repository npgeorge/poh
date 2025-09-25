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
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  printers: many(printers),
  jobs: many(jobs),
}));

export const printersRelations = relations(printers, ({ one, many }) => ({
  user: one(users, {
    fields: [printers.userId],
    references: [users.id],
  }),
  jobs: many(jobs),
}));

export const jobsRelations = relations(jobs, ({ one }) => ({
  customer: one(users, {
    fields: [jobs.customerId],
    references: [users.id],
  }),
  printer: one(printers, {
    fields: [jobs.printerId],
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

// Types
export type UpsertUser = typeof users.$inferInsert;
export type User = typeof users.$inferSelect;
export type InsertPrinter = z.infer<typeof insertPrinterSchema>;
export type Printer = typeof printers.$inferSelect;
export type InsertJob = z.infer<typeof insertJobSchema>;
export type Job = typeof jobs.$inferSelect;
