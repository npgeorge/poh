/**
 * Local file storage for development
 * In production, this should be replaced with proper object storage (S3, R2, etc.)
 */
import { promises as fs } from "fs";
import path from "path";
import crypto from "crypto";

const UPLOADS_DIR = path.join(process.cwd(), "uploads");
const BASE_URL = process.env.NODE_ENV === "production"
  ? process.env.PUBLIC_URL || "http://localhost:3000"
  : "http://localhost:3000";

// Ensure uploads directory exists
async function ensureUploadsDir() {
  try {
    await fs.access(UPLOADS_DIR);
  } catch {
    await fs.mkdir(UPLOADS_DIR, { recursive: true });
  }
}

export async function saveFile(fileBuffer: Buffer, originalName: string): Promise<string> {
  await ensureUploadsDir();

  // Generate unique filename
  const timestamp = Date.now();
  const randomHash = crypto.randomBytes(8).toString("hex");
  const ext = path.extname(originalName);
  const filename = `${timestamp}-${randomHash}${ext}`;

  const filePath = path.join(UPLOADS_DIR, filename);
  await fs.writeFile(filePath, fileBuffer);

  // Return URL that can be used to access the file
  return `${BASE_URL}/api/files/${filename}`;
}

export async function getFile(filename: string): Promise<Buffer> {
  const filePath = path.join(UPLOADS_DIR, filename);
  return await fs.readFile(filePath);
}

export async function deleteFile(filename: string): Promise<void> {
  const filePath = path.join(UPLOADS_DIR, filename);
  await fs.unlink(filePath);
}

export async function fileExists(filename: string): Promise<boolean> {
  try {
    const filePath = path.join(UPLOADS_DIR, filename);
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}
