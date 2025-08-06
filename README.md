# Sentient AI Agent Platform

> Transform any LLM into a transparent, memory-equipped, and accountable team member

[![Version](https://img.shields.io/badge/version-1.0.0-blue.svg)](https://github.com/sentient/sentient-platform)
[![License](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)
[![Node](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen.svg)](https://nodejs.org/)

## 🚀 Overview

Sentient is an autonomous AI agent platform that provides the foundational infrastructure for any Large Language Model (LLM) to operate as a transparent, memory-equipped, and accountable team member. Rather than building a proprietary AI, Sentient provides the "operating system" for AI agents.

### Key Features

- **🔧 Universal Toolkit**: CLI-first tools accessible to any LLM
- **🧠 Persistent Memory**: SQLite-based knowledge base with FTS5 search
- **👁️ Complete Transparency**: Glass Box UI for full visibility into AI operations
- **🔒 Enterprise Security**: Local-first architecture with sandboxed execution
- **🔄 Model Agnostic**: Works with any LLM that supports tool calling
- **📊 Performance Monitoring**: Real-time metrics and analytics

## 🏗️ Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Sentient CLI  │    │ Knowledge Base  │    │  Glass Box UI   │
│   (Toolkit)     │◄──►│   (Memory)      │◄──►│ (Transparency)  │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         ▲                       ▲                       ▲
         │                       │                       │
         └───────────────────────┼───────────────────────┘
                                 ▼
                    ┌─────────────────┐
                    │ Plan & Execute  │
                    │    Engine       │
                    └─────────────────┘
```

### Core Components

1. **Sentient CLI**: Globally-installed command-line toolkit
2. **Knowledge Base**: Persistent SQLite database with full-text search
3. **Plan & Execute Engine**: Task orchestration and execution pipeline
4. **Glass Box UI**: VS Code webview for real-time monitoring

## 📦 Installation

### Prerequisites

- Node.js 18.0.0 or higher
- npm 8.0.0 or higher
- VS Code 1.60.0 or higher (for Glass Box UI)

### Quick Start

```bash
# Install the CLI globally
npm install -g @sentient/cli

# Initialize in your project
cd your-project
sentient init

# Install VS Code extension
code --install-extension sentient-vscode-extension
```

## 🎯 Usage

### CLI Commands

```bash
# Initialize Sentient in current project
sentient init

# Check system status
sentient status

# File operations
sentient file read <path>
sentient file write <path> --content "content"
sentient file search <query>

# Memory operations
sentient memory search <query>
sentient memory stats

# Run tests
sentient test [path]
```

### LLM Integration

Sentient automatically provides tool functions to LLMs:

```javascript
// Available to any LLM with tool calling
await sentient.read_file("src/main.ts")
await sentient.search_codebase("function calculateTotal")
await sentient.run_tests("tests/")
await sentient.search_knowledge_base("similar error handling")
await sentient.commit_changes("Fixed calculation bug")
```

### Glass Box UI

1. Open VS Code in a Sentient-initialized project
2. Open Command Palette (`Ctrl/Cmd + Shift + P`)
3. Run `Sentient: Open Glass Box Dashboard`
4. Monitor real-time AI operations with complete transparency

## 🛠️ Development

### Project Structure

```
sentient-ai-toolchain/
├── cli/                    # CLI package
│   ├── src/
│   │   ├── commands/       # CLI commands
│   │   ├── core/          # Core functionality
│   │   ├── database/      # SQLite management
│   │   ├── memory/        # Knowledge base
│   │   └── utils/         # Utilities
│   └── package.json
├── extension/             # VS Code extension
│   ├── src/
│   │   ├── commands/      # Extension commands
│   │   ├── providers/     # Tree/webview providers
│   │   └── webview/       # Glass Box UI
│   └── package.json
├── shared/                # Shared types and utilities
└── docs/                  # Documentation
```

### Building from Source

```bash
# Clone repository
git clone https://github.com/sentient/sentient-platform.git
cd sentient-platform

# Install dependencies
npm install

# Build all packages
npm run build

# Run tests
npm run test

# Start development
npm run dev
```

### Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Make your changes
4. Add tests for new functionality
5. Ensure all tests pass: `npm test`
6. Commit your changes: `git commit -m 'Add amazing feature'`
7. Push to the branch: `git push origin feature/amazing-feature`
8. Open a Pull Request

## 🔧 Configuration

### Project Configuration (`.sentient/config.json`)

```json
{
  "version": "1.0.0",
  "project": {
    "name": "my-project",
    "initialized": "2025-08-06T12:00:00Z"
  },
  "memory": {
    "retention": "6 months",
    "maxEntries": 10000
  },
  "security": {
    "sandboxed": true,
    "allowedCommands": ["read", "write", "test", "search"]
  }
}
```

### VS Code Settings

```json
{
  "sentient.autoActivate": true,
  "sentient.dashboardPort": 3001
}
```

## 📊 Performance Targets

- **CLI Response Time**: <200ms for 95th percentile
- **Knowledge Base Query**: <1s for complex searches
- **Memory Utilization**: <80% of available system memory
- **Success Rate**: >90% for plan execution completion

## 🔒 Security

Sentient implements enterprise-grade security features:

- **Local-first Architecture**: All data stored locally
- **Command Whitelisting**: Configurable allowed operations
- **Sandboxed Execution**: Isolated environment for code execution
- **Audit Logging**: Comprehensive activity tracking
- **Data Encryption**: AES-256 for sensitive knowledge base entries

## 📖 Documentation

- [API Reference](docs/api/README.md)
- [User Guide](docs/guides/README.md)
- [Architecture Overview](docs/architecture.md)
- [Troubleshooting](docs/troubleshooting/README.md)

## 🤝 Support

- [GitHub Issues](https://github.com/sentient/sentient-platform/issues)
- [Documentation](https://docs.sentient.dev)
- [Community Discord](https://discord.gg/sentient)

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Built on the shoulders of amazing open-source projects
- Inspired by the need for transparent and accountable AI
- Community feedback and contributions

---

**Made with ❤️ by the Sentient Team**