# Sentient AI Toolchain - Development Context

## Project Overview
**Sentient** is an autonomous AI agent platform that provides foundational infrastructure for any LLM to operate as a transparent, memory-equipped, and accountable team member. It's essentially "CodeContext Pro 2.0" with enterprise-grade features.

## Current Status
- **Phase**: Just scaffolded, ready for Phase 1 development
- **CodeContext Pro**: Currently active for memory tracking (execution engine missing)
- **Architecture**: 4 core pillars: CLI Toolkit, Plan & Execute Engine, Knowledge Base, Glass Box UI

## Key Differentiators vs CodeContext Pro
1. **Sentient CLI**: Advanced toolkit with project-centric approach (.sentient directory)
2. **Plan & Execute Engine**: Orchestration pipeline with step-by-step execution and rollback
3. **Knowledge Base**: SQLite + FTS5 with memory traceability and relevance scoring
4. **Glass Box UI**: VS Code webview dashboard with complete transparency and controls
5. **Enterprise Features**: Security model, RBAC, team collaboration, monitoring

## Development Approach
- **Duration**: 10 weeks (5 phases, 2 weeks each)
- **Team**: 3-5 developers (1 lead, 2-3 full-stack, 1 UI/UX)
- **Methodology**: Scrum with daily standups
- **Dogfooding**: Using CodeContext Pro to build Sentient

## Technology Stack
- **Runtime**: Node.js 18+ with TypeScript
- **CLI**: Commander.js
- **Database**: SQLite with better-sqlite3 and FTS5
- **VS Code**: Extension API with Webview
- **Security**: AES-256 encryption, sandboxed execution
- **Distribution**: NPM global package

## Key Files & Directories
- `cli/` - Main CLI implementation
- `extension/` - VS Code extension
- `shared/` - Shared utilities and types
- `tech-docs/` - Technical specifications
- `.codecontext/` - CodeContext Pro memory database

## Commands to Run
```bash
# Check CodeContext Pro status
codecontext-pro status

# Export memory context
codecontext-pro memory --export memory-backup.json

# Build CLI (when ready)
cd cli && npm run build

# Test CLI (when implemented)
cd cli && npm test
```

## Current Priority Tasks (Phase 1.1)
1. Set up TypeScript project with tooling
2. Configure CI/CD pipeline
3. Design CLI architecture with Commander.js
4. Implement base command structure
5. Create logging and error handling

## Success Metrics
- **Technical**: >90% coverage, <200ms CLI response, <1s KB queries
- **Business**: 1000+ installations in 6 months, 10+ enterprise pilots
- **Quality**: >4.5/5 user rating, >80% monthly retention

## Next Steps for New Claude Instance
1. Review this context and the todo list
2. Start with Phase 1.1 tasks if ready to begin development
3. Focus on foundation setup before moving to advanced features
4. Use CodeContext Pro memory to track progress

---
*Last updated by Claude during project analysis and planning phase*