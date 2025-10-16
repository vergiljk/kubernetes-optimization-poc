# K8s Optimization POC - GitOps Repository

This repository contains the Kubernetes manifests for the microservices used in the AI Agent for Kubernetes Resource Optimization POC.

## Structure

```
applications/
├── service-a/          # Light load service (over-provisioned: 2 CPU, 4GB RAM)
├── service-b/          # Heavy load service (well-sized: 1 CPU, 2GB RAM)
├── service-c/          # Medium load service (over-provisioned: 3 CPU, 6GB RAM)
├── service-d/          # Light-medium load service (over-provisioned: 1.5 CPU, 3GB RAM)
└── service-e/          # Very light load service (over-provisioned: 2 CPU, 4GB RAM)
```

## Resource Allocation Strategy

The services are intentionally over-provisioned with different levels to test the AI agent's optimization capabilities:

- **Service A**: 2 CPU, 4GB RAM (light load - 10 req/sec)
- **Service B**: 1 CPU, 2GB RAM (heavy load - 500 req/sec) - Well-sized
- **Service C**: 3 CPU, 6GB RAM (medium load - 100 req/sec) - Over-provisioned
- **Service D**: 1.5 CPU, 3GB RAM (light-medium load - 50 req/sec) - Over-provisioned
- **Service E**: 2 CPU, 4GB RAM (very light load - 5 req/sec) - Heavily over-provisioned

## Deployment

Deploy all services to your Kubernetes cluster:

```bash
kubectl apply -f applications/service-a/deployment.yaml
kubectl apply -f applications/service-b/deployment.yaml
kubectl apply -f applications/service-c/deployment.yaml
kubectl apply -f applications/service-d/deployment.yaml
kubectl apply -f applications/service-e/deployment.yaml
```

## Monitoring

All services expose Prometheus metrics at `/actuator/prometheus` and are configured with appropriate annotations for Prometheus scraping.