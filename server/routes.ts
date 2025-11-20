import type { Express } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { storage } from "./storage";
import { setupAuth, isAuthenticated, requireRole } from "./auth";
// Object storage removed - not needed for local development
// import { ObjectStorageService, ObjectNotFoundError } from "./objectStorage";
// import { ObjectPermission } from "./objectAcl";
import { insertPrinterSchema, insertJobSchema, insertBidSchema } from "@shared/schema";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { aiAnalysisService } from "./aiAnalysisService";
import { matchingService } from "./matchingService";

export async function registerRoutes(app: Express): Promise<Server> {
  // Auth middleware
  await setupAuth(app);

  // Get current authenticated user
  app.get('/api/auth/user', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.userId;
      const user = await storage.getUser(userId);
      res.json(user);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  // Switch user role
  app.post('/api/auth/switch-role', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.userId;
      const { role } = req.body;
      
      if (!role || !['customer', 'printer_owner'].includes(role)) {
        return res.status(400).json({ message: "Invalid role" });
      }

      const user = await storage.getUser(userId);
      if (!user || !user.roles.includes(role)) {
        return res.status(403).json({ message: "You don't have permission for this role" });
      }

      await storage.updateUserRole(userId, role);
      const updatedUser = await storage.getUser(userId);
      res.json(updatedUser);
    } catch (error) {
      console.error("Error switching role:", error);
      res.status(500).json({ message: "Failed to switch role" });
    }
  });

  // Object storage routes disabled - not needed for local development
  // For production deployment, implement file storage with your chosen provider
  app.post("/api/objects/upload", isAuthenticated, async (req, res) => {
    res.status(501).json({
      error: "File upload not configured",
      message: "Object storage has been disabled for local development"
    });
  });

  // Zaprite payment routes
  const { zapriteService } = await import("./zapriteService");

  // Create Zaprite order for a job (called after job creation)
  app.post("/api/jobs/:id/payment", isAuthenticated, async (req: any, res) => {
    try {
      const jobId = parseInt(req.params.id);
      const job = await storage.getJobById(jobId);

      if (!job) {
        return res.status(404).json({ message: "Job not found" });
      }

      // Verify user owns this job
      const userId = (req.user as any)?.userId;
      if (job.customerId !== userId) {
        return res.status(403).json({ message: "Not authorized to pay for this job" });
      }

      // Check if payment already created
      if (job.zapriteOrderId) {
        return res.json({
          orderId: job.zapriteOrderId,
          checkoutUrl: job.checkoutUrl,
          status: job.paymentStatus,
        });
      }

      // Calculate amount (use estimatedCost or default)
      const amountUSD = parseFloat(job.estimatedCost || "10.00");
      const amountCents = Math.round(amountUSD * 100);

      // Create Zaprite order
      const order = await zapriteService.createOrder({
        amount: amountCents,
        currency: 'USD',
        externalUniqId: jobId.toString(),
        redirectUrl: `${req.protocol}://${req.hostname}/customer/dashboard`,
        label: `3D Print Job #${jobId} - ${job.fileName || 'Print'}`,
        metadata: {
          jobId: jobId,
          customerId: job.customerId,
          fileName: job.fileName,
        },
      });

      // Update job with payment info
      await storage.updateJob(jobId, {
        zapriteOrderId: order.id,
        checkoutUrl: order.checkoutUrl,
        paymentStatus: 'pending',
      });

      res.json({
        orderId: order.id,
        checkoutUrl: order.checkoutUrl,
        status: 'pending',
      });
    } catch (error) {
      console.error("Error creating Zaprite order:", error);
      res.status(500).json({ message: "Failed to create payment order" });
    }
  });

  // Zaprite webhook handler
  // NOTE: Raw body middleware configured in server/index.ts for signature verification
  app.post("/api/webhooks/zaprite", async (req: any, res) => {
    try {
      const signature = req.headers['x-zaprite-signature'] as string;

      // Use raw body for signature verification (captured by middleware)
      const rawBody = req.rawBody || JSON.stringify(req.body);

      // Parse the body for processing
      const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;

      // Verify webhook signature
      // For development, set ZAPRITE_WEBHOOK_SECRET_BYPASS=true
      if (!zapriteService.verifyWebhookSignature(rawBody, signature || '')) {
        console.error("Invalid Zaprite webhook signature");
        return res.status(401).json({ message: "Invalid signature" });
      }

      // Process webhook
      const webhookData = zapriteService.processWebhook(body);
      const jobId = parseInt(webhookData.jobId);

      // Validate job ID
      if (isNaN(jobId)) {
        console.error("Invalid job ID in webhook:", webhookData.jobId);
        return res.status(400).json({ message: "Invalid job ID" });
      }

      // Update job payment status based on event
      let paymentStatus: 'pending' | 'paid' | 'expired' | 'refunded' = 'pending';
      if (webhookData.event === 'order.paid') {
        paymentStatus = 'paid';
      } else if (webhookData.event === 'order.expired') {
        paymentStatus = 'expired';
      }

      await storage.updateJob(jobId, {
        paymentStatus: paymentStatus,
      });

      // If paid, create escrow and update job status to matched
      if (paymentStatus === 'paid') {
        // Get the job to get payment amount
        const job = await storage.getJobById(jobId);
        if (job && job.estimatedCost) {
          // Check if escrow already exists
          const existingEscrow = await storage.getEscrowByJobId(jobId);

          if (!existingEscrow) {
            // Create escrow holding the payment
            await storage.createEscrow({
              jobId: jobId,
              amount: job.estimatedCost,
              status: 'held',
              releaseCondition: 'auto_on_completion',
            });
            console.log(`✅ Escrow created for job ${jobId} - Amount: ${job.estimatedCost}`);
          }
        }

        await storage.updateJob(jobId, {
          status: 'matched',
        });
      }

      res.json({ success: true });
    } catch (error) {
      console.error("Error processing Zaprite webhook:", error);
      res.status(500).json({ message: "Webhook processing failed" });
    }
  });

  // Check payment status for a job
  app.get("/api/jobs/:id/payment-status", isAuthenticated, async (req: any, res) => {
    try {
      const jobId = parseInt(req.params.id);
      const job = await storage.getJobById(jobId);

      if (!job) {
        return res.status(404).json({ message: "Job not found" });
      }

      // Verify user has access to this job
      const userId = (req.user as any)?.userId;
      const userHasAccess = job.customerId === userId ||
        (job.printerId && await storage.getPrinterById(job.printerId).then(p => p?.userId === userId));

      if (!userHasAccess) {
        return res.status(403).json({ message: "Not authorized" });
      }

      res.json({
        paymentStatus: job.paymentStatus,
        zapriteOrderId: job.zapriteOrderId,
        checkoutUrl: job.checkoutUrl,
      });
    } catch (error) {
      console.error("Error checking payment status:", error);
      res.status(500).json({ message: "Failed to check payment status" });
    }
  });

  // Escrow routes
  // Get escrow status for a job
  app.get("/api/escrow/job/:jobId", isAuthenticated, async (req: any, res) => {
    try {
      const jobId = parseInt(req.params.jobId);
      const job = await storage.getJobById(jobId);

      if (!job) {
        return res.status(404).json({ message: "Job not found" });
      }

      // Verify user has access to this job
      const userId = (req.user as any)?.userId;
      const printer = job.printerId ? await storage.getPrinterById(job.printerId) : null;
      const userHasAccess = job.customerId === userId || (printer && printer.userId === userId);

      if (!userHasAccess) {
        return res.status(403).json({ message: "Not authorized" });
      }

      const escrowRecord = await storage.getEscrowByJobId(jobId);

      if (!escrowRecord) {
        return res.status(404).json({ message: "No escrow found for this job" });
      }

      res.json(escrowRecord);
    } catch (error) {
      console.error("Error fetching escrow:", error);
      res.status(500).json({ message: "Failed to fetch escrow" });
    }
  });

  // Release escrow (admin or automated after quality approval)
  app.post("/api/escrow/:id/release", isAuthenticated, async (req: any, res) => {
    try {
      const escrowId = parseInt(req.params.id);
      const userId = (req.user as any)?.userId;

      const escrowRecord = await storage.getEscrowByJobId(escrowId);
      if (!escrowRecord) {
        return res.status(404).json({ message: "Escrow not found" });
      }

      // Get the job to verify permissions
      const job = await storage.getJobById(escrowRecord.jobId);
      if (!job) {
        return res.status(404).json({ message: "Job not found" });
      }

      // Only customer can approve release (or admin in future)
      if (job.customerId !== userId) {
        return res.status(403).json({ message: "Only the customer can release escrow" });
      }

      // Check if job is completed and quality approved
      if (job.status !== 'completed' || !job.qualityScore) {
        return res.status(400).json({
          message: "Job must be completed with quality verification before escrow release"
        });
      }

      // Check quality score threshold (e.g., >= 70/100)
      const qualityScore = parseFloat(job.qualityScore);
      if (qualityScore < 70) {
        return res.status(400).json({
          message: "Quality score too low for automatic escrow release. Please file a dispute if needed."
        });
      }

      // Release the escrow
      const released = await storage.releaseEscrow(escrowRecord.id);

      // Notify printer owner
      if (job.printerId) {
        const printer = await storage.getPrinterById(job.printerId);
        if (printer) {
          await storage.createNotification({
            userId: printer.userId,
            type: 'payment',
            title: 'Payment Released',
            message: `Escrow payment for "${job.fileName || `Job #${job.id}`}" has been released!`,
            data: { jobId: job.id, escrowId: released.id, amount: released.amount }
          });
        }
      }

      res.json({
        message: "Escrow released successfully",
        escrow: released
      });
    } catch (error) {
      console.error("Error releasing escrow:", error);
      res.status(500).json({ message: "Failed to release escrow" });
    }
  });

  // Hold escrow on dispute
  app.post("/api/escrow/:id/hold", isAuthenticated, async (req: any, res) => {
    try {
      const escrowId = parseInt(req.params.id);
      const { reason } = req.body;

      const escrowRecord = await storage.getEscrowByJobId(escrowId);
      if (!escrowRecord) {
        return res.status(404).json({ message: "Escrow not found" });
      }

      // Update escrow status to disputed
      const updated = await storage.updateEscrow(escrowRecord.id, {
        status: 'disputed',
      });

      res.json({
        message: "Escrow placed on hold",
        escrow: updated
      });
    } catch (error) {
      console.error("Error holding escrow:", error);
      res.status(500).json({ message: "Failed to hold escrow" });
    }
  });

  // Dispute routes
  // Create a new dispute
  app.post("/api/disputes", isAuthenticated, async (req: any, res) => {
    try {
      const userId = (req.user as any)?.userId;
      const { jobId, type, description, evidenceUrls } = req.body;

      // Validate required fields
      if (!jobId || !type || !description) {
        return res.status(400).json({
          message: "jobId, type, and description are required"
        });
      }

      // Get the job to determine parties
      const job = await storage.getJobById(jobId);
      if (!job) {
        return res.status(404).json({ message: "Job not found" });
      }

      // Verify user is involved in the job
      const printer = job.printerId ? await storage.getPrinterById(job.printerId) : null;
      const isCustomer = job.customerId === userId;
      const isPrinterOwner = printer && printer.userId === userId;

      if (!isCustomer && !isPrinterOwner) {
        return res.status(403).json({
          message: "You can only file disputes for jobs you're involved in"
        });
      }

      // Determine respondent (the other party)
      const respondentId = isCustomer ? (printer?.userId || job.customerId) : job.customerId;

      // Create the dispute
      const dispute = await storage.createDispute({
        jobId,
        initiatorId: userId,
        respondentId,
        type,
        description,
        status: 'open',
        evidenceUrls: evidenceUrls || null,
      });

      // Place escrow on hold if it exists
      const escrowRecord = await storage.getEscrowByJobId(jobId);
      if (escrowRecord && escrowRecord.status === 'held') {
        await storage.updateEscrow(escrowRecord.id, {
          status: 'disputed',
        });
      }

      // Notify the respondent
      await storage.createNotification({
        userId: respondentId,
        type: 'dispute',
        title: 'New Dispute Filed',
        message: `A dispute has been filed for "${job.fileName || `Job #${job.id}`}" - Type: ${type}`,
        data: { disputeId: dispute.id, jobId, type }
      });

      // Notify the initiator
      await storage.createNotification({
        userId,
        type: 'dispute',
        title: 'Dispute Created',
        message: `Your dispute for "${job.fileName || `Job #${job.id}`}" has been filed and is under review`,
        data: { disputeId: dispute.id, jobId, type }
      });

      res.json({
        message: "Dispute created successfully",
        dispute
      });
    } catch (error) {
      console.error("Error creating dispute:", error);
      res.status(500).json({ message: "Failed to create dispute" });
    }
  });

  // Get all disputes for the authenticated user
  app.get("/api/disputes/my", isAuthenticated, async (req: any, res) => {
    try {
      const userId = (req.user as any)?.userId;
      const disputes = await storage.getDisputesByUserId(userId);
      res.json(disputes);
    } catch (error) {
      console.error("Error fetching user disputes:", error);
      res.status(500).json({ message: "Failed to fetch disputes" });
    }
  });

  // Get disputes for a specific job
  app.get("/api/disputes/job/:jobId", isAuthenticated, async (req: any, res) => {
    try {
      const jobId = parseInt(req.params.jobId);
      const userId = (req.user as any)?.userId;

      // Verify user has access to this job
      const job = await storage.getJobById(jobId);
      if (!job) {
        return res.status(404).json({ message: "Job not found" });
      }

      const printer = job.printerId ? await storage.getPrinterById(job.printerId) : null;
      const hasAccess = job.customerId === userId || (printer && printer.userId === userId);

      if (!hasAccess) {
        return res.status(403).json({ message: "Not authorized" });
      }

      const disputes = await storage.getDisputesByJobId(jobId);
      res.json(disputes);
    } catch (error) {
      console.error("Error fetching job disputes:", error);
      res.status(500).json({ message: "Failed to fetch disputes" });
    }
  });

  // Get single dispute details
  app.get("/api/disputes/:id", isAuthenticated, async (req: any, res) => {
    try {
      const disputeId = parseInt(req.params.id);
      const userId = (req.user as any)?.userId;

      const dispute = await storage.getDisputeById(disputeId);
      if (!dispute) {
        return res.status(404).json({ message: "Dispute not found" });
      }

      // Verify user is involved in the dispute
      if (dispute.initiatorId !== userId && dispute.respondentId !== userId) {
        return res.status(403).json({ message: "Not authorized" });
      }

      res.json(dispute);
    } catch (error) {
      console.error("Error fetching dispute:", error);
      res.status(500).json({ message: "Failed to fetch dispute" });
    }
  });

  // Update dispute (add evidence, escalate, etc.)
  app.put("/api/disputes/:id", isAuthenticated, async (req: any, res) => {
    try {
      const disputeId = parseInt(req.params.id);
      const userId = (req.user as any)?.userId;
      const updates = req.body;

      const dispute = await storage.getDisputeById(disputeId);
      if (!dispute) {
        return res.status(404).json({ message: "Dispute not found" });
      }

      // Verify user is involved in the dispute
      if (dispute.initiatorId !== userId && dispute.respondentId !== userId) {
        return res.status(403).json({ message: "Not authorized" });
      }

      // Prevent changing certain fields via this route
      delete updates.resolvedBy;
      delete updates.resolvedAt;

      const updated = await storage.updateDispute(disputeId, updates);

      res.json({
        message: "Dispute updated successfully",
        dispute: updated
      });
    } catch (error) {
      console.error("Error updating dispute:", error);
      res.status(500).json({ message: "Failed to update dispute" });
    }
  });

  // Resolve dispute (customer, printer owner, or admin)
  app.post("/api/disputes/:id/resolve", isAuthenticated, async (req: any, res) => {
    try {
      const disputeId = parseInt(req.params.id);
      const userId = (req.user as any)?.userId;
      const { resolution, releaseEscrow } = req.body;

      if (!resolution) {
        return res.status(400).json({ message: "Resolution text is required" });
      }

      const dispute = await storage.getDisputeById(disputeId);
      if (!dispute) {
        return res.status(404).json({ message: "Dispute not found" });
      }

      // For now, allow both parties to resolve (mutual agreement)
      // In production, you might want admin-only resolution
      if (dispute.initiatorId !== userId && dispute.respondentId !== userId) {
        return res.status(403).json({ message: "Not authorized to resolve this dispute" });
      }

      // Resolve the dispute
      const resolved = await storage.resolveDispute(disputeId, resolution, userId);

      // Get the job
      const job = await storage.getJobById(dispute.jobId);

      // Handle escrow based on resolution
      if (job && releaseEscrow !== undefined) {
        const escrowRecord = await storage.getEscrowByJobId(dispute.jobId);
        if (escrowRecord) {
          if (releaseEscrow === true) {
            await storage.releaseEscrow(escrowRecord.id);
          } else {
            // Keep held or handle refund
            await storage.updateEscrow(escrowRecord.id, {
              status: 'held'
            });
          }
        }
      }

      // Notify both parties
      await storage.createNotification({
        userId: dispute.initiatorId,
        type: 'dispute',
        title: 'Dispute Resolved',
        message: `Dispute for "${job?.fileName || `Job #${dispute.jobId}`}" has been resolved`,
        data: { disputeId, resolution }
      });

      await storage.createNotification({
        userId: dispute.respondentId,
        type: 'dispute',
        title: 'Dispute Resolved',
        message: `Dispute for "${job?.fileName || `Job #${dispute.jobId}`}" has been resolved`,
        data: { disputeId, resolution }
      });

      res.json({
        message: "Dispute resolved successfully",
        dispute: resolved
      });
    } catch (error) {
      console.error("Error resolving dispute:", error);
      res.status(500).json({ message: "Failed to resolve dispute" });
    }
  });

  // Printer routes
  app.post("/api/printers", isAuthenticated, requireRole('printer_owner'), async (req: any, res) => {
    try {
      const userId = (req.user as any)?.userId;
      const printerData = insertPrinterSchema.parse({
        ...req.body,
        userId
      });

      const printer = await storage.createPrinter(printerData);
      res.json(printer);
    } catch (error) {
      console.error("Error creating printer:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid printer data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create printer" });
    }
  });

  app.get("/api/printers", async (req, res) => {
    try {
      const printers = await storage.getAllPrinters();
      res.json(printers);
    } catch (error) {
      console.error("Error fetching printers:", error);
      res.status(500).json({ message: "Failed to fetch printers" });
    }
  });

  app.get("/api/printers/search", async (req, res) => {
    try {
      const { materials, location, minPrice, maxPrice, status } = req.query;
      
      const filters: any = {};
      
      // Parse materials from comma-separated string
      if (materials && typeof materials === 'string') {
        filters.materials = materials.split(',').map(m => m.trim()).filter(Boolean);
      }
      
      if (location && typeof location === 'string') {
        filters.location = location.trim();
      }
      
      if (minPrice && typeof minPrice === 'string') {
        const parsed = parseFloat(minPrice);
        if (!isNaN(parsed)) filters.minPrice = parsed;
      }
      
      if (maxPrice && typeof maxPrice === 'string') {
        const parsed = parseFloat(maxPrice);
        if (!isNaN(parsed)) filters.maxPrice = parsed;
      }
      
      if (status && typeof status === 'string') {
        filters.status = status;
      }
      
      const printers = await storage.searchPrinters(filters);
      res.json(printers);
    } catch (error) {
      console.error("Error searching printers:", error);
      res.status(500).json({ message: "Failed to search printers" });
    }
  });

  app.get("/api/printers/my", isAuthenticated, requireRole('printer_owner'), async (req: any, res) => {
    try {
      const userId = (req.user as any)?.userId;
      const printers = await storage.getPrintersByUserId(userId);
      res.json(printers);
    } catch (error) {
      console.error("Error fetching user printers:", error);
      res.status(500).json({ message: "Failed to fetch printers" });
    }
  });

  // Job routes
  app.post("/api/jobs", isAuthenticated, async (req: any, res) => {
    try {
      const userId = (req.user as any)?.userId;
      const jobData = insertJobSchema.parse({
        ...req.body,
        customerId: userId
      });

      const job = await storage.createJob(jobData);
      res.json(job);
    } catch (error) {
      console.error("Error creating job:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid job data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create job" });
    }
  });

  app.get("/api/jobs", isAuthenticated, async (req, res) => {
    try {
      const jobs = await storage.getAllJobs();
      res.json(jobs);
    } catch (error) {
      console.error("Error fetching jobs:", error);
      res.status(500).json({ message: "Failed to fetch jobs" });
    }
  });

  app.get("/api/jobs/my", isAuthenticated, async (req: any, res) => {
    try {
      const userId = (req.user as any)?.userId;
      const jobs = await storage.getJobsByCustomerId(userId);
      res.json(jobs);
    } catch (error) {
      console.error("Error fetching user jobs:", error);
      res.status(500).json({ message: "Failed to fetch jobs" });
    }
  });

  app.put("/api/jobs/:id", isAuthenticated, async (req: any, res) => {
    try {
      const jobId = parseInt(req.params.id);
      const updates = req.body;
      const userId = (req.user as any)?.userId;

      // If updating with printerId (job acceptance), validate printer eligibility
      if (updates.printerId && updates.status === 'matched') {
        // Get the job to check material requirements
        const job = await storage.getJobById(jobId);
        if (!job) {
          return res.status(404).json({ message: "Job not found" });
        }

        // Get the printer to validate ownership, availability, and materials
        const printer = await storage.getPrinterById(updates.printerId);
        if (!printer) {
          return res.status(400).json({ message: "Invalid printer selected" });
        }

        // Validate printer ownership
        if (printer.userId !== userId) {
          return res.status(403).json({ message: "You can only assign your own printers to jobs" });
        }

        // Validate printer availability
        if (printer.status !== 'available') {
          return res.status(400).json({ message: "Selected printer is not available" });
        }

        // Validate material compatibility
        if (job.material && !printer.materials.includes(job.material)) {
          return res.status(400).json({
            message: `Selected printer does not support ${job.material}. Supported materials: ${printer.materials.join(', ')}`
          });
        }

        // Prevent users from accepting their own jobs
        if (job.customerId === userId) {
          return res.status(400).json({ message: "You cannot accept your own print jobs" });
        }
      }

      const updatedJob = await storage.updateJob(jobId, updates);

      // Broadcast real-time job update if status changed
      if (updates.status) {
        await (httpServer as any).broadcastJobUpdate(jobId, updates.status);
      }

      res.json(updatedJob);
    } catch (error) {
      console.error("Error updating job:", error);
      res.status(500).json({ message: "Failed to update job" });
    }
  });

  // Job matching routes
  // Get recommended printers for a job
  app.get("/api/jobs/:id/matches", isAuthenticated, async (req: any, res) => {
    try {
      const jobId = parseInt(req.params.id);
      const userId = (req.user as any)?.userId;
      const limit = parseInt(req.query.limit as string) || 10;

      // Verify job exists and user has access
      const job = await storage.getJobById(jobId);
      if (!job) {
        return res.status(404).json({ message: "Job not found" });
      }

      if (job.customerId !== userId) {
        return res.status(403).json({ message: "Not authorized to view matches for this job" });
      }

      // Get matches
      const matches = await matchingService.findMatches(jobId, limit);

      res.json({
        jobId,
        matches,
        total: matches.length,
      });
    } catch (error) {
      console.error("Error finding job matches:", error);
      res.status(500).json({ message: "Failed to find matches" });
    }
  });

  // Get best match for a job
  app.get("/api/jobs/:id/best-match", isAuthenticated, async (req: any, res) => {
    try {
      const jobId = parseInt(req.params.id);
      const userId = (req.user as any)?.userId;

      // Verify job exists and user has access
      const job = await storage.getJobById(jobId);
      if (!job) {
        return res.status(404).json({ message: "Job not found" });
      }

      if (job.customerId !== userId) {
        return res.status(403).json({ message: "Not authorized" });
      }

      const bestMatch = await matchingService.getBestMatch(jobId);

      if (!bestMatch) {
        return res.status(404).json({ message: "No suitable printers found" });
      }

      res.json(bestMatch);
    } catch (error) {
      console.error("Error finding best match:", error);
      res.status(500).json({ message: "Failed to find best match" });
    }
  });

  // Get matches with custom criteria
  app.post("/api/jobs/:id/matches/search", isAuthenticated, async (req: any, res) => {
    try {
      const jobId = parseInt(req.params.id);
      const userId = (req.user as any)?.userId;
      const { location, material, maxPrice, minRating, limit } = req.body;

      // Verify job exists and user has access
      const job = await storage.getJobById(jobId);
      if (!job) {
        return res.status(404).json({ message: "Job not found" });
      }

      if (job.customerId !== userId) {
        return res.status(403).json({ message: "Not authorized" });
      }

      const matches = await matchingService.findMatchesWithCriteria(
        jobId,
        { location, material, maxPrice, minRating },
        limit || 10
      );

      res.json({
        jobId,
        matches,
        total: matches.length,
        criteria: { location, material, maxPrice, minRating },
      });
    } catch (error) {
      console.error("Error searching matches:", error);
      res.status(500).json({ message: "Failed to search matches" });
    }
  });

  // ==================== BID ROUTES ====================

  // Submit a bid on a job (printer owner only)
  app.post("/api/jobs/:id/bids", isAuthenticated, async (req: any, res) => {
    try {
      const jobId = parseInt(req.params.id);
      const userId = (req.user as any)?.userId;
      const job = await storage.getJobById(jobId);
      
      if (!job) return res.status(404).json({ message: "Job not found" });
      if (job.customerId === userId) return res.status(403).json({ message: "Cannot bid on your own job" });
      if (job.printerId) return res.status(400).json({ message: "Job already assigned" });

      const userPrinters = await storage.getPrintersByUserId(userId);
      if (userPrinters.length === 0) {
        return res.status(403).json({ message: "You must be a printer owner to submit bids" });
      }

      const existingBids = await storage.getBidsByJobId(jobId);
      const pendingBids = existingBids.filter(b => b.status === 'pending');
      if (pendingBids.length >= 5) {
        return res.status(400).json({ message: "Maximum 5 bids reached for this job" });
      }

      const bidData = insertBidSchema.parse({ ...req.body, jobId, userId });
      const printerBid = pendingBids.find(b => b.printerId === bidData.printerId);
      if (printerBid) {
        return res.status(400).json({ message: "You already have a pending bid on this job" });
      }

      const bid = await storage.createBid(bidData);
      await storage.createNotification({
        userId: job.customerId,
        type: 'bid_received',
        title: 'New Bid Received',
        message: `New bid of $${bid.amount} for "${job.fileName}"`,
        data: { jobId, bidId: bid.id },
      });

      res.status(201).json(bid);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid bid data", errors: error.errors });
      }
      console.error("Error creating bid:", error);
      res.status(500).json({ message: "Failed to create bid" });
    }
  });

  // Get top 3 bids for a job
  app.get("/api/jobs/:id/bids", isAuthenticated, async (req: any, res) => {
    try {
      const jobId = parseInt(req.params.id);
      const userId = (req.user as any)?.userId;
      const job = await storage.getJobById(jobId);
      
      if (!job) return res.status(404).json({ message: "Job not found" });

      const allBids = await storage.getBidsByJobId(jobId);
      const pendingBids = allBids.filter(b => b.status === 'pending');

      if (job.customerId === userId) {
        const sortedBids = [...pendingBids].sort((a, b) => {
          const priceDiff = parseFloat(a.amount) - parseFloat(b.amount);
          return priceDiff !== 0 ? priceDiff : a.estimatedCompletionDays - b.estimatedCompletionDays;
        });

        const top3Bids = sortedBids.slice(0, 3);
        const bidsWithPrinters = await Promise.all(
          top3Bids.map(async (bid) => ({
            ...bid,
            printer: await storage.getPrinterById(bid.printerId)
          }))
        );

        return res.json({ bids: bidsWithPrinters, total: pendingBids.length, showing: bidsWithPrinters.length });
      }

      const userPrinters = await storage.getPrintersByUserId(userId);
      const userPrinterIds = userPrinters.map(p => p.id);
      const userBids = allBids.filter(b => userPrinterIds.includes(b.printerId));

      res.json({ bids: userBids, total: userBids.length, showing: userBids.length });
    } catch (error) {
      console.error("Error fetching bids:", error);
      res.status(500).json({ message: "Failed to fetch bids" });
    }
  });

  // Accept a bid
  app.put("/api/bids/:id/accept", isAuthenticated, async (req: any, res) => {
    try {
      const bidId = parseInt(req.params.id);
      const userId = (req.user as any)?.userId;
      const bid = await storage.getBidById(bidId);
      
      if (!bid) return res.status(404).json({ message: "Bid not found" });

      const job = await storage.getJobById(bid.jobId);
      if (!job) return res.status(404).json({ message: "Job not found" });
      if (job.customerId !== userId) return res.status(403).json({ message: "Only job owner can accept bids" });
      if (bid.status !== 'pending') return res.status(400).json({ message: "Bid is no longer pending" });

      const acceptedBid = await storage.acceptBid(bidId);
      await storage.updateJob(job.id, { printerId: bid.printerId, finalCost: bid.amount, status: 'matched' });

      const allBids = await storage.getBidsByJobId(bid.jobId);
      await Promise.all(
        allBids.filter(b => b.id !== bidId && b.status === 'pending').map(b => storage.rejectBid(b.id))
      );

      await storage.createNotification({
        userId: bid.userId,
        type: 'bid_accepted',
        title: 'Bid Accepted!',
        message: `Your bid of $${bid.amount} was accepted for "${job.fileName}"`,
        data: { jobId: job.id, bidId: bid.id },
      });

      res.json({ bid: acceptedBid, job: await storage.getJobById(job.id) });
    } catch (error) {
      console.error("Error accepting bid:", error);
      res.status(500).json({ message: "Failed to accept bid" });
    }
  });

  // Withdraw a bid
  app.put("/api/bids/:id/withdraw", isAuthenticated, async (req: any, res) => {
    try {
      const bidId = parseInt(req.params.id);
      const userId = (req.user as any)?.userId;
      const bid = await storage.getBidById(bidId);

      if (!bid) return res.status(404).json({ message: "Bid not found" });
      if (bid.userId !== userId) return res.status(403).json({ message: "You can only withdraw your own bids" });
      if (bid.status !== 'pending') return res.status(400).json({ message: "Can only withdraw pending bids" });

      const withdrawnBid = await storage.withdrawBid(bidId);
      res.json(withdrawnBid);
    } catch (error) {
      console.error("Error withdrawing bid:", error);
      res.status(500).json({ message: "Failed to withdraw bid" });
    }
  });

  // Get all bids for a printer (printer owner only)
  app.get("/api/printers/:id/bids", isAuthenticated, async (req: any, res) => {
    try {
      const printerId = parseInt(req.params.id);
      const userId = (req.user as any)?.userId;

      // Get printer
      const printer = await storage.getPrinterById(printerId);
      if (!printer) {
        return res.status(404).json({ message: "Printer not found" });
      }

      // Verify user owns this printer
      if (printer.userId !== userId) {
        return res.status(403).json({ message: "Not authorized" });
      }

      // Get all bids for this printer
      const bids = await storage.getBidsByPrinterId(printerId);

      // Populate job info for each bid
      const bidsWithJobs = await Promise.all(
        bids.map(async (bid) => {
          const job = await storage.getJobById(bid.jobId);
          return { ...bid, job };
        })
      );

      res.json(bidsWithJobs);
    } catch (error) {
      console.error("Error fetching printer bids:", error);
      res.status(500).json({ message: "Failed to fetch bids" });
    }
  });


  // Quality photo upload and AI analysis routes
  app.post("/api/jobs/:id/quality-photos", isAuthenticated, async (req: any, res) => {
    try {
      const jobId = parseInt(req.params.id);
      const { photoUrls } = req.body;
      const userId = (req.user as any)?.userId;

      if (!Array.isArray(photoUrls) || photoUrls.length === 0) {
        return res.status(400).json({ message: "photoUrls array is required" });
      }

      // Validate job exists and user has permission
      const job = await storage.getJobById(jobId);
      if (!job) {
        return res.status(404).json({ message: "Job not found" });
      }

      // Allow both customer and printer owner to upload quality photos
      const printer = job.printerId ? await storage.getPrinterById(job.printerId) : null;
      const hasPermission = job.customerId === userId || (printer && printer.userId === userId);
      
      if (!hasPermission) {
        return res.status(403).json({ message: "You don't have permission to upload photos for this job" });
      }

      // Update job with quality photos
      const updatedJob = await storage.updateJob(jobId, { 
        qualityPhotos: photoUrls 
      });

      res.json({ 
        message: "Quality photos uploaded successfully",
        job: updatedJob,
        analysisTriggered: false
      });

    } catch (error) {
      console.error("Error uploading quality photos:", error);
      res.status(500).json({ message: "Failed to upload quality photos" });
    }
  });

  app.post("/api/jobs/:id/analyze-quality", isAuthenticated, async (req: any, res) => {
    try {
      const jobId = parseInt(req.params.id);
      const userId = (req.user as any)?.userId;

      // Get the job and validate permissions
      const job = await storage.getJobById(jobId);
      if (!job) {
        return res.status(404).json({ message: "Job not found" });
      }

      // Allow both customer and printer owner to trigger analysis
      const printer = job.printerId ? await storage.getPrinterById(job.printerId) : null;
      const hasPermission = job.customerId === userId || (printer && printer.userId === userId);
      
      if (!hasPermission) {
        return res.status(403).json({ message: "You don't have permission to analyze this job" });
      }

      // Check if quality photos exist
      if (!job.qualityPhotos || !Array.isArray(job.qualityPhotos) || job.qualityPhotos.length === 0) {
        return res.status(400).json({ message: "No quality photos available for analysis. Upload photos first." });
      }

      // Trigger AI analysis
      console.log(`Starting AI analysis for job ${jobId} with ${job.qualityPhotos.length} photos`);
      const analysisResult = await aiAnalysisService.analyzeQualityPhotos(job.qualityPhotos);

      // Update job with analysis results
      const updatedJob = await storage.updateJob(jobId, {
        qualityScore: analysisResult.overallScore.toString(),
        aiAnalysis: analysisResult
      });

      // Broadcast real-time update for AI analysis completion
      await (httpServer as any).broadcastJobUpdate(jobId, 'quality_analyzed');

      // Create notifications for both customer and printer owner
      await storage.createNotification({
        userId: job.customerId,
        type: 'quality_analysis',
        title: 'Quality Analysis Complete',
        message: `AI analysis completed for "${job.fileName || `Job #${job.id}`}" - Quality Score: ${analysisResult.overallScore}/100`,
        data: { jobId, qualityScore: analysisResult.overallScore, defectsCount: analysisResult.defects.length }
      });

      if (printer) {
        await storage.createNotification({
          userId: printer.userId,
          type: 'quality_analysis',
          title: 'Quality Analysis Complete',
          message: `AI analysis completed for "${job.fileName || `Job #${job.id}`}" - Quality Score: ${analysisResult.overallScore}/100`,
          data: { jobId, qualityScore: analysisResult.overallScore, defectsCount: analysisResult.defects.length }
        });
      }

      res.json({
        message: "Quality analysis completed successfully",
        job: updatedJob,
        analysis: analysisResult
      });

    } catch (error) {
      console.error("Error analyzing quality photos:", error);
      res.status(500).json({ message: "Failed to analyze quality photos" });
    }
  });

  app.get("/api/jobs/:id/quality-analysis", isAuthenticated, async (req: any, res) => {
    try {
      const jobId = parseInt(req.params.id);
      const userId = (req.user as any)?.userId;

      // Get the job and validate permissions
      const job = await storage.getJobById(jobId);
      if (!job) {
        return res.status(404).json({ message: "Job not found" });
      }

      // Allow both customer and printer owner to view analysis
      const printer = job.printerId ? await storage.getPrinterById(job.printerId) : null;
      const hasPermission = job.customerId === userId || (printer && printer.userId === userId);
      
      if (!hasPermission) {
        return res.status(403).json({ message: "You don't have permission to view this analysis" });
      }

      res.json({
        jobId: job.id,
        qualityPhotos: job.qualityPhotos || [],
        qualityScore: job.qualityScore ? parseFloat(job.qualityScore) : null,
        aiAnalysis: job.aiAnalysis || null,
        hasAnalysis: !!(job.qualityScore && job.aiAnalysis)
      });

    } catch (error) {
      console.error("Error fetching quality analysis:", error);
      res.status(500).json({ message: "Failed to fetch quality analysis" });
    }
  });

  // Notification routes
  app.get("/api/notifications", isAuthenticated, async (req: any, res) => {
    try {
      const userId = (req.user as any)?.userId;
      const notifications = await storage.getUserNotifications(userId);
      res.json(notifications);
    } catch (error) {
      console.error("Error fetching notifications:", error);
      res.status(500).json({ message: "Failed to fetch notifications" });
    }
  });

  app.put("/api/notifications/:id/read", isAuthenticated, async (req: any, res) => {
    try {
      const notificationId = parseInt(req.params.id);
      await storage.markNotificationRead(notificationId);
      res.json({ success: true });
    } catch (error) {
      console.error("Error marking notification read:", error);
      res.status(500).json({ message: "Failed to mark notification as read" });
    }
  });

  // STL file upload endpoint - disabled (object storage removed)
  app.put("/api/stl-files", isAuthenticated, async (req: any, res) => {
    res.status(501).json({
      error: "File upload not configured",
      message: "Object storage has been disabled for local development"
    });
  });

  const httpServer = createServer(app);
  
  // WebSocket Server Setup - Only on /api/ws path to avoid Vite conflicts
  const wss = new WebSocketServer({ 
    server: httpServer,
    path: '/api/ws'
  });
  
  // Store authenticated WebSocket connections
  const authenticatedConnections = new Map<string, WebSocket[]>();
  
  wss.on('connection', (ws: WebSocket, req) => {
    console.log('WebSocket connection attempt');
    
    let authenticatedUserId: string | null = null;
    
    // Immediately validate session from upgrade request
    const validateSession = async (): Promise<string | null> => {
      try {
        // Create a mock request/response to leverage existing session middleware
        const mockReq = {
          headers: req.headers,
          session: null as any,
          sessionID: null as any,
        };
        
        // Use existing Replit Auth session parsing
        const cookies = req.headers.cookie || '';
        const sessionMatch = cookies.match(/connect\.sid=([^;]+)/);
        if (!sessionMatch) {
          return null;
        }
        
        let sessionId = decodeURIComponent(sessionMatch[1]);
        
        // Handle signed cookie format: s:<id>.<signature>
        if (sessionId.startsWith('s:')) {
          sessionId = sessionId.slice(2); // Remove 's:' prefix
          const dotIndex = sessionId.indexOf('.');
          if (dotIndex !== -1) {
            sessionId = sessionId.substring(0, dotIndex); // Extract session ID before signature
          }
        }
        
        // Import the session store to validate the session  
        const { db } = await import('./db');
        const { sessions } = await import('@shared/schema');
        
        // Query session directly from database
        const [sessionData] = await db
          .select()
          .from(sessions)
          .where(eq(sessions.sid, sessionId));
          
        if (!sessionData || new Date() > sessionData.expire) {
          return null;
        }
        
        // Extract user ID from session data
        const sessData = sessionData.sess;
        const userId = sessData?.passport?.user; // userId is serialized directly as a string

        if (!userId || typeof userId !== 'string') {
          return null;
        }

        // Verify user exists
        const user = await storage.getUser(userId);
        return user ? userId : null;
        
      } catch (error) {
        console.error('Session validation error:', error);
        return null;
      }
    };
    
    ws.on('message', async (data) => {
      try {
        const message = JSON.parse(data.toString());
        
        // Handle authentication - derive userId from session, not client
        if (message.type === 'authenticate') {
          if (authenticatedUserId) {
            ws.send(JSON.stringify({
              type: 'error',
              message: 'Already authenticated'
            }));
            return;
          }
          
          // Validate session and get real userId
          const validatedUserId = await validateSession();
          if (!validatedUserId) {
            ws.send(JSON.stringify({
              type: 'error',
              message: 'Authentication failed. Please log in first.'
            }));
            ws.close();
            return;
          }

          authenticatedUserId = validatedUserId;
          
          // Add connection to user's connections
          if (!authenticatedConnections.has(authenticatedUserId)) {
            authenticatedConnections.set(authenticatedUserId, []);
          }
          authenticatedConnections.get(authenticatedUserId)!.push(ws);
          
          ws.send(JSON.stringify({
            type: 'authenticated',
            message: 'Successfully authenticated',
            userId: authenticatedUserId
          }));
          
          console.log(`WebSocket authenticated for user: ${authenticatedUserId}`);
          
          // Send unread notifications on connection
          try {
            const notifications = await storage.getUnreadNotifications(authenticatedUserId);
            if (notifications.length > 0) {
              ws.send(JSON.stringify({
                type: 'notifications',
                data: notifications
              }));
            }
          } catch (error) {
            console.error('Error fetching notifications:', error);
          }
        }

        // Handle marking notifications as read
        if (message.type === 'mark_read' && authenticatedUserId) {
          try {
            const { notificationId } = message;
            await storage.markNotificationRead(notificationId);
            ws.send(JSON.stringify({
              type: 'notification_marked_read',
              notificationId
            }));
          } catch (error) {
            console.error('Error marking notification read:', error);
          }
        }
      } catch (error) {
        console.error('WebSocket message error:', error);
      }
    });
    
    ws.on('close', () => {
      // Remove connection from all user arrays
      for (const [userId, connections] of authenticatedConnections.entries()) {
        const index = connections.indexOf(ws);
        if (index > -1) {
          connections.splice(index, 1);
          if (connections.length === 0) {
            authenticatedConnections.delete(userId);
          }
          console.log(`WebSocket disconnected for user: ${userId}`);
          break;
        }
      }
    });
  });
  
  // Global WebSocket broadcast functions
  const broadcastToUser = (userId: string, message: any) => {
    const connections = authenticatedConnections.get(userId);
    if (connections) {
      const messageStr = JSON.stringify(message);
      connections.forEach(ws => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(messageStr);
        }
      });
    }
  };
  
  const broadcastJobUpdate = async (jobId: number, status: string) => {
    try {
      const job = await storage.getJobById(jobId);
      if (!job) return;
      
      // Notify customer
      await storage.createNotification({
        userId: job.customerId,
        type: 'job_update',
        title: 'Job Status Update',
        message: `Your print job "${job.fileName || `Job #${job.id}`}" status changed to ${status}`,
        data: { jobId, status, fileName: job.fileName }
      });
      
      // Notify printer owner if assigned
      if (job.printerId) {
        const printer = await storage.getPrinterById(job.printerId);
        if (printer) {
          await storage.createNotification({
            userId: printer.userId,
            type: 'job_update',
            title: 'Job Status Update',
            message: `Print job "${job.fileName || `Job #${job.id}`}" status changed to ${status}`,
            data: { jobId, status, fileName: job.fileName }
          });
          
          // Broadcast to printer owner
          broadcastToUser(printer.userId, {
            type: 'job_update',
            data: { jobId, status, job }
          });
        }
      }
      
      // Broadcast to customer
      broadcastToUser(job.customerId, {
        type: 'job_update',
        data: { jobId, status, job }
      });
      
    } catch (error) {
      console.error('Error broadcasting job update:', error);
    }
  };
  
  // Attach broadcast functions to the server for use in routes
  (httpServer as any).broadcastToUser = broadcastToUser;
  (httpServer as any).broadcastJobUpdate = broadcastJobUpdate;
  
  // Development-only endpoint to simulate payment completion
  if (process.env.NODE_ENV === 'development' && process.env.DEV_FAKE_PAYMENTS === 'true') {
    app.post("/api/dev/payments/:jobId/mark-paid", isAuthenticated, async (req, res) => {
      try {
        const jobId = parseInt(req.params.jobId);
        const userId = (req.user as any)?.userId;

        const job = await storage.getJobById(jobId);
        if (!job) {
          return res.status(404).json({ message: "Job not found" });
        }

        if (job.customerId !== userId) {
          return res.status(403).json({ message: "Not authorized" });
        }

        // Create escrow if it doesn't exist
        const existingEscrow = await storage.getEscrowByJobId(jobId);
        if (!existingEscrow && job.estimatedCost) {
          await storage.createEscrow({
            jobId: jobId,
            amount: job.estimatedCost,
            status: 'held',
            releaseCondition: 'auto_on_completion',
          });
          console.log(`🧪 DEV: Escrow created for job ${jobId}`);
        }

        // Simulate payment completion
        await storage.updateJob(jobId, {
          paymentStatus: 'paid',
          status: 'matched',
        });

        console.log(`🧪 DEV: Marked job ${jobId} as paid (simulated)`);
        res.json({ success: true, message: "Payment simulated successfully" });
      } catch (error) {
        console.error("Error simulating payment:", error);
        res.status(500).json({ message: "Failed to simulate payment" });
      }
    });
  }
  
  return httpServer;
}
