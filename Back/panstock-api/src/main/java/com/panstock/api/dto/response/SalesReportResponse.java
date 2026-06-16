package com.panstock.api.dto.response;

import java.math.BigDecimal;
import java.time.LocalDate;

public record SalesReportResponse(
        LocalDate from,
        LocalDate to,
        Long totalMovements,
        BigDecimal totalQuantitySold,
        BigDecimal totalRevenue,
        BigDecimal averageRevenuePerMovement
) {
}
