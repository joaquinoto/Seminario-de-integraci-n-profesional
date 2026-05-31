package com.panstock.api.service;

import com.panstock.api.dto.response.DashboardSemaphoreResponse;

public interface DashboardService {

    DashboardSemaphoreResponse getExpirationSemaphore();
}