package com.panstock.api.dto.response;

import com.panstock.api.enums.AlertSeverity;
import com.panstock.api.enums.AlertStatus;
import com.panstock.api.enums.AlertType;

import java.time.LocalDate;
import java.time.LocalDateTime;

public record AlertResponse(
        Long id,
        AlertType alertType,
        Long productId,
        String productName,
        Long batchId,
        LocalDate expirationDate,
        String message,
        AlertSeverity severity,
        AlertStatus status,
        LocalDateTime createdAt,
        LocalDateTime resolvedAt
) {
}