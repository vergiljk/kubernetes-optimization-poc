# AI Agent for Kubernetes Resource Optimization - POC

This project demonstrates an AI agent that analyzes Kubernetes microservices metrics and generates resource optimization recommendations.

## Architecture

The system consists of:

1. **5 Spring Boot Microservices** - With varied resource configurations to demonstrate optimization opportunities
2. **Monitoring Stack** - Grafana + Prometheus for metrics collection via Docker Compose
3. **AI Agent (TypeScript)** - Claude Agent SDK with MCP (Model Context Protocol) for Grafana integration
4. **GitOps Repository** - Kubernetes manifests with intentionally varied resource allocations

## Quick Start

### Prerequisites

- Docker Desktop with Kubernetes enabled (10 CPU cores, 32GB RAM recommended)
- Node.js 18+ and npm (for TypeScript AI agent)
- kubectl configured for local cluster
- Claude API key (set in `.env` file)
- Grafana API token (generated from Grafana UI)

### Setup

1. **Clone and navigate to project:**
   ```bash
   cd k8s-optimization-poc
   ```

2. **Start monitoring stack:**
   ```bash
   cd monitoring
   docker-compose up -d
   cd ..
   ```

3. **Deploy services to Kubernetes:**
   ```bash
   cd gitops-repo
   find applications -name "deployment.yaml" -exec kubectl apply -f {} \;
   cd ..
   ```

4. **Configure Environment:**
   ```bash
   # Copy environment template
   cp .env.example .env

   # Edit .env and add:
   # - ANTHROPIC_API_KEY (from Claude Console)
   # - GRAFANA_TOKEN (from Grafana: Configuration → API Keys)
   # - GRAFANA_URL (default: http://localhost:3000)
   ```

5. **Setup and Run AI Agent:**
   ```bash
   cd ai-agent
   npm install
   npm run build
   npm start
   # Or use: ./run_optimizer.sh
   ```

## Service Configurations

| Service | Replicas | CPU Request | CPU Limit | Memory Request | Memory Limit | Load Pattern | Computation | Status |
|---------|----------|-------------|-----------|----------------|--------------|--------------|-------------|--------|
| service-a | 2 | 150m | 300m | 256Mi | 512Mi | Light (5 req/s) | 100x fib(25) | Over-provisioned 🟡 |
| service-b | 3 | 100m | 200m | 256Mi | 512Mi | Heavy (50 req/s) | 1000x fib(30) | Well-sized ✅ |
| service-c | 2 | 200m | 400m | 512Mi | 1Gi | Medium (20 req/s) | 500x fib(28) | Heavily over-provisioned 🔴 |
| service-d | 2 | 120m | 250m | 384Mi | 768Mi | Light-Medium (10 req/s) | 250x fib(26) | Moderately over-provisioned 🟡 |
| service-e | 2 | 200m | 500m | 512Mi | 1Gi | Very Light (2 req/s) | 50x fib(24) | Well-sized ✅ |

**Cluster Resource Usage:**
- CPU: 2490m / 10000m (24%)
- Memory: 4336Mi / 32711Mi (13%)

**POC Scenario:**
This configuration demonstrates a realistic scenario where services perform CPU-intensive work (Fibonacci calculations) but have optimization opportunities:
- **service-a** (150m CPU, 256Mi mem): Over-provisioned for light load (5 req/s with 100x fib(25) calculations)
- **service-b** (100m CPU, 256Mi mem): Well-sized baseline for heavy load (50 req/s with 1000x fib(30) calculations)
- **service-c** (200m CPU, 512Mi mem): Heavily over-provisioned for medium load (20 req/s with 500x fib(28) calculations)
- **service-d** (120m CPU, 384Mi mem): Moderately over-provisioned for light-medium load (10 req/s with 250x fib(26) calculations)
- **service-e** (200m CPU, 512Mi mem): Well-sized baseline for very light load (2 req/s with 50x fib(24) calculations)

**Expected AI Agent Recommendations:**
- Reduce service-a to ~50-75m CPU, 128-192Mi memory (66-75% savings)
- Keep service-b as-is (well-sized)
- Reduce service-c to ~75-100m CPU, 256-384Mi memory (50-62% savings)
- Reduce service-d to ~50-75m CPU, 192-256Mi memory (37-58% savings)
- Keep service-e as-is (baseline for very light workloads)

## Monitoring Access

- **Grafana**: http://localhost:3000 (admin/admin)
  - Dashboard: http://localhost:3000/d/k8s-microservices
  - Includes service filter dropdown for focused analysis
- **Prometheus**: http://localhost:9090

## Load Testing

To generate realistic traffic patterns for the microservices:

### Prerequisites
- Go 1.16+ installed (for `hey` load testing tool)
- All services deployed and running

### Running Load Tests

1. **Navigate to load-testing directory:**
   ```bash
   cd load-testing
   ```

2. **Run the load generation script:**
   ```bash
   chmod +x generate-load.sh
   ./generate-load.sh
   ```

### Load Patterns

The script generates different load levels for each service to simulate real-world scenarios:

| Service | Target RPS | Load Level | Duration |
|---------|-----------|------------|----------|
| service-a | 5 req/s | Light | 10 minutes |
| service-b | 50 req/s | Heavy | 10 minutes |
| service-c | 20 req/s | Medium | 10 minutes |
| service-d | 10 req/s | Light-Medium | 10 minutes |
| service-e | 2 req/s | Very Light | 10 minutes |

**Note:** The load test uses `hey` (HTTP load generator) to access services via NodePort. The script will:
- Auto-install `hey` if not present
- Run concurrent load generation for all services using NodePort endpoints
- Services calculate CPU-intensive Fibonacci numbers (not just sleeping)
- Clean up all processes after completion or on Ctrl+C

**Customization:**
Edit `generate-load.sh` to modify:
- `DURATION`: Test duration in seconds (default: 3600)
- Service configurations: Adjust RPS values in the `SERVICES` array

**Monitoring during load test:**
Watch real-time metrics in Grafana dashboard to observe resource usage patterns under load.

## How It Works

1. **Data Collection**: Agent queries Kubernetes API for current resource configurations using `kubectl`
2. **MCP Integration**: Uses Model Context Protocol to connect to Grafana and query Prometheus datasources
3. **Metrics Analysis**: Queries CPU/memory usage metrics from Prometheus through Grafana MCP server
4. **AI Analysis**: Claude Haiku 4.5 analyzes the data using MCP tools and identifies over-provisioned services
5. **Recommendations**: Generates conservative resource optimization suggestions with safety buffers
6. **PR Creation**: Creates detailed pull request descriptions with metrics and reasoning (simulated for POC)

## Expected Results

The AI agent should analyze metrics from Prometheus/Grafana and identify:

**Expected Optimization Candidates:**
- **service-a** (500m → ~100m CPU): Over-provisioned for light load, potential 80% CPU savings
- **service-c** (600m → ~250m CPU): Heavily over-provisioned for medium load, potential 58% CPU savings
- **service-d** (400m → ~150m CPU): Moderately over-provisioned, potential 62% CPU savings

**Expected Well-Sized Services:**
- **service-b**: Appropriate sizing for heavy load pattern
- **service-e**: Appropriate baseline sizing for very light load

The AI generates detailed PR descriptions with actual metrics, reasoning, and conservative optimization recommendations that maintain performance SLOs.

## Technology Stack

- **AI Agent**: TypeScript with Claude Agent SDK (@anthropic-ai/claude-agent-sdk)
- **AI Model**: Claude Haiku 4.5 (via Anthropic API)
- **Integration**: MCP (Model Context Protocol) for Grafana access
- **Monitoring**: Prometheus + Grafana (Docker Compose)
- **Orchestration**: Kubernetes (Docker Desktop)
- **Services**: Spring Boot REST APIs (Java)

## Next Steps for Production

- Integrate with actual GitHub API for automated PR creation
- Add AWS/cloud cost calculation based on resource changes
- Implement Sloth for SLO monitoring and validation
- Add Slack/Teams notifications for optimization alerts
- Schedule periodic execution via Jenkins, GitHub Actions, or cron
- Add historical trend analysis and seasonality detection
- Implement automated rollback if performance degrades

## Architecture Diagram

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   AI Agent      │    │   Monitoring    │    │   Kubernetes    │
│                 │    │                 │    │                 │
│ ┌─────────────┐ │    │ ┌─────────────┐ │    │ ┌─────────────┐ │
│ │ Analysis    │ │◄───┤ │ Prometheus  │ │◄───┤ │ Services    │ │
│ │ Subagent    │ │    │ │             │ │    │ │ A,B,C,D,E   │ │
│ └─────────────┘ │    │ └─────────────┘ │    │ └─────────────┘ │
│ ┌─────────────┐ │    │ ┌─────────────┐ │    └─────────────────┘
│ │ PR          │ │    │ │ Grafana     │ │              │
│ │ Subagent    │ │    │ │             │ │              │
│ └─────────────┘ │    │ └─────────────┘ │              │
│ ┌─────────────┐ │    └─────────────────┘              │
│ │Orchestrator │ │                                     │
│ └─────────────┘ │◄────────────────────────────────────┘
└─────────────────┘       (kubectl API)
```