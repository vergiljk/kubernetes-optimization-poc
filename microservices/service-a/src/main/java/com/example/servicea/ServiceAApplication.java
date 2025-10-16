package com.example.servicea;

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
public class ServiceAApplication {

    public static void main(String[] args) {
        SpringApplication.run(ServiceAApplication.class, args);
    }

    @GetMapping("/health")
    public Map<String, Object> health() {
        Map<String, Object> status = new HashMap<>();
        status.put("status", "UP");
        status.put("service", "service-a");
        status.put("timestamp", LocalDateTime.now());
        return status;
    }

    @GetMapping("/api/process/{id}")
    public Map<String, Object> process(@PathVariable String id) {
        // Simulate light processing work with CPU calculation
        long fibResult = 0;
        for (int i = 0; i < 100; i++) {
            fibResult += fibonacci(25); // Light CPU load
        }

        Map<String, Object> response = new HashMap<>();
        response.put("id", id);
        response.put("service", "service-a");
        response.put("result", "processed-light-" + id);
        response.put("computation", fibResult);
        response.put("timestamp", LocalDateTime.now());
        return response;
    }

    private long fibonacci(int n) {
        if (n <= 1) return n;
        long a = 0, b = 1;
        for (int i = 2; i <= n; i++) {
            long temp = a + b;
            a = b;
            b = temp;
        }
        return b;
    }

    @GetMapping("/api/data")
    public Map<String, Object> getData() {
        Map<String, Object> data = new HashMap<>();
        data.put("service", "service-a");
        data.put("type", "light-load");
        data.put("data", "Sample data from service A");
        data.put("timestamp", LocalDateTime.now());
        return data;
    }
}