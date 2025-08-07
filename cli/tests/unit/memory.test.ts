import { MemoryManager } from '../../src/memory/memoryManager';
import { AdvancedRelevanceScorer } from '../../src/memory/relevanceScorer';
import { MemoryAnalyticsManager } from '../../src/memory/analyticsManager';
import { DatabaseManager } from '../../src/database/databaseManager';
import * as fs from 'fs-extra';
import * as path from 'path';

describe('Memory System', () => {
  let testDbPath: string;
  let dbManager: DatabaseManager;
  let memoryManager: MemoryManager;

  beforeEach(async () => {
    // Create temporary database for testing
    testDbPath = path.join(__dirname, '../.test-data', `test-${Date.now()}.db`);
    await fs.ensureDir(path.dirname(testDbPath));
    
    // Mock the database path
    dbManager = new DatabaseManager();
    jest.spyOn(dbManager, 'getDatabasePath').mockReturnValue(testDbPath);
    
    memoryManager = new MemoryManager();
    await memoryManager.initialize();
  });

  afterEach(async () => {
    // Cleanup test database
    if (await fs.pathExists(testDbPath)) {
      await fs.remove(testDbPath);
    }
  });

  describe('MemoryManager', () => {
    it('should initialize successfully', async () => {
      expect(memoryManager).toBeDefined();
    });

    it('should store execution context', async () => {
      const execution = {
        prompt: 'Test prompt',
        reasoning: 'Test reasoning',
        success: true,
        actions: []
      };

      const result = await memoryManager.storeExecution(execution);
      expect(result).toBeGreaterThan(0);
    });

    it('should retrieve memory statistics', async () => {
      const stats = await memoryManager.getStats();
      expect(stats).toHaveProperty('totalExecutions');
      expect(stats).toHaveProperty('successfulExecutions');
      expect(stats).toHaveProperty('averageExecutionTime');
    });

    it('should search memories', async () => {
      // Store a test execution
      await memoryManager.storeExecution({
        prompt: 'Test search functionality',
        reasoning: 'Testing search capabilities',
        success: true,
        actions: []
      });

      const results = await memoryManager.search('search', 5);
      expect(Array.isArray(results)).toBe(true);
    });
  });

  describe('AdvancedRelevanceScorer', () => {
    it('should initialize with default weights', () => {
      const scorer = new AdvancedRelevanceScorer(dbManager);
      const weights = scorer.getWeights();
      
      expect(weights).toHaveProperty('ftsScore');
      expect(weights).toHaveProperty('semanticScore');
      expect(weights).toHaveProperty('recencyScore');
      expect(Object.values(weights).reduce((sum, w) => sum + w, 0)).toBeCloseTo(1.0, 2);
    });

    it('should update weights correctly', () => {
      const scorer = new AdvancedRelevanceScorer(dbManager);
      const newWeights = { ftsScore: 0.5, semanticScore: 0.3 };
      
      scorer.updateWeights(newWeights);
      const weights = scorer.getWeights();
      
      expect(weights.ftsScore).toBe(0.5);
      expect(weights.semanticScore).toBe(0.3);
    });
  });

  describe('MemoryAnalyticsManager', () => {
    it('should generate comprehensive analytics', async () => {
      const analytics = new MemoryAnalyticsManager(dbManager);
      await analytics.initialize();
      
      const data = await analytics.getComprehensiveAnalytics();
      
      expect(data).toHaveProperty('overview');
      expect(data).toHaveProperty('trends');
      expect(data).toHaveProperty('patterns');
      expect(data).toHaveProperty('performance');
      expect(data).toHaveProperty('insights');
    });

    it('should export analytics in JSON format', async () => {
      const analytics = new MemoryAnalyticsManager(dbManager);
      await analytics.initialize();
      
      const exported = await analytics.exportAnalytics('json');
      expect(() => JSON.parse(exported)).not.toThrow();
    });

    it('should export analytics in CSV format', async () => {
      const analytics = new MemoryAnalyticsManager(dbManager);
      await analytics.initialize();
      
      const exported = await analytics.exportAnalytics('csv');
      expect(typeof exported).toBe('string');
      expect(exported).toContain('Section,Metric,Value');
    });
  });

  describe('Integration Tests', () => {
    it('should handle complete memory workflow', async () => {
      // Store multiple executions
      const executions = [
        { prompt: 'First test', reasoning: 'Testing', success: true, actions: [] },
        { prompt: 'Second test', reasoning: 'More testing', success: false, actions: [] },
        { prompt: 'Third test', reasoning: 'Final test', success: true, actions: [] }
      ];

      for (const exec of executions) {
        await memoryManager.storeExecution(exec);
      }

      // Test search
      const searchResults = await memoryManager.search('test', 10);
      expect(searchResults.length).toBeGreaterThan(0);

      // Test advanced search
      const advancedResults = await memoryManager.searchAdvanced('test', 5);
      expect(advancedResults.length).toBeGreaterThan(0);
      expect(advancedResults[0]).toHaveProperty('relevanceScore');
      expect(advancedResults[0]).toHaveProperty('factors');

      // Test analytics
      const analytics = new MemoryAnalyticsManager(dbManager);
      const data = await analytics.getComprehensiveAnalytics();
      expect(data.overview.totalExecutions).toBe(3);
      expect(data.overview.successfulExecutions).toBe(2);
      expect(data.overview.successRate).toBeCloseTo(2/3, 2);
    });
  });
});
