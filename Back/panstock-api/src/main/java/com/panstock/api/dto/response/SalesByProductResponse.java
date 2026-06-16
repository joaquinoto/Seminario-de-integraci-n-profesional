package com.panstock.api.dto.response;

import java.math.BigDecimal;

public record SalesByProductResponse(
        Long productId,
        String productName,
        String categoryName,
        Long movementsCount,
        BigDecimal totalQuantitySold,
        BigDecimal totalRevenue,
        BigDecimal averageUnitPrice
) {
}
