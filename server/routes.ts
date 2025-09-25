import type { Express } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { storage } from "./storage";
import { setupAuth, isAuthenticated } from "./replitAuth";
import { ObjectStorageService, ObjectNotFoundError } from "./objectStorage";
import { ObjectPermission } from "./objectAcl";
import { insertPrinterSchema, insertJobSchema } from "@shared/schema";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { aiAnalysisService } from "./aiAnalysisService";

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

  // Quality photo upload and AI analysis routes
  app.post("/api/jobs/:id/quality-photos", isAuthenticated, async (req: any, res) => {
    try {
      const jobId = parseInt(req.params.id);
      const { photoUrls } = req.body;
      const userId = req.user?.claims?.sub;

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
      const userId = req.user?.claims?.sub;

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
      const userId = req.user?.claims?.sub;

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
      const userId = req.user?.claims?.sub;
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
          visibility: "public", // STL files need to be public for 3D viewer to access them
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
        const userId = sessData?.passport?.user?.claims?.sub;
        
        if (!userId) {
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
  
  return httpServer;
}
