import { Command } from 'commander';
import { BaseCommand } from './base';
import { MemoryManager } from '../memory/memoryManager';
import { ExecutionContextManager, ContextCollector } from '../memory';
import { DatabaseManager } from '../database';

export class MemoryCommands extends BaseCommand {
  readonly name = 'memory';
  readonly description = 'Memory and knowledge base commands';

  async execute(): Promise<void> {
    // This is handled by individual subcommands
  }

  static register(program: Command): void {
    const memoryCmd = program
      .command('memory')
      .description('Knowledge base operations');

    memoryCmd
      .command('search <query>')
      .description('Search knowledge base')
      .option('-l, --limit <number>', 'Limit results', '10')
      .action(async (query: string, options: { limit: string }) => {
        try {
          const memory = new MemoryManager();
          const results = await memory.search(query, parseInt(options.limit));
          console.log(JSON.stringify(results, null, 2));
        } catch (error) {
          console.error('Memory search failed:', error);
          process.exit(1);
        }
      });

    memoryCmd
      .command('search-advanced <query>')
      .description('Search knowledge base with advanced relevance scoring')
      .option('-l, --limit <number>', 'Limit results', '10')
      .action(async (query: string, options: { limit: string }) => {
        try {
          const memory = new MemoryManager();
          const results = await memory.searchAdvanced(query, parseInt(options.limit));

          console.log('\n🔍 Advanced Search Results:');
          console.log('─'.repeat(60));

          for (const result of results) {
            console.log(`\n📊 Relevance: ${(result.relevanceScore * 100).toFixed(1)}% | ID: ${result.executionId}`);
            console.log(`📝 ${result.matchedContent}`);
            console.log(`⏰ ${result.timestamp.toLocaleString()}`);
            console.log(`🏷️  ${result.tags.join(', ') || 'No tags'} | 📂 ${result.category} | ⭐ ${result.priority}`);
            console.log(`🧩 Complexity: ${result.complexity}/10 | 🎯 Confidence: ${(result.confidence * 100).toFixed(1)}%`);

            // Show top 3 relevance factors
            const topFactors = Object.entries(result.factors)
              .sort(([,a], [,b]) => b - a)
              .slice(0, 3);

            console.log('📈 Top Factors:');
            topFactors.forEach(([factor, score]) => {
              const percentage = (score * 100).toFixed(1);
              console.log(`   ${factor}: ${percentage}%`);
            });
          }
        } catch (error) {
          console.error('Advanced search failed:', error);
          process.exit(1);
        }
      });

    memoryCmd
      .command('store')
      .description('Store execution context')
      .option('-p, --prompt <prompt>', 'Original prompt')
      .option('-r, --reasoning <reasoning>', 'Reasoning')
      .option('-a, --actions <actions>', 'Actions taken')
      .action(async (options: any) => {
        try {
          const memory = new MemoryManager();
          await memory.storeExecution(options);
          console.log('✅ Context stored in memory');
        } catch (error) {
          console.error('Failed to store context:', error);
          process.exit(1);
        }
      });

    memoryCmd
      .command('stats')
      .description('Show memory statistics')
      .action(async () => {
        try {
          const memory = new MemoryManager();
          const stats = await memory.getStats();
          console.log(JSON.stringify(stats, null, 2));
        } catch (error) {
          console.error('Failed to get memory stats:', error);
          process.exit(1);
        }
      });

    memoryCmd
      .command('store-enhanced')
      .description('Store enhanced execution context')
      .option('-p, --prompt <prompt>', 'Original prompt', 'Manual execution')
      .option('-r, --reasoning <reasoning>', 'Reasoning behind the execution')
      .option('-o, --outcome <outcome>', 'Execution outcome')
      .option('-s, --success', 'Mark as successful execution')
      .option('-m, --model <model>', 'Model used for execution')
      .option('-t, --tokens <tokens>', 'Tokens used', '0')
      .option('--tags <tags>', 'Comma-separated tags')
      .option('--priority <priority>', 'Priority level (low|medium|high|critical)', 'medium')
      .option('--category <category>', 'Execution category', 'manual')
      .option('--complexity <complexity>', 'Complexity score (1-10)', '5')
      .option('--confidence <confidence>', 'Confidence score (0-1)', '0.8')
      .action(async (options: any) => {
        try {
          const dbManager = new DatabaseManager();
          const contextManager = new ExecutionContextManager(dbManager);
          const collector = new ContextCollector();

          const tags = options.tags ? options.tags.split(',').map((t: string) => t.trim()) : [];

          const context = await collector.createEnhancedContext(options.prompt, {
            reasoning: options.reasoning,
            outcome: options.outcome,
            success: options.success || false,
            modelUsed: options.model,
            tokensUsed: parseInt(options.tokens),
            tags,
            priority: options.priority,
            category: options.category,
            complexity: parseInt(options.complexity),
            confidence: parseFloat(options.confidence),
            sessionId: contextManager.getCurrentSessionId()
          });

          const executionId = await contextManager.storeEnhancedExecution(context);
          console.log(`✅ Enhanced context stored with ID: ${executionId}`);

        } catch (error) {
          console.error('Failed to store enhanced context:', error);
          process.exit(1);
        }
      });

    memoryCmd
      .command('get-context <execution-id>')
      .description('Get detailed execution context')
      .action(async (executionId: string) => {
        try {
          const dbManager = new DatabaseManager();
          const contextManager = new ExecutionContextManager(dbManager);

          const context = await contextManager.getExecutionContext(parseInt(executionId));

          if (!context) {
            console.log('❌ Execution context not found');
            return;
          }

          console.log('\n📊 Enhanced Execution Context:');
          console.log('─'.repeat(50));
          console.log(`🆔 ID: ${context.id}`);
          console.log(`📝 Prompt: ${context.prompt}`);
          console.log(`⏰ Timestamp: ${context.timestamp.toLocaleString()}`);
          console.log(`✅ Success: ${context.success ? 'Yes' : 'No'}`);
          console.log(`⏱️  Duration: ${context.duration}ms`);

          if (context.modelUsed) {
            console.log(`🤖 Model: ${context.modelUsed}`);
          }

          if (context.tokensUsed) {
            console.log(`🎯 Tokens: ${context.tokensUsed}`);
          }

          console.log('\n🌍 Environment:');
          console.log(`   📁 Working Dir: ${context.environment.workingDirectory}`);
          console.log(`   🌿 Git Branch: ${context.environment.gitBranch || 'N/A'}`);
          console.log(`   📦 Node Version: ${context.environment.nodeVersion}`);
          console.log(`   💻 Platform: ${context.environment.platform}`);

          console.log('\n⚡ Performance:');
          console.log(`   🧠 Memory: ${(context.performance.memoryUsage / 1024 / 1024).toFixed(2)} MB`);
          console.log(`   ⏱️  CPU Time: ${context.performance.cpuTime}μs`);
          console.log(`   💾 I/O Ops: ${context.performance.ioOperations}`);
          console.log(`   🌐 Network: ${context.performance.networkCalls}`);

          console.log('\n🏷️  Metadata:');
          console.log(`   🏆 Priority: ${context.metadata.priority}`);
          console.log(`   📂 Category: ${context.metadata.category}`);
          console.log(`   🧩 Complexity: ${context.metadata.complexity}/10`);
          console.log(`   🎯 Confidence: ${(context.metadata.confidence * 100).toFixed(1)}%`);
          console.log(`   🏷️  Tags: ${context.metadata.tags.join(', ') || 'None'}`);

          if (context.actions.length > 0) {
            console.log(`\n⚡ Actions (${context.actions.length}):`);
            context.actions.forEach((action, i) => {
              console.log(`   ${i + 1}. ${action.command} (${action.status})`);
            });
          }

        } catch (error) {
          console.error('Failed to get execution context:', error);
          process.exit(1);
        }
      });

    memoryCmd
      .command('weights')
      .description('View or update relevance scoring weights')
      .option('--set <weights>', 'Set weights as JSON (e.g., \'{"ftsScore": 0.3}\')')
      .action(async (options: { set?: string }) => {
        try {
          const memory = new MemoryManager();

          if (options.set) {
            const newWeights = JSON.parse(options.set);
            memory.updateRelevanceWeights(newWeights);
            console.log('✅ Relevance weights updated');
          }

          const weights = memory.getRelevanceWeights();
          console.log('\n⚖️  Current Relevance Scoring Weights:');
          console.log('─'.repeat(40));

          Object.entries(weights).forEach(([factor, weight]) => {
            const percentage = (weight * 100).toFixed(1);
            console.log(`${factor.padEnd(20)}: ${percentage}%`);
          });

        } catch (error) {
          console.error('Failed to manage weights:', error);
          process.exit(1);
        }
      });
  }
}