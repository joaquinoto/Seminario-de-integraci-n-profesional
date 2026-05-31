package com.panstock.api.controller;

import com.panstock.api.dto.response.DashboardSemaphoreResponse;
import com.panstock.api.service.DashboardService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/dashboard")
@RequiredArgsConstructor
public class DashboardController {

    private final DashboardService dashboardService;

    @GetMapping("/expiration-semaphore")
    public DashboardSemaphoreResponse getExpirationSemaphore() {
        return dashboardService.getExpirationSemaphore();
    }
}