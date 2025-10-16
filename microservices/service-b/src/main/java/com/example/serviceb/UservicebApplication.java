package com.example.serviceb;

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
public class UservicebApplication {

    public static void main(String[] args) {
        SpringApplication.run(UservicebApplication.class, args);
    }

    @GetMapping("/health")
    public Map<String, Object> health() {
        Map<String, Object> status = new HashMap<>();
        status.put("status", "UP");
        status.put("service", "service-b");
        status.put("timestamp", LocalDateTime.now());
        return status;
    }

    @GetMapping("/api/process/{id}")
    public Map<String, Object> process(@PathVariable String id) {
        // Simulate heavy-load processing work
        try {
            Thread.sleep(100); // 100ms processing time
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
        }

        Map<String, Object> response = new HashMap<>();
        response.put("id", id);
        response.put("service", "service-b");
        response.put("result", "processed-heavy-load-" + id);
        response.put("timestamp", LocalDateTime.now());
        return response;
    }

    @GetMapping("/api/data")
    public Map<String, Object> getData() {
        Map<String, Object> data = new HashMap<>();
        data.put("service", "service-b");
        data.put("type", "heavy-load");
        data.put("data", "Sample data from service-b");
        data.put("timestamp", LocalDateTime.now());
        return data;
    }
}
