# K8s Resource Optimizer AI Agent

This directory contains the AI agent implementation for Kubernetes resource optimization using Claude Agent SDK.

## Current Implementation: TypeScript + Claude Agent SDK

### Files

- **`optimizer.ts`** - Main TypeScript optimizer using Claude Agent SDK with MCP integration
- **`run_typescript_optimizer.sh`** - Shell script to run the TypeScript optimizer with prerequisites checking
- **`package.json`** - Node.js dependencies and scripts
- **`tsconfig.json`** - TypeScript configuration
- **`archive/`** - Archived Python implementations for reference

### Quick Start

1. **Prerequisites:**
   - Node.js 18+ installed
   - Docker running with Grafana MCP container
   - Kubernetes cluster accessible via kubectl
   - Environment variables in `.env` file at project root

2. **Run the optimizer:**
   ```bash
   ./run_typescript_optimizer.sh
   ```

3. **Alternative direct execution:**
   ```bash
   npm install
   npm run dev
   ```

### Features

✅ **Working Features:**
- Automatic `.env` file loading for environment variables
- Claude Agent SDK integration with MCP servers
- Grafana MCP server communication for metrics retrieval
- Kubernetes deployment configuration analysis
- Comprehensive prerequisite checking
- Detailed logging and error handling
- TypeScript compilation and execution

⚠️ **Known Issues:**
- Claude Code process occasionally exits with code 1 (authentication/config issue)
- MCP tool integration needs Claude Code CLI dependency

### Environment Variables Required

```bash
ANTHROPIC_API_KEY=your_claude_api_key_here
GRAFANA_URL=http://localhost:3000
PROMETHEUS_URL=http://localhost:9090
```

### Configuration

The optimizer analyzes these services by default:
- `service-a` (exposed on port 30080)
- `service-b` (exposed on port 30081)

### Architecture

```
optimizer.ts
├── Environment Loading (.env file)
├── Prerequisites Checking
├── Claude Agent SDK Setup
│   ├── MCP Server Configuration (Grafana)
│   └── Allowed Tools Definition
├── Service Analysis Loop
│   ├── Kubernetes Config Retrieval
│   ├── Claude + MCP Analysis
│   └── Optimization Recommendations
└── PR Description Generation
```

### MCP Integration

The optimizer uses the Grafana MCP server to:
- List available datasources
- Query Prometheus metrics
- Analyze CPU and memory usage patterns

### Output

The optimizer provides:
- Service-by-service analysis results
- Optimization recommendations with resource savings
- Detailed reasoning based on actual metrics
- Pull request descriptions for recommended changes

## Development

### Build & Run
```bash
npm run build    # Compile TypeScript
npm run start    # Run compiled JavaScript
npm run dev      # Run with ts-node (development)
```

### Testing
```bash
./run_typescript_optimizer.sh  # Full prerequisite checking + execution
```

## Previous Implementations

See `archive/python-versions/` for previous Python implementations, including a working version using direct Anthropic API with manual MCP integration.

## Troubleshooting

1. **"Claude Code process exited with code 1"**
   - Verify ANTHROPIC_API_KEY is set correctly
   - Check if Claude Code CLI needs additional configuration

2. **"MCP container not running"**
   - Start monitoring stack: `docker-compose up -d`

3. **"Kubernetes cluster not accessible"**
   - Verify kubectl configuration: `kubectl cluster-info`

4. **TypeScript compilation errors**
   - Check Node.js version (18+ required)
   - Run `npm install` to update dependencies