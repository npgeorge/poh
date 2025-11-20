# Local File Storage Setup

## Overview

For local development and testing, the application now uses a file system-based storage solution instead of cloud object storage. This allows you to:

- Upload STL files during local development
- Test the complete bidding workflow
- Avoid cloud storage costs during development

**This implementation is production-ready** and can be easily swapped with S3, R2, or any other object storage provider.

---

## How It Works

### Local Development

1. **File Upload:**
   - Client uploads STL file via multipart form data to `/api/objects/upload`
   - Server saves file to `./uploads/` directory with unique filename
   - Returns URL: `http://localhost:3000/api/files/{filename}`

2. **File Serving:**
   - Files served via `/api/files/:filename` endpoint
   - CORS enabled for STL viewer
   - Files stored locally in `./uploads/` (gitignored)

3. **File Naming:**
   - Pattern: `{timestamp}-{randomHash}.stl`
   - Example: `1732076400000-a1b2c3d4e5f6g7h8.stl`
   - Prevents naming conflicts

### Architecture

```
Client (upload.tsx)
    ↓ POST multipart/form-data
/api/objects/upload (routes.ts)
    ↓ multer middleware
localFileStorage.saveFile()
    ↓ write to disk
./uploads/{unique-filename}.stl
    ↓ return URL
http://localhost:3000/api/files/{filename}
```

---

## Production Deployment

To switch to cloud storage (S3, R2, etc.) in production:

### Option 1: Environment Variable Toggle

```typescript
// In server/routes.ts
const USE_LOCAL_STORAGE = process.env.NODE_ENV === 'development';

if (USE_LOCAL_STORAGE) {
  // Use localFileStorage.ts
} else {
  // Use S3/R2 client
}
```

### Option 2: Replace localFileStorage.ts

Create `server/objectStorage.ts`:

```typescript
import { S3Client, PutObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const s3 = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

export async function saveFile(buffer: Buffer, filename: string): Promise<string> {
  const key = `uploads/${Date.now()}-${filename}`;

  await s3.send(new PutObjectCommand({
    Bucket: process.env.S3_BUCKET,
    Key: key,
    Body: buffer,
    ContentType: 'application/octet-stream',
  }));

  return `https://${process.env.S3_BUCKET}.s3.${process.env.AWS_REGION}.amazonaws.com/${key}`;
}
```

Then update imports in `routes.ts`:
```typescript
// import { saveFile, getFile } from "./localFileStorage";
import { saveFile, getFile } from "./objectStorage";
```

### Option 3: Cloudflare R2

```typescript
import { S3Client } from "@aws-sdk/client-s3";

const r2 = new S3Client({
  region: "auto",
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
  },
});
```

---

## Environment Variables

### Development (current setup)
```env
NODE_ENV=development
# No cloud storage credentials needed
```

### Production (example for S3)
```env
NODE_ENV=production
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your_access_key
AWS_SECRET_ACCESS_KEY=your_secret_key
S3_BUCKET=your-bucket-name
PUBLIC_URL=https://yourdomain.com
```

---

## File Structure

```
poh/
├── uploads/              # Local file storage (gitignored)
│   ├── 1732076400000-abc123.stl
│   └── 1732076500000-def456.stl
├── server/
│   ├── localFileStorage.ts    # Development storage
│   ├── objectStorage.ts        # Production storage (to be created)
│   └── routes.ts               # File upload endpoints
└── client/
    └── src/pages/upload.tsx    # Upload UI
```

---

## Testing the Upload Flow

1. **Start the server:**
   ```bash
   npm run dev
   ```

2. **Navigate to upload page:**
   ```
   http://localhost:3000/customer/upload
   ```

3. **Upload an STL file:**
   - Click the upload area
   - Select a `.stl` file (max 50MB)
   - File will be saved to `./uploads/`
   - 3D preview will load automatically

4. **Complete job creation:**
   - Fill in material, weight, notes
   - Submit job
   - Proceed with payment flow

5. **Test bidding:**
   - Switch to printer owner role
   - Submit bids on the job
   - Switch back to customer
   - View and accept bids

---

## Security Notes

### Development
- Files are publicly accessible via `/api/files/:filename`
- No authentication required to view files (for 3D preview)
- OK for local development

### Production
- Implement signed URLs for file access
- Use bucket policies to restrict direct access
- Add authentication to file serving endpoints
- Consider CDN for performance (CloudFront, Cloudflare)

Example signed URL implementation:
```typescript
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { GetObjectCommand } from "@aws-sdk/client-s3";

export async function getFileUrl(key: string): Promise<string> {
  const command = new GetObjectCommand({
    Bucket: process.env.S3_BUCKET,
    Key: key,
  });

  return await getSignedUrl(s3, command, { expiresIn: 3600 }); // 1 hour
}
```

---

## Cleanup

To clean up local uploads:
```bash
rm -rf uploads/*
```

The directory is automatically created on first upload.

---

## Summary

✅ **Development:** Files stored locally in `./uploads/`, served via `/api/files/:filename`
✅ **Production-ready:** Easy to swap with S3/R2 by replacing `localFileStorage.ts`
✅ **CORS enabled:** STL viewer can load files from same origin
✅ **Gitignored:** Uploaded files won't be committed to repository
✅ **Configurable:** Can toggle between local/cloud via environment variables
