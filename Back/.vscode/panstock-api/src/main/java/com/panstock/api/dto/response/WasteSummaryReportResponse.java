package com.panstock.api.dto.response;

import java.math.BigDecimal;
import java.time.LocalDate;

public record WasteSummaryReportResponse(
        LocalDate from,
        LocalDate to,
        Long totalWasteRecords,
        BigDecimal totalQuantity,
        BigDecimal totalEconomicLoss
) {
}