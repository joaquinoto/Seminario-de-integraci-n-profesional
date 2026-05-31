package com.panstock.api.controller;

import com.panstock.api.dto.response.AlertGenerationResponse;
import com.panstock.api.dto.response.AlertResponse;
import com.panstock.api.service.AlertService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/alerts")
public class AlertController {

    private final AlertService alertService;

    @GetMapping
    public List<AlertResponse> findAll() {
        return alertService.findAll();
    }

    @GetMapping("/active")
    public List<AlertResponse> findActive() {
        return alertService.findActive();
    }

    @PostMapping("/generate")
    public AlertGenerationResponse generateAlerts() {
        return alertService.generateAlerts();
    }

    @PatchMapping("/{id}/resolve")
    public AlertResponse resolve(@PathVariable Long id) {
        return alertService.resolve(id);
    }
}