#!/bin/bash

# Service configurations: name, port, memory_request, cpu_request, load_type
services=(
    "service-b:8081:2Gi:1000m:heavy-load"
    "service-c:8082:6Gi:3000m:medium-load"
    "service-d:8083:3Gi:1500m:light-medium-load"
    "service-e:8084:4Gi:2000m:very-light-load"
)

for service_config in "${services[@]}"; do
    IFS=':' read -r service_name port memory_req cpu_req load_type <<< "$service_config"

    echo "Creating K8s manifests for $service_name..."

    # Create directory
    mkdir -p "gitops-repo/applications/$service_name"

    # Create deployment.yaml
    cat > "gitops-repo/applications/$service_name/deployment.yaml" << EOF
apiVersion: apps/v1
kind: Deployment
metadata:
  name: $service_name
  namespace: default
  labels:
    app: $service_name
    component: microservice
spec:
  replicas: 2
  selector:
    matchLabels:
      app: $service_name
  template:
    metadata:
      labels:
        app: $service_name
      annotations:
        prometheus.io/scrape: "true"
        prometheus.io/port: "$port"
        prometheus.io/path: "/actuator/prometheus"
    spec:
      containers:
      - name: $service_name
        image: k8s-poc/$service_name:latest
        imagePullPolicy: Never  # For local images
        ports:
        - containerPort: $port
          name: http
        resources:
          requests:
            memory: "$memory_req"    # Intentionally over-provisioned for testing
            cpu: "$cpu_req"          # Over-provisioned CPU
          limits:
            memory: "\$(echo $memory_req | sed 's/Gi//')Gi"
            cpu: "\$(( \$(echo $cpu_req | sed 's/m//') + 500 ))m"
        readinessProbe:
          httpGet:
            path: /health
            port: $port
          initialDelaySeconds: 30
          periodSeconds: 10
        livenessProbe:
          httpGet:
            path: /health
            port: $port
          initialDelaySeconds: 60
          periodSeconds: 30
        env:
        - name: JAVA_OPTS
          value: "-Xms512m -Xmx\$(echo $memory_req | sed 's/Gi/g/')"
---
apiVersion: v1
kind: Service
metadata:
  name: $service_name
  labels:
    app: $service_name
spec:
  selector:
    app: $service_name
  ports:
  - name: http
    port: 80
    targetPort: $port
  type: ClusterIP
EOF

    echo "$service_name K8s manifests created"
done

echo "All K8s manifests created!"