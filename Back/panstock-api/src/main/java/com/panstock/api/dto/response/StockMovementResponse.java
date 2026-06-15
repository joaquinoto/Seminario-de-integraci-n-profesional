package com.panstock.api.dto.response;
import com.panstock.api.enums.StockMovementType;
import java.math.BigDecimal;
import java.time.LocalDateTime;

public record StockMovementResponse(
        Long id,
        Long productId,
        String productName,
        Long batchId,
        StockMovementType movementType,
        BigDecimal quantity,
        BigDecimal unitSalePrice,
        LocalDateTime movementDate,
        String notes
) {
}