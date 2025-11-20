// BID ROUTES - to be inserted into routes.ts after line 870

  // ==================== BID ROUTES ====================

  // Submit a bid on a job (printer owner only)
  app.post("/api/jobs/:id/bids", isAuthenticated, async (req: any, res) => {
    try {
      const jobId = parseInt(req.params.id);
      const userId = (req.user as any)?.userId;

      // Get job to verify it exists and is open for bidding
      const job = await storage.getJobById(jobId);
      if (!job) {
        return res.status(404).json({ message: "Job not found" });
      }

      // Can't bid on your own job
      if (job.customerId === userId) {
        return res.status(403).json({ message: "Cannot bid on your own job" });
      }

      // Can't bid on assigned jobs
      if (job.printerId) {
        return res.status(400).json({ message: "Job already assigned to a printer" });
      }

      // Get user's printers to verify they are a printer owner
      const userPrinters = await storage.getPrintersByUserId(userId);
      if (userPrinters.length === 0) {
        return res.status(403).json({ message: "You must be a printer owner to submit bids" });
      }

      // Check bid limit (max 5 bids per job)
      const existingBids = await storage.getBidsByJobId(jobId);
      const pendingBids = existingBids.filter(b => b.status === 'pending');
      if (pendingBids.length >= 5) {
        return res.status(400).json({ message: "This job has reached the maximum number of bids (5)" });
      }

      // Validate bid data
      const { insertBidSchema } = await import("@shared/schema");
      const bidData = insertBidSchema.parse({
        ...req.body,
        jobId,
        userId,
      });

      // Check if printer already has a pending bid on this job
      const printerBid = pendingBids.find(b => b.printerId === bidData.printerId);
      if (printerBid) {
        return res.status(400).json({ message: "You already have a pending bid on this job" });
      }

      // Create bid
      const bid = await storage.createBid(bidData);

      // Send notification to job owner
      await storage.createNotification({
        userId: job.customerId,
        type: 'bid_received',
        title: 'New Bid Received',
        message: `You received a new bid of $${bid.amount} for job "${job.fileName}"`,
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

  // Get top 3 bids for a job (customer sees best 3 only)
  app.get("/api/jobs/:id/bids", isAuthenticated, async (req: any, res) => {
    try {
      const jobId = parseInt(req.params.id);
      const userId = (req.user as any)?.userId;

      // Get job
      const job = await storage.getJobById(jobId);
      if (!job) {
        return res.status(404).json({ message: "Job not found" });
      }

      // Get all pending bids for the job
      const allBids = await storage.getBidsByJobId(jobId);
      const pendingBids = allBids.filter(b => b.status === 'pending');

      // If user is job owner, return top 3 bids only (sorted by best value)
      if (job.customerId === userId) {
        // Sort by: 1) price (ascending), 2) completion time (ascending)
        const sortedBids = [...pendingBids].sort((a, b) => {
          const priceDiff = parseFloat(a.amount) - parseFloat(b.amount);
          if (priceDiff !== 0) return priceDiff;
          return a.estimatedCompletionDays - b.estimatedCompletionDays;
        });

        // Take top 3
        const top3Bids = sortedBids.slice(0, 3);

        // Populate printer info for each bid
        const bidsWithPrinters = await Promise.all(
          top3Bids.map(async (bid) => {
            const printer = await storage.getPrinterById(bid.printerId);
            return { ...bid, printer };
          })
        );

        return res.json({
          bids: bidsWithPrinters,
          total: pendingBids.length,
          showing: bidsWithPrinters.length,
        });
      }

      // If user is a printer owner, return only their bids
      const userPrinters = await storage.getPrintersByUserId(userId);
      const userPrinterIds = userPrinters.map((p) => p.id);
      const userBids = allBids.filter((b) => userPrinterIds.includes(b.printerId));

      res.json({
        bids: userBids,
        total: userBids.length,
        showing: userBids.length,
      });
    } catch (error) {
      console.error("Error fetching bids:", error);
      res.status(500).json({ message: "Failed to fetch bids" });
    }
  });

  // Accept a bid (job owner only)
  app.put("/api/bids/:id/accept", isAuthenticated, async (req: any, res) => {
    try {
      const bidId = parseInt(req.params.id);
      const userId = (req.user as any)?.userId;

      // Get bid
      const bid = await storage.getBidById(bidId);
      if (!bid) {
        return res.status(404).json({ message: "Bid not found" });
      }

      // Get job
      const job = await storage.getJobById(bid.jobId);
      if (!job) {
        return res.status(404).json({ message: "Job not found" });
      }

      // Verify user is job owner
      if (job.customerId !== userId) {
        return res.status(403).json({ message: "Only the job owner can accept bids" });
      }

      // Verify bid is still pending
      if (bid.status !== 'pending') {
        return res.status(400).json({ message: "Bid is no longer pending" });
      }

      // Accept the bid
      const acceptedBid = await storage.acceptBid(bidId);

      // Assign job to the printer
      await storage.updateJob(job.id, {
        printerId: bid.printerId,
        finalCost: bid.amount,
        status: 'matched',
      });

      // Reject all other pending bids for this job
      const allBids = await storage.getBidsByJobId(bid.jobId);
      await Promise.all(
        allBids
          .filter((b) => b.id !== bidId && b.status === 'pending')
          .map((b) => storage.rejectBid(b.id))
      );

      // Notify printer owner that their bid was accepted
      await storage.createNotification({
        userId: bid.userId,
        type: 'bid_accepted',
        title: 'Bid Accepted!',
        message: `Your bid of $${bid.amount} was accepted for job "${job.fileName}"`,
        data: { jobId: job.id, bidId: bid.id },
      });

      res.json({ bid: acceptedBid, job: await storage.getJobById(job.id) });
    } catch (error) {
      console.error("Error accepting bid:", error);
      res.status(500).json({ message: "Failed to accept bid" });
    }
  });

  // Reject a bid (job owner only)
  app.put("/api/bids/:id/reject", isAuthenticated, async (req: any, res) => {
    try {
      const bidId = parseInt(req.params.id);
      const userId = (req.user as any)?.userId;

      // Get bid
      const bid = await storage.getBidById(bidId);
      if (!bid) {
        return res.status(404).json({ message: "Bid not found" });
      }

      // Get job
      const job = await storage.getJobById(bid.jobId);
      if (!job) {
        return res.status(404).json({ message: "Job not found" });
      }

      // Verify user is job owner
      if (job.customerId !== userId) {
        return res.status(403).json({ message: "Only the job owner can reject bids" });
      }

      // Reject the bid
      const rejectedBid = await storage.rejectBid(bidId);

      // Notify printer owner
      await storage.createNotification({
        userId: bid.userId,
        type: 'bid_rejected',
        title: 'Bid Not Accepted',
        message: `Your bid for job "${job.fileName}" was not selected`,
        data: { jobId: job.id, bidId: bid.id },
      });

      res.json(rejectedBid);
    } catch (error) {
      console.error("Error rejecting bid:", error);
      res.status(500).json({ message: "Failed to reject bid" });
    }
  });

  // Withdraw a bid (printer owner only)
  app.put("/api/bids/:id/withdraw", isAuthenticated, async (req: any, res) => {
    try {
      const bidId = parseInt(req.params.id);
      const userId = (req.user as any)?.userId;

      // Get bid
      const bid = await storage.getBidById(bidId);
      if (!bid) {
        return res.status(404).json({ message: "Bid not found" });
      }

      // Verify user owns this bid
      if (bid.userId !== userId) {
        return res.status(403).json({ message: "You can only withdraw your own bids" });
      }

      // Verify bid is still pending
      if (bid.status !== 'pending') {
        return res.status(400).json({ message: "Can only withdraw pending bids" });
      }

      // Withdraw the bid
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
