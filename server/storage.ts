import {
  users,
  printers,
  jobs,
  notifications,
  escrow,
  disputes,
  bids,
  type User,
  type UpsertUser,
  type Printer,
  type InsertPrinter,
  type Job,
  type InsertJob,
  type Notification,
  type InsertNotification,
  type Escrow,
  type InsertEscrow,
  type Dispute,
  type InsertDispute,
  type Bid,
  type InsertBid,
} from "@shared/schema";
import { db } from "./db";
import { eq, and, desc, gte, lte, ilike, arrayContains, or } from "drizzle-orm";

export interface PrinterFilters {
  materials?: string[];
  location?: string;
  minPrice?: number;
  maxPrice?: number;
  status?: string;
}

export interface IStorage {
  // User operations (required for Replit Auth)
  getUser(id: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;
  updateUserRole(id: string, role: string): Promise<User>;
  
  // Printer operations
  createPrinter(printer: InsertPrinter): Promise<Printer>;
  getPrintersByUserId(userId: string): Promise<Printer[]>;
  getAllPrinters(): Promise<Printer[]>;
  searchPrinters(filters: PrinterFilters): Promise<Printer[]>;
  getPrinterById(id: number): Promise<Printer | undefined>;
  updatePrinter(id: number, updates: Partial<InsertPrinter>): Promise<Printer>;
  
  // Job operations
  createJob(job: InsertJob): Promise<Job>;
  getJobById(id: number): Promise<Job | undefined>;
  getJobsByCustomerId(customerId: string): Promise<Job[]>;
  getJobsByPrinterId(printerId: number): Promise<Job[]>;
  updateJob(id: number, updates: Partial<Job>): Promise<Job>;
  getAllJobs(): Promise<Job[]>;
  
  // Notification operations
  createNotification(notification: InsertNotification): Promise<Notification>;
  getUnreadNotifications(userId: string): Promise<Notification[]>;
  markNotificationRead(id: number): Promise<void>;
  getUserNotifications(userId: string): Promise<Notification[]>;

  // Escrow operations
  createEscrow(escrowData: InsertEscrow): Promise<Escrow>;
  getEscrowByJobId(jobId: number): Promise<Escrow | undefined>;
  updateEscrow(id: number, updates: Partial<Escrow>): Promise<Escrow>;
  releaseEscrow(id: number): Promise<Escrow>;

  // Dispute operations
  createDispute(disputeData: InsertDispute): Promise<Dispute>;
  getDisputeById(id: number): Promise<Dispute | undefined>;
  getDisputesByJobId(jobId: number): Promise<Dispute[]>;
  getDisputesByUserId(userId: string): Promise<Dispute[]>;
  getAllDisputes(): Promise<Dispute[]>;
  updateDispute(id: number, updates: Partial<Dispute>): Promise<Dispute>;
  resolveDispute(id: number, resolution: string, resolvedBy: string): Promise<Dispute>;

  // Bid operations
  createBid(bidData: InsertBid): Promise<Bid>;
  getBidById(id: number): Promise<Bid | undefined>;
  getBidsByJobId(jobId: number): Promise<Bid[]>;
  getBidsByPrinterId(printerId: number): Promise<Bid[]>;
  updateBid(id: number, updates: Partial<Bid>): Promise<Bid>;
  acceptBid(id: number): Promise<Bid>;
  rejectBid(id: number): Promise<Bid>;
  withdrawBid(id: number): Promise<Bid>;
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

  async updateUserRole(id: string, role: string): Promise<User> {
    const [user] = await db
      .update(users)
      .set({ currentRole: role as 'customer' | 'printer_owner', updatedAt: new Date() })
      .where(eq(users.id, id))
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

  async searchPrinters(filters: PrinterFilters): Promise<Printer[]> {
    const conditions = [];
    
    // Filter by materials - check if printer supports any of the requested materials
    if (filters.materials && filters.materials.length > 0) {
      const materialConditions = filters.materials.map(material => 
        arrayContains(printers.materials, [material])
      );
      conditions.push(or(...materialConditions));
    }
    
    // Filter by location - case insensitive search
    if (filters.location) {
      conditions.push(ilike(printers.location, `%${filters.location}%`));
    }
    
    // Filter by minimum price
    if (filters.minPrice !== undefined) {
      conditions.push(gte(printers.pricePerGram, filters.minPrice));
    }
    
    // Filter by maximum price
    if (filters.maxPrice !== undefined) {
      conditions.push(lte(printers.pricePerGram, filters.maxPrice));
    }
    
    // Filter by status
    if (filters.status) {
      conditions.push(eq(printers.status, filters.status));
    }
    
    const query = db
      .select()
      .from(printers)
      .orderBy(desc(printers.rating));
    
    if (conditions.length > 0) {
      return await query.where(and(...conditions));
    }
    
    return await query;
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

  async updateJob(id: number, updates: Partial<Job>): Promise<Job> {
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

  // Escrow operations
  async createEscrow(escrowData: InsertEscrow): Promise<Escrow> {
    const [newEscrow] = await db
      .insert(escrow)
      .values(escrowData)
      .returning();
    return newEscrow;
  }

  async getEscrowByJobId(jobId: number): Promise<Escrow | undefined> {
    const [escrowRecord] = await db
      .select()
      .from(escrow)
      .where(eq(escrow.jobId, jobId));
    return escrowRecord;
  }

  async updateEscrow(id: number, updates: Partial<Escrow>): Promise<Escrow> {
    const [updated] = await db
      .update(escrow)
      .set(updates)
      .where(eq(escrow.id, id))
      .returning();
    return updated;
  }

  async releaseEscrow(id: number): Promise<Escrow> {
    const [released] = await db
      .update(escrow)
      .set({
        status: 'released',
        releasedAt: new Date(),
      })
      .where(eq(escrow.id, id))
      .returning();
    return released;
  }

  // Dispute operations
  async createDispute(disputeData: InsertDispute): Promise<Dispute> {
    const [newDispute] = await db
      .insert(disputes)
      .values(disputeData)
      .returning();
    return newDispute;
  }

  async getDisputeById(id: number): Promise<Dispute | undefined> {
    const [dispute] = await db
      .select()
      .from(disputes)
      .where(eq(disputes.id, id));
    return dispute;
  }

  async getDisputesByJobId(jobId: number): Promise<Dispute[]> {
    return await db
      .select()
      .from(disputes)
      .where(eq(disputes.jobId, jobId))
      .orderBy(desc(disputes.createdAt));
  }

  async getDisputesByUserId(userId: string): Promise<Dispute[]> {
    return await db
      .select()
      .from(disputes)
      .where(or(
        eq(disputes.initiatorId, userId),
        eq(disputes.respondentId, userId)
      ))
      .orderBy(desc(disputes.createdAt));
  }

  async getAllDisputes(): Promise<Dispute[]> {
    return await db
      .select()
      .from(disputes)
      .orderBy(desc(disputes.createdAt));
  }

  async updateDispute(id: number, updates: Partial<Dispute>): Promise<Dispute> {
    const [updated] = await db
      .update(disputes)
      .set(updates)
      .where(eq(disputes.id, id))
      .returning();
    return updated;
  }

  async resolveDispute(id: number, resolution: string, resolvedBy: string): Promise<Dispute> {
    const [resolved] = await db
      .update(disputes)
      .set({
        status: 'resolved',
        resolution: resolution,
        resolvedBy: resolvedBy,
        resolvedAt: new Date(),
      })
      .where(eq(disputes.id, id))
      .returning();
    return resolved;
  }

  // Bid operations
  async createBid(bidData: InsertBid): Promise<Bid> {
    const [bid] = await db.insert(bids).values(bidData).returning();
    return bid;
  }

  async getBidById(id: number): Promise<Bid | undefined> {
    const [bid] = await db.select().from(bids).where(eq(bids.id, id));
    return bid;
  }

  async getBidsByJobId(jobId: number): Promise<Bid[]> {
    return await db.select().from(bids).where(eq(bids.jobId, jobId)).orderBy(desc(bids.createdAt));
  }

  async getBidsByPrinterId(printerId: number): Promise<Bid[]> {
    return await db.select().from(bids).where(eq(bids.printerId, printerId)).orderBy(desc(bids.createdAt));
  }

  async updateBid(id: number, updates: Partial<Bid>): Promise<Bid> {
    const [updated] = await db
      .update(bids)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(bids.id, id))
      .returning();
    return updated;
  }

  async acceptBid(id: number): Promise<Bid> {
    const [accepted] = await db
      .update(bids)
      .set({ status: 'accepted', updatedAt: new Date() })
      .where(eq(bids.id, id))
      .returning();
    return accepted;
  }

  async rejectBid(id: number): Promise<Bid> {
    const [rejected] = await db
      .update(bids)
      .set({ status: 'rejected', updatedAt: new Date() })
      .where(eq(bids.id, id))
      .returning();
    return rejected;
  }

  async withdrawBid(id: number): Promise<Bid> {
    const [withdrawn] = await db
      .update(bids)
      .set({ status: 'withdrawn', updatedAt: new Date() })
      .where(eq(bids.id, id))
      .returning();
    return withdrawn;
  }
}

export const storage = new DatabaseStorage();
