#!/bin/bash

# K8s Resource Optimizer Runner Script (TypeScript Version)
# Uses Claude Agent SDK with TypeScript/Node.js

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🚀 K8s Resource Optimizer (TypeScript/Claude Agent SDK)${NC}"
echo "============================================================"

# Change to the ai-agent directory
cd "$(dirname "$0")"

# Function to print colored output
print_status() {
    echo -e "${GREEN}✅${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}⚠️${NC} $1"
}

print_error() {
    echo -e "${RED}❌${NC} $1"
}

print_info() {
    echo -e "${BLUE}ℹ️${NC} $1"
}

# Check if Node.js is installed
print_info "Checking Node.js installation..."
if ! command -v node &> /dev/null; then
    print_error "Node.js is not installed. Please install Node.js 18 or later."
    exit 1
fi

NODE_VERSION=$(node --version | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    print_error "Node.js version 18 or later is required. Current version: $(node --version)"
    exit 1
fi
print_status "Node.js $(node --version) is installed"

# Check if npm dependencies are installed
print_info "Checking npm dependencies..."
if [ ! -d "node_modules" ]; then
    print_info "Installing npm dependencies..."
    npm install
fi
print_status "npm dependencies are ready"

# Check if TypeScript files can be compiled
print_info "Checking TypeScript compilation..."
if ! npx tsc --noEmit; then
    print_error "TypeScript compilation failed. Please fix the errors above."
    exit 1
fi
print_status "TypeScript compilation successful"

# Load environment variables (the script will handle this internally)
print_info "Environment variables will be loaded by the script"

# Check if Docker is running
print_info "Checking Docker..."
if ! docker info &> /dev/null; then
    print_error "Docker is not running. Please start Docker Desktop."
    exit 1
fi
print_status "Docker is running"

# Check if Grafana MCP container is running
print_info "Checking Grafana MCP container..."
if docker ps --format '{{.Names}}' | grep -q "^grafana-mcp$"; then
    print_status "Grafana MCP container is running"

    # Test MCP communication
    print_info "Testing MCP communication..."
    if echo '{"jsonrpc": "2.0", "method": "tools/list", "id": 1}' | \
       timeout 10 docker exec -i grafana-mcp /app/mcp-grafana -t stdio > /dev/null 2>&1; then
        print_status "Grafana MCP server communication is working"
    else
        print_warning "Grafana MCP server communication test failed"
        echo "  Container status: $(docker ps --format '{{.Status}}' --filter name=grafana-mcp)"
    fi
else
    print_error "Grafana MCP container is not running"
    echo "  Please start the monitoring stack: docker-compose up -d"
    exit 1
fi

# Check if Kubernetes cluster is accessible
print_info "Checking Kubernetes cluster access..."
if ! kubectl cluster-info &> /dev/null; then
    print_error "Cannot access Kubernetes cluster. Please ensure kubectl is configured correctly."
    exit 1
fi
print_status "Kubernetes cluster is accessible"

# Check if services are deployed and running
print_info "Checking running services..."
RUNNING_SERVICES=0
for service in service-a service-b; do
    if kubectl get deployment "$service" &> /dev/null; then
        status=$(kubectl get deployment "$service" -o jsonpath='{.status.readyReplicas}' 2>/dev/null || echo "0")
        if [ "$status" -gt 0 ] 2>/dev/null; then
            print_status "$service is running ($status replicas)"
            ((RUNNING_SERVICES++))
        else
            print_warning "$service is deployed but not ready"
        fi
    else
        print_warning "$service is not deployed"
    fi
done

if [ $RUNNING_SERVICES -eq 0 ]; then
    print_error "No services are running. Please deploy services first."
    exit 1
fi

# Check if Grafana is accessible
print_info "Checking Grafana access..."
if curl -s http://localhost:3000/api/health &> /dev/null; then
    print_status "Grafana is accessible"
else
    print_warning "Grafana is not accessible at http://localhost:3000"
    echo "  Make sure the monitoring stack is running: docker-compose up -d"
fi

echo ""
echo -e "${BLUE}🎯 Starting K8s Resource Optimizer (TypeScript Version)...${NC}"
echo "=============================================================="

# Run the optimizer with timeout and error handling
print_info "Executing optimization cycle..."
echo ""

if timeout 300 npm run dev; then
    echo ""
    print_status "Optimization cycle completed successfully!"
else
    exit_code=$?
    echo ""
    if [ $exit_code -eq 124 ]; then
        print_error "Optimization timed out after 5 minutes"
    else
        print_error "Optimization failed with exit code: $exit_code"
    fi
    exit $exit_code
fi

echo ""
print_info "For more details, check the logs above."
print_info "To run again: ./run_typescript_optimizer.sh"