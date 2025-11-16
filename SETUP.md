# PoH Local Development Setup

## Quick Start

### 1. Database Setup
In Replit, go to **Tools → Secrets** and add:
- **Name:** `DATABASE_URL`
- **Value:** Your Neon PostgreSQL connection string

Get a free database at: https://neon.tech

### 2. Push Database Schema
```bash
npm run db:push
```

### 3. Start Development Server
```bash
npm run dev
```

## Testing the New Tier 1 Features

### Test Flow 1: Job Matching & Escrow
1. **Upload an STL file** at `/customer/upload`
2. **Create a job** with material and estimated weight
3. **Pay for the job** (uses fake payment in dev mode)
   - Status will change to "matched"
   - Escrow will be created automatically
4. **Expand the job card** (click the down arrow)
5. **See suggested printers** with match scores
6. **Select a printer** from the recommendations
7. **View escrow status** showing "Held in Escrow"

### Test Flow 2: Dispute Filing
1. **Go to a printing/completed job**
2. **Expand the job card**
3. **Click "File Dispute"**
4. **Select dispute type** (e.g., "Quality Issues")
5. **Write description**
6. **Submit dispute**
7. **Check that escrow status** changes to "Disputed"
8. **View dispute** in the Disputes sidebar

### Test Flow 3: Escrow Release
1. **Complete a job** (mark as completed)
2. **Upload quality photos** (if not already done)
3. **Trigger AI analysis** (quality score should be ≥70)
4. **Expand the job card**
5. **Click "Release Payment"** in escrow status
6. **Verify escrow status** changes to "Released"

## New API Endpoints

### Escrow Management
- `GET /api/escrow/job/:jobId` - Get escrow status
- `POST /api/escrow/:id/release` - Release escrow
- `POST /api/escrow/:id/hold` - Hold escrow

### Job Matching
- `GET /api/jobs/:id/matches?limit=10` - Get top matches
- `GET /api/jobs/:id/best-match` - Get best match
- `POST /api/jobs/:id/matches/search` - Custom search

### Disputes
- `POST /api/disputes` - Create dispute
- `GET /api/disputes/my` - My disputes
- `GET /api/disputes/job/:jobId` - Job disputes
- `GET /api/disputes/:id` - Get dispute details
- `PUT /api/disputes/:id` - Update dispute
- `POST /api/disputes/:id/resolve` - Resolve dispute

## New UI Components

1. **EscrowStatus** - Visual escrow display with release button
2. **PrinterMatches** - Match cards with scores and details
3. **DisputeDialog** - File disputes with evidence
4. **DisputeList** - View and resolve disputes

## Environment Variables

**Current Settings (.env):**
- `ZAPRITE_WEBHOOK_SECRET_BYPASS=true` - Skip webhook signature (DEV ONLY)
- `DEV_FAKE_PAYMENTS=true` - Simulate payment completion
- `NODE_ENV=development` - Development mode

**Required Secrets (Replit):**
- `DATABASE_URL` - PostgreSQL connection string

**Optional (for real payments):**
- `ZAPRITE_API_KEY` - Zaprite API key
- `ZAPRITE_WEBHOOK_SECRET` - Zaprite webhook secret

## Development Commands

```bash
npm run dev          # Start dev server
npm run check        # Type check
npm run db:push      # Push database schema
npm run build        # Build for production
npm start            # Start production server
```

## Troubleshooting

**"DATABASE_URL must be set"**
- Add `DATABASE_URL` to Replit Secrets (Tools → Secrets)

**"No matching printers found"**
- Create printers first using printer_owner role
- Ensure printer materials match job requirements

**"Quality score too low for escrow release"**
- AI quality score must be ≥70/100
- For testing, manually update job's `qualityScore` in database

**Webhook signature errors**
- Verify `ZAPRITE_WEBHOOK_SECRET_BYPASS=true` in .env

## What's New in This Update

✅ **Webhook Security** - HMAC-SHA256 signature verification
✅ **Escrow System** - Automated fund management
✅ **Job Matching** - Intelligent printer recommendations
✅ **Dispute Resolution** - Complete conflict resolution flow
✅ **Enhanced UI** - Collapsible job cards with all features

## Pull Request

Create PR: https://github.com/npgeorge/poh/pull/new/claude/work-in-progress-01L9AoiSTN3tK3yGXYRNUhph

Or use: `gh pr create --title "Implement Tier 1 Critical Marketplace Features" --base main`
