package com.example.servicec;

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
public class UservicecApplication {

    public static void main(String[] args) {
        SpringApplication.run(UservicecApplication.class, args);
    }

    @GetMapping("/health")
    public Map<String, Object> health() {
        Map<String, Object> status = new HashMap<>();
        status.put("status", "UP");
        status.put("service", "service-c");
        status.put("timestamp", LocalDateTime.now());
        return status;
    }

    @GetMapping("/api/process/{id}")
    public Map<String, Object> process(@PathVariable String id) {
        // Simulate medium-load processing work
        try {
            Thread.sleep(50); // 50ms processing time
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
        }

        Map<String, Object> response = new HashMap<>();
        response.put("id", id);
        response.put("service", "service-c");
        response.put("result", "processed-medium-load-" + id);
        response.put("timestamp", LocalDateTime.now());
        return response;
    }

    @GetMapping("/api/data")
    public Map<String, Object> getData() {
        Map<String, Object> data = new HashMap<>();
        data.put("service", "service-c");
        data.put("type", "medium-load");
        data.put("data", "Sample data from service-c");
        data.put("timestamp", LocalDateTime.now());
        return data;
    }
}
