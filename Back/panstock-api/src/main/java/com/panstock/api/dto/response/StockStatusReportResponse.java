package com.panstock.api.dto.response;

import com.panstock.api.enums.ProductOrigin;
import com.panstock.api.enums.UnitType;

import java.math.BigDecimal;
import java.time.LocalDate;

public record StockStatusReportResponse(
        Long productId,
        String productName,
        ProductOrigin origin,
        String categoryName,
        UnitType unitType,
        BigDecimal totalQuantity,
        BigDecimal minimumStock,
        LocalDate nearestExpirationDate,
        String stockStatus
) {
}