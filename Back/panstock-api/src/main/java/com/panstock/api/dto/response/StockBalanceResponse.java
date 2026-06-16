package com.panstock.api.dto.response;

import java.math.BigDecimal;
import java.time.LocalDate;

public record StockBalanceResponse(
        LocalDate from,
        LocalDate to,
        BigDecimal totalEntered,
        BigDecimal totalSold,
        BigDecimal totalWasted,
        BigDecimal remainingStock,
        BigDecimal efficiencyRate,
        BigDecimal wasteRate,
        BigDecimal sellThroughRate
) {
}

