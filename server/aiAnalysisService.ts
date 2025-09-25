import { Storage } from '@google-cloud/storage';

export interface QualityAnalysisResult {
  overallScore: number; // 0-100 quality score
  defects: QualityDefect[];
  metrics: QualityMetrics;
  confidence: number;
}

export interface QualityDefect {
  type: 'layer_adhesion' | 'surface_finish' | 'dimensional_accuracy' | 'warping' | 'stringing' | 'under_extrusion' | 'over_extrusion';
  severity: 'low' | 'medium' | 'high' | 'critical';
  location?: { x: number; y: number; width: number; height: number };
  confidence: number;
  description: string;
}

export interface QualityMetrics {
  surfaceQuality: number; // 0-100
  dimensionalAccuracy: number; // 0-100  
  layerConsistency: number; // 0-100
  overallFinish: number; // 0-100
}

export class AIAnalysisService {
  constructor() {}

  /**
   * Analyzes quality photos for 3D print defects using AI
   */
  async analyzeQualityPhotos(photoUrls: string[]): Promise<QualityAnalysisResult> {
    try {
      // For MVP, we'll simulate AI analysis with realistic results
      // In production, this would integrate with Google Cloud Vision API
      console.log(`Analyzing ${photoUrls.length} quality photos for defects...`);
      
      const results = await Promise.all(
        photoUrls.map(url => this.analyzeSinglePhoto(url))
      );
      
      // Combine results from multiple photos
      return this.aggregateAnalysisResults(results);
      
    } catch (error) {
      console.error('AI Analysis error:', error);
      throw new Error('Failed to analyze quality photos');
    }
  }

  /**
   * Analyzes a single photo for quality defects
   */
  private async analyzeSinglePhoto(photoUrl: string): Promise<QualityAnalysisResult> {
    // Simulate API call delay
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    // For MVP: Generate realistic quality analysis results
    // In production, this would call Google Cloud Vision API
    const mockAnalysis = this.generateMockAnalysis(photoUrl);
    
    console.log(`Analyzed photo ${photoUrl}: Score ${mockAnalysis.overallScore}/100`);
    return mockAnalysis;
  }

  /**
   * Generates realistic mock analysis for MVP demonstration
   */
  private generateMockAnalysis(photoUrl: string): QualityAnalysisResult {
    // Generate realistic quality scores (bias toward good prints)
    const surfaceQuality = Math.max(60, Math.random() * 40 + 60);
    const dimensionalAccuracy = Math.max(70, Math.random() * 30 + 70);
    const layerConsistency = Math.max(65, Math.random() * 35 + 65);
    const overallFinish = Math.max(65, Math.random() * 35 + 65);
    
    const metrics: QualityMetrics = {
      surfaceQuality: Math.round(surfaceQuality),
      dimensionalAccuracy: Math.round(dimensionalAccuracy),
      layerConsistency: Math.round(layerConsistency),
      overallFinish: Math.round(overallFinish)
    };
    
    // Calculate overall score as weighted average
    const overallScore = Math.round(
      (surfaceQuality * 0.3) + 
      (dimensionalAccuracy * 0.25) + 
      (layerConsistency * 0.25) + 
      (overallFinish * 0.2)
    );
    
    // Generate defects based on quality scores
    const defects: QualityDefect[] = [];
    
    if (surfaceQuality < 80) {
      defects.push({
        type: 'surface_finish',
        severity: surfaceQuality < 60 ? 'high' : 'medium',
        confidence: 0.85,
        description: 'Surface roughness detected in printed part'
      });
    }
    
    if (layerConsistency < 75) {
      defects.push({
        type: 'layer_adhesion',
        severity: layerConsistency < 60 ? 'critical' : 'medium',
        confidence: 0.78,
        description: 'Inconsistent layer bonding observed'
      });
    }
    
    if (dimensionalAccuracy < 85) {
      defects.push({
        type: 'dimensional_accuracy',
        severity: dimensionalAccuracy < 70 ? 'high' : 'low',
        confidence: 0.82,
        description: 'Part dimensions may vary from specifications'
      });
    }
    
    // Random chance of other defects
    if (Math.random() < 0.2) {
      defects.push({
        type: 'stringing',
        severity: 'low',
        confidence: 0.65,
        description: 'Minor stringing artifacts detected'
      });
    }
    
    return {
      overallScore,
      defects,
      metrics,
      confidence: 0.88
    };
  }

  /**
   * Aggregates analysis results from multiple photos
   */
  private aggregateAnalysisResults(results: QualityAnalysisResult[]): QualityAnalysisResult {
    if (results.length === 0) {
      throw new Error('No analysis results to aggregate');
    }
    
    if (results.length === 1) {
      return results[0];
    }
    
    // Aggregate metrics by taking weighted average (more photos = higher confidence)
    const avgMetrics: QualityMetrics = {
      surfaceQuality: Math.round(results.reduce((sum, r) => sum + r.metrics.surfaceQuality, 0) / results.length),
      dimensionalAccuracy: Math.round(results.reduce((sum, r) => sum + r.metrics.dimensionalAccuracy, 0) / results.length),
      layerConsistency: Math.round(results.reduce((sum, r) => sum + r.metrics.layerConsistency, 0) / results.length),
      overallFinish: Math.round(results.reduce((sum, r) => sum + r.metrics.overallFinish, 0) / results.length)
    };
    
    // Calculate aggregated overall score
    const overallScore = Math.round(results.reduce((sum, r) => sum + r.overallScore, 0) / results.length);
    
    // Combine unique defects from all photos
    const allDefects = results.flatMap(r => r.defects);
    const uniqueDefects = this.deduplicateDefects(allDefects);
    
    // Higher confidence with more photos
    const confidence = Math.min(0.95, 0.7 + (results.length * 0.1));
    
    return {
      overallScore,
      defects: uniqueDefects,
      metrics: avgMetrics,
      confidence: Math.round(confidence * 100) / 100
    };
  }

  /**
   * Removes duplicate defects and keeps the one with highest confidence
   */
  private deduplicateDefects(defects: QualityDefect[]): QualityDefect[] {
    const defectMap = new Map<string, QualityDefect>();
    
    defects.forEach(defect => {
      const key = defect.type;
      const existing = defectMap.get(key);
      
      if (!existing || defect.confidence > existing.confidence) {
        defectMap.set(key, defect);
      }
    });
    
    return Array.from(defectMap.values());
  }

  /**
   * Integrates with Google Cloud Vision API (production implementation)
   */
  private async callGoogleVisionAPI(photoUrl: string): Promise<any> {
    // This would be the production implementation using Google Cloud Vision API
    // Example implementation:
    /*
    const visionClient = new ImageAnnotatorClient();
    
    const request = {
      image: { source: { imageUri: photoUrl } },
      features: [
        { type: 'OBJECT_LOCALIZATION', maxResults: 50 },
        { type: 'IMAGE_PROPERTIES', maxResults: 10 },
        { type: 'SAFE_SEARCH_DETECTION', maxResults: 10 }
      ]
    };
    
    const [result] = await visionClient.annotateImage(request);
    return result;
    */
    
    throw new Error('Google Vision API integration not implemented in MVP');
  }
}

// Singleton instance
export const aiAnalysisService = new AIAnalysisService();