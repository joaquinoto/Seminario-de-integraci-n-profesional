package com.panstock.api.dto.response;

import com.panstock.api.enums.WasteReason;

import java.math.BigDecimal;
import java.time.LocalDateTime;

public record WasteRecordResponse(
        Long id,

        Long productId,
        String productName,

        Long batchId,

        // AGREGADOS: faltaban según documentación
        Long createdById,
        String createdByName,

        BigDecimal quantity,
        WasteReason reason,

        BigDecimal unitCost,
        BigDecimal unitSalePrice,
        BigDecimal economicLoss,

        LocalDateTime wasteDate,
        String notes
) {
}