#!/bin/bash

# Install hey if not present
if ! command -v hey &> /dev/null; then
    echo "Installing hey load testing tool..."
    go install github.com/rakyll/hey@latest
    # Add go bin to PATH if not already there
    export PATH=$PATH:$(go env GOPATH)/bin
fi

# Service endpoints using NodePort (services are exposed on these ports)
SERVICES=(
    "service-a:30080:5"      # service:nodeport:requests_per_second - Light load
    "service-b:30081:50"     # Heavy load (reduced from 500 due to CPU-intensive Fibonacci)
    "service-c:30082:20"     # Medium load (reduced from 100)
    "service-d:30083:10"     # Light-medium load (reduced from 50)
    "service-e:30084:2"      # Very light load (reduced from 5)
)

# Duration of load test in seconds
DURATION=600  # 1 hour

echo "Starting load generation for $DURATION seconds..."
echo "Using NodePort services (no port-forwarding required)"

# Function to generate load for a service
generate_load() {
    local service_name=$1
    local nodeport=$2
    local rps=$3

    echo "Generating load for $service_name on port $nodeport at $rps requests/second"

    # Generate load directly to NodePort
    hey -z ${DURATION}s -q $rps -c 10 "http://localhost:$nodeport/api/process/test-$(date +%s)" &
    local hey_pid=$!

    # Store PID for cleanup
    echo "$hey_pid" >> /tmp/hey_pids
}

# Clean up any existing processes
rm -f /tmp/hey_pids

# Start load generation for each service
for service_config in "${SERVICES[@]}"; do
    IFS=':' read -r service nodeport rps <<< "$service_config"
    generate_load "$service" "$nodeport" "$rps" &
    sleep 2  # Stagger the starts
done

echo "Load generation started for all services"
echo "Monitoring for $DURATION seconds..."
echo "Press Ctrl+C to stop early"

# Set up trap to handle cleanup on interrupt
trap cleanup INT TERM

cleanup() {
    echo ""
    echo "Stopping load generation..."
    if [ -f /tmp/hey_pids ]; then
        while read pid; do
            kill $pid 2>/dev/null || true
        done < /tmp/hey_pids
        rm /tmp/hey_pids
    fi
    echo "Load generation stopped!"
    exit 0
}

# Wait for the test duration
sleep $DURATION

# Clean up
echo "Cleaning up processes..."
cleanup