#!/bin/bash

# Install hey if not present
if ! command -v hey &> /dev/null; then
    echo "Installing hey load testing tool..."
    go install github.com/rakyll/hey@latest
    # Add go bin to PATH if not already there
    export PATH=$PATH:$(go env GOPATH)/bin
fi

# Service endpoints (adjust these based on your service exposure method)
SERVICES=(
    "service-a:8080:10"     # service:port:requests_per_second
    "service-b:8081:500"    # Heavy load
    "service-c:8082:100"    # Medium load
    "service-d:8083:50"     # Light-medium load
    "service-e:8084:5"      # Very light load
)

# Duration of load test in seconds
DURATION=3600  # 1 hour

echo "Starting load generation for $DURATION seconds..."

# Function to generate load for a service
generate_load() {
    local service_port=$1
    local rps=$2
    local service_name=$(echo $service_port | cut -d':' -f1)
    local port=$(echo $service_port | cut -d':' -f2)

    echo "Generating load for $service_name at $rps requests/second"

    # Use kubectl port-forward to access services
    kubectl port-forward service/$service_name $port:80 &
    local port_forward_pid=$!

    # Wait for port-forward to establish
    sleep 5

    # Generate load
    hey -z ${DURATION}s -q $rps -c 10 "http://localhost:$port/api/process/test-$(date +%s)" &
    local hey_pid=$!

    # Store PIDs for cleanup
    echo "$port_forward_pid" >> /tmp/port_forward_pids
    echo "$hey_pid" >> /tmp/hey_pids
}

# Clean up any existing processes
rm -f /tmp/port_forward_pids /tmp/hey_pids

# Start load generation for each service
for service_config in "${SERVICES[@]}"; do
    IFS=':' read -r service port rps <<< "$service_config"
    generate_load "$service:$port" $rps &
    sleep 2  # Stagger the starts
done

echo "Load generation started for all services"
echo "Monitoring for $DURATION seconds..."

# Wait for the test duration
sleep $DURATION

# Clean up
echo "Cleaning up processes..."
if [ -f /tmp/port_forward_pids ]; then
    while read pid; do
        kill $pid 2>/dev/null || true
    done < /tmp/port_forward_pids
    rm /tmp/port_forward_pids
fi

if [ -f /tmp/hey_pids ]; then
    while read pid; do
        kill $pid 2>/dev/null || true
    done < /tmp/hey_pids
    rm /tmp/hey_pids
fi

echo "Load generation completed!"