# Development Testing Guide

This guide will help you test the complete bidding workflow using fake printers and automated bidding.

---

## 🎨 Visual UI Testing (Easiest!)

**Want to see the bidding UI without any setup?**

Go to: **`http://localhost:3000/dev/bid-sim`**

This page shows:
- ✅ Interactive mock job card with expandable section
- ✅ Top 3 competitive bids with real UI components
- ✅ Printer details, ratings, and notes
- ✅ Accept bid button (demo mode)
- ✅ No setup required - just view and test the UI!

**Perfect for:**
- Testing UI/UX flow
- Showing stakeholders the bidding interface
- QA testing without database setup
- Design review and feedback

---

## Quick Start: Full Workflow Test

### 1. Seed Fake Printers (One-Time Setup)

Run this once to create 5 fake printers:

```bash
curl -X POST http://localhost:3000/api/dev/seed-printers
```

**Response:**
```json
{
  "success": true,
  "message": "Seeded 5 fake printers",
  "printers": [
    { "id": 1, "name": "SpeedPrint Pro", "price": "0.15" },
    { "id": 2, "name": "Budget Builds 3D", "price": "0.08" },
    { "id": 3, "name": "Premium Precision Lab", "price": "0.25" },
    { "id": 4, "name": "Midwest Makers Hub", "price": "0.12" },
    { "id": 5, "name": "Rapid Prototype Co", "price": "0.18" }
  ]
}
```

### 2. Upload a Job

1. Go to: `http://localhost:3000/customer/upload`
2. Upload an STL file
3. Fill in material (e.g., PLA), weight, notes
4. Submit job

**Take note of the Job ID** from the URL or dashboard (e.g., Job #123)

### 3. Mark Job as Paid (Skip Payment)

Since Zaprite payments are external, use the dev endpoint to simulate payment:

```bash
curl -X POST http://localhost:3000/api/dev/simulate-payment/123
```

Replace `123` with your actual job ID.

**Response:**
```json
{
  "success": true,
  "message": "Payment simulated successfully"
}
```

### 4. Auto-Generate Bids from Fake Printers

This creates 5 bids with varying prices and lead times:

```bash
curl -X POST http://localhost:3000/api/dev/auto-bid/123
```

Replace `123` with your job ID.

**Response:**
```json
{
  "success": true,
  "message": "Created 5 bids from fake printers",
  "bids": [
    { "id": 1, "printerId": 1, "amount": "22.50", "days": 3 },
    { "id": 2, "printerId": 2, "amount": "18.75", "days": 5 },
    { "id": 3, "printerId": 3, "amount": "28.75", "days": 2 },
    { "id": 4, "printerId": 4, "amount": "21.25", "days": 7 },
    { "id": 5, "printerId": 5, "amount": "25.00", "days": 4 }
  ]
}
```

### 5. View and Accept Bids

1. Go to: `http://localhost:3000/customer/dashboard`
2. Find your job in "Recent Orders"
3. Click the chevron (▼) to expand
4. See the **top 3 bids** (sorted by price + delivery time)
5. Click **"Accept Bid"** on your preferred offer

---

## Development API Endpoints

### Fake Printers Management

**Seed Printers** (Create 5 fake printers)
```bash
POST /api/dev/seed-printers
```

**View Fake Printers**
```bash
GET /api/dev/seed-printers
```

**Cleanup Fake Printers** (Remove all fake data)
```bash
DELETE /api/dev/seed-printers
```

### Testing Workflow

**Simulate Payment**
```bash
POST /api/dev/simulate-payment/:jobId
```

**Auto-Generate Bids**
```bash
POST /api/dev/auto-bid/:jobId
```

---

## Fake Printer Details

### 1. SpeedPrint Pro
- **Price:** $0.15/gram
- **Location:** San Francisco, CA
- **Materials:** PLA, PETG, ABS
- **Lead Time:** 3 days
- **Rating:** 4.8 ⭐
- **Description:** Fast turnaround, premium quality

### 2. Budget Builds 3D
- **Price:** $0.08/gram (cheapest)
- **Location:** Austin, TX
- **Materials:** PLA, TPU
- **Lead Time:** 5 days
- **Rating:** 4.5 ⭐
- **Description:** Affordable prints without compromising quality

### 3. Premium Precision Lab
- **Price:** $0.25/gram (most expensive)
- **Location:** New York, NY
- **Materials:** PLA, ABS, PETG, TPU, Wood, Metal
- **Lead Time:** 2 days (fastest)
- **Rating:** 4.9 ⭐
- **Description:** High-end materials and precision engineering

### 4. Midwest Makers Hub
- **Price:** $0.12/gram
- **Location:** Chicago, IL
- **Materials:** PLA, PETG, ABS
- **Lead Time:** 7 days
- **Rating:** 4.6 ⭐
- **Description:** Reliable service with great prices

### 5. Rapid Prototype Co
- **Price:** $0.18/gram
- **Location:** Seattle, WA
- **Materials:** PLA, ABS, PETG, TPU
- **Lead Time:** 4 days
- **Rating:** 4.7 ⭐
- **Description:** Same-day printing available

---

## Bid Pricing Logic

The auto-bid feature generates bids based on your job's estimated cost:

```
Base Cost = Job's estimatedCost (or $25 if not set)

Printer 1 (SpeedPrint): 90% of base = $22.50 (3 days)
Printer 2 (Budget):     75% of base = $18.75 (5 days) ← Best price
Printer 3 (Premium):   115% of base = $28.75 (2 days) ← Fastest
Printer 4 (Midwest):    85% of base = $21.25 (7 days)
Printer 5 (Rapid):     100% of base = $25.00 (4 days)
```

**Top 3 shown to customer:**
1. Budget Builds 3D - $18.75 in 5 days (best value)
2. Midwest Makers Hub - $21.25 in 7 days
3. SpeedPrint Pro - $22.50 in 3 days

---

## Testing Different Scenarios

### Scenario 1: Price-Conscious Customer
Upload job → Auto-bid → Accept Budget Builds 3D ($18.75)

### Scenario 2: Rush Order
Upload job → Auto-bid → Accept Premium Precision Lab (2 days)

### Scenario 3: Multiple Jobs
1. Upload 3 different jobs
2. Auto-bid on all 3
3. Accept different printers for each
4. Test the bidding limit (max 5 bids per job)

### Scenario 4: Manual Bidding (Advanced)
1. Switch to Printer Owner role
2. Create your own real printer
3. Browse "Job Opportunities" on printer owner dashboard
4. Submit manual bids to compete with fake printers

---

## Cleanup

When you're done testing and want to remove all fake data:

```bash
# Remove fake printers and their user
curl -X DELETE http://localhost:3000/api/dev/seed-printers

# Manually delete jobs from UI or database if needed
```

**Note:** This only removes fake printers. Jobs and bids you created will remain.

---

## Browser Console Testing

Open browser console on any page and run:

```javascript
// Seed printers
await fetch('/api/dev/seed-printers', { method: 'POST' }).then(r => r.json())

// Auto-bid on job ID 123
await fetch('/api/dev/auto-bid/123', { method: 'POST' }).then(r => r.json())

// Simulate payment for job ID 123
await fetch('/api/dev/simulate-payment/123', { method: 'POST' }).then(r => r.json())
```

---

## Production Safety

⚠️ **These endpoints are ONLY available in development mode.**

They are automatically disabled when `NODE_ENV=production`.

To remove the code entirely before deployment:
1. Delete `server/devSeed.ts`
2. Remove the dev routes section from `server/routes.ts`
3. Delete this guide

---

## Troubleshooting

**"No fake printers found"**
→ Run `POST /api/dev/seed-printers` first

**"Job not found"**
→ Check the job ID, ensure the job was created successfully

**"Maximum 5 bids reached"**
→ This is expected behavior. Delete some bids or create a new job

**Bids not showing up**
→ Make sure you ran `POST /api/dev/simulate-payment/:jobId` first
→ Jobs must be paid before they're open for bidding
