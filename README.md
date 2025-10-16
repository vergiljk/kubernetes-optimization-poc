# AI Agent for Kubernetes Resource Optimization - POC

This project demonstrates an AI agent that analyzes Kubernetes microservices metrics and generates resource optimization recommendations.

## Architecture

The system consists of:

1. **5 Spring Boot Microservices** - Intentionally over-provisioned for testing
2. **Monitoring Stack** - Grafana + Prometheus for metrics collection
3. **AI Agent** - Claude-powered analysis and optimization recommendations
4. **GitOps Repository** - Kubernetes manifests with resource configurations

## Project Status

✅ **Completed Components:**
- Local Kubernetes cluster setup
- 5 Spring Boot REST API microservices with different load patterns
- GitOps repository structure with over-provisioned resource configurations
- Monitoring stack (Grafana + Prometheus) via Docker Compose
- AI Agent implementation using Claude Agent SDK

⚠️ **Known Issues:**
- Some services may be pending due to intentional over-provisioning demonstrating the problem
- Prometheus metrics collection needs configuration for K8s cluster access

## Quick Start

### Prerequisites

- Docker Desktop with Kubernetes enabled
- Python 3.10+
- kubectl configured for local cluster
- Claude API key

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

4. **Setup AI Agent:**
   ```bash
   # Create Python virtual environment
   python3 -m venv venv
   source venv/bin/activate
   pip install claude-agent-sdk requests

   # Configure API key
   cp .env.example .env
   # Edit .env and add your ANTHROPIC_API_KEY
   ```

5. **Run the AI Agent:**
   ```bash
   chmod +x ai-agent/run_optimizer.sh
   ./ai-agent/run_optimizer.sh
   ```

## Service Configurations

| Service | CPU Request | Memory Request | Load Pattern | Expected Outcome |
|---------|-------------|----------------|--------------|------------------|
| service-a | 2000m | 4Gi | Light (10 req/s) | Over-provisioned |
| service-b | 1000m | 2Gi | Heavy (500 req/s) | Well-sized |
| service-c | 3000m | 6Gi | Medium (100 req/s) | Over-provisioned |
| service-d | 1500m | 3Gi | Light-Medium (50 req/s) | Over-provisioned |
| service-e | 2000m | 4Gi | Very Light (5 req/s) | Heavily over-provisioned |

## Monitoring Access

- **Grafana**: http://localhost:3000 (admin/admin)
- **Prometheus**: http://localhost:9090

## How It Works

1. **Data Collection**: Agent queries Kubernetes API for current resource configurations
2. **Metrics Analysis**: Fetches CPU/memory usage metrics from Prometheus over 30-60 minute windows
3. **AI Analysis**: Claude analyzes the data and identifies over-provisioned services
4. **Recommendations**: Generates conservative resource optimization suggestions
5. **PR Creation**: Creates pull request descriptions with detailed reasoning (simulated in POC)

## Expected Results

The AI agent should identify services A, C, D, and E as over-provisioned and recommend reduced resource allocations while keeping service B as well-sized.

## Next Steps

For production deployment:
- Add Sloth for SLO monitoring
- Integrate with actual GitHub API for PR creation
- Add AWS cost calculation
- Implement Slack notifications
- Schedule periodic execution via Jenkins/cron

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