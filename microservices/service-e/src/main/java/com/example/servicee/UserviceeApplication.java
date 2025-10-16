package com.example.servicee;

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
public class UserviceeApplication {

    public static void main(String[] args) {
        SpringApplication.run(UserviceeApplication.class, args);
    }

    @GetMapping("/health")
    public Map<String, Object> health() {
        Map<String, Object> status = new HashMap<>();
        status.put("status", "UP");
        status.put("service", "service-e");
        status.put("timestamp", LocalDateTime.now());
        return status;
    }

    @GetMapping("/api/process/{id}")
    public Map<String, Object> process(@PathVariable String id) {
        // Simulate very-light-load processing work with CPU calculation
        long fibResult = 0;
        for (int i = 0; i < 50; i++) {
            fibResult += fibonacci(24); // Very light CPU load
        }

        Map<String, Object> response = new HashMap<>();
        response.put("id", id);
        response.put("service", "service-e");
        response.put("result", "processed-very-light-load-" + id);
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
        data.put("service", "service-e");
        data.put("type", "very-light-load");
        data.put("data", "Sample data from service-e");
        data.put("timestamp", LocalDateTime.now());
        return data;
    }
}
