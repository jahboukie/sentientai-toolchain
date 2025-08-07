import { AdvancedRelevanceScorer } from '../../src/memory/relevanceScorer';
import { DatabaseManager } from '../../src/database/databaseManager';

describe('Memory System', () => {
  let dbManager: DatabaseManager;

  beforeEach(() => {
    dbManager = new DatabaseManager();
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

  describe('Basic functionality', () => {
    it('should create relevance scorer instance', () => {
      const scorer = new AdvancedRelevanceScorer(dbManager);
      expect(scorer).toBeDefined();
    });

    it('should have database manager', () => {
      expect(dbManager).toBeDefined();
      expect(typeof dbManager.getDatabasePath).toBe('function');
    });
  });
});
