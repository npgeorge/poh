import { storage } from "./storage";
import type { Job, Printer } from "@shared/schema";

export interface MatchScore {
  printer: Printer;
  score: number;
  reasons: string[];
  estimatedCost: number;
}

export interface MatchingCriteria {
  location?: string;
  material?: string;
  maxPrice?: number;
  minRating?: number;
}

/**
 * Intelligent job matching service
 * Matches print jobs to suitable printers based on multiple criteria
 */
export class MatchingService {
  /**
   * Calculate similarity between two locations (basic string matching)
   * In production, this should use geocoding/distance calculation
   */
  private locationSimilarity(jobLocation: string, printerLocation: string): number {
    if (!jobLocation || !printerLocation) return 0;

    const jobLower = jobLocation.toLowerCase().trim();
    const printerLower = printerLocation.toLowerCase().trim();

    // Exact match
    if (jobLower === printerLower) return 1.0;

    // Partial match (contains)
    if (jobLower.includes(printerLower) || printerLower.includes(jobLower)) {
      return 0.7;
    }

    // Extract city/state for partial matching
    const jobParts = jobLower.split(/[,\s]+/);
    const printerParts = printerLower.split(/[,\s]+/);

    // Check if any parts match
    const commonParts = jobParts.filter(part =>
      printerParts.some(pPart => pPart === part || pPart.includes(part) || part.includes(pPart))
    );

    if (commonParts.length > 0) {
      return 0.5 * (commonParts.length / Math.max(jobParts.length, printerParts.length));
    }

    return 0;
  }

  /**
   * Calculate match score for a printer given a job
   * Score ranges from 0-100
   */
  private calculateMatchScore(job: Job, printer: Printer): MatchScore {
    let score = 0;
    const reasons: string[] = [];
    const weights = {
      material: 30,
      location: 25,
      rating: 20,
      price: 15,
      availability: 10,
    };

    // Material compatibility (critical - 30 points)
    if (job.material && printer.materials) {
      const printerMaterials = Array.isArray(printer.materials) ? printer.materials : [];
      if (printerMaterials.includes(job.material)) {
        score += weights.material;
        reasons.push(`Supports ${job.material}`);
      } else {
        // No material match = can't print
        return {
          printer,
          score: 0,
          reasons: [`Does not support required material: ${job.material}`],
          estimatedCost: 0,
        };
      }
    }

    // Location proximity (25 points)
    const locationScore = this.locationSimilarity(
      job.notes || '', // Job might store location in notes for now
      printer.location
    );
    const locationPoints = locationScore * weights.location;
    score += locationPoints;

    if (locationScore > 0.7) {
      reasons.push(`Local printer (${printer.location})`);
    } else if (locationScore > 0.3) {
      reasons.push(`Regional printer (${printer.location})`);
    }

    // Printer rating (20 points)
    const rating = parseFloat(printer.rating || '0');
    if (rating >= 4.5) {
      score += weights.rating;
      reasons.push(`Excellent rating (${rating}/5)`);
    } else if (rating >= 4.0) {
      score += weights.rating * 0.8;
      reasons.push(`Good rating (${rating}/5)`);
    } else if (rating >= 3.0) {
      score += weights.rating * 0.5;
      reasons.push(`Average rating (${rating}/5)`);
    }

    // Price competitiveness (15 points)
    const pricePerGram = parseFloat(printer.pricePerGram);
    const estimatedWeight = parseFloat(job.estimatedWeight || '0');
    const estimatedCost = pricePerGram * estimatedWeight;

    // Award more points for lower prices
    if (pricePerGram <= 0.05) {
      score += weights.price;
      reasons.push('Very competitive pricing');
    } else if (pricePerGram <= 0.10) {
      score += weights.price * 0.7;
      reasons.push('Good pricing');
    } else if (pricePerGram <= 0.15) {
      score += weights.price * 0.4;
    }

    // Availability (10 points)
    if (printer.status === 'available') {
      score += weights.availability;
      reasons.push('Available now');
    }

    // Bonus points for experienced printers
    const completedJobs = printer.completedJobs || 0;
    if (completedJobs >= 100) {
      score += 5;
      reasons.push(`Highly experienced (${completedJobs} jobs)`);
    } else if (completedJobs >= 50) {
      score += 3;
      reasons.push(`Experienced (${completedJobs} jobs)`);
    } else if (completedJobs >= 10) {
      score += 1;
      reasons.push(`${completedJobs} completed jobs`);
    }

    return {
      printer,
      score: Math.min(score, 100), // Cap at 100
      reasons,
      estimatedCost,
    };
  }

  /**
   * Find best printer matches for a job
   * Returns sorted list of matches with scores
   */
  async findMatches(jobId: number, limit: number = 10): Promise<MatchScore[]> {
    // Get the job
    const job = await storage.getJobById(jobId);
    if (!job) {
      throw new Error('Job not found');
    }

    // Get all available printers
    const allPrinters = await storage.searchPrinters({
      status: 'available',
    });

    // Calculate match scores for all printers
    const matches = allPrinters
      .map(printer => this.calculateMatchScore(job, printer))
      .filter(match => match.score > 0) // Only return valid matches
      .sort((a, b) => b.score - a.score) // Sort by score (highest first)
      .slice(0, limit); // Return top N matches

    return matches;
  }

  /**
   * Find matches with additional criteria
   */
  async findMatchesWithCriteria(
    jobId: number,
    criteria: MatchingCriteria,
    limit: number = 10
  ): Promise<MatchScore[]> {
    const job = await storage.getJobById(jobId);
    if (!job) {
      throw new Error('Job not found');
    }

    // Build search filters from criteria
    const filters: any = {
      status: 'available',
    };

    if (criteria.material) {
      filters.materials = [criteria.material];
    }

    if (criteria.location) {
      filters.location = criteria.location;
    }

    if (criteria.maxPrice) {
      filters.maxPrice = criteria.maxPrice;
    }

    // Get filtered printers
    const printers = await storage.searchPrinters(filters);

    // Calculate match scores
    let matches = printers
      .map(printer => this.calculateMatchScore(job, printer))
      .filter(match => match.score > 0);

    // Apply additional filters
    if (criteria.minRating) {
      matches = matches.filter(match =>
        parseFloat(match.printer.rating || '0') >= criteria.minRating!
      );
    }

    // Sort and limit
    return matches
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);
  }

  /**
   * Get the best single match for a job
   */
  async getBestMatch(jobId: number): Promise<MatchScore | null> {
    const matches = await this.findMatches(jobId, 1);
    return matches.length > 0 ? matches[0] : null;
  }
}

export const matchingService = new MatchingService();
