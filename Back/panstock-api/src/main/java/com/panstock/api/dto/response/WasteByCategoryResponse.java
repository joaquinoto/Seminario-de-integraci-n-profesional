package com.panstock.api.dto.response;

import java.math.BigDecimal;

public record WasteByCategoryResponse(
        Long categoryId,
        String categoryName,
        Long wasteRecordsCount,
        BigDecimal totalQuantity,
        BigDecimal totalEconomicLoss
) {
}