package com.panstock.api.dto.response;

import com.panstock.api.enums.ProductOrigin;
import com.panstock.api.enums.UnitType;

import java.math.BigDecimal;
import java.time.LocalDate;

public record StockSummaryResponse(
        Long productId,
        String productName,
        ProductOrigin origin,
        UnitType unitType,
        BigDecimal totalQuantity,
        LocalDate nearestExpirationDate
) {
}