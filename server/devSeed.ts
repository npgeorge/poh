/**
 * Development seed data for testing
 * Creates fake printers with varying prices and lead times
 * Only available in development mode
 */
import { storage } from "./storage";

const FAKE_USER_ID = "dev-printer-owner";

export const FAKE_PRINTERS = [
  {
    name: "SpeedPrint Pro",
    location: "San Francisco, CA",
    materials: ["PLA", "PETG", "ABS"],
    pricePerGram: "0.15",
    description: "Fast turnaround, premium quality prints. I specialize in quick delivery.",
    maxPrintVolume: 300,
    status: "available" as const,
    userId: FAKE_USER_ID,
    rating: "4.8",
    completedJobs: 47,
  },
  {
    name: "Budget Builds 3D",
    location: "Austin, TX",
    materials: ["PLA", "TPU"],
    pricePerGram: "0.08",
    description: "Affordable prints without compromising quality. Best prices guaranteed!",
    maxPrintVolume: 250,
    status: "available" as const,
    userId: FAKE_USER_ID,
    rating: "4.5",
    completedJobs: 89,
  },
  {
    name: "Premium Precision Lab",
    location: "New York, NY",
    materials: ["PLA", "ABS", "PETG", "TPU", "Wood", "Metal"],
    pricePerGram: "0.25",
    description: "High-end materials and precision engineering. Perfect for professional projects.",
    maxPrintVolume: 400,
    status: "available" as const,
    userId: FAKE_USER_ID,
    rating: "4.9",
    completedJobs: 156,
  },
  {
    name: "Midwest Makers Hub",
    location: "Chicago, IL",
    materials: ["PLA", "PETG", "ABS"],
    pricePerGram: "0.12",
    description: "Reliable service with great prices. Central location for fast shipping.",
    maxPrintVolume: 280,
    status: "available" as const,
    userId: FAKE_USER_ID,
    rating: "4.6",
    completedJobs: 63,
  },
  {
    name: "Rapid Prototype Co",
    location: "Seattle, WA",
    materials: ["PLA", "ABS", "PETG", "TPU"],
    pricePerGram: "0.18",
    description: "Same-day printing available! Perfect for urgent projects.",
    maxPrintVolume: 320,
    status: "available" as const,
    userId: FAKE_USER_ID,
    rating: "4.7",
    completedJobs: 124,
  },
];

export async function seedFakePrinters() {
  // Check if fake user exists, create if not
  let fakeUser = await storage.getUser(FAKE_USER_ID);

  if (!fakeUser) {
    // Create fake printer owner user
    await storage.db.insert(storage.users).values({
      id: FAKE_USER_ID,
      email: "dev-printer-owner@test.local",
      firstName: "Dev",
      lastName: "PrinterOwner",
      roles: ["printer_owner"],
      currentRole: "printer_owner",
    });
    fakeUser = await storage.getUser(FAKE_USER_ID);
  }

  // Check if printers already exist
  const existingPrinters = await storage.getPrintersByUserId(FAKE_USER_ID);
  if (existingPrinters.length > 0) {
    console.log("🎨 Fake printers already seeded");
    return existingPrinters;
  }

  // Create all fake printers
  const createdPrinters = [];
  for (const printerData of FAKE_PRINTERS) {
    const printer = await storage.createPrinter(printerData);
    createdPrinters.push(printer);
  }

  console.log(`🎨 Seeded ${createdPrinters.length} fake printers for testing`);
  return createdPrinters;
}

export async function cleanupFakePrinters() {
  const printers = await storage.getPrintersByUserId(FAKE_USER_ID);

  for (const printer of printers) {
    await storage.db.delete(storage.printers).where(storage.eq(storage.printers.id, printer.id));
  }

  // Delete fake user
  await storage.db.delete(storage.users).where(storage.eq(storage.users.id, FAKE_USER_ID));

  console.log(`🧹 Cleaned up ${printers.length} fake printers`);
  return { deleted: printers.length };
}

export async function getFakePrinters() {
  return await storage.getPrintersByUserId(FAKE_USER_ID);
}
