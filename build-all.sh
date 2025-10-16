#!/bin/bash

services=("service-a" "service-b" "service-c" "service-d" "service-e")

for service in "${services[@]}"; do
    echo "Building $service..."
    cd "microservices/$service"

    # Build with Maven
    mvn clean package -DskipTests

    # Build Docker image
    docker build -t "k8s-poc/$service:latest" .

    echo "$service built successfully"
    cd ../..
done

echo "All services built!"

# List built images
echo "Docker images:"
docker images | grep k8s-poc