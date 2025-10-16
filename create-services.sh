#!/bin/bash

# Service configurations: name, port, sleep_time (ms), description
services=(
    "service-b:8081:100:heavy-load"
    "service-c:8082:50:medium-load"
    "service-d:8083:20:light-medium-load"
    "service-e:8084:5:very-light-load"
)

for service_config in "${services[@]}"; do
    IFS=':' read -r service_name port sleep_time load_type <<< "$service_config"

    echo "Creating $service_name..."

    # Create directory structure
    mkdir -p "microservices/$service_name/src/main/java/com/example/${service_name//-/}"
    mkdir -p "microservices/$service_name/src/main/resources"

    # Create pom.xml
    cat > "microservices/$service_name/pom.xml" << EOF
<?xml version="1.0" encoding="UTF-8"?>
<project xmlns="http://maven.apache.org/POM/4.0.0"
         xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
         xsi:schemaLocation="http://maven.apache.org/POM/4.0.0 http://maven.apache.org/xsd/maven-4.0.0.xsd">
    <modelVersion>4.0.0</modelVersion>

    <parent>
        <groupId>org.springframework.boot</groupId>
        <artifactId>spring-boot-starter-parent</artifactId>
        <version>3.2.0</version>
        <relativePath/>
    </parent>

    <groupId>com.example</groupId>
    <artifactId>$service_name</artifactId>
    <version>0.0.1-SNAPSHOT</version>
    <name>$service_name</name>
    <description>$load_type Service for K8s optimization POC</description>

    <properties>
        <java.version>21</java.version>
    </properties>

    <dependencies>
        <dependency>
            <groupId>org.springframework.boot</groupId>
            <artifactId>spring-boot-starter-web</artifactId>
        </dependency>
        <dependency>
            <groupId>org.springframework.boot</groupId>
            <artifactId>spring-boot-starter-actuator</artifactId>
        </dependency>
        <dependency>
            <groupId>io.micrometer</groupId>
            <artifactId>micrometer-registry-prometheus</artifactId>
        </dependency>
    </dependencies>

    <build>
        <plugins>
            <plugin>
                <groupId>org.springframework.boot</groupId>
                <artifactId>spring-boot-maven-plugin</artifactId>
            </plugin>
        </plugins>
    </build>
</project>
EOF

    # Create main application class
    package_name=$(echo $service_name | sed 's/-//g')
    class_name=$(echo $service_name | sed 's/-//g' | sed 's/^./\U&/' | sed 's/\(.\)\([A-Z]\)/\1\U\2/g')Application

    cat > "microservices/$service_name/src/main/java/com/example/$package_name/${class_name}.java" << EOF
package com.example.$package_name;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.bind.annotation.PathVariable;

import java.util.Map;
import java.util.HashMap;
import java.time.LocalDateTime;

@SpringBootApplication
@RestController
public class $class_name {

    public static void main(String[] args) {
        SpringApplication.run($class_name.class, args);
    }

    @GetMapping("/health")
    public Map<String, Object> health() {
        Map<String, Object> status = new HashMap<>();
        status.put("status", "UP");
        status.put("service", "$service_name");
        status.put("timestamp", LocalDateTime.now());
        return status;
    }

    @GetMapping("/api/process/{id}")
    public Map<String, Object> process(@PathVariable String id) {
        // Simulate $load_type processing work
        try {
            Thread.sleep($sleep_time); // ${sleep_time}ms processing time
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
        }

        Map<String, Object> response = new HashMap<>();
        response.put("id", id);
        response.put("service", "$service_name");
        response.put("result", "processed-$load_type-" + id);
        response.put("timestamp", LocalDateTime.now());
        return response;
    }

    @GetMapping("/api/data")
    public Map<String, Object> getData() {
        Map<String, Object> data = new HashMap<>();
        data.put("service", "$service_name");
        data.put("type", "$load_type");
        data.put("data", "Sample data from $service_name");
        data.put("timestamp", LocalDateTime.now());
        return data;
    }
}
EOF

    # Create application.yml
    cat > "microservices/$service_name/src/main/resources/application.yml" << EOF
server:
  port: $port

spring:
  application:
    name: $service_name

management:
  endpoints:
    web:
      exposure:
        include: health,info,metrics,prometheus
  endpoint:
    health:
      show-details: always
    metrics:
      enabled: true
    prometheus:
      enabled: true
  metrics:
    export:
      prometheus:
        enabled: true
EOF

    # Create Dockerfile
    cat > "microservices/$service_name/Dockerfile" << EOF
FROM openjdk:21-jdk-slim

WORKDIR /app

COPY target/$service_name-0.0.1-SNAPSHOT.jar app.jar

EXPOSE $port

ENTRYPOINT ["java", "-jar", "app.jar"]
EOF

    echo "$service_name created successfully"
done

echo "All services created!"