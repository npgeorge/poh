import {
  users,
  printers,
  jobs,
  notifications,
  type User,
  type UpsertUser,
  type Printer,
  type InsertPrinter,
  type Job,
  type InsertJob,
  type Notification,
  type InsertNotification,
} from "@shared/schema";
import { db } from "./db";
import { eq, and, desc } from "drizzle-orm";

export interface IStorage {
  // User operations (required for Replit Auth)
  getUser(id: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;
  
  // Printer operations
  createPrinter(printer: InsertPrinter): Promise<Printer>;
  getPrintersByUserId(userId: string): Promise<Printer[]>;
  getAllPrinters(): Promise<Printer[]>;
  getPrinterById(id: number): Promise<Printer | undefined>;
  updatePrinter(id: number, updates: Partial<InsertPrinter>): Promise<Printer>;
  
  // Job operations
  createJob(job: InsertJob): Promise<Job>;
  getJobById(id: number): Promise<Job | undefined>;
  getJobsByCustomerId(customerId: string): Promise<Job[]>;
  getJobsByPrinterId(printerId: number): Promise<Job[]>;
  updateJob(id: number, updates: Partial<InsertJob>): Promise<Job>;
  getAllJobs(): Promise<Job[]>;
  
  // Notification operations
  createNotification(notification: InsertNotification): Promise<Notification>;
  getUnreadNotifications(userId: string): Promise<Notification[]>;
  markNotificationRead(id: number): Promise<void>;
  getUserNotifications(userId: string): Promise<Notification[]>;
}

export class DatabaseStorage implements IStorage {
  // User operations
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(userData)
      .onConflictDoUpdate({
        target: users.id,
        set: {
          ...userData,
          updatedAt: new Date(),
        },
      })
      .returning();
    return user;
  }

  // Printer operations
  async createPrinter(printer: InsertPrinter): Promise<Printer> {
    const [newPrinter] = await db
      .insert(printers)
      .values(printer)
      .returning();
    return newPrinter;
  }

  async getPrintersByUserId(userId: string): Promise<Printer[]> {
    return await db
      .select()
      .from(printers)
      .where(eq(printers.userId, userId));
  }

  async getAllPrinters(): Promise<Printer[]> {
    return await db
      .select()
      .from(printers)
      .orderBy(desc(printers.rating));
  }

  async getPrinterById(id: number): Promise<Printer | undefined> {
    const [printer] = await db
      .select()
      .from(printers)
      .where(eq(printers.id, id));
    return printer;
  }

  async updatePrinter(id: number, updates: Partial<InsertPrinter>): Promise<Printer> {
    const [printer] = await db
      .update(printers)
      .set(updates)
      .where(eq(printers.id, id))
      .returning();
    return printer;
  }

  // Job operations
  async createJob(job: InsertJob): Promise<Job> {
    const [newJob] = await db
      .insert(jobs)
      .values(job)
      .returning();
    return newJob;
  }

  async getJobById(id: number): Promise<Job | undefined> {
    const [job] = await db
      .select()
      .from(jobs)
      .where(eq(jobs.id, id));
    return job;
  }

  async getJobsByCustomerId(customerId: string): Promise<Job[]> {
    return await db
      .select()
      .from(jobs)
      .where(eq(jobs.customerId, customerId))
      .orderBy(desc(jobs.createdAt));
  }

  async getJobsByPrinterId(printerId: number): Promise<Job[]> {
    return await db
      .select()
      .from(jobs)
      .where(eq(jobs.printerId, printerId))
      .orderBy(desc(jobs.createdAt));
  }

  async updateJob(id: number, updates: Partial<InsertJob>): Promise<Job> {
    const [job] = await db
      .update(jobs)
      .set({
        ...updates,
        updatedAt: new Date(),
      })
      .where(eq(jobs.id, id))
      .returning();
    return job;
  }

  async getAllJobs(): Promise<Job[]> {
    return await db
      .select()
      .from(jobs)
      .orderBy(desc(jobs.createdAt));
  }

  // Notification operations
  async createNotification(notification: InsertNotification): Promise<Notification> {
    const [newNotification] = await db
      .insert(notifications)
      .values(notification)
      .returning();
    return newNotification;
  }

  async getUnreadNotifications(userId: string): Promise<Notification[]> {
    return await db
      .select()
      .from(notifications)
      .where(and(eq(notifications.userId, userId), eq(notifications.read, false)))
      .orderBy(desc(notifications.createdAt));
  }

  async markNotificationRead(id: number): Promise<void> {
    await db
      .update(notifications)
      .set({ read: true })
      .where(eq(notifications.id, id));
  }

  async getUserNotifications(userId: string): Promise<Notification[]> {
    return await db
      .select()
      .from(notifications)
      .where(eq(notifications.userId, userId))
      .orderBy(desc(notifications.createdAt))
      .limit(50); // Limit to recent 50 notifications
  }
}

export const storage = new DatabaseStorage();
