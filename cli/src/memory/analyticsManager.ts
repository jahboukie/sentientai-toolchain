import { DatabaseManager } from '../database/databaseManager';
import { logger } from '../utils/logger';

export interface MemoryAnalytics {
  overview: {
    totalExecutions: number;
    successfulExecutions: number;
    failedExecutions: number;
    successRate: number;
    totalMemoryEntries: number;
    averageExecutionTime: number;
    oldestExecution?: Date;
    newestExecution?: Date;
    databaseSize: number;
  };
  
  trends: {
    dailyExecutions: Array<{ date: string; count: number; successRate: number }>;
    weeklyGrowth: number;
    monthlyGrowth: number;
    executionsByHour: Array<{ hour: number; count: number }>;
  };
  
  patterns: {
    topCategories: Array<{ category: string; count: number; successRate: number }>;
    topTags: Array<{ tag: string; count: number; successRate: number }>;
    complexityDistribution: Array<{ complexity: number; count: number; avgDuration: number }>;
    modelUsage: Array<{ model: string; count: number; avgTokens: number; successRate: number }>;
  };
  
  performance: {
    averageResponseTime: number;
    memoryUsageStats: { min: number; max: number; avg: number };
    searchPerformance: Array<{ queryLength: number; avgResponseTime: number; resultCount: number }>;
    topPerformingQueries: Array<{ query: string; avgRelevance: number; frequency: number }>;
  };
  
  insights: {
    recommendations: string[];
    anomalies: string[];
    optimizationOpportunities: string[];
  };
}

export interface QueryAnalytics {
  query: string;
  frequency: number;
  avgRelevanceScore: number;
  avgResponseTime: number;
  successRate: number;
  lastUsed: Date;
  topResults: Array<{ executionId: number; relevanceScore: number }>;
}

export class MemoryAnalyticsManager {
  private dbManager: DatabaseManager;

  constructor(dbManager: DatabaseManager) {
    this.dbManager = dbManager;
  }

  async initialize(): Promise<void> {
    await this.dbManager.initialize();
  }

  async getComprehensiveAnalytics(): Promise<MemoryAnalytics> {
    await this.initialize();
    
    const [overview, trends, patterns, performance] = await Promise.all([
      this.getOverviewStats(),
      this.getTrendAnalysis(),
      this.getPatternAnalysis(),
      this.getPerformanceAnalysis()
    ]);
    
    const insights = await this.generateInsights(overview, trends, patterns, performance);
    
    return {
      overview,
      trends,
      patterns,
      performance,
      insights
    };
  }

  private async getOverviewStats(): Promise<MemoryAnalytics['overview']> {
    const db = this.dbManager.getDatabase();
    
    const totalStats = db.prepare(`
      SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN success = 1 THEN 1 ELSE 0 END) as successful,
        AVG(duration_ms) as avgDuration,
        MIN(timestamp) as oldest,
        MAX(timestamp) as newest
      FROM executions
    `).get() as any;
    
    const memoryLinks = db.prepare('SELECT COUNT(*) as count FROM memory_links').get() as any;
    
    // Get database file size
    const dbPath = this.dbManager.getDatabasePath();
    const fs = require('fs-extra');
    const dbSize = (await fs.stat(dbPath)).size;
    
    return {
      totalExecutions: totalStats.total || 0,
      successfulExecutions: totalStats.successful || 0,
      failedExecutions: (totalStats.total || 0) - (totalStats.successful || 0),
      successRate: totalStats.total > 0 ? (totalStats.successful || 0) / totalStats.total : 0,
      totalMemoryEntries: memoryLinks.count || 0,
      averageExecutionTime: totalStats.avgDuration || 0,
      oldestExecution: totalStats.oldest ? new Date(totalStats.oldest) : undefined,
      newestExecution: totalStats.newest ? new Date(totalStats.newest) : undefined,
      databaseSize: dbSize
    };
  }

  private async getTrendAnalysis(): Promise<MemoryAnalytics['trends']> {
    const db = this.dbManager.getDatabase();
    
    // Daily executions for last 30 days
    const dailyStats = db.prepare(`
      SELECT 
        DATE(timestamp) as date,
        COUNT(*) as count,
        AVG(CASE WHEN success = 1 THEN 1.0 ELSE 0.0 END) as successRate
      FROM executions 
      WHERE timestamp >= datetime('now', '-30 days')
      GROUP BY DATE(timestamp)
      ORDER BY date
    `).all() as any[];
    
    // Executions by hour of day
    const hourlyStats = db.prepare(`
      SELECT 
        CAST(strftime('%H', timestamp) AS INTEGER) as hour,
        COUNT(*) as count
      FROM executions
      GROUP BY hour
      ORDER BY hour
    `).all() as any[];
    
    // Calculate growth rates
    const weeklyGrowth = this.calculateGrowthRate(dailyStats, 7);
    const monthlyGrowth = this.calculateGrowthRate(dailyStats, 30);
    
    return {
      dailyExecutions: dailyStats.map(stat => ({
        date: stat.date,
        count: stat.count,
        successRate: stat.successRate
      })),
      weeklyGrowth,
      monthlyGrowth,
      executionsByHour: hourlyStats.map(stat => ({
        hour: stat.hour,
        count: stat.count
      }))
    };
  }

  private async getPatternAnalysis(): Promise<MemoryAnalytics['patterns']> {
    const db = this.dbManager.getDatabase();
    
    // Top categories
    const categories = db.prepare(`
      SELECT 
        pm.metric_value as category,
        COUNT(*) as count,
        AVG(CASE WHEN e.success = 1 THEN 1.0 ELSE 0.0 END) as successRate
      FROM performance_metrics pm
      JOIN executions e ON pm.execution_id = e.id
      WHERE pm.metric_type = 'category'
      GROUP BY pm.metric_value
      ORDER BY count DESC
      LIMIT 10
    `).all() as any[];
    
    // Top tags (extract from JSON)
    const tagStats = await this.getTagStatistics();
    
    // Complexity distribution
    const complexity = db.prepare(`
      SELECT 
        CAST(pm.metric_value AS INTEGER) as complexity,
        COUNT(*) as count,
        AVG(e.duration_ms) as avgDuration
      FROM performance_metrics pm
      JOIN executions e ON pm.execution_id = e.id
      WHERE pm.metric_type = 'complexity'
      GROUP BY complexity
      ORDER BY complexity
    `).all() as any[];
    
    // Model usage
    const models = db.prepare(`
      SELECT 
        model_used as model,
        COUNT(*) as count,
        AVG(tokens_used) as avgTokens,
        AVG(CASE WHEN success = 1 THEN 1.0 ELSE 0.0 END) as successRate
      FROM executions
      WHERE model_used IS NOT NULL
      GROUP BY model_used
      ORDER BY count DESC
    `).all() as any[];
    
    return {
      topCategories: categories.map(cat => ({
        category: cat.category,
        count: cat.count,
        successRate: cat.successRate
      })),
      topTags: tagStats,
      complexityDistribution: complexity.map(comp => ({
        complexity: comp.complexity,
        count: comp.count,
        avgDuration: comp.avgDuration
      })),
      modelUsage: models.map(model => ({
        model: model.model,
        count: model.count,
        avgTokens: model.avgTokens || 0,
        successRate: model.successRate
      }))
    };
  }

  private async getPerformanceAnalysis(): Promise<MemoryAnalytics['performance']> {
    const db = this.dbManager.getDatabase();
    
    // Average response time
    const avgResponse = db.prepare(`
      SELECT AVG(duration_ms) as avgTime FROM executions
    `).get() as any;
    
    // Memory usage statistics
    const memoryStats = db.prepare(`
      SELECT 
        MIN(CAST(pm.metric_value AS REAL)) as minMem,
        MAX(CAST(pm.metric_value AS REAL)) as maxMem,
        AVG(CAST(pm.metric_value AS REAL)) as avgMem
      FROM performance_metrics pm
      WHERE pm.metric_type = 'memory_usage'
    `).get() as any;
    
    // Search performance by query length
    const searchPerf = await this.getSearchPerformanceStats();
    
    // Top performing queries (mock data for now)
    const topQueries = await this.getTopPerformingQueries();
    
    return {
      averageResponseTime: avgResponse.avgTime || 0,
      memoryUsageStats: {
        min: memoryStats.minMem || 0,
        max: memoryStats.maxMem || 0,
        avg: memoryStats.avgMem || 0
      },
      searchPerformance: searchPerf,
      topPerformingQueries: topQueries
    };
  }

  private async generateInsights(
    overview: MemoryAnalytics['overview'],
    trends: MemoryAnalytics['trends'],
    patterns: MemoryAnalytics['patterns'],
    performance: MemoryAnalytics['performance']
  ): Promise<MemoryAnalytics['insights']> {
    const recommendations: string[] = [];
    const anomalies: string[] = [];
    const optimizationOpportunities: string[] = [];
    
    // Generate recommendations
    if (overview.successRate < 0.8) {
      recommendations.push('Success rate is below 80%. Consider reviewing failed executions for common patterns.');
    }
    
    if (performance.averageResponseTime > 5000) {
      recommendations.push('Average response time is high. Consider optimizing database queries or adding indexes.');
    }
    
    if (trends.weeklyGrowth > 50) {
      recommendations.push('High growth rate detected. Consider implementing data retention policies.');
    }
    
    // Detect anomalies
    if (overview.totalExecutions > 0 && overview.totalMemoryEntries / overview.totalExecutions < 0.5) {
      anomalies.push('Low memory link ratio detected. Memory storage may not be working optimally.');
    }
    
    // Optimization opportunities
    if (patterns.complexityDistribution.length > 0) {
      const highComplexityCount = patterns.complexityDistribution
        .filter(c => c.complexity > 7)
        .reduce((sum, c) => sum + c.count, 0);
      
      if (highComplexityCount > overview.totalExecutions * 0.3) {
        optimizationOpportunities.push('30%+ of executions are high complexity. Consider breaking down complex tasks.');
      }
    }
    
    if (overview.databaseSize > 100 * 1024 * 1024) { // 100MB
      optimizationOpportunities.push('Database size is large. Consider implementing cleanup policies.');
    }
    
    return {
      recommendations,
      anomalies,
      optimizationOpportunities
    };
  }

  private calculateGrowthRate(dailyStats: any[], days: number): number {
    if (dailyStats.length < days) return 0;
    
    const recent = dailyStats.slice(-days).reduce((sum, stat) => sum + stat.count, 0);
    const previous = dailyStats.slice(-days * 2, -days).reduce((sum, stat) => sum + stat.count, 0);
    
    if (previous === 0) return recent > 0 ? 100 : 0;
    return ((recent - previous) / previous) * 100;
  }

  private async getTagStatistics(): Promise<Array<{ tag: string; count: number; successRate: number }>> {
    const db = this.dbManager.getDatabase();
    
    const tagData = db.prepare(`
      SELECT pm.metric_value as tags, e.success
      FROM performance_metrics pm
      JOIN executions e ON pm.execution_id = e.id
      WHERE pm.metric_type = 'tags'
    `).all() as any[];
    
    const tagCounts: Map<string, { count: number; successes: number }> = new Map();
    
    for (const row of tagData) {
      try {
        const tags = JSON.parse(row.tags);
        for (const tag of tags) {
          const current = tagCounts.get(tag) || { count: 0, successes: 0 };
          current.count++;
          if (row.success) current.successes++;
          tagCounts.set(tag, current);
        }
      } catch (error) {
        // Skip invalid JSON
      }
    }
    
    return Array.from(tagCounts.entries())
      .map(([tag, stats]) => ({
        tag,
        count: stats.count,
        successRate: stats.count > 0 ? stats.successes / stats.count : 0
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
  }

  private async getSearchPerformanceStats(): Promise<Array<{ queryLength: number; avgResponseTime: number; resultCount: number }>> {
    // This would require tracking search queries, which we'll implement later
    // For now, return mock data structure
    return [
      { queryLength: 5, avgResponseTime: 150, resultCount: 8 },
      { queryLength: 10, avgResponseTime: 200, resultCount: 12 },
      { queryLength: 20, avgResponseTime: 300, resultCount: 15 }
    ];
  }

  private async getTopPerformingQueries(): Promise<Array<{ query: string; avgRelevance: number; frequency: number }>> {
    // This would require tracking search queries and their results
    // For now, return empty array
    return [];
  }

  async getQueryAnalytics(query: string): Promise<QueryAnalytics | null> {
    // This would track specific query performance
    // Implementation would require search query logging
    return null;
  }

  async exportAnalytics(format: 'json' | 'csv' = 'json'): Promise<string> {
    const analytics = await this.getComprehensiveAnalytics();
    
    if (format === 'json') {
      return JSON.stringify(analytics, null, 2);
    } else {
      // Convert to CSV format
      return this.convertToCSV(analytics);
    }
  }

  private convertToCSV(analytics: MemoryAnalytics): string {
    const lines: string[] = [];
    
    // Overview section
    lines.push('Section,Metric,Value');
    lines.push(`Overview,Total Executions,${analytics.overview.totalExecutions}`);
    lines.push(`Overview,Success Rate,${(analytics.overview.successRate * 100).toFixed(2)}%`);
    lines.push(`Overview,Average Execution Time,${analytics.overview.averageExecutionTime}ms`);
    lines.push(`Overview,Database Size,${(analytics.overview.databaseSize / 1024 / 1024).toFixed(2)}MB`);
    
    // Add more sections as needed
    return lines.join('\n');
  }
}
