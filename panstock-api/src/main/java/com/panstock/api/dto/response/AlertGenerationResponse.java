package com.panstock.api.dto.response;

import java.util.List;

public record AlertGenerationResponse(
        Integer createdAlerts,
        List<AlertResponse> alerts
) {
}