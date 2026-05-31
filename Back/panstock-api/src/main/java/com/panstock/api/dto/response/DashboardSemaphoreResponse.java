package com.panstock.api.dto.response;

import java.util.List;

public record DashboardSemaphoreResponse(
        long greenCount,
        long yellowCount,
        long redCount,
        long expiredCount,
        List<ExpirationItemResponse> items
) {
}