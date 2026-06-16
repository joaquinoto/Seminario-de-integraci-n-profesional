package com.panstock.api.dto.response;

import java.math.BigDecimal;

public record StockBalanceByProductResponse(
        Long productId,
        String productName,
        String categoryName,
        String origin,
        String unitType,
        BigDecimal totalEntered,
        BigDecimal totalSold,
        BigDecimal totalWasted,
        BigDecimal remainingStock,
        BigDecimal efficiencyRate,
        BigDecimal wasteRate
) {
}
