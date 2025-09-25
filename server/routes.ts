import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, isAuthenticated } from "./replitAuth";
import { ObjectStorageService, ObjectNotFoundError } from "./objectStorage";
import { ObjectPermission } from "./objectAcl";
import { insertPrinterSchema, insertJobSchema } from "@shared/schema";
import { z } from "zod";

export async function registerRoutes(app: Express): Promise<Server> {
  // Auth middleware
  await setupAuth(app);

  // Auth routes
  app.get('/api/auth/user', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub;
      const user = await storage.getUser(userId);
      res.json(user);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  // Object storage routes for STL files and photos
  app.get("/objects/:objectPath(*)", isAuthenticated, async (req, res) => {
    const userId = req.user?.claims?.sub;
    const objectStorageService = new ObjectStorageService();
    try {
      const objectFile = await objectStorageService.getObjectEntityFile(req.path);
      const canAccess = await objectStorageService.canAccessObjectEntity({
        objectFile,
        userId: userId,
        requestedPermission: ObjectPermission.READ,
      });
      if (!canAccess) {
        return res.sendStatus(401);
      }
      objectStorageService.downloadObject(objectFile, res);
    } catch (error) {
      console.error("Error checking object access:", error);
      if (error instanceof ObjectNotFoundError) {
        return res.sendStatus(404);
      }
      return res.sendStatus(500);
    }
  });

  app.post("/api/objects/upload", isAuthenticated, async (req, res) => {
    const objectStorageService = new ObjectStorageService();
    const uploadURL = await objectStorageService.getObjectEntityUploadURL();
    res.json({ uploadURL });
  });

  // Lightning payment routes
  app.post("/api/lightning/invoice", isAuthenticated, async (req, res) => {
    try {
      const { amount, description } = req.body;
      const lnbitsApiKey = process.env.LNBITS_API_KEY || process.env.LNBITS_API_KEY_ENV_VAR || "default_key";
      const lnbitsBaseUrl = process.env.LNBITS_BASE_URL || "https://legend.lnbits.com";

      const response = await fetch(`${lnbitsBaseUrl}/api/v1/payments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Api-Key': lnbitsApiKey
        },
        body: JSON.stringify({
          out: false,
          amount: amount,
          memo: description || "PoH 3D Printing Payment"
        })
      });

      if (!response.ok) {
        throw new Error(`LNbits API error: ${response.status}`);
      }

      const invoice = await response.json();
      res.json(invoice);
    } catch (error) {
      console.error("Error creating Lightning invoice:", error);
      res.status(500).json({ message: "Failed to create Lightning invoice" });
    }
  });

  // Test Lightning endpoint
  app.get("/api/test-lightning", async (req, res) => {
    try {
      const lnbitsApiKey = process.env.LNBITS_API_KEY || process.env.LNBITS_API_KEY_ENV_VAR || "default_key";
      const lnbitsBaseUrl = process.env.LNBITS_BASE_URL || "https://legend.lnbits.com";

      const response = await fetch(`${lnbitsBaseUrl}/api/v1/payments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Api-Key': lnbitsApiKey
        },
        body: JSON.stringify({
          out: false,
          amount: 1000,
          memo: "PoH Test Invoice - 1000 sats"
        })
      });

      if (!response.ok) {
        throw new Error(`LNbits API error: ${response.status}`);
      }

      const invoice = await response.json();
      res.json({ success: true, invoice });
    } catch (error) {
      console.error("Error testing Lightning:", error);
      res.status(500).json({ success: false, message: "Failed to create test Lightning invoice" });
    }
  });

  // Printer routes
  app.post("/api/printers", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub;
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

  app.get("/api/printers/my", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub;
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
      const userId = req.user?.claims?.sub;
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
      const userId = req.user?.claims?.sub;
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
      const userId = req.user?.claims?.sub;

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
      res.json(updatedJob);
    } catch (error) {
      console.error("Error updating job:", error);
      res.status(500).json({ message: "Failed to update job" });
    }
  });

  // STL file upload endpoint
  app.put("/api/stl-files", isAuthenticated, async (req: any, res) => {
    if (!req.body.stlFileURL) {
      return res.status(400).json({ error: "stlFileURL is required" });
    }

    const userId = req.user?.claims?.sub;

    try {
      const objectStorageService = new ObjectStorageService();
      const objectPath = await objectStorageService.trySetObjectEntityAclPolicy(
        req.body.stlFileURL,
        {
          owner: userId,
          visibility: "private",
        },
      );

      res.status(200).json({
        objectPath: objectPath,
      });
    } catch (error) {
      console.error("Error setting STL file:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
