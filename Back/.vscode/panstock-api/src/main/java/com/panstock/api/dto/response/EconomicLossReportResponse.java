package com.panstock.api.dto.response;

import java.math.BigDecimal;
import java.time.LocalDate;

public record EconomicLossReportResponse(
        LocalDate from,
        LocalDate to,
        BigDecimal totalEconomicLoss,
        BigDecimal averageLossPerWasteRecord,
        Long wasteRecordsCount
) {
}