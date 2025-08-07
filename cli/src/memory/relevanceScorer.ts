import { DatabaseManager } from '../database/databaseManager';
import { logger } from '../utils/logger';

export interface RelevanceFactors {
  ftsScore: number;          // FTS5 base score (0-1)
  recencyScore: number;      // How recent the execution is (0-1)
  successScore: number;      // Success rate factor (0-1)
  complexityScore: number;   // Complexity relevance (0-1)
  confidenceScore: number;   // Original confidence (0-1)
  contextScore: number;      // Context similarity (0-1)
  frequencyScore: number;    // How often similar queries succeed (0-1)
  semanticScore: number;     // Semantic similarity (0-1)
}

export interface ScoredResult {
  executionId: number;
  relevanceScore: number;
  factors: RelevanceFactors;
  matchedContent: string;
  contextType: string;
  timestamp: Date;
  summary: string;
  prompt: string;
  outcome?: string;
  reasoning?: string;
  tags: string[];
  category: string;
  priority: string;
  complexity: number;
  confidence: number;
}

export class AdvancedRelevanceScorer {
  private dbManager: DatabaseManager;
  private weights: Record<keyof RelevanceFactors, number>;

  constructor(dbManager: DatabaseManager) {
    this.dbManager = dbManager;
    
    // Default weights for different relevance factors (sum = 1.0)
    this.weights = {
      ftsScore: 0.20,        // Base text matching
      recencyScore: 0.12,    // Temporal relevance
      successScore: 0.15,    // Success rate importance
      complexityScore: 0.08, // Complexity matching
      confidenceScore: 0.08, // Original confidence
      contextScore: 0.12,    // Context similarity
      frequencyScore: 0.05,  // Pattern frequency
      semanticScore: 0.20    // Semantic similarity (highest weight)
    };
  }

  async scoreResults(query: string, rawResults: any[]): Promise<ScoredResult[]> {
    const scoredResults: ScoredResult[] = [];
    
    for (const result of rawResults) {
      const factors = await this.calculateAllFactors(query, result);
      const relevanceScore = this.calculateWeightedScore(factors);
      
      const enhancedMetadata = await this.getEnhancedMetadata(result.id);
      
      scoredResults.push({
        executionId: result.id,
        relevanceScore,
        factors,
        matchedContent: this.extractMatchedContent(result, query),
        contextType: result.success ? 'solution' : 'error',
        timestamp: new Date(result.timestamp),
        summary: this.generateSummary(result),
        prompt: result.prompt,
        outcome: result.outcome,
        reasoning: result.reasoning,
        tags: enhancedMetadata.tags || [],
        category: enhancedMetadata.category || 'general',
        priority: enhancedMetadata.priority || 'medium',
        complexity: enhancedMetadata.complexity || 5,
        confidence: enhancedMetadata.confidence || 0.5
      });
    }
    
    // Sort by relevance score (highest first)
    return scoredResults.sort((a, b) => b.relevanceScore - a.relevanceScore);
  }

  private async calculateAllFactors(query: string, result: any): Promise<RelevanceFactors> {
    return {
      ftsScore: this.calculateFTSScore(result.rank),
      recencyScore: this.calculateRecencyScore(result.timestamp),
      successScore: await this.calculateSuccessScore(result),
      complexityScore: await this.calculateComplexityScore(query, result),
      confidenceScore: await this.calculateConfidenceScore(result),
      contextScore: await this.calculateContextScore(query, result),
      frequencyScore: await this.calculateFrequencyScore(query, result),
      semanticScore: this.calculateSemanticScore(query, result)
    };
  }

  private calculateFTSScore(rank: number): number {
    // Convert FTS5 rank to 0-1 score
    // FTS5 rank is negative, closer to 0 means more relevant
    return Math.max(0, Math.min(1, 1 + rank / 10));
  }

  private calculateRecencyScore(timestamp: string): number {
    const now = Date.now();
    const resultTime = new Date(timestamp).getTime();
    const ageInDays = (now - resultTime) / (1000 * 60 * 60 * 24);
    
    // Exponential decay: newer results score higher
    // Score drops to 0.5 after 30 days, 0.1 after 90 days
    return Math.exp(-ageInDays / 30);
  }

  private async calculateSuccessScore(result: any): Promise<number> {
    try {
      const db = this.dbManager.getDatabase();
      
      // Get success rate for similar prompts
      const similarPrompts = db.prepare(`
        SELECT success FROM executions 
        WHERE prompt LIKE ? 
        ORDER BY timestamp DESC 
        LIMIT 10
      `).all(`%${result.prompt.substring(0, 50)}%`);
      
      if (similarPrompts.length === 0) return 0.5;
      
      const successRate = similarPrompts.filter((p: any) => p.success).length / similarPrompts.length;
      
      // Boost score if this specific result was successful
      return result.success ? Math.max(successRate, 0.8) : successRate * 0.5;
      
    } catch (error) {
      logger.debug('Error calculating success score:', error);
      return result.success ? 0.8 : 0.3;
    }
  }

  private async calculateComplexityScore(query: string, result: any): Promise<number> {
    try {
      const db = this.dbManager.getDatabase();
      
      // Get complexity from performance metrics
      const complexity = db.prepare(`
        SELECT metric_value FROM performance_metrics
        WHERE execution_id = ? AND metric_type = 'complexity'
      `).get(result.id) as { metric_value: string } | undefined;

      if (!complexity) return 0.5;

      const complexityValue = parseInt(complexity.metric_value);
      const queryComplexity = this.estimateQueryComplexity(query);
      
      // Score higher when complexity matches query complexity
      const difference = Math.abs(complexityValue - queryComplexity);
      return Math.max(0, 1 - difference / 10);
      
    } catch (error) {
      logger.debug('Error calculating complexity score:', error);
      return 0.5;
    }
  }

  private async calculateConfidenceScore(result: any): Promise<number> {
    try {
      const db = this.dbManager.getDatabase();
      
      const confidence = db.prepare(`
        SELECT metric_value FROM performance_metrics
        WHERE execution_id = ? AND metric_type = 'confidence'
      `).get(result.id) as { metric_value: string } | undefined;

      return confidence ? parseFloat(confidence.metric_value) : 0.5;
      
    } catch (error) {
      logger.debug('Error calculating confidence score:', error);
      return 0.5;
    }
  }

  private async calculateContextScore(query: string, result: any): Promise<number> {
    try {
      const db = this.dbManager.getDatabase();
      
      // Get tags and category for context matching
      const tags = db.prepare(`
        SELECT metric_value FROM performance_metrics
        WHERE execution_id = ? AND metric_type = 'tags'
      `).get(result.id) as { metric_value: string } | undefined;

      const category = db.prepare(`
        SELECT metric_value FROM performance_metrics
        WHERE execution_id = ? AND metric_type = 'category'
      `).get(result.id) as { metric_value: string } | undefined;
      
      let score = 0;
      
      if (tags) {
        const tagList = JSON.parse(tags.metric_value);
        const queryWords = query.toLowerCase().split(/\s+/);
        
        // Check if query words match tags
        const matchingTags = tagList.filter((tag: string) => 
          queryWords.some(word => tag.toLowerCase().includes(word) || word.includes(tag.toLowerCase()))
        );
        
        score += (matchingTags.length / Math.max(tagList.length, 1)) * 0.6;
      }
      
      if (category) {
        const queryWords = query.toLowerCase().split(/\s+/);
        if (queryWords.some(word => category.metric_value.toLowerCase().includes(word))) {
          score += 0.4;
        }
      }
      
      return Math.min(1, score);
      
    } catch (error) {
      logger.debug('Error calculating context score:', error);
      return 0.3;
    }
  }

  private async calculateFrequencyScore(query: string, result: any): Promise<number> {
    try {
      const db = this.dbManager.getDatabase();
      
      // Count how often similar queries have been successful
      const queryWords = query.toLowerCase().split(/\s+/).filter(w => w.length > 3);
      
      if (queryWords.length === 0) return 0.5;
      
      const likeConditions = queryWords.map(() => 'prompt LIKE ?').join(' OR ');
      const likeParams = queryWords.map(word => `%${word}%`);
      
      const totalSimilar = db.prepare(`
        SELECT COUNT(*) as count FROM executions
        WHERE ${likeConditions}
      `).get(...likeParams) as { count: number };

      const successfulSimilar = db.prepare(`
        SELECT COUNT(*) as count FROM executions
        WHERE (${likeConditions}) AND success = 1
      `).get(...likeParams) as { count: number };

      if (totalSimilar.count === 0) return 0.5;

      return successfulSimilar.count / totalSimilar.count;
      
    } catch (error) {
      logger.debug('Error calculating frequency score:', error);
      return 0.5;
    }
  }

  private calculateSemanticScore(query: string, result: any): number {
    // Simple semantic similarity based on word overlap and position
    const queryWords = this.tokenize(query.toLowerCase());
    const promptWords = this.tokenize(result.prompt.toLowerCase());
    const reasoningWords = result.reasoning ? this.tokenize(result.reasoning.toLowerCase()) : [];
    
    // Calculate Jaccard similarity for different fields
    const promptSimilarity = this.jaccardSimilarity(queryWords, promptWords);
    const reasoningSimilarity = this.jaccardSimilarity(queryWords, reasoningWords);
    
    // Weight prompt higher than reasoning
    return (promptSimilarity * 0.7) + (reasoningSimilarity * 0.3);
  }

  private tokenize(text: string): string[] {
    return text
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(word => word.length > 2)
      .map(word => word.toLowerCase());
  }

  private jaccardSimilarity(set1: string[], set2: string[]): number {
    if (set1.length === 0 && set2.length === 0) return 1;
    if (set1.length === 0 || set2.length === 0) return 0;
    
    const intersection = set1.filter(word => set2.includes(word));
    const union = [...new Set([...set1, ...set2])];
    
    return intersection.length / union.length;
  }

  private estimateQueryComplexity(query: string): number {
    // Simple heuristic for query complexity (1-10 scale)
    const words = query.split(/\s+/).length;
    const hasSpecialTerms = /\b(implement|create|build|design|optimize|analyze)\b/i.test(query);
    const hasTechnicalTerms = /\b(algorithm|database|system|architecture|performance)\b/i.test(query);
    
    let complexity = Math.min(10, Math.max(1, words / 2));
    
    if (hasSpecialTerms) complexity += 2;
    if (hasTechnicalTerms) complexity += 1;
    
    return Math.min(10, complexity);
  }

  private calculateWeightedScore(factors: RelevanceFactors): number {
    let weightedSum = 0;
    let totalWeight = 0;
    
    for (const [factor, score] of Object.entries(factors)) {
      const weight = this.weights[factor as keyof RelevanceFactors];
      weightedSum += score * weight;
      totalWeight += weight;
    }
    
    return totalWeight > 0 ? weightedSum / totalWeight : 0;
  }

  private async getEnhancedMetadata(executionId: number): Promise<any> {
    try {
      const db = this.dbManager.getDatabase();
      
      const metrics = db.prepare(`
        SELECT metric_type, metric_value FROM performance_metrics
        WHERE execution_id = ?
      `).all(executionId) as { metric_type: string; metric_value: string }[];

      const metadata: any = {};

      for (const metric of metrics) {
        if (metric.metric_type === 'tags') {
          metadata.tags = JSON.parse(metric.metric_value);
        } else {
          metadata[metric.metric_type] = metric.metric_value;
        }
      }
      
      return metadata;
      
    } catch (error) {
      logger.debug('Error getting enhanced metadata:', error);
      return {};
    }
  }

  private extractMatchedContent(result: any, query: string): string {
    // Extract the most relevant part of the content that matches the query
    const text = `${result.prompt} ${result.reasoning || ''}`.toLowerCase();
    const queryWords = query.toLowerCase().split(/\s+/);
    
    // Find the best matching sentence or phrase
    const sentences = text.split(/[.!?]+/);
    let bestMatch = result.prompt.substring(0, 100);
    let bestScore = 0;
    
    for (const sentence of sentences) {
      const words = sentence.split(/\s+/);
      const matchCount = queryWords.filter(qw => words.some(w => w.includes(qw))).length;
      const score = matchCount / queryWords.length;
      
      if (score > bestScore) {
        bestScore = score;
        bestMatch = sentence.trim().substring(0, 100);
      }
    }
    
    return bestMatch || result.prompt.substring(0, 100);
  }

  private generateSummary(result: any): string {
    return result.prompt.length > 50 
      ? result.prompt.substring(0, 47) + '...'
      : result.prompt;
  }

  // Allow dynamic weight adjustment
  updateWeights(newWeights: Partial<Record<keyof RelevanceFactors, number>>): void {
    this.weights = { ...this.weights, ...newWeights };
    logger.info('Relevance scoring weights updated:', newWeights);
  }

  getWeights(): Record<keyof RelevanceFactors, number> {
    return { ...this.weights };
  }
}
