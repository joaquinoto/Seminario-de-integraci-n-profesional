package com.panstock.api.dto.response;

import java.math.BigDecimal;
import java.util.List;

public record StockOperationResponse(
        String operationType,
        Long productId,
        String productName,
        BigDecimal totalQuantity,
        List<StockMovementResponse> movements
) {
}